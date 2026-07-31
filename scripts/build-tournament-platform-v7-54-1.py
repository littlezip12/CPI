#!/usr/bin/env python3
"""Build WPI reusable tournament-platform bundles for migrated archive events."""
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_REGISTRY = ROOT / "data/tournaments/registry.json"
PLATFORM_DIR = ROOT / "data/tournaments/platform"
NORMALIZED_DIR = ROOT / "data/tournaments/normalized"
ARCHIVE_DIR = ROOT / "data/tournaments/archive"
CLUBS_PATH = ROOT / "clubs.json"
RANKINGS_PATH = ROOT / "rankings.json"
ALIASES_PATH = ROOT / "data/identity/aliases.json"
RELEASE = "7.54.9"
BUILD_TIMESTAMP = "2026-07-30T20:45:00-07:00"
FALLBACK_LOGO = "assets/logos/cpi-logo-fallback.svg"
MIGRATED_EVENT_IDS = ["2026-quiksilver-cup", "2026-boys-futures-super-finals", "2025-evan-cousineau-memorial-cup", "2026-kap7-international", "2026-san-diego-county-cup"]
PLACEMENT_PATHS = {
    "2026-quiksilver-cup": ROOT / "data/tournaments/quiksilver-cup-2026.json",
    "2026-boys-futures-super-finals": ARCHIVE_DIR / "2026-boys-futures-super-finals.json",
    "2025-evan-cousineau-memorial-cup": ARCHIVE_DIR / "2025-evan-cousineau-memorial-cup.json",
    "2026-kap7-international": ARCHIVE_DIR / "2026-kap7-international.json",
    "2026-san-diego-county-cup": ARCHIVE_DIR / "2026-san-diego-county-cup.json",
}


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def slug(value: str) -> str:
    text = re.sub(r"[^a-z0-9]+", "-", str(value or "").lower()).strip("-")
    return text or "unknown"


