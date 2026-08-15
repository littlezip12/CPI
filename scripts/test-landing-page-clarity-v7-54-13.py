#!/usr/bin/env python3
from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []

def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')

site = json.loads(read('config/site-release.json'))
expected_release_values = {
    'version': {'7.54.13','7.54.14','7.54.15','7.54.17','7.54.18','7.55.0','7.55.1','7.55.2','7.55.4','7.55.5','7.55.6','7.55.7','7.55.8','7.55.9','7.56.0','7.56.1','7.56.2', '7.56.3', '7.56.4', '7.56.7','7.56.8','7.56.9','7.56.11','7.56.12','7.56.13','7.56.14','7.56.15','7.57.0','7.57.1','7.57.2','7.57.3','7.57.4','7.57.5','7.57.6','7.57.7','7.57.8','7.57.9','7.57.10','7.57.11','7.57.12','7.57.13','7.57.14','7.57.15','7.57.16','7.57.17','7.57.18', '7.57.19','7.57.20','7.57.21','7.57.22','7.58.0','7.58.1','7.58.2','7.58.3','7.58.4','7.58.5','7.58.6','7.58.7','7.58.8','7.58.9','7.58.10','7.59.0','7.60.0','7.60.1','7.60.2','7.60.3'},
    'homepageRelease': {'7.54.13','7.54.18','7.55.0','7.55.1','7.55.2','7.55.4','7.55.5','7.55.6','7.55.7','7.55.8','7.55.9','7.56.0','7.56.1','7.56.2', '7.56.3', '7.56.4', '7.56.7','7.56.8','7.56.9','7.56.11','7.56.12','7.56.13','7.56.14','7.56.15','7.57.0','7.57.1','7.57.2','7.57.3','7.57.4','7.57.5','7.57.6','7.57.7','7.57.8','7.57.9','7.57.10','7.57.11','7.57.12','7.57.13','7.57.14','7.57.15','7.57.16','7.57.17','7.57.18', '7.57.19','7.57.20','7.57.21','7.57.22','7.58.0','7.58.1','7.58.2','7.58.3','7.58.4','7.58.5','7.58.6','7.58.7','7.58.8','7.58.9','7.58.10','7.59.0','7.60.0','7.60.1','7.60.2','7.60.3'},
    'navigationRelease': {'7.54.13'},
    'publicExperienceRelease': {'7.54.13','7.54.14','7.54.15','7.54.17','7.54.18','7.55.0','7.55.1','7.55.2','7.55.4','7.55.5','7.55.6','7.55.7','7.55.8','7.55.9','7.56.0','7.56.1','7.56.2', '7.56.3', '7.56.4', '7.56.7','7.56.8','7.56.9','7.56.11','7.56.12','7.56.13','7.56.14','7.56.15','7.57.0','7.57.1','7.57.2','7.57.3','7.57.4','7.57.5','7.57.6','7.57.7','7.57.8','7.57.9','7.57.10','7.57.11','7.57.12','7.57.13','7.57.14','7.57.15','7.57.16','7.57.17','7.57.18', '7.57.19','7.57.20','7.57.21','7.57.22','7.58.0','7.58.1','7.58.2','7.58.3','7.58.4','7.58.5','7.58.6','7.58.7','7.58.8','7.58.9','7.58.10','7.59.0','7.60.0','7.60.1','7.60.2','7.60.3'},
    'sectionLandingRelease': {'7.54.13','7.54.14','7.54.15','7.54.17','7.54.18','7.55.0','7.55.1','7.55.2','7.55.4','7.55.5','7.55.6','7.55.7','7.55.8','7.55.9','7.56.0','7.56.1','7.56.2', '7.56.3', '7.56.4', '7.56.7','7.56.8','7.56.9','7.56.11','7.56.12','7.56.13','7.56.14','7.56.15','7.57.0','7.57.1','7.57.2','7.57.3','7.57.4','7.57.5','7.57.6','7.57.7','7.57.8','7.57.9','7.57.10','7.57.11','7.57.12','7.57.13','7.57.14','7.57.15','7.57.16','7.57.17','7.57.18', '7.57.19','7.57.20','7.57.21','7.57.22','7.58.0','7.58.1','7.58.2','7.58.3','7.58.4','7.58.5','7.58.6','7.58.7','7.58.8','7.58.9','7.58.10','7.59.0','7.60.0','7.60.1','7.60.2','7.60.3'},
}
for key, allowed in expected_release_values.items():
    if site.get(key) not in allowed:
        errors.append(f'{key} must preserve the 7.54.13 landing release')

