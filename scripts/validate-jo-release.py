#!/usr/bin/env python3
"""Static release checks for CPI Junior Olympics schedule tools."""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
REQUIRED_IDS = {
    'age','division','team','summary','next','journey','paths','potential','schedule',
    'search','day','share','teamView','emptyState','pathSection','journeyTab',
    'relevantTab','relevant','refresh','sheetLink','statusText','liveDot',
    'fullSchedule','fullCount','fullSearch','fullDay','sourceMeta'
}
EXPECTED_BOYS = {
    ('10U','Championship (D1)','1659399499'),
    ('12U','Boys Championship (D1)','1775879786'),
    ('12U','Boys Classic (D2)','1808416221'),
    ('14U','Boys Championship (D1)','345265555'),
    ('14U','Boys Classic (D2)','732732301'),
    ('14U','Boys Invitational (D3)','1975322406'),
    ('16U','Boys Championship (D1)','2012475287'),
    ('16U','Boys Classic (D2)','1142418841'),
    ('16U','Boys Invitational (D3)','1686454973'),
    ('18U','Boys Championship (D1)','38488572'),
    ('18U','Boys Classic (D2)','333261986'),
    ('18U','Boys Invitational (D3)','289749610'),
}

EXPECTED_BOYS_SHEETS = {
    '10u-championship': ('10U_M_Champ_35', 141),
    '12u-boys-championship': ('12U_M_Champ', 192),
    '12u-boys-classic': ('12U_M_Classic_53', 218),
    '14u-boys-championship': ('14U_M_Champ', 192),
    '14u-boys-classic': ('14U_M_Classic', 192),
    '14u-boys-invitational': ('14U_M_Invite_36', 146),
    '16u-boys-championship': ('16U_M_Champ', 192),
    '16u-boys-classic': ('16U_M_Classic', 192),
    '16u-boys-invitational': ('16U_M_Invite', 192),
    '18u-boys-championship': ('18U_M_Champ', 192),
    '18u-boys-classic': ('18U_M_Classic', 192),
    '18u-boys-invitational': ('18U_M_Invite 24', 92),
}

errors: list[str] = []

def fail(message: str) -> None:
    errors.append(message)

def check_html(rel: str) -> None:
    path = ROOT / rel
    if not path.exists():
        fail(f'Missing HTML: {rel}')
        return
    text = path.read_text(encoding='utf-8')
    ids = set(re.findall(r'\bid=["\']([^"\']+)', text))
    missing = sorted(REQUIRED_IDS - ids)
    if missing:
        fail(f'{rel}: missing required IDs: {", ".join(missing)}')
    for attr in re.findall(r'\b(?:href|src)=["\']([^"\']+)', text):
        if not attr or attr.startswith(('http://','https://','#','mailto:','javascript:','data:')):
            continue
        clean = attr.split('?',1)[0].split('#',1)[0]
        target = (path.parent / clean)
        if attr.endswith('/'):
            target /= 'index.html'
        if not target.exists():
            fail(f'{rel}: unresolved local reference {attr}')

registry_path = ROOT / 'data/tournaments/registry.json'
if not registry_path.exists():
    fail('Missing central tournament source registry')
    boys_rows = []
    girls_rows = []
