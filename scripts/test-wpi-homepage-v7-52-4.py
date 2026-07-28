#!/usr/bin/env python3
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []
index = (ROOT / 'index.html').read_text(encoding='utf-8')
css = (ROOT / 'css/homepage-wpi-v7-52-4.css').read_text(encoding='utf-8')
js = (ROOT / 'js/homepage-wpi-v7-52-4.js').read_text(encoding='utf-8')
clubs_js = (ROOT / 'js/club-intelligence-v7-26.js').read_text(encoding='utf-8')
site = json.loads((ROOT / 'config/site-release.json').read_text(encoding='utf-8'))
rankings = json.loads((ROOT / 'rankings.json').read_text(encoding='utf-8'))
clubs = json.loads((ROOT / 'clubs.json').read_text(encoding='utf-8'))
jo = json.loads((ROOT / 'data/tournaments/jo-results-2026.json').read_text(encoding='utf-8'))

required_index = [
    'css/homepage-wpi-v7-52-4.css?v=7.52.4',
    'js/homepage-wpi-v7-52-4.js?v=7.52.7',
    'assets/photos/editorial/polo-attacker-poolwide.jpg',
    'data/identity/runtime.js?v=7.52.7',
    'id="wpiHomeSearch"',
    'id="wpiRankingGrid"',
    'id="wpiResultsGrid"',
    'id="wpiFeaturedClubs"',
    'clubs.html?region=East%20Bay#club-directory',
    'clubs.html?region=Orange%20County#club-directory',
    'tournaments.html#jo-results',
    'methodology.html',
]
for token in required_index:
    if token not in index: errors.append(f'index.html missing {token}')

for forbidden in ['data-cpi-hero', 'At a Glance', 'Review in progress']:
    if forbidden in index: errors.append(f'index.html retains legacy homepage token: {forbidden}')

required_js = [
    'window.CPI_RANKINGS', 'window.CPI_CLUBS', 'teamLink', 'clubLink',
    'data/tournaments/jo-results-2026.json?v=7.52.1', 'renderRankings',
    'renderResults', 'renderFeaturedClubs', 'resultsLink', 'resultJourneyLink', 'resultAsset',
]
for token in required_js:
    if token not in js: errors.append(f'homepage JS missing {token}')

for token in ['params.get("region")', 'params.get("search")', 'regionFilter.value = requestedRegion']:
    if token not in clubs_js: errors.append(f'club directory missing linked homepage filter support: {token}')

for token in ['.wpi-hero-visual', '.wpi-ranking-grid', '.wpi-results-grid', '.wpi-california-map', '.region-point.east-bay']:
    if token not in css: errors.append(f'homepage CSS missing {token}')

if site.get('version') not in {'7.52.4','7.52.5','7.52.6','7.52.7'}: errors.append('site release must preserve the 7.52.4 homepage or a later 7.52.x data release')
if site.get('homepageRelease') != '7.52.4': errors.append('homepageRelease must be 7.52.4')
if site.get('rankingDataRelease') != '7.52.2': errors.append('ranking data must remain 7.52.2')
if len(rankings) != 724: errors.append(f'expected 724 ranked teams, found {len(rankings)}')
if len(clubs) != 183: errors.append(f'expected 183 clubs, found {len(clubs)}')
if jo.get('summary', {}).get('teamPlacements') != 976: errors.append('expected 976 JO placements')

for asset in [ROOT / 'css/homepage-wpi-v7-52-4.css', ROOT / 'js/homepage-wpi-v7-52-4.js', ROOT / 'assets/photos/editorial/polo-attacker-poolwide.jpg']:
    if not asset.exists() or asset.stat().st_size == 0: errors.append(f'missing/empty asset {asset.relative_to(ROOT)}')

if errors:
    print('WPI HOMEPAGE 7.52.4 TEST FAILED')
    for error in errors: print(f' - {error}')
    sys.exit(1)

print('WPI HOMEPAGE 7.52.4 TESTS PASSED')
print(' - Photo hero, team/club search, ranking cards, JO results, club profiles, and region map are wired')
print(' - Team, club, ranking, result, region, methodology, and update links route to relevant pages')
print(' - 724 rankings, 183 clubs, and 976 JO placements remain unchanged')
