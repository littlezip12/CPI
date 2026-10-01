#!/usr/bin/env python3
from pathlib import Path
import json, re, sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]
def load(rel): return json.loads((ROOT/rel).read_text(encoding='utf-8'))
def check(cond,msg):
    if not cond: errors.append(msg)

site=load('config/site-release.json')
def ver(value): return tuple(int(x) for x in str(value).split('.'))
check(ver(site.get('version','0.0.0'))>=ver('7.64.36'),'site release must be 7.64.36 or a validated successor')
check(site.get('evanCousineau2026ScheduleRelease')=='7.64.36','ECC release marker missing')
bundle=load('data/tournaments/platform/events/2026-evan-cousineau-memorial-cup.json')
s=bundle.get('summary',{})
check((s.get('divisionCount'),s.get('gameCount'),s.get('finalGameCount'),s.get('scheduledGameCount'),s.get('venueCount'))==(13,335,0,335,18),f'bad ECC summary: {s}')
check(bundle.get('event',{}).get('competitiveSeason')=='2026-2027','ECC must be active 2026-2027 season')
check(bundle.get('event',{}).get('status')=='schedule_published','ECC status must be schedule_published')
cap=bundle.get('capabilities',{})
check(cap.get('liveRefresh') is True and cap.get('refreshSeconds')==60,'ECC repository refresh contract must be 60 seconds')
check(cap.get('refreshMode')=='repository_poll','ECC refresh mode must be honest repository polling')
check(cap.get('scoreSourceStatus')=='pending_official_result_source','ECC score source must remain explicitly pending')
check(cap.get('joStyleJourneyRouting') is True,'JO-style routing capability missing')
routing=bundle.get('routing',{})
check(routing.get('model')=='jo_style_candidate_and_resolution','ECC must use JO-style route model')
check(routing.get('internalCodesHiddenFromPublicUi') is True,'internal route codes must be hidden from public UI')
check(routing.get('bracketSideCount')==376,f"expected 376 bracket sides, got {routing.get('bracketSideCount')}")
check(routing.get('unresolvedCandidateSideCount')==0,'every routable ECC side must have source-backed candidate teams')

by_div={d.get('id'):d for d in bundle.get('divisions',[])}
expected={'10u-boys':15,'10u-girls-coed-gold':16,'10u-coed-platinum':16,'12u-coed-boys-silver':16,'12u-boys-gold':40,'12u-boys-platinum':22,'12u-girls':22,'14u-coed-boys-silver':46,'14u-boys-gold':49,'14u-boys-platinum':30,'14u-girls-gold':28,'14u-girls-platinum':15,'hs-girls':20}
check(set(by_div)==set(expected),'ECC division IDs mismatch')
for k,v in expected.items(): check(by_div.get(k,{}).get('gameCount')==v,f'{k} game count mismatch')

# No result fabrication and no recurrence of the TIME/LOCATION-as-routing parser defect.
for g in bundle.get('games',[]):
    check(g.get('status')=='scheduled',f"{g.get('gameNumber')} unexpectedly not scheduled")
    scores=g.get('scores') or {}
    check(scores.get('white') is None and scores.get('dark') is None,f"{g.get('gameNumber')} contains a fabricated score")
for p in (ROOT/'data/tournaments/normalized/2026-evan-cousineau-memorial-cup').glob('*.json'):
    doc=json.loads(p.read_text(encoding='utf-8'))
    for g in doc.get('games',[]):
        advancement=g.get('advancement') or {}
        check(not advancement.get('winnerTo') and not advancement.get('loserTo'),f"{p.name}/{g.get('sourceGameId')} has fabricated W/L routing: {advancement}")

