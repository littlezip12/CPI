#!/usr/bin/env python3
"""Build the CPI historical tournament archive from normalized completed-event datasets."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from tournament_pipeline import ROOT, load_json, write_json

RELEASE = "7.48.0"
EMPTY_GENERATED_AT = "2026-07-16T00:00:00Z"
REGISTRY = ROOT / "data" / "tournaments" / "registry.json"
NORMALIZED = ROOT / "data" / "tournaments" / "normalized"
OUTPUT_ROOT = ROOT / "data" / "tournaments" / "archive"
OUTPUT = OUTPUT_ROOT / "index.json"
RUNTIME = OUTPUT_ROOT / "runtime.js"

FALLBACK_PATHS = {
    "2026-quiksilver-cup": ROOT / "data" / "tournaments" / "quiksilver-cup-2026.json",
    "2026-boys-futures-super-finals": OUTPUT_ROOT / "2026-boys-futures-super-finals.json",
    "2026-girls-us-club-championships": OUTPUT_ROOT / "2026-girls-us-club-championships.json",
}


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def participant_name(participant: dict[str, Any]) -> str:
    return str(participant.get("displayName") or participant.get("raw") or participant.get("sourceReference") or "TBD")


def compact_game(game: dict[str, Any], event: dict[str, Any], division: dict[str, Any]) -> dict[str, Any]:
    participants = game.get("participants", {})
    scores = game.get("scores", {})
    return {
        "id": game.get("id"),
        "eventId": event.get("id"),
        "eventName": event.get("name"),
        "eventPublicPath": event.get("publicPath"),
        "divisionId": division.get("id"),
        "divisionLabel": division.get("label"),
        "ageGroup": division.get("ageGroup"),
        "gender": division.get("gender"),
        "division": division.get("division"),
        "divisionTier": division.get("divisionTier"),
        "dateIso": game.get("dateIso"),
        "dateLabel": game.get("dateLabel"),
        "timeLabel": game.get("timeLabel"),
        "venue": game.get("venue"),
        "stage": game.get("stage"),
        "gameNumber": game.get("sourceGameNumber"),
        "sourceGameId": game.get("sourceGameId"),
        "status": game.get("status"),
        "white": participant_name(participants.get("white", {})),
        "dark": participant_name(participants.get("dark", {})),
        "whiteParticipantId": participants.get("white", {}).get("participantId"),
        "darkParticipantId": participants.get("dark", {}).get("participantId"),
        "whiteTeamId": participants.get("white", {}).get("teamId"),
        "darkTeamId": participants.get("dark", {}).get("teamId"),
        "whiteScore": scores.get("white"),
        "darkScore": scores.get("dark"),
        "sourceUrl": division.get("sourceUrl"),
        "rankingEvidenceEnabled": bool(event.get("rankingEvidenceEnabled")),
    }


def main() -> int:
    registry = load_json(REGISTRY)
    archive_events = [event for event in registry.get("events", []) if event.get("archiveSyncEnabled")]
    games: list[dict[str, Any]] = []
    event_rows: list[dict[str, Any]] = []

    for event in archive_events:
        division_rows = []
        event_games: list[dict[str, Any]] = []
        legacy_groups = []
        for division in event.get("divisions", []):
            path = NORMALIZED / event["id"] / f"{division['id']}.json"
            data = load_json(path) if path.exists() else None
            normalized_games = data.get("games", []) if data else []
            compact = [compact_game(game, event, division) for game in normalized_games]
            games.extend(compact)
            event_games.extend(compact)
            counts = data.get("counts", {}) if data else {}
            division_rows.append({
                "id": division.get("id"),
                "label": division.get("label"),
                "ageGroup": division.get("ageGroup"),
                "gender": division.get("gender"),
                "division": division.get("division"),
                "divisionTier": division.get("divisionTier"),
                "sourceUrl": division.get("sourceUrl"),
                "banked": bool(data and counts.get("games")),
                "fetchedAt": data.get("source", {}).get("fetchedAt") if data else None,
                "sourceMode": data.get("source", {}).get("mode") if data else None,
                "counts": counts or {"games": 0, "finalGames": 0, "scheduledGames": 0, "blockers": 0, "reviewItems": 0},
            })
            legacy_groups.append({"group": division.get("label"), "placements": []})

        banked = sum(row["banked"] for row in division_rows)
        event_row = {
            "id": event.get("id"),
            "name": event.get("name"),
            "shortName": event.get("shortName"),
            "kind": event.get("kind"),
            "publicPath": event.get("publicPath"),
            "eventStatus": event.get("eventStatus"),
            "rankingEvidenceEnabled": bool(event.get("rankingEvidenceEnabled")),
            "archiveStatus": "complete" if banked == len(division_rows) else ("partial" if banked else "pending"),
            "counts": {
                "divisions": len(division_rows),
                "bankedDivisions": banked,
                "games": len(event_games),
                "finalGames": sum(game.get("status") == "final" for game in event_games),
                "scheduledGames": sum(game.get("status") != "final" for game in event_games),
            },
            "divisions": division_rows,
        }
        event_rows.append(event_row)

        fallback = {
            "schemaVersion": 1,
            "release": RELEASE,
            "name": event.get("id"),
            "displayName": event.get("name"),
            "generatedAt": max((row.get("fetchedAt") or "" for row in division_rows), default="") or EMPTY_GENERATED_AT,
            "sourceMode": "normalized_archive",
            "rankingEvidenceEnabled": bool(event.get("rankingEvidenceEnabled")),
            "groups": legacy_groups,
            "keyGames": [
                {
                    "group": game.get("divisionLabel"),
                    "age": game.get("ageGroup"),
                    "gender": game.get("gender"),
                    "division": game.get("division"),
                    "date": game.get("dateLabel") or game.get("dateIso") or "",
                    "time": game.get("timeLabel") or "",
                    "venue": game.get("venue") or "",
                    "gameNo": game.get("gameNumber") or "",
                    "gmid": game.get("sourceGameId") or "",
                    "white": game.get("white"),
                    "dark": game.get("dark"),
                    "whiteScore": game.get("whiteScore"),
                    "darkScore": game.get("darkScore"),
                    "status": "Final" if game.get("status") == "final" else "Scheduled",
                    "source": "CPI normalized archive",
                }
                for game in event_games
            ],
        }
        fallback_path = FALLBACK_PATHS.get(event["id"])
        if fallback_path:
            write_json(fallback_path, fallback)

    payload = {
        "schemaVersion": 1,
        "release": RELEASE,
        "generatedAt": max((d.get("fetchedAt") or "" for event in event_rows for d in event.get("divisions", [])), default="") or EMPTY_GENERATED_AT,
        "policy": {
            "completedEventsOnly": True,
            "rankingEvidenceRequiresApproval": True,
            "automaticRankingPublication": False,
            "sourceBlending": False,
        },
        "counts": {
            "events": len(event_rows),
            "divisions": sum(event["counts"]["divisions"] for event in event_rows),
            "bankedDivisions": sum(event["counts"]["bankedDivisions"] for event in event_rows),
            "pendingDivisions": sum(event["counts"]["divisions"] - event["counts"]["bankedDivisions"] for event in event_rows),
            "games": len(games),
            "finalGames": sum(game.get("status") == "final" for game in games),
            "scheduledGames": sum(game.get("status") != "final" for game in games),
        },
        "events": event_rows,
        "games": games,
    }
    write_json(OUTPUT, payload)
    RUNTIME.parent.mkdir(parents=True, exist_ok=True)
    RUNTIME.write_text("window.CPI_TOURNAMENT_ARCHIVE = " + json.dumps(payload, separators=(",", ":"), ensure_ascii=False) + ";\n", encoding="utf-8")
    print("TOURNAMENT ARCHIVE BUILD COMPLETE")
    print(f" - {payload['counts']['events']} completed tournaments and {payload['counts']['divisions']} divisions registered")
    print(f" - {payload['counts']['bankedDivisions']} divisions banked; {payload['counts']['pendingDivisions']} awaiting first archive sync")
    print(f" - {payload['counts']['games']} archived games; historical evidence remains quarantined")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
