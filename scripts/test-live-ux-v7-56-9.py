#!/usr/bin/env python3
from pathlib import Path
import hashlib, json, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
errors=[]

def fail(message): errors.append(message)
def read(rel):
    p=ROOT/rel
    if not p.exists() or p.stat().st_size == 0:
        fail(f"{rel} missing or empty")
        return ""
    return p.read_text(encoding="utf-8", errors="ignore")
def sha(rel):
    p=ROOT/rel
    if not p.exists(): return ""
    return hashlib.sha256(p.read_bytes()).hexdigest()
def require(text, token, label):
    if token not in text: fail(f"{label} missing: {token}")

site=json.loads(read("config/site-release.json") or "{}")
if site.get("version") != "7.56.9": fail("site version must be 7.56.9")
if site.get("name") != "Live UX Refresh": fail("release name must be Live UX Refresh")
for key in (
    "liveScoringSandboxRelease","liveScoringMobileWorkflowRelease",
    "liveScoringManualControlsRelease","liveScoringDashboardRelease",
    "liveScoringLiveUxRefreshRelease","liveScoringGroupMeSetupUxRelease",
    "liveScoringHandoffUxRelease","liveScoringTeamBrandingUxRelease"
):
    if site.get(key) != "7.56.9": fail(f"{key} must be 7.56.9")
for key in (
    "liveScoringBackendBlueprintRelease","liveScoringAuthGatewayRelease","liveScoringLineupWorkflowRelease",
    "liveScoringRosterRelease","liveScoringQuarterFlowRelease","liveScoringResetRelease","liveScoringExtraTimeRelease",
    "liveScoringShootoutRelease","liveScoringConnectedBackendRelease","liveScoringRoleSecurityRelease",
    "liveScoringPersistenceRelease","liveScoringGroupMeRelease","liveScoringDeliveryRetryRelease",
    "liveScoringDeliveryAuditRelease","liveScoringMultiDeviceRelease","liveScoringGuestScorerHandoffRelease",
    "liveScoringScopedAdminRelease","liveScoringScorerControlRelease","liveScoringInGameCodeClaimRelease",
    "liveScoringGroupMeTopicRelease"
):
    if site.get(key) != "7.56.8": fail(f"{key} must remain protected at 7.56.8")
if site.get("liveScoringManualGameSchemaRelease") != "7.56.4": fail("manual game schema release marker changed")

# Critical 7.56.8 server/backend assets must be byte-for-byte unchanged from the authoritative baseline.
protected_hashes = {
    "js/live-backend-v7-56-8.js":"fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328",
    "supabase/functions/groupme-post/index.ts":"42d994906dafba551681d69fd7d35b1d0e83a5a88de25c1563cb697b4b834777",
    "supabase/migrations/202608070001_groupme_topic_delivery.sql":"aacefc33e16c3d170953e68b6d52f99d9da35c1808dde9016ff94e6539525f04",
    "supabase/WPI_LIVE_7_56_8_FULL_SETUP.sql":"b8b51402aa944039125a325bd5e811b9ba4cce6af6a44e21cd0860c06dc39db4",
    "data/live-sandbox/event-types.json":"2495064b9471a7c22df7b9db6ca1c54155b790aafca865de4770e6a569af5078",
}
for rel, expected in protected_hashes.items():
    actual=sha(rel)
    if actual != expected: fail(f"protected 7.56.8 asset changed: {rel} ({actual or 'missing'})")

config=read("config/live-sandbox.js")
for token in ('release: "7.56.9"','mode: "connected"','environment: "sandbox"','groupMeDelivery: "connected"','supabasePublishableKey'):
    require(config, token, "live config")
for forbidden in ("service_role","GROUPME_BOT_ID:","bot_id:","password:","X-Access-Token"):
    if forbidden.lower() in config.lower(): fail(f"public config contains secret/provider token: {forbidden}")

sandbox_html=read("live-sandbox.html")
for token in (
    'css/live-sandbox-v7-56-9.css?v=7.56.9','config/live-sandbox.js?v=7.56.9',
    'js/live-backend-v7-56-8.js?v=7.56.9','js/live-sandbox-v7-56-9.js?v=7.56.9',
    'id="eventQuickActions"','More event options','Time of play','id="clockTime"',
    '<summary>More controls</summary>','id="transferScoringButton"','id="transferScoringInlineButton"',
    'id="endQuarterButton"','id="postPeriodDialog"','id="startOvertimeButton"','id="shootoutPanel"',
    'id="scorerHandoffDialog"','Simple handoff','Backup code','Use backup link instead',
    'id="scorerReadOnlyNotice"','id="enterScorerCodeInlineButton"'
): require(sandbox_html, token, "live sandbox")
if sandbox_html.find('id="clockTime"') < sandbox_html.find('id="primaryPlayer"'):
    fail("Time of play must remain later than player selection in the mobile flow")
if sandbox_html.find('id="endQuarterButton"') < sandbox_html.find('id="recordEventButton"'):
    fail("End quarter must remain below the submit action")

sandbox_js=read("js/live-sandbox-v7-56-9.js")
for token in (
    'const RELEASE = "7.56.9"','wpi-live-sandbox-v7-56-9','wpi-live-sandbox-v7-56-8',
    'EVENT_GROUPS','data-event-chip','syncEventQuickActions','Submit ${type.label}',
    'function recordSelectedEvent','function baseEvent','function aggregate','analyticsSnapshot',
    'shot_missed','shot_post','shot_blocked','shot_saved','exclusion_drawn','exclusion_committed',
    'five_meter_drawn','five_meter_committed','function startOvertime','function startShootout',
    'shootout_goal','shootout_miss','function createScorerHandoffPass','function takeOverScoring',
    'readOnlyScorer','This device is read-only','scheduleRemoteSync','deliveryIsDue','retryMessage',
    'state.game.status = "ended"','addSystemEvent("quarter_end", {note:"Final whistle"})'
): require(sandbox_js, token, "7.56.9 sandbox runtime")
record_slice=sandbox_js[sandbox_js.find('function recordSelectedEvent'):sandbox_js.find('function undoLastEvent')]
if 'confirm(' in record_slice: fail("play submission cannot require a confirmation dialog")