# Public route metadata must translate bracket syntax into names/candidates rather than expose codes as UI labels.
bracket_sides=[]
for g in bundle.get('games',[]):
    for side in ('white','dark'):
        meta=(g.get('routing') or {}).get(side) or {}
        if meta.get('kind') not in ('slot','unknown'):
            bracket_sides.append((g,side,meta))
            check(bool(meta.get('candidateNames')),f"{g.get('gameNumber')} {side} has no candidate names")
            label=str(meta.get('publicLabel') or '')
            check(not re.search(r'(^|\s)[WL]#|\b(?:1st|2nd|3rd|4th)[A-Z]\b',label),f"{g.get('gameNumber')} exposes raw bracket code in public label: {label}")
check(len(bracket_sides)==376,f'expected 376 route-dependent sides, got {len(bracket_sides)}')

# Lamorinda A: two confirmed source games plus JO-style future branches and downstream placement paths.
lamo=next((t for t in bundle.get('teams',[]) if t.get('name')=='Lamorinda A' and t.get('divisionId')=='14u-boys-platinum'),None)
check(bool(lamo),'Lamorinda A 14U Boys Platinum team missing')
if lamo:
    pid=lamo.get('participantId')
    direct=[]; possible=[]
    for g in bundle.get('games',[]):
        if g.get('divisionId')!='14u-boys-platinum': continue
        exact=any((g.get(side) or {}).get('participantId')==pid for side in ('white','dark'))
        candidate=any(pid in (((g.get('routing') or {}).get(side) or {}).get('candidateParticipantIds') or []) for side in ('white','dark'))
        if exact: direct.append(g.get('routeNumber'))
        elif candidate: possible.append(g.get('routeNumber'))
    check(sorted(direct,key=int)==['1','7'],f'Lamorinda direct games should be 1 and 7, got {direct}')
    for number in ['16','19','20','23','24','26','27','28','29']:
        check(number in possible,f'Lamorinda possible future path missing Game {number}')
    for number,rank in [('16','3rd'),('19','2nd'),('20','1st')]:
        g=next((x for x in bundle['games'] if x.get('divisionId')=='14u-boys-platinum' and x.get('routeNumber')==number),None)
        side=next((s for s in ('white','dark') if pid in (((g.get('routing') or {}).get(s) or {}).get('candidateParticipantIds') or [])),None) if g else None
        meta=((g.get('routing') or {}).get(side) or {}) if side else {}
        check(meta.get('publicLabel')==f'{rank} from Group A',f'Game {number} Lamorinda branch label wrong: {meta.get("publicLabel")}')
        check(set(meta.get('candidateNames') or [])=={'Lamorinda A','SAN DIEGO DONS RED','SOCAL PATRIOTS GOLD'},f'Game {number} Group A candidates wrong: {meta.get("candidateNames")}')

# Numbered W/L routing maps to the correct source game and names.
g7=next((g for g in bundle['games'] if g.get('divisionId')=='14u-girls-gold' and g.get('routeNumber')=='7'),None)
if g7:
    wm=(g7.get('routing') or {}).get('white') or {}
    check(wm.get('publicLabel')=='Winner of Game 3',f'14U Girls Gold Game 7 label wrong: {wm.get("publicLabel")}')
    check(set(wm.get('candidateNames') or [])=={'North Irvine','Trojan'},f'Game 7 W#3 candidates wrong: {wm.get("candidateNames")}')
else: check(False,'14U Girls Gold Game 7 missing')

# Matchup refs (W#B1/B4) resolve to the actual earlier matchup and teams.
g17=next((g for g in bundle['games'] if g.get('divisionId')=='14u-boys-gold' and g.get('routeNumber')=='17'),None)
if g17:
    wm=(g17.get('routing') or {}).get('white') or {}
    check(wm.get('publicLabel')=='Winner of Game 3',f'14U Boys Gold matchup label wrong: {wm.get("publicLabel")}')
    check(set(wm.get('candidateNames') or [])=={'LA JOLLA UNITED GOLD','CMAC'},f'W#B1/B4 candidates wrong: {wm.get("candidateNames")}')
else: check(False,'14U Boys Gold Game 17 missing')

