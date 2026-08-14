#!/usr/bin/env python3
"""Build the slim WPI Live tournament schedule index from the public tournament platform.

The public tournament pages remain authoritative. This derivative index only carries the
fields WPI Live needs to discover a team's official schedule, display logos through the
existing identity layer, and reconcile manual fallback games without downloading every
full tournament event payload in the browser.
"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo
import json
import re

ROOT = Path(__file__).resolve().parents[1]
HUB_PATH = ROOT / "data/tournaments/public-hub.json"
OUT_PATH = ROOT / "data/live/tournament-schedule-index.json"
RELEASE = "7.58.7"


def parse_time(date_iso: str | None, time_label: str | None, tz_name: str | None) -> str | None:
    if not date_iso or not time_label:
        return None
    cleaned = re.sub(r"\s+", " ", str(time_label).strip().upper())
    parsed = None
    for fmt in ("%I:%M %p", "%I %p", "%H:%M"):
        try:
            parsed = datetime.strptime(cleaned, fmt)
            break
        except ValueError:
            pass
    if parsed is None:
        return None
    try:
        date = datetime.strptime(str(date_iso), "%Y-%m-%d")
        zone = ZoneInfo(tz_name or "America/Los_Angeles")
        local = date.replace(hour=parsed.hour, minute=parsed.minute, tzinfo=zone)
        return local.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    except Exception:
        return None


def participant(value):
    if isinstance(value, dict):
        return {
            "name": value.get("name"),
            "teamId": value.get("teamId"),
            "clubId": value.get("clubId"),
            "participantId": value.get("participantId"),
            "identityStatus": value.get("identityStatus"),
        }
    return {"name": str(value or "").strip() or None, "teamId": None, "clubId": None, "participantId": None, "identityStatus": None}


def compact_game(event_row, event_doc, game):
    event_meta = event_doc.get("event") or {}
    tz_name = game.get("timezone") or event_meta.get("timezone") or "America/Los_Angeles"
    scores = game.get("scores") or {}
    white = participant(game.get("white"))
    dark = participant(game.get("dark"))
    return {
        "eventId": event_row.get("id") or event_meta.get("id"),
        "eventName": event_row.get("name") or event_meta.get("name"),
        "eventDateLabel": event_row.get("dateLabel"),
        "eventPublicPath": event_row.get("publicPath"),
        "competitiveSeason": event_row.get("competitiveSeason"),
        "seasonLabel": event_row.get("seasonLabel"),
        "eventStatus": event_row.get("status"),
        "gameId": game.get("id"),
        "divisionId": game.get("divisionId"),
        "divisionLabel": game.get("divisionLabel"),
        "ageGroup": game.get("ageGroup"),
        "gender": game.get("gender"),
        "division": game.get("division"),
        "divisionTier": game.get("divisionTier"),
        "dateIso": game.get("dateIso"),
        "timeLabel": game.get("timeLabel"),
        "scheduledAt": parse_time(game.get("dateIso"), game.get("timeLabel"), tz_name),
        "timezone": tz_name,
        "venue": game.get("venue"),
        "gameNumber": game.get("gameNumber"),
        "stage": game.get("stage") or game.get("stageDisplay"),
        "status": game.get("status"),
        "scoreState": game.get("scoreState"),
        "white": white,
        "dark": dark,
        "scores": {
            "white": scores.get("white") if isinstance(scores, dict) else None,
            "dark": scores.get("dark") if isinstance(scores, dict) else None,
        },
    }


def main():
    hub = json.loads(HUB_PATH.read_text())
    active_season = (hub.get("seasonModel") or {}).get("currentSeason")
    events_out = []
    games_out = []
    skipped = []
    for event in hub.get("events", []):
        if active_season and event.get("competitiveSeason") != active_season:
            skipped.append({"eventId": event.get("id"), "reason": "outside_active_competitive_season"})
            continue
        path = event.get("dataPath")
        if not path:
            skipped.append({"eventId": event.get("id"), "reason": "no_data_path"})
            continue
        source = ROOT / path
        if not source.exists():
            skipped.append({"eventId": event.get("id"), "reason": "missing_data_path", "dataPath": path})
            continue
        try:
            doc = json.loads(source.read_text())
        except Exception:
            skipped.append({"eventId": event.get("id"), "reason": "invalid_json", "dataPath": path})
            continue
        games = doc.get("games")
        if not isinstance(games, list):
            skipped.append({"eventId": event.get("id"), "reason": "no_games_array", "dataPath": path})
            continue
        event_games = [compact_game(event, doc, game) for game in games if game.get("id")]
        events_out.append({
            "id": event.get("id"),
            "name": event.get("name"),
            "dateLabel": event.get("dateLabel"),
            "publicPath": event.get("publicPath"),
            "competitiveSeason": event.get("competitiveSeason"),
            "seasonLabel": event.get("seasonLabel"),
            "status": event.get("status"),
            "dataPath": path,
            "gameCount": len(event_games),
        })
        games_out.extend(event_games)

    next_tournament = hub.get("nextTournament") or {}
    payload = {
        "schemaVersion": 1,
        "release": RELEASE,
        "generatedAt": "2026-08-13T00:00:00Z",
        "source": "data/tournaments/public-hub.json + platform event dataPath files",
        "activeCompetitiveSeason": active_season,
        "nextTournament": {
            "name": next_tournament.get("name"),
            "dateLabel": next_tournament.get("dateLabel"),
            "competitiveSeason": next_tournament.get("competitiveSeason"),
            "seasonLabel": next_tournament.get("seasonLabel"),
            "status": next_tournament.get("status"),
            "description": next_tournament.get("description"),
            "publicPath": next_tournament.get("publicPath"),
        },
        "events": events_out,
        "games": games_out,
        "counts": {"events": len(events_out), "games": len(games_out)},
        "feedState": {
            "currentSeasonSchedulePublished": bool(games_out),
            "currentSeasonEventCount": len(events_out),
            "currentSeasonGameCount": len(games_out),
            "teamIdentityPolicy": "squad_safe_no_guessing",
        },
        "skipped": skipped,
    }
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, indent=2) + "\n")
    print(f"WPI Live tournament schedule index: {len(events_out)} events, {len(games_out)} games -> {OUT_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
