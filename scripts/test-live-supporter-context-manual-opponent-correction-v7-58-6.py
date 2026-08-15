#!/usr/bin/env python3
from pathlib import Path
root=Path(__file__).resolve().parents[1]
html=(root/'live-dashboard.html').read_text()
js=(root/('js/live-dashboard-v7-58-9.js' if (root/'js/live-dashboard-v7-58-9.js').exists() else ('js/live-dashboard-v7-58-7.js' if (root/'js/live-dashboard-v7-58-7.js').exists() else 'js/live-dashboard-v7-58-6.js'))).read_text()
css=(root/('css/live-dashboard-v7-58-7.css' if (root/'css/live-dashboard-v7-58-7.css').exists() else 'css/live-dashboard-v7-58-6.css')).read_text()
sql=(root/'supabase/migrations/202608130003_supporter_view_context_manual_opponent.sql').read_text().lower()
checks={
  'context cache bust':('7.58.7' in html or '7.58.6-contextfix1' in html),
  'archive viewing context mount':'id="gameArchiveViewingTeam"' in html and 'renderArchiveViewingContext' in js,
  'supporter relationship teams':'function supporterRelationshipTeams' in js and 'team.isMember || team.isFollowing' in js,
  'archive targets follow team filter':'function archiveViewTargets' in js and 'roleHomeTeamFilter === "all"' in js,
  'archive follower rpc':'live_game_series_archive_v4' in js and 'live_game_series_archive_v4' in sql,
  'team filter reloads archive':'loadGameSeriesArchive().catch' in js,
  'archive cards labeled by team':'live-archive-team-context' in js and 'live-archive-team-context' in css,
  'archive recap keeps team context':'team:game.teamId || series.viewTeamId' in js,
  'merge cannot cross teams':'row.viewTeamId === source?.viewTeamId' in js,
  'follower archive access':'public.live_is_team_follower(target_team_id)' in sql and "team membership or following required" in sql,
  'follower archive stays non-admin':"'canmanage',coalesce(member_role in ('owner','admin'),false)" in sql,
  'archive migration does not create membership':'insert into public.live_team_members' not in sql and 'update public.live_team_members' not in sql,
  'manual opponent explicit':'opponent · search or enter any team' in html.lower() and 'search wpi or enter any team name' in html.lower(),
  'manual opponent raw preservation':'unlisted team — wpi will use' in js.lower() and 'no canonical club/team will be created automatically' in js.lower(),
  'manual opponent state styling':'hint.dataset.state = "manual"' in js and 'live-game-match-hint[data-state="manual"]' in css,
}
failed=[name for name,ok in checks.items() if not ok]
if failed:
    raise SystemExit('FAILED: '+', '.join(failed))
print('WPI LIVE 7.58.6 SUPPORTER CONTEXT / MANUAL OPPONENT CORRECTION TEST PASSED')
print(' - Supporter team filter drives both game feed and archive context')
print(' - followed-team archive is read-only and team-labeled')
print(' - All Teams archive can combine authorized teams without mixing identity')
print(' - unlisted opponent names remain explicit raw/manual values')
