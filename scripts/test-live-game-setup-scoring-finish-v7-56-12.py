#!/usr/bin/env python3
from pathlib import Path
import hashlib, json, re, sys

ROOT = Path(__file__).resolve().parents[1]
errors = []

def check(name, condition):
    if not condition:
        errors.append(name)

def sha256(path):
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()

js = (ROOT / "js/live-sandbox-v7-56-12.js").read_text()
html = (ROOT / "live-sandbox.html").read_text()
dashboard = (ROOT / "live-dashboard.html").read_text()
handoff = (ROOT / "live-scorer-handoff.html").read_text()
css = (ROOT / "css/live-sandbox-v7-56-12.css").read_text()
site = json.loads((ROOT / "config/site-release.json").read_text())

# Release wiring.
check("7.56.12 JS release marker", 'const RELEASE = "7.56.12";' in js)
check("7.56.12 scorer asset wired", 'js/live-sandbox-v7-56-12.js?v=7.56.12' in html)
check("7.56.12 CSS wired", 'css/live-sandbox-v7-56-12.css?v=7.56.12' in html and 'css/live-sandbox-v7-56-12.css?v=7.56.12' in dashboard)
check("site release is 7.56.12", site.get("version") == "7.56.12")
check("live scorer release is 7.56.12", site.get("liveScoringSandboxRelease") == "7.56.12")
check("mobile workflow release is 7.56.12", site.get("liveScoringMobileWorkflowRelease") == "7.56.12")
check("handoff UX release is 7.56.12", site.get("liveScoringHandoffUxRelease") == "7.56.12")

# Pregame setup: three short steps, technical options secondary.
for text in ["Match details", "Roster", "Starting lineup"]:
    check(f"guided setup step {text}", text in html)
check("setup preferences secondary", 'class="live-setup-advanced"' in html and 'Scoring &amp; delivery preferences' in html)
advanced_index = html.find('class="live-setup-advanced"')
check("GroupMe field is inside secondary setup", html.find('id="groupMeName"') > advanced_index >= 0)
check("start game CTA simplified", 'Choose starters &amp; start game' in html)

# Poolside primary UX is preserved and tightened.
for label in ["Goal", "Save", "Steal", "Exclusion", "Turnover", "5M"]:
    check(f"primary action {label}", re.search(rf'label:"{re.escape(label)}"', js) is not None)
check("More actions remains available", 'id="eventMoreActions"' in html and '<summary>More actions</summary>' in html)
for event_id in [
    "goal","opponent_goal","shot_missed","shot_post","shot_blocked","shot_saved",
    "field_block","save","steal","turnover","exclusion_drawn","exclusion_committed",
    "five_meter_drawn","five_meter_committed"
]:
    check(f"structured event retained: {event_id}", f'id:"{event_id}"' in js)
check("Save defaults current goalie", 'type?.id === "save"' in js and 'goalieForQuarter(state.game.quarter)' in js)
check("Save goalie remains editable", '$("primaryPlayer").value = currentGoalie' in js and '$("primaryPlayer").disabled = !requiresPlayer' in js)
check("mobile event selection does not auto-focus player", 'moveForward && requiresPlayer && window.matchMedia("(min-width: 721px)").matches' in js)

# Quarter transition is explicit and cannot reopen the action player selector.
check("quarter transition score summary exists", 'id="lineupTransitionSummary"' in html and 'Q1 complete' not in html)
open_lineup = js[js.find('function openLineupDialog'):js.find('function shouldCreateMessage')]
check("quarter transition summary populated", 'transition.innerHTML' in open_lineup and 'complete</strong>' in open_lineup)
check("next quarter button is short", '`Start ${quarterText(pendingLineupQuarter)}`' in open_lineup)
end_q = js[js.find('function endQuarter'):js.find('function openPostPeriodDialog')]
check("End Quarter still blurs current control", 'document.activeElement instanceof HTMLElement' in end_q and '.blur()' in end_q)
check("End Quarter still clears normal entry", 'resetEventEntry({preserveClock:true})' in end_q)

