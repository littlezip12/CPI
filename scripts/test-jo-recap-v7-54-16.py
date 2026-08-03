#!/usr/bin/env python3
from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]
load=lambda rel: json.loads((ROOT/rel).read_text(encoding='utf-8'))
site=load('config/site-release.json'); recap=load('data/tournaments/jo-recap-2026.json'); s3=load('data/tournaments/platform/events/2026-jo-session-3.json'); archive=load('data/tournaments/archive/2026-jo-session-3.json'); hub=load('data/tournaments/public-hub.json')
if site.get('version')!='7.54.16': errors.append('site version must be 7.54.16')
if site.get('joRecapRelease')!='7.54.16': errors.append('joRecapRelease must be 7.54.16')
expected={'weekends':3,'divisions':31,'verifiedPlacements':1093,'completeDivisions':30,'sourceIncompleteDivisions':1,'weekend3FinalGames':464,'weekend3ScheduledWithoutScores':81}
for k,v in expected.items():
    if recap.get('summary',{}).get(k)!=v: errors.append(f'recap {k} expected {v}, found {recap.get("summary",{}).get(k)}')
weekends=recap.get('weekends',[])
if [w.get('label') for w in weekends]!=['Weekend 1','Weekend 2','Weekend 3']: errors.append('recap weekend order is incorrect')
if [w.get('verifiedPlacements') for w in weekends]!=[445,531,117]: errors.append('recap placement totals are incorrect')
if [len(w.get('champions',[])) for w in weekends]!=[11,12,7]: errors.append('recap champion totals are incorrect')
if not weekends[2].get('sourceGap') or '12U Coed' not in recap.get('sourceNotice',''): errors.append('12U Coed source gap is not clearly disclosed')
if s3.get('summary',{})!={**s3.get('summary',{}),}: pass
for k,v in {'divisionCount':8,'gameCount':545,'finalGameCount':464,'scheduledGameCount':81,'teamCount':138,'placementCount':117}.items():
    if s3.get('summary',{}).get(k)!=v: errors.append(f'Session 3 {k} expected {v}')
if len(archive.get('groups',[]))!=8: errors.append('Session 3 archive must contain eight divisions')
if sum(len(g.get('placements',[])) for g in archive.get('groups',[]))!=117: errors.append('Session 3 archive must contain 117 placements')
missing=[g for g in archive.get('groups',[]) if g.get('status')=='source_incomplete']
if len(missing)!=1 or missing[0].get('id')!='12u-coed-championship': errors.append('only 12U Coed may remain source incomplete')
page=(ROOT/'jo-recap.html').read_text(encoding='utf-8'); js=(ROOT/'js/jo-recap-v7-54-16.js').read_text(encoding='utf-8')
for token in ['Three weekends. One Junior Olympics recap.','id="joWeekendGrid"','id="joChampionGroups"','js/jo-recap-v7-54-16.js?v=7.54.16']:
    if token not in page: errors.append(f'JO recap page missing {token}')
for token in ['jo-recap-2026.json?v=7.54.16','verifiedPlacements','sourceGap']:
    if token not in js: errors.append(f'JO recap runtime missing {token}')
next_event=hub.get('nextTournament',{})
if next_event.get('name')!='Evan Cousineau Memorial Cup' or next_event.get('dateLabel')!='October 3–4, 2026': errors.append('Evan Cousineau is not configured as the next tournament')
if next_event.get('publicPath') is not None: errors.append('Evan Cousineau must remain unlinked until its official schedule is available')
if not any(e.get('id')=='2026-jo-session-3' and e.get('publicPath')=='tournament.html?event=2026-jo-session-3' for e in hub.get('events',[])): errors.append('Session 3 is missing from the public archive')
if not any(e.get('id')=='2026-junior-olympics' and e.get('publicPath')=='jo-recap.html' for e in hub.get('events',[])): errors.append('JO aggregate event does not link to the recap')
if len(load('rankings.json'))!=724: errors.append('rankings count changed')
if errors:
 print('JO RECAP 7.54.16 TEST FAILED')
 for e in errors: print(' -',e)
 sys.exit(1)
print('JO RECAP 7.54.16 TEST PASSED')
print(' - Three weekends, 31 divisions, and 1,093 verified placements are summarized')
print(' - Weekend 3 has 117 placements and 464 finals across seven complete divisions')
print(' - 12U Coed remains explicitly unscored and no result is inferred')
print(' - Evan Cousineau is announced next without a premature schedule link')
