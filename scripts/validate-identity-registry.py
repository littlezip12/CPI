#!/usr/bin/env python3
"""Validate CPI 7.40 canonical club/team identity outputs."""
from __future__ import annotations

import json
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IDENTITY = ROOT / "data" / "identity"
EXPECTED_RELEASE = "7.40.0"
EXPECTED_TEAMS = 506
EXPECTED_CANONICAL_CLUBS = 138
REQUIRED_FILES = [
    IDENTITY / "manifest.json",
    IDENTITY / "clubs.json",
    IDENTITY / "teams.json",
    IDENTITY / "aliases.json",
    IDENTITY / "index.json",
    IDENTITY / "runtime.js",
    ROOT / "js" / "cpi-identity.js",
    ROOT / "config" / "identity-manual-overrides.json",
    ROOT / "data" / "team_registry.json",
    ROOT / "data" / "team_alias_lookup.json",
    ROOT / "data" / "team_alias_lookup_with_tournament_normalizer.json",
]
errors: list[str] = []


def fail(message: str) -> None:
    errors.append(message)


def load(path: Path):
    if not path.exists():
        fail(f"Missing required identity file: {path.relative_to(ROOT)}")
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"Invalid JSON in {path.relative_to(ROOT)}: {exc}")
        return None


site_release = load(ROOT / "config" / "site-release.json") or {}

for path in REQUIRED_FILES:
    if not path.exists():
        fail(f"Missing required identity file: {path.relative_to(ROOT)}")

manifest = load(IDENTITY / "manifest.json") or {}
clubs = load(IDENTITY / "clubs.json") or []
teams = load(IDENTITY / "teams.json") or []
aliases = load(IDENTITY / "aliases.json") or {}
index = load(IDENTITY / "index.json") or {}
rankings = load(ROOT / "rankings.json") or []
public_clubs = load(ROOT / "clubs.json") or []
engine_registry = load(ROOT / "data" / "team_registry.json") or {}
engine_aliases = load(ROOT / "data" / "team_alias_lookup.json") or {}

if manifest.get("release") != EXPECTED_RELEASE:
    fail(f"Identity manifest release must be {EXPECTED_RELEASE}")
if manifest.get("counts", {}).get("teams") != EXPECTED_TEAMS:
    fail(f"Identity manifest should report {EXPECTED_TEAMS} teams")
if manifest.get("counts", {}).get("clubs") != EXPECTED_CANONICAL_CLUBS:
    fail(f"Identity manifest should report {EXPECTED_CANONICAL_CLUBS} canonical clubs")
if len(teams) != EXPECTED_TEAMS:
    fail(f"teams.json should contain {EXPECTED_TEAMS} teams, found {len(teams)}")
if len(clubs) != EXPECTED_CANONICAL_CLUBS:
    fail(f"clubs.json should contain {EXPECTED_CANONICAL_CLUBS} canonical clubs, found {len(clubs)}")

club_ids = [x.get("id") for x in clubs]
team_ids = [x.get("id") for x in teams]
if len(club_ids) != len(set(club_ids)):
    fail("Canonical club IDs are not unique")
if len(team_ids) != len(set(team_ids)):
    fail("Canonical team IDs are not unique")
if any(not re.fullmatch(r"club-[a-z0-9-]+", str(x or "")) for x in club_ids):
    fail("One or more canonical club IDs use an invalid format")
if any(not re.fullmatch(r"team-[a-z0-9-]+", str(x or "")) for x in team_ids):
    fail("One or more canonical team IDs use an invalid format")

club_by_id = {x["id"]: x for x in clubs if x.get("id")}
team_by_id = {x["id"]: x for x in teams if x.get("id")}
for team in teams:
    if team.get("clubId") not in club_by_id:
        fail(f"Team {team.get('id')} references missing club {team.get('clubId')}")
    if team.get("level") not in {"A", "B", "C", "D"} and not str(team.get("level", "")).startswith("Depth "):
        fail(f"Team {team.get('id')} has invalid functional level {team.get('level')!r}")
    if re.match(r"^\s*#?\d+\s+[-–—:]\s+", str(team.get("name", ""))):
        fail(f"Tournament seed is embedded in canonical name: {team.get('name')}")

ranking_keys = set()
for row in rankings:
    team_id = row.get("canonicalTeamId")
    club_id = row.get("canonicalClubId")
    if team_id not in team_by_id:
        fail(f"Ranking row {row.get('group')} / {row.get('team')} has invalid canonicalTeamId {team_id}")
        continue
    team = team_by_id[team_id]
    if club_id not in club_by_id:
        fail(f"Ranking row {row.get('group')} / {row.get('team')} has invalid canonicalClubId {club_id}")
    if team.get("name") != row.get("team") or team.get("group") != row.get("group") or team.get("slug") != row.get("slug"):
        fail(f"Ranking identity mismatch for {row.get('group')} / {row.get('team')}")
    if team.get("clubId") != club_id:
        fail(f"Ranking team/club identity mismatch for {row.get('group')} / {row.get('team')}")
    key = (row.get("group"), row.get("slug"))
    if key in ranking_keys:
        fail(f"Duplicate ranking identity key: {key}")
    ranking_keys.add(key)

