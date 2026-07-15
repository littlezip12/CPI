#!/usr/bin/env python3
"""Validate CPI 7.42 tournament participant identities, team evidence, and ranking review outputs."""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_RELEASE = "7.42.0"
errors: list[str] = []


def fail(message: str) -> None:
    errors.append(message)


def load(rel: str):
    path = ROOT / rel
    if not path.exists():
        fail(f"Missing tournament evidence file: {rel}")
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"Invalid JSON in {rel}: {exc}")
        return {}


participants = load("data/tournaments/identity/participants.json")
evidence = load("data/tournaments/evidence/index.json")
review = load("data/tournaments/evidence/ranking-review.json")
summary = load("qa/tournament-evidence-summary-7.42.0.json")
identity_index = load("data/identity/index.json")
rankings = load("rankings.json")

for name, payload in (("participant registry", participants), ("evidence index", evidence), ("review queue", review), ("evidence QA summary", summary)):
    if payload.get("release") != EXPECTED_RELEASE:
        fail(f"{name} release must be {EXPECTED_RELEASE}")
    if payload.get("schemaVersion") != 1:
        fail(f"{name} schemaVersion must be 1")

participant_rows = participants.get("participants", [])
participant_ids: set[str] = set()
canonical_team_ids = set(identity_index.get("teams", {}).keys())
ranked_team_ids = {item.get("canonicalTeamId") for item in rankings if item.get("canonicalTeamId")}
for item in participant_rows:
    participant_id = item.get("id")
    if not re.fullmatch(r"(?:team|tournament-team)-[a-z0-9-]+", str(participant_id or "")):
        fail(f"Invalid participant ID: {participant_id}")
    if participant_id in participant_ids:
        fail(f"Duplicate participant ID: {participant_id}")
    participant_ids.add(participant_id)
    canonical_id = item.get("canonicalTeamId")
    if canonical_id:
        if canonical_id not in canonical_team_ids:
            fail(f"Participant references unknown canonical team: {canonical_id}")
        if participant_id != canonical_id:
            fail(f"Canonical participant ID must equal canonical team ID: {participant_id}")
    else:
        if not str(participant_id).startswith("tournament-team-"):
            fail(f"Tournament-only participant must use tournament-team ID: {participant_id}")
        if item.get("rankingEligible"):
            fail(f"Tournament-only participant cannot be ranking eligible: {participant_id}")

counts = participants.get("counts", {})
if counts.get("participants") != len(participant_rows):
    fail("Tournament participant count does not match registry rows")
if counts.get("canonicalTeams") != sum(bool(x.get("canonicalTeamId")) for x in participant_rows):
    fail("Canonical participant count mismatch")
if counts.get("tournamentOnlyTeams") != sum(not x.get("canonicalTeamId") for x in participant_rows):
    fail("Tournament-only participant count mismatch")

team_evidence = evidence.get("teams", {})
if set(team_evidence) != participant_ids:
    missing = sorted(participant_ids - set(team_evidence))[:5]
    extra = sorted(set(team_evidence) - participant_ids)[:5]
    fail(f"Evidence/participant registry key mismatch; missing={missing}, extra={extra}")
for participant_id, item in team_evidence.items():
    if item.get("participantId") != participant_id:
        fail(f"Evidence participant ID mismatch: {participant_id}")
    summary_data = item.get("summary", {})
    if summary_data.get("games") != summary_data.get("finalGames", 0) + summary_data.get("scheduledGames", 0):
        fail(f"Evidence game status counts do not reconcile: {participant_id}")
    if len(item.get("recentGames", [])) > 12:
        fail(f"Evidence recent-game cap exceeded: {participant_id}")
    for game in item.get("recentGames", []):
        if not game.get("gameId") or not game.get("sourceRow"):
            fail(f"Evidence game lacks traceability: {participant_id}")

canonical_evidence = {key for key, item in team_evidence.items() if item.get("canonicalTeamId")}
if evidence.get("counts", {}).get("canonicalTeamsWithEvidence") != len(canonical_evidence):
    fail("Canonical evidence count mismatch")
