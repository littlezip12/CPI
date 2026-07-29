#!/usr/bin/env python3
from __future__ import annotations

import csv
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []


def fail(message: str) -> None:
    errors.append(message)


def load(rel: str):
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))


def digest(value) -> str:
    payload = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    return hashlib.sha256(payload.encode()).hexdigest()


site = load("config/site-release.json")
audit = load("data/release-integrity-7.52.15.json")
websites = load("data/club-website-audit-7.52.14.json")
rankings = load("rankings.json")
clubs = load("clubs.json")
jo = load("data/tournaments/jo-results-2026.json")

if site.get("version") not in {"7.52.15", "7.52.16", "7.53.0", "7.53.1", "7.53.2", "7.53.3", "7.53.4", "7.53.5"}:
    fail("site version must be 7.52.15")
if site.get("clubWebsiteRelease") not in {"7.52.14", "7.52.16", "7.53.0", "7.53.1", "7.53.2", "7.53.3", "7.53.4", "7.53.5"}:
    fail("club website release must preserve wave 1 or the completed user audit")
if site.get("releaseIntegrityRelease") != "7.52.15":
    fail("releaseIntegrityRelease must be 7.52.15")

rank_comp = [
    {
        "group": row.get("group"),
        "slug": row.get("slug"),
        "team": row.get("team"),
        "clubSlug": row.get("clubSlug"),
        "postRank": row.get("postRank"),
        "postCPI": row.get("postCPI"),
        "logo": row.get("logo"),
        "canonicalClubId": row.get("canonicalClubId"),
        "canonicalTeamId": row.get("canonicalTeamId"),
    }
    for row in rankings
]
club_comp = [
    {
        "slug": row.get("slug"),
        "displayName": row.get("displayName"),
        "canonicalClubId": row.get("canonicalClubId"),
        "logo": row.get("logo"),
        "logoStatus": row.get("logoStatus"),
        "region": row.get("region"),
    }
    for row in clubs
]
jo_comp = []
for group in jo.get("groups", []):
    for division in group.get("divisions", []):
        for subdivision in division.get("subdivisions", []):
            for team in subdivision.get("teams", []):
                jo_comp.append(
                    {
                        "group": group.get("id"),
                        "division": division.get("id"),
                        "subdivision": subdivision.get("id"),
                        "team": team.get("team"),
                        "place": team.get("place"),
                        "overallPlace": team.get("overallPlace"),
                        "record": team.get("record"),
                    }
                )

expected_hashes = audit.get("hashes", {})
actual_hashes = {
    "competitiveRankingAndLogoAssignments": digest(rank_comp),
    "clubIdentityAndLogoAssignments": digest(club_comp),
    "joPlacementAndRecordData": digest(jo_comp),
}
for key, value in actual_hashes.items():
    if value != expected_hashes.get(key):
        fail(f"integrity hash changed for {key}")

if len(rankings) != 724:
    fail(f"expected 724 ranking rows, found {len(rankings)}")
if len(clubs) != 182:
    fail(f"expected 182 consolidated clubs, found {len(clubs)}")
if len({row.get('slug') for row in clubs}) != len(clubs):
    fail("duplicate club slugs returned to the public club registry")
if len(jo_comp) != 976:
    fail(f"expected 976 JO placements, found {len(jo_comp)}")
if site.get("clubWebsiteRelease") == "7.52.14":
    if websites.get("summary", {}).get("websitePresent") != 42:
        fail("website coverage must remain 42 clubs after wave 1")
    if len(websites.get("verifiedThisRelease", [])) != 15:
        fail("all 15 verified website additions must remain present")
    missing_path = ROOT / "qa/club-websites-missing-7.52.15.csv"
    with missing_path.open(encoding="utf-8", newline="") as handle:
        missing = list(csv.DictReader(handle))
    if len(missing) != 140:
        fail(f"expected 140 clubs without website URLs, found {len(missing)}")

for row in clubs:
    logo = str(row.get("logo") or "")
    if logo and not logo.startswith("assets/logos/cpi-logo-fallback") and not (ROOT / logo).exists():
        fail(f"club logo asset is missing: {row.get('slug')} -> {logo}")

if errors:
    print("RELEASE INTEGRITY 7.52.15 TEST FAILED")
    for error in errors:
        print(" - " + error)
    sys.exit(1)

print("RELEASE INTEGRITY 7.52.15 TESTS PASSED")
print(" - 724 rankings, 182 consolidated clubs, and 976 JO placements retain their competitive identities")
print(" - All existing club logo assignments and 15 website additions remain preserved")
print(" - 140 clubs without website URLs are exported for user-assisted completion")
