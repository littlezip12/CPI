#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []


def load(rel: str):
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))


def canonical_sha(data) -> str:
    raw = json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def fail(message: str) -> None:
    errors.append(message)


site = load("config/site-release.json")
index = load("data/seasons/index.json")
final_manifest = load("data/seasons/2025-2026/manifest.json")
active_manifest = load("data/seasons/2026-2027/manifest.json")
final_rankings = load("data/seasons/2025-2026/rankings.json")
final_clubs = load("data/seasons/2025-2026/clubs.json")
final_teams = load("data/seasons/2025-2026/teams.json")
final_tournaments = load("data/seasons/2025-2026/tournaments.json")
rankings = load("rankings.json")
clubs = load("clubs.json")

if site.get("version") not in {"7.55.1", "7.55.2", "7.55.4", "7.55.5", "7.55.6", "7.55.7", "7.55.8", "7.55.9", "7.56.0", "7.56.1", "7.56.2", "7.56.3", "7.56.4", "7.56.7", "7.56.8","7.56.9", "7.56.11", "7.56.12", "7.56.13","7.56.14", "7.56.15","7.57.0", "7.57.1", "7.57.2", "7.57.3", "7.57.4", "7.57.5", "7.57.6", "7.57.7", "7.57.8", "7.57.9", "7.57.10", "7.57.11", "7.57.12", "7.57.13", "7.57.14", "7.57.15", "7.57.16", "7.57.17", "7.57.18", "7.57.19", "7.57.20", "7.57.21", "7.57.22", "7.58.0", "7.58.1", "7.58.2", "7.58.3", "7.58.4","7.58.5","7.58.6","7.58.7","7.58.8", "7.58.9", "7.58.10", "7.59.0", "7.60.0","7.60.1","7.60.2","7.60.3", "7.61.0","7.61.1","7.62.0","7.62.1","7.62.2","7.62.3","7.62.4", "7.62.5", "7.62.6","7.63.0","7.63.1","7.63.2","7.63.3",'7.63.4','7.63.5','7.63.6','7.63.7','7.63.8','7.63.9','7.64.0'}:
    fail("site version must preserve 7.55.1 or later")
for key in ("rankingSeasonRelease", "seasonArchitectureRelease", "finalRankingSnapshotRelease", "seasonNavigationRelease"):
    if site.get(key) != "7.55.1":
        fail(f"{key} must be 7.55.1")

if index.get("release") != "7.55.1" or index.get("model") != "competitive_year_range":
    fail("season index release/model is incorrect")
if index.get("activeSeasonId") != "2026-2027" or index.get("finalRankingSeasonId") != "2025-2026":
    fail("season index pointers are incorrect")
expected_defaults = {
    "rankings": "2025-2026", "teams": "2025-2026", "team": "2025-2026",
    "clubs": "2025-2026", "club": "2025-2026", "tournaments": "2025-2026",
}
if index.get("pageDefaults") != expected_defaults:
    fail(f"page defaults are incorrect: {index.get('pageDefaults')}")
if [row.get("id") for row in index.get("seasons", [])] != ["2026-2027", "2025-2026"]:
    fail("season index order must be active then final")
if "2024" in json.dumps(index):
    fail("2024 should not be published in the multi-season index")

if len(final_rankings) != 724 or len(rankings) != 724:
    fail("final/source ranking count must remain 724")
if len(final_clubs) != 182 or len(clubs) != 182:
    fail("final/source club count must remain 182")
if len(final_teams) != 724:
    fail("final ranked-team profile index must contain 724 records")
if len(final_tournaments) != 8:
    fail("2025–2026 snapshot must contain eight public tournaments")

if any(row.get("competitiveSeason") != "2025-2026" or row.get("seasonStatus") != "final" for row in final_rankings):
    fail("final ranking snapshot is missing season tags")
if any(row.get("competitiveSeason") != "2025-2026" or row.get("seasonStatus") != "final" for row in rankings):
    fail("primary ranking export is missing season tags")
if any(row.get("competitiveSeason") != "2025-2026" for row in final_clubs):
    fail("final club snapshot is missing season tags")
if active_manifest.get("season", {}).get("rankingStatus") != "results_gathering":
    fail("2026–2027 must remain results gathering")
if active_manifest.get("counts", {}).get("rankings") != 0:
    fail("2026–2027 must contain zero fabricated rankings")
if active_manifest.get("data", {}).get("rankings") is not None:
    fail("active season must not publish a ranking file")

