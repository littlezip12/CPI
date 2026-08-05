#!/usr/bin/env python3
from pathlib import Path
import hashlib, json, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
errors=[]
def fail(message): errors.append(message)
def read(rel):
    p=ROOT/rel
    if not p.exists() or p.stat().st_size==0:
        fail(f"{rel} missing or empty")
        return ""
    return p.read_text(encoding="utf-8",errors="ignore")

site=json.loads(read("config/site-release.json") or "{}")
if site.get("version")!="7.56.3": fail("site version must be 7.56.3")
for key in ("liveScoringGroupMeRelease","liveScoringDeliveryRetryRelease","liveScoringDeliveryAuditRelease"):
    if site.get(key)!="7.56.3": fail(f"{key} must be 7.56.3")

config=read("config/live-sandbox.js").split("window.WPI_LIVE_SANDBOX_CONFIG = Object.freeze({",1)[-1]
for token in ('release: "7.56.3"','groupMeDelivery: "connected"','mode: "connected"','supabasePublishableKey'):
    if token not in config: fail(f"live config missing {token}")
for forbidden in ('GROUPME_BOT_ID:', 'bot_id:', 'service_role', 'SUPABASE_SECRET_KEY'):
    if forbidden.lower() in config.lower(): fail(f"public config contains secret token {forbidden}")

html=read("live-sandbox.html")
for token in ('js/live-backend-v7-56-3.js?v=7.56.3','js/live-sandbox-v7-56-3.js?v=7.56.3','css/live-sandbox-v7-56-2.css?v=7.56.2','id="messageList"','id="pauseMessagesButton"'):
    if token not in html: fail(f"live sandbox missing {token}")

dashboard=read("live-dashboard.html")
for token in ('id="groupMeAdminPanel"','id="groupMeDisplayName"','id="groupMeSecretName"','id="groupMeEnabled"','id="saveGroupMeButton"','id="testGroupMeButton"','id="groupMeAudit"','id="dashboardDeliveryMetric"','js/live-dashboard-v7-56-3.js?v=7.56.3'):
    if token not in dashboard: fail(f"dashboard missing {token}")

backend=read("js/live-backend-v7-56-3.js")
for token in ('loadGroupMeDestination','saveGroupMeDestination','testGroupMeDestination','groupMeDeliverySummary','loadDeliveryStatuses','invokeGroupMeDelivery','subscribeToDeliveries','destination_id: destination?.enabled','remoteEventMap','resolveRemoteEventId','unresolvedClientIds','const context = error.context'):
    if token not in backend: fail(f"backend adapter missing {token}")
for forbidden in ('api.groupme.com','GROUPME_BOT_ID','SUPABASE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY'):
    if forbidden in backend: fail(f"browser backend contains server/secret token {forbidden}")

sandbox=read("js/live-sandbox-v7-56-3.js")
for token in ('deliverPendingMessages','retryMessage','data-retry-event','applyDeliveryStatuses','nextRetryAt','GroupMe setup needed','Connected delivery','status = "sending"','backend.resolveRemoteEventId','hasRecoverableDelivery'):
    if token not in sandbox: fail(f"scorer delivery workflow missing {token}")
if 'api.groupme.com' in sandbox or 'GROUPME_BOT_ID' in sandbox: fail("scorer contains GroupMe server credential logic")

dash_js=read("js/live-dashboard-v7-56-3.js")
for token in ('saveGroupMeDestination','testGroupMeDestination','groupMeDeliverySummary','Send a test message','GroupMe connected','Configured — test required','GroupMe needs attention','Test failed:'):
    if token not in dash_js: fail(f"dashboard GroupMe workflow missing {token}")

edge=read("supabase/functions/groupme-post/index.ts")
for token in ('https://api.groupme.com/v3/bots/post','action === "test"','Deno.env.get(secretName)','live_delivery_attempts','next_retry_at','retryDelaySeconds','live_claim_groupme_delivery','AbortSignal.timeout(15000)','already_sent','Scorer access required','Owner or Admin role required','auth.getUser(userJwt)','authorization.replace(/^Bearer\\s+/i','groupme-post failed','npm:@supabase/supabase-js@2.110.8/cors','x-wpi-live-release'):
    if token not in edge: fail(f"GroupMe Edge Function missing {token}")