# Routed round-robin slots propagate actual source-backed candidates into later groups.
g24=next((g for g in bundle['games'] if g.get('divisionId')=='14u-boys-gold' and g.get('routeNumber')=='24'),None)
if g24:
    wm=(g24.get('routing') or {}).get('white') or {}
    check(wm.get('publicLabel')=='1st from Group A',f'G1(1stA) public label wrong: {wm.get("publicLabel")}')
    check(set(wm.get('candidateNames') or [])=={'TROJAN CARDINAL','Lamorinda B','NORTH IRVINE RED'},f'G1(1stA) candidates wrong: {wm.get("candidateNames")}')
else: check(False,'14U Boys Gold Game 24 missing')

# Source architecture: OneDrive is schedule authority; results adapter remains replaceable/pending.
adapters={a.get('id'):a for a in bundle.get('sourceAdapters',[])}
check(adapters.get('2026-ecc-onedrive-workbook',{}).get('role')=='official_schedule_source','OneDrive schedule adapter missing')
check(adapters.get('2026-ecc-onedrive-workbook',{}).get('status')=='schedule_authority','OneDrive must be schedule authority')
check(adapters.get('2026-ecc-result-overlay',{}).get('status')=='awaiting_best_live_result_source','replaceable official-result adapter missing')

# Public hub and live index expose current tournament.
hub=load('data/tournaments/public-hub.json')
check(hub.get('featuredEventId')=='2026-evan-cousineau-memorial-cup','ECC should be featured current event')
row=next((e for e in hub.get('events',[]) if e.get('id')=='2026-evan-cousineau-memorial-cup'),None)
check(bool(row) and row.get('dataPath')=='data/tournaments/platform/events/2026-evan-cousineau-memorial-cup.json','ECC public hub row missing')
index=load('data/live/tournament-schedule-index.json')
check(index.get('counts',{}).get('events')==1 and index.get('counts',{}).get('games')==335,'Live tournament schedule index must expose 1 ECC event / 335 games')

# UI contract: candidate names, possible future paths, dynamic result resolution, and no raw bracket display helper.
js=(ROOT/'js/tournament-platform-v7-64-36.js').read_text(encoding='utf-8')
for token in ['candidateNames','contextualFilterOptions','syncFilterOptions','gameHasResolvedTeam','Pin this team','readPinnedTeam','writePinnedTeam','immediateRouteTargets','venueLinksHtml','resolvedParticipantId','groupRanking','scoreSourceStatus']:
    check(token in js,f'tournament UI missing {token}')
check('bracketLabel(' not in js,'old raw bracket-label UI must not remain')
check('Possible future path' not in js,'full future-path tree should not be rendered in the public journey')
check('Team schedule</h3>' not in js,'team journey should not dump the full confirmed schedule')
for token in ['www.google.com/maps/dir/?api=1','maps.apple.com/?daddr=','waze.com/ul?q=']:
    check(token in js,f'map navigation missing {token}')
html=(ROOT/'tournament.html').read_text(encoding='utf-8')
check('js/tournament-platform-v7-64-36.js?v=7.64.36' in html,'tournament page not wired to 7.64.36 runtime')
check('css/tournament-platform-v7-54-0.css?v=7.64.36' in html,'tournament CSS cache-bust missing')
check(len(list((ROOT/'data/tournaments/source/2026-evan-cousineau-memorial-cup').glob('*.csv')))==13,'expected 13 source CSV exports')

if errors:
    print('WPHQ 7.64.36 ECC CHECK FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('WPHQ 7.64.36 ECC CHECK PASSED')
print(f" - {s['divisionCount']} divisions / {s['gameCount']} scheduled games / {s['venueCount']} venues")
print(f" - {len(bracket_sides)} bracket-dependent sides all map to source-backed candidate teams")
print(' - Lamorinda A: Games 1 and 7 confirmed; Group A and downstream possible paths verified')
print(' - OneDrive is schedule authority; official score/result overlay remains replaceable and pending')
