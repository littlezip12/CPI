#!/usr/bin/env python3
from pathlib import Path
import json, re, subprocess, sys

ROOT=Path(__file__).resolve().parents[1]
errors=[]
def fail(message): errors.append(message)

EVENT_ID='2026-jo-session-3'
SHEET_ID='1kIm-60Tzm6flJwXQxT0YXcxIsqSYmUw3JzrU-rInRUg'
EXPECTED={
 '10u-coed-championship':('10U','Coed','10U_COED_CHAMP_6',22),
 '12u-coed-championship':('12U','Coed','12U_COED_CHAMP 21 12+9 ',81),
 '14u-boys-championship':('14U','Boys','14U_M_CHAMP-26 teams DE auRR',101),
 '14u-girls-championship':('14U','Girls','14U_F_CHAMP_7',27),
 '16u-boys-championship':('16U','Boys','16U_M_Champ 25',97),
 '16u-girls-championship':('16U','Girls','16U_F_Champ-12 teams',48),
 '18u-boys-championship':('18U','Boys','18U_M_CHAMP_NEW_23',94),
 '18u-girls-championship':('18U','Girls','18U_F_CHAMP-18 teams',75),
}
site=json.loads((ROOT/'config/site-release.json').read_text())
if site.get('version') not in {'7.54.6','7.54.7','7.54.8','7.54.9','7.54.10','7.54.11','7.54.12','7.54.13','7.54.14','7.54.15','7.54.17','7.54.18','7.55.0','7.55.1','7.55.2','7.55.4','7.55.5','7.55.6','7.55.7','7.55.8','7.55.9','7.56.0','7.56.1','7.56.2', '7.56.3', '7.56.4', '7.56.7','7.56.8','7.56.9','7.56.11','7.56.12','7.56.13','7.56.14','7.56.15','7.57.0','7.57.1','7.57.2','7.57.3','7.57.4'}: fail('site version must preserve Session 3')
if site.get('joSession3Release')!='7.54.17': fail('joSession3Release must be 7.54.17')
if site.get('joSession3ApplicationRelease')!='7.54.6': fail('joSession3ApplicationRelease must remain 7.54.6 because the legacy viewer code is unchanged')

registry=json.loads((ROOT/'data/tournaments/registry.json').read_text())
events={e['id']:e for e in registry.get('events',[])}
event=events.get(EVENT_ID)
if not event: fail('central tournament registry is missing Session 3')
else:
    if event.get('syncEnabled') is not True: fail('Session 3 must be live-sync enabled')
    if event.get('rankingEvidenceEnabled') is not False: fail('Session 3 must remain quarantined from published rankings')
    if event.get('publicPath')!='tournament.html?event=2026-jo-session-3': fail('Session 3 archive path is incorrect')
    if event.get('location')!='North Texas': fail('Session 3 location is incorrect')
    divisions={d['id']:d for d in event.get('divisions',[])}
    if set(divisions)!=set(EXPECTED): fail(f'expected eight Session 3 divisions, found {len(divisions)}')
    for division_id,(age,gender,sheet,games) in EXPECTED.items():
        row=divisions.get(division_id,{})
        if row.get('spreadsheetId')!=SHEET_ID: fail(f'{division_id}: wrong workbook ID')
        if row.get('sheetName')!=sheet: fail(f'{division_id}: wrong sheet name')
        if row.get('expectedScheduleGames')!=games: fail(f'{division_id}: expected schedule count must be {games}')
        if row.get('ageGroup')!=age or row.get('gender')!=gender: fail(f'{division_id}: age/gender metadata mismatch')
        raw=ROOT/'data/tournaments/raw'/EVENT_ID/f'{division_id}.csv'
        normalized=ROOT/'data/tournaments/normalized'/EVENT_ID/f'{division_id}.json'
        if not raw.exists() or raw.stat().st_size<100: fail(f'{division_id}: verified CSV snapshot is missing')
        if not normalized.exists(): fail(f'{division_id}: normalized schedule is missing')
        else:
            data=json.loads(normalized.read_text())
            counts=data.get('counts',{})
            if counts.get('games')!=games: fail(f'{division_id}: normalized game count is {counts.get("games")}, expected {games}')
            expected_finals = 0 if division_id == '12u-coed-championship' else games
            expected_scheduled = games if division_id == '12u-coed-championship' else 0
            if counts.get('finalGames')!=expected_finals or counts.get('scheduledGames')!=expected_scheduled: fail(f'{division_id}: archived score-state totals are incorrect')
            if counts.get('blockers')!=0: fail(f'{division_id}: normalized schedule contains blockers')

