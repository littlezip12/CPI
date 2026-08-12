#!/usr/bin/env python3
"""Static acceptance checks for WPI Live 7.58.2 Multi-Team Profiles & Rosters."""
from pathlib import Path
import hashlib,json,re
ROOT=Path(__file__).resolve().parents[1]
def read(rel): return (ROOT/rel).read_text(encoding='utf-8')
def require(ok,msg):
    if not ok: raise AssertionError(msg)

release=json.loads(read('config/site-release.json'))
html=read('live-dashboard.html')
game_html=read('live-game.html')
js=read('js/live-dashboard-v7-58-2.js')
ext=read('js/live-team-profiles-rosters-v7-58-2.js')
css=read('css/live-dashboard-v7-58-2.css')
sql=read('supabase/migrations/202608110004_multi_team_profiles_rosters.sql')

require(read('VERSION.md').strip()=='# WPI 7.58.2 — Multi-Team Profiles & Rosters','VERSION mismatch')
require(release.get('version')=='7.58.2' and release.get('name')=='Multi-Team Profiles & Rosters','release metadata mismatch')
for key in ('liveScoringDashboardRelease','liveScoringMultiTeamRelease','liveScoringTeamSwitchingRelease','liveScoringTeamProfileRelease','liveScoringRosterVersioningRelease','liveScoringSeasonAwareRosterRelease','liveScoringDefaultLineupRelease','liveScoringMultiTeamProfilesRostersRelease'):
    require(release.get(key)=='7.58.2',f'missing 7.58.2 release marker: {key}')
require(release.get('liveScoringOwnerDashboardRefactorRelease')=='7.58.1','7.58.1 dashboard refactor foundation marker changed')
require(release.get('liveScoringClubWorkspaceRelease')=='7.58.0','7.58.0 club workspace foundation marker changed')

for token in ('css/live-dashboard-v7-58-2.css?v=7.58.2','js/live-team-context-v7-58-0.js?v=7.58.0','js/live-team-profiles-rosters-v7-58-2.js?v=7.58.2','js/live-dashboard-v7-58-2.js?v=7.58.2'):
    require(token in html,f'missing 7.58.2 dashboard asset: {token}')
for token in ('js/live-team-context-v7-58-0.js?v=7.58.0','js/live-team-profiles-rosters-v7-58-2.js?v=7.58.2','js/live-game-v7-57-22.js?v=7.57.22'):
    require(token in game_html,f'live game is not using season-aware team context: {token}')

# Team profile is fully team-specific but season remains an explicit current-context field.
for token in ('id="teamProfileName"','id="teamProfileDisplayLabel"','id="teamProfileAgeGroup"','id="teamProfileGender"','id="teamProfileSquad"','id="teamProfileSeason"'):
    require(token in html,f'missing team profile field: {token}')
require('id="teamProfileSeason" type="text" maxlength="20" readonly' in html,'season should remain a deliberate current-team context in this release')
require('backend.updateTeamProfile' in js and 'live_update_team_profile_v1' in ext,'team profile must save through the team-scoped RPC')
require('.from("live_teams").update' not in js[js.index('async function saveTeamProfile'):js.index('function formatRosterVersionDate')], 'team profile still uses direct table mutation')

# Roster versions are immutable snapshots: current roster changes by creating a new row.
for token in ('version_number integer not null default 1','source_roster_id uuid references public.live_rosters(id)','live_rosters_one_active_team_season_idx','live_team_workspace_v3','competitive_season=selected_team.competitive_season','live_save_roster_version_v1','expected_roster_id','current_roster.id'):
    require(token in sql,f'missing roster-version integrity rule: {token}')
require('delete from public.live_rosters' not in sql.lower() and 'truncate' not in sql.lower(),'7.58.2 must preserve historical roster rows')
require("set active=false,retired_at=coalesce(retired_at,now())" in sql,'prior roster versions are not preserved as retired rows')
require('backend.saveRosterVersion' in js and 'live_save_roster_version_v1' in ext,'dashboard roster save must create a server-side version')
save_block=js[js.index('async function saveRosterDraft'):js.index('function openDefaultLineupDialog')]
require('.from("live_players").upsert' not in save_block and '.from("live_players").update' not in save_block,'dashboard still mutates the current roster in place')
for token in ('id="rosterVersionBadge"','id="rosterHistoryDetails"','id="rosterVersionList"','latest saved roster auto-loaded'):
    require(token in html+js,f'missing roster-version UX: {token}')

# Default starters belong to the selected team and active roster and remap across roster versions.
for token in ('live_set_default_lineup_v1','target_roster_id uuid','Every default starter must belong to the current roster','default_lineup_player_ids=new_default_ids','default_goalie_id=new_goalie_id'):
    require(token in sql,f'missing default-lineup integrity rule: {token}')
for token in ('id="defaultLineupCard"','id="editDefaultLineupButton"','id="defaultLineupDialog"','id="defaultLineupGoalie"','id="defaultLineupPlayers"','backend.setDefaultLineup'):
    require(token in html+js,f'missing default-lineup UX: {token}')
require('starterMinimum(workspace?.ageGroup)' in js,'default lineup must retain age-aware starter counts')

# 7.58.3 Following is intentionally not pulled into this release.
require('create table public.live_team_follows' not in sql.lower(),'Following belongs to 7.58.3, not 7.58.2')

# All literal dashboard controller IDs still exist after adding the new UI.
ids=set(re.findall(r'id="([^"]+)"',html))
refs=set(re.findall(r'\$\("([A-Za-z0-9_-]+)"\)',js))
missing=sorted(refs-ids)
require(not missing,f'dashboard controller references missing DOM ids: {missing}')

# Protected scoring/GroupMe/server foundations and the previous release assets remain byte-identical.
protected={
 'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
 'js/live-game-v7-57-22.js':'a03145737d61767d6fbca3676b585d8476c3724dd0e45f4f2fd83c2deb87fca4',
 'js/live-team-context-v7-58-0.js':'a5dc2e403816a81ec0b4233d4eda87de3acde35628815844d18e1f2e34887024',
 'js/live-dashboard-v7-58-1.js':'832de1a128fb9860c5d22c3d511e200e98451bca7181f92b0e6276eb96d139c4',
 'css/live-dashboard-v7-58-1.css':'c2215471506e6cd0c9583c4f08e79125cf93d65ff8fc95ed5b8f76d0fdedf948',
 'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
 'supabase/functions/roster-extract/index.ts':'26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb',
 'supabase/migrations/202608110003_club_workspace_foundation.sql':'5d8c8413fc4ce1b76834114a1e289a305571d9dda4d6442546a76a9622f41b81',
}
for rel,digest in protected.items():
    require(hashlib.sha256((ROOT/rel).read_bytes()).hexdigest()==digest,f'protected foundation changed: {rel}')

require('.live-roster-version-badge' in css and '.live-default-lineup-card' in css and '.live-default-lineup-player-list' in css,'7.58.2 roster/default-lineup styling missing')
print('WPI Live 7.58.2 Multi-Team Profiles & Rosters static checks passed.')
