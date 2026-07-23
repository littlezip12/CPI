#!/usr/bin/env python3
"""Build CPI's banked Junior Olympics live-data relay.

The relay runs in GitHub Actions, fetches the public Google Sheet tabs from a
server-side runner, validates each candidate against CPI's tournament parser,
and publishes one last-known-good CSV plus status record per division. Browser
clients read this branch before attempting Google directly.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
import time
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from tournament_pipeline import (
    ROOT,
    IdentityResolver,
    canonicalize_source_text,
    load_json,
    normalize_csv,
    write_json,
)

REGISTRY_PATH = ROOT / "data" / "tournaments" / "registry.json"
RELAY_ROOT = ROOT / "data" / "tournaments" / "live-relay"
RAW_ROOT = ROOT / "data" / "tournaments" / "raw"
NORMALIZED_ROOT = ROOT / "data" / "tournaments" / "normalized"
JO_EVENT_IDS = ("2026-jo-weekend-1", "2026-jo-weekend-2")
RELEASE = "7.51.0"
USER_AGENT = "Mozilla/5.0 (compatible; CPI-JO-Live-Relay/7.51.0; +https://littlezip12.github.io/CPI/)"


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def unique(values: list[Any]) -> list[str]:
    result: list[str] = []
    for value in values:
        if value is None:
            continue
        text = str(value).strip()
        if text and text not in result:
            result.append(text)
    return result


def source_urls(division: dict[str, Any]) -> list[str]:
    sheet_id = division["spreadsheetId"]
    root = f"https://docs.google.com/spreadsheets/d/{sheet_id}"
    urls: list[str] = []
    for name in unique([division.get("sheetName"), *(division.get("sheetNameAliases") or [])]):
        sheet = urllib.parse.quote(name)
        urls.extend([
            f"{root}/gviz/tq?tqx=out:csv&sheet={sheet}",
            f"{root}/gviz/tq?sheet={sheet}&tqx=out:csv",
        ])
    for gid in unique([division.get("gid"), *(division.get("gidAliases") or [])]):
        encoded = urllib.parse.quote(gid)
        urls.extend([
            f"{root}/gviz/tq?tqx=out:csv&gid={encoded}",
            f"{root}/gviz/tq?gid={encoded}&tqx=out:csv",
            f"{root}/export?format=csv&gid={encoded}",
        ])
    return list(dict.fromkeys(urls))


def fetch_url_text(url: str, timeout: float) -> str:
    """Fetch one endpoint with a hard wall-clock cap.

    curl is available on GitHub-hosted runners and enforces connect and total
    timeouts more consistently than urllib when Google stalls during TLS or
    redirects.
    """
    target = f"{url}{'&' if '?' in url else '?'}_={int(time.time() * 1000)}"
    completed = subprocess.run(
        [
            "curl",
            "--silent",
            "--show-error",
            "--location",
            "--fail",
            "--connect-timeout",
            str(max(1, min(3, int(timeout)))),
            "--max-time",
            str(max(1.0, timeout)),
            "--header",
            f"User-Agent: {USER_AGENT}",
            "--header",
            "Accept: text/csv,text/plain,*/*",
            "--header",
            "Cache-Control: no-cache",
            target,
        ],
        capture_output=True,
        timeout=max(2.0, timeout + 2.0),
    )
    if completed.returncode:
        detail = completed.stderr.decode("utf-8", errors="replace").strip()
        raise RuntimeError(detail or f"curl exited {completed.returncode}")
    text = completed.stdout.decode("utf-8-sig", errors="replace")
    stripped = text.lstrip()
    if len(stripped) < 20:
        raise RuntimeError("empty Google response")
    lowered = stripped[:1200].lower()
    if lowered.startswith("<!doctype html") or lowered.startswith("<html") or "accounts.google.com" in lowered:
        raise RuntimeError("Google returned HTML instead of CSV")
    return canonicalize_source_text(text)


def previous_counts(event_id: str, division_id: str) -> dict[str, Any]:
    path = NORMALIZED_ROOT / event_id / f"{division_id}.json"
    if not path.exists():
        return {}
    try:
        return load_json(path).get("counts", {})
    except Exception:
        return {}


def candidate_rejection_reason(normalized: dict[str, Any], prior: dict[str, Any]) -> str | None:
    counts = normalized.get("counts", {})
    games = int(counts.get("games") or 0)
    blockers = int(counts.get("blockers") or 0)
    if games <= 0:
        return "normalized to zero games"
    if blockers > 0:
        return f"contains {blockers} blocking issue(s)"
    prior_games = int(prior.get("games") or 0)
    if prior_games > 0 and games < max(5, (prior_games + 1) // 2):
        return f"game count collapsed from {prior_games} to {games}"
    return None


def status_path(event_id: str, division_id: str) -> Path:
    return RELAY_ROOT / "status" / event_id / f"{division_id}.json"


def csv_path(event_id: str, division_id: str) -> Path:
    return RELAY_ROOT / event_id / f"{division_id}.csv"


def read_previous_status(event_id: str, division_id: str) -> dict[str, Any]:
    path = status_path(event_id, division_id)
    if not path.exists():
        return {}
    try:
        return load_json(path)
    except Exception:
        return {}


def validate_candidate(
    text: str,
    *,
    event: dict[str, Any],
    division: dict[str, Any],
    resolver: IdentityResolver,
    checked_at: str,
) -> tuple[dict[str, Any], dict[str, Any]]:
    normalized, qa = normalize_csv(
        text,
        event=event,
        division=division,
        resolver=resolver,
        fetched_at=checked_at,
        source_mode="cpi_live_relay",
    )
    reason = candidate_rejection_reason(normalized, previous_counts(event["id"], division["id"]))
    if reason:
        raise RuntimeError(reason)
    return normalized, qa


def fetch_division(
    event: dict[str, Any],
    division: dict[str, Any],
    resolver: IdentityResolver,
    *,
    timeout: float,
    max_candidates: int,
) -> dict[str, Any]:
    event_id, division_id = event["id"], division["id"]
    checked_at = utc_now()
    started = time.monotonic()
    errors: list[str] = []
    urls = source_urls(division)[:max_candidates]

    for candidate_index, url in enumerate(urls):
        try:
            text = fetch_url_text(url, timeout)
            normalized, _qa = validate_candidate(
                text,
                event=event,
                division=division,
                resolver=resolver,
                checked_at=checked_at,
            )
            digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
            target = csv_path(event_id, division_id)
            prior_status = read_previous_status(event_id, division_id)
            previous_digest = prior_status.get("sourceSha256")
            content_updated_at = prior_status.get("contentUpdatedAt") if previous_digest == digest else checked_at
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(text, encoding="utf-8")
            counts = normalized.get("counts", {})
            status = {
                "schemaVersion": 1,
                "release": RELEASE,
                "eventId": event_id,
                "divisionId": division_id,
                "label": division.get("label") or division_id,
                "state": "live",
                "checkedAt": checked_at,
                "lastSuccessAt": checked_at,
                "contentUpdatedAt": content_updated_at,
                "sourceUrl": url,
                "sourceSha256": digest,
                "latencyMs": round((time.monotonic() - started) * 1000),
                "counts": counts,
                "relayCsvPath": target.relative_to(ROOT).as_posix(),
                "warning": None,
            }
            write_json(status_path(event_id, division_id), status)
            return status
        except Exception as exc:  # noqa: BLE001 - preserve endpoint diagnostics
            errors.append(f"{url}: {exc}")
            if candidate_index + 1 < len(urls):
                time.sleep(1.25)

    # Preserve the newest banked relay. On the first run, seed it from CPI's
    # verified repository snapshot so the branch is immediately useful.
    target = csv_path(event_id, division_id)
    prior_status = read_previous_status(event_id, division_id)
    if not target.exists():
        seed = RAW_ROOT / event_id / f"{division_id}.csv"
        if seed.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(canonicalize_source_text(seed.read_text(encoding="utf-8-sig")), encoding="utf-8")
    if not target.exists():
        raise RuntimeError("No live source or banked relay CSV is available")

    text = canonicalize_source_text(target.read_text(encoding="utf-8-sig"))
    normalized, _qa = validate_candidate(
        text,
        event=event,
        division=division,
        resolver=resolver,
        checked_at=prior_status.get("lastSuccessAt") or checked_at,
    )
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
    status = {
        "schemaVersion": 1,
        "release": RELEASE,
        "eventId": event_id,
        "divisionId": division_id,
        "label": division.get("label") or division_id,
        "state": "stale",
        "checkedAt": checked_at,
        "lastSuccessAt": prior_status.get("lastSuccessAt"),
        "contentUpdatedAt": prior_status.get("contentUpdatedAt") or prior_status.get("lastSuccessAt"),
        "sourceUrl": prior_status.get("sourceUrl"),
        "sourceSha256": digest,
        "latencyMs": round((time.monotonic() - started) * 1000),
        "counts": normalized.get("counts", {}),
        "relayCsvPath": target.relative_to(ROOT).as_posix(),
        "warning": " | ".join(errors[-4:]) or "Google did not return a valid CSV",
    }
    write_json(status_path(event_id, division_id), status)
    return status


def build_manifest(statuses: list[dict[str, Any]], generated_at: str) -> dict[str, Any]:
    live = sum(item.get("state") == "live" for item in statuses)
    stale = sum(item.get("state") == "stale" for item in statuses)
    manifest = {
        "schemaVersion": 1,
        "release": RELEASE,
        "generatedAt": generated_at,
        "branch": "cpi-live-relay",
        "refreshTargetMinutes": 5,
        "counts": {
            "divisions": len(statuses),
            "live": live,
            "stale": stale,
            "games": sum(int(item.get("counts", {}).get("games") or 0) for item in statuses),
            "finalGames": sum(int(item.get("counts", {}).get("finalGames") or 0) for item in statuses),
        },
        "divisions": sorted(statuses, key=lambda item: (item.get("eventId", ""), item.get("divisionId", ""))),
    }
    write_json(RELAY_ROOT / "manifest.json", manifest)
    return manifest


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--timeout", type=float, default=4.0, help="Per-endpoint timeout in seconds")
    parser.add_argument("--workers", type=int, default=8, help="Number of divisions fetched concurrently")
    parser.add_argument("--max-candidates", type=int, default=4, help="Maximum Google endpoints tried per division")
    parser.add_argument("--event", action="append", dest="events", help="Limit to one or more JO event IDs")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    registry = load_json(REGISTRY_PATH)
    selected_ids = tuple(args.events or JO_EVENT_IDS)
    events = [event for event in registry.get("events", []) if event.get("id") in selected_ids]
    if len(events) != len(set(selected_ids)):
        missing = sorted(set(selected_ids) - {event.get("id") for event in events})
        print(f"Missing JO event(s): {', '.join(missing)}", file=sys.stderr)
        return 2

    selected = [(event, division) for event in events for division in event.get("divisions", [])]
    resolver = IdentityResolver()
    statuses: list[dict[str, Any]] = []
    failures: list[str] = []

    with ThreadPoolExecutor(max_workers=max(1, args.workers)) as executor:
        futures = {
            executor.submit(
                fetch_division,
                event,
                division,
                resolver,
                timeout=args.timeout,
                max_candidates=args.max_candidates,
            ): (event["id"], division["id"])
            for event, division in selected
        }
        for future in as_completed(futures):
            event_id, division_id = futures[future]
            try:
                status = future.result()
                statuses.append(status)
                counts = status.get("counts", {})
                print(
                    f"{status['state'].upper()} {event_id} / {division_id}: "
                    f"{counts.get('games', 0)} games, {counts.get('finalGames', 0)} final, "
                    f"{status.get('latencyMs', 0)} ms"
                )
            except Exception as exc:  # noqa: BLE001
                failures.append(f"{event_id}/{division_id}: {exc}")
                print(f"FAILED {event_id} / {division_id}: {exc}", file=sys.stderr)

    generated_at = utc_now()
    manifest = build_manifest(statuses, generated_at)
    print(
        f"Relay manifest: {manifest['counts']['divisions']} divisions, "
        f"{manifest['counts']['live']} live, {manifest['counts']['stale']} stale"
    )
    if failures:
        print("Relay completed with unrecoverable failures:", file=sys.stderr)
        for item in failures:
            print(f" - {item}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
