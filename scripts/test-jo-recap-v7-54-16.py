#!/usr/bin/env python3
from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]
load=lambda rel: json.loads((ROOT/rel).read_text(encoding='utf-8'))
site=load('config/site-release.json'); recap=load('data/tournaments/jo-recap-2026.json'); s3=load('data/tournaments/platform/events/2026-jo-session-3.json'); archive=load('data/tournaments/archive/2026-jo-session-3.json'); hub=load('data/tournaments/public-hub.json')
if site.get('version') not in {'7.54.17','7.54.18','7.55.0','7.55.1','7.55.2','7.55.4','7.55.5','7.55.6','7.55.7','7.55.8','7.55.9','7.56.0','7.56.1','7.56.2', '7.56.3', '7.56.4', '7.56.7','7.56.8','7.56.9','7.56.11','7.56.12','7.56.13','7.56.14','7.56.15','7.57.0','7.57.1','7.57.2','7.57.3','7.57.4','7.57.5','7.57.6','7.57.7','7.57.8','7.57.9','7.57.10','7.57.11','7.57.12','7.57.13','7.57.14','7.57.15','7.57.16','7.57.17','7.57.18', '7.57.19','7.57.20','7.57.21','7.57.22','7.58.0','7.58.1','7.58.2','7.58.3','7.58.4','7.58.5','7.58.6','7.58.7','7.58.8','7.58.9','7.58.10','7.59.0','7.60.0','7.60.1','7.60.2','7.60.3'}: errors.append('site version must preserve 7.54.17 or later')
if site.get('joRecapRelease')!='7.54.17': errors.append('joRecapRelease must be 7.54.17')
expected={'weekends':3,'divisions':31,'verifiedPlacements':1114,'completeDivisions':31,'scoreCompleteDivisions':30,'sourceIncompleteDivisions':1,'weekend3FinalGames':464,'weekend3ScheduledWithoutScores':81}
for k,v in expected.items():
    if recap.get('summary',{}).get(k)!=v: errors.append(f'recap {k} expected {v}, found {recap.get("summary",{}).get(k)}')
weekends=recap.get('weekends',[])
if [w.get('label') for w in weekends]!=['Weekend 1','Weekend 2','Weekend 3']: errors.append('recap weekend order is incorrect')
if [w.get('verifiedPlacements') for w in weekends]!=[445,531,138]: errors.append('recap placement totals are incorrect')
if [len(w.get('champions',[])) for w in weekends]!=[11,12,8]: errors.append('recap champion totals are incorrect')
if not weekends[2].get('sourceGap') or 'final Platinum and Gold placements' not in recap.get('sourceNotice',''): errors.append('12U Coed placement/score distinction is not clearly disclosed')
for k,v in {'divisionCount':8,'gameCount':545,'finalGameCount':464,'scheduledGameCount':81,'teamCount':138,'placementCount':138}.items():
    if s3.get('summary',{}).get(k)!=v: errors.append(f'Session 3 {k} expected {v}, found {s3.get("summary",{}).get(k)}')
if len(archive.get('groups',[]))!=8: errors.append('Session 3 archive must contain eight divisions')
if sum(len(g.get('placements',[])) for g in archive.get('groups',[]))!=138: errors.append('Session 3 archive must contain 138 placements')
coed=next((g for g in archive.get('groups',[]) if g.get('id')=='12u-coed-championship'),{})
if coed.get('status')!='placement_complete_score_gap' or len(coed.get('placements',[]))!=21: errors.append('12U Coed must publish 21 placements while preserving its score gap')
if [(x.get('subdivision'),x.get('place'),x.get('name')) for x in coed.get('placements',[])[:2]] != [('Platinum',1,'HOUSTON HYDRA'),('Platinum',2,'VIPER PIGEON BLUE')]: errors.append('12U Coed Platinum ranking is incorrect')
b14=next((g for g in archive.get('groups',[]) if g.get('id')=='14u-boys-championship'),{})
if len(b14.get('placements',[]))!=26: errors.append('14U Boys must contain 26 flight placements')
gold14=[x for x in b14.get('placements',[]) if x.get('subdivision')=='Gold']
if [(x.get('place'),x.get('name')) for x in gold14[6:8]] != [(7,'PEAK POLO'),(8,'SLAP')]: errors.append('14U Boys Gold 7th/8th correction is missing')
if any(x.get('participantId') for x in s3.get('placements',{}).get('14u-boys-championship',[]) if x.get('subdivision')=='Gold' and x.get('name') in {'PEAK POLO','SLAP'}): errors.append('conflicting 14U Gold rows must not link to the Platinum team journeys')
page=(ROOT/'jo-recap.html').read_text(encoding='utf-8'); js=(ROOT/'js/jo-recap-v7-54-16.js').read_text(encoding='utf-8')
for token in ['Three weekends. One Junior Olympics recap.','id="joWeekendGrid"','id="joChampionGroups"','js/jo-recap-v7-54-16.js?v=7.54.17']:
    if token not in page: errors.append(f'JO recap page missing {token}')
for token in ['jo-recap-2026.json?v=7.54.17','verifiedPlacements','sourceGap']:
    if token not in js: errors.append(f'JO recap runtime missing {token}')
next_event=hub.get('nextTournament',{})
if next_event.get('name')!='Evan Cousineau Memorial Cup' or next_event.get('dateLabel')!='October 3–4, 2026': errors.append('Evan Cousineau is not configured as the next tournament')
if next_event.get('publicPath') is not None: errors.append('Evan Cousineau must remain unlinked until its official schedule is available')
if not any(e.get('id')=='2026-jo-session-3' and e.get('publicPath')=='tournament.html?event=2026-jo-session-3' for e in hub.get('events',[])): errors.append('Session 3 is missing from the public archive')
if not any(e.get('id')=='2026-junior-olympics' and e.get('publicPath')=='jo-recap.html' for e in hub.get('events',[])): errors.append('JO aggregate event does not link to the recap')
if len(load('rankings.json'))!=724: errors.append('rankings count changed')
if errors:
 print('JO RECAP 7.54.17 TEST FAILED')
 for e in errors: print(' -',e)
 sys.exit(1)
print('JO RECAP 7.54.17 TEST PASSED')
print(' - Three weekends, 31 divisions, and 1,114 verified placements are summarized')
print(' - Weekend 3 has 138 placements and 464 finals across eight placement-complete divisions')
print(' - 12U Coed publishes final flight placements while records remain unavailable')
print(' - 14U Boys Platinum and Gold rankings are preserved separately')
print(' - Evan Cousineau is announced next without a premature schedule link')
