#!/usr/bin/env python3
from pathlib import Path
import json,re,sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]
site=json.loads((ROOT/'config/site-release.json').read_text())
if site.get('version') not in {'7.54.3','7.54.4','7.54.5','7.54.6'}: errors.append('site version must preserve 7.54.3 integrity controls')
if site.get('tournamentDataIntegrityRelease')!='7.54.3': errors.append('tournamentDataIntegrityRelease must be 7.54.3')
page=(ROOT/'tournaments/girls-club-championships/index.html').read_text()
for token in ['Data review in progress','Withheld for accuracy','0 verified placements','WIN #4 - MERIDIAN','official sheet']:
    if token not in page: errors.append(f'data-review page missing {token}')
for forbidden in ['results-app.js','id="teamFilter"','Live results loaded','Team results']:
    if forbidden in page: errors.append(f'legacy misleading viewer token remains: {forbidden}')
hub=(ROOT/'tournaments.html').read_text()
for token in ['Data review','Accuracy hold','Open data-review status','WIN #4 - MERIDIAN']:
    if token in hub: errors.append(f'tournament hub publicly exposes internal review token: {token}')
reg=json.loads((ROOT/'data/tournaments/registry.json').read_text())
event=next(e for e in reg['events'] if e['id']=='2026-girls-us-club-championships')
if event.get('eventStatus')!='data_review': errors.append('Girls Club event must be data_review')
if event.get('platformEnabled') is not False: errors.append('Girls Club platform must remain disabled')
if event.get('archiveSyncEnabled') is not True: errors.append('Girls Club banked archive must remain preserved during public review')
if event.get('archivePolicy')!='banked_quarantined': errors.append('Girls Club archive must be banked but quarantined from publication')
audit=json.loads((ROOT/'data/tournaments/girls-club-championships-audit.json').read_text())
if audit['counts']['bankedFinalGames']!=46: errors.append('expected 46 banked finals in audit')
if audit['counts']['verifiedPlacements']!=0: errors.append('expected zero verified placements in audit')
if audit['counts']['routingLabelsDetected']<1: errors.append('route-label corruption must be documented')
# migrated platform bundles must not publish route placeholders as team names
route=re.compile(r'^(?:WIN|LOS|W\s*#|L\s*#|Winner|Loser)\s*#?\d*\s*[-–:]',re.I)
for rel in ['data/tournaments/platform/events/2026-quiksilver-cup.json','data/tournaments/platform/events/2026-boys-futures-super-finals.json']:
    data=json.loads((ROOT/rel).read_text())
    for team in data.get('teams',[]):
        if route.search(str(team.get('name',''))): errors.append(f'{rel} publishes route label as team: {team.get("name")}')
    if data.get('event',{}).get('status')=='complete' and data.get('summary',{}).get('placementCount',0)<=0:
        errors.append(f'{rel} is complete but has no verified placements')
if errors:
    print('TOURNAMENT DATA INTEGRITY 7.54.4 TEST FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('TOURNAMENT DATA INTEGRITY 7.54.4 TEST PASSED')
print(' - Girls US Club Championships is withheld publicly while its banked historical archive remains preserved')
print(' - Boys Futures and Quiksilver contain no winner/loser routing labels as team identities')
print(' - Complete platform events must retain verified placements')
