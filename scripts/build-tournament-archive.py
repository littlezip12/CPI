#!/usr/bin/env python3
"""Build WPI historical tournament archive, placements, and profile links."""
from __future__ import annotations

import json
import math
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from tournament_pipeline import ROOT, load_json, write_json

RELEASE = "7.49.1"
EMPTY_GENERATED_AT = "2026-07-17T00:00:00Z"
REGISTRY = ROOT / "data" / "tournaments" / "registry.json"
NORMALIZED = ROOT / "data" / "tournaments" / "normalized"
OUTPUT_ROOT = ROOT / "data" / "tournaments" / "archive"
OUTPUT = OUTPUT_ROOT / "index.json"
RUNTIME = OUTPUT_ROOT / "runtime.js"
IDENTITY = ROOT / "data" / "identity" / "index.json"
RANKINGS = ROOT / "rankings.json"
SYNC_REPORT = ROOT / "data" / "tournaments" / "qa" / "sync-archive-latest.json"

FALLBACK_PATHS = {
    "2026-quiksilver-cup": ROOT / "data" / "tournaments" / "quiksilver-cup-2026.json",
    "2026-boys-futures-super-finals": OUTPUT_ROOT / "2026-boys-futures-super-finals.json",
    "2026-girls-us-club-championships": OUTPUT_ROOT / "2026-girls-us-club-championships.json",
}

PLACEMENT_PAIR_RE = re.compile(r"^(?P<a>\d+)(?:st|nd|rd|th)\s*/\s*(?P<b>\d+)(?:st|nd|rd|th)$", re.I)
PLACEMENT_SINGLE_RE = re.compile(r"^(?P<a>\d+)(?:st|nd|rd|th)$", re.I)


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def participant_name(participant: dict[str, Any]) -> str:
    return str(participant.get("displayName") or participant.get("raw") or participant.get("sourceReference") or "TBD")


def decimal_score_parts(value: Any) -> tuple[int | None, int | None]:
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        return None, None
    number = float(value)
    base = math.floor(number + 1e-9)
    fraction = round((number - base) * 10)
    return base, fraction if fraction else None


def score_display(white: Any, dark: Any) -> tuple[str, dict[str, Any] | None]:
    if white is None or dark is None:
        return "—", None
    wb, ws = decimal_score_parts(white)
    db, ds = decimal_score_parts(dark)
    if wb is not None and db is not None and ws is not None and ds is not None and wb == db:
        return f"{wb}–{db} (SO {ws}–{ds})", {"white": ws, "dark": ds, "regulationWhite": wb, "regulationDark": db}
    def clean(value: Any) -> str:
        if isinstance(value, float) and value.is_integer():
            return str(int(value))
        return str(value)
    return f"{clean(white)}–{clean(dark)}", None


def outcome_for_side(game: dict[str, Any], side: str) -> str | None:
    if game.get("status") != "final":
        return None
    white = game.get("scores", {}).get("white")
    dark = game.get("scores", {}).get("dark")
    if white is None or dark is None:
        return None
    if white == dark:
        return "T"
    won = white > dark if side == "white" else dark > white
    return "W" if won else "L"


def links_for(participant: dict[str, Any], teams: dict[str, Any], clubs: dict[str, Any]) -> dict[str, Any]:
    team_id = participant.get("teamId")
    club_id = participant.get("clubId") or (teams.get(team_id, {}).get("clubId") if team_id else None)
    team = teams.get(team_id, {}) if team_id else {}
    club = clubs.get(club_id, {}) if club_id else {}
    return {
        "participantId": participant.get("participantId"),
        "teamId": team_id,
        "clubId": club_id,
        "teamPage": team.get("legacyTeamPage"),
        "clubPage": club.get("legacyClubPage"),
        "clubName": club.get("displayName") or club.get("name"),
        "identityStatus": participant.get("identityStatus"),
    }


