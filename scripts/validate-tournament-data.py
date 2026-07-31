#!/usr/bin/env python3
"""Validate WPI tournament source registry, raw snapshots, normalized games, and QA outputs."""
from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

from tournament_pipeline import bracket_slot_token

ROOT = Path(__file__).resolve().parents[1]
REGISTRY_PATH = ROOT / "data" / "tournaments" / "registry.json"
MANIFEST_PATH = ROOT / "data" / "tournaments" / "normalized" / "manifest.json"
EXPECTED_RELEASE = "7.45.1"
ALLOWED_REGISTRY_RELEASES = {"7.45.1", "7.54.0", "7.54.1", "7.54.2", "7.54.3", "7.54.4", "7.54.5", "7.54.6", "7.54.7", "7.54.8", "7.54.9", "7.54.10"}
ALLOWED_PARSERS = {"jo_bracket_v1", "results_table_v1"}
ALLOWED_PARTICIPANT_KINDS = {"empty", "team", "bracket_reference", "placeholder"}
errors: list[str] = []


def fail(message: str) -> None:
    errors.append(message)


def load(path: Path):
    if not path.exists():
        fail(f"Missing required tournament file: {path.relative_to(ROOT)}")
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"Invalid JSON in {path.relative_to(ROOT)}: {exc}")
        return None


registry = load(REGISTRY_PATH) or {}
manifest = load(MANIFEST_PATH) or {}
if registry.get("release") not in ALLOWED_REGISTRY_RELEASES:
    fail(f"Tournament registry release must be one of {sorted(ALLOWED_REGISTRY_RELEASES)}")
if registry.get("schemaVersion") != 1:
    fail("Tournament registry schemaVersion must be 1")

all_events = registry.get("events", [])
all_divisions = [(event, division) for event in all_events for division in event.get("divisions", [])]
if len(all_events) != 9:
    fail(f"Tournament registry should contain 9 events, found {len(all_events)}")
if len(all_divisions) != 99:
    fail(f"Tournament registry should contain 99 divisions, found {len(all_divisions)}")
if sum(bool(event.get("syncEnabled")) for event in all_events) != 3:
    fail("Exactly three active JO sessions should be enabled for automatic synchronization")
if sum(len(event.get("divisions", [])) for event in all_events if event.get("syncEnabled")) != 31:
    fail("Automatic synchronization should cover 31 JO divisions")

seen_event_ids: set[str] = set()
seen_source_pairs: set[tuple[str, str, str]] = set()
registry_lookup: dict[tuple[str, str], dict] = {}
for event in all_events:
    event_id = event.get("id")
    if not re.fullmatch(r"[a-z0-9-]+", str(event_id or "")):
        fail(f"Invalid event ID: {event_id!r}")
    if event_id in seen_event_ids:
        fail(f"Duplicate event ID: {event_id}")
    seen_event_ids.add(event_id)
    seen_division_ids: set[str] = set()
    public_path = ROOT / str(event.get("publicPath", "")).split("?", 1)[0]
    if not public_path.exists():
        fail(f"Event {event_id} points to missing public page {event.get('publicPath')}")
    for division in event.get("divisions", []):
        division_id = division.get("id")
        if not re.fullmatch(r"[a-z0-9-]+", str(division_id or "")):
            fail(f"Invalid division ID for {event_id}: {division_id!r}")
        if division_id in seen_division_ids:
            fail(f"Duplicate division ID within {event_id}: {division_id}")
        seen_division_ids.add(division_id)
        registry_lookup[(event_id, division_id)] = division
        if division.get("parser") not in ALLOWED_PARSERS:
            fail(f"Unsupported parser for {event_id}/{division_id}: {division.get('parser')}")
        if not division.get("spreadsheetId") or division.get("gid") is None:
            fail(f"Missing tournament source identifier for {event_id}/{division_id}")
        if division.get("sourceType") == "uploaded_csv":
            source_path = ROOT / str(division.get("sourceUrl") or "")
            if not source_path.exists():
                fail(f"Uploaded CSV source is missing for {event_id}/{division_id}")
            source_key = str(division.get("gid"))
        elif division.get("sourceStrategy") == "sheet_name_primary" and division.get("sheetName"):
            expected_prefix = f"https://docs.google.com/spreadsheets/d/{division.get('spreadsheetId')}/"
            if not str(division.get("sourceUrl") or "").startswith(expected_prefix):
                fail(f"Source URL mismatch for {event_id}/{division_id}")
            source_key = str(division.get("sheetName"))
        else:
            expected_url = f"https://docs.google.com/spreadsheets/d/{division.get('spreadsheetId')}/edit?gid={division.get('gid')}#gid={division.get('gid')}"
            if division.get("sourceUrl") != expected_url:
                fail(f"Source URL mismatch for {event_id}/{division_id}")
            source_key = str(division.get("gid"))
        pair = (event_id, str(division.get("spreadsheetId")), source_key)
        if pair in seen_source_pairs:
            fail(f"Duplicate source tab within {event_id}: {pair[1]} / {pair[2]}")
        seen_source_pairs.add(pair)
        if division.get("ageGroup") not in {"10U", "12U", "14U", "16U", "18U", "19U", "HS"}:
            fail(f"Invalid age group for {event_id}/{division_id}: {division.get('ageGroup')}")
        if division.get("gender") not in {"Boys", "Girls", "Coed"}:
            fail(f"Invalid gender for {event_id}/{division_id}: {division.get('gender')}")


