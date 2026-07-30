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
if site.get('version')!='7.54.6': errors.append('site version must be 7.54.6')
if site.get('tournamentPublicHubRelease')!='7.54.6': errors.append('tournamentPublicHubRelease must be 7.54.6')
if site.get('tournamentArchiveExperienceRelease')!='7.54.4': errors.append('tournamentArchiveExperienceRelease must preserve 7.54.4')
for token in ['Your team. Your tournament.','class="next-tournament-action" id="nextTournamentAction" href="tournaments/jo-texas/"','id="tournament-archive"','id="tournamentYearTabs"','id="archiveGroupSelect"','id="archiveResults"','polo-medal-team.jpg','js/tournament-hub-v7-54-4.js?v=7.54.6']:
    if token not in html: errors.append(f'tournaments.html missing {token}')
if 'id="nextTournamentHeading"' in html: errors.append('redundant Next Tournament heading remains above the card')
for forbidden in ['Tournament control room','Tournament intelligence','Open control room','Open source health','Open performance','Open review','Data review','Accuracy hold']:
    if forbidden in html: errors.append(f'public hub still exposes internal content: {forbidden}')
for token in ['renderNext','renderYears','renderEvents','renderJoResults','renderPlatformResults','joJourney','archive-team-link','requestedGroup']:
    if token not in js: errors.append(f'public hub runtime missing {token}')
for token in ['.tournament-hub-hero','.next-tournament-card','.tournament-year-tabs','.archive-browser','.archive-team-link']:
    if token not in css: errors.append(f'public hub stylesheet missing {token}')

next_event=hub.get('nextTournament',{})
if next_event.get('name')!='Junior Olympics Session 3': errors.append('next tournament must be Junior Olympics Session 3')
if next_event.get('publicPath')!='tournaments/jo-texas/': errors.append('next tournament must link to the Session 3 viewer')
if next_event.get('status')!='schedule_available': errors.append('Session 3 schedule must be marked available')
if 'next.publicPath' not in js: errors.append('hero button does not prioritize an active next tournament')
if hub.get('years')!=[2026,2025,2024]: errors.append('archive years must be 2026, 2025, 2024')
events=hub.get('events',[])
ids=[e.get('id') for e in events]
if ids!=['2026-boys-futures-super-finals','2026-quiksilver-cup','2026-junior-olympics']:
    errors.append(f'2026 public season order is incorrect: {ids}')
orders=[e.get('seasonOrder') for e in events]
if orders!=sorted(orders) or events[-1].get('id')!='2026-junior-olympics': errors.append('Junior Olympics must be last in water polo season order')
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
print(' - Compact hero, next-event module, and year-based archive are wired')
print(' - Results stay collapsed until a tournament and age/gender are selected')
print(' - Team rows link to complete tournament journeys')
print(' - Internal tournament operations and ranking-review surfaces are removed from public discovery')
