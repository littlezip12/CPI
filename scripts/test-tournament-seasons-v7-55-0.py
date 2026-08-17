#!/usr/bin/env python3
from pathlib import Path
import json, sys

ROOT = Path(__file__).resolve().parents[1]
errors = []
load = lambda rel: json.loads((ROOT / rel).read_text(encoding='utf-8'))

site = load('config/site-release.json')
hub = load('data/tournaments/public-hub.json')
seasons = load('data/tournaments/seasons.json')
registry = load('data/tournaments/registry.json')
html = (ROOT / 'tournaments.html').read_text(encoding='utf-8')
js = (ROOT / 'js/tournament-hub-v7-54-4.js').read_text(encoding='utf-8')

if site.get('version') not in {'7.55.1','7.55.2','7.55.4','7.55.5','7.55.6','7.55.7','7.55.8','7.55.9','7.56.0','7.56.1','7.56.2', '7.56.3', '7.56.4', '7.56.7','7.56.8','7.56.9','7.56.11','7.56.12','7.56.13','7.56.14','7.56.15','7.57.0','7.57.1','7.57.2','7.57.3','7.57.4','7.57.5','7.57.6','7.57.7','7.57.8','7.57.9','7.57.10','7.57.11','7.57.12','7.57.13','7.57.14','7.57.15','7.57.16','7.57.17','7.57.18', '7.57.19','7.57.20','7.57.21','7.57.22','7.58.0','7.58.1','7.58.2','7.58.3','7.58.4','7.58.5','7.58.6','7.58.7','7.58.8','7.58.9','7.58.10','7.59.0','7.60.0','7.60.1','7.60.2','7.60.3','7.61.0','7.61.1','7.62.0','7.62.1','7.62.2','7.62.3'}:
    errors.append('site version must preserve 7.55.1 or later')
if site.get('tournamentSeasonRelease') != '7.55.0':
    errors.append('tournamentSeasonRelease must be 7.55.0')
if hub.get('release') != '7.55.1' or registry.get('release') != '7.55.1':
    errors.append('tournament hub and registry releases must be 7.55.1')

season_rows = seasons.get('seasons', [])
season_ids = [row.get('id') for row in season_rows]
if season_ids != ['2026-2027', '2025-2026']:
    errors.append(f'competitive season registry is incorrect: {season_ids}')
if seasons.get('model') != 'competitive_year_range':
    errors.append('competitive season model is missing')
if any('2024' in json.dumps(row) for row in season_rows):
    errors.append('2024 should not be published in the season registry')

active = next((row for row in season_rows if row.get('id') == '2026-2027'), None)
final = next((row for row in season_rows if row.get('id') == '2025-2026'), None)
if not active or active.get('openingEventId') != '2026-evan-cousineau-memorial-cup' or active.get('status') != 'active':
    errors.append('2026–2027 must open with Evan Cousineau and remain active')
if not final or final.get('openingEventId') != '2025-evan-cousineau-memorial-cup' or final.get('closingEventId') != '2026-junior-olympics' or final.get('status') != 'final':
    errors.append('2025–2026 season boundaries are incorrect')

if 'years' in hub:
    errors.append('legacy calendar-year archive configuration remains')
if [row.get('id') for row in hub.get('seasons', [])] != season_ids:
    errors.append('public hub seasons do not match the season registry')

completed = [event for event in hub.get('events', []) if event.get('competitiveSeason') == '2025-2026']
completed.sort(key=lambda event: event.get('seasonOrder', 999))
if not completed or completed[0].get('id') != '2025-evan-cousineau-memorial-cup':
    errors.append('Evan Cousineau must be the first 2025–2026 historical event')
if completed and completed[-1].get('id') != '2026-junior-olympics':
    errors.append('Junior Olympics must close the 2025–2026 historical season')
if len(completed) != 8:
    errors.append(f'expected 8 completed public events in 2025–2026, found {len(completed)}')
if any(event.get('eventYear') not in {2025, 2026} for event in completed):
    errors.append('calendar event years were not retained')

next_event = hub.get('nextTournament', {})
if next_event.get('name') != 'Evan Cousineau Memorial Cup' or next_event.get('competitiveSeason') != '2026-2027':
    errors.append('upcoming Evan Cousineau is not assigned to 2026–2027')

for event in completed:
    if event.get('mode') != 'platform':
        continue
    bundle = load(event['dataPath'])
    metadata = bundle.get('event', {})
    if metadata.get('competitiveSeason') != '2025-2026' or metadata.get('seasonLabel') != '2025–2026':
        errors.append(f"platform event missing competitive season metadata: {event.get('id')}")

if registry.get('activeCompetitiveSeason') != '2026-2027' or registry.get('finalCompetitiveSeason') != '2025-2026':
    errors.append('central tournament registry season pointers are incorrect')
if any(event.get('competitiveSeason') != '2025-2026' for event in registry.get('events', [])):
    errors.append('existing registry events must remain in the completed 2025–2026 season')

for token in ['Season history', 'competitive season', 'Tournament archive competitive seasons', 'js/tournament-hub-v7-54-4.js?v=7.55.1']:
    if token not in html:
        errors.append(f'tournaments page missing {token}')
for token in ['state.config.seasons', 'event.competitiveSeason', 'data-season', 'finalSeason']:
    if token not in js:
        errors.append(f'tournament hub runtime missing {token}')

if len(load('rankings.json')) != 724:
    errors.append('rankings count changed')
if len(load('clubs.json')) != 182:
    errors.append('club count changed')
if load('data/tournaments/jo-results-2026.json').get('summary', {}).get('teamPlacements') != 976:
    errors.append('JO placement count changed')

if errors:
    print('TOURNAMENT COMPETITIVE SEASONS 7.55.0 TEST FAILED')
    for error in errors:
        print(' -', error)
    sys.exit(1)

print('TOURNAMENT COMPETITIVE SEASONS 7.55.0 TEST PASSED')
print(' - 2025–2026 history begins with Evan Cousineau and closes with Junior Olympics')
print(' - 2026–2027 is active and opens with the upcoming Evan Cousineau Memorial Cup')
print(' - calendar event years remain available while 2024 is removed from public history')
print(' - rankings, clubs, and JO placements remain unchanged')