integrity = final_manifest.get("integrity", {})
for key, data in (
    ("rankingsSha256", final_rankings),
    ("clubsSha256", final_clubs),
    ("teamsSha256", final_teams),
    ("tournamentsSha256", final_tournaments),
):
    if integrity.get(key) != canonical_sha(data):
        fail(f"final snapshot integrity mismatch: {key}")

competitive_fields = ["group", "postRank", "team", "slug", "postCPI", "movement", "canonicalClubId", "canonicalTeamId"]
signature_rows = [[row.get(field) for field in competitive_fields] for row in rankings]
signature = hashlib.sha256(json.dumps(signature_rows, separators=(",", ":"), ensure_ascii=False).encode("utf-8")).hexdigest()
if signature != "7d6e03439f858644c2db2ba6ee5163725df221a8e60c56d92ccb1e69082465e6":
    fail("ranking order, WPI values, movement, or competitive identities changed")

platform_line = (ROOT / "data.js").read_text(encoding="utf-8").splitlines()[0]
for token in ('"currentSeason":"2026-2027"', '"finalRankingSeason":"2025-2026"', '"seasonDataRelease":"7.55.1"'):
    if token not in platform_line:
        fail(f"data.js platform metadata missing {token}")

page_tokens = {
    "rankings.html": [
        "data/seasons/runtime.js?v=7.55.1", "js/rankings-v7-55-1.js?v=7.55.1",
        "js/season-navigation-v7-55-1.js?v=7.55.1", "id=\"heroSeason\"",
    ],
    "teams.html": ["data/seasons/runtime.js?v=7.55.1", "js/season-navigation-v7-55-1.js?v=7.55.1"],
    "clubs.html": ["data/seasons/runtime.js?v=7.55.1", "js/season-navigation-v7-55-1.js?v=7.55.1"],
    "team.html": ["data/seasons/runtime.js?v=7.55.1", "js/season-navigation-v7-55-1.js?v=7.55.1"],
    "club.html": ["data/seasons/runtime.js?v=7.55.1", "js/season-navigation-v7-55-1.js?v=7.55.1"],
    "tournaments.html": ["data/seasons/runtime.js?v=7.55.1", "js/tournament-hub-v7-54-4.js?v=7.55.1"],
}
for rel, tokens in page_tokens.items():
    text = (ROOT / rel).read_text(encoding="utf-8")
    for token in tokens:
        if token not in text:
            fail(f"{rel} missing {token}")

runtime = (ROOT / "data/seasons/runtime.js").read_text(encoding="utf-8")
for token in ("pageDefaults", "finalRankingSeasonId", "activeSeasonId", "searchParams.set('season'", "window.WPISeason"):
    if token not in runtime:
        fail(f"season runtime missing {token}")

ranking_js = (ROOT / "js/rankings-v7-55-1.js").read_text(encoding="utf-8")
for token in ("loadSeasonRankings", "results_gathering", "No preseason rankings", "season.rankingsPath", "url.searchParams.set(\"season\""):
    if token not in ranking_js:
        fail(f"season-aware rankings runtime missing {token}")

nav_js = (ROOT / "js/season-navigation-v7-55-1.js").read_text(encoding="utf-8")
for token in ("Competitive season", "renderActiveProfile", "No preseason rankings", "2025–2026 final rankings", "MutationObserver"):
    if token not in nav_js:
        fail(f"season navigation runtime missing {token}")

tournament_js = (ROOT / "js/tournament-hub-v7-54-4.js").read_text(encoding="utf-8")
for token in ("updateSeasonUrl", 'url.searchParams.set("season", state.season)', "requestedSeason"):
    if token not in tournament_js:
        fail(f"tournament season routing missing {token}")

for rel in (
    "data/seasons/runtime.js", "js/rankings-v7-55-1.js", "js/season-navigation-v7-55-1.js",
    "js/teams-directory-v7-53-4.js", "js/tournament-hub-v7-54-4.js",
):
    result = subprocess.run(["node", "--check", str(ROOT / rel)], capture_output=True, text=True)
    if result.returncode:
        fail(f"JavaScript syntax error in {rel}: {result.stderr.strip()}")

if errors:
    print("WPI MULTI-SEASON FOUNDATION 7.55.1 TEST FAILED")
    for error in errors:
        print(" -", error)
    sys.exit(1)

print("WPI MULTI-SEASON FOUNDATION 7.55.1 TEST PASSED")
print(" - 724 rankings are frozen as the immutable 2025–2026 Final Rankings")
print(" - 182 club snapshots and 724 ranked-team profile records are preserved")
print(" - 2026–2027 is active with results gathering in progress and zero rankings")
print(" - Rankings, Teams, Clubs, profiles, and Tournament history use stable season routes")
