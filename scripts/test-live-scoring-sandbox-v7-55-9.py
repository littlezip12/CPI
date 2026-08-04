#!/usr/bin/env python3
from pathlib import Path
import hashlib, json, re, subprocess, sys

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
if site.get("version")!="7.55.9": fail("site version must be 7.55.9")
for key in (
    "liveScoringSandboxRelease","liveScoringAuthGatewayRelease","liveScoringMobileWorkflowRelease",
    "liveScoringLineupWorkflowRelease","liveScoringRosterRelease","liveScoringQuarterFlowRelease",
    "liveScoringResetRelease","liveScoringManualControlsRelease"
):
    if site.get(key)!="7.55.9": fail(f"{key} must be 7.55.9")
if site.get("liveScoringBackendBlueprintRelease")!="7.55.2": fail("backend blueprint must remain 7.55.2")

login=read("live-login.html")
for token in (
    'name="robots" content="noindex,nofollow,noarchive"',
    'id="signInTab"','id="signUpTab"','id="loginForm"','id="continueDemoButton"',
    'config/live-sandbox.js?v=7.55.9','js/live-login-v7-55-9.js?v=7.55.9',
    'css/live-sandbox-v7-55-9.css?v=7.55.9'
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
    '<summary>Manual controls</summary>','id="gameControlsDetails"',
    'id="editCurrentLineupButton"','Edit starters','id="showSetupButton"','Edit roster or setup',
    'id="pauseMessagesButton"','id="scoreCorrectionButton"',
    'id="endGameButton" class="live-end-game-primary"','End game and build recap',
    'id="messageDetails" open','id="timelineDetails" open',
    'id="resetSandboxTopButton"','id="resetSandboxGameButton"','id="resetSandboxButton"',
    'config/live-sandbox.js?v=7.55.9','js/live-sandbox-v7-55-9.js?v=7.55.9',
    'css/live-sandbox-v7-55-9.css?v=7.55.9'
):
    if token not in html: fail(f"live-sandbox.html missing token: {token}")
for forbidden in ('id="addNoteButton"','Record a play','<summary>Game controls</summary>','id="startQuarterButton"','id="startNextQuarterButton"'):
    if forbidden in html: fail(f"live-sandbox.html retains removed control/copy: {forbidden}")
# End quarter must follow Submit play, not sit beside the time field.
if html.find('id="endQuarterButton"') < html.find('id="recordEventButton"'):
    fail("End quarter must appear below Submit play")
if html.find('id="endGameButton"') > html.find('id="messageDetails"'):
    fail("End game must remain inside Manual controls before the GroupMe log")

for rel in ("index.html","rankings.html","teams.html","clubs.html","tournaments.html","js/site-shell.js"):
    text=read(rel)
    if "live-sandbox.html" in text or "live-login.html" in text: fail(f"{rel} publicly links private pilot")

config=read("config/live-sandbox.js")
for token in ('release: "7.55.9"','mode: "demo"','environment: "sandbox"','groupMeDelivery: "mock"'):
    if token not in config: fail(f"sandbox config missing {token}")
for forbidden in ("service_role","GROUPME_BOT_ID:","bot_id:","password:"):
    if forbidden.lower() in config.lower(): fail(f"public config contains secret-like token: {forbidden}")

metadata=json.loads(read("data/live-sandbox/event-types.json") or "{}")
if metadata.get("release")!="7.55.9" or metadata.get("environment")!="sandbox": fail("event registry release/environment mismatch")
workflow=metadata.get("mobileWorkflow",{})
expect={
    "sectionHeading":"Time of play",
    "notesExpandedByDefault":True,
    "endQuarterPlacement":"below_submit",
    "endQuarterPresentation":"compact_secondary",
    "manualControlsLabel":"Manual controls",
    "manualControlsCollapsedByDefault":True,
    "endGamePlacement":"manual_controls_before_activity_logs",
    "submitLabel":"Submit play",
    "confirmationStep":False,
}
for key,value in expect.items():
    if workflow.get(key)!=value: fail(f"mobileWorkflow {key} mismatch")
if workflow.get("activityPanelsAutoOpen") != ["groupme_play_log","game_timeline"]:
    fail("activity panels must auto-open for GroupMe and WPI timeline")
if workflow.get("postSubmitPreserve") != ["time_remaining","quarter"]: fail("time and quarter must persist")
if metadata.get("lineupRules",{}).get("12U",{}).get("totalStarters")!=6: fail("12U lineup rule changed")
if metadata.get("lineupRules",{}).get("14U",{}).get("totalStarters")!=7: fail("14U lineup rule changed")

login_js=read("js/live-login-v7-55-9.js")
for token in ('signInWithPassword','signUp','wpi-live-auth-v7-55-9','wpi-live-auth-v7-55-8','live-sandbox.html'):
    if token not in login_js: fail(f"login runtime missing token: {token}")

js=read("js/live-sandbox-v7-55-9.js")
for token in (
    'const RELEASE = "7.55.9"','wpi-live-sandbox-v7-55-9','wpi-live-sandbox-v7-55-8',
    'parseClock','clockTime','eventType','primaryPlayer','assistPlayer','Unassisted',
    'function openActivityPanels()','$("messageDetails").open = true','$("timelineDetails").open = true',
    '$("eventNoteLabel").hidden = false','function endQuarter()','function resetSandbox()',
    'function addRosterPlayer()','Lamorinda A 14U Boys','Submit play'
):
    if token not in js: fail(f"sandbox runtime missing token: {token}")
for forbidden in ('$("addNoteButton")','api.groupme.com','GROUPME_BOT_ID','$("startQuarterButton")','$("startNextQuarterButton")'):
    if forbidden in js: fail(f"sandbox runtime contains removed or secret token: {forbidden}")
record_slice=js[js.find('function recordSelectedEvent'):js.find('function undoLastEvent')]
if 'confirm(' in record_slice: fail("play submission must remain immediate")

css=read("css/live-sandbox-v7-55-9.css")
for token in (
    '.live-end-quarter-secondary','.live-optional-label',
    '.live-game-controls-grid .live-end-game-primary',
    '.live-message-panel[open], .live-timeline-panel[open]',
    '@media (max-width:720px)'
):
    if token not in css: fail(f"sandbox CSS missing {token}")

for rel in ("js/live-login-v7-55-9.js","js/live-sandbox-v7-55-9.js"):
    result=subprocess.run(["node","--check",str(ROOT/rel)],capture_output=True,text=True)
    if result.returncode: fail(f"{rel} syntax failed: {result.stderr.strip()}")

# Historical data remains immutable.
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
    print("WPI LIVE SCORING SANDBOX 7.55.9 TEST FAILED")
    for e in errors: print(f" - {e}")
    sys.exit(1)
print("WPI LIVE SCORING SANDBOX 7.55.9 TEST PASSED")
print(" - Time of play and always-visible notes simplify the active scorer")
print(" - End quarter is compact and placed below Submit play")
print(" - GroupMe and WPI activity panels open automatically after plays")
print(" - Manual controls remain collapsed with End game before the activity logs")
print(" - Rankings, clubs, lineups, reset behavior, and mock-delivery isolation remain protected")
