#!/usr/bin/env python3
"""Build profile-safe historical tournament summaries without enabling ranking evidence."""
from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path
from typing import Any

from tournament_pipeline import ROOT, load_json, write_json

RELEASE = "7.49.0"
ARCHIVE = ROOT / "data" / "tournaments" / "archive" / "index.json"
IDENTITY = ROOT / "data" / "identity" / "index.json"
RANKINGS = ROOT / "rankings.json"
OUTPUT_ROOT = ROOT / "data" / "tournaments" / "history"
OUTPUT = OUTPUT_ROOT / "index.json"
RUNTIME = OUTPUT_ROOT / "runtime.js"
QA = ROOT / "qa" / "historical-profile-summary-7.49.0.json"


def empty_summary() -> dict[str, int]:
    return {
        "events": 0,
        "divisions": 0,
        "games": 0,
        "finalGames": 0,
        "scheduledGames": 0,
        "wins": 0,
        "losses": 0,
        "ties": 0,
        "goalsFor": 0,
        "goalsAgainst": 0,
        "goalDifference": 0,
        "placements": 0,
        "bestFinish": 0,
    }


def clean_goal(value: Any) -> int:
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        return 0
    return int(float(value))


def team_record(team_id: str, teams: dict[str, Any], rankings: dict[str, Any]) -> dict[str, Any]:
    team = teams.get(team_id, {})
    rank = rankings.get(team_id, {})
    return {
        "canonicalTeamId": team_id,
        "canonicalClubId": team.get("clubId"),
        "name": team.get("name") or rank.get("team") or team_id,
        "group": team.get("group") or rank.get("group"),
        "ageGroup": team.get("ageGroup"),
        "gender": team.get("gender"),
        "teamPage": team.get("legacyTeamPage") or rank.get("teamPage"),
        "clubPage": None,
        "rankingSnapshot": {
            "rank": rank.get("postRank"),
            "cpi": rank.get("postCPI"),
            "group": rank.get("group"),
        },
        "summary": empty_summary(),
        "appearances": [],
        "placements": [],
        "recentGames": [],
    }


def club_record(club_id: str, clubs: dict[str, Any]) -> dict[str, Any]:
    club = clubs.get(club_id, {})
    return {
        "canonicalClubId": club_id,
        "name": club.get("displayName") or club.get("name") or club_id,
        "slug": club.get("slug"),
        "clubPage": club.get("legacyClubPage"),
        "region": club.get("region"),
        "summary": empty_summary(),
        "teamIds": [],
        "teamNames": [],
        "appearances": [],
        "placements": [],
        "recentGames": [],
    }


def apply_result(summary: dict[str, Any], game: dict[str, Any], side: str) -> None:
    summary["games"] += 1
    if game.get("status") != "final":
        summary["scheduledGames"] += 1
        return
    summary["finalGames"] += 1
    result = game.get(f"{side}Result")
    if result == "W": summary["wins"] += 1
    elif result == "L": summary["losses"] += 1
    elif result == "T": summary["ties"] += 1
    score_for = game.get(f"{side}Score")
    other = "dark" if side == "white" else "white"
    score_against = game.get(f"{other}Score")
    summary["goalsFor"] += clean_goal(score_for)
    summary["goalsAgainst"] += clean_goal(score_against)


def game_for_side(game: dict[str, Any], side: str) -> dict[str, Any]:
    other = "dark" if side == "white" else "white"
    return {
        "gameId": game.get("id"),
        "eventId": game.get("eventId"),
        "eventName": game.get("eventName"),
        "eventPublicPath": game.get("eventPublicPath"),
        "divisionId": game.get("divisionId"),
        "divisionLabel": game.get("divisionLabel"),
        "divisionTier": game.get("divisionTier"),
        "dateIso": game.get("dateIso"),
        "dateLabel": game.get("dateLabel"),
        "timeLabel": game.get("timeLabel"),
        "venue": game.get("venue"),
        "stage": game.get("stage"),
        "gameNumber": game.get("gameNumber") or game.get("sourceGameId"),
        "status": game.get("status"),
        "result": game.get(f"{side}Result"),
        "scoreFor": game.get(f"{side}Score"),
        "scoreAgainst": game.get(f"{other}Score"),
        "scoreDisplay": game.get("scoreDisplay"),
        "opponentName": game.get(other),
        "opponentTeamId": game.get(f"{other}TeamId"),
        "opponentClubId": game.get(f"{other}ClubId"),
        "opponentTeamPage": game.get(f"{other}TeamPage"),
        "opponentClubPage": game.get(f"{other}ClubPage"),
        "sourceUrl": game.get("sourceUrl"),
    }


