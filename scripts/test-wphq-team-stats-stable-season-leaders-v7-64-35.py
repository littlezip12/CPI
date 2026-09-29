from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/"live-team-insights.html").read_text()
js=(ROOT/"js/live-team-insights-v7-64-35.js").read_text()
assert "live-team-insights-v7-64-35.js?v=7.64.35" in html
assert 'rpc("live_team_player_insights_v2"' in js
assert "function renderStableSeasonLeaders(players)" in js
assert "renderStableSeasonLeaders(playerScopeData?.players||[])" in js
assert 'stablePlayers.sort' in js
assert '"seasonPlayerCount"' in js and '"seasonPlayerTotals"' in js
print("WPHQ 7.64.35 Team Stats stable season leaders test passed.")
