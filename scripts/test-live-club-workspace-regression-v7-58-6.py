#!/usr/bin/env python3
"""Protect the validated 7.58.0 Club → Teams foundation during 7.58.6."""
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
def read(rel): return (ROOT/rel).read_text(encoding='utf-8')
def req(ok,msg):
    if not ok: raise AssertionError(msg)
release=json.loads(read('config/site-release.json'))
req(release.get('version') in {'7.58.6','7.58.7','7.58.8','7.58.9','7.58.10','7.59.0','7.60.0','7.60.1','7.60.2','7.60.3','7.61.0','7.61.1','7.62.0','7.62.1','7.62.2','7.62.3','7.62.4','7.62.5','7.62.6','7.63.0','7.63.1','7.63.2','7.63.3','7.63.4','7.63.5','7.63.6','7.63.7'},'current release must preserve 7.58.6 or later')
req(release.get('liveScoringClubWorkspaceRelease')=='7.58.0','club workspace marker changed')
req(release.get('liveScoringClubTeamHierarchyRelease')=='7.58.0','club hierarchy marker changed')
migration=read('supabase/migrations/202608110003_club_workspace_foundation.sql').lower()
for token in ('create table if not exists public.live_clubs','create table if not exists public.live_club_members','live_list_user_teams_v2','live_club_workspace_v1','live_create_additional_team_v2','club-lamorinda'):
    req(token in migration,f'club migration contract missing: {token}')
for forbidden in ('delete from public.live_teams','delete from public.live_rosters','delete from public.live_games','truncate public.live_','set id ='):
    req(forbidden not in migration,f'destructive club migration behavior found: {forbidden}')
context=read('js/live-team-context-v7-58-0.js')
for token in ('live_list_user_teams_v2','live_list_user_clubs_v1','live_team_workspace_v2','live_club_workspace_v1','live_create_additional_team_v2','wpi-live-selected-team-v7-57-3'):
    req(token in context,f'club context contract missing: {token}')
dashboard=read('js/live-dashboard-v7-58-3.js')
for token in ('All ${clubName} Teams','clubOverviewPanel','renderClubOverview','data-club-team-jump','team records stay isolated'):
    req(token in dashboard,f'club workspace behavior missing in new controller: {token}')
req('createTeamButton").hidden = clubWorkspace?.role !== "owner"' in dashboard,'team creation must remain Club Owner-only')
expected='5d8c8413fc4ce1b76834114a1e289a305571d9dda4d6442546a76a9622f41b81'
req(hashlib.sha256((ROOT/'supabase/migrations/202608110003_club_workspace_foundation.sql').read_bytes()).hexdigest()==expected,'7.58.0 club migration changed')
print('WPI Live 7.58.0 Club Workspace foundation regression passed.')
