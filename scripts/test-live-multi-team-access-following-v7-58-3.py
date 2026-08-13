#!/usr/bin/env python3
"""Static acceptance checks for WPI Live 7.58.3 Multi-Team Access & Following."""
from pathlib import Path
import hashlib,json,re
ROOT=Path(__file__).resolve().parents[1]
def read(rel): return (ROOT/rel).read_text(encoding='utf-8')
def require(ok,msg):
    if not ok: raise AssertionError(msg)

release=json.loads(read('config/site-release.json'))
html=read('live-dashboard.html')
game_html=read('live-game.html')
js=read('js/live-dashboard-v7-58-3.js')
ext=read('js/live-team-following-v7-58-3.js')
css=read('css/live-dashboard-v7-58-3.css')
sql=read('supabase/migrations/202608120001_multi_team_access_following.sql')

require(read('VERSION.md').strip()=='# WPI 7.58.3 — Multi-Team Access & Following','VERSION mismatch')
require(release.get('version')=='7.58.3' and release.get('name')=='Multi-Team Access & Following','release metadata mismatch')
for key in ('liveScoringDashboardRelease','liveScoringMultiTeamRelease','liveScoringMultiTeamAccessFollowingRelease','liveScoringFollowingRelease','liveScoringFollowReadOnlyRelease','liveScoringTeamAccessFollowingVisibilityRelease'):
    require(release.get(key)=='7.58.3',f'missing 7.58.3 marker: {key}')
require(release.get('liveScoringRosterVersioningRelease')=='7.58.2','7.58.2 roster foundation marker changed')

for token in ('css/live-dashboard-v7-58-3.css?v=7.58.3','js/live-team-following-v7-58-3.js?v=7.58.3','js/live-dashboard-v7-58-3.js?v=7.58.3'):
    require(token in html,f'missing 7.58.3 dashboard asset: {token}')
for token in ('js/live-team-context-v7-58-0.js?v=7.58.0','js/live-team-profiles-rosters-v7-58-2.js?v=7.58.2','js/live-team-following-v7-58-3.js?v=7.58.3','js/live-game-v7-57-22.js?v=7.57.22'):
    require(token in game_html,f'followed live-game route missing asset: {token}')

# Relationship is physically separate from membership.
for token in ('create table if not exists public.live_team_follows','primary key (user_id,team_id)','live_is_team_follower','live_set_team_follow_v1','live_following_overview_v1','live_list_team_followers_v1','live_team_workspace_v4'):
    require(token in sql,f'missing Following foundation: {token}')
require('insert into public.live_team_members' not in sql.lower(),'Following must never create permanent membership')
require('update public.live_team_members' not in sql.lower(),'Following must never mutate permanent membership')
require("source_member.role in ('scorer','viewer')" in sql,'pilot follow eligibility must be Supporter/Scorer only')
require("canonical_wpi_club_id='club-lamorinda'" in sql and "canonical_wpi_club_id<>'club-lamorinda'" in sql,'Lamorinda-only pilot boundary not server-enforced')

# Read expands; writes do not.
require('live_can_view_game' in sql,'read-only game visibility helper missing')
require('public.live_can_score_game' not in sql[sql.index('create or replace function public.live_can_view_game'):sql.index('grant execute on function public.live_can_view_game')], 'Following leaked into scoring helper')
for policy in ('game participants and followers read games','game participants and followers read lineups','game participants and followers read events','game participants and followers read recaps'):
    require(policy in sql,f'missing follower read policy: {policy}')
for forbidden in ('active scorer updates games','team managers create games','team managers manage rosters'):
    # 7.58.3 must not replace protected write policies.
    require(f'drop policy if exists "{forbidden}"' not in sql,f'7.58.3 touches protected write policy: {forbidden}')

# UX visibly separates membership from Following.
for token in ('id="roleHomeFollowingPanel"','Following Lamorinda','Following is separate from team membership','id="followingTeamList"','id="teamFollowers"','Following this team'):
    require(token in html,f'missing Following UX: {token}')
for token in ('backend.followingOverview','backend.setTeamFollow','data-follow-team','followingTeam === true','Following · read only','backend.listTeamFollowers'):
    require(token in js,f'missing Following controller behavior: {token}')
require('followingOnly' in ext and 'return null' in ext and 'callerSessionStatus:"following"' in ext,'followed game privacy/read-only extension incomplete')
require('.live-follow-team-row' in css and '.live-access-follower' in css,'Following styling missing')

# Dashboard controller references remain valid.
ids=set(re.findall(r'id="([^"]+)"',html))
refs=set(re.findall(r'\$\("([A-Za-z0-9_-]+)"\)',js))
missing=sorted(refs-ids)
require(not missing,f'dashboard controller references missing DOM ids: {missing}')

protected={
 'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
 'js/live-game-v7-57-22.js':'a03145737d61767d6fbca3676b585d8476c3724dd0e45f4f2fd83c2deb87fca4',
 'js/live-team-context-v7-58-0.js':'a5dc2e403816a81ec0b4233d4eda87de3acde35628815844d18e1f2e34887024',
 'js/live-team-profiles-rosters-v7-58-2.js':'1620b9d08e4d53ef5eee72cb887293cea2f660ccefc3459d69a6a944368902b5',
 'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
 'supabase/functions/roster-extract/index.ts':'26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb',
 'supabase/migrations/202608110003_club_workspace_foundation.sql':'5d8c8413fc4ce1b76834114a1e289a305571d9dda4d6442546a76a9622f41b81',
 'supabase/migrations/202608110004_multi_team_profiles_rosters.sql':'70bdd10a765b671f1677db16ce58676919c391656d4d60e262e6ead1ad03cd58',
}
for rel,digest in protected.items():
    require(hashlib.sha256((ROOT/rel).read_bytes()).hexdigest()==digest,f'protected foundation changed: {rel}')

print('WPI Live 7.58.3 Multi-Team Access & Following static checks passed.')
