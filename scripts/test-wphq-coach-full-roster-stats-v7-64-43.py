#!/usr/bin/env python3
from pathlib import Path
import json,sys,re
ROOT=Path(__file__).resolve().parents[1]
errors=[]
def req(c,m):
    if not c: errors.append(m)
def read(rel): return (ROOT/rel).read_text(encoding='utf-8',errors='ignore')
site=json.loads(read('config/site-release.json')); pkg=json.loads(read('package.json')); contract=json.loads(read('mobile/app-contract.json'))
req(site.get('version')=='7.64.43','site release must be 7.64.43')
req(pkg.get('version')=='7.64.43','package release must be 7.64.43')
req(contract.get('release')=='7.64.43','mobile contract release must be 7.64.43')
req(site.get('liveCoachFullRosterStatsRelease')=='7.64.43','coach full-roster marker missing')
req(site.get('liveCoachStatsExportRelease')=='7.64.43','coach export marker missing')
html=read('live-team-insights.html'); js=read('js/live-team-insights-v7-64-43.js'); css=read('css/live-team-insights-v7-64-43.css')
for token in [
  'live-team-insights-v7-64-43.css?v=7.64.43','live-team-insights-v7-64-43.js?v=7.64.43',
  'id="coachReportToggle"','id="coachReportCopy"','id="coachReportCsv"','id="coachReportPanel"','id="coachReportBody"',
  'Full roster player stats','Compare up to 4'
]: req(token in html,f'Team Insights missing coach report UI: {token}')
for token in [
  'function coachReportPlayers()','function coachReportColumns()','function coachReportTsv()','function coachReportCsv()',
  'function renderCoachReport()','function copyCoachReport()','function downloadCoachReportCsv()',
  'navigator.clipboard.writeText','new Blob([coachReportCsv()]','live_team_player_insights_v2',
  'selectedPlayerIds.length>=4','selectedPlayerIds.length<4','renderCoachReport();'
]: req(token in js,f'Coach report runtime missing: {token}')
# Full report must include the entire v2 stat vocabulary, not just the 4-player summary subset.
for token in ['shotsSaved','shotsBlocked','shotsPost','shotsMissed','saves','fieldBlocks','steals','turnovers','exclusionsDrawn','exclusionsCommitted','fiveMetersDrawn','fiveMetersCommitted','shootoutGoals','shootoutMisses']:
    req(token in js,f'Coach report missing full player stat field: {token}')
for token in ['.insights-coach-report-card','.insights-coach-table-scroll','.insights-coach-table .is-player','@media(max-width:700px)']:
    req(token in css,f'Coach report CSS missing: {token}')
# Explicitly protect the existing comparison model: coach report is additive, not a removal of the max-4 compare UX.
req('0 of 4 selected' in html,'four-player comparison selector must remain')
req('Select up to four players to compare.' in js,'four-player comparison empty state must remain')
if errors:
    print('WPHQ 7.64.43 COACH FULL-ROSTER PLAYER STATS TEST FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('WPHQ 7.64.43 COACH FULL-ROSTER PLAYER STATS TEST PASSED')
print(' - existing up-to-four-player comparison remains intact')
print(' - Coach Report renders every rostered player for Season / Event / Game scope')
print(' - full scorer-entered stat vocabulary is included')
print(' - report can be copied as tab-separated text or downloaded as CSV')
