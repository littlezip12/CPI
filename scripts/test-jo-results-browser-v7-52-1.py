#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ERRORS: list[str] = []


def fail(message: str) -> None:
    ERRORS.append(message)


def load_json(path: str):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def ordinal(number: int) -> str:
    if 10 <= number % 100 <= 20:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(number % 10, "th")
    return f"{number}{suffix}"


site = load_json("config/site-release.json")
results = load_json("data/tournaments/jo-results-2026.json")
html = (ROOT / "tournaments.html").read_text(encoding="utf-8")
js = (ROOT / "js/tournament-hub-v7-54-4.js").read_text(encoding="utf-8")
css_path = ROOT / "css/tournament-hub-v7-54-4.css"

if site.get("version") not in {"7.52.1", "7.52.2", "7.52.3", "7.52.4", "7.52.5", "7.52.6", "7.52.7", "7.52.8", "7.52.9", "7.52.10", "7.52.11", "7.52.12", "7.52.13", "7.52.14", "7.52.15", "7.52.16", "7.53.0", "7.53.1", "7.53.2", "7.53.3", "7.53.4", "7.53.5", "7.53.6", "7.53.7", "7.54.0", "7.54.1", "7.54.2", "7.54.3", "7.54.4", "7.54.5", "7.54.6", "7.54.7", "7.54.8", "7.54.9", "7.54.10","7.54.11","7.54.12","7.54.13", "7.54.14", "7.54.15", "7.54.17", "7.54.18","7.55.0", "7.55.1", "7.55.2", "7.55.4", "7.55.5", "7.55.6", "7.55.7", "7.55.8", "7.55.9", "7.56.0", "7.56.1", "7.56.2", "7.56.3", "7.56.4", "7.56.7", "7.56.8","7.56.9", "7.56.11", "7.56.12", "7.56.13"}:
    fail("site release must preserve JO results browser compatibility")
if site.get("joResultsRelease") not in {"7.52.1", "7.52.7", "7.52.8", "7.52.9", "7.52.10", "7.52.11", "7.52.12", "7.52.13", "7.52.14", "7.52.15"}:
    fail("joResultsRelease must preserve the data browser or the linked-journey UI release")
if site.get("tournamentUIRelease") not in {"7.52.1", "7.52.7", "7.52.8", "7.52.9", "7.52.10", "7.52.11", "7.52.12", "7.52.13", "7.52.14", "7.52.15", "7.54.0", "7.54.1", "7.54.2", "7.54.3", "7.54.4", "7.54.5", "7.54.6", "7.54.7", "7.54.8", "7.54.9", "7.54.10","7.54.11","7.54.17", "7.54.18","7.55.0", "7.55.1", "7.55.2", "7.55.4", "7.55.5", "7.55.6", "7.55.7", "7.55.8", "7.55.9", "7.56.0", "7.56.1", "7.56.2", "7.56.3", "7.56.4", "7.56.7", "7.56.8","7.56.9", "7.56.11", "7.56.12", "7.56.13"}:
    fail("tournamentUIRelease must preserve the results browser or the linked-journey UI release")
if results.get("release") != "7.52.1":
    fail("results data release must be 7.52.1")
if results.get("season") != 2026:
    fail("results data season must be 2026")
if results.get("status") != "complete":
    fail("results data must be marked complete")

expected_counts = {
    "10u-boys": 35,
    "12u-boys": 101,
    "14u-boys": 132,
    "16u-boys": 144,
    "18u-boys": 119,
    "10u-girls": 18,
    "10u-coed": 58,
    "12u-girls": 52,
    "12u-coed": 45,
    "14u-girls": 87,
    "16u-girls": 93,
    "18u-girls": 92,
}
expected_divisions = 23
expected_placements = 976
allowed_subdivisions = {
    "pt": "Platinum",
    "au": "Gold",
    "ag": "Silver",
    "bz": "Bronze",
    "cu": "Copper",
    "ni": "Nickel",
}
allowed_tiers = {"D1", "D2", "D3"}

groups = results.get("groups") or []
if len(groups) != len(expected_counts):
    fail(f"expected {len(expected_counts)} result groups, found {len(groups)}")

seen_group_ids: set[str] = set()
seen_division_ids: set[str] = set()
total_divisions = 0
total_placements = 0