def compact_game(game: dict[str, Any], event: dict[str, Any], division: dict[str, Any], teams: dict[str, Any], clubs: dict[str, Any]) -> dict[str, Any]:
    participants = game.get("participants", {})
    scores = game.get("scores", {})
    white = participants.get("white", {})
    dark = participants.get("dark", {})
    white_links = links_for(white, teams, clubs)
    dark_links = links_for(dark, teams, clubs)
    display, shootout = score_display(scores.get("white"), scores.get("dark"))
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
        "stageDisplay": game.get("stageDisplay") or game.get("stage"),
        "stageMeta": game.get("stageMeta"),
        "gameNumber": game.get("sourceGameNumber"),
        "sourceGameId": game.get("sourceGameId"),
        "sourceRow": game.get("sourceRow"),
        "status": game.get("status"),
        "scoreState": game.get("scoreState"),
        "white": participant_name(white),
        "dark": participant_name(dark),
        "whiteRaw": white.get("raw"),
        "darkRaw": dark.get("raw"),
        "whiteSourceReference": white.get("sourceReference"),
        "darkSourceReference": dark.get("sourceReference"),
        "whiteParticipantId": white_links["participantId"],
        "darkParticipantId": dark_links["participantId"],
        "whiteTeamId": white_links["teamId"],
        "darkTeamId": dark_links["teamId"],
        "whiteClubId": white_links["clubId"],
        "darkClubId": dark_links["clubId"],
        "whiteTeamPage": white_links["teamPage"],
        "darkTeamPage": dark_links["teamPage"],
        "whiteClubPage": white_links["clubPage"],
        "darkClubPage": dark_links["clubPage"],
        "whiteClubName": white_links["clubName"],
        "darkClubName": dark_links["clubName"],
        "whiteIdentityStatus": white_links["identityStatus"],
        "darkIdentityStatus": dark_links["identityStatus"],
        "whiteScore": scores.get("white"),
        "darkScore": scores.get("dark"),
        "scoreDisplay": display,
        "shootout": game.get("shootout") or shootout,
        "officialScoreDisplay": (f"{scores.get('whiteRaw')}–{scores.get('darkRaw')}" if scores.get("whiteRaw") and scores.get("darkRaw") else display),
        "whiteResult": outcome_for_side(game, "white"),
        "darkResult": outcome_for_side(game, "dark"),
        "sourceUrl": division.get("sourceUrl"),
        "rankingEvidenceEnabled": bool(event.get("rankingEvidenceEnabled")),
    }


def placement_record(place: int, participant: dict[str, Any], source: str, game_id: str | None, teams: dict[str, Any], clubs: dict[str, Any]) -> dict[str, Any]:
    links = links_for(participant, teams, clubs)
    return {
        "place": place,
        "name": participant_name(participant),
        "participantId": links["participantId"],
        "teamId": links["teamId"],
        "clubId": links["clubId"],
        "teamPage": links["teamPage"],
        "clubPage": links["clubPage"],
        "clubName": links["clubName"],
        "identityStatus": links["identityStatus"],
        "source": source,
        "gameId": game_id,
    }


def derive_placements(data: dict[str, Any], teams: dict[str, Any], clubs: dict[str, Any]) -> list[dict[str, Any]]:
    by_place: dict[int, dict[str, Any]] = {}
    for item in data.get("placements", []):
        place = item.get("place")
        participant = item.get("participant", {})
        if isinstance(place, int) and participant.get("kind") == "team":
            by_place[place] = placement_record(place, participant, "explicit_source_placement", None, teams, clubs)

    for game in data.get("games", []):
        if game.get("status") != "final":
            continue
        stage = str(game.get("stage") or "").strip()
        stage_meta = game.get("stageMeta") or {}
        match_pair = PLACEMENT_PAIR_RE.fullmatch(stage)
        match_single = PLACEMENT_SINGLE_RE.fullmatch(stage)
        stage_meta = game.get("stageMeta") or {}
        placement_meta = stage_meta.get("placement") if isinstance(stage_meta, dict) else None
        if not match_pair and not match_single and not placement_meta:
            continue
        participants = game.get("participants", {})
        scores = game.get("scores", {})
        white_score, dark_score = scores.get("white"), scores.get("dark")
        if white_score is None or dark_score is None or white_score == dark_score:
            continue
        winner = participants.get("white", {}) if white_score > dark_score else participants.get("dark", {})
        loser = participants.get("dark", {}) if white_score > dark_score else participants.get("white", {})
        if match_pair:
            winner_place, loser_place = int(match_pair.group("a")), int(match_pair.group("b"))
        elif match_single:
            winner_place = int(match_single.group("a"))
            loser_place = winner_place + 1
        elif placement_meta:
            winner_place = int(placement_meta.get("winnerPlace"))
            loser_place = int(placement_meta.get("loserPlace"))
        else:
            continue
        if winner.get("kind") == "team" and winner_place not in by_place:
            by_place[winner_place] = placement_record(winner_place, winner, "placement_game", game.get("id"), teams, clubs)
        if loser.get("kind") == "team" and loser_place not in by_place:
            by_place[loser_place] = placement_record(loser_place, loser, "placement_game", game.get("id"), teams, clubs)
    return [by_place[key] for key in sorted(by_place)]


