#!/usr/bin/env python3
"""Build the WPI reusable tournament-platform registry and migrated event bundles."""
from __future__ import annotations

import json
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_REGISTRY = ROOT / "data/tournaments/registry.json"
PLATFORM_DIR = ROOT / "data/tournaments/platform"
NORMALIZED_DIR = ROOT / "data/tournaments/normalized"
CLUBS_PATH = ROOT / "clubs.json"
RANKINGS_PATH = ROOT / "rankings.json"
QUICKSILVER_PLACEMENTS = ROOT / "data/tournaments/quiksilver-cup-2026.json"
RELEASE = "7.54.0"
BUILD_TIMESTAMP = "2026-07-28T00:00:00Z"
FALLBACK_LOGO = "assets/logos/cpi-logo-fallback.svg"


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def slug(value: str) -> str:
    text = re.sub(r"[^a-z0-9]+", "-", str(value or "").lower()).strip("-")
    return text or "unknown"


def clean_participant(raw: dict | None) -> dict | None:
    if not raw or raw.get("kind") != "team" or not raw.get("participantId"):
        return None
    return {
        "participantId": raw.get("participantId"),
        "name": raw.get("displayName") or raw.get("raw") or "Team",
        "teamId": raw.get("teamId"),
        "clubId": raw.get("clubId"),
        "identityStatus": raw.get("identityStatus") or "unresolved",
        "identityMatchType": raw.get("identityMatchType"),
    }


def iso_range(games: list[dict]) -> tuple[str | None, str | None]:
    dates = sorted({g.get("dateIso") for g in games if g.get("dateIso")})
    return (dates[0], dates[-1]) if dates else (None, None)


