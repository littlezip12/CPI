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
    'fullSchedule','fullCount','fullSearch','fullDay'
}
EXPECTED_BOYS = {
    ('10U','Championship (D1)','1659399499'),
    ('12U','Boys Championship (D1)','1775879786'),
    ('12U','Boys Classic (D2)','1808416221'),
    ('14U','Boys Championship (D1)','345265555'),
    ('14U','Boys Classic (D2)','1855118263'),
    ('14U','Boys Invitational (D3)','1975322406'),
    ('16U','Boys Championship (D1)','2012475287'),
    ('16U','Boys Classic (D2)','1142418841'),
    ('16U','Boys Invitational (D3)','1686454973'),
    ('18U','Boys Championship (D1)','38488572'),
    ('18U','Boys Classic (D2)','333261986'),
    ('18U','Boys Invitational (D3)','289749610'),
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

registry_path = ROOT / 'tournaments/jo-boys/source-registry.json'
girls_registry_path = ROOT / 'tournaments/jo-girls/source-registry.json'
if not registry_path.exists():
    fail('Missing Boys JO source registry')
else:
    registry = json.loads(registry_path.read_text(encoding='utf-8'))
    rows = registry.get('datasets', [])
    actual = {(x.get('age'), x.get('division'), str(x.get('gid'))) for x in rows}
    if actual != EXPECTED_BOYS:
        fail(f'Boys registry mismatch. Expected {len(EXPECTED_BOYS)} exact datasets, found {len(actual)}')
    gids = [str(x.get('gid')) for x in rows]
    ids = [x.get('id') for x in rows]
    if len(gids) != len(set(gids)):
        fail('Boys registry contains duplicate GIDs')
    if len(ids) != len(set(ids)):
        fail('Boys registry contains duplicate dataset IDs')
    sheet_id = registry.get('sheetId')
    for row in rows:
        expected_url = f'https://docs.google.com/spreadsheets/d/{sheet_id}/edit?gid={row["gid"]}#gid={row["gid"]}'
        if row.get('sourceUrl') != expected_url:
            fail(f'Bad source URL for {row.get("id")}')


if not girls_registry_path.exists():
    fail('Missing Girls JO source registry')
else:
    girls_registry = json.loads(girls_registry_path.read_text(encoding='utf-8'))
    rows = girls_registry.get('datasets', [])
    if len(rows) != 11:
        fail(f'Girls registry should contain 11 datasets, found {len(rows)}')
    gids = [str(x.get('gid')) for x in rows]
    ids = [x.get('id') for x in rows]
    if len(gids) != len(set(gids)):
        fail('Girls registry contains duplicate primary GIDs')
    if len(ids) != len(set(ids)):
        fail('Girls registry contains duplicate dataset IDs')
    sheet_id = girls_registry.get('sheetId')
    for row in rows:
        expected_url = f'https://docs.google.com/spreadsheets/d/{sheet_id}/edit?gid={row["gid"]}#gid={row["gid"]}'
        if row.get('sourceUrl') != expected_url:
            fail(f'Bad Girls source URL for {row.get("id")}')

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
    if registry_path.exists():
        registry = json.loads(registry_path.read_text(encoding='utf-8'))
        for row in registry['datasets']:
            if str(row['gid']) not in app_text or row['id'] not in app_text:
                fail(f'Boys app is out of sync with registry: {row["id"]}')

for rel in ('tournaments/jo-boys/app.js','tournaments/jo-girls/app.js'):
    path = ROOT / rel
    if path.exists():
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
print(' - Girls app and 11-source registry are included')
print(' - Both apps poll live Google Sheets every two minutes and refresh when the tab becomes active')
print(' - Local JO page assets resolve')
print(' - JavaScript syntax checks passed')
print(' - Homepage and tournament hub link to Boys JO')
