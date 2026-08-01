#!/usr/bin/env python3
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []

def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')

site = json.loads(read('config/site-release.json'))
home = read('index.html')
css = read('css/homepage-wpi-v7-54-12.css')
js = read('js/homepage-wpi-v7-52-4.js')
shell = read('js/site-shell.js')

for key in ('version','homepageRelease','navigationRelease','publicExperienceRelease'):
    if site.get(key) not in {'7.54.12','7.54.13'}:
        errors.append(f'{key} must preserve the 7.54.12 homepage release')

required_home = [
    'Know the teams. <em>Follow the season.</em>',
    'teams.html#team-directory',
    'css/homepage-wpi-v7-54-12.css?v=7.54.13',
    'js/homepage-wpi-v7-52-4.js?v=7.54.13',
    'id="wpiFeaturedClubs"',
    'id="wpiCaliforniaClubCount"',
    'id="wpiNationalClubCount"',
    'class="wpi-directory-summary"',
    'class="wpi-california-region-grid"',
    'clubs.html?region=Out%20of%20State#club-directory',
]
for token in required_home:
    if token not in home:
        errors.append(f'homepage missing {token}')

for forbidden in ('wpi-bottom-grid', 'How rankings work', 'Choose where to start', 'id="explore-wpi"'):
    if forbidden in home:
        errors.append(f'homepage retains removed section token: {forbidden}')

for token in ('.wpi-directory-summary', '.wpi-california-region-grid', 'min-height: 390px', 'grid-template-columns: repeat(3,minmax(0,1fr))'):
    if token not in css:
        errors.append(f'homepage release CSS missing {token}')

for token in ('chosen.length === 6', 'wpiCaliforniaClubCount', 'wpiNationalClubCount'):
    if token not in js:
        errors.append(f'homepage runtime missing {token}')
if 'renderExploreGuide' in js:
    errors.append('homepage runtime retains removed explore-guide renderer')

for forbidden in ('const quickLinks', 'cpi-shell-quick', 'Quick ranking links'):
    if forbidden in shell:
        errors.append(f'universal header retains age quick-link rail: {forbidden}')
for label in ('Home','Rankings','Teams','Clubs','Tournaments'):
    if f'label: "{label}"' not in shell:
        errors.append(f'universal header lost primary destination {label}')
if 'label: "Methodology"' in shell:
    errors.append('Methodology remains in the primary header')

rankings = json.loads(read('rankings.json'))
clubs = json.loads(read('clubs.json'))
jo = json.loads(read('data/tournaments/jo-results-2026.json'))
if len(rankings) != 724: errors.append(f'expected 724 rankings, found {len(rankings)}')
if len(clubs) != 182: errors.append(f'expected 182 clubs, found {len(clubs)}')
if jo.get('summary',{}).get('teamPlacements') != 976: errors.append('expected 976 JO placements')

if errors:
    print('WPI HOMEPAGE SIMPLIFICATION 7.54.12 TEST FAILED')
    for error in errors: print(f' - {error}')
    sys.exit(1)

print('WPI HOMEPAGE SIMPLIFICATION 7.54.12 TEST PASSED')
print(' - Universal header age shortcuts are removed while primary navigation and team search remain')
print(' - Compact hero, six featured clubs, national directory, and California filters are wired')
print(' - Redundant methodology and pathway panels are removed')
print(' - 724 rankings, 182 clubs, and 976 JO placements remain unchanged')
