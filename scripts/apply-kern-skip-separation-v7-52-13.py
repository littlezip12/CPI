#!/usr/bin/env python3
"""Separate Kern Premier from SKIP across rankings, tournament identities, and profiles.

Corrections:
- 12U Boys #41, 14U Boys #64, 16U Boys #36, and 18U Girls #76 are Kern Premier.
- 18U Girls #35 is the true SKIP team.
- SKIP's completed 14U Boys Futures history remains with SKIP and is not attributed to Kern Premier.
- Kearns remains a separate Utah club and is not changed.

This migration preserves rank positions, CPI values, JO records, placements, scores, and paths.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
RELEASE = "7.52.13"


def load(rel: str) -> Any:
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))


def write(rel: str, value: Any) -> None:
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def norm(value: Any) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", str(value or "").lower())).strip()


def compute_club_record(base: dict[str, Any], rows: list[dict[str, Any]]) -> dict[str, Any]:
    ranked = [row for row in rows if isinstance(row.get("postRank"), int)]
    avg = round(sum(float(row.get("postCPI") or 0) for row in ranked) / len(ranked), 1) if ranked else None
    top = min(ranked, key=lambda row: int(row.get("postRank") or 9999)) if ranked else None
    out = dict(base)
    out.update({
        "teamCount": len(ranked),
        "bestRank": int(top["postRank"]) if top else None,
        "avgCPI": avg,
        "rankedTeams": len(ranked),
        "averageCPI": avg,
        "teams": sorted(ranked, key=lambda row: (str(row.get("group") or ""), int(row.get("postRank") or 9999))),
        "topTeam": dict(top) if top else None,
        "canonicalClubId": f"club-{out['slug']}",
    })
    return out


def patch_source_files() -> None:
    # Approved review files now preserve the correct source identity instead of borrowing SKIP history.
    boys = load("data/ranking-releases/boys-post-jo-2026-approved.json")
    for group in ["12U Boys", "14U Boys", "16U Boys"]:
        row = next(item for item in boys["ages"][group] if norm(item.get("sourceTeam")) == "kern premier")
        row.update({
            "mappedInitialIdentity": None,
            "assignedClubLevel": "A",
            "initialRank": "NR",
            "initialCPI": None,
            "seasonEvidence": "No matching published Kern Premier CPI team before JOs",
            "bestWin": None,
            "reviewFlags": "Identity corrected: Kern Premier separated from SKIP",
            "rationale": "Official JO placement remains the ranking anchor; SKIP tournament history is excluded from Kern Premier.",
        })
    write("data/ranking-releases/boys-post-jo-2026-approved.json", boys)

    girls = load("data/ranking-releases/girls-post-jo-2026-approved.json")
    row = next(item for item in girls["ages"]["18U Girls"] if norm(item.get("sourceTeam")) == "kern premier")
    row.update({
        "club": "Kern Premier",
        "mappedInitialIdentity": None,
        "assignedClubLevel": "A",
        "initialRank": "NR",
        "initialCPI": None,
        "preJOGames": None,
        "seasonEvidence": "Not separately ranked before JOs",
        "bestWin": "",
        "reviewFlags": "Identity corrected: Kern Premier separated from SKIP",
        "rationale": "JO-derived position retained under the correct Kern Premier club identity.",
    })
    write("data/ranking-releases/girls-post-jo-2026-approved.json", girls)

    # Future deterministic post-JO rebuilds must retain the separation.
    path = ROOT / "scripts/publish-boys-post-jo-2026.py"
    text = path.read_text(encoding="utf-8")
    if '"kern premier": "Kern Premier"' not in text:
        text = text.replace('    "skip": "SKIP",\n', '    "skip": "SKIP",\n    "kern premier": "Kern Premier",\n', 1)
        text = text.replace('    "kern premier": "SKIP",\n', '    "kern premier": "Kern Premier",\n')
        text = text.replace('    "SKIP": "skip",\n', '    "SKIP": "skip",\n    "Kern Premier": "kern-premier",\n')
    text = text.replace(
        '            "Kern Premier maps to SKIP when it is the only related entry in an age.",',
        '            "Kern Premier and SKIP remain separate club and team identities in every age group.",',
    )
    path.write_text(text, encoding="utf-8")

    path = ROOT / "scripts/publish-girls-post-jo-2026.py"
    text = path.read_text(encoding="utf-8")
    if '"kern premier": "Kern Premier"' not in text:
        text = text.replace(
            '    "socal": "SoCal", "wcac united": "WCAC United",\n',
            '    "socal": "SoCal", "wcac united": "WCAC United", "kern premier": "Kern Premier",\n',
        )
        text = text.replace('    "kern premier": "SKIP",\n', '    "kern premier": "Kern Premier",\n')
        text = text.replace('    "SKIP": "skip",\n', '    "SKIP": "skip",\n    "Kern Premier": "kern-premier",\n')
    text = text.replace(
        '            "Kern Premier and SKIP remain separate rosters when both appear, under one club hierarchy.",',
        '            "Kern Premier and SKIP remain separate canonical clubs and rosters in every age group.",',
    )
    path.write_text(text, encoding="utf-8")


def main() -> int:
    patch_source_files()

    rankings = load("rankings.json")
    clubs = load("clubs.json")
    by_slug = {club.get("slug"): club for club in clubs}
    kern_base = dict(by_slug["kern-premier"])
    skip_base = dict(by_slug["skip"])

    migrations = {
        ("12U Boys", 41): "kern-premier-12u-boys",
        ("14U Boys", 64): "kern-premier-14u-boys",
        ("16U Boys", 36): "kern-premier-16u-boys",
        ("18U Girls", 76): "kern-premier-18u-girls",
    }
    old_route_aliases: dict[str, str] = {}
    changed: list[dict[str, Any]] = []

    for row in rankings:
        key = (str(row.get("group")), int(row.get("postRank") or 0))
        if key not in migrations:
            continue
        # These four exact ranking slots are anchored by Kern Premier's published JO placements.
        expected_record = {("12U Boys", 41): "3-4", ("14U Boys", 64): "5-4", ("16U Boys", 36): "3-5", ("18U Girls", 76): "2-5"}[key]
        if str(row.get("latestTournamentRecord")) != expected_record:
            raise SystemExit(f"Refusing migration: {key} record changed from {expected_record}")
        old_slug = str(row.get("slug") or "")
        new_slug = migrations[key]
        old_route_aliases[old_slug] = new_slug
        row.update({
            "team": "Kern Premier",
            "slug": new_slug,
            "club": "Kern Premier",
            "clubSlug": "kern-premier",
            "initials": "KP",
            "clubInitials": "KP",
            "teamDepth": 1,
            "teamDepthLabel": "primary/A-level",
            "primaryColor": kern_base.get("primaryColor") or "#111111",
            "secondaryColor": kern_base.get("secondaryColor") or "#ED1C24",
            "teamPage": f"team.html?team={new_slug}",
            "clubPage": "club.html?club=kern-premier",
            "logo": "assets/logos/canonical/kern-premier.webp",
            "website": kern_base.get("website") or "",
            "region": "Central Valley",
            "displayClubName": "Kern Premier",
            "canonicalClubId": "club-kern-premier",
            "city": kern_base.get("city") or "",
            "state": kern_base.get("state") or "CA",
            "country": kern_base.get("country") or "United States",
            "locationLabel": kern_base.get("locationLabel") or "Central California",
            "metroRegion": kern_base.get("metroRegion") or "Central Valley",
            "macroRegion": kern_base.get("macroRegion") or "California",
        })
        row.pop("canonicalTeamId", None)
        # The 14U row previously carried five completed Futures games belonging to SKIP.
        if key == ("14U Boys", 64):
            jo_games = int(row.get("gamesLatest") or 9)
            row.update({
                "preRank": None,
                "movement": 0,
                "cpiChange": 0.0,
                "bestWinClean": "",
                "gamesTracked": jo_games,
                "boysContextGames": jo_games,
                "eliteContextGames": jo_games,
                "previousRank": None,
                "previousCPI": None,
            })
            for field in ["eliteContextRecord", "majorEventGames", "majorEventRecord"]:
                row.pop(field, None)
        changed.append({"group": key[0], "rank": key[1], "oldSlug": old_slug, "newSlug": new_slug})

    if len(changed) != 4:
        raise SystemExit(f"Expected four Kern Premier ranking migrations, found {len(changed)}")

    # The sole remaining ranked SKIP entry is the true 18U Girls Championship team.
    skip_ranked = [row for row in rankings if row.get("clubSlug") == "skip"]
    if len(skip_ranked) != 1 or skip_ranked[0].get("group") != "18U Girls" or skip_ranked[0].get("postRank") != 35:
        raise SystemExit(f"Expected one true ranked SKIP team after migration, found {[(r.get('group'), r.get('postRank')) for r in skip_ranked]}")
    skip_row = skip_ranked[0]
    skip_row.update({
        "team": "SKIP",
        "initials": "S",
        "teamDepth": 1,
        "teamDepthLabel": "primary/A-level",
        "displayClubName": skip_base.get("displayName") or "Skip",
    })

    kern_rows = [row for row in rankings if row.get("clubSlug") == "kern-premier"]
    skip_rows = [row for row in rankings if row.get("clubSlug") == "skip"]
    kern_club = compute_club_record(kern_base, kern_rows)
    skip_club = compute_club_record(skip_base, skip_rows)
    rebuilt_clubs = [club for club in clubs if club.get("slug") not in {"kern-premier", "skip"}]
    rebuilt_clubs.extend([kern_club, skip_club])
    rebuilt_clubs.sort(key=lambda club: (str(club.get("displayName") or club.get("club") or "").lower(), str(club.get("slug") or "")))

    write("rankings.json", rankings)
    write("clubs.json", rebuilt_clubs)
    write("club-registry.json", rebuilt_clubs)

    overrides = load("config/identity-manual-overrides.json")
    overrides.setdefault("clubAliases", {}).setdefault("club-kern-premier", [])
    overrides["clubAliases"]["club-kern-premier"] = sorted(set(overrides["clubAliases"]["club-kern-premier"] + [
        "Kern Premier", "Kern Premier Water Polo"
    ]))
    overrides.setdefault("clubAliases", {}).setdefault("club-skip", [])
    overrides["clubAliases"]["club-skip"] = sorted(set(overrides["clubAliases"]["club-skip"] + ["SKIP", "Skip"]))
    overrides.setdefault("clubProfileOverrides", {})["club-kern-premier"] = {
        "name": "Kern Premier", "displayName": "Kern Premier", "region": "Central Valley",
        "city": kern_base.get("city") or "", "state": kern_base.get("state") or "CA",
        "country": kern_base.get("country") or "United States",
        "locationLabel": kern_base.get("locationLabel") or "Central California",
        "metroRegion": kern_base.get("metroRegion") or "Central Valley", "macroRegion": "California",
        "locationConfidence": "user_confirmed", "locationSource": "user_confirmed",
        "website": kern_base.get("website") or "", "logo": "assets/logos/canonical/kern-premier.webp",
        "primaryColor": kern_base.get("primaryColor") or "#111111",
        "secondaryColor": kern_base.get("secondaryColor") or "#ED1C24",
    }
    write("config/identity-manual-overrides.json", overrides)

    # First identity build creates the new stable team IDs.
    subprocess.run([sys.executable, "scripts/build-identity-registry.py"], cwd=ROOT, check=True)
    identity = load("data/identity/index.json")
    teams = identity.get("teams", {})
    kern_team_ids: dict[str, str] = {}
    for team_id, team in teams.items():
        if team.get("clubId") == "club-kern-premier":
            kern_team_ids[str(team.get("group"))] = team_id
    skip_team_id = next((team_id for team_id, team in teams.items() if team.get("clubId") == "club-skip" and team.get("group") == "18U Girls"), None)
    if set(kern_team_ids) != {"12U Boys", "14U Boys", "16U Boys", "18U Girls"} or not skip_team_id:
        raise SystemExit(f"Unexpected generated identities: Kern={kern_team_ids}, SKIP={skip_team_id}")

    # Keep prior incorrect public query routes resolving to the corrected Kern profiles.
    overrides = load("config/identity-manual-overrides.json")
    manual = {item.get("teamId"): item for item in overrides.setdefault("teamAliases", []) if item.get("teamId")}
    group_to_old = {
        "12U Boys": "skip-12u-boys",
        "14U Boys": "skip-a",
        "16U Boys": "skip-16u-boys",
        "18U Girls": "skip-b-18u-girls",
    }
    for group, old_alias in group_to_old.items():
        team_id = kern_team_ids[group]
        item = manual.setdefault(team_id, {"teamId": team_id, "aliases": []})
        item["aliases"] = sorted(set(item.get("aliases", []) + [old_alias]))
    overrides["teamAliases"] = sorted(manual.values(), key=lambda item: item["teamId"])
    write("config/identity-manual-overrides.json", overrides)
    subprocess.run([sys.executable, "scripts/build-identity-registry.py"], cwd=ROOT, check=True)

    # Propagate canonical IDs through every normalized tournament dataset.
    normalized_files = 0
    participant_updates = 0
    for path in sorted((ROOT / "data/tournaments/normalized").glob("*/*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        touched = False
        event_id = str(data.get("event", {}).get("id") or path.parent.name)
        for game in data.get("games", []):
            group = f"{game.get('ageGroup')} {game.get('gender')}"
            for participant in game.get("participants", {}).values():
                if participant.get("kind") != "team":
                    continue
                name = norm(participant.get("displayName") or participant.get("raw"))
                desired_team_id = participant.get("teamId")
                desired_club_id = participant.get("clubId")
                desired_participant_id = participant.get("participantId")
                if name.startswith("kern premier"):
                    desired_club_id = "club-kern-premier"
                    desired_team_id = kern_team_ids.get(group)
                    desired_participant_id = desired_team_id or f"tournament-team-2026-{norm(game.get('ageGroup')).replace(' ', '-')}-{norm(game.get('gender')).replace(' ', '-')}-kern-premier"
                elif name == "skip" or name.startswith("skip "):
                    desired_club_id = "club-skip"
                    if group == "18U Girls" and event_id == "2026-jo-weekend-1":
                        desired_team_id = skip_team_id
                        desired_participant_id = skip_team_id
                    else:
                        # The completed 14U Boys Futures results are true SKIP history, not Kern Premier evidence.
                        desired_team_id = None
                        desired_participant_id = f"tournament-team-2026-{norm(game.get('ageGroup')).replace(' ', '-')}-{norm(game.get('gender')).replace(' ', '-')}-skip"
                else:
                    continue
                desired = {
                    "teamId": desired_team_id,
                    "clubId": desired_club_id,
                    "participantId": desired_participant_id,
                    "rankingEligible": bool(desired_team_id),
                    "identityStatus": "resolved_team" if desired_team_id else "resolved_club_only",
                    "identityMatchType": "team_alias" if desired_team_id else "club_alias",
                }
                for field, value in desired.items():
                    if participant.get(field) != value:
                        participant[field] = value
                        touched = True
                participant_updates += 1
        if touched:
            path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            normalized_files += 1

    # Rebuild all downstream profile, tournament, club, and browser artifacts.
    for command in [
        [sys.executable, "scripts/build-tournament-evidence.py"],
        [sys.executable, "scripts/build-tournament-archive.py"],
        [sys.executable, "scripts/build-historical-profiles.py"],
        [sys.executable, "scripts/build-jo-profile-bridge.py"],
        [sys.executable, "scripts/build-club-pages.py"],
    ]:
        subprocess.run(command, cwd=ROOT, check=True)

    audit = {
        "release": RELEASE,
        "rankingMigrations": changed,
        "rankedClubCounts": {
            "club-kern-premier": len(kern_rows),
            "club-skip": len(skip_rows),
            "club-kearns": len([row for row in rankings if row.get("clubSlug") == "kearns"]),
        },
        "canonicalTeamIds": {"kernPremier": kern_team_ids, "skip18UGirls": skip_team_id},
        "normalizedFilesUpdated": normalized_files,
        "participantRowsReviewed": participant_updates,
        "historySeparation": {
            "kernPremier": "2026 Junior Olympics placements and records",
            "skip": "True SKIP JO 18U Girls plus completed 14U Boys Futures club history",
        },
        "guardrail": "Rank positions, CPI values, JO records, scores, placements, and tournament paths remain unchanged.",
    }
    write("data/identity/kern-skip-separation-7.52.13.json", audit)
    print(json.dumps(audit, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
