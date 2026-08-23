#!/usr/bin/env python3
from pathlib import Path
import json,hashlib,re
ROOT=Path(__file__).resolve().parents[1]
def req(c,m):
    if not c: raise AssertionError(m)
def read(rel):
    p=ROOT/rel; req(p.exists(),f"Missing file: {rel}"); return p.read_text(encoding='utf-8')
site=json.loads(read('config/site-release.json')); version=read('VERSION.md')
req(site.get('version') in {'7.64.2','7.64.3'},'site release mismatch'); req(any(v in version for v in ('WPI 7.64.2','WPI 7.64.3')),'VERSION missing 7.64.2+')
for k in ('liveScaleReadinessRelease','liveMegaEventReadinessRelease','livePublicPaginationRelease','livePublicScoreBroadcastRelease','liveScaleObservabilityRelease'): req(site.get(k)=='7.64.2',f'missing {k}')

mig=read('supabase/migrations/202608220002_scale_mega_event_readiness.sql'); low=mig.lower()
for token in ('live_public_scoreboard_v3','live_public_tournament_v2','live_broadcast_public_game_score_v1','live_scale_readiness_snapshot_v1','live_games_public_scoreboard_scale_idx','live_games_public_tournament_id_scale_idx','realtime.send'):
    req(token in low,f'missing scale migration token {token}')
req("g.visibility='public_team'" in low,'public read functions must preserve public_team boundary')
req("least(coalesce(requested_limit,60),100)" in low,'public page size must be capped at 100')
req("'wpi-public-game:' || new.id::text" in low and "'wpi-public-scoreboard'" in low,'broadcast topics missing')
for forbidden in ('created_by','updated_by','active_scorer_user_id','active_scorer_display_name','state_snapshot','destination_id'):
    # private columns must never be serialized into the realtime payload
    payload_section=low[low.index("payload := jsonb_build_object"):low.index("perform realtime.send(\n    payload")]
    req(forbidden not in payload_section,f'private field leaked into public broadcast: {forbidden}')
req("if auth.uid() is null or not public.live_is_platform_owner()" in low,'readiness snapshot must be Platform Owner only')
req("'passed',false" in low and 'not a 10,000-viewer' in mig,'snapshot must not claim load-test certification')

live=read('live.html'); center=read('js/live-public-center-v7-64-2.js')
req('live-public-center-v7-64-2.js?v=7.64.2' in live,'7.64.2 center asset missing')
req('publicLoadMore' in live and 'publicPageStatus' in live,'public pagination controls missing')
req('live_public_scoreboard_v3' in center,'public center must use bounded v3 RPC')
req('requested_search' in center and 'requested_status' in center and 'requested_offset' in center,'public filters must execute server-side')
req('wpi-public-scoreboard' in center and 'broadcast' in center,'public center invalidation channel missing')

tpage=read('live-tournament.html'); tjs=read('js/live-tournament-v7-64-2.js')
req('live-tournament-v7-64-2.js?v=7.64.2' in tpage and 'ltLoadMore' in tpage,'tournament bounded-page UX missing')
req('live_public_tournament_v2' in tjs and 'requested_division' in tjs and 'requested_team_id' in tjs and 'requested_offset' in tjs,'tournament filters/pagination must be server-side')
req('limit 2000' not in tjs.lower(),'browser must not depend on old 2,000-row tournament payload')

score=read('js/live-public-score-v7-64-2.js'); scorepage=read('live-score.html')
req('live-public-score-v7-64-2.js?v=7.64.2' in scorepage,'7.64.2 public score asset missing')
for token in ('wpi-public-game:${gameId}','event:"score"','live push · safety refresh 60s','fallback refresh 12s','visibilitychange'):
    req(token in score,f'public score delivery missing {token}')
req('setInterval(()=>{if(!document.hidden)refresh();},8000)' not in score,'8-second primary polling regressed')
req('postgres_changes' not in score,'public score must not subscribe to full live_games Postgres Changes')

scale=read('live-scale-readiness.html'); scalejs=read('js/live-scale-readiness-v7-64-3.js' if site.get('version')=='7.64.3' else 'js/live-scale-readiness-v7-64-2.js'); commercial=read('live-commercial.html')
req((('Mega-Event Readiness' in scale) or ('Mega-Event Capacity Gate' in scale)) and '10,000' in scale and '6,000' in scale,'scale readiness targets missing')
req('live_scale_readiness_snapshot_v1' in scalejs and 'live_public_scoreboard_v3' in scalejs,'scale readiness probes missing')
req(('does not claim a load test has passed' in scale.lower()) or ('production smoke tests can never certify' in scale.lower()),'readiness page must disclaim certification')
req('live-scale-readiness.html' in commercial,'Platform Owner navigation to readiness page missing')

expected={
'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
'js/live-game-v7-58-6.js':'5cb97ca79e8794e9d34cb5f958462d3e86121ec152afed6f64516a2941368b76',
'js/live-game-storage-v7-58-6.js':'ded90608e0ef38249382e692774f59b41ab59712fb80bf96fe4a66ad05567353',
'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
'supabase/functions/roster-extract/index.ts':'26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb'}
for rel,h in expected.items(): req(hashlib.sha256((ROOT/rel).read_bytes()).hexdigest()==h,f'Protected file changed: {rel}')
print('WPI 7.64.2 Scale & Mega-Event Readiness regression passed.')
