#!/usr/bin/env python3
from pathlib import Path
import json, re

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT / path).read_text(encoding='utf-8')

cfg = json.loads(read('config/site-release.json'))
assert cfg['version'] == '7.53.3'
assert cfg['homepageRelease'] == '7.53.3'
assert cfg['navigationRelease'] == '7.53.3'
assert cfg['storiesStatus'] == 'retired-preserved'

shell = read('js/site-shell.js')
assert 'label: "Stories"' not in shell
assert 'makeHref("stories.html")' not in shell
for label in ('Home', 'Rankings', 'Teams', 'Clubs', 'Tournaments', 'Methodology'):
    assert f'label: "{label}"' in shell
assert 'index.html#find-a-team' in shell
assert 'data-shell-search' in shell

home = read('index.html')
assert 'One place to find the <span>teams</span>' in home
assert 'data-home-action="team-search"' in home
assert 'href="rankings.html"' in home
assert 'href="clubs.html"' in home
assert 'href="tournaments.html"' in home
assert 'id="find-a-team"' in home
assert 'id="wpiHomeSearch"' in home
assert 'id="explore-wpi"' in home
assert 'href="stories.html"' not in home
assert 'Latest updates' not in home
assert 'site-shell.js?v=7.53.3' in home
assert 'homepage-wpi-v7-52-4.js?v=7.53.3' in home

homepage_js = read('js/homepage-wpi-v7-52-4.js')
assert 'CPI_STORIES' not in homepage_js
assert 'renderExploreGuide' in homepage_js
assert 'focusTeamSearch' in homepage_js
assert 'stories.html' not in homepage_js

retired = read('stories.html')
assert 'index.html#explore-wpi' in retired
assert 'WPI Stories are currently retired.' in retired
assert 'stories/' not in retired

# Every public HTML page must request the cache-busted universal shell.
html_files = list(ROOT.rglob('*.html'))
missing = []
stale = []
for path in html_files:
    text = path.read_text(encoding='utf-8', errors='ignore')
    if 'js/site-shell.js' not in text:
        missing.append(str(path.relative_to(ROOT)))
    if 'site-shell.js?v=7.52.3' in text or 'site-shell.css?v=7.52.3' in text:
        stale.append(str(path.relative_to(ROOT)))
assert not missing, f'HTML pages missing universal shell: {missing[:10]}'
assert not stale, f'HTML pages using stale shell cache key: {stale[:10]}'

# Public, non-story pages must not retain direct links to the retired archive.
linked = []
for path in html_files:
    rel = path.relative_to(ROOT)
    if path.name == 'stories.html' or 'stories' in rel.parts:
        continue
    text = path.read_text(encoding='utf-8', errors='ignore')
    if re.search(r'href=["\'][^"\']*stories\.html', text, re.I):
        linked.append(str(rel))
assert not linked, f'Public pages still link to retired Stories archive: {linked}'

print(f'WPI 7.53.3 navigation/homepage regression passed ({len(html_files)} HTML pages checked).')
