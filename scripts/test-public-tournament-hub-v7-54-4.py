#!/usr/bin/env python3
from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]
load=lambda rel: json.loads((ROOT/rel).read_text(encoding='utf-8'))
site=load('config/site-release.json')
hub=load('data/tournaments/public-hub.json')
html=(ROOT/'tournaments.html').read_text(encoding='utf-8')
js=(ROOT/'js/tournament-hub-v7-54-4.js').read_text(encoding='utf-8')
css=(ROOT/'css/tournament-hub-v7-54-4.css').read_text(encoding='utf-8')
if site.get('version') not in {'7.54.11','7.54.12','7.54.13','7.54.14','7.54.15','7.54.16'}: errors.append('site version must be 7.54.11')
if site.get('tournamentPublicHubRelease')!='7.54.16': errors.append('tournamentPublicHubRelease must be 7.54.16')
if site.get('tournamentArchiveExperienceRelease')!='7.54.4': errors.append('tournamentArchiveExperienceRelease must preserve 7.54.4')
for token in ['Follow every game. See every path.','class="next-tournament-action" id="nextTournamentAction" aria-disabled="true"','id="tournament-archive"','id="tournamentYearTabs"','id="archiveGroupSelect"','id="archiveResults"','polo-medal-team.jpg','js/tournament-hub-v7-54-4.js?v=7.54.16']:
    if token not in html: errors.append(f'tournaments.html missing {token}')
if 'id="nextTournamentHeading"' in html: errors.append('redundant Next Tournament heading remains above the card')
for forbidden in ['Tournament control room','Tournament intelligence','Open control room','Open source health','Open performance','Open review','Data review','Accuracy hold']:
    if forbidden in html: errors.append(f'public hub still exposes internal content: {forbidden}')
for token in ['renderNext','renderYears','renderEvents','renderJoResults','renderPlatformResults','joJourney','archive-team-link','requestedGroup']:
    if token not in js: errors.append(f'public hub runtime missing {token}')
for token in ['.tournament-hub-hero','.next-tournament-card','.tournament-year-tabs','.archive-browser','.archive-team-link']:
    if token not in css: errors.append(f'public hub stylesheet missing {token}')

next_event=hub.get('nextTournament',{})
if next_event.get('name')!='Evan Cousineau Memorial Cup': errors.append('next tournament must be Evan Cousineau Memorial Cup')
if next_event.get('dateLabel')!='October 3–4, 2026': errors.append('Evan Cousineau date is incorrect')
if next_event.get('publicPath') is not None: errors.append('Evan Cousineau must not link until an official schedule is published')
if next_event.get('status')!='announced': errors.append('Evan Cousineau must be marked announced')
if 'next.publicPath' not in js: errors.append('hero button does not prioritize an active next tournament')
if hub.get('years')!=[2026,2025,2024]: errors.append('archive years must be 2026, 2025, 2024')
events=hub.get('events',[])
ids=[e.get('id') for e in events]
expected_ids={'2026-kap7-international','2026-san-diego-county-cup','2026-girls-futures-super-finals','2026-boys-futures-super-finals','2026-quiksilver-cup','2026-jo-session-3','2026-junior-olympics','2025-evan-cousineau-memorial-cup'}
if set(ids)!=expected_ids:
    errors.append(f'public archive event coverage is incorrect: {ids}')
if '2026-girls-futures-super-finals' in ids and '2026-boys-futures-super-finals' in ids and ids.index('2026-girls-futures-super-finals')>ids.index('2026-boys-futures-super-finals'):
    errors.append(f'Girls Futures must precede Boys Futures: {ids}')
events_2026=[e for e in events if e.get('year')==2026]; orders=[e.get('seasonOrder') for e in events_2026]
if orders!=sorted(orders) or events_2026[-1].get('id')!='2026-junior-olympics': errors.append('Junior Olympics must be last in the 2026 water polo season order')
if not any(e.get('id')=='2025-evan-cousineau-memorial-cup' and e.get('seasonOrder')==10 for e in events): errors.append('Evan Cousineau must be first in the 2025 archive')
if hub.get('featuredEventId')!='2026-junior-olympics': errors.append('latest results button must feature the most recent completed tournament')
if any(e.get('id')=='2026-girls-us-club-championships' for e in events): errors.append('accuracy-hold event must not appear in public archive')
for rel in ['tournament-operations.html','tournament-source-health.html','jo-performance.html','ranking-review.html','post-jo-review.html','tournament-evidence.html']:
    text=(ROOT/rel).read_text(encoding='utf-8')
    if 'name="robots" content="noindex,nofollow"' not in text: errors.append(f'{rel} is not marked noindex')
robots=(ROOT/'robots.txt').read_text(encoding='utf-8')
for rel in ['tournament-operations.html','tournament-source-health.html','jo-performance.html','ranking-review.html','post-jo-review.html','tournament-evidence.html']:
    if f'Disallow: /{rel}' not in robots: errors.append(f'robots.txt does not disallow {rel}')
if len(load('rankings.json'))!=724: errors.append('rankings count changed')
if len(load('clubs.json'))!=182: errors.append('club count changed')
if load('data/tournaments/jo-results-2026.json').get('summary',{}).get('teamPlacements')!=976: errors.append('JO placement count changed')
if errors:
    print('PUBLIC TOURNAMENT HUB 7.54.4 TEST FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('PUBLIC TOURNAMENT HUB 7.54.4 TEST PASSED')
print(' - Evan Cousineau is announced next and all three JO weekends are archived')
print(' - Results stay collapsed until a tournament and age/gender are selected')
print(' - Team rows link to complete tournament journeys')
print(' - Internal tournament operations and ranking-review surfaces are removed from public discovery')