def build_quiksilver(event: dict, clubs: list[dict], rankings: list[dict]) -> dict:
    club_by_id = {c.get("canonicalClubId"): c for c in clubs if c.get("canonicalClubId")}
    ranking_by_id = {r.get("canonicalTeamId"): r for r in rankings if r.get("canonicalTeamId")}
    placement_source = load(QUICKSILVER_PLACEMENTS)
    placement_by_participant = {}
    placements_by_division = defaultdict(list)
    for group in placement_source.get("groups", []):
        for placement in group.get("placements", []):
            row = {
                "place": placement.get("place"),
                "name": placement.get("name"),
                "participantId": placement.get("participantId"),
                "teamId": placement.get("teamId"),
                "clubId": placement.get("clubId"),
                "teamPage": placement.get("teamPage"),
                "clubPage": placement.get("clubPage"),
                "clubName": placement.get("clubName"),
                "divisionId": placement.get("divisionId"),
                "divisionLabel": placement.get("divisionLabel"),
                "ageGroup": placement.get("ageGroup"),
                "gender": placement.get("gender"),
                "source": placement.get("source"),
            }
            if row["participantId"]:
                placement_by_participant[row["participantId"]] = row
            if row["divisionId"]:
                placements_by_division[row["divisionId"]].append(row)

    all_games = []
    division_rows = []
    team_state: dict[str, dict] = {}
    venue_counts = defaultdict(int)
    date_counts = defaultdict(int)

    for division in event.get("divisions", []):
        path = NORMALIZED_DIR / event["id"] / f"{division['id']}.json"
        dataset = load(path)
        games = dataset.get("games", [])
        start_date, end_date = iso_range(games)
        division_team_ids = set()
        division_venues = set()
        division_dates = set()

        for game in games:
            white = clean_participant(game.get("participants", {}).get("white"))
            dark = clean_participant(game.get("participants", {}).get("dark"))
            compact = {
                "id": game.get("id"),
                "divisionId": division["id"],
                "divisionLabel": division.get("label"),
                "ageGroup": division.get("ageGroup"),
                "gender": division.get("gender"),
                "division": division.get("division"),
                "divisionTier": division.get("divisionTier"),
                "dateIso": game.get("dateIso"),
                "dateLabel": game.get("dateLabel"),
                "timeLabel": game.get("timeLabel"),
                "timezone": game.get("timezone") or "America/Los_Angeles",
                "venue": game.get("venue") or "Venue not listed",
                "gameNumber": game.get("sourceGameNumber") or game.get("sourceGameId"),
                "stage": game.get("stageDisplay") or game.get("stage") or "Tournament game",
                "status": game.get("status") or "scheduled",
                "scoreState": game.get("scoreState"),
                "white": white,
                "dark": dark,
                "scores": game.get("scores") or {},
                "shootout": game.get("shootout"),
                "outcome": game.get("outcome") or {},
            }
            all_games.append(compact)
            venue_counts[compact["venue"]] += 1
            division_venues.add(compact["venue"])
            if compact["dateIso"]:
                date_counts[compact["dateIso"]] += 1
                division_dates.add(compact["dateIso"])

            for side in (white, dark):
                if not side:
                    continue
                pid = side["participantId"]
                division_team_ids.add(pid)
                state = team_state.setdefault(pid, {
                    **side,
                    "divisionId": division["id"],
                    "divisionLabel": division.get("label"),
                    "ageGroup": division.get("ageGroup"),
                    "gender": division.get("gender"),
                    "division": division.get("division"),
                    "divisionTier": division.get("divisionTier"),
                    "gameIds": [],
                    "wins": 0,
                    "losses": 0,
                    "ties": 0,
                })
                state["gameIds"].append(compact["id"])

            if compact["status"] == "final":
                winner = compact["outcome"].get("winnerParticipantId")
                loser = compact["outcome"].get("loserParticipantId")
                if winner in team_state:
                    team_state[winner]["wins"] += 1
                if loser in team_state:
                    team_state[loser]["losses"] += 1
                if not winner and white and dark:
                    ws = compact["scores"].get("white")
                    ds = compact["scores"].get("dark")
                    if ws is not None and ds is not None and ws == ds:
                        team_state[white["participantId"]]["ties"] += 1
                        team_state[dark["participantId"]]["ties"] += 1

        final_games = sum(g.get("status") == "final" for g in games)
        division_rows.append({
            "id": division["id"],
            "label": division.get("label"),
            "season": division.get("season"),
            "ageGroup": division.get("ageGroup"),
            "gender": division.get("gender"),
            "division": division.get("division"),
            "divisionTier": division.get("divisionTier"),
            "status": "complete" if final_games == len(games) else "in_progress",
            "gameCount": len(games),
            "finalGameCount": final_games,
            "scheduledGameCount": len(games) - final_games,
            "teamCount": len(division_team_ids),
            "startDate": start_date,
            "endDate": end_date,
            "venues": sorted(division_venues),
            "dates": sorted(division_dates),
            "source": {
                "adapter": "google_sheets_csv",
                "sourceUrl": division.get("sourceUrl"),
                "spreadsheetId": division.get("spreadsheetId"),
                "gid": division.get("gid"),
                "parser": division.get("parser"),
            },
        })

    teams = []
    for pid, state in team_state.items():
        club = club_by_id.get(state.get("clubId")) or {}
        ranked = ranking_by_id.get(state.get("teamId")) or {}
        placement = placement_by_participant.get(pid) or {}
        team_page = ranked.get("teamPage") or placement.get("teamPage")
        club_page = club.get("clubPage") or placement.get("clubPage")
        teams.append({
            **state,
            "name": placement.get("name") or state.get("name"),
            "clubName": club.get("displayName") or placement.get("clubName") or club.get("club"),
            "clubSlug": club.get("slug"),
            "teamPage": team_page,
            "clubPage": club_page,
            "logo": ranked.get("logo") or club.get("logo") or FALLBACK_LOGO,
            "primaryColor": ranked.get("primaryColor") or club.get("primaryColor") or "#126dff",
            "secondaryColor": ranked.get("secondaryColor") or club.get("secondaryColor") or "#f6b700",
            "rank": ranked.get("postRank"),
            "rating": ranked.get("postCPI"),
            "finish": placement.get("place"),
            "finishLabel": f"{placement.get('place')}" if placement.get("place") else None,
            "record": {
                "wins": state["wins"],
                "losses": state["losses"],
                "ties": state["ties"],
                "display": f"{state['wins']}-{state['losses']}" + (f"-{state['ties']}" if state["ties"] else ""),
            },
        })
    teams.sort(key=lambda t: (t.get("ageGroup") or "", t.get("gender") or "", t.get("finish") or 999, t.get("name") or ""))

    for division_id, rows in placements_by_division.items():
        rows.sort(key=lambda x: (x.get("place") or 999, x.get("name") or ""))

    start_date, end_date = iso_range(all_games)
    all_games.sort(key=lambda g: (g.get("dateIso") or "", g.get("timeLabel") or "", g.get("divisionLabel") or "", g.get("gameNumber") or ""))
    official_source = event.get("divisions", [{}])[0].get("sourceUrl")
    return {
        "schemaVersion": 1,
        "release": RELEASE,
        "generatedAt": BUILD_TIMESTAMP,
        "event": {
            "id": event["id"],
            "name": event.get("name"),
            "shortName": event.get("shortName"),
            "season": "2026",
            "kind": event.get("kind"),
            "status": "complete",
            "operationsMode": "archive",
            "startDate": start_date,
            "endDate": end_date,
            "timezone": "America/Los_Angeles",
            "publicPath": "tournament.html?event=2026-quiksilver-cup",
            "legacyPath": event.get("publicPath"),
            "logo": "assets/logos/usa-water-polo.webp",
            "officialSourceUrl": official_source,
            "rankingEvidenceEnabled": False,
            "sourcePolicy": "Banked normalized results; official source remains linked for verification.",
        },
        "summary": {
            "divisionCount": len(division_rows),
            "gameCount": len(all_games),
            "finalGameCount": sum(g.get("status") == "final" for g in all_games),
            "scheduledGameCount": sum(g.get("status") != "final" for g in all_games),
            "teamCount": len(teams),
            "placementCount": sum(len(rows) for rows in placements_by_division.values()),
            "venueCount": len(venue_counts),
            "dateCount": len(date_counts),
        },
        "capabilities": {
            "views": ["games", "teams", "placements", "team_journey"],
            "filters": ["ageGroup", "gender", "division", "team", "date", "venue", "status", "search"],
            "teamProfiles": True,
            "clubProfiles": True,
            "officialSourceLinks": True,
            "liveRefresh": False,
        },
        "sourceAdapters": [
            {
                "id": "quiksilver-normalized-bank",
                "type": "normalized_json",
                "role": "primary",
                "pathTemplate": "data/tournaments/normalized/2026-quiksilver-cup/{divisionId}.json",
                "readMode": "repository",
            },
            {
                "id": "quiksilver-official-sheets",
                "type": "google_sheets_csv",
                "role": "provenance",
                "readMode": "official_source",
                "parser": "results_table_v1",
            },
        ],
        "divisions": division_rows,
        "teams": teams,
        "placements": {key: value for key, value in sorted(placements_by_division.items())},
        "venues": [
            {"id": slug(name), "label": name, "gameCount": count}
            for name, count in sorted(venue_counts.items())
        ],
        "dates": [
            {"dateIso": date, "gameCount": count}
            for date, count in sorted(date_counts.items())
        ],
        "games": all_games,
    }


