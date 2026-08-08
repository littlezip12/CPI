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

js = (ROOT / "js/live-sandbox-v7-56-13.js").read_text()
html = (ROOT / "live-sandbox.html").read_text()
dashboard = (ROOT / "live-dashboard.html").read_text()
css = (ROOT / "css/live-sandbox-v7-56-13.css").read_text()
site = json.loads((ROOT / "config/site-release.json").read_text())
summary_migration = (ROOT / "supabase/migrations/202608080001_game_summary_event.sql").read_text()

# Release wiring.
check("7.56.13 JS marker", 'const RELEASE = "7.56.13";' in js)
check("7.56.13 scorer asset", 'js/live-sandbox-v7-56-13.js?v=7.56.13' in html)
check("7.56.13 CSS scorer asset", 'css/live-sandbox-v7-56-13.css?v=7.56.13' in html)
check("7.56.13 CSS dashboard asset", 'css/live-sandbox-v7-56-13.css?v=7.56.13' in dashboard)
check("site version 7.56.13", site.get("version") == "7.56.13")
check("live scorer marker 7.56.13", site.get("liveScoringSandboxRelease") == "7.56.13")
check("mobile workflow marker 7.56.13", site.get("liveScoringMobileWorkflowRelease") == "7.56.13")
check("persistence marker 7.56.13", site.get("liveScoringPersistenceRelease") == "7.56.13")
check("automatic summary marker 7.56.13", site.get("liveScoringAutomaticSummaryRelease") == "7.56.13")

# Direct poolside actions: no More actions drawer.
check("More actions drawer removed", 'id="eventMoreActions"' not in html and '<summary>More actions</summary>' not in html)
check("hidden event state retained", 'id="eventType"' in html and 'live-event-state-select' in html)
for label in ["Goals", "Shots", "Saves", "Steals", "Exclusions", "Turnover", "5M"]:
    check(f"direct action {label}", re.search(rf'label:"{re.escape(label)}"', js) is not None)
check("Goals has us/them", 'variants:["goal","opponent_goal"]' in js and 'goal:"Us"' in js and 'opponent_goal:"Them"' in js)
check("Shots exposes four outcomes", 'variants:["shot_missed","shot_post","shot_blocked","shot_saved"]' in js)
check("Saves preserves field block", 'variants:["save","field_block"]' in js and 'field_block:"Field block"' in js)
check("Exclusions retain drawn/committed", 'variants:["exclusion_drawn","exclusion_committed"]' in js)
check("5M retains drawn/committed", 'variants:["five_meter_drawn","five_meter_committed"]' in js)
for event_id in [
    "goal","opponent_goal","shot_missed","shot_post","shot_blocked","shot_saved",
    "field_block","save","steal","turnover","exclusion_drawn","exclusion_committed",
    "five_meter_drawn","five_meter_committed"
]:
    check(f"structured event retained: {event_id}", f'id:"{event_id}"' in js)
check("variant chooser handles four shot buttons", 'grid-template-columns:repeat(2,minmax(0,1fr))' in css)
check("mobile direct-action grid", '@media (max-width:720px)' in css and 'grid-template-columns:repeat(3,minmax(0,1fr))' in css)

# Automatic end-game summary through the persisted event delivery pipeline.
check("summary migration adds game_summary", "live_events_event_type_check" in summary_migration and "'game_summary'" in summary_migration)
check("summary migration is constraint-only", "create table" not in summary_migration.lower() and "create function" not in summary_migration.lower() and "alter table public.live_events" in summary_migration.lower())
check("GroupMe summary builder exists", 'function buildGroupMeSummary(stats)' in js)
check("summary contains final score", 'GAME SUMMARY' in js and 'state.game.teamScore' in js and 'state.game.opponentScore' in js)
for token in ['Shots ${stats.teamShots}', 'Goals ${stats.counts.goal || 0}', 'Assists ${assists}', 'Saves ${stats.counts.save || 0}', 'Steals ${stats.counts.steal || 0}', 'Turnovers ${stats.counts.turnover || 0}', 'Exclusions drawn ${stats.counts.exclusion_drawn || 0}', '5M drawn ${stats.counts.five_meter_drawn || 0}']:
    check(f"summary metric {token}", token in js)
check("summary is auditable system event", 'id:"game_summary", label:"Game summary", category:"game", priority:"major"' in js)
check("summary duplicate guard", 'activeEvents().find(event => event.type === "game_summary")' in js)
check("summary uses standard createMessage", 'createMessage(event, type);' in js[js.find('function ensureAutomaticGameSummary'):js.find('function renderSummary')])
check("summary formatter bypasses play wrapper", 'if (event.type === "game_summary") return event.note || "Game summary";' in js)

end_game = js[js.find('async function endGame'):js.find('function downloadLog')]
check("Final Whistle remains before summary creation", end_game.find('addSystemEvent("quarter_end", {note:"Final whistle"})') < end_game.find('ensureAutomaticGameSummary()'))
check("summary created before final remote sync", end_game.find('ensureAutomaticGameSummary()') < end_game.find('const result = await pushRemoteState();'))
check("final sync still awaited", 'const result = await pushRemoteState();' in end_game)
check("summary sent confirmation", 'Final saved · Summary sent' in end_game)
check("summary not last-play card", '"game_summary"].includes(event.type)' in js)

# Delivery order uses the existing chronological dispatch: messages are unshifted, then reversed for dispatch.
check("messages remain newest-first locally", 'state.game.messages.unshift({' in js)
check("delivery dispatch reverses to chronological order", 'for (const message of [...(state.game.messages || [])].reverse())' in js)

# Existing game-day reliability and UX invariants.
check("fresh game every action delivery", 'messageFrequency: "all"' in js)
check("Save defaults goalie", 'type?.id === "save"' in js and 'goalieForQuarter(state.game.quarter)' in js)
check("phone player selector does not auto-open", 'moveForward && requiresPlayer && window.matchMedia("(min-width: 721px)").matches' in js)
check("End Quarter clears normal entry", 'resetEventEntry({preserveClock:true})' in js[js.find('function endQuarter'):js.find('function openPostPeriodDialog')])
check("one active scorer UI retained", 'scorerControl?.canScore' in js and 'readOnlyScorer' in js)

# Protected connected backend and server delivery assets remain byte-for-byte unchanged.
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
    print("WPI LIVE GAME ACTIONS & AUTO SUMMARY 7.56.13 TEST FAILED")
    for error in errors:
        print(" -", error)
    sys.exit(1)

print("WPI LIVE GAME ACTIONS & AUTO SUMMARY 7.56.13 TEST PASSED")
print(" - Seven direct scoring buttons replace More actions")
print(" - Goals support Us/Them; Shots expose all outcomes")
print(" - Saves keeps both goalie saves and field blocks directly reachable")
print(" - Final Whistle is persisted before one automatic Game Summary event")
print(" - Summary uses the existing exactly-once GroupMe delivery/retry pipeline")
print(" - 7.56.12 scorer-control, final-save and backend delivery assets remain protected")
