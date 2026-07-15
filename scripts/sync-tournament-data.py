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
    IdentityResolver,
    all_registry_divisions,
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
    gids = []
    for gid in [division.get("gid"), *(division.get("gidAliases") or [])]:
        if gid and str(gid) not in gids:
            gids.append(str(gid))
    root = f"https://docs.google.com/spreadsheets/d/{sheet_id}"
    urls: list[str] = []
    for gid in gids:
        encoded = urllib.parse.quote(gid)
        urls.extend([
            f"{root}/gviz/tq?tqx=out:csv&gid={encoded}",
            f"{root}/gviz/tq?gid={encoded}&tqx=out:csv",
            f"{root}/export?format=csv&gid={encoded}",
        ])
    if division.get("sheetName"):
        sheet = urllib.parse.quote(str(division["sheetName"]))
        urls.append(f"{root}/gviz/tq?tqx=out:csv&sheet={sheet}")
    return list(dict.fromkeys(urls))


def fetch_csv(division: dict, timeout: int = 25) -> tuple[str, str]:
    last_error: Exception | None = None
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; CPI-Tournament-Sync/7.42; +https://littlezip12.github.io/CPI/)",
        "Accept": "text/csv,text/plain,*/*",
        "Cache-Control": "no-cache",
    }
    for url in source_urls(division):
        request = urllib.request.Request(url, headers=headers)
        for attempt in range(2):
            try:
                with urllib.request.urlopen(request, timeout=timeout) as response:
                    text = response.read().decode("utf-8-sig", errors="replace")
                    if len(text.strip()) < 20:
                        raise RuntimeError("Google Sheets response was empty")
                    if text.lstrip().startswith("<!DOCTYPE html") or "accounts.google.com" in text[:1000]:
                        raise RuntimeError("Google Sheets returned an HTML/login page instead of CSV")
                    return text, url
            except Exception as exc:  # noqa: BLE001 - retain source error context
                last_error = exc
                if attempt == 0:
                    time.sleep(1.0)
    raise RuntimeError(f"Unable to fetch {division['id']}: {last_error}")


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
    source_mode = "live_fetch"
    fetched_url = None

    if source_file:
        text = source_file.read_text(encoding="utf-8-sig")
        source_mode = "local_source_file"
    elif no_fetch:
        if not raw_path.exists():
            raise RuntimeError(f"No cached raw source exists for {event['id']} / {division['id']}")
        text = raw_path.read_text(encoding="utf-8-sig")
        source_mode = "cached_raw"
    else:
        try:
            text, fetched_url = fetch_csv(division)
        except Exception:
            if not raw_path.exists():
                raise
            text = raw_path.read_text(encoding="utf-8-sig")
            source_mode = "cached_raw_after_fetch_failure"

    raw_path.parent.mkdir(parents=True, exist_ok=True)
    existing = raw_path.read_text(encoding="utf-8-sig") if raw_path.exists() else None
    normalized_existing = load_json(normalized_path) if normalized_path.exists() else {}
    qa_existing = load_json(qa_path) if qa_path.exists() else {}
    current_release = normalized_existing.get("release") == "7.42.0" and qa_existing.get("release") == "7.42.0"
    unchanged = existing == text and normalized_path.exists() and qa_path.exists() and current_release
    if unchanged:
        normalized = normalized_existing
        return {
            "eventId": event["id"],
            "divisionId": division["id"],
            "normalizedPath": normalized_path.relative_to(ROOT).as_posix(),
            "qaPath": qa_path.relative_to(ROOT).as_posix(),
            "rawPath": raw_path.relative_to(ROOT).as_posix(),
            "sourceSha256": normalized.get("source", {}).get("contentSha256"),
            "fetchedAt": normalized.get("source", {}).get("fetchedAt"),
            "sourceMode": normalized.get("source", {}).get("mode"),
            "unchanged": True,
            "counts": normalized.get("counts", {}),
        }
    if existing != text:
        raw_path.write_text(text, encoding="utf-8")

    normalized, qa = normalize_csv(
        text,
        event=event,
        division=division,
        resolver=resolver,
        fetched_at=fetched_at,
        source_mode=source_mode,
    )
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
        "sourceSha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
        "fetchedAt": fetched_at,
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
        selected = list(all_registry_divisions(registry, sync_enabled_only=args.sync_enabled))

    failures = []
    completed = []
    for event, division in selected:
        try:
            result = sync_one(event, division, resolver, no_fetch=args.no_fetch, source_file=args.source_file)
            completed.append(result)
            counts = result["counts"]
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
    if failures:
        report = {
            "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
            "completed": completed,
            "failures": failures,
        }
        write_json(QA_ROOT / "sync-latest.json", report)
        print(f"Partial sync completed with {len(failures)} failures", file=sys.stderr)
        return 0 if args.allow_partial else 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
