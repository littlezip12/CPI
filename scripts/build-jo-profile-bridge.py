#!/usr/bin/env python3
"""Build profile-ready Junior Olympics summaries for ranked and tournament-only teams.

This bridge intentionally consumes the published JO results browser data so team and
club profiles present the same record and placement information users see on the
Tournament Results page. It does not alter rankings or infer game results.
"""
from __future__ import annotations

import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
RELEASE = "7.52.11"
RESULTS = ROOT / "data" / "tournaments" / "jo-results-2026.json"
PARTICIPANTS = ROOT / "data" / "tournaments" / "identity" / "participants.json"
IDENTITY = ROOT / "data" / "identity" / "index.json"
RANKINGS = ROOT / "rankings.json"
OUTPUT_JSON = ROOT / "data" / "tournaments" / "jo-profile-bridge.json"
OUTPUT_JS = ROOT / "data" / "tournaments" / "jo-profile-runtime.js"


def load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def normalize(value: Any) -> str:
    text = unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode("ascii")
    text = text.lower().replace("&", " and ")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", text)).strip()


def slugify(value: Any) -> str:
    return normalize(value).replace(" ", "-") or "team"


def app_division_id(division_id: str) -> str:
    if division_id == "10u-boys-championship":
        return "10u-championship"
    if division_id == "10u-coed-classic":
        return "10u-girls-classic"
    return division_id


def journey_url(group: dict[str, Any], division: dict[str, Any], team_name: str) -> str:
    app = "jo-boys" if group.get("category") == "Boys" else "jo-girls"
    from urllib.parse import urlencode
    query = urlencode({"division": app_division_id(str(division.get("id") or "")), "team": team_name, "focus": "journey"})
    return f"tournaments/{app}/?{query}#team-explorer"


def result_url(group: dict[str, Any], team_name: str) -> str:
    from urllib.parse import urlencode
    return f"tournaments.html?{urlencode({'results': group.get('id', ''), 'team': team_name})}#jo-results"


def record_parts(value: Any) -> dict[str, int | None]:
    match = re.fullmatch(r"\s*(\d+)\s*-\s*(\d+)(?:\s*-\s*(\d+))?\s*", str(value or ""))
    if not match:
        return {"wins": None, "losses": None, "ties": None, "games": None}
    wins = int(match.group(1))
    losses = int(match.group(2))
    ties = int(match.group(3) or 0)
    return {"wins": wins, "losses": losses, "ties": ties, "games": wins + losses + ties}


