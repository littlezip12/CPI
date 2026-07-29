#!/usr/bin/env python3
"""Validate WPI 7.49 historical profile integration and ranking quarantine."""
from __future__ import annotations
import json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
EXPECTED='7.49.1'; errors=[]
def fail(msg): errors.append(msg)
def load(rel):
 p=ROOT/rel
 if not p.exists(): fail(f'Missing historical profile file: {rel}'); return {}
 try:return json.loads(p.read_text(encoding='utf-8'))
 except Exception as exc: fail(f'Invalid JSON in {rel}: {exc}'); return {}
site=load('config/site-release.json'); profiles=load('data/tournaments/history/index.json'); archive=load('data/tournaments/archive/index.json'); qa=load('qa/historical-profile-summary-7.49.1.json')
if site.get('historicalProfilesRelease')!=EXPECTED: fail('Site release must register historical profiles 7.49.1')
if profiles.get('release')!=EXPECTED or profiles.get('schemaVersion')!=1: fail('Historical profiles must use schemaVersion 1 and release 7.49.1')
if profiles.get('policy',{}).get('rankingEvidenceEnabled') is not False: fail('Historical profiles must remain excluded from ranking evidence')
if profiles.get('policy',{}).get('automaticRankingPublication') is not False: fail('Historical profiles must block automatic ranking publication')
if profiles.get('counts',{}).get('finalGames')!=archive.get('counts',{}).get('finalGames'): fail('Historical profile final-game count must match archive')
if profiles.get('counts',{}).get('teams',0)<100 or profiles.get('counts',{}).get('clubs',0)<70: fail('Historical profile identity coverage unexpectedly low')
if qa.get('summary')!=profiles.get('counts'): fail('Historical profile QA summary must match generated profile counts')
for rel in ['data/tournaments/history/runtime.js','css/historical-profiles-v7-49.css','scripts/build-historical-profiles.py','scripts/test-historical-profile-engine.py','scripts/validate-historical-profiles.py']:
 if not (ROOT/rel).exists(): fail(f'Missing historical profile asset: {rel}')
team_html=(ROOT/'team.html').read_text(encoding='utf-8'); club_html=(ROOT/'club.html').read_text(encoding='utf-8')
for token in ['data/tournaments/history/runtime.js?v=7.53.4','css/historical-profiles-v7-49.css?v=7.53.4']:
 if token not in team_html: fail(f'Team profile missing historical asset: {token}')
 if token not in club_html: fail(f'Club profile missing historical asset: {token}')
team_js=(ROOT/'js/team-tournament-history-v7-53-1.js').read_text(encoding='utf-8'); club_js=(ROOT/'js/club-intelligence-v7-26.js').read_text(encoding='utf-8')
for token in ['CPI_HISTORICAL_PROFILES','CPI_TOURNAMENT_ARCHIVE','Tournament history','does not independently change the WPI ranking']:
 if token not in team_js: fail(f'Team profile historical rendering missing token: {token}')
for token in ['CPI_HISTORICAL_PROFILES','club-tournament-history','published WPI rankings']:
 if token not in club_js: fail(f'Club profile historical rendering missing token: {token}')
for rel in ['scripts/build-historical-profiles.py','scripts/test-historical-profile-engine.py','scripts/validate-historical-profiles.py']:
 r=subprocess.run(['python3','-m','py_compile',str(ROOT/rel)],capture_output=True,text=True)
 if r.returncode: fail(f'Python syntax error in {rel}: {r.stderr.strip()}')
for rel in ['js/team-tournament-history-v7-53-1.js','js/club-intelligence-v7-26.js']:
 r=subprocess.run(['node','--check',str(ROOT/rel)],capture_output=True,text=True)
 if r.returncode: fail(f'JavaScript syntax error in {rel}: {r.stderr.strip()}')
if errors:
 print('HISTORICAL PROFILE VALIDATION FAILED')
 for e in errors: print(' - '+e)
 raise SystemExit(1)
print('HISTORICAL PROFILE VALIDATION PASSED')
print(f" - {profiles.get('counts',{}).get('teams')} ranked teams and {profiles.get('counts',{}).get('clubs')} clubs have linked archive history")
print(f" - {profiles.get('counts',{}).get('finalGames')} verified historical finals remain profile-only")
print(' - Team profiles unify archive history while club pages retain program-level history; ranking quarantine remains enforced')
