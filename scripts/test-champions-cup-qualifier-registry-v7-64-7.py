#!/usr/bin/env python3
from pathlib import Path
import json, sys
ROOT=Path(__file__).resolve().parents[1]
def req(cond,msg):
    if not cond:
        print('WPI CHAMPIONS CUP QUALIFIER REGISTRY 7.64.7 TEST FAILED\n - '+msg)
        sys.exit(1)
load=lambda rel: json.loads((ROOT/rel).read_text(encoding='utf-8'))
site=load('config/site-release.json'); data=load('data/tournaments/2026-champions-cup-qualifiers.json'); hub=load('data/tournaments/public-hub.json'); seasons=load('data/tournaments/seasons.json')
html=(ROOT/'champions-cup-qualifiers.html').read_text(encoding='utf-8'); js=(ROOT/'js/champions-cup-qualifiers-v7-64-7.js').read_text(encoding='utf-8'); css=(ROOT/'css/champions-cup-qualifiers-v7-64-7.css').read_text(encoding='utf-8'); version=(ROOT/'VERSION.md').read_text(encoding='utf-8')
req(site.get('version') in {'7.64.7','7.64.8','7.64.9','7.64.10'},'site release must preserve 7.64.7 or later')
req(site.get('championsCupQualifierRegistryRelease')=='7.64.7','qualifier registry release marker missing')
req('WPI 7.64.7' in version,'VERSION missing 7.64.7')
req(data.get('release')=='7.64.7','qualifier data release mismatch')
zones=data.get('zones') or []
expected={'Central California','Coastal California','Hawaii','Midwest','Mountain','Northeast','Pacific','Pacific Northwest','Pacific Southwest','Southeast','Southern Pacific','Southwest'}
req(len(zones)==12,'qualifier registry must contain exactly 12 USAWP zones')
req({z.get('name') for z in zones}==expected,'zone names do not match current 12-zone Champions Cup structure')
confirmed=[z for z in zones if z.get('qualifier',{}).get('status')=='confirmed_date']
req(len(confirmed)==1 and confirmed[0].get('id')=='pacific','only Pacific may be date-confirmed in the current source set')
pacific=confirmed[0]; q=pacific['qualifier']
req(q.get('dateStart')=='2026-09-27' and q.get('dateEnd')=='2026-09-27','Pacific qualifier must be September 27, 2026')
req(q.get('venue') is None and q.get('scheduleStatus')=='not_published','Pacific venue/schedule must remain unpublished')
tracked=pacific.get('trackedTeams') or []
req(len(tracked)==1 and tracked[0].get('name')=='Lamorinda A 14U Boys','Lamorinda A 14U Boys must be the tracked Pacific team')
req(tracked[0].get('wpiTeamId')=='ef1b5ca5-0841-4626-9491-ea44bea1dc6f','Lamorinda active WPI Live UUID mismatch')
req(tracked[0].get('liveSeriesId')=='cd2016ce-d691-408e-aa10-3e7f1472e250','Lamorinda Champions Cup series UUID mismatch')
req(all(not z.get('games') for z in zones),'no qualifier games may be fabricated before schedules/results exist')
req(data['event']['qualificationWindow']=={'start':'2026-09-10','end':'2026-10-18','label':'September 10–October 18, 2026','policy':'if_needed'},'USAWP qualifier window/policy mismatch')
req(data['event']['championshipDates']['start']=='2026-11-06' and data['event']['championshipDates']['end']=='2026-11-08','Champions Cup dates mismatch')
req(data['event']['allocationStatus']=='not_published' and data['event']['scheduleStatus']=='coming_soon','unpublished national allocations/schedule must remain explicit')
next_event=hub.get('nextTournament',{})
req(next_event.get('name')=='2026 Champions Cup Pacific Zone Qualifier' and next_event.get('dateLabel')=='September 27, 2026','public hub must surface Pacific qualifier as next verified event')
req(next_event.get('publicPath')=='champions-cup-qualifiers.html#pacific','public hub must link to Pacific tracker anchor')
active=next(s for s in seasons['seasons'] if s['id']=='2026-2027')
req(active.get('startDate')=='2026-09-27' and active.get('openingEventId')=='2026-champions-cup-pacific-zone-qualifier','2026–2027 season must open with verified Pacific qualifier')
for token in ['Champions Cup Qualifier Tracker','Pacific Zone / Lamorinda','Verified-data rule','id="zoneGrid"','id="recordGrid"','config/live-sandbox.js?v=7.57.20','js/live-backend-v7-56-8.js?v=7.57.20','js/champions-cup-qualifiers-v7-64-7.js?v=7.64.7']:
    req(token in html,f'qualifier page missing {token}')
for token in ['recordFor','confirmed_date','0–0–0','DATA_PATH','enrichFromPublicWpiLive','live_public_tournament_v2','state.liveRecords']:
    req(token in js,f'qualifier runtime missing {token}')
for token in ['.ccq-zone-grid','.ccq-record-stats','.ccq-status.confirmed']:
    req(token in css,f'qualifier stylesheet missing {token}')
print('WPI CHAMPIONS CUP QUALIFIER REGISTRY 7.64.7 TEST PASSED')
print(' - 12 USAWP zones are represented without inventing qualifiers')
print(' - Pacific is the only currently confirmed qualifier date: September 27, 2026')
print(' - Lamorinda A 14U Boys is connected to the existing WPI Live series with zero fabricated games')
print(' - 2026–2027 now opens with the verified Pacific qualifier before Evan Cousineau')