for group in groups:
    group_id = group.get("id")
    if group_id in seen_group_ids:
        fail(f"duplicate group id: {group_id}")
    seen_group_ids.add(group_id)
    expected_count = expected_counts.get(group_id)
    if expected_count is None:
        fail(f"unexpected group id: {group_id}")
        continue
    divisions = group.get("divisions") or []
    group_count = 0
    for division in divisions:
        total_divisions += 1
        division_id = division.get("id")
        if division_id in seen_division_ids:
            fail(f"duplicate division id: {division_id}")
        seen_division_ids.add(division_id)
        if division.get("tier") not in allowed_tiers:
            fail(f"{division_id} has invalid tier {division.get('tier')}")
        subdivisions = division.get("subdivisions") or []
        if not subdivisions:
            fail(f"{division_id} has no subdivision results")
        division_count = 0
        division_teams: set[str] = set()
        offset = 0
        for subdivision in subdivisions:
            subdivision_id = subdivision.get("id")
            expected_label = allowed_subdivisions.get(subdivision_id)
            if not expected_label:
                fail(f"{division_id} has unknown subdivision id {subdivision_id}")
            elif subdivision.get("label") != expected_label:
                fail(f"{division_id}/{subdivision_id} label must be {expected_label}")
            teams = subdivision.get("teams") or []
            if not teams:
                fail(f"{division_id}/{subdivision_id} has no teams")
            if subdivision.get("teamCount") != len(teams):
                fail(f"{division_id}/{subdivision_id} teamCount does not match rows")
            for team in teams:
                name = str(team.get("team") or "").strip()
                if not name:
                    fail(f"{division_id}/{subdivision_id} contains a blank team")
                    continue
                normalized = re.sub(r"\s+", " ", name).casefold()
                if normalized in division_teams:
                    fail(f"{division_id} contains duplicate team {name}")
                division_teams.add(normalized)
                place_label = str(team.get("placeLabel") or "")
                overall_label = str(team.get("overallPlaceLabel") or "")
                if not place_label or not overall_label:
                    fail(f"{division_id} {name} is missing placement labels")
                place = team.get("place")
                overall = team.get("overallPlace")
                if isinstance(place, int):
                    expected_overall = offset + place
                    if overall != expected_overall:
                        fail(f"{division_id} {name} overall place should be {expected_overall}, found {overall}")
                    if overall_label != ordinal(expected_overall):
                        fail(f"{division_id} {name} overall label should be {ordinal(expected_overall)}, found {overall_label}")
                else:
                    match = re.fullmatch(r"(\d+)\s*[–-]\s*(\d+)", place_label)
                    if not match:
                        fail(f"{division_id} {name} has unsupported shared placement {place_label}")
                    else:
                        lo = offset + int(match.group(1))
                        hi = offset + int(match.group(2))
                        if overall_label != f"{lo}–{hi}":
                            fail(f"{division_id} {name} shared overall label should be {lo}–{hi}, found {overall_label}")
            offset += len(teams)
            division_count += len(teams)
        if division.get("teamCount") != division_count:
            fail(f"{division_id} teamCount does not match subdivision totals")
        group_count += division_count
    if group.get("teamCount") != group_count:
        fail(f"{group_id} teamCount does not match division totals")
    if group_count != expected_count:
        fail(f"{group_id} expected {expected_count} teams, found {group_count}")
    total_placements += group_count

if set(expected_counts) != seen_group_ids:
    fail(f"result group IDs do not match expected set: {sorted(seen_group_ids)}")
if total_divisions != expected_divisions:
    fail(f"expected {expected_divisions} divisions, found {total_divisions}")
if total_placements != expected_placements:
    fail(f"expected {expected_placements} placements, found {total_placements}")
summary = results.get("summary") or {}
if summary.get("groups") != len(expected_counts):
    fail("results summary group count is incorrect")
if summary.get("divisions") != expected_divisions:
    fail("results summary division count is incorrect")
if summary.get("teamPlacements") != expected_placements:
    fail("results summary placement count is incorrect")


def first_team(group_id: str, division_id: str, subdivision_id: str) -> str:
    group = next((row for row in groups if row.get("id") == group_id), {})
    division = next((row for row in group.get("divisions", []) if row.get("id") == division_id), {})
    subdivision = next((row for row in division.get("subdivisions", []) if row.get("id") == subdivision_id), {})
    teams = subdivision.get("teams") or []
    return str(teams[0].get("team")) if teams else ""

anchors = {
    ("14u-boys", "14u-boys-championship", "pt"): "Ciu Gold",
    ("12u-coed", "12u-coed-championship", "pt"): "Yolo A",
    ("16u-girls", "16u-girls-championship", "pt"): "Santa Barbara WPC A",
    ("10u-coed", "10u-coed-classic", "ag"): "Patriot Red",
}
for key, expected in anchors.items():
    actual = first_team(*key)
    if actual != expected:
        fail(f"anchor {key} expected {expected}, found {actual}")

required_html = [
    'id="jo-results"',
    'id="tournament-archive"',
    'id="archiveGroupSelect"',
    'id="archiveResults"',
    'css/tournament-hub-v7-54-4.css?v=7.55.0',
    'data/identity/runtime.js?v=7.53.4',
    'js/cpi-identity.js?v=7.53.4',
    'data/tournaments/jo-profile-runtime.js?v=7.53.4',
    'js/tournament-hub-v7-54-4.js?v=7.55.1',
]
for token in required_html:
    if token not in html:
        fail(f"tournaments.html is missing {token}")
if not css_path.exists() or css_path.stat().st_size == 0:
    fail("public archive stylesheet is missing or empty")
required_js = [
    'data/tournaments/public-hub.json',
    'select.onchange = () => renderSelectedResults',
    'renderJoResults',
    'joAsset',
    'joJourney',
    'focus:"journey"',
    'window.CPIIdentity?.resolveTeam',
    'window.CPIIdentity?.resolveClub',
    'window.WPI_JO_PROFILES',
    'cache:"no-store"',
]
for token in required_js:
    if token not in js:
        fail(f"public archive JavaScript is missing {token}")

if ERRORS:
    print("JO RESULTS ARCHIVE 7.54.4 TESTS FAILED")
    for error in ERRORS:
        print(" - " + error)
    raise SystemExit(1)

print("JO RESULTS ARCHIVE 7.54.4 TESTS PASSED")
print(f" - {len(expected_counts)} age/gender groups and {expected_divisions} JO divisions validated")
print(f" - {expected_placements} final team placements remain grouped by division and subdivision behind age/gender selection")
print(" - Division-wide placement labels, age-group selection, assets, and journey links are synchronized")