def normalize(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", str(value or "").lower())).strip()


def clean_route_name(value: str) -> str:
    """Remove bracket-routing prefixes while preserving the actual team name."""
    text = re.sub(r"\s+", " ", str(value or "").strip())
    if "-" in text:
        prefix, suffix = text.rsplit("-", 1)
        if re.search(r"#|\(|\)|\]|\b(?:1st|2nd|3rd|4th)\b|^[A-Z]\d", prefix, re.I):
            text = suffix.strip()
    return text


def iso_range(games: list[dict]) -> tuple[str | None, str | None]:
    dates = sorted({game.get("dateIso") for game in games if game.get("dateIso")})
    return (dates[0], dates[-1]) if dates else (None, None)


def build_alias_index() -> list[tuple[str, str]]:
    aliases = load(ALIASES_PATH).get("clubAliases", [])
    rows = {(normalize(row.get("alias")), row.get("entityId")) for row in aliases if row.get("entityId")}
    return sorted(rows, key=lambda row: len(row[0]), reverse=True)


def resolve_club_id(name: str, alias_index: list[tuple[str, str]]) -> str | None:
    value = normalize(name)
    exact = next((entity_id for alias, entity_id in alias_index if alias == value), None)
    if exact:
        return exact
    for alias, entity_id in alias_index:
        if len(alias) < 3:
            continue
        if value.startswith(alias + " "):
            return entity_id
    return None


def placement_rows(event_id: str) -> tuple[dict[tuple[str, str], dict], dict[str, list[dict]]]:
    source = load(PLACEMENT_PATHS[event_id])
    by_name: dict[tuple[str, str], dict] = {}
    by_division: dict[str, list[dict]] = defaultdict(list)
    for group in source.get("groups", []):
        for placement in group.get("placements", []):
            name = clean_route_name(placement.get("name"))
            row = {
                "place": placement.get("place"),
                "placeLabel": placement.get("placeLabel"),
                "subdivision": placement.get("subdivision"),
                "name": name,
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
            if not row["divisionId"] or not name:
                continue
            by_name[(row["divisionId"], normalize(name))] = row
            by_division[row["divisionId"]].append(row)
    return by_name, by_division


def choose_participant_record(
    event: dict,
    division: dict,
    name: str,
    members: list[dict],
    placement: dict | None,
    alias_index: list[tuple[str, str]],
) -> dict:
    ranked_member = next((member for member in members if member.get("teamId")), None)
    club_member = next((member for member in members if member.get("clubId")), None)
    clean_member = next(
        (
            member
            for member in members
            if normalize(clean_route_name(member.get("displayName") or member.get("raw")))
            == normalize(member.get("displayName") or member.get("raw"))
        ),
        None,
    )
    preferred = ranked_member or club_member or clean_member or members[0]
    team_id = (placement or {}).get("teamId") or preferred.get("teamId")
    club_id = (placement or {}).get("clubId") or preferred.get("clubId")
    if not club_id:
        club_id = resolve_club_id(name, alias_index)
    participant_id = (
        (placement or {}).get("participantId")
        or (ranked_member or clean_member or preferred).get("participantId")
        or f"tournament-team-{event['season']}-{slug(division.get('ageGroup'))}-{slug(division.get('gender'))}-{slug(name)}"
    )
    # A tournament may enter the same club/team label in multiple competitive divisions.
    # Keep each division entry as its own journey while retaining the shared WPI team/club identity.
    if event.get("id") in {"2026-san-diego-county-cup", "2026-kap7-international"}:
        participant_id = f"{participant_id}--{division['id']}"
    identity_status = "resolved_team" if team_id else "resolved_club_only" if club_id else "unresolved"
    match_type = "platform_placement" if placement else "platform_route_merge"
    if team_id:
        match_type = preferred.get("identityMatchType") or match_type
    elif club_id:
        match_type = preferred.get("identityMatchType") or "platform_club_alias"
    return {
        "participantId": participant_id,
        "name": (placement or {}).get("name") or name,
        "teamId": team_id,
        "clubId": club_id,
        "identityStatus": identity_status,
        "identityMatchType": match_type,
    }


def build_event_bundle(event: dict, clubs: list[dict], rankings: list[dict], alias_index: list[tuple[str, str]]) -> dict:
    event_id = event["id"]
    club_by_id = {club.get("canonicalClubId"): club for club in clubs if club.get("canonicalClubId")}
    ranking_by_id = {row.get("canonicalTeamId"): row for row in rankings if row.get("canonicalTeamId")}
    placement_by_name, raw_placements_by_division = placement_rows(event_id)

    datasets: dict[str, dict] = {}
    grouped_participants: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for division in event.get("divisions", []):
        dataset = load(NORMALIZED_DIR / event_id / f"{division['id']}.json")
        datasets[division["id"]] = dataset
        seen = set()
        for game in dataset.get("games", []):
            for side in ("white", "dark"):
                raw = game.get("participants", {}).get(side)
                if not raw or raw.get("kind") != "team" or not raw.get("participantId"):
                    continue
                key = (raw.get("participantId"), raw.get("displayName"), raw.get("teamId"), raw.get("clubId"))
                if key in seen:
                    continue
                seen.add(key)
                clean_name = clean_route_name(raw.get("displayName") or raw.get("raw"))
                grouped_participants[(division["id"], normalize(clean_name))].append(raw)

    canonical_by_group: dict[tuple[str, str], dict] = {}
    original_to_canonical: dict[tuple[str, str], dict] = {}
    division_by_id = {division["id"]: division for division in event.get("divisions", [])}
    for group_key, members in grouped_participants.items():
        division_id, normalized_name = group_key
        division = division_by_id[division_id]
        display_name = clean_route_name(members[0].get("displayName") or members[0].get("raw"))
        placement = placement_by_name.get(group_key)
        canonical = choose_participant_record(event, division, display_name, members, placement, alias_index)
        canonical_by_group[group_key] = canonical
        for member in members:
            original_to_canonical[(division_id, member.get("participantId"))] = canonical

    all_games: list[dict] = []
    division_rows: list[dict] = []
    team_state: dict[str, dict] = {}
    venue_counts: dict[str, int] = defaultdict(int)
    date_counts: dict[str, int] = defaultdict(int)

    for division in event.get("divisions", []):
        dataset = datasets[division["id"]]
        games = dataset.get("games", [])
        start_date, end_date = iso_range(games)
        division_team_ids = set()
        division_venues = set()
        division_dates = set()

        for game in games:
            compact_participants = {}
            for side in ("white", "dark"):
                raw = game.get("participants", {}).get(side)
                canonical = None
                if raw and raw.get("kind") == "team" and raw.get("participantId"):
                    canonical = original_to_canonical.get((division["id"], raw.get("participantId")))
                compact_participants[side] = canonical

            white = compact_participants["white"]
            dark = compact_participants["dark"]
            original_outcome = game.get("outcome") or {}
            winner = original_to_canonical.get((division["id"], original_outcome.get("winnerParticipantId")))
            loser = original_to_canonical.get((division["id"], original_outcome.get("loserParticipantId")))
            # Some historical rows carry an outcome team ID that differs from the participant ID.
            # Reconcile by the authoritative winner/loser names before falling back to score comparison.
            winner_name_key = normalize(clean_route_name(original_outcome.get("winnerName")))
            loser_name_key = normalize(clean_route_name(original_outcome.get("loserName")))
            if not winner and winner_name_key:
                if white and normalize(white.get("name")) == winner_name_key:
                    winner = white
                elif dark and normalize(dark.get("name")) == winner_name_key:
                    winner = dark
            if not loser and loser_name_key:
                if white and normalize(white.get("name")) == loser_name_key:
                    loser = white
                elif dark and normalize(dark.get("name")) == loser_name_key:
                    loser = dark
            if game.get("status") == "final" and white and dark and (not winner or not loser):
                white_score = (game.get("scores") or {}).get("white")
                dark_score = (game.get("scores") or {}).get("dark")
                if white_score is not None and dark_score is not None and white_score != dark_score:
                    winner = winner or (white if white_score > dark_score else dark)
                    loser = loser or (dark if white_score > dark_score else white)
            outcome = {
                **original_outcome,
                "winnerParticipantId": winner.get("participantId") if winner else None,
                "winnerTeamId": winner.get("teamId") if winner else None,
                "winnerName": winner.get("name") if winner else original_outcome.get("winnerName"),
                "loserParticipantId": loser.get("participantId") if loser else None,
                "loserTeamId": loser.get("teamId") if loser else None,
                "loserName": loser.get("name") if loser else original_outcome.get("loserName"),
            }
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
                "outcome": outcome,
            }
            all_games.append(compact)
            venue_counts[compact["venue"]] += 1
            division_venues.add(compact["venue"])
            if compact["dateIso"]:
                date_counts[compact["dateIso"]] += 1
                division_dates.add(compact["dateIso"])

            for participant in (white, dark):
                if not participant:
                    continue
                pid = participant["participantId"]
                division_team_ids.add(pid)
                state = team_state.setdefault(
                    pid,
                    {
                        **participant,
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
                    },
                )
                state["gameIds"].append(compact["id"])

            if compact["status"] == "final":
                winner_id = outcome.get("winnerParticipantId")
                loser_id = outcome.get("loserParticipantId")
                if winner_id in team_state:
                    team_state[winner_id]["wins"] += 1
                if loser_id in team_state:
                    team_state[loser_id]["losses"] += 1
                if not winner_id and white and dark:
                    white_score = compact["scores"].get("white")
                    dark_score = compact["scores"].get("dark")
                    if white_score is not None and dark_score is not None and white_score == dark_score:
                        team_state[white["participantId"]]["ties"] += 1
                        team_state[dark["participantId"]]["ties"] += 1

        final_games = sum(game.get("status") == "final" for game in games)
        division_rows.append(
            {
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
            }
        )

    placements_by_division: dict[str, list[dict]] = defaultdict(list)
    for division_id, rows in raw_placements_by_division.items():
        for row in rows:
            canonical = canonical_by_group.get((division_id, normalize(row.get("name"))))
            if canonical:
                row = {
                    **row,
                    "name": canonical.get("name") or row.get("name"),
                    "participantId": canonical.get("participantId"),
                    "teamId": canonical.get("teamId") or row.get("teamId"),
                    "clubId": canonical.get("clubId") or row.get("clubId"),
                }
            placements_by_division[division_id].append(row)
        placements_by_division[division_id].sort(key=lambda item: ({"Platinum": 0, "Gold": 1}.get(item.get("subdivision"), 2), item.get("place") or 999, item.get("name") or ""))

    placement_by_participant = {
        row.get("participantId"): row
        for rows in placements_by_division.values()
        for row in rows
        if row.get("participantId")
    }
    teams = []
    for pid, state in team_state.items():
        club = club_by_id.get(state.get("clubId")) or {}
        ranked = ranking_by_id.get(state.get("teamId")) or {}
        placement = placement_by_participant.get(pid) or {}
        teams.append(
            {
                **state,
                "name": placement.get("name") or state.get("name"),
                "clubName": club.get("displayName") or placement.get("clubName") or club.get("club"),
                "clubSlug": club.get("slug"),
                "teamPage": ranked.get("teamPage") or placement.get("teamPage"),
                "clubPage": club.get("clubPage") or placement.get("clubPage"),
                "logo": ranked.get("logo") or club.get("logo") or FALLBACK_LOGO,
                "primaryColor": ranked.get("primaryColor") or club.get("primaryColor") or "#126dff",
                "secondaryColor": ranked.get("secondaryColor") or club.get("secondaryColor") or "#f6b700",
                "rank": ranked.get("postRank"),
                "rating": ranked.get("postCPI"),
                "finish": placement.get("place"),
                "finishLabel": placement.get("placeLabel") or (str(placement.get("place")) if placement.get("place") else None),
                "record": {
                    "wins": state["wins"],
                    "losses": state["losses"],
                    "ties": state["ties"],
                    "display": f"{state['wins']}-{state['losses']}" + (f"-{state['ties']}" if state["ties"] else ""),
                },
            }
        )
    teams.sort(key=lambda item: (item.get("ageGroup") or "", item.get("division") or "", item.get("finish") or 999, item.get("name") or ""))

    start_date, end_date = iso_range(all_games)
    all_games.sort(key=lambda game: (game.get("dateIso") or "", game.get("timeLabel") or "", game.get("divisionLabel") or "", game.get("gameNumber") or ""))
    official_source = event.get("officialSourceUrl") or event.get("divisions", [{}])[0].get("sourceUrl")
    if official_source and not str(official_source).startswith("http"):
        official_source = None
    adapter_prefix = slug(event_id)
    return {
        "schemaVersion": 1,
        "release": RELEASE,
        "generatedAt": BUILD_TIMESTAMP,
        "event": {
            "id": event_id,
            "name": event.get("name"),
            "shortName": event.get("shortName"),
            "season": (event.get("divisions") or [{}])[0].get("season"),
            "kind": event.get("kind"),
            "status": "complete",
            "operationsMode": "archive",
            "startDate": start_date,
            "endDate": end_date,
            "timezone": "America/Los_Angeles",
            "publicPath": f"tournament.html?event={event_id}",
            "legacyPath": event.get("legacyPublicPath") or event.get("publicPath"),
            "logo": "assets/logos/usa-water-polo.webp",
            "officialSourceUrl": official_source,
            "rankingEvidenceEnabled": False,
            "sourcePolicy": event.get("sourcePolicy") or "Banked normalized results; official source remains linked for verification.",
        },
        "summary": {
            "divisionCount": len(division_rows),
            "gameCount": len(all_games),
            "finalGameCount": sum(game.get("status") == "final" for game in all_games),
            "scheduledGameCount": sum(game.get("status") != "final" for game in all_games),
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
            "officialSourceLinks": bool(official_source and str(official_source).startswith("http")),
            "liveRefresh": False,
        },
        "sourceAdapters": [
            {
                "id": f"{adapter_prefix}-normalized-bank",
                "type": "normalized_json",
                "role": "primary",
                "pathTemplate": f"data/tournaments/normalized/{event_id}/{{divisionId}}.json",
                "readMode": "repository",
            },
            {
                "id": f"{adapter_prefix}-source",
                "type": "uploaded_csv" if (event.get("divisions", [{}])[0].get("sourceType") == "uploaded_csv") else "google_sheets_csv",
                "role": "provenance",
                "readMode": "repository" if (event.get("divisions", [{}])[0].get("sourceType") == "uploaded_csv") else "official_source",
                "parser": "results_table_v1",
            },
        ],
        "divisions": division_rows,
        "teams": teams,
        "placements": {key: rows for key, rows in sorted(placements_by_division.items())},
        "venues": [{"id": slug(name), "label": name, "gameCount": count} for name, count in sorted(venue_counts.items())],
        "dates": [{"dateIso": date, "gameCount": count} for date, count in sorted(date_counts.items())],
        "games": all_games,
    }


def build_registry(source: dict, bundles: dict[str, dict]) -> dict:
    events = []
    for event in source.get("events", []):
        bundle = bundles.get(event.get("id"))
        migrated = bundle is not None
        events.append(
            {
                "id": event.get("id"),
                "name": event.get("name"),
                "shortName": event.get("shortName"),
                "season": (event.get("divisions") or [{}])[0].get("season"),
                "kind": event.get("kind"),
                "status": event.get("eventStatus"),
                "operationsMode": event.get("operationsMode"),
                "divisionCount": len(event.get("divisions", [])),
                "publicPath": f"tournament.html?event={event.get('id')}" if migrated else event.get("publicPath"),
                "legacyPath": (event.get("legacyPublicPath") or event.get("publicPath")) if migrated else None,
                "migrationStatus": "platform_live" if migrated else "registered_legacy_view",
                "dataPath": f"data/tournaments/platform/events/{event.get('id')}.json" if migrated else None,
                "rankingEvidenceEnabled": bool(event.get("rankingEvidenceEnabled")),
                "filterCapabilities": bundle.get("capabilities", {}).get("filters", []) if migrated else [],
                "sourceAdapters": bundle.get("sourceAdapters", []) if migrated else [],
            }
        )
    return {
        "schemaVersion": 1,
        "release": RELEASE,
        "generatedAt": BUILD_TIMESTAMP,
        "description": "Shared WPI tournament platform registry. Quiksilver Cup, Boys Futures Super Finals, the 2025 Evan Cousineau Memorial Cup, 2026 KAP7 International, and the 2026 San Diego County Cup use one reusable viewer; other events remain on their proven viewers until deliberately migrated.",
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
            "uploaded_csv": {"mode": "repository", "purpose": "User-provided verified tournament results"},
        },
        "events": events,
    }


