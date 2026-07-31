#!/usr/bin/env python3
from __future__ import annotations

import hashlib
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
    return json.loads(path.read_text(encoding="utf-8"))


def digest(value) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode()).hexdigest()


site = load("config/site-release.json")
clubs = load("clubs.json")
rankings = load("rankings.json")
jo = load("data/tournaments/jo-results-2026.json")
audit = load("data/release-integrity-7.52.15.json")
website_audit = load("data/club-website-audit-7.52.16.json")

if site.get("version") not in {"7.53.0", "7.53.1", "7.53.2", "7.53.3", "7.53.4", "7.53.5", "7.53.6", "7.53.7", "7.54.0", "7.54.1", "7.54.2", "7.54.3", "7.54.4", "7.54.5", "7.54.6", "7.54.7", "7.54.8", "7.54.9", "7.54.10"}:
    fail("site version must preserve the 7.53.0 club experience")
if site.get("clubProfileRelease") != "7.53.0" or site.get("clubExperienceRelease") != "7.53.0":
    fail("club profile experience release fields must be 7.53.0")
if site.get("rankingDataRelease") != "7.52.13":
    fail("ranking data release changed")
if site.get("clubWebsiteRelease") != "7.52.16":
    fail("club website release changed")
if site.get("joResultsRelease") != "7.52.15":
    fail("JO results release changed")

if len(rankings) != 724:
    fail(f"expected 724 rankings, found {len(rankings)}")
if len(clubs) != 182 or len({item.get('slug') for item in clubs}) != 182:
    fail("expected 182 unique consolidated clubs")
if website_audit.get("summary", {}).get("websitePresent") != 177:
    fail("177 club links were not preserved")

jo_rows = []
for group in jo.get("groups", []):
    for division in group.get("divisions", []):
        for subdivision in division.get("subdivisions", []):
            for team in subdivision.get("teams", []):
                jo_rows.append({
                    "group": group.get("id"),
                    "division": division.get("id"),
                    "subdivision": subdivision.get("id"),
                    "team": team.get("team"),
                    "place": team.get("place"),
                    "overallPlace": team.get("overallPlace"),
                    "record": team.get("record"),
                })
if len(jo_rows) != 976:
    fail(f"expected 976 JO placements, found {len(jo_rows)}")

rank_comp = [{key: row.get(key) for key in ["group", "slug", "team", "clubSlug", "postRank", "postCPI", "logo", "canonicalClubId", "canonicalTeamId"]} for row in rankings]
club_comp = [{key: row.get(key) for key in ["slug", "displayName", "canonicalClubId", "logo", "logoStatus", "region"]} for row in clubs]
protected = {
    "competitiveRankingAndLogoAssignments": digest(rank_comp),
    "clubIdentityAndLogoAssignments": digest(club_comp),
    "joPlacementAndRecordData": digest(jo_rows),
}
for key, value in protected.items():
    if value != audit.get("hashes", {}).get(key):
        fail(f"protected data changed: {key}")

club_html = (ROOT / "club.html").read_text(encoding="utf-8")
required_html = [
    "css/club-profile-v7-53-0.css?v=7.53.4",
    "js/club-profile-v7-53-0.js?v=7.53.4",
    "Water Polo Index club profile with rankings, teams, tournament results",
]
for token in required_html:
    if token not in club_html:
        fail(f"club.html missing {token}")
if club_html.find("js/club-intelligence-v7-26.js?v=7.53.4") > club_html.find("js/club-profile-v7-53-0.js?v=7.53.4"):
    fail("new club profile enhancement loads before the existing club data consumer")

js = (ROOT / "js/club-profile-v7-53-0.js").read_text(encoding="utf-8")
for token in [
    "Competitive snapshot", "Teams by age group", "Results and event history",
    "are not influenced by sponsorship", "connectedTeams",
    "renderJoTournament", "renderHistoricalTournament", "profileMetrics",
]:
    if token not in js:
        fail(f"club profile JS missing {token}")
css = (ROOT / "css/club-profile-v7-53-0.css").read_text(encoding="utf-8")
for token in [".wpi-club-hero", ".wpi-club-metrics", ".wpi-club-group-grid", "@media(max-width:520px)"]:
    if token not in css:
        fail(f"club profile CSS missing {token}")

palette = (ROOT / "js/command-palette.js").read_text(encoding="utf-8")
if "club.html?club=${encodeURIComponent(club.slug)}" not in palette:
    fail("command palette does not route directly to the current club profile")

by_slug = {item.get("slug"): item for item in clubs}
for slug, club in by_slug.items():
    page = ROOT / "club" / f"{slug}.html"
    if not page.exists():
        fail(f"missing generated club route {slug}")
        continue
    text = page.read_text(encoding="utf-8")
    target = f"../club.html?club={slug}"
    if target not in text or "window.location.replace" not in text or "Opening the current WPI club profile" not in text:
        fail(f"static club route does not converge on current profile: {slug}")
    if club.get("logo") and f"../{club.get('logo')}" not in text:
        fail(f"static route does not preserve club logo: {slug}")
    if club.get("website") and (club.get("website") not in text or ">Club Website</a>" not in text):
        fail(f"static route does not preserve club website: {slug}")

kern = by_slug.get("kern-premier", {})
if len(kern.get("teams", [])) != 4 or kern.get("bestRank") != 36:
    fail("Kern Premier ranking portfolio changed")
mission = by_slug.get("mission", {})
if len(mission.get("teams", [])) != 8 or mission.get("bestRank") != 1:
    fail("Mission profile baseline changed")

for rel in ["js/club-profile-v7-53-0.js", "js/command-palette.js"]:
    result = subprocess.run(["node", "--check", str(ROOT / rel)], capture_output=True, text=True)
    if result.returncode:
        fail(f"JavaScript syntax error in {rel}: {result.stderr.strip()}")

if errors:
    print("CLUB PROFILE EXPERIENCE 7.53.0 TEST FAILED")
    for error in errors:
        print(f" - {error}")
    sys.exit(1)

print("CLUB PROFILE EXPERIENCE 7.53.0 TESTS PASSED")
print(" - Adaptive rankings, team, tournament, website, and independence modules are wired")
print(" - All 182 generated club routes converge on the current dynamic profile")
print(" - 724 rankings, 182 clubs, 177 club links, and 976 JO placements remain protected")
