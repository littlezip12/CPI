#!/usr/bin/env python3
from pathlib import Path
import json,re,sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]
def load(rel): return json.loads((ROOT/rel).read_text(encoding='utf-8'))
site=load('config/site-release.json')
source=load('data/tournaments/registry.json')
registry=load('data/tournaments/platform/registry.json')
bundle=load('data/tournaments/platform/events/2026-girls-futures-super-finals.json')
placements=load('data/tournaments/archive/2026-girls-futures-super-finals.json')
hub=load('data/tournaments/public-hub.json')
if site.get('version') not in {'7.54.11','7.54.12','7.54.13','7.54.14','7.54.15','7.54.17','7.54.18','7.55.0','7.55.1','7.55.2','7.55.4','7.55.5','7.55.6','7.55.7','7.55.8','7.55.9','7.56.0','7.56.1','7.56.2', '7.56.3', '7.56.4', '7.56.7','7.56.8','7.56.9','7.56.11','7.56.12','7.56.13','7.56.14','7.56.15','7.57.0','7.57.1','7.57.2','7.57.3','7.57.4','7.57.5','7.57.6','7.57.7','7.57.8','7.57.9','7.57.10','7.57.11','7.57.12','7.57.13','7.57.14','7.57.15','7.57.16','7.57.17','7.57.18', '7.57.19','7.57.20','7.57.21','7.57.22','7.58.0','7.58.1','7.58.2','7.58.3','7.58.4','7.58.5','7.58.6','7.58.7','7.58.8','7.58.9','7.58.10','7.59.0','7.60.0','7.60.1','7.60.2','7.60.3','7.61.0','7.61.1','7.62.0','7.62.1','7.62.2','7.62.3','7.62.4','7.62.5','7.62.6','7.63.0','7.63.1','7.63.2'}: errors.append('site version must be 7.54.11')
if site.get('girlsFuturesPlatformRelease')!='7.54.11': errors.append('Girls Futures release metadata missing')
expected={'divisionCount':8,'gameCount':374,'finalGameCount':374,'scheduledGameCount':0,'teamCount':139,'placementCount':132,'venueCount':16,'dateCount':3}
for key,value in expected.items():
 if bundle.get('summary',{}).get(key)!=value: errors.append(f'{key} expected {value}, found {bundle.get("summary",{}).get(key)}')
if bundle.get('event',{}).get('startDate')!='2026-06-19' or bundle.get('event',{}).get('endDate')!='2026-06-21': errors.append('event dates are incorrect')
if bundle.get('event',{}).get('rankingEvidenceEnabled') is not False: errors.append('Girls Futures must remain ranking-quarantined')
expected_divisions={'12u-girls-d1':34,'12u-girls-d2':27,'14u-girls-d1':51,'14u-girls-d2':39,'16u-girls-d1':64,'16u-girls-d2':50,'18u-girls-d1':64,'18u-girls-d2':45}
actual={row.get('id'):row.get('gameCount') for row in bundle.get('divisions',[])}
if actual!=expected_divisions: errors.append(f'division/game coverage mismatch: {actual}')
placement_counts={key:len(rows) for key,rows in bundle.get('placements',{}).items()}
expected_placements={'12u-girls-d1':12,'12u-girls-d2':10,'14u-girls-d1':14,'14u-girls-d2':14,'16u-girls-d1':24,'16u-girls-d2':20,'18u-girls-d1':20,'18u-girls-d2':18}
if placement_counts!=expected_placements: errors.append(f'verified placement coverage mismatch: {placement_counts}')
policy=placements.get('policy',{})
if policy.get('publishOnlyVerifiedPlacements') is not True or policy.get('unplacedTeamsShowRecordOnly') is not True: errors.append('verified-placement policy missing')
notes=placements.get('sourceReviewNotes',{})
corrections=notes.get('formulaCorrections',[])
if not any(row.get('gameNumber')=='14GD201' and row.get('corrected')=='19-Jun' for row in corrections): errors.append('14GD201 source formula correction is undocumented')
rr=notes.get('roundRobinReview',[])
if not any(row.get('divisionId')=='18u-girls-d1' and row.get('range')=='17-20' and row.get('status')=='record_only_tied_round_robin' for row in rr): errors.append('18U D1 tied 17-20 round robin must remain record-only')
game=next((g for g in bundle.get('games',[]) if str(g.get('gameNumber')).upper()=='14GD201'),None)
if not game or game.get('dateIso')!='2026-06-19' or game.get('scores',{}).get('white')!=16 or game.get('scores',{}).get('dark')!=1: errors.append('14GD201 correction/result is incorrect')
formula=re.compile(r'IF\(|CONCAT\(|#VALUE!',re.I)
for game in bundle.get('games',[]):
 for value in [game.get('dateLabel'),game.get('dateIso'),game.get('stage'),game.get('white',{}).get('name'),game.get('dark',{}).get('name')]:
  if formula.search(str(value or '')): errors.append(f'formula text leaked into game {game.get("gameNumber")}'); break