overrides_path = ROOT / "config" / "tournament-identity-overrides.json"
overrides = load(overrides_path) or {}
identity_index = load(ROOT / "data" / "identity" / "index.json") or {}
if overrides.get("release") != EXPECTED_RELEASE:
    fail(f"Tournament identity overrides release must be {EXPECTED_RELEASE}")
seen_override_keys: set[tuple[str, str, str]] = set()
for item in overrides.get("teamOverrides", []):
    key = (str(item.get("eventId")), str(item.get("divisionId")), str(item.get("alias", "")).strip().lower())
    if key in seen_override_keys:
        fail(f"Duplicate tournament identity override: {key}")
    seen_override_keys.add(key)
    if (key[0], key[1]) not in registry_lookup:
        fail(f"Tournament identity override references unknown division: {key[:2]}")
    team = identity_index.get("teams", {}).get(item.get("canonicalTeamId"))
    if not team:
        fail(f"Tournament identity override references unknown team: {item.get('canonicalTeamId')}")
    elif team.get("ageGroup") != registry_lookup[(key[0], key[1])].get("ageGroup") or team.get("gender") != registry_lookup[(key[0], key[1])].get("gender"):
        fail(f"Tournament identity override crosses age/gender scope: {key}")

# Verify the source registry covers every public source currently hard-coded in the tournament apps.
registry_pairs = {(str(d.get("spreadsheetId")), str(d.get("gid"))) for _, d in all_divisions}
for rel in ["tournaments/jo-boys/app.js", "tournaments/jo-girls/app.js", "tournaments/results-app.js"]:
    text = (ROOT / rel).read_text(encoding="utf-8")
    sheet_ids = set(re.findall(r"(?:SHEET_ID=|spreadsheetId:)['\"]([^'\"]+)['\"]", text))
    gids = re.findall(r"[\"\']?gid[\"\']?\s*:\s*[\"\'](\d+)[\"\']", text)
    if rel.endswith("app.js") and "jo-" in rel:
        sheet_match = re.search(r"const SHEET_ID=['\"]([^'\"]+)['\"]", text)
        if sheet_match:
            for gid in gids:
                if (sheet_match.group(1), gid) not in registry_pairs:
                    fail(f"Source registry is missing {rel} tab {sheet_match.group(1)} / {gid}")
    else:
        for sheet_id, gid in re.findall(r"[\"\']?spreadsheetId[\"\']?\s*:\s*[\"\']([^\"\']+)[\"\']\s*,\s*[\"\']?gid[\"\']?\s*:\s*[\"\'](\d+)[\"\']", text):
            if (sheet_id, gid) not in registry_pairs:
                fail(f"Source registry is missing {rel} tab {sheet_id} / {gid}")

if manifest.get("release") not in {EXPECTED_RELEASE, "7.54.5", "7.54.6", "7.54.7", "7.54.8", "7.54.9", "7.54.10"}:
    fail(f"Normalized manifest release must be {EXPECTED_RELEASE} or 7.54.5")
