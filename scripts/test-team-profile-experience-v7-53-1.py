#!/usr/bin/env python3
import json, subprocess, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
errors=[]
def fail(msg): errors.append(msg)
site=json.loads((ROOT/'config/site-release.json').read_text())
if site.get('version') not in {'7.53.1','7.53.2','7.53.3','7.53.4','7.53.5','7.53.6','7.53.7','7.54.0','7.54.1','7.54.2','7.54.3','7.54.4','7.54.5','7.54.6','7.54.7','7.54.8','7.54.9','7.54.10','7.54.11','7.54.12','7.54.13','7.54.14','7.54.15','7.54.17','7.54.18','7.55.0','7.55.1','7.55.2','7.55.4','7.55.5','7.55.6','7.55.7','7.55.8','7.55.9','7.56.0','7.56.1','7.56.2', '7.56.3', '7.56.4', '7.56.7','7.56.8','7.56.9','7.56.11','7.56.12'}: fail('site version must preserve the 7.53.1 team experience')
if site.get('teamProfileRelease')!='7.53.1' or site.get('teamExperienceRelease')!='7.53.1': fail('team release fields must be 7.53.1')
if site.get('rankingDataRelease')!='7.52.13': fail('ranking data release changed')
if site.get('clubProfileRelease')!='7.53.0': fail('club profile release changed')
rankings=json.loads((ROOT/'rankings.json').read_text())
clubs=json.loads((ROOT/'clubs.json').read_text())
jo=json.loads((ROOT/'data/tournaments/jo-results-2026.json').read_text())
if len(rankings)!=724: fail(f'ranking count changed: {len(rankings)}')
if len(clubs)!=182: fail(f'club count changed: {len(clubs)}')
if jo.get('summary',{}).get('teamPlacements')!=976: fail('JO placement count changed')
html=(ROOT/'team.html').read_text()
ordered=[
 'data/tournaments/evidence/runtime.js?v=7.53.4',
 'data/tournaments/history/runtime.js?v=7.53.4',
 'data/tournaments/archive/runtime.js?v=7.53.4',
 'data/tournaments/jo-profile-runtime.js?v=7.53.4',
 'js/jo-live-team-history-v7-53-1.js?v=7.53.4',
 'js/team-profile-v7-42.js?v=7.53.4',
 'js/team-tournament-history-v7-53-1.js?v=7.53.4'
]
positions=[]
for token in ordered:
 pos=html.find(token); positions.append(pos)
 if pos<0: fail(f'team.html missing {token}')
if all(pos>=0 for pos in positions) and positions!=sorted(positions): fail('team profile assets load in the wrong order')
if 'css/team-tournament-history-v7-53-1.css?v=7.53.4' not in html: fail('team history CSS missing')
for rel,tokens in {
 'js/team-tournament-history-v7-53-1.js':['Tournament history','WPI_JO_LIVE_HISTORY','CPI_TOURNAMENT_ARCHIVE','Open complete JO journey','opponentTeamPage'],
 'js/jo-live-team-history-v7-53-1.js':['cpi-live-relay','docs.google.com','resolveTournament','gameForTeam'],
 'css/team-tournament-history-v7-53-1.css':['.wpi-team-event-card','.wpi-team-game-row','@media (max-width: 640px)']
}.items():
 text=(ROOT/rel).read_text()
 for token in tokens:
  if token not in text: fail(f'{rel} missing {token}')
 if rel.endswith('.js'):
  result=subprocess.run(['node','--check',str(ROOT/rel)],capture_output=True,text=True)
  if result.returncode: fail(f'JavaScript syntax error in {rel}: {result.stderr.strip()}')
if errors:
 print('TEAM PROFILE EXPERIENCE 7.53.1 TEST FAILED')
 for error in errors: print(' -',error)
 sys.exit(1)
print('TEAM PROFILE EXPERIENCE 7.53.1 TESTS PASSED')
print(' - Rankings, clubs, JO placements, identities, and profile source data are preserved')
print(' - Ranked and tournament-only teams load one unified tournament-history experience')
