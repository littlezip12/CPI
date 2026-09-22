from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'live-team-insights.html').read_text()
js=(ROOT/'js/live-team-insights-v7-64-15.js').read_text()
login=(ROOT/'js/live-login-v7-64-15.js').read_text()
mig=(ROOT/'supabase/migrations/202609210002_player_roster_privacy_hardening.sql').read_text()
security=(ROOT/'live-account-security.html').read_text()
assert 'live-team-insights-v7-64-15.js?v=7.64.15' in html
assert 'Search players by name…' in html
assert 'live_team_player_insights_v2' in js
assert '#${p.cap}' not in js
assert 'signInWithOtp' in login and 'shouldCreateUser:true' in login
assert 'live_is_permanent_user_v1' in mig
assert 'client_player_id' in mig and 'scope_games' in mig
assert 'live-account-security-v7-64-15.js' in security
assert (ROOT/'supabase/functions/account-delete-v7-64-15/index.ts').exists()
print('WPI 7.64.15 player roster/privacy checks passed.')