source=json.loads((ROOT/'tournaments/jo-texas/source-registry.json').read_text())
if source.get('spreadsheetId')!=SHEET_ID: fail('Session 3 source registry has the wrong workbook ID')
if source.get('clubLogos',{}).get('enabled') is not False: fail('club logos must be disabled for Session 3')
if source.get('liveRelayPolicy',{}).get('eventId')!=EVENT_ID: fail('Session 3 source registry is not connected to its relay event')
if source.get('liveRelayPolicy',{}).get('refreshTargetMinutes')!=5: fail('Session 3 relay target must be five minutes')

app_path=ROOT/'tournaments/jo-texas/app.js'
html_path=ROOT/'tournaments/jo-texas/index.html'
if not app_path.exists() or not html_path.exists(): fail('Session 3 public application files are missing')
else:
    app=app_path.read_text()
    html=html_path.read_text()
    for token in [
      f"const SHEET_ID='{SHEET_ID}'", "const APP_VERSION='7.54.6'", 'const SHOW_TEAM_LOGOS=false',
      "const RELAY_EVENT_ID='2026-jo-session-3'", 'function fetchRelayDataset(config)',
      'const relayPromise=fetchRelayDataset(config)', 'function resolveTournament()',
      'function renderPaths(upcoming)', 'function teamJumpHtml(name', 'data-team-jump', 'function venueLinksHtml(location)', 'www.google.com/maps/dir/?api=1', 'maps.apple.com/?daddr=', 'waze.com/ul?q=', "['win','If they win'", "['loss','If they lose'",
      "if(!SHOW_TEAM_LOGOS)return'';", '../../data/tournaments/raw/2026-jo-session-3/'
    ]:
        if token not in app: fail(f'Session 3 app is missing: {token}')
    if 'teamLogoHtml(name' not in app: fail('Session 3 app lacks the explicit no-logo gate')
    if r'(?:\d{1,2}(?:st|nd|rd|th))\s*(?:\(afterRR\)' not in app:
        fail('Session 3 app does not protect after-round-robin route labels from becoming teams')
    for division_id in EXPECTED:
        if division_id not in app: fail(f'Session 3 app is missing embedded dataset {division_id}')
    for token in ['Junior Olympics Session 3','North Texas','<strong>8</strong>','app.js?v=7.54.6','Open official schedule','session3-enhancements-v7-54-6.css?v=7.54.6']:
        if token not in html: fail(f'Session 3 page is missing: {token}')
    if 'tournament-operations.html' in html: fail('Session 3 public page exposes internal tournament operations')
    result=subprocess.run(['node','--check',str(app_path)],capture_output=True,text=True)
    if result.returncode: fail(f'Session 3 JavaScript syntax error: {result.stderr.strip()}')

hub=json.loads((ROOT/'data/tournaments/public-hub.json').read_text())
next_event=hub.get('nextTournament',{})
if hub.get('release') not in {'7.54.17','7.55.0','7.55.1','7.55.2','7.55.4','7.55.5','7.55.6','7.55.7','7.55.8','7.55.9','7.56.0','7.56.1','7.56.2', '7.56.3', '7.56.4', '7.56.7','7.56.8','7.56.9','7.56.11','7.56.12','7.56.13','7.56.14','7.56.15','7.57.0','7.57.1','7.57.2','7.57.3','7.57.4'}: fail('public tournament hub release must preserve 7.54.17 or later')
if next_event.get('name')!='Evan Cousineau Memorial Cup': fail('completed Session 3 must no longer be the next tournament')
if not any(e.get('id')=='2026-jo-session-3' and e.get('mode')=='platform' for e in hub.get('events',[])): fail('Session 3 is not registered in the public archive')
hub_js=(ROOT/'js/tournament-hub-v7-54-4.js').read_text()
if 'Open ${next.name}' not in hub_js or 'next.publicPath' not in hub_js: fail('hero button does not follow the current tournament')

workflow=(ROOT/'.github/workflows/sync-jo-live-relay.yml').read_text()
for token in ['Refresh archived JO Session 3 relay bank on demand','--event 2026-jo-session-3','--workers 3','--timeout 8','--max-candidates 2']:
    if token not in workflow: fail(f'archived relay workflow is missing: {token}')
if 'cron:' in workflow: fail('completed Session 3 must not retain scheduled relay polling')
relay=(ROOT/'scripts/sync-jo-live-relay.py').read_text()
if '"2026-jo-session-3"' not in relay or 'RELEASE = "7.54.5"' not in relay: fail('relay builder is not Session 3 ready')

if sum(v[3] for v in EXPECTED.values())!=545: fail('internal expected-game total is not 545')
if errors:
    print('JO SESSION 3 7.54.6 TEST FAILED')
    for error in errors: print(' -',error)
    sys.exit(1)
print('JO SESSION 3 7.54.6 TEST PASSED')
print(' - Eight Championship divisions retain 545 games: 464 finals and 81 unscored 12U Coed games')
print(' - Team journeys preserve next-game and win/loss pathway logic')
print(' - Club logos are intentionally disabled only in the Session 3 viewer')
print(' - The reusable archive and legacy live-capable viewer remain source-traceable')
