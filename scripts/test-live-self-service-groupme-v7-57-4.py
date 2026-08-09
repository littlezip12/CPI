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

site = json.loads((ROOT / "config/site-release.json").read_text())
dashboard_html = (ROOT / "live-dashboard.html").read_text()
dashboard_js = (ROOT / "js/live-dashboard-v7-57-4.js").read_text()
adapter_js = (ROOT / "js/live-groupme-setup-v7-57-4.js").read_text()
css = (ROOT / "css/live-sandbox-v7-57-4.css").read_text()
edge = (ROOT / "supabase/functions/groupme-post/index.ts").read_text()
migration = (ROOT / "supabase/migrations/202608080004_self_service_groupme_setup.sql").read_text()

# Release wiring.
check("site version", site.get("version") == "7.57.4")
check("release name", site.get("name") == "Self-Service Tournament GroupMe Setup")
check("dashboard marker", site.get("liveScoringDashboardRelease") == "7.57.4")
check("groupme setup marker", site.get("liveScoringGroupMeSetupUxRelease") == "7.57.4")
check("multi-team preserved", site.get("liveScoringMultiTeamRelease") == "7.57.3")
check("team switching preserved", site.get("liveScoringTeamSwitchingRelease") == "7.57.3")
check("roster vision preserved", site.get("liveScoringRosterImportRelease") == "7.57.1")
check("dashboard JS wired", 'js/live-dashboard-v7-57-4.js?v=7.57.4' in dashboard_html)
check("groupme adapter wired", 'js/live-groupme-setup-v7-57-4.js?v=7.57.4' in dashboard_html)
check("adapter loads before dashboard", dashboard_html.index('js/live-groupme-setup-v7-57-4.js') < dashboard_html.index('js/live-dashboard-v7-57-4.js'))
check("7.57.4 CSS", 'css/live-sandbox-v7-57-4.css?v=7.57.4' in dashboard_html)

# Self-service UI: product concepts only, no technical secret controls.
for token in [
    'Self-service setup', 'Tournament GroupMe', 'Score Updates Topic',
    'Test connection', 'Use for new games', 'id="pauseGroupMeButton"',
    'there are no tokens or technical settings to manage here'
]:
    check(f"self-service UI {token}", token in dashboard_html)
check("no visible advanced groupme settings", '<details class="live-groupme-advanced">' not in dashboard_html)
check("no visible Supabase secret label", 'Supabase secret name' not in dashboard_html)
check("topic-only hidden mode", 'id="groupMeDeliveryMode" type="hidden" value="topic"' in dashboard_html)
check("hidden secret input has no value", 'id="groupMeSecretName" type="hidden" value=""' in dashboard_html)

# Browser flow requires exact-destination test before activation.
for token in [
    'groupMeSelectionMatchesDestination', 'renderGroupMeSetupProgress',
    'backend.prepareGroupMeDestination', 'backend.testGroupMeDestination',
    'backend.activateGroupMeDestination', 'backend.pauseGroupMeDestination',
    'Send a successful test message for this exact GroupMe and topic before activation.',
    'A game is live right now. Finish it before changing the GroupMe destination.'
]:
    check(f"dashboard logic {token}", token in dashboard_js)
check("legacy technical save removed from groupme flow", 'saveGroupMeDestination(' not in dashboard_js[dashboard_js.index('function currentGroupMeMode'):dashboard_js.index('function roleLabel')])
check("owner selects group", 'Only the Team Owner can choose or change the tournament GroupMe.' in dashboard_js)
check("delegated admin scope copy", 'The Team Owner approved the tournament GroupMe.' in dashboard_js)

# Backend adapter adds only setup RPCs, leaving the validated scorer backend untouched.
for token in [
    'live_prepare_groupme_destination_v3',
    'live_activate_groupme_destination_v3',
    'live_pause_groupme_destination_v3'
]:
    check(f"adapter RPC {token}", token in adapter_js)
check("adapter contains no provider credential", 'GROUPME_ACCESS_TOKEN_WPI_LIVE' not in adapter_js and 'secret_name' not in adapter_js)

# SQL safety model.
for token in [
    'public.live_prepare_groupme_destination_v3(',
    'public.live_activate_groupme_destination_v3(',
    'public.live_pause_groupme_destination_v3(',
    "raise exception 'Send a successful test message before activating score updates'",
    "raise exception 'Finish the active game before changing its GroupMe destination'",
    'public.live_guard_active_game_groupme_route()',
    "g.status='live'",
    "membership_groupme" if False else "caller_groupme"
]:
    check(f"migration {token}", token in migration)
check("activation preserves test", "set enabled=true" in migration and "last_test_status='not_tested'" not in migration[migration.index('live_activate_groupme_destination_v3'):migration.index('live_pause_groupme_destination_v3')])
check("server default stores only env name", "'GROUPME_ACCESS_TOKEN_WPI_LIVE'" in migration)
check("no credential value in migration", 'access_token=' not in migration.lower() and 'bot_id=' not in migration.lower())

# Edge Function no longer accepts a browser-selected secret name for discovery.
check("edge self-service marker", 'WPI 7.57.4' in edge)
check("edge default env name", 'environmentKey(existingDestination?.secret_name) || "GROUPME_ACCESS_TOKEN_WPI_LIVE"' in edge)
check("browser secret selection removed", 'requestedSecretName' not in edge)
check("generic one-time connection error", "protected GroupMe connection is not configured" in edge)
check("owner-only group browsing preserved", "Only the Team Owner may browse the connected GroupMe account's groups" in edge)
check("admin approved group restriction preserved", 'Admins may browse topics only inside the Team Owner-approved GroupMe' in edge)

# Protected scoring/roster/multi-team foundation remains byte-for-byte unchanged.
expected_hashes = {
    "js/live-backend-v7-56-8.js": "fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328",
    "js/live-sandbox-v7-56-15.js": "f32236d8e704c113ba9b868b18ae2b97e7bb366e9adbefd37000117aea0fc6da",
    "supabase/functions/roster-extract/index.ts": "26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb",
    "supabase/migrations/202608080003_multi_team_switching.sql": "4f95d9b700ca51b411fa8a9161c9689aa54f4cf73dd6f24df8bb59dbe2348918",
    "js/live-team-context-v7-57-3.js": "def547d5f29e409b972f3efe344f8d24ff9365792f85d43a30a9b19d0621f521",
}
for path, expected in expected_hashes.items():
    check(f"protected hash {path}", sha256(path) == expected)

check("CSS marker", 'WPI 7.57.4 — Self-Service Tournament GroupMe Setup' in css)

if errors:
    print("WPI LIVE SELF-SERVICE GROUPME 7.57.4 TEST FAILED")
    for error in errors:
        print(" -", error)
    sys.exit(1)

print("WPI LIVE SELF-SERVICE GROUPME 7.57.4 TEST PASSED")
print(" - GroupMe setup now exposes tournament GroupMe → topic → test → activate, without technical secret controls")
print(" - Owner retains group approval; delegated Admin remains restricted to topics inside that approved GroupMe")
print(" - A successful test is required before activation, and active-game destination routing is protected server-side")
print(" - New team workspaces can use the existing platform-managed GroupMe credential without entering a secret name")
print(" - 7.57.3 multi-team, 7.57.1 roster vision, and 7.56.15 scoring/summary foundations remain protected")