def main() -> int:
    results = load(RESULTS)
    participants_payload = load(PARTICIPANTS)
    identity = load(IDENTITY)
    rankings = load(RANKINGS)

    participants = participants_payload.get("participants", [])
    participant_index = {
        (str(item.get("group") or ""), normalize(item.get("name"))): item
        for item in participants
    }
    ranking_by_id = {item.get("canonicalTeamId"): item for item in rankings if item.get("canonicalTeamId")}
    clubs = identity.get("clubs", {})

    teams: dict[str, dict[str, Any]] = {}
    participant_to_slug: dict[str, str] = {}
    lookup: dict[str, str] = {}
    club_teams: dict[str, list[dict[str, Any]]] = defaultdict(list)
    unresolved: list[dict[str, Any]] = []

    for group in results.get("groups", []):
        group_label = str(group.get("label") or "")
        for division in group.get("divisions", []):
            for subdivision in division.get("subdivisions", []):
                for placement in subdivision.get("teams", []):
                    team_name = str(placement.get("team") or "").strip()
                    participant = participant_index.get((group_label, normalize(team_name)))
                    if not participant:
                        unresolved.append({"group": group_label, "team": team_name, "reason": "participant_not_found"})
                        continue

                    canonical_team_id = participant.get("canonicalTeamId")
                    canonical_club_id = participant.get("canonicalClubId")
                    ranking = ranking_by_id.get(canonical_team_id, {}) if canonical_team_id else {}
                    club = clubs.get(canonical_club_id, {}) if canonical_club_id else {}
                    if canonical_team_id and ranking:
                        profile_slug = str(ranking.get("slug") or slugify(team_name))
                        team_page = str(ranking.get("teamPage") or f"team.html?team={profile_slug}")
                    else:
                        profile_slug = f"{slugify(team_name)}-{slugify(group_label)}"
                        team_page = f"team.html?team={profile_slug}"

                    record = str(placement.get("record") or "").strip()
                    record_summary = record_parts(record)
                    item = {
                        "profileSlug": profile_slug,
                        "participantId": participant.get("id"),
                        "canonicalTeamId": canonical_team_id,
                        "canonicalClubId": canonical_club_id,
                        "rankingEligible": bool(participant.get("rankingEligible")),
                        "profileType": "ranked" if canonical_team_id and ranking else "tournament_only",
                        "team": team_name,
                        "displayTeamName": team_name,
                        "groupId": group.get("id"),
                        "group": group_label,
                        "ageGroup": group.get("ageGroup"),
                        "gender": group.get("category"),
                        "weekend": group.get("weekend"),
                        "event": results.get("event") or "2026 Junior Olympics",
                        "season": results.get("season") or "2026",
                        "divisionId": division.get("id"),
                        "division": division.get("label"),
                        "divisionTier": division.get("tier"),
                        "subdivisionId": subdivision.get("id"),
                        "subdivision": subdivision.get("label"),
                        "subdivisionPlace": placement.get("place"),
                        "subdivisionPlaceLabel": placement.get("placeLabel"),
                        "divisionPlace": placement.get("overallPlace"),
                        "divisionPlaceLabel": placement.get("overallPlaceLabel"),
                        "record": record,
                        "recordSummary": record_summary,
                        "clubId": canonical_club_id,
                        "clubSlug": club.get("slug"),
                        "clubName": club.get("displayName") or club.get("name") or participant.get("clubName") or team_name,
                        "clubPage": club.get("legacyClubPage") if club else None,
                        "teamPage": team_page,
                        "logo": club.get("logo") if club else None,
                        "region": club.get("region") if club else participant.get("region"),
                        "locationLabel": club.get("locationLabel") if club else "",
                        "primaryColor": club.get("primaryColor") if club else "#092E61",
                        "secondaryColor": club.get("secondaryColor") if club else "#D4AF37",
                        "journeyUrl": journey_url(group, division, team_name),
                        "resultsUrl": result_url(group, team_name),
                        "source": division.get("source"),
                    }
                    teams[profile_slug] = item
                    participant_to_slug[str(participant.get("id"))] = profile_slug
                    lookup[f"{group.get('id')}|{normalize(team_name)}"] = profile_slug
                    if canonical_club_id:
                        club_teams[canonical_club_id].append(item)

    club_profiles: dict[str, dict[str, Any]] = {}
    for club_id, items in sorted(club_teams.items()):
        club = clubs.get(club_id, {})
        ordered = sorted(items, key=lambda x: (
            int(re.search(r"\d+", str(x.get("ageGroup") or "99")).group(0)) if re.search(r"\d+", str(x.get("ageGroup") or "")) else 99,
            {"Boys": 0, "Girls": 1, "Coed": 2}.get(str(x.get("gender")), 9),
            str(x.get("team")),
        ))
        numeric_finishes = [int(x["divisionPlace"]) for x in ordered if isinstance(x.get("divisionPlace"), int)]
        groups = sorted({str(x.get("group")) for x in ordered if x.get("group")})
        club_profiles[club_id] = {
            "canonicalClubId": club_id,
            "clubSlug": club.get("slug"),
            "clubName": club.get("displayName") or club.get("name") or club_id,
            "clubPage": club.get("legacyClubPage"),
            "logo": club.get("logo"),
            "region": club.get("region"),
            "locationLabel": club.get("locationLabel"),
            "teamCount": len(ordered),
            "groupCount": len(groups),
            "groups": groups,
            "bestDivisionFinish": min(numeric_finishes) if numeric_finishes else None,
            "teams": ordered,
        }

    payload = {
        "schemaVersion": 1,
        "release": RELEASE,
        "season": results.get("season"),
        "event": results.get("event"),
        "generatedAt": results.get("generatedAt"),
        "sourceRelease": results.get("release"),
        "description": "Profile bridge generated from the published 2026 Junior Olympics placement browser. Records and placements are display-only and do not alter rankings.",
        "counts": {
            "profiles": len(teams),
            "rankedProfiles": sum(item.get("profileType") == "ranked" for item in teams.values()),
            "tournamentOnlyProfiles": sum(item.get("profileType") == "tournament_only" for item in teams.values()),
            "clubs": len(club_profiles),
            "unresolvedPlacements": len(unresolved),
        },
        "teams": teams,
        "participantToSlug": participant_to_slug,
        "lookup": lookup,
        "clubs": club_profiles,
        "unresolved": unresolved,
    }
    write_json(OUTPUT_JSON, payload)
    OUTPUT_JS.write_text(
        "window.WPI_JO_PROFILES=" + json.dumps(payload, separators=(",", ":"), ensure_ascii=True) + ";\n",
        encoding="utf-8",
    )

    kern = club_profiles.get("club-kern-premier", {})
    print("JO PROFILE BRIDGE BUILD COMPLETE")
    print(f" - {len(teams)} placement profiles across {len(club_profiles)} canonical clubs")
    print(f" - {payload['counts']['tournamentOnlyProfiles']} tournament-only teams now have profile routes")
    print(f" - Kern Premier has {kern.get('teamCount', 0)} JO team profiles")
    print(f" - {len(unresolved)} placement rows remain unresolved and are not linked")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
