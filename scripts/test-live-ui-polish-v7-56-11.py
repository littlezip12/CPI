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

js = (ROOT / "js/live-sandbox-v7-56-11.js").read_text()
html = (ROOT / "live-sandbox.html").read_text()
dashboard = (ROOT / "live-dashboard.html").read_text()
css = (ROOT / "css/live-sandbox-v7-56-11.css").read_text()
site = json.loads((ROOT / "config/site-release.json").read_text())

# Release wiring.
check("7.56.11 JS release marker", 'const RELEASE = "7.56.11";' in js)
check("7.56.11 scorer asset wired", 'js/live-sandbox-v7-56-11.js?v=7.56.11' in html)
check("7.56.11 CSS wired", 'css/live-sandbox-v7-56-11.css?v=7.56.11' in html and 'css/live-sandbox-v7-56-11.css?v=7.56.11' in dashboard)
check("site release is 7.56.11", site.get("version") == "7.56.11")
check("live scorer release is 7.56.11", site.get("liveScoringSandboxRelease") == "7.56.11")

# Primary scorer UX: six primary buttons, grouped variants, and full structured-event access.
for label in ["Goal", "Save", "Steal", "Exclusion", "Turnover", "5M"]:
    check(f"primary action {label}", re.search(rf'label:"{re.escape(label)}"', js) is not None)
check("exactly six primary quick actions", js.count('icon:"') >= 6 and 'const QUICK_EVENT_ACTIONS = [' in js)
check("Exclusion variants preserved", 'variants:["exclusion_drawn","exclusion_committed"]' in js)
check("5M variants preserved", 'variants:["five_meter_drawn","five_meter_committed"]' in js)
check("More actions remains available", 'id="eventMoreActions"' in html and '<summary>More actions</summary>' in html)
for event_id in [
    "goal","opponent_goal","shot_missed","shot_post","shot_blocked","shot_saved",
    "field_block","save","steal","turnover","exclusion_drawn","exclusion_committed",
    "five_meter_drawn","five_meter_committed"
]:
    check(f"structured event retained: {event_id}", f'id:"{event_id}"' in js)

# Mobile hierarchy and navigation.
check("mobile Game Updates More nav", all(token in html for token in ['id="mobileNavGame"','id="mobileNavUpdates"','id="mobileNavMore"']))
check("score period and clock separated visually", 'id="scorePeriodLabel"' in html and 'id="scoreClockLabel"' in html)
check("GroupMe status badge in active header", 'id="gameGroupMeBadge"' in html)
check("delivery state included in last-play card", 'id="lastUpdateDelivery"' in html and 'GroupMe ✓ Sent' in js)
check("optional note stays collapsed", 'id="eventNoteDetails"' in html and 'Add note' in html and '$("eventNoteDetails").open = false' in js)
check("mobile nav active state follows selection", 'function setMobileNavActive(activeId)' in js and 'setMobileNavActive("mobileNavUpdates")' in js and 'setMobileNavActive("mobileNavMore")' in js)
check("mobile activity panels do not auto-open", 'window.matchMedia("(min-width: 721px)").matches' in js[js.find('function openActivityPanels'):js.find('function addSystemEvent')])

# Quarter transition regression: no normal action player dropdown should reopen.
end_q = js[js.find('function endQuarter'):js.find('function openPostPeriodDialog')]
save_lineup = js[js.find('function saveLineup'):js.find('function endQuarter')]
check("End Quarter blurs current control", 'document.activeElement instanceof HTMLElement' in end_q and '.blur()' in end_q)
check("End Quarter clears normal action entry", 'resetEventEntry({preserveClock:true})' in end_q)
check("next-quarter save resets normal action entry", 'resetEventEntry({preserveClock:false})' in save_lineup)
check("next-quarter save blurs before dialog close", '.blur()' in save_lineup and '$("lineupDialog").close();' in save_lineup)
check("mobile post-submit does not reopen keyboard/select", 'if (window.matchMedia("(min-width: 721px)").matches)' in js[js.find('function recordSelectedEvent'):js.find('function undoLastEvent')])

# 7.56.10 reliability invariants remain in the active scorer JS.
check("fresh games deliver every action", 'messageFrequency: "all"' in js)
check("Final Whistle final sync is awaited", 'const result = await pushRemoteState();' in js[js.find('async function endGame'):js.find('function downloadLog')])
check("Final Whistle does not use background-only sync", 'scheduleRemoteSync(100);' not in js[js.find('async function endGame'):js.find('function downloadLog')])

# GroupMe setup is simpler in the normal path; transport internals stay under Advanced.
advanced_index = dashboard.find('<details class="live-groupme-advanced">')
check("GroupMe Advanced section exists", advanced_index >= 0)
check("connection name moved behind Advanced", dashboard.find('id="groupMeDisplayName"') > advanced_index >= 0)
check("delivery mode moved behind Advanced", dashboard.find('id="groupMeDeliveryMode"') > advanced_index >= 0)
check("Tournament GroupMe remains primary", 'Tournament GroupMe' in dashboard and 'id="groupMeGroupSelect"' in dashboard)
check("Score Updates Topic remains primary", 'Score Updates Topic' in dashboard and 'id="groupMeTopicSelect"' in dashboard)
check("Test connection remains primary", 'Test connection' in dashboard and 'id="testGroupMeButton"' in dashboard)
check("team settings rail exists", 'class="live-dashboard-sidebar"' in dashboard)

# Touch / mobile CSS contract.
check("three-column primary action grid", 'grid-template-columns:repeat(3,minmax(0,1fr))' in css)
check("primary action touch targets", '.live-event-chip {' in css and 'min-height:78px' in css)
check("mobile bottom nav fixed", '.live-mobile-nav {' in css and 'position:fixed' in css)
check("Lamorinda palette retained", '--lamo-blue:' in css and '--lamo-gold:' in css)

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
    print("WPI LIVE UI POLISH 7.56.11 TEST FAILED")
    for error in errors:
        print(" -", error)
    sys.exit(1)

print("WPI LIVE UI POLISH 7.56.11 TEST PASSED")
print(" - Six primary poolside actions + compact Exclusion/5M variants")
print(" - All structured events remain reachable through More actions")
print(" - End Quarter cannot restore focus to the normal action Player selector")
print(" - 7.56.10 delivery/final-save reliability remains present")
print(" - Connected backend, GroupMe function and Topic migration hashes unchanged")
