#!/usr/bin/env python3
from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []
html_files = sorted(ROOT.rglob('*.html'))

for path in html_files:
    rel = path.relative_to(ROOT)
    text = path.read_text(encoding='utf-8', errors='ignore')
    depth = len(rel.parent.parts)
    prefix = '../' * depth
    css = f'{prefix}css/site-shell.css?v=7.54.13'
    js = f'{prefix}js/site-shell.js?v=7.54.13'
    if text.count('site-shell.css') != 1:
        errors.append(f'{rel}: expected exactly one site-shell.css reference')
    if text.count('site-shell.js') != 1:
        errors.append(f'{rel}: expected exactly one site-shell.js reference')
    if css not in text:
        errors.append(f'{rel}: missing correct relative shell CSS path {css}')
    if js not in text:
        errors.append(f'{rel}: missing correct relative shell JS path {js}')
    palette_css = f'{prefix}css/command-palette.css?v=7.53.4'
    palette_js = f'{prefix}js/command-palette.js?v=7.53.4'
    if text.count('command-palette.css') != 1 or palette_css not in text:
        errors.append(f'{rel}: missing one correct command-palette CSS reference')
    if text.count('command-palette.js') != 1 or palette_js not in text:
        errors.append(f'{rel}: missing one correct command-palette JS reference')
    if 'California Polo Index' in text:
        errors.append(f'{rel}: retains formal California Polo Index brand text')

for asset in [
    ROOT / 'assets/branding/wpi-logo.png',
    ROOT / 'assets/branding/wpi-logo-mark.png',
    ROOT / 'assets/branding/wpi-logo-full.png',
    ROOT / 'css/site-shell.css',
    ROOT / 'js/site-shell.js',
    ROOT / 'css/command-palette.css',
    ROOT / 'js/command-palette.js',
]:
    if not asset.exists() or asset.stat().st_size == 0:
        errors.append(f'{asset.relative_to(ROOT)}: missing or empty')

shell = (ROOT / 'js/site-shell.js').read_text(encoding='utf-8')
for token in [
    'new URL("../", shellScriptUrl())',
    'wpi-logo-mark.png',
    'wpi-logo-full.png',
    'hideLegacyShell',
    'Water Polo Index',
]:
    if token not in shell:
        errors.append(f'js/site-shell.js missing required token: {token}')
for forbidden in ['const quickLinks', 'cpi-shell-quick', 'Quick ranking links']:
    if forbidden in shell:
        errors.append(f'js/site-shell.js retains removed quick-link rail: {forbidden}')


palette = (ROOT / 'js/command-palette.js').read_text(encoding='utf-8')
for token in ['const siteRoot = new URL("../", paletteScriptUrl())', 'Water Polo Index front page', 'Search WPI']:
    if token not in palette:
        errors.append(f'js/command-palette.js missing required token: {token}')
if 'depth +' in palette:
    errors.append('js/command-palette.js retains legacy depth-prefix URL construction')

builder = (ROOT / 'scripts/build-club-pages.py').read_text(encoding='utf-8')
for token in ['Water Polo Index', '../css/site-shell.css?v=7.54.13', '../js/site-shell.js?v=7.54.13', '../css/command-palette.css?v=7.53.4', '../js/command-palette.js?v=7.53.4']:
    if token not in builder:
        errors.append(f'scripts/build-club-pages.py missing required shell token: {token}')

site = json.loads((ROOT / 'config/site-release.json').read_text(encoding='utf-8'))
if site.get('version') not in {'7.52.3', '7.52.4', '7.52.5', '7.52.6','7.52.7','7.52.8','7.52.9','7.52.10','7.52.11','7.52.12','7.52.13','7.52.14','7.52.15','7.52.16','7.53.0','7.53.1','7.53.2','7.53.3','7.53.4','7.53.5','7.53.6','7.53.7','7.54.0','7.54.1','7.54.2','7.54.3','7.54.4','7.54.5','7.54.6','7.54.7','7.54.8','7.54.9','7.54.10','7.54.11','7.54.12','7.54.13','7.54.14','7.54.15','7.54.17','7.54.18','7.55.0','7.55.1','7.55.2'}:
    errors.append('config/site-release.json version must preserve the 7.52.3 WPI shell or a later 7.52.x presentation release')
if site.get('brandRelease') != '7.53.4':
    errors.append('config/site-release.json brandRelease must be 7.53.4')

if errors:
    print('WPI UNIVERSAL SHELL 7.52.3 TEST FAILED')
    for error in errors:
        print(f' - {error}')
    sys.exit(1)

print('WPI UNIVERSAL SHELL 7.52.3 TESTS PASSED')
print(f' - {len(html_files)} HTML pages load one shared WPI header/footer shell')
print(' - Root, club, story, QA, and nested tournament paths use correct relative assets')
print(' - Shared search is available from the WPI header on every page')
print(' - Future generated club pages retain the WPI shell')
