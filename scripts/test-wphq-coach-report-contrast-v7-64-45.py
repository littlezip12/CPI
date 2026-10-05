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
contract=json.loads(read('mobile/app-contract.json'))
req(site.get('version')=='7.64.45','site release must be 7.64.45')
req(pkg.get('version')=='7.64.45','package release must be 7.64.45')
req(contract.get('release')=='7.64.45','mobile contract must be 7.64.45')
req(site.get('liveCoachFullRosterStatsRelease')=='7.64.43','7.64.43 Coach Report feature marker must remain')
req(site.get('liveCoachReportContrastRelease')=='7.64.45','contrast hotfix marker missing')
html=read('live-team-insights.html')
css=read('css/live-team-insights-v7-64-45.css')
req('css/live-team-insights-v7-64-45.css?v=7.64.45' in html,'Team Insights must request the new 7.64.45 stylesheet URL')
req('css/live-team-insights-v7-64-43.css?v=7.64.43' not in html,'stale 7.64.43 stylesheet URL must not remain linked')
for token in [
    '.insights-coach-table tbody td{',
    'background:#fff;',
    'color:#18324c;',
    '.insights-coach-table tbody tr:nth-child(even) td{',
    'background:#f7fafc;',
    '.insights-coach-table tbody tr:hover td,',
    'background:#eef6fd;'
]: req(token in css,f'Coach Report light-table CSS missing: {token}')
# The new physical filename is intentional: a query-only/content-only change was insufficient after 7.64.44.
req((ROOT/'css/live-team-insights-v7-64-45.css').exists(),'cache-busted stylesheet file missing')
if errors:
    print('WPHQ 7.64.45 COACH REPORT CONTRAST/CACHE-BUST TEST FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('WPHQ 7.64.45 COACH REPORT CONTRAST/CACHE-BUST TEST PASSED')
print(' - Team Insights requests a new physical stylesheet URL')
print(' - Coach Report data cells are explicitly light with readable text')
print(' - zebra and hover states stay light')
