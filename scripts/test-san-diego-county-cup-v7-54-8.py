#!/usr/bin/env python3
from pathlib import Path
import json,re,sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]
def load(rel): return json.loads((ROOT/rel).read_text(encoding='utf-8'))
site=load('config/site-release.json')
source=load('data/tournaments/registry.json')
registry=load('data/tournaments/platform/registry.json')
bundle=load('data/tournaments/platform/events/2026-san-diego-county-cup.json')
placements=load('data/tournaments/archive/2026-san-diego-county-cup.json')
hub=load('data/tournaments/public-hub.json')
if site.get('version') not in {'7.54.8','7.54.9','7.54.10','7.54.11','7.54.12'}: errors.append('site version must preserve the 7.54.8 San Diego release')
if site.get('sanDiegoCountyCupPlatformRelease')!='7.54.8': errors.append('San Diego County Cup release metadata missing')
expected={'divisionCount':10,'gameCount':710,'finalGameCount':708,'scheduledGameCount':2,'teamCount':266,'placementCount':174,'venueCount':29,'dateCount':3}
for key,value in expected.items():
 if bundle.get('summary',{}).get(key)!=value: errors.append(f'{key} expected {value}, found {bundle.get("summary",{}).get(key)}')
if bundle.get('event',{}).get('startDate')!='2026-05-01' or bundle.get('event',{}).get('endDate')!='2026-05-03': errors.append('event dates are incorrect')
if bundle.get('event',{}).get('rankingEvidenceEnabled') is not False: errors.append('San Diego County Cup must remain ranking-quarantined')
if not str(bundle.get('event',{}).get('officialSourceUrl','')).startswith('https://script.google.com/'): errors.append('official source link is missing')
expected_divisions={'10u-boys':47,'12u-boys-division-2':98,'12u-boys-division-1':98,'12u-girls-division-2':47,'12u-girls-division-1':38,'14u-girls-division-2':72,'14u-girls-division-1':70,'14u-boys-division-3':40,'14u-boys-division-2':98,'14u-boys-division-1':102}
actual={row.get('id'):row.get('gameCount') for row in bundle.get('divisions',[])}
if actual!=expected_divisions: errors.append(f'division/game coverage mismatch: {actual}')
if any('10u-girls' in key or '10u-coed' in key for key in actual): errors.append('excluded 10U Girls/Coed divisions were published')
placement_counts={key:len(rows) for key,rows in bundle.get('placements',{}).items()}
expected_placements={'10u-boys':16,'12u-boys-division-2':16,'12u-boys-division-1':14,'12u-girls-division-2':18,'12u-girls-division-1':12,'14u-girls-division-2':18,'14u-girls-division-1':24,'14u-boys-division-3':16,'14u-boys-division-2':16,'14u-boys-division-1':24}
if placement_counts!=expected_placements: errors.append(f'verified placement coverage mismatch: {placement_counts}')
if placements.get('policy',{}).get('publishOnlyVerifiedPlacements') is not True or placements.get('policy',{}).get('unplacedTeamsShowRecordOnly') is not True: errors.append('verified-placement-only policy missing')
notes={row.get('divisionId'):(row.get('duplicateGameNumbers'),row.get('missingGameNumbers')) for row in placements.get('sourceNumberingNotes',[])}
for did in ['12u-boys-division-1','12u-boys-division-2']:
 if notes.get(did)!=([24],[72]): errors.append(f'{did} source numbering note is not preserved')
ids=[game.get('id') for game in bundle.get('games',[])]
if len(ids)!=len(set(ids)): errors.append('internal game IDs are not unique')
for did in ['12u-boys-division-1','12u-boys-division-2']:
 rows=[g for g in bundle.get('games',[]) if g.get('divisionId')==did and g.get('gameNumber')==24]
 if len(rows)!=2 or len({g.get('id') for g in rows})!=2: errors.append(f'{did} duplicate source game 24 was not safely preserved')
unscored={(g.get('divisionId'),g.get('gameNumber'),g.get('stage')) for g in bundle.get('games',[]) if g.get('status')!='final'}
if unscored!={('10u-boys',46,'15th place game'),('12u-boys-division-1',80,'11th place game')}: errors.append(f'unscored source rows changed: {sorted(unscored)}')
places_10={row.get('place') for row in bundle.get('placements',{}).get('10u-boys',[])}
places_12={row.get('place') for row in bundle.get('placements',{}).get('12u-boys-division-1',[])}
if 15 in places_10 or 16 in places_10: errors.append('missing 10U 15th-place score produced an inferred placement')
if 11 in places_12 or 12 in places_12: errors.append('missing 12U Boys D1 11th-place score produced an inferred placement')
game_map={g.get('id'):g for g in bundle.get('games',[])}
for team in bundle.get('teams',[]):
 divs={game_map[g].get('divisionId') for g in team.get('gameIds',[]) if g in game_map}
 if len(divs)!=1: errors.append(f'team journey crosses divisions: {team.get("name")} {sorted(divs)}')
if sum(team.get('logo')!='assets/logos/cpi-logo-fallback.svg' for team in bundle.get('teams',[]))<220: errors.append('verified WPI logo coverage is unexpectedly low')
route=re.compile(r'(?:^|\s)(?:W|L)#|^(?:1st|2nd|3rd|4th)[A-Z]?\(',re.I)
if any(route.search(team.get('name','')) for team in bundle.get('teams',[])): errors.append('bracket routing leaked into team names')
source_event=next((e for e in source.get('events',[]) if e.get('id')=='2026-san-diego-county-cup'),None)
if not source_event or source_event.get('platformEnabled') is not True or len(source_event.get('divisions',[]))!=10: errors.append('source registry does not register all ten divisions')
platform_event=next((e for e in registry.get('events',[]) if e.get('id')=='2026-san-diego-county-cup'),None)
if not platform_event or platform_event.get('migrationStatus')!='platform_live': errors.append('platform registry does not expose San Diego County Cup')
hub_event=next((e for e in hub.get('events',[]) if e.get('id')=='2026-san-diego-county-cup'),None)
if not hub_event or hub_event.get('year')!=2026 or hub_event.get('seasonOrder')!=10 or hub_event.get('mode')!='platform': errors.append('public archive registration is incorrect')
ids_2026=[e.get('id') for e in hub.get('events',[]) if e.get('year')==2026]
if not ids_2026 or ids_2026[:2]!=['2026-kap7-international','2026-san-diego-county-cup'] or ids_2026[-1]!='2026-junior-olympics': errors.append(f'2026 water polo season order is incorrect: {ids_2026}')
js=(ROOT/'js/tournament-platform-v7-54-0.js').read_text(encoding='utf-8')
for token in ['const RELEASE = "7.54.11"','Score unavailable','data-team']:
 if token not in js: errors.append(f'platform UI missing {token}')
if len(load('rankings.json'))!=724: errors.append('rankings count changed')
if len(load('clubs.json'))!=182: errors.append('club count changed')
if load('data/tournaments/jo-results-2026.json').get('summary',{}).get('teamPlacements')!=976: errors.append('JO placement count changed')
if errors:
 print('SAN DIEGO COUNTY CUP 7.54.8 TEST FAILED')
 for error in errors: print(' -',error)
 sys.exit(1)
print('SAN DIEGO COUNTY CUP 7.54.8 TEST PASSED')
print(' - 10 divisions, 710 games, 266 independent team journeys, and 174 verified placements')
print(' - 708 scored finals and two explicitly unscored historical games are preserved without inferred finishes')
print(' - 10U Girls/Coed remain excluded; 225 team entries use verified WPI club artwork')
