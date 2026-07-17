#!/usr/bin/env python3
"""Validate CPI 7.43 tournament source-health outputs and interface wiring."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_RELEASE = "7.45.1"
errors: list[str] = []


def fail(message: str) -> None:
    errors.append(message)


def load(rel: str):
    path = ROOT / rel
    if not path.exists():
        fail(f"Missing tournament health file: {rel}")
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"Invalid JSON in {rel}: {exc}")
        return {}


health = load("data/tournaments/health/index.json")
registry = load("data/tournaments/registry.json")
manifest = load("data/tournaments/normalized/manifest.json")

if health.get("schemaVersion") != 1:
    fail("Tournament health schemaVersion must be 1")
if health.get("release") != EXPECTED_RELEASE:
    fail(f"Tournament health release must be {EXPECTED_RELEASE}")
if health.get("timezone") != "America/Los_Angeles":
    fail("Tournament health timezone must be America/Los_Angeles")

rows = health.get("sources", [])
jo_registry = [
    (event.get("id"), division.get("id"))
    for event in registry.get("events", [])
    if event.get("kind") == "junior_olympics"
    for division in event.get("divisions", [])
]
jo_rows = [row for row in rows if row.get("eventKind") == "junior_olympics"]
if len(jo_registry) != 23:
    fail(f"Expected 23 JO registry divisions, found {len(jo_registry)}")
if len(jo_rows) != len(jo_registry):
    fail(f"Tournament health should cover all 23 JO divisions, found {len(jo_rows)}")

seen: set[tuple[str, str]] = set()
allowed_health = {"current", "stale", "unbanked", "error", "blocked"}
allowed_phase = {"unbanked", "pre_tournament", "schedule_banked", "awaiting_results", "past_due_no_results", "in_progress", "complete"}
for row in rows:
    key = (row.get("eventId"), row.get("divisionId"))
    if key in seen:
        fail(f"Duplicate tournament health row: {key}")
    seen.add(key)
    if row.get("healthStatus") not in allowed_health:
        fail(f"Invalid tournament health status for {key}: {row.get('healthStatus')}")
    if row.get("phase") not in allowed_phase:
        fail(f"Invalid tournament phase for {key}: {row.get('phase')}")
    schedule = row.get("schedule", {})
    games = int(schedule.get("games") or 0)
    completed = int(schedule.get("completedGames") or 0)
    scheduled = int(schedule.get("scheduledGames") or 0)
    if games != completed + scheduled:
        fail(f"Tournament health game counts do not reconcile for {key}")
    source = row.get("source", {})
    if source.get("type") == "google_sheets_csv" and not str(source.get("url") or "").startswith("https://docs.google.com/spreadsheets/"):
        fail(f"Google Sheets health row lacks an official source URL: {key}")
    if row.get("phase") == "pre_tournament" and completed:
        fail(f"Pre-tournament source contains completed games: {key}")

counts = health.get("counts", {})
if counts.get("sources") != len(rows):
    fail("Tournament health source count mismatch")
if counts.get("joSources") != len(jo_rows):
    fail("Tournament health JO source count mismatch")
if counts.get("games") != sum(int(row.get("schedule", {}).get("games") or 0) for row in rows):
    fail("Tournament health aggregate game count mismatch")
if counts.get("completedGames") != sum(int(row.get("schedule", {}).get("completedGames") or 0) for row in rows):
    fail("Tournament health aggregate completed-game count mismatch")
sync_event_ids = {event.get("id") for event in registry.get("events", []) if event.get("syncEnabled")}
sync_manifest_items = [item for item in manifest.get("datasets", []) if item.get("eventId") in sync_event_ids]
sync_manifest_games = sum(int(item.get("counts", {}).get("games") or 0) for item in sync_manifest_items)
sync_manifest_finals = sum(int(item.get("counts", {}).get("finalGames") or 0) for item in sync_manifest_items)
if counts.get("games") != sync_manifest_games:
    fail("Tournament health game count must match live-source normalized datasets")
if counts.get("completedGames") != sync_manifest_finals:
    fail("Tournament health completed-game count must match live-source normalized datasets")

manifest_keys = {(item.get("eventId"), item.get("divisionId")) for item in sync_manifest_items}
health_banked_keys = {(row.get("eventId"), row.get("divisionId")) for row in rows if int(row.get("schedule", {}).get("games") or 0) > 0}
if manifest_keys != health_banked_keys:
    fail("Tournament health banked rows must match the normalized manifest")

runtime = ROOT / "data" / "tournaments" / "health" / "runtime.js"
if not runtime.exists():
    fail("Missing tournament health browser runtime")
elif not runtime.read_text(encoding="utf-8").startswith("window.CPI_TOURNAMENT_SOURCE_HEALTH = "):
    fail("Tournament health runtime has an invalid prefix")

for rel in [
    "tournament-source-health.html",
    "js/tournament-source-health.js",
    "css/tournament-source-health.css",
]:
    if not (ROOT / rel).exists():
        fail(f"Missing tournament source-health interface file: {rel}")

html = (ROOT / "tournament-source-health.html").read_text(encoding="utf-8") if (ROOT / "tournament-source-health.html").exists() else ""
for token in ["data/tournaments/health/runtime.js?v=7.45.1", "js/tournament-source-health.js?v=7.45.1", "sourceHealthRows"]:
    if token not in html:
        fail(f"Tournament source-health page is missing required token: {token}")

for script in ["scripts/build-tournament-health.py", "scripts/validate-tournament-health.py"]:
    result = subprocess.run(["python3", "-m", "py_compile", str(ROOT / script)], capture_output=True, text=True)
    if result.returncode:
        fail(f"Python syntax error in {script}: {result.stderr.strip()}")
for script in ["js/tournament-source-health.js"]:
    result = subprocess.run(["node", "--check", str(ROOT / script)], capture_output=True, text=True)
    if result.returncode:
        fail(f"JavaScript syntax error in {script}: {result.stderr.strip()}")

if errors:
    print("TOURNAMENT SOURCE HEALTH VALIDATION FAILED")
    for message in errors:
        print(f" - {message}")
    raise SystemExit(1)

print("TOURNAMENT SOURCE HEALTH VALIDATION PASSED")
print(f" - {len(jo_rows)} Junior Olympics divisions are represented")
print(f" - {counts.get('bankedDatasets', 0)} banked datasets contain {counts.get('games', 0)} schedule records")
print(f" - {counts.get('completedGames', 0)} completed games and {counts.get('scheduledGames', 0)} scheduled games")
print(" - Source failures, stale fallbacks, and unbanked divisions remain distinct")
print(" - Public source-health runtime and dashboard are wired")
