#!/usr/bin/env python3
"""Validate CPI 7.49 completed-tournament archive, profile links, and evidence quarantine."""
from __future__ import annotations
import json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; EXPECTED='7.49.0'; errors=[]
def fail(m): errors.append(m)
def load(rel):
 p=ROOT/rel
 if not p.exists(): fail(f'Missing archive file: {rel}'); return {}
 try:return json.loads(p.read_text(encoding='utf-8'))
 except Exception as exc: fail(f'Invalid JSON in {rel}: {exc}'); return {}
registry=load('data/tournaments/registry.json'); archive=load('data/tournaments/archive/index.json'); site=load('config/site-release.json')
archive_events=[e for e in registry.get('events',[]) if e.get('archiveSyncEnabled')]; archive_divisions=[d for e in archive_events for d in e.get('divisions',[])]
if site.get('tournamentArchiveRelease')!=EXPECTED: fail('Site release must register tournament archive 7.49.0')
if len(archive_events)!=3 or len(archive_divisions)!=25: fail(f'Expected 3 completed events and 25 archive divisions, found {len(archive_events)} and {len(archive_divisions)}')
if any(e.get('rankingEvidenceEnabled') is not False for e in archive_events): fail('Every historical archive event must remain quarantined from ranking evidence')
if archive.get('release')!=EXPECTED or archive.get('schemaVersion')!=2: fail('Archive output must use schemaVersion 2 and release 7.49.0')
counts=archive.get('counts',{})
if counts.get('events')!=3 or counts.get('divisions')!=25: fail('Archive output must represent all three events and 25 divisions')
if counts.get('bankedDivisions',0)+counts.get('pendingDivisions',0)!=25: fail('Banked and pending archive division counts must reconcile')
if counts.get('bankedDivisions',0)<18: fail('Historical archive lost previously banked divisions')
if counts.get('games',0)<787 or counts.get('finalGames',0)<700: fail('Completed-event parser did not preserve the verified historical game bank')
if counts.get('rankedTeamsRepresented',0)<100 or counts.get('clubsRepresented',0)<70: fail('Historical identity/profile link coverage unexpectedly low')
if archive.get('policy',{}).get('rankingEvidenceRequiresApproval') is not True: fail('Archive policy must require explicit ranking evidence approval')
if archive.get('policy',{}).get('profileDisplayDoesNotEnableRankingEvidence') is not True: fail('Profile display must not enable ranking evidence')
if not any(event.get('placements') for event in archive.get('events',[])): fail('Archive must retain verified placement records')
for game in archive.get('games',[]):
 if game.get('status')=='final' and not game.get('scoreDisplay'): fail(f"Final archive game missing score display: {game.get('id')}")
 if (game.get('whiteTeamId') and not game.get('whiteTeamPage')) or (game.get('darkTeamId') and not game.get('darkTeamPage')): fail(f"Canonical archive team missing profile link: {game.get('id')}")
 if game.get('rankingEvidenceEnabled') is not False: fail(f"Historical game incorrectly enables ranking evidence: {game.get('id')}")
for rel in ['data/tournaments/quiksilver-cup-2026.json','data/tournaments/archive/2026-boys-futures-super-finals.json','data/tournaments/archive/2026-girls-us-club-championships.json']:
 if not (ROOT/rel).exists(): fail(f'Missing normalized result-page fallback: {rel}')
for rel in ['tournament-archive.html','css/tournament-archive-v7-49.css','js/tournament-archive-v7-49.js','data/tournaments/archive/runtime.js','scripts/build-tournament-archive.py','.github/workflows/sync-tournament-archive.yml']:
 if not (ROOT/rel).exists(): fail(f'Missing archive asset: {rel}')
html=(ROOT/'tournament-archive.html').read_text(encoding='utf-8')
for token in ['data/tournaments/archive/runtime.js?v=7.49.0','js/tournament-archive-v7-49.js?v=7.49.0','archiveGames','archiveAge','archiveGender','archiveScope']:
 if token not in html: fail(f'Archive page missing token: {token}')
results=(ROOT/'tournaments/results-app.js').read_text(encoding='utf-8')
for token in ['quiksilver-cup-2026.json','2026-boys-futures-super-finals.json','2026-girls-us-club-championships.json']:
 if token not in results: fail(f'Results application missing normalized fallback: {token}')
evidence=(ROOT/'scripts/build-tournament-evidence.py').read_text(encoding='utf-8')
if 'rankingEvidenceEnabled' not in evidence or 'continue' not in evidence: fail('Tournament evidence builder must enforce historical evidence quarantine')
workflow=(ROOT/'.github/workflows/sync-tournament-archive.yml').read_text(encoding='utf-8')
for token in ['--archive-enabled','build-tournament-archive.py','build-historical-profiles.py','validate-historical-profiles.py','workflow_dispatch','schedule:','data/tournaments/history']:
 if token not in workflow: fail(f'Archive workflow missing token: {token}')
for rel in ['scripts/build-tournament-archive.py','scripts/build-historical-profiles.py','scripts/test-historical-tournament-parser.py','scripts/validate-tournament-archive.py','scripts/sync-tournament-data.py','scripts/tournament_pipeline.py']:
 r=subprocess.run(['python3','-m','py_compile',str(ROOT/rel)],capture_output=True,text=True)
 if r.returncode: fail(f'Python syntax error in {rel}: {r.stderr.strip()}')
for rel in ['js/tournament-archive-v7-49.js','tournaments/results-app.js']:
 r=subprocess.run(['node','--check',str(ROOT/rel)],capture_output=True,text=True)
 if r.returncode: fail(f'JavaScript syntax error in {rel}: {r.stderr.strip()}')
if errors:
 print('TOURNAMENT ARCHIVE VALIDATION FAILED')
 for item in errors: print(' - '+item)
 raise SystemExit(1)
print('TOURNAMENT ARCHIVE VALIDATION PASSED')
print(' - 3 completed tournaments and 25 divisions remain registered for controlled archival sync')
print(f" - {counts.get('bankedDivisions',0)} divisions are banked and {counts.get('pendingDivisions',0)} await source access")
print(f" - {counts.get('finalGames',0)} verified finals link to {counts.get('rankedTeamsRepresented',0)} ranked teams and {counts.get('clubsRepresented',0)} clubs")
print(' - Historical profile display remains quarantined from ranking evidence and publication')