def appearance_key(item: dict[str, Any]) -> str:
    return f"{item.get('eventId')}|{item.get('divisionId')}"


def finalize_summary(summary: dict[str, Any], event_keys: set[str], division_keys: set[str], placements: list[dict[str, Any]], unique_games: set[str] | None = None) -> None:
    if unique_games is not None:
        summary["games"] = len(unique_games)
    summary["events"] = len(event_keys)
    summary["divisions"] = len(division_keys)
    summary["goalDifference"] = summary["goalsFor"] - summary["goalsAgainst"]
    summary["placements"] = len(placements)
    valid = [int(item.get("place")) for item in placements if isinstance(item.get("place"), int)]
    summary["bestFinish"] = min(valid) if valid else 0


def main() -> int:
    archive = load_json(ARCHIVE)
    identity = load_json(IDENTITY)
    teams = identity.get("teams", {})
    clubs = identity.get("clubs", {})
    ranking_rows = load_json(RANKINGS)
    rankings = {item.get("canonicalTeamId"): item for item in ranking_rows if item.get("canonicalTeamId")}

    team_profiles: dict[str, dict[str, Any]] = {}
    club_profiles: dict[str, dict[str, Any]] = {}
    team_appearances: dict[str, dict[str, dict[str, Any]]] = defaultdict(dict)
    club_appearances: dict[str, dict[str, dict[str, Any]]] = defaultdict(dict)
    team_events: dict[str, set[str]] = defaultdict(set)
    team_divisions: dict[str, set[str]] = defaultdict(set)
    club_events: dict[str, set[str]] = defaultdict(set)
    club_divisions: dict[str, set[str]] = defaultdict(set)
    club_game_ids: dict[str, set[str]] = defaultdict(set)
    club_team_ids: dict[str, set[str]] = defaultdict(set)
    club_team_names: dict[str, set[str]] = defaultdict(set)

    for game in archive.get("games", []):
        for side in ("white", "dark"):
            team_id = game.get(f"{side}TeamId")
            club_id = game.get(f"{side}ClubId")
            name = game.get(side)
            item = game_for_side(game, side)
            key = appearance_key(item)
            if team_id:
                profile = team_profiles.setdefault(team_id, team_record(team_id, teams, rankings))
                if profile.get("canonicalClubId") and not profile.get("clubPage"):
                    profile["clubPage"] = clubs.get(profile["canonicalClubId"], {}).get("legacyClubPage")
                apply_result(profile["summary"], game, side)
                profile["recentGames"].append(item)
                team_events[team_id].add(str(game.get("eventId")))
                team_divisions[team_id].add(key)
                appearance = team_appearances[team_id].setdefault(key, {
                    "eventId": game.get("eventId"), "eventName": game.get("eventName"),
                    "eventPublicPath": game.get("eventPublicPath"), "divisionId": game.get("divisionId"),
                    "divisionLabel": game.get("divisionLabel"), "divisionTier": game.get("divisionTier"),
                    "sourceUrl": game.get("sourceUrl"), **empty_summary(),
                })
                apply_result(appearance, game, side)
            if club_id:
                profile = club_profiles.setdefault(club_id, club_record(club_id, clubs))
                apply_result(profile["summary"], game, side)
                profile["recentGames"].append({**item, "teamId": team_id, "teamName": name, "teamPage": game.get(f"{side}TeamPage")})
                club_events[club_id].add(str(game.get("eventId")))
                club_divisions[club_id].add(key)
                club_game_ids[club_id].add(str(game.get("id")))
                if team_id: club_team_ids[club_id].add(team_id)
                if name: club_team_names[club_id].add(str(name))
                appearance = club_appearances[club_id].setdefault(key, {
                    "eventId": game.get("eventId"), "eventName": game.get("eventName"),
                    "eventPublicPath": game.get("eventPublicPath"), "divisionId": game.get("divisionId"),
                    "divisionLabel": game.get("divisionLabel"), "divisionTier": game.get("divisionTier"),
                    "sourceUrl": game.get("sourceUrl"), "teamIds": set(), "teamNames": set(), **empty_summary(),
                })
                apply_result(appearance, game, side)
                if team_id: appearance["teamIds"].add(team_id)
                if name: appearance["teamNames"].add(str(name))

    for event in archive.get("events", []):
        for placement in event.get("placements", []):
            team_id = placement.get("teamId")
            club_id = placement.get("clubId")
            compact = {key: placement.get(key) for key in (
                "eventId", "eventName", "divisionId", "divisionLabel", "ageGroup", "gender",
                "place", "name", "teamId", "clubId", "teamPage", "clubPage", "source", "gameId"
            )}
            if team_id and team_id in team_profiles:
                team_profiles[team_id]["placements"].append(compact)
            if club_id:
                profile = club_profiles.setdefault(club_id, club_record(club_id, clubs))
                profile["placements"].append(compact)

    for team_id, profile in team_profiles.items():
        profile["appearances"] = sorted(team_appearances[team_id].values(), key=lambda x: (x.get("eventName") or "", x.get("divisionLabel") or ""))
        profile["recentGames"] = sorted(profile["recentGames"], key=lambda x: (x.get("dateIso") or "", x.get("timeLabel") or "", str(x.get("gameNumber") or "")), reverse=True)[:24]
        profile["placements"] = sorted(profile["placements"], key=lambda x: (x.get("place") or 999, x.get("eventName") or ""))
        finalize_summary(profile["summary"], team_events[team_id], team_divisions[team_id], profile["placements"])
        for appearance in profile["appearances"]:
            finalize_summary(appearance, {str(appearance.get("eventId"))}, {appearance_key(appearance)}, [])

    for club_id, profile in club_profiles.items():
        converted = []
        for appearance in club_appearances[club_id].values():
            appearance["teamIds"] = sorted(appearance["teamIds"])
            appearance["teamNames"] = sorted(appearance["teamNames"])
            finalize_summary(appearance, {str(appearance.get("eventId"))}, {appearance_key(appearance)}, [])
            converted.append(appearance)
        profile["appearances"] = sorted(converted, key=lambda x: (x.get("eventName") or "", x.get("divisionLabel") or ""))
        profile["teamIds"] = sorted(club_team_ids[club_id])
        profile["teamNames"] = sorted(club_team_names[club_id])
        profile["recentGames"] = sorted(profile["recentGames"], key=lambda x: (x.get("dateIso") or "", x.get("timeLabel") or "", str(x.get("gameNumber") or "")), reverse=True)[:36]
        profile["placements"] = sorted(profile["placements"], key=lambda x: (x.get("place") or 999, x.get("eventName") or ""))
        # Club game count should be unique even if two teams from one club played each other.
        finalize_summary(profile["summary"], club_events[club_id], club_divisions[club_id], profile["placements"], club_game_ids[club_id])

    payload = {
        "schemaVersion": 1,
        "release": RELEASE,
        "generatedAt": archive.get("generatedAt"),
        "policy": {
            "profileDisplayOnly": True,
            "rankingEvidenceEnabled": False,
            "automaticRankingPublication": False,
            "historicalAndLiveEvidenceSeparated": True,
        },
        "counts": {
            "teams": len(team_profiles),
            "clubs": len(club_profiles),
            "games": archive.get("counts", {}).get("games", 0),
            "finalGames": archive.get("counts", {}).get("finalGames", 0),
            "placements": archive.get("counts", {}).get("placements", 0),
            "pendingDivisions": archive.get("counts", {}).get("pendingDivisions", 0),
        },
        "teams": team_profiles,
        "clubs": club_profiles,
    }
    write_json(OUTPUT, payload)
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    RUNTIME.write_text("window.CPI_HISTORICAL_PROFILES = " + json.dumps(payload, separators=(",", ":"), ensure_ascii=False) + ";\n", encoding="utf-8")
    qa = {
        "schemaVersion": 1,
        "release": RELEASE,
        "summary": payload["counts"],
        "rankingEvidenceEnabled": False,
        "teamIds": sorted(team_profiles),
        "clubIds": sorted(club_profiles),
    }
    write_json(QA, qa)
    print("HISTORICAL PROFILE BUILD COMPLETE")
    print(f" - {len(team_profiles)} ranked teams have archive-linked history")
    print(f" - {len(club_profiles)} clubs have archive-linked history")
    print(f" - {payload['counts']['finalGames']} historical finals remain profile-only and ranking-quarantined")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
