from pathlib import Path
root=Path(__file__).resolve().parents[1]
html=(root/'live-dashboard.html').read_text()
js=(root/'js/live-dashboard-v7-58-6.js').read_text()
css=(root/'css/live-dashboard-v7-58-6.css').read_text()
sql=(root/'supabase/migrations/202608130002_recap_following_pilot_ux_correction.sql').read_text()
recap=(root/'live-game-recap.html').read_text()
checks={
 'dashboard loads correction JS':'js/live-dashboard-v7-58-6.js?v=7.58.6-contextfix1' in html,
 'following search':'id="followingSearch"' in html and 'followingSearch' in js,
 'following age filter':'id="followingAgeFilter"' in html and 'followingAgeFilter' in js,
 'following gender filter':'id="followingGenderFilter"' in html and 'followingGenderFilter' in js,
 'follow chips':'id="followingCurrent"' in html and 'live-follow-current-chips' in css,
 'team result filters':'id="roleHomeTeamFilters"' in html and 'data-role-team-filter' in js,
 'team context on cards':'live-role-game-team-context' in js and 'live-role-game-team-context' in css,
 'recap SQL text-safe coalesce':"coalesce(nullif(trim(p.cap_number),''),'999')" in sql,
 'bad recap coalesce removed':'coalesce(p.cap_number,999)' not in sql,
 'recap cache bust':'7.58.6-recapfix1' in recap,
}
failed=[k for k,v in checks.items() if not v]
if failed:
    raise SystemExit('FAILED: '+', '.join(failed))
print('WPI LIVE 7.58.6 PILOT UX / RECAP CORRECTION TEST PASSED')
