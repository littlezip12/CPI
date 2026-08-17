#!/usr/bin/env python3
from pathlib import Path
import json
import sys

ROOT=Path(__file__).resolve().parents[1]
errors=[]
load=lambda rel: json.loads((ROOT/rel).read_text(encoding='utf-8'))
site=load('config/site-release.json')
registry=load('data/tournaments/platform/registry.json')
bundle=load('data/tournaments/platform/events/2026-quiksilver-cup.json')
source_registry=load('data/tournaments/registry.json')
rankings=load('rankings.json')
clubs=load('clubs.json')
jo=load('data/tournaments/jo-results-2026.json')

if site.get('tournamentSchemaRelease')!='7.54.0': errors.append('tournamentSchemaRelease must preserve 7.54.0')
if site.get('quiksilverPlatformRelease') not in {'7.54.0','7.54.1','7.54.2','7.54.3','7.54.4','7.54.5','7.54.6','7.54.7','7.54.8','7.54.9','7.54.10','7.54.11','7.54.17','7.54.18','7.55.0','7.55.1','7.55.2','7.55.4','7.55.5','7.55.6','7.55.7','7.55.8','7.55.9','7.56.0','7.56.1','7.56.2', '7.56.3', '7.56.4', '7.56.7','7.56.8','7.56.9','7.56.11','7.56.12','7.56.13','7.56.14','7.56.15','7.57.0','7.57.1','7.57.2','7.57.3','7.57.4','7.57.5','7.57.6','7.57.7','7.57.8','7.57.9','7.57.10','7.57.11','7.57.12','7.57.13','7.57.14','7.57.15','7.57.16','7.57.17','7.57.18', '7.57.19','7.57.20','7.57.21','7.57.22','7.58.0','7.58.1','7.58.2','7.58.3','7.58.4','7.58.5','7.58.6','7.58.7','7.58.8','7.58.9','7.58.10','7.59.0','7.60.0','7.60.1','7.60.2','7.60.3','7.61.0'}: errors.append('quiksilverPlatformRelease must preserve the Quiksilver migration')
if site.get('tournamentPlatformRelease') not in {'7.54.0','7.54.1','7.54.2','7.54.3','7.54.4','7.54.5','7.54.6','7.54.7','7.54.8','7.54.9','7.54.10','7.54.11','7.54.17','7.54.18','7.55.0','7.55.1','7.55.2','7.55.4','7.55.5','7.55.6','7.55.7','7.55.8','7.55.9','7.56.0','7.56.1','7.56.2', '7.56.3', '7.56.4', '7.56.7','7.56.8','7.56.9','7.56.11','7.56.12','7.56.13','7.56.14','7.56.15','7.57.0','7.57.1','7.57.2','7.57.3','7.57.4','7.57.5','7.57.6','7.57.7','7.57.8','7.57.9','7.57.10','7.57.11','7.57.12','7.57.13','7.57.14','7.57.15','7.57.16','7.57.17','7.57.18', '7.57.19','7.57.20','7.57.21','7.57.22','7.58.0','7.58.1','7.58.2','7.58.3','7.58.4','7.58.5','7.58.6','7.58.7','7.58.8','7.58.9','7.58.10','7.59.0','7.60.0','7.60.1','7.60.2','7.60.3','7.61.0'}: errors.append('tournamentPlatformRelease must preserve the shared platform')
if site.get('tournamentRegistryRelease') not in {'7.54.0','7.54.1','7.54.2','7.54.3','7.54.4','7.54.5','7.54.6','7.54.7','7.54.8','7.54.9','7.54.10','7.54.11','7.54.17','7.54.18','7.55.0','7.55.1','7.55.2','7.55.4','7.55.5','7.55.6','7.55.7','7.55.8','7.55.9','7.56.0','7.56.1','7.56.2', '7.56.3', '7.56.4', '7.56.7','7.56.8','7.56.9','7.56.11','7.56.12','7.56.13','7.56.14','7.56.15','7.57.0','7.57.1','7.57.2','7.57.3','7.57.4','7.57.5','7.57.6','7.57.7','7.57.8','7.57.9','7.57.10','7.57.11','7.57.12','7.57.13','7.57.14','7.57.15','7.57.16','7.57.17','7.57.18', '7.57.19','7.57.20','7.57.21','7.57.22','7.58.0','7.58.1','7.58.2','7.58.3','7.58.4','7.58.5','7.58.6','7.58.7','7.58.8','7.58.9','7.58.10','7.59.0','7.60.0','7.60.1','7.60.2','7.60.3','7.61.0'}: errors.append('tournamentRegistryRelease must preserve the shared registry')
if site.get('version') not in {'7.54.0','7.54.1','7.54.2','7.54.3','7.54.4','7.54.5','7.54.6','7.54.7','7.54.8','7.54.9','7.54.10','7.54.11','7.54.12','7.54.13','7.54.14','7.54.15','7.54.17','7.54.18','7.55.0','7.55.1','7.55.2','7.55.4','7.55.5','7.55.6','7.55.7','7.55.8','7.55.9','7.56.0','7.56.1','7.56.2', '7.56.3', '7.56.4', '7.56.7','7.56.8','7.56.9','7.56.11','7.56.12','7.56.13','7.56.14','7.56.15','7.57.0','7.57.1','7.57.2','7.57.3','7.57.4','7.57.5','7.57.6','7.57.7','7.57.8','7.57.9','7.57.10','7.57.11','7.57.12','7.57.13','7.57.14','7.57.15','7.57.16','7.57.17','7.57.18', '7.57.19','7.57.20','7.57.21','7.57.22','7.58.0','7.58.1','7.58.2','7.58.3','7.58.4','7.58.5','7.58.6','7.58.7','7.58.8','7.58.9','7.58.10','7.59.0','7.60.0','7.60.1','7.60.2','7.60.3','7.61.0','7.61.1','7.62.0','7.62.1','7.62.2','7.62.3','7.62.4','7.62.5'}: errors.append('site version must preserve the platform foundation')
if registry.get('release') not in {'7.54.0','7.54.1','7.54.2','7.54.3','7.54.4','7.54.5','7.54.6','7.54.7','7.54.8','7.54.9','7.54.10','7.54.11','7.54.17','7.54.18','7.55.0','7.55.1','7.55.2','7.55.4','7.55.5','7.55.6','7.55.7','7.55.8','7.55.9','7.56.0','7.56.1','7.56.2', '7.56.3', '7.56.4', '7.56.7','7.56.8','7.56.9','7.56.11','7.56.12','7.56.13','7.56.14','7.56.15','7.57.0','7.57.1','7.57.2','7.57.3','7.57.4','7.57.5','7.57.6','7.57.7','7.57.8','7.57.9','7.57.10','7.57.11','7.57.12','7.57.13','7.57.14','7.57.15','7.57.16','7.57.17','7.57.18', '7.57.19','7.57.20','7.57.21','7.57.22','7.58.0','7.58.1','7.58.2','7.58.3','7.58.4','7.58.5','7.58.6','7.58.7','7.58.8','7.58.9','7.58.10','7.59.0','7.60.0','7.60.1','7.60.2','7.60.3','7.61.0'} or len(registry.get('events',[]))!=10: errors.append('platform registry must contain ten registered events')
event=next((e for e in registry.get('events',[]) if e.get('id')=='2026-quiksilver-cup'),None)
if not event or event.get('migrationStatus')!='platform_live': errors.append('Quiksilver Cup must be the first platform-live event')
if event and event.get('publicPath')!='tournament.html?event=2026-quiksilver-cup': errors.append('Quiksilver platform public path is incorrect')