if not canonical_evidence.issubset(ranked_team_ids):
    fail("Profile-ready canonical evidence contains a team absent from published rankings")

ranking_review = review.get("rankingReview", [])
identity_review = review.get("identityReview", [])
if len(ranking_review) != review.get("counts", {}).get("rankingItems"):
    fail("Ranking review count mismatch")
if len(identity_review) != review.get("counts", {}).get("identityReviewItems"):
    fail("Identity review count mismatch")
for item in ranking_review:
    if item.get("canonicalTeamId") not in canonical_evidence:
        fail(f"Ranking review references team without evidence: {item.get('canonicalTeamId')}")
    if item.get("status") not in {"schedule_only", "ready_for_ranking_review"}:
        fail(f"Invalid ranking review status: {item.get('status')}")
for item in identity_review:
    if item.get("canonicalTeamId"):
        fail(f"Identity review must contain tournament-only teams only: {item.get('id')}")

# The bootstrap snapshot should now resolve every participant to a stable evidence identity.
if len(participant_rows) < 48:
    fail("Tournament evidence registry should contain at least the 48-team 14U Girls bootstrap field")
if counts.get("canonicalTeams", 0) < 39:
    fail("Tournament evidence registry should retain at least 39 canonical 14U Girls identities")
if counts.get("tournamentOnlyTeams", 0) < 9:
    fail("Tournament evidence registry should preserve the nine tournament-only 14U Girls identities")

runtime = ROOT / "data" / "tournaments" / "evidence" / "runtime.js"
review_runtime = ROOT / "data" / "tournaments" / "evidence" / "review-runtime.js"
for path, prefix in ((runtime, "window.CPI_TOURNAMENT_EVIDENCE = "), (review_runtime, "window.CPI_TOURNAMENT_REVIEW = ")):
    if not path.exists():
        fail(f"Missing browser evidence runtime: {path.relative_to(ROOT)}")
    elif not path.read_text(encoding="utf-8").startswith(prefix):
        fail(f"Invalid browser evidence runtime prefix: {path.relative_to(ROOT)}")

team_html = (ROOT / "team.html").read_text(encoding="utf-8")
if "data/tournaments/evidence/runtime.js?v=7.42.0" not in team_html:
    fail("Team profile does not load normalized tournament evidence runtime")
if team_html.find("evidence/runtime.js") > team_html.find("team-profile-v7-42.js"):
    fail("Team profile evidence runtime must load before the profile renderer")
for rel in ["tournament-evidence.html", "js/tournament-evidence-v7-42.js", "css/tournament-evidence-v7-42.css"]:
    if not (ROOT / rel).exists():
        fail(f"Missing tournament evidence review interface file: {rel}")

for script in ["scripts/build-tournament-evidence.py", "scripts/validate-tournament-evidence.py"]:
    result = subprocess.run([sys.executable, "-m", "py_compile", str(ROOT / script)], capture_output=True, text=True)
    if result.returncode:
        fail(f"Python syntax error in {script}: {result.stderr.strip()}")
for script in ["js/team-profile-v7-42.js", "js/tournament-evidence-v7-42.js"]:
    result = subprocess.run(["node", "--check", str(ROOT / script)], capture_output=True, text=True)
    if result.returncode:
        fail(f"JavaScript syntax error in {script}: {result.stderr.strip()}")

if errors:
    print("TOURNAMENT EVIDENCE VALIDATION FAILED")
    for message in errors:
        print(f" - {message}")
    raise SystemExit(1)

print("TOURNAMENT EVIDENCE VALIDATION PASSED")
print(f" - {len(participant_rows)} stable tournament participant identities")
print(f" - {len(canonical_evidence)} canonical CPI teams have profile-ready evidence")
print(f" - {counts.get('tournamentOnlyTeams', 0)} tournament-only teams remain outside published rankings")
print(f" - {review.get('counts', {}).get('readyForRankingReview', 0)} teams currently have final results ready for manual ranking review")
print(" - Team profiles and the evidence dashboard consume generated browser runtimes")
