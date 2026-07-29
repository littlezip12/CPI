#!/usr/bin/env python3
"""Build WPI tournament source-health data and browser runtime from registry and banked snapshots."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo
from typing import Any

from tournament_pipeline import ROOT, load_json, write_json

RELEASE = "7.45.1"
REGISTRY_PATH = ROOT / "data" / "tournaments" / "registry.json"
MANIFEST_PATH = ROOT / "data" / "tournaments" / "normalized" / "manifest.json"
SYNC_REPORT_PATH = ROOT / "data" / "tournaments" / "qa" / "sync-latest.json"
HEALTH_ROOT = ROOT / "data" / "tournaments" / "health"
HEALTH_PATH = HEALTH_ROOT / "index.json"
RUNTIME_PATH = HEALTH_ROOT / "runtime.js"
TIMEZONE = ZoneInfo("America/Los_Angeles")
STALE_AFTER_HOURS = 6


def parse_iso(value: Any) -> datetime | None:
    text = str(value or "").strip()
    if not text:
        return None
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None


def load_optional(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return load_json(path)
    except Exception:
        return default


def game_date_range(path: Path) -> tuple[str | None, str | None]:
    if not path.exists():
        return None, None
    data = load_optional(path, {})
    dates = sorted({str(game.get("dateIso")) for game in data.get("games", []) if game.get("dateIso")})
    return (dates[0], dates[-1]) if dates else (None, None)


def phase_for(*, today, first_date: str | None, last_date: str | None, games: int, final_games: int) -> str:
    if games <= 0:
        return "unbanked"
    first = datetime.fromisoformat(first_date).date() if first_date else None
    last = datetime.fromisoformat(last_date).date() if last_date else None
    if final_games >= games and games > 0:
        return "complete"
    if final_games > 0:
        return "in_progress"
    if first and today < first:
        return "pre_tournament"
    if first and last and first <= today <= last:
        return "awaiting_results"
    if last and today > last:
        return "past_due_no_results"
    return "schedule_banked"


def main() -> int:
    registry = load_json(REGISTRY_PATH)
    manifest = load_optional(MANIFEST_PATH, {"datasets": []})
    sync_report = load_optional(SYNC_REPORT_PATH, {})
    now_utc = datetime.now(timezone.utc).replace(microsecond=0)
    now_local = now_utc.astimezone(TIMEZONE)
    generated_at = now_utc.isoformat().replace("+00:00", "Z")

    manifest_lookup = {
        (item.get("eventId"), item.get("divisionId")): item
        for item in manifest.get("datasets", [])
    }
    completed_lookup = {
        (item.get("eventId"), item.get("divisionId")): item
        for item in sync_report.get("completed", [])
    }
    warning_lookup = {
        (item.get("eventId"), item.get("divisionId")): item
        for item in sync_report.get("warnings", [])
    }
    failure_lookup = {
        (item.get("eventId"), item.get("divisionId")): item
        for item in sync_report.get("failures", [])
    }

    rows: list[dict[str, Any]] = []
    for event in registry.get("events", []):
        if not event.get("syncEnabled"):
            continue
        for division in event.get("divisions", []):
            key = (event.get("id"), division.get("id"))
            dataset = manifest_lookup.get(key)
            normalized_path = ROOT / str(dataset.get("path")) if dataset and dataset.get("path") else None
            first_date, last_date = game_date_range(normalized_path) if normalized_path else (None, None)
            counts = dict((dataset or {}).get("counts", {}))
            games = int(counts.get("games") or 0)
            final_games = int(counts.get("finalGames") or 0)
            scheduled_games = int(counts.get("scheduledGames") or max(0, games - final_games))
            blockers = int(counts.get("blockers") or 0)
            review_items = int(counts.get("reviewItems") or 0)
            completed = completed_lookup.get(key, {})
            content_fetched_at = (dataset or {}).get("fetchedAt")
            last_verified_at = completed.get("verifiedAt")
            last_successful_at = last_verified_at or content_fetched_at
            last_attempt_at = completed.get("checkedAt") or (sync_report.get("generatedAt") if key in completed_lookup or key in warning_lookup or key in failure_lookup else None)
            warning = warning_lookup.get(key, {}).get("warning")
            error = failure_lookup.get(key, {}).get("error")
            age_hours = None
            successful_dt = parse_iso(last_successful_at)
            if successful_dt:
                age_hours = round((now_utc - successful_dt.astimezone(timezone.utc)).total_seconds() / 3600, 1)

            if blockers:
                health_status = "blocked"
            elif error and not dataset:
                health_status = "error"
            elif warning:
                health_status = "stale"
            elif not dataset:
                health_status = "unbanked"
            elif age_hours is not None and age_hours > STALE_AFTER_HOURS:
                health_status = "stale"
            else:
                health_status = "current"

            phase = phase_for(
                today=now_local.date(),
                first_date=first_date,
                last_date=last_date,
                games=games,
                final_games=final_games,
            )
            rows.append({
                "eventId": event.get("id"),
                "eventName": event.get("name"),
                "eventKind": event.get("kind"),
                "publicPath": event.get("publicPath"),
                "syncEnabled": bool(event.get("syncEnabled")),
                "divisionId": division.get("id"),
                "divisionLabel": division.get("label"),
                "ageGroup": division.get("ageGroup"),
                "gender": division.get("gender"),
                "division": division.get("division"),
                "divisionTier": division.get("divisionTier"),
                "phase": phase,
                "healthStatus": health_status,
                "schedule": {
                    "firstDate": first_date,
                    "lastDate": last_date,
                    "games": games,
                    "scheduledGames": scheduled_games,
                    "completedGames": final_games,
                    "zeroZeroPlaceholders": int(counts.get("zeroZeroPlaceholders") or 0),
                    "partialScores": int(counts.get("partialScores") or 0),
                    "blockers": blockers,
                    "reviewItems": review_items,
                },
                "source": {
                    "provider": "Google Sheets" if division.get("sourceType") == "google_sheets_csv" else division.get("sourceType"),
                    "type": division.get("sourceType"),
                    "url": division.get("sourceUrl"),
                    "spreadsheetId": division.get("spreadsheetId"),
                    "gid": division.get("gid"),
                    "sheetName": division.get("sheetName"),
                    "lastSuccessfulAt": last_successful_at,
                    "lastVerifiedAt": last_verified_at,
                    "contentFetchedAt": content_fetched_at,
                    "lastAttemptAt": last_attempt_at,
                    "ageHours": age_hours,
                    "mode": (dataset or {}).get("sourceMode"),
                    "warning": warning,
                    "error": error,
                },
            })

    jo_rows = [row for row in rows if row.get("eventKind") == "junior_olympics"]
    payload = {
        "schemaVersion": 1,
        "release": RELEASE,
        "generatedAt": generated_at,
        "timezone": "America/Los_Angeles",
        "staleAfterHours": STALE_AFTER_HOURS,
        "policy": "One registered source publishes each division. Invalid or stale responses never replace the last known-good tournament snapshot.",
        "counts": {
            "sources": len(rows),
            "joSources": len(jo_rows),
            "current": sum(row["healthStatus"] == "current" for row in rows),
            "stale": sum(row["healthStatus"] == "stale" for row in rows),
            "unbanked": sum(row["healthStatus"] == "unbanked" for row in rows),
            "error": sum(row["healthStatus"] == "error" for row in rows),
            "blocked": sum(row["healthStatus"] == "blocked" for row in rows),
            "bankedDatasets": sum(row["schedule"]["games"] > 0 for row in rows),
            "games": sum(row["schedule"]["games"] for row in rows),
            "scheduledGames": sum(row["schedule"]["scheduledGames"] for row in rows),
            "completedGames": sum(row["schedule"]["completedGames"] for row in rows),
        },
        "sources": rows,
    }
    write_json(HEALTH_PATH, payload)
    RUNTIME_PATH.parent.mkdir(parents=True, exist_ok=True)
    RUNTIME_PATH.write_text(
        "window.CPI_TOURNAMENT_SOURCE_HEALTH = " + json.dumps(payload, separators=(",", ":"), ensure_ascii=False) + ";\n",
        encoding="utf-8",
    )
    print("TOURNAMENT SOURCE HEALTH BUILT")
    print(f" - {len(jo_rows)} Junior Olympics divisions monitored")
    print(f" - {payload['counts']['bankedDatasets']} banked datasets, {payload['counts']['games']} schedule records")
    print(f" - {payload['counts']['completedGames']} completed games and {payload['counts']['scheduledGames']} scheduled games")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
