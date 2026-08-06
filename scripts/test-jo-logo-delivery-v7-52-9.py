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
if site.get('version') not in {'7.52.10','7.52.11','7.52.12','7.52.13','7.52.14','7.52.15','7.52.16','7.53.0','7.53.1','7.53.2','7.53.3','7.53.4','7.53.5','7.53.6','7.53.7','7.54.0','7.54.1','7.54.2','7.54.3','7.54.4','7.54.5','7.54.6','7.54.7','7.54.8','7.54.9','7.54.10','7.54.11','7.54.12','7.54.13','7.54.14','7.54.15','7.54.17','7.54.18','7.55.0','7.55.1','7.55.2','7.55.4','7.55.5','7.55.6','7.55.7','7.55.8','7.55.9','7.56.0','7.56.1','7.56.2', '7.56.3', '7.56.4', '7.56.6'}:
    fail('site release must preserve JO logo delivery 7.52.10 or later')
if site.get('identityRelease') != '7.52.13':
    fail('identityRelease must remain 7.52.13')
if site.get('logoDeliveryRelease') != '7.52.15':
    fail('logoDeliveryRelease must be 7.52.15')
if site.get('joLogoRelease') not in {'7.52.12','7.52.13','7.52.14','7.52.15'}:
    fail('joLogoRelease must preserve verified JO logo routing')
if site.get('joResultsRelease') != '7.52.15':
    fail('joResultsRelease must be 7.52.15')
if site.get('joApplicationRelease') != '7.53.4':
    fail('joApplicationRelease must be 7.53.4 after the WPI public-copy cache refresh')
if site.get('joJourneyRelease') != '7.52.9':
    fail('joJourneyRelease must remain 7.52.9')
if site.get('tournamentUIRelease') not in {'7.52.15','7.54.0','7.54.1','7.54.2','7.54.3','7.54.4','7.54.5','7.54.6','7.54.7','7.54.8','7.54.9','7.54.10','7.54.11','7.54.17','7.54.18','7.55.0','7.55.1','7.55.2','7.55.4','7.55.5','7.55.6','7.55.7','7.55.8','7.55.9','7.56.0','7.56.1','7.56.2', '7.56.3', '7.56.4', '7.56.6'}:
    fail('tournamentUIRelease must preserve the JO logo browser and may include the 7.54.0 tournament platform')

index = (ROOT / 'index.html').read_text(encoding='utf-8')
tournaments = (ROOT / 'tournaments.html').read_text(encoding='utf-8')
boys = (ROOT / 'tournaments/jo-boys/index.html').read_text(encoding='utf-8')
girls = (ROOT / 'tournaments/jo-girls/index.html').read_text(encoding='utf-8')
resolver = (ROOT / 'js/cpi-identity.js').read_text(encoding='utf-8')

ordered(index, [
    'data.js?v=7.55.1',
    'data/identity/runtime.js?v=7.53.4',
    'js/cpi-identity.js?v=7.53.4',
    'js/homepage-wpi-v7-52-4.js?v=7.54.18',
], 'index.html')
ordered(tournaments, [
    'data.js?v=7.55.1',
    'data/identity/runtime.js?v=7.53.4',
    'js/cpi-identity.js?v=7.53.4',
    'data/tournaments/jo-profile-runtime.js?v=7.53.4',
    'js/tournament-hub-v7-54-4.js?v=7.55.1',
], 'tournaments.html')
for label, text in [('Boys JO page', boys), ('Girls JO page', girls)]:
    ordered(text, [
        '../../data/identity/runtime.js?v=7.53.4',
        '../../js/cpi-identity.js?v=7.53.4',
        'app.js?v=7.53.4',
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
print(' - Homepage, public tournament archive, and Boys/Girls journeys load runtime → resolver → consumer in order')
print(' - The public archive reuses the verified JO identity and logo resolver')
print(' - Known JO source-name variants route to existing club artwork')
