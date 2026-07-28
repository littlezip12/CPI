#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []


def fail(message: str) -> None:
    errors.append(message)


def ordered(text: str, tokens: list[str], label: str) -> None:
    positions = [text.find(token) for token in tokens]
    for token, position in zip(tokens, positions):
        if position < 0:
            fail(f"{label} missing {token}")
    if all(position >= 0 for position in positions) and positions != sorted(positions):
        fail(f"{label} scripts are not loaded in dependency order: {tokens}")


site = json.loads((ROOT / 'config/site-release.json').read_text(encoding='utf-8'))
if site.get('version') not in {'7.52.10','7.52.11','7.52.12','7.52.13','7.52.14'}:
    fail('site release must preserve JO logo delivery 7.52.10 or later')
for key in ['identityRelease', 'logoDeliveryRelease']:
    if site.get(key) != '7.52.13':
        fail(f'{key} must be 7.52.13')
if site.get('joLogoRelease') not in {'7.52.12','7.52.13','7.52.14'}:
    fail('joLogoRelease must preserve verified JO logo routing')
if site.get('joResultsRelease') != '7.52.13':
    fail('joResultsRelease must be 7.52.13')
for key in ['joApplicationRelease', 'joJourneyRelease']:
    if site.get(key) != '7.52.9':
        fail(f'{key} must remain 7.52.9')
if site.get('tournamentUIRelease') != '7.52.13':
    fail('tournamentUIRelease must be 7.52.13')

index = (ROOT / 'index.html').read_text(encoding='utf-8')
tournaments = (ROOT / 'tournaments.html').read_text(encoding='utf-8')
boys = (ROOT / 'tournaments/jo-boys/index.html').read_text(encoding='utf-8')
girls = (ROOT / 'tournaments/jo-girls/index.html').read_text(encoding='utf-8')
resolver = (ROOT / 'js/cpi-identity.js').read_text(encoding='utf-8')

ordered(index, [
    'data.js?v=7.52.14',
    'data/identity/runtime.js?v=7.52.13',
    'js/cpi-identity.js?v=7.52.13',
    'js/homepage-wpi-v7-52-4.js?v=7.52.9',
], 'index.html')
ordered(tournaments, [
    'data.js?v=7.52.14',
    'data/identity/runtime.js?v=7.52.13',
    'js/cpi-identity.js?v=7.52.13',
    'data/tournaments/jo-profile-runtime.js?v=7.52.13',
    'js/jo-results-browser-v7-52-1.js?v=7.52.13',
], 'tournaments.html')
for label, text in [('Boys JO page', boys), ('Girls JO page', girls)]:
    ordered(text, [
        '../../data/identity/runtime.js?v=7.52.13',
        '../../js/cpi-identity.js?v=7.52.13',
        'app.js?v=7.52.9',
    ], label)

for token in [
    "release:'7.52.13'",
    "'ciu(?: |$)'",
    "'sd dons(?: |$)'",
    "'santa barbara(?: wpc)?(?: |$)'",
    "'texas thunder(?: |$)'",
    "'central valley united(?: |$)'",
    "'kern premier(?: |$)'",
    "'chula vista premier(?: |$)'",
    "'corona del mar(?: |$)'",
    "'viper pigeon(?: |$)'",
]:
    # Regex definitions include delimiters, so use a tolerant substring check.
    clean = token.replace("'", '')
    if clean not in resolver.replace("'", ''):
        fail(f'identity resolver missing delivery token {clean}')

if errors:
    print('JO LOGO DELIVERY 7.52.9 TEST FAILED')
    for error in errors:
        print(' - ' + error)
    sys.exit(1)

print('JO LOGO DELIVERY 7.52.9 TESTS PASSED')
print(' - Homepage, full tournament results, and Boys/Girls journeys load runtime → resolver → consumer in order')
print(' - Changed identity assets are cache-busted to 7.52.13')
print(' - Known JO source-name variants route to existing club artwork')
