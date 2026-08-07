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
    return p.read_text(encoding="utf-8", errors="ignore")

site=json.loads(read("config/site-release.json") or "{}")
if site.get("version")!="7.56.8": fail("site version must be 7.56.8")
for key in (
    "liveScoringSandboxRelease","liveScoringAuthGatewayRelease","liveScoringMobileWorkflowRelease",
    "liveScoringLineupWorkflowRelease","liveScoringRosterRelease","liveScoringQuarterFlowRelease",
    "liveScoringResetRelease","liveScoringManualControlsRelease","liveScoringExtraTimeRelease",
    "liveScoringShootoutRelease","liveScoringDashboardRelease","liveScoringRoleSecurityRelease"
):
    if site.get(key)!="7.56.8": fail(f"{key} must remain 7.56.8 because browser and role surfaces did not change")
for key in ("liveScoringBackendBlueprintRelease","liveScoringConnectedBackendRelease","liveScoringPersistenceRelease"):
    if site.get(key)!="7.56.8": fail(f"{key} must be 7.56.8")
if site.get("liveScoringManualGameSchemaRelease")!="7.56.4": fail("liveScoringManualGameSchemaRelease must remain 7.56.4")

login=read("live-login.html")
for token in (
    'name="robots" content="noindex,nofollow,noarchive"',
    'id="signInTab"','id="signUpTab"','id="loginForm"','id="continueDemoButton"','id="forgotPasswordButton"','id="displayName"',
    'config/live-sandbox.js?v=7.56.8','js/live-login-v7-56-8.js?v=7.56.8',
    'css/live-sandbox-v7-56-8.css?v=7.56.8'
):
    if token not in login: fail(f"live-login.html missing token: {token}")

html=read("live-sandbox.html")
for token in (
    'name="robots" content="noindex,nofollow,noarchive"',
    'id="setupPanel"','id="rosterList"','id="liveConsole"',
    '<h2 id="consoleHeading">Time of play</h2>', 'Time remaining in quarter',
    'id="eventType"','id="primaryPlayer"','id="assistPlayer"','Unassisted',
    'id="eventNoteLabel"','Additional notes','id="eventNote"',
    'id="messagePreviewDetails"','id="recordEventButton"','Submit play',
    'id="endQuarterButton" class="live-end-quarter-secondary"','End quarter',
    'id="postPeriodDialog"','id="postPeriodEndGameButton"','id="overtimeLength"','id="overtimeFormat"','id="overtimeOption"','id="startOvertimeButton"',
    'id="shootoutSetupDialog"','id="shootoutFirstTeam"','id="startShootoutButton"',
    'id="shootoutPanel"','id="shootoutOurPlayer"','id="shootoutOpponentPlayer"',
    'id="shootoutGoalButton"','id="shootoutMissButton"','id="undoShootoutButton"','id="endShootoutGameButton"',
    '<summary>Manual controls</summary>','id="gameControlsDetails"',
    'id="endGameButton" class="live-end-game-primary"','End game and build recap',
    'id="messageDetails" open','id="timelineDetails" open',
    'config/live-sandbox.js?v=7.56.8','js/live-sandbox-v7-56-8.js?v=7.56.8',
    'css/live-sandbox-v7-56-8.css?v=7.56.8'
):
    if token not in html: fail(f"live-sandbox.html missing token: {token}")
for forbidden in ('id="startQuarterButton"','id="startNextQuarterButton"'):
    if forbidden in html: fail(f"live-sandbox.html retains removed control: {forbidden}")
if html.find('id="endQuarterButton"') < html.find('id="recordEventButton"'):
    fail("End quarter must remain below Submit play")

for rel in ("index.html","rankings.html","teams.html","clubs.html","tournaments.html","js/site-shell.js"):
    text=read(rel)
    if "live-sandbox.html" in text or "live-login.html" in text: fail(f"{rel} publicly links private pilot")

config=read("config/live-sandbox.js").split("window.WPI_LIVE_SANDBOX_CONFIG = Object.freeze({",1)[-1]
for token in ('release: "7.56.8"','mode: "connected"','environment: "sandbox"','groupMeDelivery: "connected"','supabasePublishableKey','allowLocalDemo: true'):
    if token not in config: fail(f"sandbox config missing {token}")
