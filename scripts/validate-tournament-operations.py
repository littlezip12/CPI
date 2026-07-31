#!/usr/bin/env python3
"""Validate WPI 7.48 universal tournament operations outputs and workflow wiring."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_RELEASE = "7.48.0"
errors: list[str] = []


def fail(message: str) -> None:
    errors.append(message)


def load(rel: str):
    path = ROOT / rel
    if not path.exists():
        fail(f"Missing tournament operations file: {rel}")
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"Invalid JSON in {rel}: {exc}")
        return {}


ops = load("data/tournaments/operations/index.json")
alerts = load("data/tournaments/operations/alerts.json")
registry = load("data/tournaments/registry.json")
config = load("config/tournament-operations.json")
manifest = load("data/tournaments/normalized/manifest.json")

if ops.get("schemaVersion") != 1 or ops.get("release") != EXPECTED_RELEASE:
    fail("Tournament operations output must use schemaVersion 1 and release 7.48.0")
if config.get("release") not in {EXPECTED_RELEASE, "7.54.0", "7.54.1", "7.54.2", "7.54.3", "7.54.4", "7.54.5", "7.54.6", "7.54.7", "7.54.8"}:
    fail("Tournament operations configuration release mismatch")

registry_keys = {(event.get("id"), division.get("id")) for event in registry.get("events", []) for division in event.get("divisions", [])}
rows = ops.get("divisions", [])
row_keys = {(row.get("eventId"), row.get("divisionId")) for row in rows}
if registry_keys != row_keys:
    fail("Operations dashboard must represent every registered tournament division")
if len(registry.get("events", [])) != 8 or len(rows) != 81:
    fail(f"Expected 8 events and 81 divisions, found {len(registry.get('events', []))} and {len(rows)}")

live = [row for row in rows if row.get("monitoringMode") == "live"]
archive = [row for row in rows if row.get("monitoringMode") == "archive"]
historical = [row for row in rows if row.get("monitoringMode") == "historical_registered"]
if len(live) != 31:
    fail(f"Expected all three JO sessions to provide 31 live divisions, found {len(live)}")
if len(archive) != 45:
    fail(f"Expected 45 completed-event archive divisions, found {len(archive)}")
if len(historical) != 5:
    fail(f"Expected 5 Girls Club divisions in controlled data review, found {len(historical)}")
if any(row.get("eventId") != "2026-girls-us-club-championships" for row in historical):
    fail("Only Girls US Club Championships may remain in historical data review")
if any(row.get("operationalStatus") not in {"ready", "attention"} for row in live):
    fail("Live JO divisions may be ready or attention, but blocking states fail validation")
if any(row.get("operationalStatus") not in {"archive_pending", "archived", "archive_attention"} for row in archive):
    fail("Completed tournaments must remain clearly marked as pending, archived, or archive review")
if any(not row.get("schedule", {}).get("expectedGames") for row in live):
    fail("Every live JO division must have a verified expected schedule count")
if any(row.get("schedule", {}).get("games") != row.get("schedule", {}).get("expectedGames") for row in live):
    fail("Every live JO schedule count must match its verified baseline")
if any(row.get("schedule", {}).get("games") != row.get("schedule", {}).get("scheduledGames") + row.get("schedule", {}).get("completedGames") for row in live):
    fail("Live tournament scheduled/completed counts do not reconcile")
manifest_live_games = sum(item.get("counts", {}).get("games", 0) for item in manifest.get("datasets", []) if item.get("eventId") in set(config.get("liveEventIds", [])))
if sum(row.get("schedule", {}).get("games", 0) for row in live) != manifest_live_games:
    fail("Operations live game count must match live-event normalized datasets")
if ops.get("counts", {}).get("archiveDivisions") != 45:
    fail("Operations output must expose all 45 verified archive divisions")
if alerts.get("counts", {}).get("total") != len(ops.get("alerts", [])):
    fail("Operations alert files do not reconcile")
if ops.get("counts", {}).get("blocking") != 0:
    fail("Blocking live tournament operations defects fail validation")

policy = config.get("policy", {})
for key in ["authoritativeSourceOnly", "retainLastKnownGood"]:
    if policy.get(key) is not True:
        fail(f"Operations policy must enable {key}")
for key in ["automaticSourceBlending", "partialScoresAreFinal", "blankZeroZeroIsFinal", "rankingPublicationAutomatic"]:
    if policy.get(key) is not False:
        fail(f"Operations policy must disable {key}")

runtime = ROOT / "data/tournaments/operations/runtime.js"
if not runtime.exists() or not runtime.read_text(encoding="utf-8").startswith("window.CPI_TOURNAMENT_OPERATIONS = "):
    fail("Missing or invalid tournament operations browser runtime")
issue_body = ROOT / "data/tournaments/operations/issue-body.md"
if not issue_body.exists():
    fail("Missing generated operations issue summary")
else:
    issue_text = issue_body.read_text(encoding="utf-8")
    expected_phrase = "Action required" if alerts.get("counts", {}).get("total") else "No live tournament divisions require action"
    if expected_phrase not in issue_text:
        fail("Operations issue summary does not match the current alert state")

for rel in [
    "tournament-operations.html",
    "css/tournament-operations-v7-47.css",
    "js/tournament-operations-v7-47.js",
    "scripts/build-tournament-operations.py",
    "scripts/check-public-tournament-pages.py",
    "scripts/test-tournament-operations-engine.py",
    "scripts/validate-tournament-operations.py",
]:
    if not (ROOT / rel).exists():
        fail(f"Missing tournament operations asset: {rel}")

html = (ROOT / "tournament-operations.html").read_text(encoding="utf-8") if (ROOT / "tournament-operations.html").exists() else ""
for token in ["data/tournaments/operations/runtime.js?v=7.53.4", "js/tournament-operations-v7-47.js?v=7.53.4", "opsRows", "opsAlertBanner", "tournament-archive.html"]:
    if token not in html:
        fail(f"Tournament operations page is missing required token: {token}")

# Poolside readiness budgets and mounts.
for rel, budget in [("tournaments/jo-boys/app.js", 400_000), ("tournaments/jo-girls/app.js", 200_000), ("tournaments/jo-texas/app.js", 220_000)]:
    path = ROOT / rel
    if path.exists() and path.stat().st_size > budget:
        fail(f"{rel} exceeds the launch-readiness JavaScript budget of {budget} bytes")
for rel in ["tournaments/jo-boys/index.html", "tournaments/jo-girls/index.html", "tournaments/jo-texas/index.html"]:
    text = (ROOT / rel).read_text(encoding="utf-8")
    for token in ['name="viewport"', 'id="sourceMeta"', 'id="statusText"', 'id="refresh"']:
        if token not in text:
            fail(f"{rel} is missing launch-readiness token: {token}")

workflow = (ROOT / ".github/workflows/sync-tournament-data.yml").read_text(encoding="utf-8")
for token in [
    "build-tournament-operations.py",
    "check-public-tournament-pages.py --network --allow-network-failure",
    "validate-tournament-operations.py",
    "actions/github-script@v9",
    "pages: write",
    "pages/builds",
    "data/tournaments/operations",
    "build-tournament-archive.py",
]:
    if token not in workflow:
        fail(f"Tournament sync workflow is missing operations token: {token}")

for rel in ["scripts/build-tournament-operations.py", "scripts/check-public-tournament-pages.py", "scripts/test-tournament-operations-engine.py", "scripts/validate-tournament-operations.py"]:
    result = subprocess.run(["python3", "-m", "py_compile", str(ROOT / rel)], capture_output=True, text=True)
    if result.returncode:
        fail(f"Python syntax error in {rel}: {result.stderr.strip()}")
for rel in ["js/tournament-operations-v7-47.js"]:
    result = subprocess.run(["node", "--check", str(ROOT / rel)], capture_output=True, text=True)
    if result.returncode:
        fail(f"JavaScript syntax error in {rel}: {result.stderr.strip()}")

if errors:
    print("TOURNAMENT OPERATIONS VALIDATION FAILED")
    for message in errors:
        print(f" - {message}")
    raise SystemExit(1)

print("TOURNAMENT OPERATIONS VALIDATION PASSED")
print(" - 8 registered tournaments and 81 divisions share one operations framework")
print(f" - Three JO sessions provide 31 live-monitored divisions: {ops.get('counts', {}).get('ready', 0)} ready and {ops.get('counts', {}).get('attention', 0)} attention")
print(" - 45 completed-event divisions remain isolated in controlled archive mode; 5 Girls Club divisions remain in data review")
print(" - Source, score-state, public-page, fallback, and ranking-publication safeguards are enforced")
print(" - Poolside JavaScript budgets and mobile application mounts pass")