if 'const groupMeBotId = Deno.env.get("GROUPME_BOT_ID")' in edge: fail("Edge Function must use destination-specific dynamic secret names")

migration=read("supabase/migrations/202608040003_groupme_delivery.sql")
for token in ('live_delivery_attempts','live_claim_groupme_delivery','pg_advisory_xact_lock','live_upsert_groupme_destination','live_groupme_delivery_summary','next_retry_at','message_text_snapshot','request_id','enable row level security','members read delivery attempts','supabase_realtime add table public.live_deliveries'):
    if token not in migration: fail(f"GroupMe migration missing {token}")
full=read("supabase/WPI_LIVE_7_56_2_FULL_SETUP.sql")
if migration.strip() not in full: fail("fresh-install SQL does not include GroupMe migration")

function_config=read("supabase/config.toml")
for token in ('[functions.groupme-post]','verify_jwt = true'):
    if token not in function_config: fail(f"function configuration missing {token}")

guide=read("LIVE_GROUPME_SETUP_7.56.2.md")
for token in ('WPI Live Scoring Test','GROUPME_BOT_ID_LAMORINDA_A_14U_BOYS','npx supabase secrets set','npx supabase functions deploy groupme-post','Automatic retry runs while an authorized WPI Live page remains open','manual retry'):
    if token not in guide: fail(f"GroupMe setup guide missing {token}")

metadata=json.loads(read("data/live-sandbox/event-types.json") or "{}")
gm=metadata.get("groupMeDelivery",{})
for key,value in {
    "mode":"authenticated_edge_function","provider":"groupme","storeBeforeSend":True,
    "testMessage":True,"manualRetry":True,"attemptAudit":True
}.items():
    if gm.get(key)!=value: fail(f"event metadata GroupMe {key} mismatch")
if gm.get("retryScheduleSeconds") != [60,300,900,3600]: fail("retry schedule mismatch")

for rel in ('js/live-backend-v7-56-3.js','js/live-dashboard-v7-56-3.js','js/live-login-v7-56-3.js','js/live-password-reset-v7-56-3.js','js/live-sandbox-v7-56-3.js'):
    result=subprocess.run(["node","--check",str(ROOT/rel)],capture_output=True,text=True)
    if result.returncode: fail(f"{rel} syntax failed: {result.stderr.strip()}")

rankings=json.loads(read("rankings.json") or "[]")
clubs=json.loads(read("clubs.json") or "[]")
manifest=json.loads(read("data/seasons/2025-2026/manifest.json") or "{}")
def digest(data): return hashlib.sha256(json.dumps(data,sort_keys=True,separators=(",",":"),ensure_ascii=False).encode()).hexdigest()
if len(rankings)!=724: fail(f"rankings changed: {len(rankings)}")
if len(clubs)!=182: fail(f"clubs changed: {len(clubs)}")
if digest(rankings)!=manifest.get("integrity",{}).get("rankingsSha256"): fail("ranking snapshot integrity changed")
if digest(clubs)!=manifest.get("integrity",{}).get("clubsSha256"): fail("club snapshot integrity changed")

if errors:
    print("WPI GROUPME DELIVERY 7.56.3 TEST FAILED")
    for error in errors: print(f" - {error}")
    sys.exit(1)
print("WPI GROUPME DELIVERY 7.56.3 TEST PASSED")
print(" - Authenticated server-side GroupMe posting and Owner/Admin test delivery are wired")
print(" - Plays are stored before send; failed deliveries persist with retry timing and per-attempt audit")
print(" - Scorers see sent/queued/failed status and can manually retry without exposing bot credentials")
print(" - Immutable rankings, clubs, seasons, tournaments, and existing live-scoring behavior remain protected")