# Analytics/event database shape remains structured.
for token in (
    'sequence:activeEvents().length + 1','type:type.id','category:type.category','playerId:overrides.playerId || null',
    'secondaryPlayerId:overrides.secondaryPlayerId || null','quarter:Number(','timeRemaining:','teamDelta:',
    'opponentDelta:','teamShotDelta:','opponentShotDelta:','opponentFieldBlockDelta:','opponentSaveDelta:'
): require(sandbox_js, token, "structured event schema")

css=read("css/live-sandbox-v7-56-9.css")
for token in (
    '--lamo-blue:','--lamo-gold:','.live-event-quick-actions','.live-event-chip','.live-event-chip.is-active',
    '.live-time-field input','.live-groupme-step-list','.live-groupme-step-card','.live-groupme-advanced',
    '.live-handoff-fallback','@media (max-width: 720px)'
): require(css, token, "7.56.9 mobile CSS")

dashboard_html=read("live-dashboard.html")
for token in (
    'css/live-sandbox-v7-56-9.css?v=7.56.9','js/live-dashboard-v7-56-9.js?v=7.56.9',
    'Tournament GroupMe','Score Updates Topic','Test connection','Save &amp; use for new games','<summary>Advanced</summary>',
    'id="groupMeGroupSelect"','id="groupMeTopicSelect"','id="testGroupMeButton"','id="saveGroupMeButton"',
    'id="groupMeSetupStatusPill"','id="groupMeSecretField"'
): require(dashboard_html, token, "dashboard UX")

dashboard_js=read("js/live-dashboard-v7-56-9.js")
for token in (
    'discoverGroupMeGroups','discoverGroupMeTopics','saveGroupMeDestination','testGroupMeDestination',
    'updateGroupMeStatusPill','delivery_mode === "topic"','groupme_group_id','groupme_topic_id',
    'previewScorerHandoff({code, gameId: scorerCodeGameId})','acceptScorerHandoff({code, gameId:scorerCodeGameId, displayName})'
): require(dashboard_js, token, "dashboard runtime")

handoff_html=read("live-scorer-handoff.html")
for token in ('css/live-sandbox-v7-56-9.css?v=7.56.9','js/live-scorer-handoff-v7-56-9.js?v=7.56.9','handoffCode','handoffPreview','acceptHandoffButton'):
    require(handoff_html, token, "handoff page")
handoff_js=read("js/live-scorer-handoff-v7-56-9.js")
for token in ('previewScorerHandoff','acceptScorerHandoff','ensureAnonymousSession','displayName'):
    require(handoff_js, token, "handoff runtime")

# Private WPI Live remains unlinked from public site navigation.
for rel in ("index.html","rankings.html","teams.html","clubs.html","tournaments.html","js/site-shell.js"):
    text=read(rel)
    if "live-sandbox.html" in text or "live-login.html" in text or "live-dashboard.html" in text:
        fail(f"{rel} publicly links private WPI Live pilot")

# Syntax check every active JS asset plus the protected backend/auth assets.
for rel in (
    "js/live-backend-v7-56-8.js","js/live-login-v7-56-8.js","js/live-password-reset-v7-56-8.js",
    "js/live-dashboard-v7-56-9.js","js/live-sandbox-v7-56-9.js","js/live-scorer-handoff-v7-56-9.js"
):
    result=subprocess.run(["node","--check",str(ROOT/rel)],capture_output=True,text=True)
    if result.returncode: fail(f"{rel} syntax failed: {result.stderr.strip()}")

# Frozen public rankings and clubs still match season snapshot integrity.
rankings=json.loads(read("rankings.json") or "[]")
clubs=json.loads(read("clubs.json") or "[]")
manifest=json.loads(read("data/seasons/2025-2026/manifest.json") or "{}")
def digest(data):
    return hashlib.sha256(json.dumps(data,sort_keys=True,separators=(",",":"),ensure_ascii=False).encode()).hexdigest()
if len(rankings)!=724: fail(f"rankings changed: {len(rankings)}")
if len(clubs)!=182: fail(f"clubs changed: {len(clubs)}")
if digest(rankings)!=manifest.get("integrity",{}).get("rankingsSha256"): fail("ranking snapshot integrity changed")
if digest(clubs)!=manifest.get("integrity",{}).get("clubsSha256"): fail("club snapshot integrity changed")

if errors:
    print("WPI LIVE UX 7.56.9 TEST FAILED")
    for error in errors: print(f" - {error}")
    sys.exit(1)

print("WPI LIVE UX 7.56.9 TEST PASSED")
print(" - 7.56.8 backend, GroupMe Edge Function, Topic migration, full SQL, and event registry are byte-for-byte protected")
print(" - 7.56.9 mobile-first Lamorinda scoring UI and later Time of Play flow are present")
print(" - Simplified GroupMe setup and scorer handoff retain the existing server-side integrations")
print(" - Structured event/analytics fields, scorer authority, retries, OT/shootout, and Final Whistle paths remain present")
print(" - Frozen rankings and club snapshot integrity remain unchanged")
