#!/usr/bin/env python3
"""Fetch public tournament sheets, preserve raw CSV, and generate normalized CPI game records."""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
import time
import subprocess
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from tournament_pipeline import (
    ROOT,
    RELEASE as PIPELINE_RELEASE,
    IdentityResolver,
    all_registry_divisions,
    canonicalize_source_text,
    load_json,
    normalize_csv,
    registry_lookup,
    write_json,
)

REGISTRY_PATH = ROOT / "data" / "tournaments" / "registry.json"
RAW_ROOT = ROOT / "data" / "tournaments" / "raw"
NORMALIZED_ROOT = ROOT / "data" / "tournaments" / "normalized"
QA_ROOT = ROOT / "data" / "tournaments" / "qa"
MANIFEST_PATH = NORMALIZED_ROOT / "manifest.json"


def source_urls(division: dict) -> list[str]:
    sheet_id = division["spreadsheetId"]
    root = f"https://docs.google.com/spreadsheets/d/{sheet_id}"
    urls: list[str] = []
    sheet_names: list[str] = []
    for name in [division.get("sheetName"), *(division.get("sheetNameAliases") or [])]:
        if name and str(name) not in sheet_names:
            sheet_names.append(str(name))
    # Stable worksheet titles are tried before mutable numeric GIDs.
    for name in sheet_names:
        sheet = urllib.parse.quote(name)
        urls.extend([
            f"{root}/gviz/tq?tqx=out:csv&sheet={sheet}",
            f"{root}/gviz/tq?sheet={sheet}&tqx=out:csv",
        ])
    gids: list[str] = []
    for gid in [division.get("gid"), *(division.get("gidAliases") or [])]:
        if gid and str(gid) not in gids:
            gids.append(str(gid))
    for gid in gids:
        encoded = urllib.parse.quote(gid)
        urls.extend([
            f"{root}/gviz/tq?tqx=out:csv&gid={encoded}",
            f"{root}/gviz/tq?gid={encoded}&tqx=out:csv",
            f"{root}/export?format=csv&gid={encoded}",
        ])
    return list(dict.fromkeys(urls))


def fetch_url_text(url: str, timeout: int = 25) -> str:
    """Fetch one CSV candidate and reject transport-level false positives."""
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; CPI-Tournament-Sync/7.49.1; +https://littlezip12.github.io/CPI/)",
        "Accept": "text/csv,text/plain,*/*",
        "Cache-Control": "no-cache",
    }
    request = urllib.request.Request(url, headers=headers)
    last_error: Exception | None = None
    for attempt in range(2):
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                text = response.read().decode("utf-8-sig", errors="replace")
            if len(text.strip()) < 20:
                raise RuntimeError("Google Sheets response was empty")
            if text.lstrip().startswith("<!DOCTYPE html") or "accounts.google.com" in text[:1000]:
                raise RuntimeError("Google Sheets returned an HTML/login page instead of CSV")
            return canonicalize_source_text(text)
        except Exception as exc:  # noqa: BLE001 - retain source error context
            last_error = exc
            if attempt == 0:
                time.sleep(1.0)
    raise RuntimeError(str(last_error) if last_error else "Unknown fetch failure")


