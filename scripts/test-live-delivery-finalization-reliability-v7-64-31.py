from pathlib import Path
import hashlib, json
ROOT=Path(__file__).resolve().parents[1]

def req(cond,msg):
    if not cond: raise AssertionError(msg)
def read(rel): return (ROOT/rel).read_text()

def sha(rel): return hashlib.sha256((ROOT/rel).read_bytes()).hexdigest()

site=json.loads(read('config/site-release.json'))
req(site.get('version')=='7.64.31','site release must be 7.64.31')
req(site.get('liveDeliveryFinalizationReliabilityRelease')=='7.64.31','reliability release metadata missing')
html=read('live-game.html')
backend=read('js/live-backend-v7-64-31.js')
scorer=read('js/live-game-v7-64-31.js')
edge=read('supabase/functions/groupme-post-v7-64-31/index.ts')
sql=read('supabase/migrations/202609260001_live_delivery_finalization_reliability.sql')

req('js/live-backend-v7-64-31.js?v=7.64.31' in html,'7.64.31 backend must be active')
req('js/live-game-v7-64-31.js?v=7.64.31' in html,'7.64.31 scorer must be active')
req('js/live-quick-time-pad-v7-64-11.js?v=7.64.11' in html,'Quick Time must remain on validated 7.64.11 runtime')

# The validated scorer foundation remains available for rollback/audit.
for rel,expected in {
  'js/live-backend-v7-64-11.js':'c76270a1dce00b8c29c7a76203fbad96ed5bd88fb85fa16f87e2c1da7c59e44b',
  'js/live-game-v7-64-11.js':'302c6819ab317f9053320bf4bbce60291a7c9dabf290d6fa244dfa914125b9c7',
  'js/live-quick-time-pad-v7-64-11.js':'06a96147f5fbbbfd3299bfa6b08a405c4e19c72079e6f3fcfcd456fd7608b8a8',
  'supabase/functions/groupme-post-v7-64-11/index.ts':'c8a616be0f70f496fb398968be9f5a2ec0d9b100413a6099e3c87e13a9394fcd',
}.items():
    req(sha(rel)==expected,f'protected 7.64.11 foundation changed: {rel}')

# Guest scorer event INSERT ... RETURNING must have detailed SELECT visibility,
# but ordinary Supporters remain outside the raw operational policy.
req('live_has_recent_scorer_session_access' in sql,'recent scorer-session access helper missing')
req("s.status in ('active','read_only')" in sql,'active/read-only scorer session access missing')
req("s.status='ended'" in sql and "interval '30 minutes'" in sql,'recent ended scorer recovery window missing')
req('drop policy if exists live_events_operational_read' in sql,'event privacy policy must be deliberately replaced')
req("array['owner','admin','scorer']" in sql,'operational role privacy boundary missing')
req('or public.live_has_recent_scorer_session_access(live_events.game_id)' in sql,'guest scorer raw event read path missing')
req('viewer' not in sql.lower().split('drop policy if exists live_events_operational_read',1)[1].split('drop policy if exists live_lineups_operational_read',1)[0], 'Supporter/viewer must not gain raw live_events access')

# Backend must use successor function and preserve final delivery audit before the
# final game write ends the scorer session.
req('groupme-post-v7-64-31' in backend,'backend must invoke successor GroupMe function')
req('async flushGroupMeGame' in backend and 'action: "flush_game"' in backend,'server-backed game delivery catch-up client missing')
final_marker=backend.index('if (deferredFinalGameUpdate)')
audit_marker=backend.rindex('const deliveryStatuses = await this.loadDeliveryStatuses(game.id);',0,final_marker)
req(audit_marker < final_marker,'delivery audit must be read before final session-closing update')

# Final Whistle must drain ordinary autosave, finalize once, then ask the server
# to fill persisted delivery gaps. No scoring-entry/Quick-Time semantics belong here.
req('let finalizingGame = false;' in scorer,'Final Whistle synchronization lock missing')
req('async function waitForRemoteSyncIdle' in scorer,'Final Whistle must wait for prior autosave')
req('async function flushGameDelivery' in scorer,'final GroupMe catch-up helper missing')
req('await waitForRemoteSyncIdle()' in scorer,'Final Whistle does not drain prior save')
req('await flushGameDelivery(result.remoteGameId' in scorer,'Final Whistle does not invoke server catch-up')
req('if (finalizingGame)' in scorer and 'remoteSyncPending = true' in scorer,'autosave suppression during Final Whistle missing')

# Edge function must authorize the active/recent scorer and scan canonical events,
# not trust one browser's local pending-message list.
req('action === "flush_game"' in edge,'flush_game Edge Function action missing')
req('live_game_scorer_sessions' in edge and '30 * 60 * 1000' in edge,'recent final scorer authorization missing')
req('.from("live_events")' in edge and '.not("message_text","is",null)' in edge,'flush must scan persisted message-bearing events')
req('.from("live_deliveries")' in edge and '["sent","suppressed"]' in edge,'flush must skip completed delivery rows')
req('processStoredEventDelivery' in edge and 'live_claim_groupme_delivery' in edge,'flush must reuse idempotent delivery claim path')
req('triggerSource:"worker"' in edge,'catch-up attempts must be audited as worker delivery')

print('WPHQ 7.64.31 LIVE DELIVERY & FINALIZATION RELIABILITY TEST PASSED')
print(' - guest scorer event visibility restored without Supporter raw-data access')
print(' - Final Whistle drains autosave before the final database write')
print(' - persisted events can be caught up to GroupMe after handoff/finalization')
print(' - 7.64.11 Quick Time and protected rollback foundation remain byte-stable')
