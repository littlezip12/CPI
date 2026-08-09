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
html = (ROOT / "live-dashboard.html").read_text()
js = (ROOT / "js/live-dashboard-v7-57-2.js").read_text()
css = (ROOT / "css/live-sandbox-v7-57-2.css").read_text()
migration = (ROOT / "supabase/migrations/202608080002_team_access_admin.sql").read_text()
groupme_fn = (ROOT / "supabase/functions/groupme-post/index.ts").read_text()
roster_fn = (ROOT / "supabase/functions/roster-extract/index.ts").read_text()
sandbox_html = (ROOT / "live-sandbox.html").read_text()
setup = (ROOT / "LIVE_TEAM_ACCESS_SETUP_7.57.2.md").read_text()

# Release wiring.
check("site version", site.get("version") == "7.57.2")
check("release name", site.get("name") == "Team Access & Admin Invitations")
check("dashboard marker", site.get("liveScoringDashboardRelease") == "7.57.2")
check("team admin marker", site.get("liveScoringTeamAdminRelease") == "7.57.2")
check("role security marker", site.get("liveScoringRoleSecurityRelease") == "7.57.2")
check("roster vision preserved", site.get("liveScoringRosterImportRelease") == "7.57.1")
check("7.57.2 dashboard JS", 'js/live-dashboard-v7-57-2.js?v=7.57.2' in html)
check("7.57.2 CSS", 'css/live-sandbox-v7-57-2.css?v=7.57.2' in html)
check("scorer keeps proven JS", 'js/live-sandbox-v7-56-15.js?v=7.57.2' in sandbox_html)

# Team Access UI.
for token in [
    'id="teamAccessMembers"', 'id="teamAccessInvites"', 'id="teamAccessCount"',
    'id="pendingInviteCount"', 'id="inviteCanManageGroupMe"',
    'Can manage tournament GroupMe', 'Copy, email, reissue or revoke an invite'
]:
    check(f"access UI {token}", token in html)
for token in [
    'live_list_team_access', 'live_create_team_invite_v2', 'live_update_team_member_access',
    'live_remove_team_member', 'live_reissue_team_invite', 'live_revoke_team_invite',
    'data-copy-invite', 'data-email-invite', 'mailto:', 'navigator.clipboard.writeText'
]:
    check(f"access JS {token}", token in js)
check("admin role boundary in UI", 'workspace.role === "admin" && ["scorer","viewer"].includes' in js)
check("owner grants GroupMe only to Admin", 'workspace?.role === "owner" && role === "admin"' in js)

# Database-enforced access model.
for token in [
    'add column if not exists can_manage_groupme boolean not null default false',
    'public.live_list_team_access', 'public.live_create_team_invite_v2',
    'public.live_update_team_member_access', 'public.live_remove_team_member',
    'public.live_reissue_team_invite', 'public.live_revoke_team_invite',
    'Only the Team Owner can manage Admin access',
    'GroupMe management permission requires the Admin role',
    'live_guard_groupme_destination_manager_trigger',
    'Tournament GroupMe management permission required'
]:
    check(f"migration {token}", token in migration)
check("old invite URL acceptance preserved", 'create or replace function public.live_accept_team_invite(invite_token text)' in migration)
check("accepted permission persisted", 'can_manage_groupme=excluded.can_manage_groupme' in migration)
check("admins cannot see admin invite tokens", "caller_role='owner' or i.role<>'admin'" in migration)

# GroupMe privacy remains server enforced.
check("groupme function reads scoped permission", '.select("role,can_manage_groupme")' in groupme_fn)
check("groupme setup permission enforced", 'membership.role === "admin" && membership.can_manage_groupme !== true' in groupme_fn)
check("owner-only group browsing preserved", 'action === "discover_groups" && membership.role !== "owner"' in groupme_fn)
check("admin locked to owner-approved group", 'Admins may browse topics only inside the Team Owner-approved GroupMe' in groupme_fn)
check("credential selection owner-only", 'Only the Team Owner may choose a server-side credential secret' in groupme_fn)

# Roster failure UX fix while 7.57.1 vision remains.
check("roster failure actions UI", all(token in html for token in ['id="rosterFailureActions"','id="retryRosterImageButton"','id="uploadAnotherRosterButton"','id="manualRosterFromFailureButton"']))
catch_start = js.find('} catch (error) {\n      rosterDraft = [];', js.find('async function readRosterImage'))
catch_end = js.find('} finally {', catch_start)
catch_body = js[catch_start:catch_end] if catch_start >= 0 and catch_end > catch_start else ''
check("failed extraction clears draft", 'rosterDraft = []' in catch_body)
check("failed extraction does not load saved roster", 'rosterDraftFromCurrent' not in catch_body)
check("failure offers explicit actions", 'rosterFailureActions' in catch_body and 'No roster draft was created' in catch_body)
check("vision function preserved", 'functions.invoke("roster-extract"' in js)
check("manual roster remains", 'id="manualRosterButton"' in html)

# Critical connected/scoring assets remain protected. GroupMe function is intentionally
# changed only for setup authorization in this release.
expected_hashes = {
    "js/live-backend-v7-56-8.js": "fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328",
    "js/live-sandbox-v7-56-15.js": "f32236d8e704c113ba9b868b18ae2b97e7bb366e9adbefd37000117aea0fc6da",
    "supabase/functions/roster-extract/index.ts": "26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb",
    "supabase/migrations/202608070001_groupme_topic_delivery.sql": "aacefc33e16c3d170953e68b6d52f99d9da35c1808dde9016ff94e6539525f04",
    "supabase/migrations/202608080001_game_summary_event.sql": "80e6a939aa87104849bd4ca84c8c91a2171017885a6883cbe5f9346b4e038a14",
}
for path, expected in expected_hashes.items():
    check(f"protected hash {path}", sha256(path) == expected)

# Ensure critical delivery pipeline remains present in the intentionally updated Edge Function.
for token in ['live_claim_groupme_delivery','postGroupMeDestination','retryDelaySeconds','source_guid: crypto.randomUUID()','trigger_source']:
    check(f"delivery foundation {token}", token in groupme_fn)

check("setup doc migration", '202608080002_team_access_admin.sql' in setup)
check("setup doc groupme redeploy", 'groupme-post' in setup and 'No new secrets' in setup)
check("CSS marker", 'WPI 7.57.2 — Team Access & Admin Invitations' in css)

if errors:
    print("WPI LIVE TEAM ACCESS & ADMIN 7.57.2 TEST FAILED")
    for error in errors:
        print(" -", error)
    sys.exit(1)

print("WPI LIVE TEAM ACCESS & ADMIN 7.57.2 TEST PASSED")
print(" - Owner/Admin Team Access workspace manages members and pending invitations")
print(" - Admin-role changes and GroupMe-management grants remain Owner-controlled")
print(" - Designated Admin GroupMe setup is server-enforced and limited to the Owner-approved group")
print(" - Failed roster extraction no longer masquerades the existing roster as detected data")
print(" - 7.57.1 roster vision and 7.56.15 scoring/delivery foundations remain protected")