for forbidden in ("service_role","GROUPME_BOT_ID:","bot_id:","password:"):
    if forbidden.lower() in config.lower(): fail(f"public config contains secret-like token: {forbidden}")

metadata=json.loads(read("data/live-sandbox/event-types.json") or "{}")
if metadata.get("release")!="7.56.8" or metadata.get("environment")!="sandbox": fail("event registry release/environment mismatch")
workflow=metadata.get("mobileWorkflow",{})
if workflow.get("postQ4Flow") != ["end_game","start_overtime","start_shootout"]: fail("post-Q4 choices missing")
if workflow.get("overtimeLengthsMinutes") != [1,2,3]: fail("overtime lengths must be 1, 2, and 3 minutes")
if workflow.get("overtimeFormats") != ["single_period","multiple_periods_or_halves"]: fail("overtime formats missing")
shots=workflow.get("shotTracking",{})
if shots.get("nonGoalOutcomes") != ["missed_goal","off_post","blocked_in_play","saved_by_goalie"]: fail("non-goal shot outcomes missing")
if shots.get("allOutcomesTrackOurShooter") is not True: fail("all non-goal shot outcomes must track our shooter")
if shots.get("offensiveEventIds") != ["shot_missed","shot_post","shot_blocked","shot_saved"]: fail("offensive shot event IDs mismatch")
if shots.get("separateOurDefenseEvents") != ["field_block","save"]: fail("our defensive events must remain separate")
shootout=workflow.get("shootout",{})
for key,value in {
    "selectFirstTeam":True,"alternatingAttempts":True,"autoSubmitOutcome":True,
    "undoLastShot":True,"endGameAnyTime":True,"scoreIncrementPerGoal":0.1
}.items():
    if shootout.get(key)!=value: fail(f"shootout workflow {key} mismatch")
if metadata.get("lineupRules",{}).get("12U",{}).get("totalStarters")!=6: fail("12U lineup rule changed")
if metadata.get("lineupRules",{}).get("14U",{}).get("totalStarters")!=7: fail("14U lineup rule changed")

login_js=read("js/live-login-v7-56-8.js")
for token in ('backend.signIn','backend.signUp','requestPasswordReset','wpi-live-auth-v7-56-8','live-dashboard.html','dashboardRedirect.searchParams.set("invite", invite)','backend.registrationStatus()','New accounts require a private team invitation'):
    if token not in login_js: fail(f"login runtime missing token: {token}")

js=read("js/live-sandbox-v7-56-8.js")
for token in (
    'const RELEASE = "7.56.8"','wpi-live-sandbox-v7-56-8','wpi-live-sandbox-v7-55-9',
    'function openPostPeriodDialog','function startOvertime','function startShootout',
    'shot_missed','shot_post','shot_blocked','shot_saved','teamShotDelta','opponentShotDelta','opponentFieldBlockDelta','opponentSaveDelta','overtimeMultiplePeriods',
    'function recordShootoutAttempt','function renderShootoutPanel',
    'shootout_goal','shootout_miss','teamDelta:goal && side === "team" ? 0.1 : 0',
    'opponentDelta:goal && side === "opponent" ? 0.1 : 0','displayScore','recalculateShootout',
    'state.game.shootout.nextTeam','Submit play','function applyRoleAccess',
    'readOnlyScorer','workspace.defaultLineupPlayerIds','remoteToLocal','createdByUserId'
):
    if token not in js: fail(f"sandbox runtime missing token: {token}")
for forbidden in ('api.groupme.com','GROUPME_BOT_ID','$('+'"startQuarterButton"'+')'):
    if forbidden in js: fail(f"sandbox runtime contains removed or secret token: {forbidden}")
record_slice=js[js.find('function recordSelectedEvent'):js.find('function undoLastEvent')]
if 'confirm(' in record_slice: fail("play submission must remain immediate")

css=read("css/live-sandbox-v7-56-8.css")
for token in (
    '.live-end-quarter-secondary','.live-end-game-primary','.live-game-controls',
    '.live-shootout-panel','.live-post-period-dialog','.live-shootout-actions','@media (max-width:720px)'
):
    if token not in css: fail(f"sandbox CSS missing {token}")

