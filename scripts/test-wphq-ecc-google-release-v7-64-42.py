#!/usr/bin/env python3
from pathlib import Path
import json, re, sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]
def req(c,m):
    if not c: errors.append(m)
def load(rel): return json.loads((ROOT/rel).read_text(encoding='utf-8'))
def read(rel): return (ROOT/rel).read_text(encoding='utf-8',errors='ignore')
site=load('config/site-release.json'); pkg=load('package.json'); lock=load('package-lock.json'); contract=load('mobile/app-contract.json')
for label,value in [('site',site.get('version')),('package',pkg.get('version')),('package-lock',lock.get('version')),('package-lock root',lock.get('packages',{}).get('',{}).get('version')),('mobile contract',contract.get('release'))]:
    req(value=='7.64.42',f'{label} release must be 7.64.42, got {value}')
for key in ['tournamentDataRelease','tournamentUIRelease','tournamentLiveRefreshRelease','evanCousineau2026GoogleLiveSourceRelease','evanCousineau2026TeamJourneyHistoryRelease']:
    req(site.get(key)=='7.64.42',f'{key} must be 7.64.42')
req(site.get('evanCousineau2026ScheduleRelease')=='7.64.36','verified ECC schedule baseline marker must remain 7.64.36')
b=load('data/tournaments/platform/events/2026-evan-cousineau-memorial-cup.json')
req(len(b.get('games',[]))==335,'ECC must preserve 335 games')
req(len(b.get('divisions',[]))==13,'ECC must preserve 13 divisions')
e=b.get('event',{}); c=b.get('capabilities',{})
req(e.get('status')=='in_progress','ECC event must be in_progress during live tournament')
req('docs.google.com/spreadsheets/d/1MnXWw7DZ6SCosPD4wy1SY5g4gNMT8h1fa7zYTuO-BoU' in e.get('officialSourceUrl',''),'official ECC source must be the Google workbook')
req(c.get('refreshMode')=='google_gviz_direct','ECC refresh mode must be google_gviz_direct')
req(c.get('scoreSourceStatus')=='official_google_live_results','ECC live result source status missing')
req(c.get('liveSourceProvider')=='google_sheets','ECC live source provider must be google_sheets')
req(c.get('liveSourceSheetName')=='MASTER BY DIVISION','ECC live source must use MASTER BY DIVISION')
req(c.get('refreshSeconds')==60,'ECC live refresh must remain 60 seconds')
html=read('tournament.html')
for token in ['js/ecc-google-live-v7-64-42.js?v=7.64.42','js/tournament-platform-v7-64-42.js?v=7.64.42','css/tournament-platform-v7-54-0.css?v=7.64.42']:
    req(token in html,f'tournament.html missing {token}')
js=read('js/tournament-platform-v7-64-42.js'); live=read('js/ecc-google-live-v7-64-42.js')
for token in ['Games played','completedJourneyGames','Next scheduled game']:
    req(token in js,f'team journey history missing {token}')
for token in ['MASTER BY DIVISION','10CPTAG','REFRESH_MS=60000','google']:
    req(token.lower() in live.lower(),f'Google live adapter missing {token}')
for rel in ['scripts/check-wphq-ecc-google-source-v7-64-42.py','scripts/test-wphq-ecc-google-live-v7-64-42.js','scripts/test-wphq-ecc-google-route-runtime-v7-64-42.js']:
    req((ROOT/rel).exists(),f'missing 7.64.42 validation file: {rel}')
# OneDrive 7.64.37 experiment must not be part of the finalized tree.
for rel in ['scripts/sync-ecc-live-relay-v7-64-37.py','.github/workflows/sync-ecc-live-relay.yml']:
    req(not (ROOT/rel).exists(),f'superseded OneDrive experiment still present: {rel}')
if errors:
    print('WPHQ 7.64.42 ECC GOOGLE LIVE RELEASE TEST FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('WPHQ 7.64.42 ECC GOOGLE LIVE RELEASE TEST PASSED')
print(' - release metadata promoted to 7.64.42')
print(' - 335-game / 13-division verified ECC baseline preserved')
print(' - Google MASTER BY DIVISION is the read-only 60-second live result source')
print(' - Team Journey preserves completed games plus next scheduled game')
print(' - superseded OneDrive 7.64.37 experiment is absent')
