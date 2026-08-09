#!/usr/bin/env python3
from pathlib import Path
import json,re,sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]
def load(rel): return json.loads((ROOT/rel).read_text(encoding='utf-8'))
site=load('config/site-release.json')
source=load('data/tournaments/registry.json')
registry=load('data/tournaments/platform/registry.json')
bundle=load('data/tournaments/platform/events/2026-kap7-international.json')
placements=load('data/tournaments/archive/2026-kap7-international.json')
hub=load('data/tournaments/public-hub.json')
if site.get('version') not in {'7.54.11','7.54.12','7.54.13','7.54.14','7.54.15','7.54.17','7.54.18','7.55.0','7.55.1','7.55.2','7.55.4','7.55.5','7.55.6','7.55.7','7.55.8','7.55.9','7.56.0','7.56.1','7.56.2', '7.56.3', '7.56.4', '7.56.7','7.56.8','7.56.9','7.56.11','7.56.12','7.56.13','7.56.14','7.56.15','7.57.0','7.57.1','7.57.2','7.57.3','7.57.4','7.57.5','7.57.6','7.57.7','7.57.8','7.57.9','7.57.10'}: errors.append('site version must be 7.54.11')
if site.get('kap7InternationalPlatformRelease')!='7.54.10': errors.append('KAP7 release metadata missing')
expected={'divisionCount':18,'gameCount':579,'finalGameCount':578,'scheduledGameCount':1,'teamCount':280,'placementCount':136,'venueCount':25,'dateCount':2}
for key,value in expected.items():
 if bundle.get('summary',{}).get(key)!=value: errors.append(f'{key} expected {value}, found {bundle.get("summary",{}).get(key)}')
if bundle.get('event',{}).get('startDate')!='2026-01-31' or bundle.get('event',{}).get('endDate')!='2026-02-01': errors.append('event dates are incorrect')
if bundle.get('event',{}).get('rankingEvidenceEnabled') is not False: errors.append('KAP7 must remain ranking-quarantined')
expected_divisions={'10u-coed-gold':32,'10u-coed-platinum':16,'10u-boys':16,'12u-girls-platinum':24,'12u-boys-gold':50,'12u-boys-platinum':21,'12u-coed':15,'14u-girls-gold':28,'14u-girls-platinum':21,'14u-boys-silver':38,'14u-boys-gold':54,'14u-boys-platinum':43,'16u-boys-silver':43,'16u-boys-gold':40,'16u-boys-platinum':38,'19u-boys-silver':12,'19u-boys-gold':32,'19u-boys-platinum':56}
actual={row.get('id'):row.get('gameCount') for row in bundle.get('divisions',[])}
if actual!=expected_divisions: errors.append(f'division/game coverage mismatch: {actual}')
placement_counts={key:len(rows) for key,rows in bundle.get('placements',{}).items()}
expected_placements={'10u-boys':8,'10u-coed-gold':12,'10u-coed-platinum':8,'12u-boys-gold':24,'12u-boys-platinum':6,'12u-coed':4,'12u-girls-platinum':12,'14u-boys-gold':4,'14u-boys-platinum':6,'14u-boys-silver':4,'14u-girls-gold':8,'14u-girls-platinum':6,'16u-boys-gold':4,'16u-boys-platinum':4,'16u-boys-silver':6,'19u-boys-gold':16,'19u-boys-platinum':4}
if placement_counts!=expected_placements: errors.append(f'verified placement coverage mismatch: {placement_counts}')
policy=placements.get('policy',{})
if policy.get('publishOnlyVerifiedPlacements') is not True or policy.get('unplacedTeamsShowRecordOnly') is not True or policy.get('officialTiesPreserved') is not True: errors.append('verified-placement policy missing')
notes=placements.get('sourceReviewNotes',{})
if len(notes.get('partialScoreRows',[]))!=1: errors.append('single partial-score source note missing')
partial=[g for g in bundle.get('games',[]) if g.get('status')!='final']
if len(partial)!=1 or str(partial[0].get('gameNumber')).upper()!='10CAU32' or partial[0].get('divisionId')!='10u-coed-gold': errors.append(f'partial score game changed: {[(g.get("divisionId"),g.get("gameNumber")) for g in partial]}')
if bundle.get('placements',{}).get('19u-boys-silver'): errors.append('19U Boys Silver should remain record-only')
tied=[p for p in bundle.get('placements',{}).get('12u-boys-gold',[]) if str(p.get('placeLabel','')).startswith('T-')]
if len(tied)!=20: errors.append(f'official tied placements expected 20, found {len(tied)}')
subdivisions={(p.get('subdivision'),p.get('placeLabel')) for p in bundle.get('placements',{}).get('10u-coed-gold',[])}
for label in [('Coed','Coed 1st'),('Girls','Girls 1st')]:
 if label not in subdivisions: errors.append(f'10U Coed/Gold subdivision placement missing: {label}')
