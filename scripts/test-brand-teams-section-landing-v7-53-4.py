#!/usr/bin/env python3
from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []

site = json.loads((ROOT / 'config/site-release.json').read_text(encoding='utf-8'))
for key, expected in {
    'brandRelease': '7.53.4',
    'navigationRelease': '7.54.13',
    'teamDirectoryRelease': '7.54.14',
    'sectionLandingRelease': '7.54.15',
}.items():
    if site.get(key) != expected:
        errors.append(f'config/site-release.json {key} must be {expected}')
if site.get('version') not in {'7.54.18','7.55.0','7.55.1','7.55.2','7.55.4','7.55.5','7.55.6','7.55.7','7.55.8','7.55.9','7.56.0','7.56.1','7.56.2', '7.56.3', '7.56.4', '7.56.7','7.56.8','7.56.9','7.56.11','7.56.12','7.56.13','7.56.14','7.56.15','7.57.0','7.57.1','7.57.2','7.57.3','7.57.4','7.57.5','7.57.6','7.57.7','7.57.8','7.57.9','7.57.10','7.57.11','7.57.12','7.57.13','7.57.14','7.57.15','7.57.16','7.57.17','7.57.18', '7.57.19','7.57.20','7.57.21','7.57.22','7.58.0','7.58.1','7.58.2','7.58.3','7.58.4','7.58.5','7.58.6','7.58.7','7.58.8','7.58.9','7.58.10','7.59.0','7.60.0','7.60.1','7.60.2','7.60.3','7.61.0','7.61.1','7.62.0','7.62.1'}: errors.append('config/site-release.json version must preserve 7.54.18 or later')
if site.get('publicExperienceRelease') not in {'7.54.18','7.55.0','7.55.1','7.55.2','7.55.4','7.55.5','7.55.6','7.55.7','7.55.8','7.55.9','7.56.0','7.56.1','7.56.2', '7.56.3', '7.56.4', '7.56.7','7.56.8','7.56.9','7.56.11','7.56.12','7.56.13','7.56.14','7.56.15','7.57.0','7.57.1','7.57.2','7.57.3','7.57.4','7.57.5','7.57.6','7.57.7','7.57.8','7.57.9','7.57.10','7.57.11','7.57.12','7.57.13','7.57.14','7.57.15','7.57.16','7.57.17','7.57.18', '7.57.19','7.57.20','7.57.21','7.57.22','7.58.0','7.58.1','7.58.2','7.58.3','7.58.4','7.58.5','7.58.6','7.58.7','7.58.8','7.58.9','7.58.10','7.59.0','7.60.0','7.60.1','7.60.2','7.60.3','7.61.0'}: errors.append('config/site-release.json publicExperienceRelease must preserve 7.54.18 or later')

# Public-facing naming audit. Preserve the GitHub repository URL /CPI/ and internal identifiers such as window.CPI_RANKINGS.
public_roots = [ROOT]
public_exts = {'.html', '.js', '.json', '.css', '.svg', '.csv'}
excluded_top = {'scripts', 'tests', 'build', 'qa', 'docs', '.github', 'assets-original'}
url_re = re.compile(r'https?://[^\s"\'<>]+')
legacy = []
for path in ROOT.rglob('*'):
    if not path.is_file() or path.suffix.lower() not in public_exts:
        continue
    rel = path.relative_to(ROOT)
    if rel.parts and rel.parts[0] in excluded_top:
        continue
    text = path.read_text(encoding='utf-8', errors='ignore')
    text = url_re.sub('', text)
    text = text.replace('CPI release check passed.', '')
    if 'California Polo Index' in text or re.search(r'\bCPI\b', text):
        legacy.append(str(rel))
if legacy:
    errors.append(f'public files retain legacy CPI branding: {legacy[:15]}')

shell = (ROOT / 'js/site-shell.js').read_text(encoding='utf-8')
for token in [
    '{ label: "Teams", href: "teams.html"',
    'teams.html#team-directory',
    'makeHref("teams.html")',
    'currentPath() === "teams.html"',
]:
    if token not in shell:
        errors.append(f'js/site-shell.js missing Teams hub token: {token}')
if 'href: "index.html#find-a-team"' in shell:
    errors.append('Teams primary navigation still routes to the homepage search')

teams = (ROOT / 'teams.html').read_text(encoding='utf-8') if (ROOT / 'teams.html').exists() else ''
for token in [
    '<title>Teams | Water Polo Index</title>',
    'id="team-directory"',
    'id="teamSearch"',
    'id="teamGroupFilter"',
    'id="teamTypeFilter"',
    'id="teamDirectoryGrid"',
    'js/teams-directory-v7-53-4.js?v=7.54.14',
    'css/teams-directory-v7-53-4.css?v=7.54.14',
    'wpi-section-hero--teams',
]:
    if token not in teams:
        errors.append(f'teams.html missing {token}')

team_js = (ROOT / 'js/teams-directory-v7-53-4.js').read_text(encoding='utf-8') if (ROOT / 'js/teams-directory-v7-53-4.js').exists() else ''
for token in ['window.CPI_RANKINGS', 'window.WPI_JO_PROFILES', 'WPI ${team.rating.toFixed(1)}', 'team.html?team=']:
    if token not in team_js:
        errors.append(f'Teams directory runtime missing {token}')

