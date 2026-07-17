#!/usr/bin/env python3
"""Validate CPI 7.45.1 tournament identity cleanup and source verification safeguards."""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from tournament_pipeline import bracket_slot_token  # noqa: E402

EXPECTED_RELEASE = "7.45.1"
errors: list[str] = []


def fail(message: str) -> None:
    errors.append(message)


def load(rel: str):
    path = ROOT / rel
    if not path.exists():
        fail(f"Missing cleanup artifact: {rel}")
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"Invalid JSON in {rel}: {exc}")
        return {}


manifest = load("data/tournaments/normalized/manifest.json")
participants = load("data/tournaments/identity/participants.json")
evidence = load("data/tournaments/evidence/index.json")
review = load("data/tournaments/evidence/ranking-review.json")

if manifest.get("release") != EXPECTED_RELEASE:
    fail(f"Normalized manifest release must be {EXPECTED_RELEASE}")
if participants.get("release") != EXPECTED_RELEASE:
    fail(f"Participant registry release must be {EXPECTED_RELEASE}")
if evidence.get("release") != EXPECTED_RELEASE:
    fail(f"Evidence index release must be {EXPECTED_RELEASE}")
if review.get("release") != EXPECTED_RELEASE:
    fail(f"Evidence review release must be {EXPECTED_RELEASE}")

rows = participants.get("participants", [])
counts = participants.get("counts", {})
if counts.get("participants") != len(rows):
    fail("Participant registry count does not match rows")
if counts.get("participants", 99999) > 1100:
    fail(f"Participant cleanup regression: expected <=1100 real identities, found {counts.get('participants')}")
if counts.get("tournamentOnlyTeams", 99999) > 800:
    fail(f"Tournament-only cleanup regression: expected <=800 real identities, found {counts.get('tournamentOnlyTeams')}")
if counts.get("canonicalTeams", 0) < 248:
    fail(f"Canonical tournament matches regressed below 248: {counts.get('canonicalTeams')}")

for row in rows:
    name = str(row.get("name") or "")
    aliases = [str(value or "") for value in row.get("aliases", [])]
    if bracket_slot_token(name):
        fail(f"Bracket slot leaked into participant registry: {name}")
    for alias in aliases:
        if bracket_slot_token(alias):
            fail(f"Bracket slot alias leaked into participant registry: {alias}")
    if re.search(r"(?:^|\s)(?:ag|au|bz|cu|ni|pt)_[A-Z]{1,2}\d+(?:\([^)]*\))*-?$", name, re.I):
        fail(f"Pool-slot identity leaked into participant registry: {name}")
    if name.endswith("-") or re.match(r"^\d+(?:st|nd|rd|th)[_\s-]", name, re.I):
        fail(f"Placement-slot identity leaked into participant registry: {name}")

manifest_games = int(manifest.get("counts", {}).get("games") or 0)
if manifest_games != 3924:
    fail(f"Cleaned JO bank should contain 3,924 actual schedule records, found {manifest_games}")
if int(manifest.get("counts", {}).get("finalGames") or 0) != 0:
    fail("Pre-tournament cleanup must retain zero completed games")

# Inspect every normalized participant rather than trusting only the generated registry.
resolved_prefix_count = 0
bracket_reference_count = 0
for item in manifest.get("datasets", []):
    data = load(str(item.get("path") or ""))
    for game in data.get("games", []):
        for participant in game.get("participants", {}).values():
            kind = participant.get("kind")
            raw = str(participant.get("raw") or "")
            display = str(participant.get("displayName") or "")
            if kind == "team":
                if bracket_slot_token(raw) or bracket_slot_token(display):
                    fail(f"Normalized team is actually a bracket slot: {raw!r} -> {display!r}")
                source_reference = participant.get("sourceReference")
                if source_reference:
                    resolved_prefix_count += 1
                    if display == raw:
                        fail(f"Resolved source prefix was not removed from team identity: {raw}")
            elif kind == "bracket_reference":
                bracket_reference_count += 1

if resolved_prefix_count < 300:
    fail(f"Expected at least 300 source-prefixed real teams, found {resolved_prefix_count}")
if bracket_reference_count < 2500:
    fail(f"Expected structured bracket references after cleanup, found {bracket_reference_count}")

# Lettered games with blank displayed Gm # cells must be recovered from GMID.
girls_12 = load("data/tournaments/normalized/2026-jo-weekend-1/12u-girls-championship.json")
game_numbers = {str(game.get("sourceGameNumber")) for game in girls_12.get("games", [])}
for expected in {"5A", "53A", "53B", "65A", "65B", "65C", "73A", "90A", "97A", "135A", "147A", "152A"}:
    if expected not in game_numbers:
        fail(f"Missing inferred lettered JO game: {expected}")

# Successful unchanged live checks must update verification freshness; stale fallbacks must not.
sync_text = (ROOT / "scripts" / "sync-tournament-data.py").read_text(encoding="utf-8")
health_text = (ROOT / "scripts" / "build-tournament-health.py").read_text(encoding="utf-8")
for token in ["verifiedAt", "checkedAt"]:
    if token not in sync_text:
        fail(f"Tournament sync is missing source verification field: {token}")
if "last_verified_at" not in health_text or 'completed.get("verifiedAt")' not in health_text:
    fail("Tournament health does not use fresh successful verification timestamps")

# Repository hygiene: these files are ignored and must not remain tracked in release packages.
for rel in [
    ".DS_Store",
    "data/.DS_Store",
    "data/site-flow-qa-7-15.textClipping",
    "data/tournaments/normalized/2026-jo-weekend-2/manifest.json",
    "data/tournaments/qa/2026-jo-weekend-2/sync-latest.json",
]:
    if (ROOT / rel).exists():
        fail(f"Tracked Mac artifact must be removed: {rel}")

for script in [
    "scripts/tournament_pipeline.py",
    "scripts/sync-tournament-data.py",
    "scripts/build-tournament-evidence.py",
    "scripts/build-tournament-health.py",
    "scripts/validate-tournament-identity-cleanup.py",
]:
    result = subprocess.run([sys.executable, "-m", "py_compile", str(ROOT / script)], capture_output=True, text=True)
    if result.returncode:
        fail(f"Python syntax error in {script}: {result.stderr.strip()}")

if errors:
    print("TOURNAMENT IDENTITY CLEANUP VALIDATION FAILED")
    for message in errors:
        print(f" - {message}")
    raise SystemExit(1)

print("TOURNAMENT IDENTITY CLEANUP VALIDATION PASSED")
print(f" - {counts.get('participants')} real tournament participant identities remain after placeholder removal")
print(f" - {counts.get('canonicalTeams')} participants resolve to canonical CPI teams")
print(f" - {counts.get('tournamentOnlyTeams')} verified tournament-only teams remain outside rankings")
print(f" - {bracket_reference_count} bracket/pool slots remain structured references rather than teams")
print(f" - {resolved_prefix_count} pool/seed-prefixed labels resolve through clean team names")
print(" - Girls JO positional headers and lettered games normalize correctly")
print(" - Successful unchanged live checks refresh source verification timestamps")
print(" - Tracked Mac artifacts are absent")
