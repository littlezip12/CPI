from pathlib import Path

root = Path(__file__).resolve().parents[1]
version = (root / 'VERSION.md').read_text()
html = (root / 'live.html').read_text()
js = (root / 'js/live-home-team-stats-v7-64-12.js').read_text()

assert version.startswith('# WPI 7.64.12 — Team Stats Home Entry')
assert 'id="publicTeamStatsButton"' in html
assert '>Team Stats</a>' in html
assert 'live-home-team-stats-v7-64-12.js?v=7.64.12' in html
assert 'live_following_overview_v2' in js
assert 'live-team-insights.html?team=' in js
assert 'live-following.html?stats=1' in js
assert 'live-login.html?follow=1' in js
assert 'uniqueTeamIds.length === 1' in js
assert 'backend.isAnonymousUser' in js
print('WPI Live 7.64.12 Team Stats home-entry checks passed.')
