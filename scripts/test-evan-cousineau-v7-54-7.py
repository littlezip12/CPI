#!/usr/bin/env python3
from pathlib import Path
import json,re,sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]
def load(rel): return json.loads((ROOT/rel).read_text(encoding='utf-8'))
site=load('config/site-release.json')
bundle=load('data/tournaments/platform/events/2025-evan-cousineau-memorial-cup.json')
placements=load('data/tournaments/archive/2025-evan-cousineau-memorial-cup.json')
hub=load('data/tournaments/public-hub.json')
if site.get('version') not in {'7.54.7','7.54.8','7.54.9','7.54.10','7.54.11','7.54.12','7.54.13','7.54.14','7.54.15','7.54.17','7.54.18','7.55.0','7.55.1','7.55.2','7.55.4','7.55.5','7.55.6','7.55.7','7.55.8','7.55.9','7.56.0','7.56.1','7.56.2'}: errors.append('site version must preserve the 7.54.7 Evan Cousineau release')
if site.get('evanCousineauPlatformRelease')!='7.54.7': errors.append('Evan Cousineau release metadata missing')
expected={'divisionCount':15,'gameCount':348,'finalGameCount':348,'scheduledGameCount':0,'teamCount':169,'placementCount':105,'venueCount':15,'dateCount':2}
for k,v in expected.items():
 if bundle.get('summary',{}).get(k)!=v: errors.append(f'{k} expected {v}, found {bundle.get("summary",{}).get(k)}')
if bundle.get('event',{}).get('season')!='2025' or bundle.get('event',{}).get('startDate')!='2025-10-04' or bundle.get('event',{}).get('endDate')!='2025-10-05': errors.append('legacy event identity season or dates are incorrect')
if bundle.get('event',{}).get('competitiveSeason')!='2025-2026' or bundle.get('event',{}).get('eventYear')!=2025: errors.append('competitive season metadata is incorrect')
if bundle.get('event',{}).get('rankingEvidenceEnabled') is not False: errors.append('historical event must remain ranking-quarantined')
if placements.get('policy',{}).get('publishOnlyVerifiedPlacements') is not True or placements.get('policy',{}).get('unplacedTeamsShowRecordOnly') is not True: errors.append('verified-placement-only policy missing')
placed={row.get('participantId') for rows in bundle.get('placements',{}).values() for row in rows}
unplaced=[team for team in bundle.get('teams',[]) if team.get('participantId') not in placed]
if len(unplaced)!=64: errors.append(f'expected 64 record-only teams, found {len(unplaced)}')
if any(team.get('finish') or team.get('finishLabel') for team in unplaced): errors.append('record-only teams received inferred placements')
if any(len(team.get('gameIds',[])) != team.get('record',{}).get('wins',0)+team.get('record',{}).get('losses',0)+team.get('record',{}).get('ties',0) for team in bundle.get('teams',[])): errors.append('team record does not match game journey')
labels={row.get('placeLabel') for row in bundle.get('placements',{}).get('10u-coed-platinum-gold',[])}
if labels!={'Platinum 1st','Platinum 2nd','Gold 1st','Gold 2nd','Gold 3rd'}: errors.append(f'10U official tier labels incorrect: {sorted(labels)}')
if any(re.search(r'(?:^|\s)(?:W|L)#|^(?:1st|2nd|3rd|4th)[A-Z]?\(',team.get('name',''),re.I) for team in bundle.get('teams',[])): errors.append('bracket routing leaked into team names')
if sum(team.get('logo')!='assets/logos/cpi-logo-fallback.svg' for team in bundle.get('teams',[]))<130: errors.append('club logo identity coverage is unexpectedly low')
event=next((e for e in hub.get('events',[]) if e.get('id')=='2025-evan-cousineau-memorial-cup'),None)
if not event or event.get('eventYear')!=2025 or event.get('competitiveSeason')!='2025-2026' or event.get('seasonOrder')!=10 or event.get('mode')!='platform': errors.append('2025–2026 archive registration is incorrect')
js=(ROOT/'js/tournament-hub-v7-54-4.js').read_text(encoding='utf-8')
for token in ['Records only','No official placement game was played','row.placeLabel']:
 if token not in js: errors.append(f'archive record-only UI missing {token}')
platform=(ROOT/'js/tournament-platform-v7-54-0.js').read_text(encoding='utf-8')
for token in ['team.finishLabel||"Record only"','row.placeLabel||ordinal(row.place)']:
 if token not in platform: errors.append(f'platform placement policy UI missing {token}')
if errors:
 print('EVAN COUSINEAU 7.54.7 TEST FAILED')
 for e in errors: print(' -',e)
 sys.exit(1)
print('EVAN COUSINEAU 7.54.7 TEST PASSED')
print(' - 15 divisions, 348 verified finals, 169 team journeys, and 105 verified placements')
print(' - 64 lower-place teams display records and journeys without inferred rankings')
print(' - Official Platinum/Gold labels and existing WPI club logos are preserved')