datasets = manifest.get("datasets", [])
if not datasets:
    fail("Normalized tournament manifest must contain at least one banked dataset")
if manifest.get("counts", {}).get("games", 0) < 192:
    fail("Normalized tournament manifest should contain the 192-game JO bootstrap snapshot")

manifest_keys: set[tuple[str, str]] = set()
for item in datasets:
    key = (item.get("eventId"), item.get("divisionId"))
    if key in manifest_keys:
        fail(f"Duplicate normalized manifest entry: {key}")
    manifest_keys.add(key)
    if key not in registry_lookup:
        fail(f"Normalized manifest references unregistered dataset: {key}")
    normalized_path = ROOT / str(item.get("path", ""))
    data = load(normalized_path)
    if not data:
        continue
    division = registry_lookup[key]
    if data.get("release") != EXPECTED_RELEASE or data.get("schemaVersion") != 1:
        fail(f"Normalized release/schema mismatch in {normalized_path.relative_to(ROOT)}")
    if data.get("division", {}).get("id") != key[1] or data.get("event", {}).get("id") != key[0]:
        fail(f"Normalized event/division mismatch in {normalized_path.relative_to(ROOT)}")
    if data.get("identityRelease") != "7.40.0":
        fail(f"Normalized data must reference identity release 7.40.0: {key}")
    raw_path = ROOT / "data" / "tournaments" / "raw" / key[0] / f"{key[1]}.csv"
    qa_path = ROOT / "data" / "tournaments" / "qa" / key[0] / f"{key[1]}.json"
    if not raw_path.exists():
        fail(f"Missing raw source snapshot for {key}")
        continue
    raw_text = raw_path.read_text(encoding="utf-8-sig")
    digest = hashlib.sha256(raw_text.encode("utf-8")).hexdigest()
    if data.get("source", {}).get("contentSha256") != digest:
        fail(f"Raw source hash mismatch for {key}")
    qa = load(qa_path) or {}
    if qa.get("sourceSha256") != digest:
        fail(f"QA source hash mismatch for {key}")
    games = data.get("games", [])
    if len(games) != data.get("counts", {}).get("games"):
        fail(f"Game count mismatch for {key}")
    if data.get("counts", {}).get("blockers") != 0:
        fail(f"Normalized dataset has blocking QA issues: {key}")
    game_ids: set[str] = set()
    for game in games:
        game_id = game.get("id")
        if not re.fullmatch(r"game-[a-z0-9-]+", str(game_id or "")):
            fail(f"Invalid normalized game ID in {key}: {game_id}")
        if game_id in game_ids:
            fail(f"Duplicate normalized game ID in {key}: {game_id}")
        game_ids.add(game_id)
        if not isinstance(game.get("sourceRow"), int) or game["sourceRow"] < 1:
            fail(f"Game lacks source-row traceability in {key}: {game_id}")
        if data.get("division", {}).get("parser") == "jo_bracket_v1":
            if not game.get("dateLabel") or not game.get("timeLabel") or game.get("sourceGameNumber") is None:
                fail(f"JO schedule record lacks date/time/game number in {key}: {game_id}")
        if game.get("status") not in {"scheduled", "final"}:
            fail(f"Invalid game status in {key}: {game_id}")
        score_state = game.get("scoreState")
        if score_state not in {"empty", "partial", "zero_zero_placeholder", "complete"}:
            fail(f"Invalid score state in {key}: {game_id} -> {score_state}")
        if score_state == "zero_zero_placeholder" and game.get("status") != "scheduled":
            fail(f"0-0 placeholder was treated as final in {key}: {game_id}")
        if game.get("status") == "final" and score_state != "complete":
            fail(f"Final game lacks complete score state in {key}: {game_id}")
        for side in ("white", "dark"):
            participant = game.get("participants", {}).get(side, {})
            kind = participant.get("kind")
            if kind not in ALLOWED_PARTICIPANT_KINDS:
                fail(f"Invalid participant kind in {key}/{game_id}/{side}: {kind}")
            name = str(participant.get("displayName") or "")
            if kind == "team" and re.match(r"^\s*#?\d+\s*[-–—:]", name):
                fail(f"Tournament seed leaked into normalized team name in {key}/{game_id}/{side}: {name}")
            raw_name = str(participant.get("raw") or "")
            if kind == "team" and (bracket_slot_token(name) or bracket_slot_token(raw_name)):
                fail(f"Bracket/pool slot was classified as a team in {key}/{game_id}/{side}: raw={raw_name!r}, name={name!r}")
            if kind == "team" and not participant.get("participantId"):
                fail(f"Team participant lacks a stable participant ID in {key}/{game_id}/{side}")
            if kind == "team" and participant.get("teamId") and participant.get("participantId") != participant.get("teamId"):
                fail(f"Canonical team participant ID mismatch in {key}/{game_id}/{side}")
            if kind == "team" and participant.get("teamId") and not participant.get("clubId"):
                fail(f"Resolved team lacks canonical club ID in {key}/{game_id}/{side}")

    dated_games = [g for g in games if g.get("dateIso")]
    first_date = min((g.get("dateIso") for g in dated_games), default=None)
    fetched_at = data.get("source", {}).get("fetchedAt")
    if first_date and fetched_at:
        fetched_date = str(fetched_at)[:10]
        if fetched_date < first_date and any(g.get("status") == "final" for g in games):
            fail(f"Dataset contains final games before its scheduled first date: {key}")