# Handoff is a clear waiting -> accepted experience, with concise prior-device state.
check("handoff waiting state present", 'id="scorerHandoffState"' in html and 'Waiting for new scorer' in html)
check("handoff state helper present", 'function setHandoffState' in js)
check("handoff accepted confirmation", 'has taken control' in js and '"accepted"' in js)
check("read-only copy simplified", 'is scoring. You’re viewing only.' in js)
check("guest handoff page simplified", 'Scorer code' in handoff and 'Open game' in handoff)

# Dashboard focus.
check("game day card emphasized", 'class="live-panel live-game-day-card"' in dashboard)
check("game day copy simplified", 'Ready to score?' in dashboard and 'Start a new game' in dashboard)
check("GroupMe setup remains simple", all(token in dashboard for token in ['Tournament GroupMe','Score Updates Topic','Test connection','Save &amp; use for new games']))

# Mobile CSS contract and Lamorinda identity.
check("guided setup CSS", '.live-setup-step-head' in css and '.live-launch-step' in css)
check("quarter transition CSS", '.live-lineup-transition-summary' in css)
check("handoff state CSS", '.live-handoff-state' in css and '[data-state="accepted"]' in css)
check("six-button grid still three columns", 'grid-template-columns:repeat(3,minmax(0,1fr))' in css)
check("mobile bottom nav preserved", '.live-mobile-nav {' in css and 'position:fixed' in css)
check("Lamorinda palette retained", '--lamo-blue:' in css and '--lamo-gold:' in css)

# 7.56.10/11 reliability invariants remain in the active scorer JS.
check("fresh games deliver every action", 'messageFrequency: "all"' in js)
end_game = js[js.find('async function endGame'):js.find('function downloadLog')]
check("Final Whistle final sync is awaited", 'const result = await pushRemoteState();' in end_game)
check("Final Whistle is not background-only", 'scheduleRemoteSync(100);' not in end_game)
check("one active scorer UI retained", 'scorerControl?.canScore' in js and 'readOnlyScorer' in js)

# Protected connected backend and server delivery assets are byte-for-byte unchanged.
expected_hashes = {
    "js/live-backend-v7-56-8.js": "fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328",
    "supabase/functions/groupme-post/index.ts": "42d994906dafba551681d69fd7d35b1d0e83a5a88de25c1563cb697b4b834777",
    "supabase/migrations/202608070001_groupme_topic_delivery.sql": "aacefc33e16c3d170953e68b6d52f99d9da35c1808dde9016ff94e6539525f04",
    "supabase/WPI_LIVE_7_56_8_FULL_SETUP.sql": "b8b51402aa944039125a325bd5e811b9ba4cce6af6a44e21cd0860c06dc39db4",
    "js/live-dashboard-v7-56-9.js": "8b35d994d0bb8359bc65c0c6107f36e79ec084b9c98dfd4a29b14dc7f1a4609d",
    "js/live-scorer-handoff-v7-56-9.js": "4c6a32992f861042f8be857363c2c582c6e0fdb2de4f7ebd9e61077f4f4a3e92",
}
for path, expected in expected_hashes.items():
    check(f"protected hash {path}", sha256(path) == expected)

if errors:
    print("WPI LIVE GAME SETUP & SCORING FINISH 7.56.12 TEST FAILED")
    for error in errors:
        print(" -", error)
    sys.exit(1)

print("WPI LIVE GAME SETUP & SCORING FINISH 7.56.12 TEST PASSED")
print(" - Guided Match details -> Roster -> Starting lineup setup")
print(" - Save smart-selects the current goalie but remains editable")
print(" - Phone event selection never auto-opens the action Player selector")
print(" - Quarter transition shows prior-quarter score before next starters")
print(" - Scorer handoff exposes clear Waiting -> Accepted states")
print(" - 7.56.10/11 delivery, scorer-control and Final Whistle reliability remain protected")
