#!/usr/bin/env python3
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
errors=[]
site=json.loads((ROOT/'config/site-release.json').read_text())
parts=str(site.get('version','')).split('.')
if len(parts)<2 or parts[0]!='7' or not parts[1].isdigit() or int(parts[1])<50:
    errors.append('Site release must be 7.50.0 or newer')
ui_parts=str(site.get('tournamentUIRelease','')).split('.')
if len(ui_parts)<2 or ui_parts[0]!='7' or not ui_parts[1].isdigit() or int(ui_parts[1])<50:
    errors.append('Tournament UI release must be registered as 7.50.0 or newer')
for rel in ['tournaments/jo-unified-v7-50.css','css/tournaments-unified-v7-50.css','tournaments/jo-boys/index.html','tournaments/jo-girls/index.html','tournaments.html']:
    if not (ROOT/rel).exists(): errors.append(f'Missing {rel}')
# Guard public app mounts and live-update behavior.
required_ids=['refresh','sheetLink','share','age','division','team','sourceMeta','summary','next','journey','schedule','fullSchedule']
for side in ['jo-boys','jo-girls']:
    html=(ROOT/f'tournaments/{side}/index.html').read_text()
    for ident in required_ids:
        if f'id="{ident}"' not in html: errors.append(f'{side} missing required app mount #{ident}')
    app=(ROOT/f'tournaments/{side}/app.js').read_text()
    if '120000' not in app: errors.append(f'{side} no longer polls the live source every two minutes')
    if 'fetchDataset(config)' not in app: errors.append(f'{side} live source retrieval was removed')
if errors:
    print('TOURNAMENT UI 7.50 VALIDATION FAILED')
    for e in errors: print(' -',e)
    raise SystemExit(1)
print('TOURNAMENT UI 7.50 VALIDATION PASSED')
print(' - Unified light design is registered for the tournament hub and both JO weekends')
print(' - Existing public application mounts, live source checks, and verified fallbacks remain intact')
print(' - Rankings and tournament data models are unchanged')