summary=bundle.get('summary',{})
expected={'divisionCount':7,'gameCount':226,'finalGameCount':226,'scheduledGameCount':0,'teamCount':93,'placementCount':80,'venueCount':14,'dateCount':4}
for key,value in expected.items():
    if summary.get(key)!=value: errors.append(f'Quiksilver {key} expected {value}, found {summary.get(key)}')
if bundle.get('event',{}).get('rankingEvidenceEnabled') is not False: errors.append('historical platform event must remain ranking-quarantined')
if set(bundle.get('capabilities',{}).get('filters',[]))!={'ageGroup','gender','division','team','date','venue','status','search'}: errors.append('reusable filter contract is incomplete')
if {a.get('type') for a in bundle.get('sourceAdapters',[])}!={'normalized_json','google_sheets_csv'}: errors.append('Quiksilver source adapters are incomplete')

team_ids={t.get('participantId') for t in bundle.get('teams',[])}
for game in bundle.get('games',[]):
    for side in ['white','dark']:
        participant=game.get(side)
        if participant and participant.get('participantId') not in team_ids:
            errors.append(f"game {game.get('id')} references an unknown participant")
            break
for team in bundle.get('teams',[]):
    logo=team.get('logo')
    if logo and not (ROOT/logo).exists(): errors.append(f"team logo does not exist: {logo}")

