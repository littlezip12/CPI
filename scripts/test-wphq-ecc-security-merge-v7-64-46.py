#!/usr/bin/env python3
from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]
def req(c,m):
    if not c: errors.append(m)
def read(rel): return (ROOT/rel).read_text(encoding='utf-8',errors='ignore')
def load(rel): return json.loads(read(rel))
site=load('config/site-release.json'); pkg=load('package.json'); contract=load('mobile/app-contract.json')
req(site.get('version')=='7.64.46','merged site release must be 7.64.46')
req(pkg.get('version')=='7.64.46','merged package release must be 7.64.46')
req(contract.get('release')=='7.64.46','merged mobile release must be 7.64.46')
# Preserve security work from the actually-pushed 7.64.41 stream.
req(site.get('securityDefinerHardeningRelease')=='7.64.41','7.64.41 security hardening marker missing')
manifest=load('config/security-definer-access-v7-64-41.json')
cats=manifest.get('categories',{})
req(len(cats.get('publicUnauthenticated',{}).get('functions',[]))==13,'security public classification changed')
req(len(cats.get('authenticatedApplication',{}).get('functions',[]))==54,'security authenticated classification changed')
req(len(cats.get('internalTrigger',{}).get('functions',[]))==10,'security trigger classification changed')
for rel in ['supabase/migrations/202610010001_security_definer_least_privilege.sql','supabase/validation/202610010001_security_definer_least_privilege_check.sql','supabase/rollback/202610010001_security_definer_least_privilege_rollback.sql']:
    req((ROOT/rel).exists(),f'7.64.41 security artifact missing: {rel}')
# Preserve 7.64.42-equivalent ECC behavior without downgrading the merged release number.
for key in ['tournamentDataRelease','tournamentUIRelease','tournamentLiveRefreshRelease','evanCousineau2026GoogleLiveSourceRelease','evanCousineau2026TeamJourneyHistoryRelease']:
    req(site.get(key)=='7.64.42',f'{key} must preserve the ECC 7.64.42 feature level')
req(site.get('evanCousineau2026ScheduleRelease')=='7.64.36','verified ECC structural schedule baseline marker changed')
b=load('data/tournaments/platform/events/2026-evan-cousineau-memorial-cup.json'); e=b.get('event',{}); c=b.get('capabilities',{})
req(len(b.get('games',[]))==335,'ECC must preserve 335 games')
req(len(b.get('divisions',[]))==13,'ECC must preserve 13 divisions')
req(e.get('status')=='in_progress','ECC must be live/in_progress')
req('docs.google.com/spreadsheets/d/1MnXWw7DZ6SCosPD4wy1SY5g4gNMT8h1fa7zYTuO-BoU' in e.get('officialSourceUrl',''),'ECC official Google workbook missing')
req(c.get('refreshMode')=='google_gviz_direct','ECC Google GViz refresh mode missing')
req(c.get('scoreSourceStatus')=='official_google_live_results','ECC score source status missing')
req(c.get('liveSourceProvider')=='google_sheets','ECC provider marker missing')
req(c.get('liveSourceSheetName')=='MASTER BY DIVISION','ECC source tab marker missing')
req(c.get('refreshSeconds')==60,'ECC refresh must remain 60 seconds')
html=read('tournament.html')
for token in ['js/ecc-google-live-v7-64-42.js?v=7.64.42','js/tournament-platform-v7-64-42.js?v=7.64.42','css/tournament-platform-v7-54-0.css?v=7.64.42']:
    req(token in html,f'tournament shell missing ECC merge token: {token}')
live=read('js/ecc-google-live-v7-64-42.js'); platform=read('js/tournament-platform-v7-64-42.js')
for token in ['MASTER BY DIVISION','10CPTAG','REFRESH_MS=60000']:
    req(token in live,f'ECC live adapter missing: {token}')
for token in ['Games played','completedJourneyGames','Next scheduled game']:
    req(token in platform,f'ECC Team Journey missing: {token}')
for rel in ['scripts/check-wphq-ecc-google-source-v7-64-42.py','scripts/test-wphq-ecc-google-live-v7-64-42.js','scripts/test-wphq-ecc-google-route-runtime-v7-64-42.js']:
    req((ROOT/rel).exists(),f'ECC validation asset missing: {rel}')
source_dir=ROOT/'data/tournaments/source/2026-evan-cousineau-memorial-cup'
fixture=source_dir/'google-master-by-division-2026-10-03.csv'
base_exports=[p for p in source_dir.glob('*.csv') if p.name!='google-master-by-division-2026-10-03.csv']
req(len(base_exports)==13,'ECC must preserve the 13 verified schedule source exports')
req(fixture.exists(),'ECC Google offline regression fixture must be preserved in addition to the 13 schedule exports')
for rel in ['scripts/sync-ecc-live-relay-v7-64-37.py','.github/workflows/sync-ecc-live-relay.yml']:
    req(not (ROOT/rel).exists(),f'abandoned OneDrive automation resurfaced: {rel}')
if errors:
    print('WPHQ 7.64.46 ECC + SECURITY PRESERVATION TEST FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('WPHQ 7.64.46 ECC + SECURITY PRESERVATION TEST PASSED')
print(' - pushed 7.64.41 least-privilege security artifacts are preserved')
print(' - ECC Google MASTER BY DIVISION live results behavior is restored at the 7.64.42 feature level')
print(' - 335 stable games / 13 divisions / 60-second read-only Google overlay remain intact')
print(' - Team Journey Games played + Next scheduled game remain wired')
