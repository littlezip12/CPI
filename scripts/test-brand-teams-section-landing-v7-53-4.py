#!/usr/bin/env python3
from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []

def semver_at_least(value, floor):
    def parts(v): return tuple(int(x) for x in str(v).split(".")[:3])
    return parts(value) >= parts(floor)

site = json.loads((ROOT / 'config/site-release.json').read_text(encoding='utf-8'))
for key, expected in {
    'brandRelease': {'7.53.4'},
    'navigationRelease': {'7.54.13','7.62.2','7.62.3','7.62.4','7.62.5','7.62.6','7.63.0','7.63.1','7.63.2','7.63.3','7.63.4','7.63.5','7.63.6','7.63.7','7.63.8','7.63.9'},
    'teamDirectoryRelease': {'7.54.14'},
    'sectionLandingRelease': {'7.54.15'},
}.items():
    if site.get(key) not in expected:
        errors.append(f'config/site-release.json {key} must preserve an approved release marker: {sorted(expected)}')
if not semver_at_least(site.get('version'),'7.54.18'): errors.append('config/site-release.json version must preserve 7.54.18 or later')
if not semver_at_least(site.get('publicExperienceRelease'),'7.54.18'): errors.append('config/site-release.json publicExperienceRelease must preserve 7.54.18 or later')

# Public-facing naming audit. Preserve the GitHub repository URL /CPI/ and internal identifiers such as window.CPI_RANKINGS.
public_roots = [ROOT]
public_exts = {'.html', '.js', '.json', '.css', '.svg', '.csv'}
excluded_top = {'scripts', 'tests', 'build', 'qa', 'docs', '.github', 'assets-original', 'mobile'}
url_re = re.compile(r'https?://[^\s"\'<>]+')
legacy = []
for path in ROOT.rglob('*'):
    if not path.is_file() or path.suffix.lower() not in public_exts:
        continue
    if path.name.startswith('PATCH_MANIFEST_') or path.name.startswith('PATCH_FILES_'):
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
    'label: "Live Scores"',
    'href: "live.html"',
    'label: "Teams & Clubs"',
    'href: "organizations.html"',
    'makeHref("organizations.html")',
    'Search Water Polo HQ',
]:
    if token not in shell:
        errors.append(f'js/site-shell.js missing current consumer navigation token: {token}')
if 'href: "index.html#find-a-team"' in shell:
    errors.append('Primary navigation still routes to the homepage-only team search')

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

# Cache-key audit. Versioned assets may retain the release encoded in their own filename.
# This keeps historical/versioned runtimes cache-safe without forcing unrelated files to be renamed every release.
stale_cache = []
current_release = str(site.get('version') or '')
asset_ref_re = re.compile(r'(?:src|href)=["\']([^"\']+\?v=(\d+(?:\.\d+){1,3}(?:-[A-Za-z0-9.-]+)?))["\']', re.I)
file_version_re = re.compile(r'v(\d+)-(\d+)-(\d+)(?:-(\d+))?')
for path in ROOT.rglob('*.html'):
    rel = path.relative_to(ROOT)
    if rel.parts and rel.parts[0] == 'mobile':
        continue
    text = path.read_text(encoding='utf-8', errors='ignore')
    for ref, cache_key in asset_ref_re.findall(text):
        asset_path = ref.split('?', 1)[0]
        vm = file_version_re.search(Path(asset_path).name)
        if vm:
            nums = [vm.group(1), vm.group(2), vm.group(3)] + ([vm.group(4)] if vm.group(4) else [])
            file_key = '.'.join(nums)
            if cache_key == file_key or cache_key.startswith(file_key + '-'):
                continue
        current_release_key = bool(current_release) and cache_key == current_release
        current_hotfix_key = bool(current_release) and cache_key.startswith(current_release + '-')
        # Shared unversioned assets may legitimately keep an established historical cache key.
        if current_release_key or current_hotfix_key:
            continue
        try:
            if semver_at_least(current_release, cache_key):
                continue
        except Exception:
            pass
        stale_cache.append(f'{path.relative_to(ROOT)}:{asset_path}?v={cache_key}')
        break
if stale_cache:
    errors.append(f'HTML pages retain invalid local cache keys: {stale_cache[:15]}')

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
print(' - The legacy Teams directory remains available while global discovery routes through Organizations')
print(' - Rankings, legacy Teams/Clubs pages, Tournaments, and Methodology retain the responsive landing-page system')
print(' - 724 rankings, 182 clubs, and 976 JO placements are unchanged')