ids=[game.get('id') for game in bundle.get('games',[])]
if len(ids)!=len(set(ids)): errors.append('internal game IDs are not unique')
game_map={g.get('id'):g for g in bundle.get('games',[])}
for team in bundle.get('teams',[]):
 divs={game_map[g].get('divisionId') for g in team.get('gameIds',[]) if g in game_map}
 if len(divs)!=1: errors.append(f'team journey crosses divisions: {team.get("name")} {sorted(divs)}')
if sum(team.get('logo')!='assets/logos/cpi-logo-fallback.svg' for team in bundle.get('teams',[]))<250: errors.append('verified WPI logo coverage is unexpectedly low')
route=re.compile(r'(?:^|\s)(?:W|L)#|^(?:1st|2nd|3rd|4th)[A-Z]?\(',re.I)
if any(route.search(team.get('name','')) for team in bundle.get('teams',[])): errors.append('bracket routing leaked into team names')
source_event=next((e for e in source.get('events',[]) if e.get('id')=='2026-kap7-international'),None)
if not source_event or source_event.get('platformEnabled') is not True or len(source_event.get('divisions',[]))!=18: errors.append('source registry does not register all eighteen divisions')
platform_event=next((e for e in registry.get('events',[]) if e.get('id')=='2026-kap7-international'),None)
if not platform_event or platform_event.get('migrationStatus')!='platform_live': errors.append('platform registry does not expose KAP7 International')
hub_event=next((e for e in hub.get('events',[]) if e.get('id')=='2026-kap7-international'),None)
if not hub_event or hub_event.get('eventYear')!=2026 or hub_event.get('competitiveSeason')!='2025-2026' or hub_event.get('seasonOrder')!=20 or hub_event.get('mode')!='platform': errors.append('public archive registration is incorrect')
ids_season=[e.get('id') for e in hub.get('events',[]) if e.get('competitiveSeason')=='2025-2026']
if not ids_season or ids_season[:2]!=['2025-evan-cousineau-memorial-cup','2026-kap7-international'] or ids_season[-1]!='2026-junior-olympics': errors.append(f'2025–2026 water polo season order is incorrect: {ids_season}')
js=(ROOT/'js/tournament-platform-v7-54-0.js').read_text(encoding='utf-8')
for token in ['const RELEASE = "7.54.17"','Score unavailable','data-team']:
 if token not in js: errors.append(f'platform UI missing {token}')
if len(load('rankings.json'))!=724: errors.append('rankings count changed')
if len(load('clubs.json'))!=182: errors.append('club count changed')
if load('data/tournaments/jo-results-2026.json').get('summary',{}).get('teamPlacements')!=976: errors.append('JO placement count changed')
if errors:
 print('KAP7 INTERNATIONAL 7.54.9 TEST FAILED')
 for error in errors: print(' -',error)
 sys.exit(1)
print('KAP7 INTERNATIONAL 7.54.9 TEST PASSED')
print(' - 18 divisions, 579 games, 280 independent team journeys, and 136 verified placements')
print(' - 578 scored finals plus one explicitly partial historical game are preserved without an inferred finish')
print(' - official ties and the unambiguous 10U Girls round robin are published; all other unclear finishes remain record-only')
