#!/usr/bin/env python3
from pathlib import Path
import hashlib, json, sys

ROOT = Path(__file__).resolve().parents[1]
errors = []

def check(name, condition):
    if not condition:
        errors.append(name)

def sha256(path):
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()

js = (ROOT / "js/live-sandbox-v7-56-14.js").read_text()
html = (ROOT / "live-sandbox.html").read_text()
css = (ROOT / "css/live-sandbox-v7-56-14.css").read_text()
site = json.loads((ROOT / "config/site-release.json").read_text())
summary_migration = (ROOT / "supabase/migrations/202608080001_game_summary_event.sql").read_text()

# Release wiring.
check("7.56.14 JS marker", 'const RELEASE = "7.56.14";' in js)
check("7.56.14 scorer asset", 'js/live-sandbox-v7-56-14.js?v=7.56.14' in html)
check("7.56.14 scorer CSS", 'css/live-sandbox-v7-56-14.css?v=7.56.14' in html)
check("site version", site.get("version") == "7.56.14")
check("sandbox marker", site.get("liveScoringSandboxRelease") == "7.56.14")
check("mobile marker", site.get("liveScoringMobileWorkflowRelease") == "7.56.14")
check("automatic summary remains 7.56.13", site.get("liveScoringAutomaticSummaryRelease") == "7.56.13")
check("persistence remains 7.56.13", site.get("liveScoringPersistenceRelease") == "7.56.13")

# The visible redundant dropdown is structurally gone, not merely hidden by CSS.
check("event state is hidden input", '<input id="eventType" type="hidden" value="">' in html)
check("event type select removed", '<select id="eventType"' not in html)
check("render options no longer writes option HTML", '$("eventType").innerHTML' not in js)
check("seven direct actions retained", all(f'label:"{label}"' in js for label in ["Goals","Shots","Saves","Steals","Exclusions","Turnover","5M"]))

# Goal team choice uses the actual game names and has no static Us/Them labels.
check("team goal uses setup team name", 'if (eventId === "goal") return state.setup.teamName || "Our team";' in js)
check("opponent goal uses setup opponent", 'if (eventId === "opponent_goal") return state.setup.opponentName || "Opponent";' in js)
check("static Us removed", 'goal:"Us"' not in js)
check("static Them removed", 'opponent_goal:"Them"' not in js)
check("contextual goal prompt", 'return "Which team scored?"' in js)
check("variant name wrapping", 'text-wrap: balance' in css and 'white-space: normal' in css)

# All direct structured actions remain intact.
for event_id in [
    "goal","opponent_goal","shot_missed","shot_post","shot_blocked","shot_saved",
    "field_block","save","steal","turnover","exclusion_drawn","exclusion_committed",
    "five_meter_drawn","five_meter_committed"
]:
    check(f"structured event retained: {event_id}", f'id:"{event_id}"' in js)

# 7.56.13 automatic summary behavior remains intact.
check("game summary event retained", 'id:"game_summary", label:"Game summary", category:"game", priority:"major"' in js)
check("summary builder retained", 'function buildGroupMeSummary(stats)' in js)
check("summary migration retained", "'game_summary'" in summary_migration)
end_game = js[js.find('async function endGame'):js.find('function downloadLog')]
check("Final Whistle before summary", end_game.find('addSystemEvent("quarter_end", {note:"Final whistle"})') < end_game.find('ensureAutomaticGameSummary()'))
check("summary before final awaited sync", end_game.find('ensureAutomaticGameSummary()') < end_game.find('const result = await pushRemoteState();'))
check("final sync awaited", 'const result = await pushRemoteState();' in end_game)

# Protected connected backend/server assets remain byte-for-byte unchanged.
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
    print("WPI LIVE ACTION FLOW & TEAM LABELS 7.56.14 TEST FAILED")
    for error in errors:
        print(" -", error)
    sys.exit(1)

print("WPI LIVE ACTION FLOW & TEAM LABELS 7.56.14 TEST PASSED")
print(" - Redundant visible event dropdown is structurally removed")
print(" - Seven direct actions remain the only poolside event-selection path")
print(" - Goal choices use the actual team and opponent names")
print(" - 7.56.13 automatic Final Whistle -> Game Summary ordering remains intact")
print(" - Connected backend, GroupMe function and Topic migration hashes unchanged")