if len(engine_registry) != EXPECTED_TEAMS:
    fail(f"Engine compatibility registry should contain {EXPECTED_TEAMS} teams")
for team_id, item in engine_registry.items():
    if team_id not in team_by_id:
        fail(f"Engine registry contains unknown team ID {team_id}")
    elif item.get("club_id") != team_by_id[team_id].get("clubId"):
        fail(f"Engine registry club mismatch for {team_id}")
if not engine_aliases:
    fail("14U Boys engine alias compatibility lookup is empty")

scoped_index = index.get("teamScopedAliasIndex", {})
unscoped_index = index.get("teamUnscopedAliasIndex", {})
club_index = index.get("clubAliasIndex", {})
if len(scoped_index) != manifest.get("counts", {}).get("scopedResolvableAliases"):
    fail("Scoped alias count does not match manifest")
if index.get("clubs", {}) != club_by_id:
    fail("Identity index club records do not match clubs.json")
if index.get("teams", {}) != team_by_id:
    fail("Identity index team records do not match teams.json")
for key, team_id in scoped_index.items():
    if team_id not in team_by_id:
        fail(f"Scoped alias {key} points to unknown team {team_id}")
for key, team_id in unscoped_index.items():
    if team_id not in team_by_id:
        fail(f"Unscoped alias {key} points to unknown team {team_id}")
for key, club_id in club_index.items():
    if club_id not in club_by_id:
        fail(f"Club alias {key} points to unknown club {club_id}")

# Every scoped alias must resolve uniquely and seeds must remain metadata.
scoped_candidates: dict[str, set[str]] = defaultdict(set)
for alias in aliases.get("teamAliases", []):
    raw = str(alias.get("alias", ""))
    if re.match(r"^\s*#?\d+\s+[-–—:]\s+", raw):
        fail(f"Seeded source string was persisted as an alias: {raw}")
    key = "|".join([
        str(alias.get("season", "")),
        str(alias.get("ageGroup", "")).lower(),
        str(alias.get("gender", "")).lower(),
        str(alias.get("normalized", "")),
    ])
    scoped_candidates[key].add(alias.get("entityId"))
for key, candidates in scoped_candidates.items():
    if len(candidates) != 1:
        fail(f"Ambiguous scoped team alias: {key} -> {sorted(candidates)}")
    elif scoped_index.get(key) != next(iter(candidates)):
        fail(f"Scoped alias index mismatch for {key}")

# Known duplicate legacy clubs must converge on a single canonical club identity.
legacy_to_canonical = {}
for club in public_clubs:
    legacy_to_canonical[club.get("slug")] = club.get("canonicalClubId")
for pair in [
    ("arroyo-grande", "arroyogrande"),
    ("san-diego-shores", "sd-shores"),
    ("san-jose-express", "sj-express"),
    ("santa-barbara", "sbwpc"),
    ("patriot", "patriot-red"),
]:
    left, right = pair
    if legacy_to_canonical.get(left) != legacy_to_canonical.get(right):
        fail(f"Legacy club identities were not merged: {left} / {right}")

for rel in ["tournaments/jo-boys/index.html", "tournaments/jo-girls/index.html"]:
    text = (ROOT / rel).read_text(encoding="utf-8")
    runtime_pos = text.find("../../data/identity/runtime.js?v=7.40.0")
    resolver_pos = text.find("../../js/cpi-identity.js?v=7.41.0")
    app_version = site_release.get("joApplicationRelease", "7.49.1")
    app_pos = text.find(f'src="app.js?v={app_version}"')
    if min(runtime_pos, resolver_pos, app_pos) < 0:
        fail(f"{rel} does not load the identity runtime, resolver, and JO app")
    elif not (runtime_pos < resolver_pos < app_pos):
        fail(f"{rel} must load identity runtime and resolver before app.js")
for rel in ["tournaments/jo-boys/app.js", "tournaments/jo-girls/app.js"]:
    text = (ROOT / rel).read_text(encoding="utf-8")
    for token in ["canonicalIdentity", "identityContext", "data-cpi-team-id", "data-cpi-club-id"]:
        if token not in text:
            fail(f"{rel} is missing identity integration token {token}")

node_files = [ROOT / "js" / "cpi-identity.js", IDENTITY / "runtime.js"]
for path in node_files:
    result = subprocess.run(["node", "--check", str(path)], capture_output=True, text=True)
    if result.returncode:
        fail(f"JavaScript syntax error in {path.relative_to(ROOT)}: {result.stderr.strip()}")

if errors:
    print("IDENTITY REGISTRY VALIDATION FAILED")
    for message in errors:
        print(f" - {message}")
    sys.exit(1)

print("IDENTITY REGISTRY VALIDATION PASSED")
print(f" - {len(clubs)} canonical clubs from {len(public_clubs)} legacy club records")
print(f" - {len(teams)} season/age/gender team identities")
print(f" - {len(scoped_index)} scoped aliases resolve without collisions")
print(f" - {len(unscoped_index)} globally unique aliases are available as safe fallbacks")
print(" - Five duplicate legacy club families converge on shared canonical club IDs")
print(" - Rankings, club exports, JO schedules, and engine compatibility files reference canonical IDs")
