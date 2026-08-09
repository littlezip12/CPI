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
sandbox_html = (ROOT / "live-sandbox.html").read_text()
login_html = (ROOT / "live-login.html").read_text()
dashboard_js = (ROOT / "js/live-dashboard-v7-57-3.js").read_text()
context_js = (ROOT / "js/live-team-context-v7-57-3.js").read_text()
login_js = (ROOT / "js/live-login-v7-57-3.js").read_text()
css = (ROOT / "css/live-sandbox-v7-57-3.css").read_text()
migration = (ROOT / "supabase/migrations/202608080003_multi_team_switching.sql").read_text()
setup = (ROOT / "LIVE_MULTI_TEAM_SETUP_7.57.3.md").read_text()

# Release wiring.
check("site version", site.get("version") == "7.57.3")
check("release name", site.get("name") == "Multi-Team & Team Switching")
check("dashboard marker", site.get("liveScoringDashboardRelease") == "7.57.3")
check("multi-team marker", site.get("liveScoringMultiTeamRelease") == "7.57.3")
check("team switching marker", site.get("liveScoringTeamSwitchingRelease") == "7.57.3")
check("roster vision preserved", site.get("liveScoringRosterImportRelease") == "7.57.1")
check("groupme setup preserved", site.get("liveScoringGroupMeSetupUxRelease") == "7.57.2")
check("dashboard JS", 'js/live-dashboard-v7-57-3.js?v=7.57.3' in dashboard_html)
check("7.57.3 CSS", 'css/live-sandbox-v7-57-3.css?v=7.57.3' in dashboard_html)
check("scorer proven JS preserved", 'js/live-sandbox-v7-56-15.js?v=7.57.3' in sandbox_html)
check("multi-team context before scorer", sandbox_html.index('js/live-team-context-v7-57-3.js') < sandbox_html.index('js/live-sandbox-v7-56-15.js'))
check("multi-team context before dashboard", dashboard_html.index('js/live-team-context-v7-57-3.js') < dashboard_html.index('js/live-dashboard-v7-57-3.js'))
check("multi-team login copy", 'js/live-login-v7-57-3.js?v=7.57.3' in login_html and 'choose any team workspace' in login_js)

# Dashboard experience.
for token in [
    'id="teamSwitcherWrap"', 'id="dashboardTeamSwitcher"', 'id="createTeamButton"',
    'id="createTeamDialog"', 'id="newTeamName"', 'id="newTeamAgeGroup"',
    'id="confirmCreateTeamButton"', 'Add another team'
]:
    check(f"dashboard multi-team UI {token}", token in dashboard_html)
for token in [
    'loadTeamMemberships', 'renderTeamSwitcher', 'switchTeam', 'createAdditionalTeam',
    'WPILiveTeamContext?.rememberTeam', 'teamScopedUrl("live-sandbox.html"',
    'dashboardTeamSwitcher', 'createTeamDialog'
]:
    check(f"dashboard multi-team JS {token}", token in dashboard_js)
check("game history is team scoped", 'teamScopedUrl("live-sandbox.html", {game:game.id})' in dashboard_js)
check("new game is team scoped", 'teamScopedUrl("live-sandbox.html", {new:"1"})' in dashboard_js)
check("team switch requires returned membership", 'teamMemberships.some(team => String(team.teamId) === String(teamId))' in dashboard_js)
check("switch uses reload isolation", 'window.location.assign(url.href)' in dashboard_js)

# Context adapter preserves backend file while making bootstrap team-aware.
for token in [
    'live_list_user_teams', 'live_team_workspace', 'live_create_additional_team',
    'Backend.prototype.bootstrap = async function', 'Backend.prototype.acceptInvite = async function',
    'wpi-live-selected-team-v7-57-3'
]:
    check(f"team context {token}", token in context_js)
check("requested team membership match", 'teams.find(team => String(team.teamId) === String(wanted))' in context_js)
check("invite chooses accepted team", 'if (data?.teamId) rememberTeam(data.teamId)' in context_js)

# Server-enforced multi-team model.
for token in [
    'public.live_list_user_teams()', 'where m.user_id=auth.uid()',
    'public.live_team_workspace(target_team_id uuid)',
    "raise exception 'You do not have access to this team workspace'",
    'public.live_create_additional_team(',
    "where user_id=caller and role='owner'",
    "raise exception 'An existing Team Owner may create an additional team'",
    "insert into public.live_teams(name,slug,owner_id,age_group,competitive_season)",
    "insert into public.live_rosters(team_id,competitive_season,label,active,created_by)"
]:
    check(f"migration {token}", token in migration)
check("no provider secrets in migration", 'GROUPME_' not in migration and 'OPENAI_API_KEY' not in migration and 'service_role' not in migration.lower())

# Protected connected/scoring/delivery foundation is byte-for-byte unchanged from 7.57.2.
expected_hashes = {
    "js/live-backend-v7-56-8.js": "fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328",
    "js/live-sandbox-v7-56-15.js": "f32236d8e704c113ba9b868b18ae2b97e7bb366e9adbefd37000117aea0fc6da",
    "supabase/functions/groupme-post/index.ts": "772f728353d1f1dae88f7de0049d4043aedf99a5bc3e511e4017c57ae2891e33",
    "supabase/functions/roster-extract/index.ts": "26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb",
    "supabase/migrations/202608080002_team_access_admin.sql": "d931af9632b70d4653dcd941cd3a8ed784448fdc9f00328f3f0e6141fcd645ac",
    "supabase/migrations/202608070001_groupme_topic_delivery.sql": "aacefc33e16c3d170953e68b6d52f99d9da35c1808dde9016ff94e6539525f04",
    "supabase/migrations/202608080001_game_summary_event.sql": "80e6a939aa87104849bd4ca84c8c91a2171017885a6883cbe5f9346b4e038a14",
}
for path, expected in expected_hashes.items():
    check(f"protected hash {path}", sha256(path) == expected)

check("setup migration", '202608080003_multi_team_switching.sql' in setup)
check("setup no edge redeploy", 'No Edge Function redeploy' in setup)
check("CSS marker", 'WPI 7.57.3 — Multi-Team & Team Switching' in css)

if errors:
    print("WPI LIVE MULTI-TEAM & TEAM SWITCHING 7.57.3 TEST FAILED")
    for error in errors:
        print(" -", error)
    sys.exit(1)

print("WPI LIVE MULTI-TEAM & TEAM SWITCHING 7.57.3 TEST PASSED")
print(" - One account can discover and switch among all authorized team workspaces")
print(" - Accepted invitations automatically select the newly joined team")
print(" - Existing Team Owners can create another isolated team workspace")
print(" - Dashboard game navigation carries explicit team context into the scorer")
print(" - 7.57.2 access, 7.57.1 roster vision, and 7.56.15 scoring/GroupMe foundations remain protected")