for rel in [
    'tournament.html','css/tournament-platform-v7-54-0.css','js/tournament-platform-v7-54-0.js',
    'tournaments/schema/tournament-event.schema.json','tournaments/schema/tournament-division.schema.json',
    'tournaments/schema/tournament-participant.schema.json','tournaments/schema/tournament-venue.schema.json',
    'tournaments/schema/tournament-source-adapter.schema.json','tournaments/schema/tournament-platform-bundle.schema.json'
]:
    if not (ROOT/rel).exists() or (ROOT/rel).stat().st_size==0: errors.append(f'missing platform asset: {rel}')

page=(ROOT/'tournament.html').read_text(encoding='utf-8')
for token in ['id="tpAge"','id="tpGender"','id="tpDivision"','id="tpTeam"','id="tpDate"','id="tpVenue"','id="tpStatus"','id="tpSearch"','id="tpJourney"','tournament-platform-v7-54-0.js?v=7.54.17']:
    if token not in page: errors.append(f'tournament.html missing {token}')
redirect=(ROOT/'tournaments/quicksilver-cup/index.html').read_text(encoding='utf-8')
if '../../tournament.html?event=2026-quiksilver-cup' not in redirect: errors.append('legacy Quiksilver URL does not converge on the platform')
public_hub=load('data/tournaments/public-hub.json')
if not any(e.get('id')=='2026-quiksilver-cup' and e.get('publicPath')=='tournament.html?event=2026-quiksilver-cup' for e in public_hub.get('events',[])): errors.append('public tournament archive does not register Quiksilver')
source_event=next((e for e in source_registry.get('events',[]) if e.get('id')=='2026-quiksilver-cup'),{})
if source_event.get('platformEnabled') is not True or source_event.get('platformRelease') not in {'7.54.0','7.54.1','7.54.2','7.54.3','7.54.4','7.54.5','7.54.6','7.54.7','7.54.8','7.54.9','7.54.10','7.54.11','7.54.17','7.54.18','7.55.0','7.55.1','7.55.2','7.55.4','7.55.5','7.55.6','7.55.7','7.55.8','7.55.9','7.56.0','7.56.1','7.56.2', '7.56.3', '7.56.4', '7.56.7','7.56.8','7.56.9','7.56.11','7.56.12','7.56.13','7.56.14','7.56.15','7.57.0','7.57.1','7.57.2','7.57.3','7.57.4','7.57.5','7.57.6','7.57.7','7.57.8','7.57.9','7.57.10','7.57.11','7.57.12','7.57.13','7.57.14','7.57.15','7.57.16','7.57.17','7.57.18', '7.57.19','7.57.20','7.57.21','7.57.22','7.58.0','7.58.1','7.58.2','7.58.3','7.58.4','7.58.5','7.58.6','7.58.7','7.58.8','7.58.9','7.58.10','7.59.0','7.60.0','7.60.1','7.60.2','7.60.3','7.61.0'}: errors.append('source registry does not register Quiksilver platform migration')

if len(rankings)!=724: errors.append(f'expected 724 rankings, found {len(rankings)}')
if len(clubs)!=182: errors.append(f'expected 182 clubs, found {len(clubs)}')
if jo.get('summary',{}).get('teamPlacements')!=976: errors.append('expected 976 JO placements')

if errors:
    print('WPI TOURNAMENT PLATFORM 7.54.0 TEST FAILED')
    for error in errors[:40]: print(' -',error)
    sys.exit(1)
print('WPI TOURNAMENT PLATFORM 7.54.0 TEST PASSED')
print(' - Ten events share one platform registry and source-adapter contract')
print(' - Quiksilver Cup migrated with 7 divisions, 226 finals, 93 teams, 80 placements, and 14 venues')
print(' - Age, gender, division, team, date, venue, status, and search filters are wired')
print(' - Legacy Quiksilver URLs converge on the reusable viewer')
print(' - 724 rankings, 182 clubs, and 976 JO placements remain unchanged')
