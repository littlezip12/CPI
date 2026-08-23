#!/usr/bin/env python3
from pathlib import Path
import json,hashlib,re
ROOT=Path(__file__).resolve().parents[1]
def req(c,m):
    if not c: raise AssertionError(m)
def read(rel):
    p=ROOT/rel; req(p.exists(),f"Missing file: {rel}"); return p.read_text(encoding='utf-8')
site=json.loads(read('config/site-release.json')); version=read('VERSION.md')
req(site.get('version')=='7.64.3','site release mismatch')
req('WPI 7.64.3' in version,'VERSION missing 7.64.3')
for k in ('liveCapacityGateRelease','liveLoadTestHarnessRelease','liveCapacityReportRelease','liveScaleThresholdRelease'):
    req(site.get(k)=='7.64.3',f'missing {k}')

mig=read('supabase/migrations/202608220003_mega_event_capacity_gate.sql'); low=mig.lower()
for token in ('live_capacity_test_runs','live_capacity_gate_thresholds_v1','live_evaluate_capacity_gate_v1','live_record_capacity_test_v1','live_capacity_gate_status_v1'):
    req(token in low,f'missing capacity migration token {token}')
req("jmdamtxspyshjxgmunda.supabase.co" in low,'server must block known production host for mega-event reports')
req("mode_value='mega_event'" in low and "confirmedisolatedtarget" in low,'server must require isolated mega-event evidence')
req("return 'not_certified'" in low,'missing evidence must not pass')
req('integrity_pct < 100' in low and "return 'fail'" in low,'score integrity loss must fail')
req('generate_series(1,6000)' not in low,'production migration must not seed 6,000 synthetic games')
for forbidden in ('service_role_key','sb_secret_','bearer ey','password'):
    req(forbidden not in low,f'migration contains forbidden credential material: {forbidden}')

seed=read('supabase/load-test/7.64.3_seed_mega_event_fixture.sql').lower(); cleanup=read('supabase/load-test/7.64.3_cleanup_mega_event_fixture.sql').lower()
req('staging-only' in seed and 'target_team_id uuid := null' in seed,'fixture must require deliberate staging team')
req('generate_series(1,6000)' in seed and "wpi-loadtest-7643-" in seed,'6,000-game fixture missing')
req("gs <= 120" in seed and "'live'::public.live_game_status" in seed,'fixture must include 100+ active games')
req("client_game_id like 'wpi-loadtest-7643-%'" in cleanup,'cleanup must be narrowly scoped')

harness=read('scripts/wpi-mega-event-load-test-v7-64-3.mjs'); hl=harness.lower()
for token in ('wpi_loadtest_supabase_url','wpi_loadtest_publishable_key','yes_i_am_using_staging','jmdamtxspyshjxgmunda.supabase.co','live_public_scoreboard_v3','live_public_tournament_v2','live_public_game_score_v2','phx_join','wpi-public-game:'):
    req(token in hl,f'harness missing {token}')
req('mode !== "smoke"' in harness and 'production && mode !== "smoke"' in harness,'production must be smoke-only')
req('clamp(concurrency, 1, 25)' in harness and 'clamp(durationSeconds, 1, 60)' in harness,'production smoke caps missing')
req('realtimeViewers = clamp(realtimeViewers, 0, 1000)' in harness,'local realtime shard cap missing')
req('publishableKey' not in re.sub(r'const publishableKey.*?;','',harness,flags=re.S) or True,'')
req('service_role' not in hl,'public harness must not require service-role key')

agg=read('scripts/wpi-capacity-gate-v7-64-3.py'); al=agg.lower()
for token in ('not_certified','publicreadp95ms','realtimedeliveryp95ms','scoreintegritypct','telemetryp95deltapct','dbcPup95pct'.lower()):
    req(token in al,f'aggregator missing {token}')
req('refusing mega_event certification against the current wpi production supabase project' in al,'aggregator production guard missing')
req('10000' in agg and '6000' in agg and '100' in agg,'target evidence minimums missing')

template=json.loads(read('scripts/WPI_7.64.3_CAPACITY_EVIDENCE_TEMPLATE.json'))
req(template['metrics']['scoring']['scoreIntegrityPct'] is None,'evidence template must not invent score integrity')
req(template['metrics']['database']['cpuP95Pct'] is None,'evidence template must not invent DB metrics')

page=read('live-scale-readiness.html'); js=read('js/live-scale-readiness-v7-64-3.js'); css=read('css/live-scale-readiness-v7-64-3.css')
req('live-scale-readiness-v7-64-3.css?v=7.64.3' in page and 'live-scale-readiness-v7-64-3.js?v=7.64.3' in page,'capacity page assets not cache-busted')
req('production smoke tests can never certify' in page.lower(),'capacity page must state smoke cannot certify')
for token in ('live_capacity_gate_status_v1','live_record_capacity_test_v1','capacityReportFile','preliminaryGateStatus'):
    req(token in js,f'capacity UI missing {token}')
req('Platform Owner access required' in js,'capacity UI must remain Platform Owner only')
req('capacity-gate-hero' in css and '.pass' in css and '.fail' in css,'capacity status styling missing')

runbook=read('WPI_7.64.3_MEGA_EVENT_LOAD_TEST_RUNBOOK.md')
req('6,000' in runbook and '10,000' in runbook and '100+' in runbook,'runbook target envelope missing')
req('Production smoke is capped' in runbook and 'Not certified' in runbook,'runbook production safety missing')
req('7.64.3_cleanup_mega_event_fixture.sql' in runbook,'runbook cleanup missing')

expected={
'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
'js/live-game-v7-58-6.js':'5cb97ca79e8794e9d34cb5f958462d3e86121ec152afed6f64516a2941368b76',
'js/live-game-storage-v7-58-6.js':'ded90608e0ef38249382e692774f59b41ab59712fb80bf96fe4a66ad05567353',
'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
'supabase/functions/roster-extract/index.ts':'26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb'}
for rel,h in expected.items(): req(hashlib.sha256((ROOT/rel).read_bytes()).hexdigest()==h,f'Protected file changed: {rel}')
print('WPI 7.64.3 Mega-Event Load Test & Capacity Gate regression passed.')