def build_registry(source: dict, bundle: dict) -> dict:
    events = []
    for event in source.get("events", []):
        migrated = event.get("id") == "2026-quiksilver-cup"
        events.append({
            "id": event.get("id"),
            "name": event.get("name"),
            "shortName": event.get("shortName"),
            "season": "2026",
            "kind": event.get("kind"),
            "status": event.get("eventStatus"),
            "operationsMode": event.get("operationsMode"),
            "divisionCount": len(event.get("divisions", [])),
            "publicPath": "tournament.html?event=2026-quiksilver-cup" if migrated else event.get("publicPath"),
            "legacyPath": event.get("publicPath") if migrated else None,
            "migrationStatus": "platform_live" if migrated else "registered_legacy_view",
            "dataPath": "data/tournaments/platform/events/2026-quiksilver-cup.json" if migrated else None,
            "rankingEvidenceEnabled": bool(event.get("rankingEvidenceEnabled")),
            "filterCapabilities": bundle.get("capabilities", {}).get("filters", []) if migrated else [],
            "sourceAdapters": bundle.get("sourceAdapters", []) if migrated else [],
        })
    return {
        "schemaVersion": 1,
        "release": RELEASE,
        "generatedAt": BUILD_TIMESTAMP,
        "description": "Shared WPI tournament platform registry. Quiksilver Cup is the first controlled migration; other registered events remain on their proven legacy viewers until individually migrated.",
        "platformPath": "tournament.html",
        "schemaPaths": {
            "event": "tournaments/schema/tournament-event.schema.json",
            "division": "tournaments/schema/tournament-division.schema.json",
            "participant": "tournaments/schema/tournament-participant.schema.json",
            "venue": "tournaments/schema/tournament-venue.schema.json",
            "sourceAdapter": "tournaments/schema/tournament-source-adapter.schema.json",
            "bundle": "tournaments/schema/tournament-platform-bundle.schema.json",
            "normalizedGame": "tournaments/schema/normalized-game.schema.json",
        },
        "adapters": {
            "normalized_json": {"mode": "repository", "purpose": "Primary banked WPI datasets"},
            "google_sheets_csv": {"mode": "official_source", "purpose": "Live or provenance source adapter"},
            "repository_csv": {"mode": "repository", "purpose": "Static CSV import and historical fallback"},
        },
        "events": events,
    }


def main() -> int:
    source = load(SOURCE_REGISTRY)
    clubs = load(CLUBS_PATH)
    rankings = load(RANKINGS_PATH)
    event = next(item for item in source["events"] if item["id"] == "2026-quiksilver-cup")
    bundle = build_quiksilver(event, clubs, rankings)
    registry = build_registry(source, bundle)
    dump(PLATFORM_DIR / "events/2026-quiksilver-cup.json", bundle)
    dump(PLATFORM_DIR / "registry.json", registry)
    runtime = "window.WPI_TOURNAMENT_PLATFORM_REGISTRY = " + json.dumps(registry, separators=(",", ":"), ensure_ascii=False) + ";\n"
    (PLATFORM_DIR / "runtime.js").write_text(runtime, encoding="utf-8")
    print("WPI TOURNAMENT PLATFORM BUILD COMPLETE")
    print(f" - {len(registry['events'])} registered events")
    print(f" - Quiksilver Cup: {bundle['summary']['divisionCount']} divisions, {bundle['summary']['gameCount']} games, {bundle['summary']['teamCount']} teams")
    print(" - Rankings remain manual and unchanged")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
