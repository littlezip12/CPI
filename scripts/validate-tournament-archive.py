#!/usr/bin/env python3
"""Validate WPI completed-tournament archive, profile links, and evidence quarantine."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED = "7.49.1"
MIN_ARCHIVE_EVENTS = 7
MIN_ARCHIVE_DIVISIONS = 76
REQUIRED_ARCHIVE_EVENT_IDS = {
    "2026-quiksilver-cup",
    "2026-boys-futures-super-finals",
    "2026-girls-futures-super-finals",
    "2026-girls-us-club-championships",
    "2025-evan-cousineau-memorial-cup",
    "2026-san-diego-county-cup",
    "2026-kap7-international",
}
errors: list[str] = []


def fail(message: str) -> None:
    errors.append(message)


def load(rel: str):
    path = ROOT / rel
    if not path.exists():
        fail(f"Missing archive file: {rel}")
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"Invalid JSON in {rel}: {exc}")
        return {}


registry = load("data/tournaments/registry.json")
archive = load("data/tournaments/archive/index.json")
site = load("config/site-release.json")
archive_events = [event for event in registry.get("events", []) if event.get("archiveSyncEnabled")]
archive_divisions = [division for event in archive_events for division in event.get("divisions", [])]
registry_event_ids = {str(event.get("id")) for event in archive_events}
output_event_ids = {str(event.get("id")) for event in archive.get("events", [])}

if site.get("tournamentArchiveRelease") != EXPECTED:
    fail("Site release must register tournament archive 7.49.1")
if len(archive_events) < MIN_ARCHIVE_EVENTS or len(archive_divisions) < MIN_ARCHIVE_DIVISIONS:
    fail(
        "Historical archive registry regressed below the verified baseline of "
        f"{MIN_ARCHIVE_EVENTS} events and {MIN_ARCHIVE_DIVISIONS} divisions; "
        f"found {len(archive_events)} and {len(archive_divisions)}"
    )
missing_required = sorted(REQUIRED_ARCHIVE_EVENT_IDS - registry_event_ids)
if missing_required:
    fail(f"Historical archive is missing required completed events: {', '.join(missing_required)}")
if any(event.get("rankingEvidenceEnabled") is not False for event in archive_events):
    fail("Every historical archive event must remain quarantined from ranking evidence")
if archive.get("release") != EXPECTED or archive.get("schemaVersion") != 2:
    fail("Archive output must use schemaVersion 2 and release 7.49.1")
if output_event_ids != registry_event_ids:
    missing = sorted(registry_event_ids - output_event_ids)
    extra = sorted(output_event_ids - registry_event_ids)
    fail(f"Archive output event set does not match registry; missing={missing}, extra={extra}")

counts = archive.get("counts", {})
if counts.get("events") != len(archive_events) or counts.get("divisions") != len(archive_divisions):
    fail(
        "Archive output counts must reconcile to the archive-enabled registry; "
        f"expected {len(archive_events)} events/{len(archive_divisions)} divisions, "
        f"found {counts.get('events')}/{counts.get('divisions')}"
    )
if counts.get("bankedDivisions", 0) + counts.get("pendingDivisions", 0) != len(archive_divisions):
    fail("Banked and pending archive division counts must reconcile")
if counts.get("bankedDivisions", 0) < MIN_ARCHIVE_DIVISIONS:
    fail("Historical archive lost previously banked divisions")
if counts.get("games", 0) < 1329 or counts.get("finalGames", 0) < 1329:
    fail("Completed-event parser did not preserve the verified historical game bank")
if counts.get("rankedTeamsRepresented", 0) < 100 or counts.get("clubsRepresented", 0) < 70:
    fail("Historical identity/profile link coverage unexpectedly low")
if archive.get("policy", {}).get("rankingEvidenceRequiresApproval") is not True:
    fail("Archive policy must require explicit ranking evidence approval")
if archive.get("policy", {}).get("profileDisplayDoesNotEnableRankingEvidence") is not True:
    fail("Profile display must not enable ranking evidence")
if not any(event.get("placements") for event in archive.get("events", [])):
    fail("Archive must retain verified placement records")

for game in archive.get("games", []):
    if game.get("status") == "final" and not game.get("scoreDisplay"):
        fail(f"Final archive game missing score display: {game.get('id')}")
    if (game.get("whiteTeamId") and not game.get("whiteTeamPage")) or (
        game.get("darkTeamId") and not game.get("darkTeamPage")
    ):
        fail(f"Canonical archive team missing profile link: {game.get('id')}")
    if game.get("rankingEvidenceEnabled") is not False:
        fail(f"Historical game incorrectly enables ranking evidence: {game.get('id')}")

# Legacy result-page fallbacks remain required for the viewers that consume them.
for rel in [
    "data/tournaments/quiksilver-cup-2026.json",
    "data/tournaments/archive/2026-boys-futures-super-finals.json",
    "data/tournaments/archive/2026-girls-us-club-championships.json",
    "data/tournaments/archive/2025-evan-cousineau-memorial-cup.json",
    "data/tournaments/archive/2026-san-diego-county-cup.json",
    "data/tournaments/archive/2026-kap7-international.json",
]:
    if not (ROOT / rel).exists():
        fail(f"Missing normalized result-page fallback: {rel}")

for rel in [
    "tournament-archive.html",
    "css/tournament-archive-v7-49.css",
    "js/tournament-archive-v7-49.js",
    "data/tournaments/archive/runtime.js",
    "scripts/build-tournament-archive.py",
    ".github/workflows/sync-tournament-archive.yml",
]:
    if not (ROOT / rel).exists():
        fail(f"Missing archive asset: {rel}")

html_path = ROOT / "tournament-archive.html"
html = html_path.read_text(encoding="utf-8") if html_path.exists() else ""
for token in [
    "data/tournaments/archive/runtime.js?v=7.53.4",
    "js/tournament-archive-v7-49.js?v=7.53.4",
    "archiveGames",
    "archiveAge",
    "archiveGender",
    "archiveScope",
]:
    if token not in html:
        fail(f"Archive page missing token: {token}")

results_path = ROOT / "tournaments/results-app.js"
results = results_path.read_text(encoding="utf-8") if results_path.exists() else ""
for token in [
    "quiksilver-cup-2026.json",
    "2026-boys-futures-super-finals.json",
    "2026-girls-us-club-championships.json",
]:
    if token not in results:
        fail(f"Results application missing normalized fallback: {token}")

evidence_path = ROOT / "scripts/build-tournament-evidence.py"
evidence = evidence_path.read_text(encoding="utf-8") if evidence_path.exists() else ""
if "rankingEvidenceEnabled" not in evidence or "continue" not in evidence:
    fail("Tournament evidence builder must enforce historical evidence quarantine")

workflow_path = ROOT / ".github/workflows/sync-tournament-archive.yml"
workflow = workflow_path.read_text(encoding="utf-8") if workflow_path.exists() else ""
for token in [
    "--archive-enabled",
    "build-tournament-archive.py",
    "build-historical-profiles.py",
    "validate-historical-profiles.py",
    "workflow_dispatch",
    "schedule:",
    "data/tournaments/history",
]:
    if token not in workflow:
        fail(f"Archive workflow missing token: {token}")

for rel in [
    "scripts/build-tournament-archive.py",
    "scripts/build-historical-profiles.py",
    "scripts/test-historical-tournament-parser.py",
    "scripts/validate-tournament-archive.py",
    "scripts/sync-tournament-data.py",
    "scripts/tournament_pipeline.py",
]:
    result = subprocess.run(
        ["python3", "-m", "py_compile", str(ROOT / rel)], capture_output=True, text=True
    )
    if result.returncode:
        fail(f"Python syntax error in {rel}: {result.stderr.strip()}")

for rel in ["js/tournament-archive-v7-49.js", "tournaments/results-app.js"]:
    result = subprocess.run(["node", "--check", str(ROOT / rel)], capture_output=True, text=True)
    if result.returncode:
        fail(f"JavaScript syntax error in {rel}: {result.stderr.strip()}")

if errors:
    print("TOURNAMENT ARCHIVE VALIDATION FAILED")
    for item in errors:
        print(f" - {item}")
    raise SystemExit(1)

print("TOURNAMENT ARCHIVE VALIDATION PASSED")
print(
    f" - {len(archive_events)} completed tournaments and {len(archive_divisions)} divisions "
    "remain registered for controlled archival sync"
)
print(
    f" - {counts.get('bankedDivisions', 0)} divisions are banked and "
    f"{counts.get('pendingDivisions', 0)} await source access"
)
print(
    f" - {counts.get('finalGames', 0)} verified finals link to "
    f"{counts.get('rankedTeamsRepresented', 0)} ranked teams and "
    f"{counts.get('clubsRepresented', 0)} clubs"
)
print(" - Historical profile display remains quarantined from ranking evidence and publication")
