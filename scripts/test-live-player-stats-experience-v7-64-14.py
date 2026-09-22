from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
site=json.loads((root/'config/site-release.json').read_text())
html=(root/'live-team-insights.html').read_text()
js=(root/'js/live-team-insights-v7-64-14.js').read_text()
css=(root/'css/live-team-insights-v7-64-14.css').read_text()
version=(root/'VERSION.md').read_text()
def req(c,m):
    if not c: raise AssertionError(m)
req(version.startswith('# WPI 7.64.14 — Player Stats Experience') or version.startswith('# WPI 7.64.15 — Player Roster Accuracy & Parent Privacy'),'version mismatch')
req(site.get('version') in ('7.64.14','7.64.15'),'site release mismatch')
req(site.get('livePlayerStatsExperienceRelease') in ('7.64.14','7.64.15'),'player stats experience marker missing')
req('live-team-insights-v7-64-14.css?v=7.64.14' in html,'new responsive insights CSS missing')
req(('live-team-insights-v7-64-14.js?v=7.64.14' in html) or ('live-team-insights-v7-64-15.js?v=7.64.15' in html),'new player stats runtime missing')
for token in ['Compare Players','playerScopeTabs','data-player-scope-mode="season"','data-player-scope-mode="series"','data-player-scope-mode="game"','playerSearchInput','playerPicker','playerSelectionCount']:
    req(token in html,f'UI missing {token}')
for token in ['selectedPlayerIds','playerDirectory','wpi-player-compare:','localStorage.setItem','DNP','Played · 0 recorded stats','setPlayerScopeMode','scopeMissing','selectedPlayerIds.length<4']:
    req(token in js,f'behavior missing {token}')
req('comparisonPlayerIds = [];' not in js[js.index('async function loadPlayerAnalytics'):js.index('function renderDetailed')], 'scope loading must not reset comparison selection')
for token in ['insights-player-selected-cards','insights-comparison-mobile','insights-comparison-desktop','scroll-snap-type','insights-player-pick.is-selected']:
    req(token in css,f'responsive styling missing {token}')
req('player photo' not in html.lower(),'player photos must not be introduced')
req('<img' not in html[html.index('id="playerAnalyticsPanel"'):html.index('id="selectedSeriesPanel"')].lower(),'player analytics panel must not contain images')
print('WPI Live 7.64.14 Player Stats Experience checks passed.')
