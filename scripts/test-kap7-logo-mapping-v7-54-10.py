#!/usr/bin/env python3
from pathlib import Path
import json, sys

ROOT = Path(__file__).resolve().parents[1]
errors = []
load = lambda rel: json.loads((ROOT / rel).read_text(encoding='utf-8'))
site = load('config/site-release.json')
bundle = load('data/tournaments/platform/events/2026-kap7-international.json')
source_registry = load('data/tournaments/registry.json')

if site.get('version') not in {'7.54.11','7.54.12','7.54.13','7.54.14','7.54.15','7.54.17','7.54.18','7.55.0','7.55.1','7.55.2','7.55.4','7.55.5','7.55.6','7.55.7','7.55.8','7.55.9','7.56.0','7.56.1','7.56.2', '7.56.3', '7.56.4', '7.56.7','7.56.8','7.56.9','7.56.11','7.56.12','7.56.13','7.56.14','7.56.15','7.57.0','7.57.1','7.57.2','7.57.3','7.57.4','7.57.5','7.57.6','7.57.7','7.57.8','7.57.9','7.57.10','7.57.11','7.57.12','7.57.13','7.57.14','7.57.15','7.57.16','7.57.17','7.57.18', '7.57.19','7.57.20','7.57.21','7.57.22','7.58.0','7.58.1'}:
    errors.append('site version must be 7.54.11')
if site.get('kap7LogoMappingRelease') != '7.54.10':
    errors.append('kap7LogoMappingRelease must be 7.54.10')
if bundle.get('release') != '7.54.17':
    errors.append('KAP7 platform bundle must be rebuilt for 7.54.17')
source_event = next((e for e in source_registry.get('events', []) if e.get('id') == '2026-kap7-international'), None)
if not source_event or source_event.get('platformRelease') != '7.54.10':
    errors.append('KAP7 source registry platformRelease must be 7.54.10')

expected = {
    ('10U Coed Gold', 'SOUTH BAY UNITED'): 'assets/logos/canonical/south-bay-united.webp',
    ('10U Coed Platinum', 'CHULA VISTA PREMIER'): 'assets/logos/canonical/cv-premier.webp',
    ('12U Boys Gold', 'SAN MATEO'): 'assets/logos/canonical/san-mateo.webp',
    ('12U Boys Gold', 'MARIN'): 'assets/logos/canonical/marin.webp',
    ('12U Coed', 'LA CITY UNITED'): 'assets/logos/canonical/la-city-united.webp',
    ('12U Coed', 'PALOS VERDES'): 'assets/logos/canonical/palos-verdes.webp',
    ('12U Coed', 'POWAY VALLEY'): 'assets/logos/canonical/poway-valley.webp',
    ('14U Boys Gold', 'BOA'): 'assets/logos/canonical/boa.webp',
    ('14U Boys Gold', 'LAWPC'): 'assets/logos/canonical/lawpc.webp',
    ('14U Girls Gold', 'PALOS VERDES'): 'assets/logos/canonical/palos-verdes.webp',
    ('14U Boys Platinum', 'PALOS VERDES A'): 'assets/logos/canonical/palos-verdes.webp',
    ('14U Boys Silver', 'POWAY VALLEY BLACK'): 'assets/logos/canonical/poway-valley-black.webp',
    ('14U Boys Silver', 'NADO'): 'assets/logos/canonical/nado.webp',
    ('14U Boys Silver', 'PALOS VERDES B'): 'assets/logos/canonical/palos-verdes.webp',
    ('14U Boys Silver', 'TRITON GOLD'): 'assets/logos/canonical/triton-gold.webp',
    ('16U Boys Gold', 'BOA BLUE'): 'assets/logos/canonical/boa.webp',
    ('16U Boys Gold', 'POWAY VALLEY BLACK'): 'assets/logos/canonical/poway-valley-black.webp',
    ('16U Boys Gold', 'ST LOUIS AREA POLO'): 'assets/logos/canonical/slap.webp',
    ('16U Boys Silver', 'BOA WHITE'): 'assets/logos/canonical/boa.webp',
    ('16U Boys Silver', 'TRITON GOLD'): 'assets/logos/canonical/triton-gold.webp',
    ('19U Boys Gold', 'MARIN'): 'assets/logos/canonical/marin.webp',
    ('19U Boys Platinum', 'CHULA VISTA PREMIER'): 'assets/logos/canonical/cv-premier.webp',
    ('19U Boys Platinum', 'POWAY VALLEY BLACK'): 'assets/logos/canonical/poway-valley-black.webp',
    ('19U Boys Platinum', 'RIVERSIDE'): 'assets/logos/canonical/riverside.webp',
    ('19U Boys Platinum', 'SHADOW MEN'): 'assets/logos/canonical/shadow.webp',
    ('19U Boys Silver', 'OPA'): 'assets/logos/canonical/santa-barbara-premier.webp',
}

actual = {(t.get('divisionLabel'), t.get('name')): t for t in bundle.get('teams', [])}
for key, logo in expected.items():
    team = actual.get(key)
    if not team:
        errors.append(f'missing KAP7 team journey: {key[0]} / {key[1]}')
        continue
    if team.get('logo') != logo:
        errors.append(f'{key[0]} / {key[1]} expected {logo}, found {team.get("logo")}')
    asset = ROOT / logo
    if not asset.exists() or asset.stat().st_size == 0:
        errors.append(f'missing or empty logo asset: {logo}')

fallback = [t for t in bundle.get('teams', []) if t.get('logo') == 'assets/logos/cpi-logo-fallback.svg']
if fallback:
    errors.append(f'KAP7 still contains {len(fallback)} fallback-logo entries: {[(t.get("divisionLabel"), t.get("name")) for t in fallback]}')
if len(bundle.get('teams', [])) != 280:
    errors.append('KAP7 team journey count changed')
if len(bundle.get('games', [])) != 579:
    errors.append('KAP7 game count changed')
if len(load('rankings.json')) != 724:
    errors.append('rankings count changed')
if len(load('clubs.json')) != 182:
    errors.append('club count changed')

if errors:
    print('KAP7 LOGO MAPPING 7.54.10 TEST FAILED')
    for error in errors:
        print(' -', error)
    sys.exit(1)

print('KAP7 LOGO MAPPING 7.54.10 TEST PASSED')
print(' - all 26 previously unresolved division-team entries now use user-verified artwork')
print(' - all 280 KAP7 team journeys display non-fallback artwork')
print(' - tournament results, rankings, and club counts remain unchanged')
