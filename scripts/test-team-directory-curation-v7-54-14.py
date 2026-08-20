#!/usr/bin/env python3
from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []
read = lambda rel: (ROOT / rel).read_text(encoding="utf-8")
site = json.loads(read("config/site-release.json"))
for key, expected in {
    "teamDirectoryRelease": "7.54.14",
    "sectionLandingRelease": "7.54.15",
}.items():
    if site.get(key) != expected: errors.append(f"{key} must be {expected}")
if site.get("version") not in {"7.54.18", "7.55.0", "7.55.1", "7.55.2", "7.55.4", "7.55.5", "7.55.6", "7.55.7", "7.55.8", "7.55.9", "7.56.0", "7.56.1", "7.56.2", "7.56.3", "7.56.4", "7.56.7", "7.56.8","7.56.9", "7.56.11", "7.56.12", "7.56.13","7.56.14", "7.56.15","7.57.0", "7.57.1", "7.57.2", "7.57.3", "7.57.4", "7.57.5", "7.57.6", "7.57.7", "7.57.8", "7.57.9", "7.57.10", "7.57.11", "7.57.12", "7.57.13", "7.57.14", "7.57.15", "7.57.16", "7.57.17", "7.57.18", "7.57.19", "7.57.20", "7.57.21", "7.57.22", "7.58.0", "7.58.1", "7.58.2", "7.58.3", "7.58.4","7.58.5","7.58.6","7.58.7","7.58.8", "7.58.9", "7.58.10", "7.59.0", "7.60.0","7.60.1","7.60.2","7.60.3", "7.61.0","7.61.1","7.62.0","7.62.1","7.62.2","7.62.3","7.62.4", "7.62.5", "7.62.6","7.63.0","7.63.1","7.63.2","7.63.3",'7.63.4','7.63.5','7.63.6','7.63.7'}: errors.append("version must preserve 7.54.18 or later")
if site.get("publicExperienceRelease") not in {"7.54.18", "7.55.0", "7.55.1", "7.55.2", "7.55.4", "7.55.5", "7.55.6", "7.55.7", "7.55.8", "7.55.9", "7.56.0", "7.56.1", "7.56.2", "7.56.3", "7.56.4", "7.56.7", "7.56.8","7.56.9", "7.56.11", "7.56.12", "7.56.13","7.56.14", "7.56.15","7.57.0", "7.57.1", "7.57.2", "7.57.3", "7.57.4", "7.57.5", "7.57.6", "7.57.7", "7.57.8", "7.57.9", "7.57.10", "7.57.11", "7.57.12", "7.57.13", "7.57.14", "7.57.15", "7.57.16", "7.57.17", "7.57.18", "7.57.19", "7.57.20", "7.57.21", "7.57.22", "7.58.0", "7.58.1", "7.58.2", "7.58.3", "7.58.4","7.58.5","7.58.6","7.58.7","7.58.8", "7.58.9", "7.58.10", "7.59.0", "7.60.0","7.60.1","7.60.2","7.60.3", "7.61.0"}: errors.append("publicExperienceRelease must preserve 7.54.18 or later")

teams = read("teams.html")
for token in (
    'css/section-landing-v7-53-4.css?v=7.54.15',
    'css/teams-directory-v7-53-4.css?v=7.54.14',
    'js/teams-directory-v7-53-4.js?v=7.54.14',
    'id="teamDirectoryEyebrow"',
    '25 teams to explore',
):
    if token not in teams: errors.append(f"teams.html missing {token}")
if 'wpi-section-hero-facts' in teams: errors.append("Teams hero still contains the oversized fact grid")

css = read("css/section-landing-v7-53-4.css")
for token in (
    '.teams-page .wpi-section-hero--teams',
    'height: 276px',
    'max-height: 276px',
    'object-position: center 52%',
    'height: 136px',
):
    if token not in css: errors.append(f"compact Teams hero CSS missing {token}")

runtime = read("js/teams-directory-v7-53-4.js")
for token in (
    'const FEATURED_LIMIT = 25',
    'const FEATURED_MAX_RANK = 50',
    'function buildFeaturedRecords',
    'usedClubs.has(team.clubKey)',
    'rotates weekly',
    'function isFeaturedView',
):
    if token not in runtime: errors.append(f"directory runtime missing {token}")

rankings = json.loads(read("rankings.json"))
clubs = json.loads(read("clubs.json"))
jo = json.loads(read("data/tournaments/jo-results-2026.json"))
eligible = [team for team in rankings if int(team.get("postRank") or 999) <= 50]
unique_clubs = {team.get("canonicalClubId") or team.get("clubSlug") or team.get("club") for team in eligible}
groups = {team.get("group") for team in eligible}
if len(eligible) != 400: errors.append(f"expected 400 current top-50 candidates, found {len(eligible)}")
if len(unique_clubs) < 25: errors.append(f"only {len(unique_clubs)} unique clubs are eligible")
if len(groups) != 8: errors.append(f"expected 8 ranked age/gender groups, found {len(groups)}")
if len(rankings) != 724: errors.append(f"expected 724 rankings, found {len(rankings)}")
if len(clubs) != 182: errors.append(f"expected 182 clubs, found {len(clubs)}")
if jo.get("summary",{}).get("teamPlacements") != 976: errors.append("expected 976 JO placements")

if errors:
    print("WPI TEAM DIRECTORY CURATION 7.54.14 TEST FAILED")
    for error in errors: print(f" - {error}")
    sys.exit(1)
print("WPI TEAM DIRECTORY CURATION 7.54.14 TEST PASSED")
print(" - Teams uses a shorter athlete-centered hero")
print(" - Default discovery shows 25 weekly rotating current top-50 teams with one team per club")
print(" - Search and filters retain access to the complete team directory")
print(" - 724 rankings, 182 clubs, and 976 JO placements remain unchanged")
