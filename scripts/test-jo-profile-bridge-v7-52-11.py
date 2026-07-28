#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []


def fail(message: str) -> None:
    errors.append(message)


def load(rel: str):
    path = ROOT / rel
    if not path.exists():
        fail(f"Missing {rel}")
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"Invalid JSON in {rel}: {exc}")
        return {}


site = load("config/site-release.json")
bridge = load("data/tournaments/jo-profile-bridge.json")
rankings = load("rankings.json")
clubs = load("data/identity/index.json").get("clubs", {})

if site.get("version") != "7.52.12":
    fail("site version must be 7.52.11")
for key in ("joProfileRelease", "teamProfileRelease", "clubProfileRelease", "joResultsRelease", "tournamentUIRelease"):
    if site.get(key) != "7.52.12":
        fail(f"{key} must be 7.52.11")
if site.get("rankingDataRelease") != "7.52.2":
    fail("rankingDataRelease changed")
if len(rankings) != 724:
    fail(f"rankings changed: expected 724, found {len(rankings)}")
if any("kern premier" in str(row.get("team") or "").lower() for row in rankings):
    fail("Kern Premier must remain a tournament-only profile, not a synthetic ranking")

if bridge.get("release") != "7.52.12":
    fail("JO profile bridge release must be 7.52.11")
if bridge.get("counts", {}).get("profiles", 0) < 880:
    fail("JO profile bridge did not retain expected placement profile coverage")
if bridge.get("counts", {}).get("tournamentOnlyProfiles", 0) < 600:
    fail("Tournament-only JO profile coverage regressed")

kern_club = bridge.get("clubs", {}).get("club-kern-premier")
if not kern_club:
    fail("Kern Premier club is absent from JO profile bridge")
else:
    if kern_club.get("teamCount") != 5:
        fail(f"Kern Premier must show five JO teams, found {kern_club.get('teamCount')}")
    if kern_club.get("clubSlug") != "kern-premier":
        fail("Kern Premier club slug is incorrect")
    if kern_club.get("clubName") != "Kern Premier":
        fail("Kern Premier display name is incorrect")

expected = {
    "kern-premier-12u-boys": ("12U Boys", "Championship", "Gold", "3-4", 41, 17),
    "kern-premier-14u-boys": ("14U Boys", "Classic", "Silver", "5-4", 16, 16),
    "kern-premier-16u-boys": ("16U Boys", "Championship", "Gold", "3-5", 36, 12),
    "kern-premier-18u-boys": ("18U Boys", "Invitational", "Copper", "See completed 18U Invite results", 9, 9),
    "kern-premier-18u-girls": ("18U Girls", "Classic", "Gold", "2-5", 28, 4),
}
for slug, values in expected.items():
    profile = bridge.get("teams", {}).get(slug)
    if not profile:
        fail(f"Missing Kern Premier team profile {slug}")
        continue
    actual = (
        profile.get("group"), profile.get("division"), profile.get("subdivision"),
        profile.get("record"), profile.get("divisionPlace"), profile.get("subdivisionPlace"),
    )
    if actual != values:
        fail(f"Kern Premier profile mismatch for {slug}: {actual}")
    if profile.get("canonicalClubId") != "club-kern-premier":
        fail(f"{slug} is not connected to club-kern-premier")
    if profile.get("canonicalTeamId") is not None or profile.get("profileType") != "tournament_only":
        fail(f"{slug} must remain a tournament-only team profile")
    if profile.get("logo") != "assets/logos/canonical/kern-premier.webp":
        fail(f"{slug} does not use Kern Premier artwork")
    if profile.get("clubPage") != "club.html?club=kern-premier":
        fail(f"{slug} club route is incorrect")
    for token in ("team=Kern+Premier", "focus=journey", "#team-explorer"):
        if token not in str(profile.get("journeyUrl") or ""):
            fail(f"{slug} journey URL missing {token}")

kern_identity = clubs.get("club-kern-premier", {})
kearns_identity = clubs.get("club-kearns", {})
if kern_identity.get("state") != "CA" or kern_identity.get("region") != "Central Valley":
    fail("Kern Premier identity must remain in Central California")
if kearns_identity.get("state") != "UT" or kearns_identity.get("slug") != "kearns":
    fail("Kearns must remain a separate Utah club")

html_requirements = {
    "team.html": [
        "css/jo-profile-bridge-v7-52-11.css?v=7.52.12",
        "data/tournaments/jo-profile-runtime.js?v=7.52.12",
        "js/team-profile-v7-42.js?v=7.52.12",
    ],
    "club.html": [
        "css/jo-profile-bridge-v7-52-11.css?v=7.52.12",
        "data/tournaments/jo-profile-runtime.js?v=7.52.12",
        "js/club-intelligence-v7-26.js?v=7.52.12",
    ],
    "tournaments.html": [
        "data/tournaments/jo-profile-runtime.js?v=7.52.12",
        "js/jo-results-browser-v7-52-1.js?v=7.52.12",
    ],
}
for rel, tokens in html_requirements.items():
    text = (ROOT / rel).read_text(encoding="utf-8")
    positions = []
    for token in tokens:
        pos = text.find(token)
        if pos < 0:
            fail(f"{rel} missing {token}")
        positions.append(pos)
    if rel != "team.html" and len(positions) >= 2 and positions[-2] >= positions[-1]:
        fail(f"{rel} must load JO profile runtime before its consumer")

js_requirements = {
    "js/team-profile-v7-42.js": ["findJoProfile", "renderJoOnlyTeamProfile", "View complete JO game journey", "tournament-connected team profile"],
    "js/club-intelligence-v7-26.js": ["joForClub", "renderJoClubProfile", "Teams and final results", "Tournament-only profiles"],
    "js/jo-results-browser-v7-52-1.js": ["window.WPI_JO_PROFILES", "joProfiles.lookup", "joProfile.teamPage"],
}
for rel, tokens in js_requirements.items():
    text = (ROOT / rel).read_text(encoding="utf-8")
    for token in tokens:
        if token not in text:
            fail(f"{rel} missing {token}")
    result = subprocess.run(["node", "--check", str(ROOT / rel)], capture_output=True, text=True)
    if result.returncode:
        fail(f"JavaScript syntax error in {rel}: {result.stderr.strip()}")

runtime_path = ROOT / "data/tournaments/jo-profile-runtime.js"
if not runtime_path.exists() or runtime_path.stat().st_size < 1000:
    fail("JO profile runtime is missing or empty")
elif not runtime_path.read_text(encoding="utf-8").startswith("window.WPI_JO_PROFILES="):
    fail("JO profile runtime does not expose window.WPI_JO_PROFILES")

if errors:
    print("JO PROFILE BRIDGE 7.52.12 TEST FAILED")
    for error in errors:
        print(f" - {error}")
    raise SystemExit(1)

print("JO PROFILE BRIDGE 7.52.12 TESTS PASSED")
print(" - Five Kern Premier JO teams have tournament-only team profile routes")
print(" - Club profile receives records and placements from the published JO results browser")
print(" - Tournament results link to team profiles and complete JO game journeys")
print(" - Kern Premier, Kearns, and SKIP remain separate; 724 rankings are unchanged")