def main() -> int:
    source = load(SOURCE_REGISTRY)
    clubs = load(CLUBS_PATH)
    rankings = load(RANKINGS_PATH)
    alias_index = build_alias_index()
    event_by_id = {event["id"]: event for event in source.get("events", [])}
    bundles = {
        event_id: build_event_bundle(event_by_id[event_id], clubs, rankings, alias_index)
        for event_id in MIGRATED_EVENT_IDS
    }
    registry = build_registry(source, bundles)
    for event_id, bundle in bundles.items():
        dump(PLATFORM_DIR / f"events/{event_id}.json", bundle)
    dump(PLATFORM_DIR / "registry.json", registry)
    runtime = "window.WPI_TOURNAMENT_PLATFORM_REGISTRY = " + json.dumps(registry, separators=(",", ":"), ensure_ascii=False) + ";\n"
    (PLATFORM_DIR / "runtime.js").write_text(runtime, encoding="utf-8")
    print("WPI TOURNAMENT PLATFORM BUILD COMPLETE")
    print(f" - {len(registry['events'])} registered events; {len(bundles)} platform-live")
    for event_id in MIGRATED_EVENT_IDS:
        summary = bundles[event_id]["summary"]
        print(f" - {bundles[event_id]['event']['shortName']}: {summary['divisionCount']} divisions, {summary['gameCount']} games, {summary['teamCount']} teams, {summary['placementCount']} placements")
    print(" - Bracket-route participant labels are merged into clean team journeys")
    print(" - Rankings remain manual and unchanged")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