def main() -> int:
    registry = load_json(REGISTRY)
    identity = load_json(IDENTITY)
    teams = identity.get("teams", {})
    clubs = identity.get("clubs", {})
    rankings = load_json(RANKINGS)
    ranked_team_ids = {item.get("canonicalTeamId") for item in rankings if item.get("canonicalTeamId")}
    sync_report = load_json(SYNC_REPORT) if SYNC_REPORT.exists() else {}
    failures = {(item.get("eventId"), item.get("divisionId")): item.get("error") for item in sync_report.get("failures", [])}
    archive_events = [event for event in registry.get("events", []) if event.get("archiveSyncEnabled")]
    games: list[dict[str, Any]] = []
    event_rows: list[dict[str, Any]] = []

    for event in archive_events:
        division_rows = []
        event_games: list[dict[str, Any]] = []
        event_placements: list[dict[str, Any]] = []
        legacy_groups = []
        for division in event.get("divisions", []):
            path = NORMALIZED / event["id"] / f"{division['id']}.json"
            data = load_json(path) if path.exists() else None
            normalized_games = data.get("games", []) if data else []
            compact = [compact_game(game, event, division, teams, clubs) for game in normalized_games]
            placements = derive_placements(data or {}, teams, clubs)
            for placement in placements:
                placement.update({
                    "eventId": event.get("id"),
                    "eventName": event.get("name"),
                    "divisionId": division.get("id"),
                    "divisionLabel": division.get("label"),
                    "ageGroup": division.get("ageGroup"),
                    "gender": division.get("gender"),
                })
            games.extend(compact)
            event_games.extend(compact)
            event_placements.extend(placements)
            counts = data.get("counts", {}) if data else {}
            participant_rows = [side for game in normalized_games for side in game.get("participants", {}).values() if side.get("kind") == "team"]
            linked_teams = {item.get("teamId") for item in participant_rows if item.get("teamId")}
            linked_clubs = {item.get("clubId") for item in participant_rows if item.get("clubId")}
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
                "pendingReason": failures.get((event.get("id"), division.get("id"))) if not data else None,
                "placements": placements,
                "identityCoverage": {
                    "teamParticipants": len(participant_rows),
                    "linkedTeamParticipants": sum(bool(item.get("teamId")) for item in participant_rows),
                    "linkedTeams": len(linked_teams),
                    "linkedClubs": len(linked_clubs),
                },
                "counts": counts or {"games": 0, "finalGames": 0, "scheduledGames": 0, "blockers": 0, "reviewItems": 0},
            })
            legacy_groups.append({"group": division.get("label"), "placements": placements})

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
                "placements": len(event_placements),
                "linkedFinalGames": sum(game.get("status") == "final" and bool(game.get("whiteTeamId") or game.get("darkTeamId")) for game in event_games),
            },
            "placements": event_placements,
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
                    "stage": game.get("stageDisplay") or game.get("stage") or "",
                    "gameNo": game.get("gameNumber") or "",
                    "gmid": game.get("sourceGameId") or "",
                    "white": game.get("white"),
                    "dark": game.get("dark"),
                    "whiteScore": game.get("whiteScore"),
                    "darkScore": game.get("darkScore"),
                    "scoreDisplay": game.get("scoreDisplay"),
                    "status": "Final" if game.get("status") == "final" else "Scheduled",
                    "source": "WPI normalized archive",
                }
                for game in event_games
            ],
        }
        fallback_path = FALLBACK_PATHS.get(event["id"])
        if fallback_path:
            write_json(fallback_path, fallback)

    payload = {
        "schemaVersion": 2,
        "release": RELEASE,
        "generatedAt": max((d.get("fetchedAt") or "" for event in event_rows for d in event.get("divisions", [])), default="") or EMPTY_GENERATED_AT,
        "policy": {
            "completedEventsOnly": True,
            "rankingEvidenceRequiresApproval": True,
            "automaticRankingPublication": False,
            "sourceBlending": False,
            "profileDisplayDoesNotEnableRankingEvidence": True,
        },
        "counts": {
            "events": len(event_rows),
            "divisions": sum(event["counts"]["divisions"] for event in event_rows),
            "bankedDivisions": sum(event["counts"]["bankedDivisions"] for event in event_rows),
            "pendingDivisions": sum(event["counts"]["divisions"] - event["counts"]["bankedDivisions"] for event in event_rows),
            "games": len(games),
            "finalGames": sum(game.get("status") == "final" for game in games),
            "scheduledGames": sum(game.get("status") != "final" for game in games),
            "placements": sum(event["counts"]["placements"] for event in event_rows),
            "teamLinkedFinalGames": sum(game.get("status") == "final" and bool(game.get("whiteTeamId") or game.get("darkTeamId")) for game in games),
            "rankedTeamsRepresented": len({team_id for game in games for team_id in (game.get("whiteTeamId"), game.get("darkTeamId")) if team_id in ranked_team_ids}),
            "clubsRepresented": len({club_id for game in games for club_id in (game.get("whiteClubId"), game.get("darkClubId")) if club_id}),
        },
        "events": event_rows,
        "games": games,
    }
    write_json(OUTPUT, payload)
    RUNTIME.parent.mkdir(parents=True, exist_ok=True)
    RUNTIME.write_text("window.CPI_TOURNAMENT_ARCHIVE = " + json.dumps(payload, separators=(",", ":"), ensure_ascii=False) + ";\n", encoding="utf-8")
    print("TOURNAMENT ARCHIVE BUILD COMPLETE")
    print(f" - {payload['counts']['events']} completed tournaments and {payload['counts']['divisions']} divisions registered")
    print(f" - {payload['counts']['bankedDivisions']} divisions banked; {payload['counts']['pendingDivisions']} awaiting source access")
    print(f" - {payload['counts']['games']} archived games including {payload['counts']['finalGames']} verified finals")
    print(f" - {payload['counts']['rankedTeamsRepresented']} ranked teams and {payload['counts']['clubsRepresented']} clubs have profile-linkable history")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
