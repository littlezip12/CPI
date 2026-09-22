#!/usr/bin/env python3
from pathlib import Path
import sys
ROOT = Path(__file__).resolve().parents[1]
errors = []

shell = (ROOT / 'js/site-shell.js').read_text(encoding='utf-8')
for token in [
    'css/wphq-brand-v7-64-21.css?v=7.64.21',
    'link.dataset.wphqBrand = "7.64.21"',
    'wphq-logo-full.png?v=7.64.21'
]:
    if token not in shell:
        errors.append(f'js/site-shell.js missing {token}')

brand = (ROOT / 'css/wphq-brand-v7-64-21.css').read_text(encoding='utf-8')
for token in [
    '.wphq-brand .wpi-section-hero h1{color:var(--wphq-navy)}',
    '.wphq-brand .wpi-section-hero .wpi-section-hero-copy > p:not(.wpi-section-kicker){color:#5f768c}',
    '.wphq-brand .wpi-section-hero .wpi-section-action{',
    '.wphq-brand .wpi-section-hero .wpi-section-action.secondary{',
    '.wphq-brand .wpi-section-hero .wpi-section-hero-facts > span,',
    '.wphq-brand .wpi-section-hero .wpi-section-hero-media::after{'
]:
    if token not in brand:
        errors.append(f'wphq brand stylesheet missing contrast override token: {token}')

org = (ROOT / 'organizations.html').read_text(encoding='utf-8')
for token in [
    '<title>Teams & Clubs | Water Polo HQ</title>',
    'content="Search Water Polo HQ clubs, high schools and teams in one unified directory."',
    'One Water Polo HQ directory for youth clubs and high-school programs.',
    '>Explore clubs</a>'
]:
    if token not in org:
        errors.append(f'organizations.html missing {token}')
for forbidden in [
    '← Water Polo Index',
    'One WPI directory',
    '>Club intelligence</a>'
]:
    if forbidden in org:
        errors.append(f'organizations.html still contains obsolete text: {forbidden}')

version = (ROOT / 'VERSION.md').read_text(encoding='utf-8')
if '# WPI 7.64.21 — Hero Contrast & Organizations Polish' not in version:
    errors.append('VERSION.md not updated to 7.64.21')

if errors:
    print('WPI 7.64.21 HERO CONTRAST / ORGANIZATIONS TEST FAILED')
    for err in errors:
        print(' -', err)
    sys.exit(1)
print('WPI 7.64.21 HERO CONTRAST / ORGANIZATIONS TEST PASSED')
print(' - Shared landing heroes have explicit readable contrast under the light WPHQ brand')
print(' - Organizations page no longer shows the redundant Water Polo Index back-link')
print(' - Water Polo HQ page-title/SEO copy is present where expected')
