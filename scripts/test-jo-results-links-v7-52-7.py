#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []

def fail(message: str) -> None:
    errors.append(message)

def load(path: str):
    return json.loads((ROOT / path).read_text(encoding='utf-8'))

site = load('config/site-release.json')
results = load('data/tournaments/jo-results-2026.json')
clubs = load('club-registry.json')
html = (ROOT / 'tournaments.html').read_text(encoding='utf-8')
js = (ROOT / 'js/tournament-hub-v7-54-4.js').read_text(encoding='utf-8')
css = (ROOT / 'css/tournament-hub-v7-54-4.css').read_text(encoding='utf-8')
home = (ROOT / 'js/homepage-wpi-v7-52-4.js').read_text(encoding='utf-8')
boys = (ROOT / 'tournaments/jo-boys/app.js').read_text(encoding='utf-8')
girls = (ROOT / 'tournaments/jo-girls/app.js').read_text(encoding='utf-8')
boys_html = (ROOT / 'tournaments/jo-boys/index.html').read_text(encoding='utf-8')
girls_html = (ROOT / 'tournaments/jo-girls/index.html').read_text(encoding='utf-8')

if site.get('version') not in {'7.52.7','7.52.8','7.52.9','7.52.10','7.52.11','7.52.12','7.52.13','7.52.14','7.52.15','7.52.16','7.53.0','7.53.1','7.53.2','7.53.3','7.53.4','7.53.5','7.53.6','7.53.7','7.54.0','7.54.1','7.54.2','7.54.3','7.54.4','7.54.5','7.54.6','7.54.7','7.54.8','7.54.9','7.54.10','7.54.11','7.54.12','7.54.13','7.54.14','7.54.15','7.54.17','7.54.18','7.55.0','7.55.1','7.55.2','7.55.4','7.55.5','7.55.6','7.55.7','7.55.8','7.55.9','7.56.0','7.56.1','7.56.2', '7.56.3', '7.56.4', '7.56.7','7.56.8','7.56.9','7.56.11','7.56.12','7.56.13','7.56.14','7.56.15','7.57.0','7.57.1','7.57.2','7.57.3','7.57.4','7.57.5','7.57.6','7.57.7','7.57.8','7.57.9'}: fail('site release must preserve JO results links 7.52.7 or later')
for key in ['joResultsRelease','joJourneyRelease','joLogoRelease']:
    if site.get(key) not in {'7.52.7','7.52.8','7.52.9','7.52.10','7.52.11','7.52.12','7.52.13','7.52.14','7.52.15'}: fail(f'{key} must preserve JO results links 7.52.7 or later')
if site.get('tournamentUIRelease') not in {'7.52.15','7.54.0','7.54.1','7.54.2','7.54.3','7.54.4','7.54.5','7.54.6','7.54.7','7.54.8','7.54.9','7.54.10','7.54.11','7.54.17','7.54.18','7.55.0','7.55.1','7.55.2','7.55.4','7.55.5','7.55.6','7.55.7','7.55.8','7.55.9','7.56.0','7.56.1','7.56.2', '7.56.3', '7.56.4', '7.56.7','7.56.8','7.56.9','7.56.11','7.56.12','7.56.13','7.56.14','7.56.15','7.57.0','7.57.1','7.57.2','7.57.3','7.57.4','7.57.5','7.57.6','7.57.7','7.57.8','7.57.9'}: fail('tournamentUIRelease must preserve JO results links while allowing the reusable tournament platform')
if results.get('summary',{}).get('teamPlacements') != 976: fail('JO placement count changed')

required_html = [
    'data/identity/runtime.js?v=7.53.4',
    'js/cpi-identity.js?v=7.53.4',
    'data/tournaments/jo-profile-runtime.js?v=7.53.4',
    'js/tournament-hub-v7-54-4.js?v=7.55.1',
    'css/tournament-hub-v7-54-4.css?v=7.55.0',
    'id="archiveGroupSelect"',
]
for token in required_html:
    if token not in html: fail(f'tournaments.html missing {token}')

required_js = [
    'archive-team-logo', 'archive-team-link', 'View games',
    'tournaments/${app}/?', 'focus:"journey"',
    '10u-boys-championship', '10u-championship',
    '10u-coed-classic', '10u-girls-classic',
    'window.CPIIdentity?.resolveTeam', 'window.CPIIdentity?.resolveClub',
    'window.WPI_JO_PROFILES', 'joProfiles.lookup',
]
for token in required_js:
    if token not in js: fail(f'public archive missing {token}')
for token in ['.archive-team-logo','.archive-team-link','.archive-team-name']:
    if token not in css: fail(f'public archive CSS missing {token}')
for token in ['resultJourneyLink','resultAsset','focus: "journey"']:
    if token not in home: fail(f'homepage result preview missing {token}')

for name, text, page in [('Boys',boys,boys_html),('Girls',girls,girls_html)]:
    for token in ['normalizedTeamKey', "initialParams.get('focus')==='journey'", "scrollIntoView({behavior:'smooth',block:'start'})"]:
        if token not in text: fail(f'{name} JO app missing {token}')
    if 'app.js?v=7.53.4' not in page: fail(f'{name} JO page does not cache-bust the 7.52.9 app delivery')

# Every results division must route to an actual application dataset.
def dataset_ids(text: str) -> set[str]:
    match = re.search(r'const DATASETS=(\[.*?\]);\nconst EMBEDDED_', text, re.S)
    if not match:
        fail('could not parse JO application datasets')
        return set()
    return {row['id'] for row in json.loads(match.group(1))}

boys_ids = dataset_ids(boys)
girls_ids = dataset_ids(girls)
placements = 0
for group in results.get('groups',[]):
    app_ids = boys_ids if group.get('category') == 'Boys' else girls_ids
    for division in group.get('divisions',[]):
        division_id = division.get('id')
        routed = {'10u-boys-championship':'10u-championship','10u-coed-classic':'10u-girls-classic'}.get(division_id,division_id)
        if routed not in app_ids: fail(f'{group.get("id")}/{division_id} routes to missing dataset {routed}')
        placements += sum(len(sub.get('teams',[])) for sub in division.get('subdivisions',[]))
if placements != 976: fail(f'expected 976 linked placements, found {placements}')

# San Diego Shores supplied artwork is now verified and usable by the results resolver.
shores = next((club for club in clubs if club.get('slug') == 'san-diego-shores'), None)
if not shores: fail('San Diego Shores club record missing')
else:
    if shores.get('logoStatus') != 'verified_by_user': fail('San Diego Shores logo is not user verified')
    if shores.get('logo') != 'assets/logos/canonical/san-diego-shores.webp': fail('San Diego Shores logo path is incorrect')
asset = ROOT / 'assets/logos/canonical/san-diego-shores.webp'
if not asset.exists() or asset.stat().st_size < 100: fail('San Diego Shores WebP asset is missing')

if errors:
    print('JO RESULTS LINKS 7.52.7 TEST FAILED')
    for error in errors: print(' -',error)
    sys.exit(1)
print('JO RESULTS LINKS 7.52.7 TESTS PASSED')
print(' - 976 final placements route to valid Boys or Girls/Coed JO division viewers')
print(' - Club logos render in the public archive and homepage result previews')
print(' - Team links select and focus the completed JO journey with tolerant name matching')
print(' - San Diego Shores artwork is verified and synchronized')