home = read('index.html')
shell = read('js/site-shell.js')
landing_css = read('css/section-landing-v7-53-4.css')
home_css = read('css/homepage-wpi-v7-54-12.css')

required_home = [
    'Know the teams. <em>Follow the season.</em>',
    'Independent youth water polo rankings, tournament results, and connected team and club profiles—all in one place.',
    'href="teams.html#team-directory"',
    'class="wpi-directory-summary"',
    'id="wpiCaliforniaClubCount"',
    'id="wpiNationalClubCount"',
    'class="wpi-california-region-grid"',
    'css/homepage-wpi-v7-54-12.css?v=7.54.13',
    'js/site-shell.js?v=7.54.13',
]
for token in required_home:
    if token not in home: errors.append(f'homepage missing {token}')
for forbidden in ('wpi-us-shape','wpi-us-california','role="img" aria-label="Stylized United States map','data-home-action="team-search"'):
    if forbidden in home: errors.append(f'homepage retains removed token {forbidden}')

for label in ('Home','Rankings','Teams','Clubs','Tournaments'):
    if f'label: "{label}"' not in shell: errors.append(f'primary header missing {label}')
if 'label: "Methodology"' in shell: errors.append('Methodology remains in the primary header')
for token in ('makeHref("methodology.html")','teams.html#team-directory'):
    if token not in shell: errors.append(f'shell lost supporting destination {token}')

pages = {
    'teams.html': ('Find a team. Follow its season.','wpi-section-hero--teams'),
    'clubs.html': ('Explore youth water polo clubs.','wpi-section-hero--clubs'),
    'rankings.html': ('See where every team stands.','wpi-section-hero--rankings'),
    'tournaments.html': ('Follow every game. See every path.','wpi-section-hero--tournaments'),
    'methodology.html': ('Transparent rankings. Verifiable results.','wpi-section-hero--methodology'),
}
for rel,(headline,modifier) in pages.items():
    text=read(rel)
    if headline not in text: errors.append(f'{rel} missing updated headline')
    if modifier not in text: errors.append(f'{rel} lost shared hero modifier')
    if 'js/site-shell.js?v=7.54.13' not in text: errors.append(f'{rel} has stale shell cache key')

for token in ('min-height: 300px','font-size: clamp(38px, 4.3vw, 60px)','padding: clamp(30px, 4vw, 50px)'):
    if token not in landing_css: errors.append(f'compact landing CSS missing {token}')
for token in ('min-height: 390px','.wpi-directory-summary','min-height: 168px'):
    if token not in home_css: errors.append(f'compact homepage CSS missing {token}')
for forbidden in ('.wpi-us-shape','.wpi-us-california','.wpi-map-stat'):
    if forbidden in home_css: errors.append(f'homepage CSS retains faux-map rule {forbidden}')

# All public pages must request the current shared shell.
stale=[]
for path in ROOT.rglob('*.html'):
    text=path.read_text(encoding='utf-8',errors='ignore')
    if 'site-shell.js?v=7.54.13' not in text or 'site-shell.css?v=7.54.13' not in text:
        stale.append(str(path.relative_to(ROOT)))
if stale: errors.append(f'pages with stale shared shell: {stale[:10]}')

rankings=json.loads(read('rankings.json'))
clubs=json.loads(read('clubs.json'))
jo=json.loads(read('data/tournaments/jo-results-2026.json'))
if len(rankings)!=724: errors.append(f'expected 724 rankings, found {len(rankings)}')
if len(clubs)!=182: errors.append(f'expected 182 clubs, found {len(clubs)}')
if jo.get('summary',{}).get('teamPlacements')!=976: errors.append('expected 976 JO placements')

if errors:
    print('WPI LANDING PAGE CLARITY 7.54.13 TEST FAILED')
    for error in errors: print(f' - {error}')
    sys.exit(1)
print('WPI LANDING PAGE CLARITY 7.54.13 TEST PASSED')
print(' - Primary navigation is focused on Rankings, Teams, Clubs, and Tournaments; Methodology remains available as supporting content')
print(' - Home, Rankings, Teams, Clubs, Tournaments, and Methodology use shorter task-focused positioning')
print(' - The inaccurate map is removed; national coverage and California region filters remain')
print(' - 724 rankings, 182 clubs, and 976 JO placements remain unchanged')