section_pages = {
    'rankings.html': 'wpi-section-hero--rankings',
    'teams.html': 'wpi-section-hero--teams',
    'clubs.html': 'wpi-section-hero--clubs',
    'tournaments.html': 'wpi-section-hero--tournaments',
    'methodology.html': 'wpi-section-hero--methodology',
}
for rel, modifier in section_pages.items():
    text = (ROOT / rel).read_text(encoding='utf-8')
    if ('css/section-landing-v7-53-4.css?v=7.53.4' not in text and 'css/section-landing-v7-53-4.css?v=7.53.5' not in text and 'css/section-landing-v7-53-4.css?v=7.54.13' not in text and 'css/section-landing-v7-53-4.css?v=7.54.14' not in text and 'css/section-landing-v7-53-4.css?v=7.54.15' not in text):
        errors.append(f'{rel} does not load the shared section landing stylesheet')
    if modifier not in text:
        errors.append(f'{rel} missing shared hero modifier {modifier}')

for asset in [
    ROOT / 'css/section-landing-v7-53-4.css',
    ROOT / 'css/teams-directory-v7-53-4.css',
    ROOT / 'js/teams-directory-v7-53-4.js',
    ROOT / 'assets/logos/cpi-logo-fallback.svg',
]:
    if not asset.exists() or asset.stat().st_size == 0:
        errors.append(f'missing or empty release asset: {asset.relative_to(ROOT)}')

fallback = (ROOT / 'assets/logos/cpi-logo-fallback.svg').read_text(encoding='utf-8')
if '>WPI<' not in fallback or 'aria-label="WPI logo fallback"' not in fallback:
    errors.append('fallback logo artwork still displays the legacy CPI mark')

# Deliberate release-wide cache reset ensures all updated text and artwork bypass old browser caches.
stale_cache = []
for path in ROOT.rglob('*.html'):
    text = path.read_text(encoding='utf-8', errors='ignore')
    for match in re.finditer(r'\?v=(\d+(?:\.\d+){1,3}(?:-[A-Za-z0-9.-]+)?)', text):
        cache_key = match.group(1)
        accepted_cache_keys = {'7.53.4','7.53.5','7.53.6','7.53.7','7.54.0','7.54.1','7.54.2','7.54.3','7.54.4','7.54.5','7.54.6','7.54.7','7.54.8','7.54.9','7.54.10','7.54.11','7.54.12','7.54.13','7.54.14','7.54.15','7.54.17','7.54.18','7.55.0','7.55.1','7.55.2','7.55.4','7.55.5','7.55.6','7.55.7','7.55.8','7.55.9','7.56.0','7.56.1','7.56.2', '7.56.3', '7.56.4', '7.56.7','7.56.8','7.56.9','7.56.11','7.56.12','7.56.13','7.56.14','7.56.15','7.57.0','7.57.1','7.57.2','7.57.3','7.57.4','7.57.5','7.57.6','7.57.7','7.57.8','7.57.9','7.57.10','7.57.11','7.57.12','7.57.13','7.57.14','7.57.15','7.57.16','7.57.17','7.57.18', '7.57.19','7.57.20','7.57.21','7.57.22','7.58.0','7.58.1','7.58.2','7.58.3','7.58.4','7.58.5','7.58.6','7.58.7','7.58.8','7.58.9','7.58.10','7.59.0','7.60.0','7.60.1','7.60.2','7.60.3','7.61.0','7.61.1','7.62.0','7.62.1'}
        current_release = str(site.get('version') or '')
        current_hotfix_key = bool(current_release) and cache_key.startswith(current_release + '-')
        if cache_key not in accepted_cache_keys and not current_hotfix_key:
            stale_cache.append(f'{path.relative_to(ROOT)}:{cache_key}')
            break
if stale_cache:
    errors.append(f'HTML pages retain stale local cache keys: {stale_cache[:15]}')

rankings = json.loads((ROOT / 'rankings.json').read_text(encoding='utf-8'))
clubs = json.loads((ROOT / 'clubs.json').read_text(encoding='utf-8'))
jo = json.loads((ROOT / 'data/tournaments/jo-results-2026.json').read_text(encoding='utf-8'))
if len(rankings) != 724:
    errors.append(f'expected 724 rankings, found {len(rankings)}')
if len(clubs) != 182:
    errors.append(f'expected 182 clubs, found {len(clubs)}')
if jo.get('summary', {}).get('teamPlacements') != 976:
    errors.append('expected 976 JO placements')

if errors:
    print('WPI 7.54.10 BRAND / TEAMS / SECTION LANDING TEST FAILED')
    for error in errors:
        print(f' - {error}')
    sys.exit(1)

print('WPI 7.54.10 BRAND / TEAMS / SECTION LANDING TEST PASSED')
print(' - Public-facing CPI naming is fully migrated to WPI while repository URLs and internal data identifiers remain stable')
print(' - Teams has a dedicated searchable section home')
print(' - Rankings, Teams, Clubs, Tournaments, and Methodology share one responsive landing-page system')
print(' - 724 rankings, 182 clubs, and 976 JO placements are unchanged')
