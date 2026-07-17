#!/usr/bin/env python3
"""Validate CPI 7.48 completed-tournament archive wiring and evidence quarantine."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED = "7.48.0"
errors: list[str] = []


def fail(message: str) -> None: errors.append(message)

def load(rel: str):
    path = ROOT / rel
    if not path.exists(): fail(f"Missing archive file: {rel}"); return {}
    try: return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc: fail(f"Invalid JSON in {rel}: {exc}"); return {}

registry=load('data/tournaments/registry.json')
archive=load('data/tournaments/archive/index.json')
site=load('config/site-release.json')
archive_events=[event for event in registry.get('events',[]) if event.get('archiveSyncEnabled')]
archive_divisions=[division for event in archive_events for division in event.get('divisions',[])]
if site.get('tournamentArchiveRelease')!=EXPECTED: fail('Site release must register tournament archive 7.48.0')
if len(archive_events)!=3 or len(archive_divisions)!=25: fail(f'Expected 3 completed events and 25 archive divisions, found {len(archive_events)} and {len(archive_divisions)}')
if any(event.get('rankingEvidenceEnabled') is not False for event in archive_events): fail('Every historical archive event must remain quarantined from ranking evidence')
if archive.get('release')!=EXPECTED or archive.get('schemaVersion')!=1: fail('Archive output must use schemaVersion 1 and release 7.48.0')
if archive.get('counts',{}).get('events')!=3 or archive.get('counts',{}).get('divisions')!=25: fail('Archive output must represent all three events and 25 divisions')
if archive.get('counts',{}).get('bankedDivisions',0)+archive.get('counts',{}).get('pendingDivisions',0)!=25: fail('Banked and pending archive division counts must reconcile')
if archive.get('policy',{}).get('rankingEvidenceRequiresApproval') is not True: fail('Archive policy must require explicit ranking evidence approval')
for rel in ['data/tournaments/quiksilver-cup-2026.json','data/tournaments/archive/2026-boys-futures-super-finals.json','data/tournaments/archive/2026-girls-us-club-championships.json']:
    if not (ROOT/rel).exists(): fail(f'Missing normalized result-page fallback: {rel}')
for rel in ['tournament-archive.html','css/tournament-archive-v7-48.css','js/tournament-archive-v7-48.js','data/tournaments/archive/runtime.js','scripts/build-tournament-archive.py','.github/workflows/sync-tournament-archive.yml']:
    if not (ROOT/rel).exists(): fail(f'Missing archive asset: {rel}')
html=(ROOT/'tournament-archive.html').read_text(encoding='utf-8') if (ROOT/'tournament-archive.html').exists() else ''
for token in ['data/tournaments/archive/runtime.js?v=7.48.0','js/tournament-archive-v7-48.js?v=7.48.0','archiveGames','archiveEvent']:
    if token not in html: fail(f'Archive page missing token: {token}')
results=(ROOT/'tournaments/results-app.js').read_text(encoding='utf-8')
for token in ['quiksilver-cup-2026.json','2026-boys-futures-super-finals.json','2026-girls-us-club-championships.json']:
    if token not in results: fail(f'Results application missing normalized fallback: {token}')
evidence=(ROOT/'scripts/build-tournament-evidence.py').read_text(encoding='utf-8')
if 'rankingEvidenceEnabled' not in evidence or 'continue' not in evidence: fail('Tournament evidence builder must enforce historical evidence quarantine')
workflow=(ROOT/'.github/workflows/sync-tournament-archive.yml').read_text(encoding='utf-8') if (ROOT/'.github/workflows/sync-tournament-archive.yml').exists() else ''
for token in ['--archive-enabled','build-tournament-archive.py','validate-tournament-archive.py','workflow_dispatch','schedule:','data/tournaments/archive']:
    if token not in workflow: fail(f'Archive workflow missing token: {token}')
for rel in ['scripts/build-tournament-archive.py','scripts/test-historical-tournament-parser.py','scripts/validate-tournament-archive.py','scripts/sync-tournament-data.py','scripts/tournament_pipeline.py']:
    result=subprocess.run(['python3','-m','py_compile',str(ROOT/rel)],capture_output=True,text=True)
    if result.returncode: fail(f'Python syntax error in {rel}: {result.stderr.strip()}')
for rel in ['js/tournament-archive-v7-48.js','tournaments/results-app.js']:
    result=subprocess.run(['node','--check',str(ROOT/rel)],capture_output=True,text=True)
    if result.returncode: fail(f'JavaScript syntax error in {rel}: {result.stderr.strip()}')
if errors:
    print('TOURNAMENT ARCHIVE VALIDATION FAILED')
    for item in errors: print(' - '+item)
    raise SystemExit(1)
print('TOURNAMENT ARCHIVE VALIDATION PASSED')
print(' - 3 completed tournaments and 25 divisions are registered for controlled archival sync')
print(f" - {archive.get('counts',{}).get('bankedDivisions',0)} divisions are banked and {archive.get('counts',{}).get('pendingDivisions',0)} await first sync")
print(' - Historical results cannot enter ranking evidence until explicitly approved')
print(' - Existing result pages have normalized last-known-good fallbacks')