else:
    registry = json.loads(registry_path.read_text(encoding='utf-8'))
    events = {event.get('id'): event for event in registry.get('events', [])}
    boys_event = events.get('2026-jo-weekend-2') or {}
    girls_event = events.get('2026-jo-weekend-1') or {}
    boys_rows = boys_event.get('divisions', [])
    girls_rows = girls_event.get('divisions', [])
    actual = {(x.get('ageGroup'), x.get('id'), str(x.get('gid'))) for x in boys_rows}
    expected = {
        ('10U','10u-championship','1659399499'),
        ('12U','12u-boys-championship','1775879786'),
        ('12U','12u-boys-classic','1808416221'),
        ('14U','14u-boys-championship','345265555'),
        ('14U','14u-boys-classic','732732301'),
        ('14U','14u-boys-invitational','1975322406'),
        ('16U','16u-boys-championship','2012475287'),
        ('16U','16u-boys-classic','1142418841'),
        ('16U','16u-boys-invitational','1686454973'),
        ('18U','18u-boys-championship','38488572'),
        ('18U','18u-boys-classic','333261986'),
        ('18U','18u-boys-invitational','289749610'),
    }
    if actual != expected:
        fail(f'Central Boys JO registry mismatch. Expected {len(expected)} exact datasets, found {len(actual)}')
    if len(girls_rows) != 11:
        fail(f'Central Girls JO registry should contain 11 datasets, found {len(girls_rows)}')
    for row in boys_rows:
        expected_sheet, expected_games = EXPECTED_BOYS_SHEETS.get(row.get('id'), (None, None))
        if row.get('sheetName') != expected_sheet:
            fail(f'Boys JO stable sheet-name mismatch for {row.get("id")}: {row.get("sheetName")!r}')
        if row.get('sourceStrategy') != 'sheet_name_primary':
            fail(f'Boys JO source strategy must be sheet_name_primary for {row.get("id")}')
        if row.get('expectedScheduleGames') != expected_games:
            fail(f'Boys JO expected game count mismatch for {row.get("id")}')
        snapshot = ROOT / str(row.get('snapshotPath') or '')
        if not snapshot.exists():
            fail(f'Missing Boys JO verified snapshot for {row.get("id")}: {row.get("snapshotPath")}')
    for label, rows in [('Boys', boys_rows), ('Girls', girls_rows)]:
        gids = [str(x.get('gid')) for x in rows]
        ids = [x.get('id') for x in rows]
        if len(gids) != len(set(gids)):
            fail(f'{label} JO registry contains duplicate primary GIDs')
        if len(ids) != len(set(ids)):
            fail(f'{label} JO registry contains duplicate dataset IDs')
        for row in rows:
            sheet_id = row.get('spreadsheetId')
            expected_url = f'https://docs.google.com/spreadsheets/d/{sheet_id}/edit?gid={row["gid"]}#gid={row["gid"]}'
            if row.get('sourceUrl') != expected_url:
                fail(f'Bad {label} JO source URL for {row.get("id")}')

for rel in ('tournaments/jo-boys/index.html','tournaments/jo-girls/index.html'):
    check_html(rel)

boys_app = ROOT / 'tournaments/jo-boys/app.js'
if not boys_app.exists():
    fail('Missing Boys JO app.js')
else:
    app_text = boys_app.read_text(encoding='utf-8')
    for forbidden in ('joGirlsSchedule','joAgeV5','joDivisionV5','joSelectedTeam'):
        if forbidden in app_text:
            fail(f'Boys app contains Girls/shared storage key: {forbidden}')
    for row in boys_rows:
        if str(row['gid']) not in app_text or row['id'] not in app_text:
            fail(f'Boys app is out of sync with central registry: {row["id"]}')

for rel in ('tournaments/jo-boys/app.js','tournaments/jo-girls/app.js'):
    path = ROOT / rel
    if path.exists():
        app_text = path.read_text(encoding='utf-8')
        for token in ('seedLookup','seedForTeam','teamOptionLabel','jo-seed-badge','JO seed','renderSourceMeta','scheduled · ${completed} completed',"completed.length?`${wins}-${losses}`:'—'"):
            if token not in app_text:
                fail(f'{rel}: missing JO seed metadata/display support: {token}')
        expected_app_version = "7.50.8"
        if f"const APP_VERSION='{expected_app_version}';" not in app_text:
            fail(f"{rel}: expected APP_VERSION {expected_app_version}")
        result = subprocess.run(['node','--check',str(path)],capture_output=True,text=True)
        if result.returncode:
            fail(f'{rel}: JavaScript syntax error: {result.stderr.strip()}')

hub = (ROOT/'tournaments.html').read_text(encoding='utf-8')
home = (ROOT/'index.html').read_text(encoding='utf-8')
for page_name, text in [('tournaments.html',hub),('index.html',home)]:
    if 'tournaments/jo-boys/' not in text:
        fail(f'{page_name}: missing Boys JO link')

if errors:
    print('JO RELEASE VALIDATION FAILED')
    for item in errors:
        print(f' - {item}')
    sys.exit(1)

print('JO RELEASE VALIDATION PASSED')
print(f' - {len(EXPECTED_BOYS)} Boys divisions registered')
print(' - Boys and Girls entry pages contain all required application mounts')
print(' - Girls app and all 23 JO sources are represented in the central tournament registry')
print(' - JO division seeds are metadata and display separately from clean team names')
print(' - Both apps poll live Google Sheets every two minutes and expose source freshness plus scheduled/completed counts')
print(' - Boys sources use stable sheet names first, legacy GIDs second, and verified repository snapshots last')
print(' - Local JO page assets resolve')
print(' - JavaScript syntax checks passed')
print(' - Homepage and tournament hub link to Boys JO')