def candidate_rejection_reason(
    normalized: dict,
    previous_counts: dict | None = None,
) -> str | None:
    """Return a reason when a fetched candidate is unsafe to publish.

    Google Sheets can return a syntactically valid CSV for the wrong/blank tab.
    A candidate must contain games, contain no blockers, and must not collapse a
    previously banked schedule by more than 50 percent.
    """
    counts = normalized.get("counts", {})
    games = int(counts.get("games") or 0)
    blockers = int(counts.get("blockers") or 0)
    if games <= 0:
        return "normalized to zero games"
    if blockers > 0:
        return f"contains {blockers} blocking data issue(s)"
    prior_games = int((previous_counts or {}).get("games") or 0)
    if prior_games > 0:
        minimum = max(1, (prior_games + 1) // 2)
        if games < minimum:
            return f"game count collapsed from {prior_games} to {games} (minimum safe count {minimum})"
    return None


def paths_for(event_id: str, division_id: str) -> tuple[Path, Path, Path]:
    return (
        RAW_ROOT / event_id / f"{division_id}.csv",
        NORMALIZED_ROOT / event_id / f"{division_id}.json",
        QA_ROOT / event_id / f"{division_id}.json",
    )


def sync_one(
    event: dict,
    division: dict,
    resolver: IdentityResolver,
    *,
    no_fetch: bool,
    source_file: Path | None = None,
) -> dict:
    raw_path, normalized_path, qa_path = paths_for(event["id"], division["id"])
    fetched_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    raw_path.parent.mkdir(parents=True, exist_ok=True)

    existing_text = canonicalize_source_text(raw_path.read_text(encoding="utf-8-sig")) if raw_path.exists() else None
    normalized_existing = load_json(normalized_path) if normalized_path.exists() else {}
    qa_existing = load_json(qa_path) if qa_path.exists() else {}
    previous_counts = normalized_existing.get("counts", {})
    current_release = normalized_existing.get("release") == PIPELINE_RELEASE and qa_existing.get("release") == PIPELINE_RELEASE

    text: str | None = None
    normalized: dict | None = None
    qa: dict | None = None
    source_mode = "live_fetch"
    fetched_url: str | None = None
    candidate_errors: list[str] = []

    def normalize_candidate(candidate_text: str, mode: str) -> tuple[dict, dict]:
        # Rebuilding from a repository snapshot must not make old source content
        # appear freshly fetched. Preserve the original content timestamp.
        content_fetched_at = fetched_at
        if mode == "cached_raw" and normalized_existing.get("source", {}).get("fetchedAt"):
            content_fetched_at = normalized_existing["source"]["fetchedAt"]
        return normalize_csv(
            candidate_text,
            event=event,
            division=division,
            resolver=resolver,
            fetched_at=content_fetched_at,
            source_mode=mode,
        )

    if source_file:
        text = canonicalize_source_text(source_file.read_text(encoding="utf-8-sig"))
        source_mode = "local_source_file"
        normalized, qa = normalize_candidate(text, source_mode)
        reason = candidate_rejection_reason(normalized, previous_counts)
        if reason:
            raise RuntimeError(f"Rejected local source file: {reason}")
    elif no_fetch:
        if existing_text is None:
            raise RuntimeError(f"No cached raw source exists for {event['id']} / {division['id']}")
        text = canonicalize_source_text(existing_text)
        source_mode = "cached_raw"
        normalized, qa = normalize_candidate(text, source_mode)
        reason = candidate_rejection_reason(normalized, previous_counts)
        if reason:
            raise RuntimeError(f"Rejected cached raw source: {reason}")
    else:
        # Google Sheets occasionally returns a valid-looking CSV for a blank or
        # obsolete tab. Parse each configured URL before accepting it, including
        # GID aliases and the sheet-name fallback.
        for url in source_urls(division):
            try:
                candidate_text = fetch_url_text(url)
                candidate_normalized, candidate_qa = normalize_candidate(candidate_text, "live_fetch")
                reason = candidate_rejection_reason(candidate_normalized, previous_counts)
                if reason:
                    candidate_errors.append(f"{url}: {reason}")
                    continue
                text = candidate_text
                normalized = candidate_normalized
                qa = candidate_qa
                fetched_url = url
                break
            except Exception as exc:  # noqa: BLE001 - preserve candidate diagnostics
                candidate_errors.append(f"{url}: {exc}")

        if text is None or normalized is None or qa is None:
            # Preserve the last known-good bank rather than replacing it with a
            # zero-game or truncated response. This is a stale-but-safe outcome,
            # not a successful live refresh.
            if existing_text is not None and normalized_existing and qa_existing and current_release:
                reason = "; ".join(candidate_errors[-4:]) or "No usable live CSV candidate"
                return {
                    "eventId": event["id"],
                    "divisionId": division["id"],
                    "normalizedPath": normalized_path.relative_to(ROOT).as_posix(),
                    "qaPath": qa_path.relative_to(ROOT).as_posix(),
                    "rawPath": raw_path.relative_to(ROOT).as_posix(),
                    "sourceSha256": normalized_existing.get("source", {}).get("contentSha256"),
                    "fetchedAt": normalized_existing.get("source", {}).get("fetchedAt"),
                    "checkedAt": fetched_at,
                    "sourceMode": normalized_existing.get("source", {}).get("mode"),
                    "unchanged": True,
                    "staleFallback": True,
                    "warning": reason,
                    "counts": normalized_existing.get("counts", {}),
                }
            raise RuntimeError("No usable live CSV candidate: " + ("; ".join(candidate_errors[-4:]) or "unknown error"))

    assert text is not None and normalized is not None and qa is not None
    canonical_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
    stored_hashes_match = (
        normalized_existing.get("source", {}).get("contentSha256") == canonical_hash
        and qa_existing.get("sourceSha256") == canonical_hash
    )
    unchanged = (
        existing_text == text
        and normalized_path.exists()
        and qa_path.exists()
        and current_release
        and stored_hashes_match
    )
    if unchanged:
        return {
            "eventId": event["id"],
            "divisionId": division["id"],
            "normalizedPath": normalized_path.relative_to(ROOT).as_posix(),
            "qaPath": qa_path.relative_to(ROOT).as_posix(),
            "rawPath": raw_path.relative_to(ROOT).as_posix(),
            "sourceSha256": normalized_existing.get("source", {}).get("contentSha256"),
            "fetchedAt": normalized_existing.get("source", {}).get("fetchedAt"),
            "verifiedAt": fetched_at if source_mode == "live_fetch" else normalized_existing.get("source", {}).get("fetchedAt"),
            "checkedAt": fetched_at,
            "sourceMode": normalized_existing.get("source", {}).get("mode"),
            "unchanged": True,
            "counts": normalized_existing.get("counts", {}),
        }

    # Commit raw and normalized artifacts only after the candidate passes all
    # structural checks. A bad live response can never destroy a good snapshot.
    if existing_text != text:
        raw_path.write_text(text, encoding="utf-8")
    if fetched_url:
        normalized["source"]["fetchedUrl"] = fetched_url
    write_json(normalized_path, normalized)
    write_json(qa_path, qa)
    return {
        "eventId": event["id"],
        "divisionId": division["id"],
        "normalizedPath": normalized_path.relative_to(ROOT).as_posix(),
        "qaPath": qa_path.relative_to(ROOT).as_posix(),
        "rawPath": raw_path.relative_to(ROOT).as_posix(),
        "sourceSha256": canonical_hash,
        "fetchedAt": fetched_at,
        "verifiedAt": fetched_at if source_mode in {"live_fetch", "local_source_file"} else None,
        "checkedAt": fetched_at,
        "sourceMode": source_mode,
        "counts": normalized["counts"],
    }


def build_manifest(registry: dict) -> dict:
    datasets = []
    for path in sorted(NORMALIZED_ROOT.glob("*/*.json")):
        if path.name == "manifest.json":
            continue
        try:
            data = load_json(path)
        except Exception:
            continue
        datasets.append({
            "eventId": data.get("event", {}).get("id"),
            "divisionId": data.get("division", {}).get("id"),
            "path": path.relative_to(ROOT).as_posix(),
            "sourceSha256": data.get("source", {}).get("contentSha256"),
            "fetchedAt": data.get("source", {}).get("fetchedAt"),
            "sourceMode": data.get("source", {}).get("mode"),
            "counts": data.get("counts", {}),
        })
    manifest = {
        "schemaVersion": 1,
        "release": registry["release"],
        "registryPath": REGISTRY_PATH.relative_to(ROOT).as_posix(),
        "generatedAt": max((x.get("fetchedAt") or "" for x in datasets), default=""),
        "counts": {
            "datasets": len(datasets),
            "games": sum(x.get("counts", {}).get("games", 0) for x in datasets),
            "finalGames": sum(x.get("counts", {}).get("finalGames", 0) for x in datasets),
            "scheduledGames": sum(x.get("counts", {}).get("scheduledGames", 0) for x in datasets),
            "zeroZeroPlaceholders": sum(x.get("counts", {}).get("zeroZeroPlaceholders", 0) for x in datasets),
            "partialScores": sum(x.get("counts", {}).get("partialScores", 0) for x in datasets),
            "blockers": sum(x.get("counts", {}).get("blockers", 0) for x in datasets),
            "reviewItems": sum(x.get("counts", {}).get("reviewItems", 0) for x in datasets),
        },
        "datasets": datasets,
    }
    write_json(MANIFEST_PATH, manifest)
    return manifest


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--all", action="store_true", help="Process all registered divisions")
    group.add_argument("--sync-enabled", action="store_true", help="Process only events with syncEnabled=true")
    group.add_argument("--archive-enabled", action="store_true", help="Process only completed events with archiveSyncEnabled=true")
    group.add_argument("--event", help="Process every division for one event")
    group.add_argument("--division", nargs=2, metavar=("EVENT_ID", "DIVISION_ID"), help="Process one registered division")
    parser.add_argument("--no-fetch", action="store_true", help="Normalize existing raw CSV snapshots without network access")
    parser.add_argument("--source-file", type=Path, help="Use a local CSV file; valid only with --division")
    parser.add_argument("--allow-partial", action="store_true", help="Continue when individual sources cannot be fetched")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.source_file and not args.division:
        print("--source-file requires --division", file=sys.stderr)
        return 2
    registry = load_json(REGISTRY_PATH)
    resolver = IdentityResolver()

    if args.division:
        selected = [registry_lookup(registry, args.division[0], args.division[1])]
    elif args.event:
        event = next((x for x in registry["events"] if x["id"] == args.event), None)
        if not event:
            print(f"Unknown event: {args.event}", file=sys.stderr)
            return 2
        selected = [(event, d) for d in event["divisions"]]
    else:
        selected = list(all_registry_divisions(registry, sync_enabled_only=args.sync_enabled, archive_enabled_only=args.archive_enabled))

    failures = []
    warnings = []
    completed = []
    for event, division in selected:
        try:
            result = sync_one(event, division, resolver, no_fetch=args.no_fetch, source_file=args.source_file)
            completed.append(result)
            counts = result["counts"]
            if result.get("staleFallback"):
                warnings.append({
                    "eventId": event["id"],
                    "divisionId": division["id"],
                    "warning": result.get("warning"),
                })
                print(f"STALE {event['id']} / {division['id']}: preserved {counts['games']} previously banked games")
            else:
                print(f"OK {event['id']} / {division['id']}: {counts['games']} games, {counts['blockers']} blockers, {counts['reviewItems']} review")
        except Exception as exc:  # noqa: BLE001
            failures.append({"eventId": event["id"], "divisionId": division["id"], "error": str(exc)})
            print(f"FAILED {event['id']} / {division['id']}: {exc}", file=sys.stderr)
            if not args.allow_partial:
                return 1

    manifest = build_manifest(registry)
    print(f"Manifest: {manifest['counts']['datasets']} datasets, {manifest['counts']['games']} games")
    evidence_result = subprocess.run([sys.executable, str(ROOT / "scripts" / "build-tournament-evidence.py")])
    if evidence_result.returncode:
        print("Tournament evidence build failed", file=sys.stderr)
        return evidence_result.returncode
    report = {
        "schemaVersion": 1,
        "release": registry.get("release"),
        "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "selection": {
            "syncEnabledOnly": bool(args.sync_enabled),
            "archiveEnabledOnly": bool(args.archive_enabled),
            "eventId": args.event,
            "division": list(args.division) if args.division else None,
            "allowPartial": bool(args.allow_partial),
        },
        "counts": {
            "attempted": len(selected),
            "completed": len(completed),
            "warnings": len(warnings),
            "failures": len(failures),
        },
        "completed": completed,
        "warnings": warnings,
        "failures": failures,
    }
    report_name = "sync-archive-latest.json" if args.archive_enabled else "sync-latest.json"
    write_json(QA_ROOT / report_name, report)
    if warnings:
        print(f"Preserved last known-good data for {len(warnings)} source(s) with invalid live responses", file=sys.stderr)
    if failures:
        print(f"Partial sync completed with {len(failures)} failures", file=sys.stderr)
        return 0 if args.allow_partial else 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
