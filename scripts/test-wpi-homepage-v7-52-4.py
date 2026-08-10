#!/usr/bin/env python3
from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []
index = (ROOT / 'index.html').read_text(encoding='utf-8')
css = (ROOT / 'css/homepage-wpi-v7-52-4.css').read_text(encoding='utf-8') + (ROOT / 'css/homepage-wpi-v7-54-12.css').read_text(encoding='utf-8')
js = (ROOT / 'js/homepage-wpi-v7-52-4.js').read_text(encoding='utf-8')
clubs_js = (ROOT / 'js/club-intelligence-v7-26.js').read_text(encoding='utf-8')
site = json.loads((ROOT / 'config/site-release.json').read_text(encoding='utf-8'))
rankings = json.loads((ROOT / 'rankings.json').read_text(encoding='utf-8'))
clubs = json.loads((ROOT / 'clubs.json').read_text(encoding='utf-8'))
jo = json.loads((ROOT / 'data/tournaments/jo-results-2026.json').read_text(encoding='utf-8'))

required_index = [
    'css/homepage-wpi-v7-52-4.css?v=7.53.4',
    'css/homepage-wpi-v7-54-12.css?v=7.54.13',
    'js/homepage-wpi-v7-52-4.js?v=7.54.18',
    'assets/photos/editorial/wpi-home-photo.jpg',
    'data/identity/runtime.js?v=7.53.4',
    'js/cpi-identity.js?v=7.53.4',
    'id="wpiHomeSearch"',
    'id="wpiRankingGrid"',
    'id="wpiResultsGrid"',
    'id="wpiFeaturedClubs"',
    'clubs.html?region=East%20Bay#club-directory',
    'clubs.html?region=Orange%20County#club-directory',
    'tournaments.html#jo-results',
]
for token in required_index:
    if token not in index: errors.append(f'index.html missing {token}')

for forbidden in ['data-cpi-hero', 'At a Glance', 'Review in progress', 'How rankings work', 'Choose where to start']:
    if forbidden in index: errors.append(f'index.html retains legacy homepage token: {forbidden}')

required_js = [
    'window.CPI_RANKINGS', 'window.CPI_CLUBS', 'teamLink', 'clubLink',
    'data/tournaments/jo-results-2026.json?v=7.54.17', 'renderRankings',
    'renderResults', 'renderFeaturedClubs', 'resultsLink', 'resultJourneyLink', 'resultAsset',
    'chosen.length === 6', 'wpiCaliforniaClubCount', 'wpiNationalClubCount',
]
for token in required_js:
    if token not in js: errors.append(f'homepage JS missing {token}')

for token in ['params.get("region")', 'params.get("search")', 'regionFilter.value = requestedRegion']:
    if token not in clubs_js: errors.append(f'club directory missing linked homepage filter support: {token}')

for token in ['.wpi-hero-visual', '.wpi-ranking-grid', '.wpi-results-grid']:
    if token not in css: errors.append(f'homepage CSS missing {token}')

version_match = re.fullmatch(r'(\d+)\.(\d+)\.(\d+)', str(site.get('version', '')))
if not version_match or tuple(map(int, version_match.groups())) < (7, 52, 4): errors.append('site release must be semantic and preserve the 7.52.4 homepage or a later release')
if site.get('homepageRelease') not in {'7.52.4','7.53.3','7.53.4','7.53.5','7.53.6','7.53.7','7.54.0','7.54.1','7.54.2','7.54.3','7.54.4','7.54.5','7.54.6','7.54.7','7.54.8','7.54.9','7.54.10','7.54.11','7.54.12','7.54.13','7.54.14','7.54.15','7.54.17','7.54.18','7.55.0','7.55.1','7.55.2','7.55.4','7.55.5','7.55.6','7.55.7','7.55.8','7.55.9','7.56.0','7.56.1','7.56.2', '7.56.3', '7.56.4', '7.56.7','7.56.8','7.56.9','7.56.11','7.56.12','7.56.13','7.56.14','7.56.15','7.57.0','7.57.1','7.57.2','7.57.3','7.57.4','7.57.5','7.57.6','7.57.7','7.57.8','7.57.9','7.57.10','7.57.11','7.57.12','7.57.13','7.57.14','7.57.15','7.57.16'}: errors.append('homepageRelease must preserve the original homepage data experience or the 7.53.3 clarity release')
if site.get('rankingDataRelease') != '7.52.13': errors.append('ranking data must include the 7.52.13 identity correction')
if len(rankings) != 724: errors.append(f'expected 724 ranked teams, found {len(rankings)}')
if len(clubs) != 182: errors.append(f'expected 182 clubs, found {len(clubs)}')
if jo.get('summary', {}).get('teamPlacements') != 976: errors.append('expected 976 JO placements')

for asset in [ROOT / 'css/homepage-wpi-v7-52-4.css', ROOT / 'css/homepage-wpi-v7-54-12.css', ROOT / 'js/homepage-wpi-v7-52-4.js', ROOT / 'assets/photos/editorial/wpi-home-photo.jpg']:
    if not asset.exists() or asset.stat().st_size == 0: errors.append(f'missing/empty asset {asset.relative_to(ROOT)}')

if errors:
    print('WPI HOMEPAGE 7.52.4 TEST FAILED')
    for error in errors: print(f' - {error}')
    sys.exit(1)

print('WPI HOMEPAGE 7.52.4 TESTS PASSED')
print(' - Compact photo hero, team/club search, ranking cards, JO results, six club profiles, and national directory are wired')
print(' - Team, club, ranking, result, and regional directory links route to relevant pages')
print(' - 724 rankings, 182 clubs, and 976 JO placements remain unchanged')