ids=[game.get('id') for game in bundle.get('games',[])]
if len(ids)!=len(set(ids)): errors.append('internal game IDs are not unique')
game_map={g.get('id'):g for g in bundle.get('games',[])}
for team in bundle.get('teams',[]):
 divs={game_map[g].get('divisionId') for g in team.get('gameIds',[]) if g in game_map}
 if len(divs)!=1: errors.append(f'team journey crosses divisions: {team.get("name")} {sorted(divs)}')
names=[str(team.get('name') or '').upper() for team in bundle.get('teams',[])]
if any('RANCO TSUNAMI' in name for name in names): errors.append('RANCO TSUNAMI typo remains')
if any(re.search(r'VIPER PIGEON(?!S)',name) for name in names): errors.append('Viper Pigeon journey was not consolidated')
if sum(name=='SANTA BARBARA A' for name in names)!=1: errors.append('18U D1 Santa Barbara A journey was not consolidated')
if 'THUNDER' not in names: errors.append('source-faithful THUNDER entry is missing')
route=re.compile(r'(?:^|\s)(?:W|L)#|^(?:1st|2nd|3rd|4th)[A-Z]?(?:\(|-)',re.I)
if any(route.search(team.get('name','')) for team in bundle.get('teams',[])): errors.append('bracket routing leaked into team names')
source_event=next((e for e in source.get('events',[]) if e.get('id')=='2026-girls-futures-super-finals'),None)
if not source_event or source_event.get('platformEnabled') is not True or len(source_event.get('divisions',[]))!=8: errors.append('source registry does not register all eight Girls Futures divisions')
platform_event=next((e for e in registry.get('events',[]) if e.get('id')=='2026-girls-futures-super-finals'),None)
if not platform_event or platform_event.get('migrationStatus')!='platform_live': errors.append('platform registry does not expose Girls Futures Super Finals')
hub_event=next((e for e in hub.get('events',[]) if e.get('id')=='2026-girls-futures-super-finals'),None)
if not hub_event or hub_event.get('eventYear')!=2026 or hub_event.get('competitiveSeason')!='2025-2026' or hub_event.get('mode')!='platform': errors.append('public archive registration is incorrect')
ids_season=[e.get('id') for e in hub.get('events',[]) if e.get('competitiveSeason')=='2025-2026']
if '2026-girls-futures-super-finals' in ids_season and '2026-boys-futures-super-finals' in ids_season:
 if ids_season.index('2026-girls-futures-super-finals')>ids_season.index('2026-boys-futures-super-finals'): errors.append(f'Girls Futures must precede Boys Futures in season order: {ids_season}')
if ids_season and ids_season[-1]!='2026-junior-olympics': errors.append(f'Junior Olympics must remain last in the 2025–2026 water polo archive: {ids_season}')
js=(ROOT/'js/tournament-platform-v7-54-0.js').read_text(encoding='utf-8')
for token in ['const RELEASE = "7.54.17"','Score unavailable','data-team']:
 if token not in js: errors.append(f'platform UI missing {token}')
if len(load('rankings.json'))!=724: errors.append('rankings count changed')
if len(load('clubs.json'))!=182: errors.append('club count changed')
if load('data/tournaments/jo-results-2026.json').get('summary',{}).get('teamPlacements')!=976: errors.append('JO placement count changed')
kap7=load('data/tournaments/platform/events/2026-kap7-international.json')
if kap7.get('summary',{}).get('gameCount')!=579 or kap7.get('summary',{}).get('teamCount')!=280 or kap7.get('summary',{}).get('placementCount')!=136: errors.append('KAP7 archive changed')
if errors:
 print('GIRLS FUTURES SUPER FINALS 7.54.11 TEST FAILED')
 for error in errors: print(' -',error)
 sys.exit(1)
print('GIRLS FUTURES SUPER FINALS 7.54.11 TEST PASSED')
print(' - 8 divisions, 374 scored games, 139 clean platform team journeys, and 132 verified placements')
print(' - the exported date formula and three journey-splitting source aliases are corrected')
print(' - incomplete or tied placement ranges remain record-only; rankings are unchanged')
