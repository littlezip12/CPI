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
if site.get("version")!="7.56.0": fail("site version must be 7.56.0")
for key in (
    "liveScoringSandboxRelease","liveScoringAuthGatewayRelease","liveScoringMobileWorkflowRelease",
    "liveScoringLineupWorkflowRelease","liveScoringRosterRelease","liveScoringQuarterFlowRelease",
    "liveScoringResetRelease","liveScoringManualControlsRelease","liveScoringExtraTimeRelease",
    "liveScoringShootoutRelease"
):
    if site.get(key)!="7.56.0": fail(f"{key} must be 7.56.0")
if site.get("liveScoringBackendBlueprintRelease")!="7.55.2": fail("backend blueprint must remain 7.55.2")

login=read("live-login.html")
for token in (
    'name="robots" content="noindex,nofollow,noarchive"',
    'id="signInTab"','id="signUpTab"','id="loginForm"','id="continueDemoButton"',
    'config/live-sandbox.js?v=7.56.0','js/live-login-v7-56-0.js?v=7.56.0',
    'css/live-sandbox-v7-56-0.css?v=7.56.0'
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
    'config/live-sandbox.js?v=7.56.0','js/live-sandbox-v7-56-0.js?v=7.56.0',
    'css/live-sandbox-v7-56-0.css?v=7.56.0'
):
    if token not in html: fail(f"live-sandbox.html missing token: {token}")
for forbidden in ('id="startQuarterButton"','id="startNextQuarterButton"'):
    if forbidden in html: fail(f"live-sandbox.html retains removed control: {forbidden}")
if html.find('id="endQuarterButton"') < html.find('id="recordEventButton"'):
    fail("End quarter must remain below Submit play")

for rel in ("index.html","rankings.html","teams.html","clubs.html","tournaments.html","js/site-shell.js"):
    text=read(rel)
    if "live-sandbox.html" in text or "live-login.html" in text: fail(f"{rel} publicly links private pilot")

config=read("config/live-sandbox.js")
for token in ('release: "7.56.0"','mode: "demo"','environment: "sandbox"','groupMeDelivery: "mock"'):
    if token not in config: fail(f"sandbox config missing {token}")
for forbidden in ("service_role","GROUPME_BOT_ID:","bot_id:","password:"):
    if forbidden.lower() in config.lower(): fail(f"public config contains secret-like token: {forbidden}")

metadata=json.loads(read("data/live-sandbox/event-types.json") or "{}")
if metadata.get("release")!="7.56.0" or metadata.get("environment")!="sandbox": fail("event registry release/environment mismatch")
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

login_js=read("js/live-login-v7-56-0.js")
for token in ('signInWithPassword','signUp','wpi-live-auth-v7-56-0','wpi-live-auth-v7-55-9','live-sandbox.html'):
    if token not in login_js: fail(f"login runtime missing token: {token}")

js=read("js/live-sandbox-v7-56-0.js")
for token in (
    'const RELEASE = "7.56.0"','wpi-live-sandbox-v7-56-0','wpi-live-sandbox-v7-55-9',
    'function openPostPeriodDialog','function startOvertime','function startShootout',
    'shot_missed','shot_post','shot_blocked','shot_saved','teamShotDelta','opponentShotDelta','opponentFieldBlockDelta','opponentSaveDelta','overtimeMultiplePeriods',
    'function recordShootoutAttempt','function renderShootoutPanel',
    'shootout_goal','shootout_miss','teamDelta:goal && side === "team" ? 0.1 : 0',
    'opponentDelta:goal && side === "opponent" ? 0.1 : 0','displayScore','recalculateShootout',
    'state.game.shootout.nextTeam','Submit play'
):
    if token not in js: fail(f"sandbox runtime missing token: {token}")
for forbidden in ('api.groupme.com','GROUPME_BOT_ID','$('+'"startQuarterButton"'+')'):
    if forbidden in js: fail(f"sandbox runtime contains removed or secret token: {forbidden}")
record_slice=js[js.find('function recordSelectedEvent'):js.find('function undoLastEvent')]
if 'confirm(' in record_slice: fail("play submission must remain immediate")

css=read("css/live-sandbox-v7-56-0.css")
for token in (
    '.live-end-quarter-secondary','.live-end-game-primary','.live-game-controls',
    '.live-shootout-panel','.live-post-period-dialog','.live-shootout-actions','@media (max-width:720px)'
):
    if token not in css: fail(f"sandbox CSS missing {token}")

for rel in ("js/live-login-v7-56-0.js","js/live-sandbox-v7-56-0.js"):
    result=subprocess.run(["node","--check",str(ROOT/rel)],capture_output=True,text=True)
    if result.returncode: fail(f"{rel} syntax failed: {result.stderr.strip()}")

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
    print("WPI LIVE SCORING OVERTIME / SHOOTOUT 7.56.0 TEST FAILED")
    for e in errors: print(f" - {e}")
    sys.exit(1)
print("WPI LIVE SCORING OVERTIME / SHOOTOUT 7.56.0 TEST PASSED")
print(" - Q4 offers End game, 1–3 minute single/multiple overtime, or shootout")
print(" - Four offensive non-goal shot outcomes track the Lamorinda shooter; opponent defensive credits remain team-level")
print(" - Shootouts alternate teams, auto-record goal/miss, support undo, and use decimal scoring")
print(" - Existing roster, lineup, reset, season, ranking, and tournament protections remain intact")
