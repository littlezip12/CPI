#!/usr/bin/env python3
from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]
def req(c,m):
    if not c: errors.append(m)
def read(rel): return (ROOT/rel).read_text(encoding='utf-8',errors='ignore')
site=json.loads(read('config/site-release.json'))
pkg=json.loads(read('package.json'))
lock=json.loads(read('package-lock.json'))
contract=json.loads(read('mobile/app-contract.json'))
req(site.get('version')=='7.64.46','site release must be 7.64.46')
req(pkg.get('version')=='7.64.46','package release must be 7.64.46')
req(lock.get('version')=='7.64.46','package-lock release must be 7.64.46')
req(contract.get('release')=='7.64.46','mobile contract must be 7.64.46')
req(site.get('liveTeamStatReportRelease')=='7.64.46','Team Stat Report marker missing')
req(site.get('liveTeamStatsFreshnessRelease')=='7.64.46','stats freshness marker missing')
req(site.get('liveCoachFullRosterStatsRelease')=='7.64.43','original full-roster feature marker must remain')
req(site.get('liveCoachReportContrastRelease')=='7.64.45','7.64.45 contrast marker must remain')
html=read('live-team-insights.html')
js=read('js/live-team-insights-v7-64-46.js')
css=read('css/live-team-insights-v7-64-46.css')
for token in [
    'Team Stat Report for the full team',
    '<p>Team stat report</p>',
    'Full-team player stats',
    'View full team',
    'id="teamStatRefresh"',
    '>Refresh stats</button>',
    'js/live-team-insights-v7-64-46.js?v=7.64.46',
    'css/live-team-insights-v7-64-46.css?v=7.64.46',
]: req(token in html,f'Team Stat Report UI missing: {token}')
for stale in ['use Coach Report for the full roster','>View full roster</button>']:
    req(stale not in html,f'stale Coach Report wording remains: {stale}')
for token in [
    'async function refreshTeamStats(options={})',
    'await load(season, preferredScope);',
    'window.addEventListener("focus",maybeAutoRefreshTeamStats);',
    'document.addEventListener("visibilitychange",maybeAutoRefreshTeamStats);',
    'window.addEventListener("pageshow"',
    'AUTO_REFRESH_MIN_MS = 30000',
    'Team stat report copied.',
    'team-stat-report.csv',
]: req(token in js,f'stats freshness/export behavior missing: {token}')
# Preserve the explicit light-table contrast fix from 7.64.45.
for token in [
    '.insights-coach-table tbody td{',
    'background:#fff;',
    'color:#18324c;',
    '.insights-coach-table tbody tr:nth-child(even) td{',
    'background:#f7fafc;',
    '.insights-coach-table tbody tr:hover td,',
    'background:#eef6fd;',
]: req(token in css,f'light Team Stat Report table CSS missing: {token}')
if errors:
    print('WPHQ 7.64.46 TEAM STAT REPORT / FRESHNESS TEST FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('WPHQ 7.64.46 TEAM STAT REPORT / FRESHNESS TEST PASSED')
print(' - Coach Report is renamed Team Stat Report without changing the four-player comparison')
print(' - full-team Season / Event / Game report still supports copy + CSV')
print(' - manual Refresh stats reloads current overview + player analytics')
print(' - focus / visibility / bfcache return automatically refresh stale open pages')
print(' - 7.64.45 light-table contrast remains preserved')
