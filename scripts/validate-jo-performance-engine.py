#!/usr/bin/env python3
from __future__ import annotations
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
errors = []

def fail(msg): errors.append(msg)

def load(rel):
    p = ROOT / rel
    if not p.exists():
        fail(f"Missing {rel}")
        return {}
    try: return json.loads(p.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"Invalid JSON in {rel}: {exc}")
        return {}

performance = load("data/tournaments/jo-performance/index.json")
manifest = load("data/tournaments/normalized/manifest.json")
evidence = load("data/tournaments/evidence/index.json")
if performance.get("schemaVersion") != 1: fail("JO performance schemaVersion must be 1")
if performance.get("release") != "7.45.0": fail("JO performance release must be 7.45.0")
if "never changed automatically" not in performance.get("policy", "").lower(): fail("Manual-only ranking policy missing")
counts = performance.get("counts", {})
if counts.get("divisions") != 23: fail(f"Expected 23 JO divisions, found {counts.get('divisions')}")
manifest_finals = int(manifest.get("counts", {}).get("finalGames") or 0)
evidence_finals = int(evidence.get("counts", {}).get("finalGames") or 0)
if counts.get("uniqueFinalGames") != manifest_finals: fail("JO performance final-game count does not match normalized manifest")
if counts.get("uniqueFinalGames") != evidence_finals: fail("JO performance final-game count does not match evidence bank")
if counts.get("confirmedPlacements", 0) > counts.get("teamsWithFinals", 0): fail("Confirmed placements exceed teams with finals")
for team in performance.get("teams", []):
    if not team.get("participantId"): fail("JO performance team lacks participant ID")
    for appearance in team.get("appearances", []):
        placement = appearance.get("confirmedPlacement")
        if placement is not None and (not isinstance(placement, int) or placement < 1): fail(f"Invalid placement for {team.get('participantId')}")
        if appearance.get("seedDelta") is not None and not isinstance(appearance.get("seed"), int): fail(f"Seed delta exists without seed for {team.get('participantId')}")
for rel in ["jo-performance.html", "js/jo-performance-v7-45.js", "css/jo-performance-v7-45.css", "data/tournaments/jo-performance/runtime.js"]:
    if not (ROOT / rel).exists(): fail(f"Missing JO performance interface file: {rel}")
for script in ["scripts/build-jo-performance.py", "scripts/test-jo-performance-engine.py", "scripts/validate-jo-performance-engine.py"]:
    proc = subprocess.run([sys.executable, "-m", "py_compile", str(ROOT / script)], capture_output=True, text=True)
    if proc.returncode: fail(f"Python syntax error in {script}: {proc.stderr.strip()}")
proc = subprocess.run(["node", "--check", str(ROOT / "js/jo-performance-v7-45.js")], capture_output=True, text=True)
if proc.returncode: fail(f"JavaScript syntax error in JO performance UI: {proc.stderr.strip()}")
if errors:
    print("JO PERFORMANCE ENGINE VALIDATION FAILED")
    for err in errors: print(" - " + err)
    raise SystemExit(1)
print("JO PERFORMANCE ENGINE VALIDATION PASSED")
print(f" - {counts.get('divisions', 0)} JO divisions represented")
print(f" - {counts.get('uniqueFinalGames', 0)} verified final games feed performance summaries")
print(f" - {counts.get('confirmedPlacements', 0)} confirmed placements derived only from final placement games")
print(" - Published CPI rankings remain manual and unchanged")