bootstrap = ("2026-jo-weekend-1", "14u-girls-championship")
if bootstrap not in manifest_keys:
    fail("7.45.1 must retain the 14U Girls Championship bootstrap snapshot")
else:
    path = ROOT / "data" / "tournaments" / "normalized" / bootstrap[0] / f"{bootstrap[1]}.json"
    data = load(path) or {}
    counts = data.get("counts", {})
    if counts.get("games") != 192:
        fail(f"14U Girls bootstrap should contain 192 games, found {counts.get('games')}")
    if counts.get("bracketReferences", 0) < 150:
        fail("14U Girls bootstrap should preserve bracket references as structured metadata")

for script in [
    ROOT / "scripts" / "tournament_pipeline.py",
    ROOT / "scripts" / "sync-tournament-data.py",
    ROOT / "scripts" / "test-tournament-pipeline.py",
    ROOT / "scripts" / "build-tournament-evidence.py",
]:
    result = subprocess.run([sys.executable, "-m", "py_compile", str(script)], capture_output=True, text=True)
    if result.returncode:
        fail(f"Python syntax error in {script.relative_to(ROOT)}: {result.stderr.strip()}")

workflow = ROOT / ".github" / "workflows" / "sync-tournament-data.yml"
if not workflow.exists():
    fail("Missing automated tournament snapshot workflow")
else:
    workflow_text = workflow.read_text(encoding="utf-8")
    for token in ["workflow_dispatch", "schedule:", "--sync-enabled", "build-tournament-evidence.py", "build-tournament-health.py", "validate-tournament-data.py", "validate-tournament-identity-cleanup.py", "validate-tournament-health.py", "contents: write", "data/tournaments/evidence", "data/tournaments/health", "build-jo-performance.py", "data/tournaments/jo-performance"]:
        if token not in workflow_text:
            fail(f"Tournament sync workflow is missing required token: {token}")

if errors:
    print("TOURNAMENT DATA VALIDATION FAILED")
    for message in errors:
        print(f" - {message}")
    raise SystemExit(1)

print("TOURNAMENT DATA VALIDATION PASSED")
print(f" - {len(all_events)} tournament events and {len(all_divisions)} source divisions are registered")
print(" - 31 Junior Olympics divisions are enabled for automated raw/normalized snapshots")
print(f" - {len(datasets)} banked dataset(s) currently contain {manifest.get('counts', {}).get('games', 0)} normalized games")
print(" - Raw source hashes, source rows, game IDs, score states, seeds, bracket references, and canonical identities are traceable")
print(" - Existing tournament-app source tabs are represented in the central registry")
print(" - Every real team has a stable participant ID; tournament-only identities remain outside published rankings")
print(" - Blocking data defects fail release-check; canonical identity review remains explicit")
