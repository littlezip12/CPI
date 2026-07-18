#!/usr/bin/env python3
"""Validate all 12 Boys JO sources, verified snapshots, and source-selection safeguards."""
from __future__ import annotations
import json, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from tournament_pipeline import IdentityResolver, load_json, normalize_csv
EXPECTED={'10u-championship': {'sheetName': '10U_M_Champ_35', 'games': 141}, '12u-boys-championship': {'sheetName': '12U_M_Champ', 'games': 192}, '12u-boys-classic': {'sheetName': '12U_M_Classic_53', 'games': 218}, '14u-boys-championship': {'sheetName': '14U_M_Champ', 'games': 192}, '14u-boys-classic': {'sheetName': '14U_M_Classic', 'games': 192}, '14u-boys-invitational': {'sheetName': '14U_M_Invite_36', 'games': 146}, '16u-boys-championship': {'sheetName': '16U_M_Champ', 'games': 192}, '16u-boys-classic': {'sheetName': '16U_M_Classic', 'games': 192}, '16u-boys-invitational': {'sheetName': '16U_M_Invite', 'games': 192}, '18u-boys-championship': {'sheetName': '18U_M_Champ', 'games': 192}, '18u-boys-classic': {'sheetName': '18U_M_Classic', 'games': 192}, '18u-boys-invitational': {'sheetName': '18U_M_Invite 24', 'games': 92}}
errors=[]
def fail(msg): errors.append(msg)
registry=load_json(ROOT/'data/tournaments/registry.json')
event=next((e for e in registry.get('events',[]) if e.get('id')=='2026-jo-weekend-2'),{})
rows={d.get('id'):d for d in event.get('divisions',[])}
resolver=IdentityResolver()
total=0
for division_id,expected in EXPECTED.items():
    d=rows.get(division_id)
    if not d:
        fail(f'Missing Boys JO division {division_id}');continue
    if d.get('sheetName')!=expected['sheetName']:
        fail(f'{division_id} stable sheet name mismatch: {d.get("sheetName")!r}')
    if d.get('sourceStrategy')!='sheet_name_primary':
        fail(f'{division_id} does not use sheet_name_primary')
    snapshot=ROOT/str(d.get('snapshotPath') or '')
    if not snapshot.exists():
        fail(f'{division_id} verified snapshot is missing');continue
    text=snapshot.read_text(encoding='utf-8-sig')
    normalized,qa=normalize_csv(text,event=event,division=d,resolver=resolver,fetched_at=d.get('verifiedSnapshotAt') or '2026-07-16T06:01:54Z',source_mode='validation_snapshot')
    counts=normalized.get('counts',{})
    if counts.get('games')!=expected['games']:
        fail(f'{division_id} should contain {expected["games"]} games, found {counts.get("games")}')
    if counts.get('finalGames')!=0:
        fail(f'{division_id} contains completed games before tournament start')
    if counts.get('blockers')!=0:
        fail(f'{division_id} contains blocking data issues')
    if counts.get('bracketReferences',0)<=0:
        fail(f'{division_id} lost structured bracket references')
    total+=int(counts.get('games') or 0)
app=(ROOT/'tournaments/jo-boys/app.js').read_text(encoding='utf-8')
if "const APP_VERSION='7.50.5';" not in app: fail('Boys app version is not 7.50.5')
if 'function configuredSheetNames' not in app or 'function fetchVerifiedSnapshot' not in app: fail('Boys app lacks stable-name or snapshot fallback support')
if app.find('for(const name of configuredSheetNames(config))')>app.find('for(const gid of gids)'):
    fail('Boys browser app does not try sheet names before GIDs')
for division_id,expected in EXPECTED.items():
    if expected['sheetName'] not in app or f'{division_id}.csv' not in app:
        fail(f'Boys app is missing source metadata for {division_id}')
if total!=2133: fail(f'All Boys snapshots should contain 2133 schedule games, found {total}')
if errors:
    print('BOYS JO SOURCE STABILITY VALIDATION FAILED')
    for item in errors: print(f' - {item}')
    raise SystemExit(1)
print('BOYS JO SOURCE STABILITY VALIDATION PASSED')
print(' - 12 Boys divisions use verified worksheet names before mutable GIDs')
print(' - 12 same-origin snapshots contain 2,133 scheduled games and 0 completed games')
print(' - Every snapshot retains structured bracket references and 0 blocking defects')
print(' - The browser can fall back to the repository snapshot when Google live endpoints fail')

app_text = (ROOT / 'tournaments' / 'jo-boys' / 'app.js').read_text(encoding='utf-8')
if 'const EMBEDDED_SNAPSHOT_CSV=' not in app_text:
    fail('Boys app does not contain built-in verified schedule snapshots')
if 'schedule loaded · checking live Google Sheet' not in app_text:
    fail('Boys app does not render verified schedules before live-source attempts')
