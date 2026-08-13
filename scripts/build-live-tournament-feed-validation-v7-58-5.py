#!/usr/bin/env python3
"""Build source-backed QA evidence for WPI Live 7.58.5 tournament-feed matching.

This file is never consumed by the production dashboard. It proves the matcher
against real banked WPI tournament rows while the active 2026-2027 schedule is
not yet published in the public tournament hub.
"""
from __future__ import annotations
from pathlib import Path
from datetime import datetime, timezone
import json

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data/live/tournament-feed-validation.json"

SOURCES = [
    ROOT / "data/tournaments/platform/events/2025-evan-cousineau-memorial-cup.json",
    ROOT / "data/tournaments/platform/events/2026-quiksilver-cup.json",
]


def participant_name(value):
    return (value.get("name") if isinstance(value, dict) else str(value or "")).strip()


def opponent_name(game, own_name):
    white = participant_name(game.get("white"))
    dark = participant_name(game.get("dark"))
    return dark if white.upper() == own_name.upper() else white


def find_case(doc, own_name):
    for game in doc.get("games", []):
        if str(game.get("ageGroup") or "").upper() != "14U":
            continue
        if str(game.get("gender") or "").lower() != "boys":
            continue
        names = [participant_name(game.get("white")), participant_name(game.get("dark"))]
        if any(name.upper() == own_name.upper() for name in names):
            return {
                "eventId": (doc.get("event") or {}).get("id"),
                "eventName": (doc.get("event") or {}).get("name"),
                "gameId": game.get("id"),
                "gameNumber": game.get("gameNumber"),
                "divisionLabel": game.get("divisionLabel"),
                "dateIso": game.get("dateIso"),
                "timeLabel": game.get("timeLabel"),
                "venue": game.get("venue"),
                "sourceTeamName": own_name,
                "opponentName": opponent_name(game, own_name),
                "sourceTeamClubId": next((p.get("clubId") for p in (game.get("white"), game.get("dark")) if isinstance(p, dict) and participant_name(p).upper() == own_name.upper()), None),
            }
    raise RuntimeError(f"No real 14U Boys row found for {own_name}")


def main():
    evan = json.loads(SOURCES[0].read_text())
    quick = json.loads(SOURCES[1].read_text())
    cases = [
        {**find_case(evan, "LAMORINDA A"), "expected":"auto_match_a_only", "sourcePath":str(SOURCES[0].relative_to(ROOT))},
        {**find_case(evan, "LAMORINDA B"), "expected":"auto_match_b_only", "sourcePath":str(SOURCES[0].relative_to(ROOT))},
        {**find_case(quick, "LAMORINDA"), "expected":"identity_review_when_multiple_live_squads", "sourcePath":str(SOURCES[1].relative_to(ROOT))},
    ]
    payload = {
        "schemaVersion":1,
        "release":"7.58.5",
        "purpose":"Source-backed QA only; never loaded by the production dashboard.",
        "generatedAt":"2026-08-13T00:00:00Z",
        "cases":cases,
    }
    OUT.write_text(json.dumps(payload, indent=2) + "\n")
    print(f"WPI Live 7.58.5 feed validation evidence: {len(cases)} real source cases -> {OUT.relative_to(ROOT)}")

if __name__ == "__main__":
    main()