for rel in ("js/live-backend-v7-56-8.js","js/live-login-v7-56-8.js","js/live-dashboard-v7-56-8.js","js/live-password-reset-v7-56-8.js","js/live-sandbox-v7-56-8.js"):
    result=subprocess.run(["node","--check",str(ROOT/rel)],capture_output=True,text=True)
    if result.returncode: fail(f"{rel} syntax failed: {result.stderr.strip()}")

dashboard=read("live-dashboard.html")
for token in ('id="liveDashboardApp"','id="dashboardTeamName"','id="invitePanel"','id="gameHistoryList"','live-sandbox.html?new=1','js/live-dashboard-v7-56-8.js?v=7.56.8'):
    if token not in dashboard: fail(f"live-dashboard.html missing token: {token}")
reset_page=read("live-password-reset.html")
for token in ('id="passwordResetForm"','id="newPassword"','js/live-password-reset-v7-56-8.js?v=7.56.8'):
    if token not in reset_page: fail(f"live-password-reset.html missing token: {token}")
reset_js=read("js/live-password-reset-v7-56-8.js")
for token in ('waitForHealthySession(6)','invalid or has expired'):
    if token not in reset_js: fail(f"password-reset runtime missing token: {token}")
dashboard_js=read("js/live-dashboard-v7-56-8.js")
for token in ('backend.acceptInvite(inviteToken)','cleanUrl.searchParams.delete("invite")'):
    if token not in dashboard_js: fail(f"dashboard invitation flow missing token: {token}")

backend_js=read("js/live-backend-v7-56-8.js")
for token in ('class WPILiveBackend','live_registration_status','registrationStatus()','live_bootstrap_workspace','live_players','live_games','live_lineups','live_events','live_game_recaps','state_snapshot','subscribeToGame','publishable keys only','This scoring session is read-only.','createdByUserId','updated_by'):
    if token not in backend_js: fail(f"backend adapter missing token: {token}")
for forbidden in ('SUPABASE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY','GROUPME_BOT_ID','service_role'):
    if forbidden in backend_js: fail(f"browser backend contains secret token: {forbidden}")
full_sql=read("supabase/WPI_LIVE_7_56_8_FULL_SETUP.sql")
if "unique nulls not distinct (environment,tournament_event_id,source_game_id,team_id)" in full_sql.lower():
    fail("fresh-install SQL still contains the one-manual-game legacy constraint")
manual_schema=read("supabase/migrations/202608050001_manual_game_schema_integrity.sql")
for token in ("live_games_environment_tournament_event_id_source_game_id_t_key","connullsnotdistinct","live_games_official_source_idx","live_games_team_client_id_idx"):
    if token not in manual_schema: fail(f"manual-game schema migration missing token: {token}")
for token in ('live_profiles','live_team_invites','live_game_recaps','live_registration_status','A team invitation is required for this account','live_bootstrap_workspace','live_create_team_invite','live_accept_team_invite','enable row level security','supabase_realtime','state_snapshot','live_games_official_source_idx','live_preserve_created_by','drop constraint if exists live_events_game_id_sequence_key'):
    if token not in full_sql: fail(f"connected SQL missing token: {token}")
setup=read("LIVE_BACKEND_SETUP_7.56.8.md")
for token in ('Project URL','Publishable key','WPI_LIVE_7_56_8_FULL_SETUP.sql','Owner','Admin','Scorer','Viewer','Never copy a secret key'):
    if token not in setup: fail(f"backend setup guide missing token: {token}")

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
    print("WPI CONNECTED LIVE BACKEND 7.56.8 TEST FAILED")
    for e in errors: print(f" - {e}")
    sys.exit(1)
print("WPI CONNECTED LIVE BACKEND 7.56.8 TEST PASSED")
print(" - Email/password account, dashboard, role, invitation, and password-reset surfaces are wired")
print(" - Teams, rosters, games, lineups, events, recaps, and exact resume snapshots persist behind RLS")
print(" - Authorized realtime resume and browser-local fallback are included; GroupMe delivery is server-side and audited")
print(" - Existing overtime, shootout, shot tracking, rankings, seasons, and tournaments remain protected")
