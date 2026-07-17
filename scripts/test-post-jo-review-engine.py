#!/usr/bin/env python3
import copy
import importlib.util
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('post_jo',ROOT/'scripts/build-post-jo-review.py')
mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)

snapshot={'snapshotId':'test-snapshot','createdAt':'2026-07-16T00:00:00Z','sourceRelease':'test','rankingDataRelease':'test','teamsHash':'abc','teams':[{'canonicalTeamId':'team-a','rank':12,'cpi':1900}]}
rankings=[{'canonicalTeamId':'team-a','canonicalClubId':'club-a','team':'Alpha','club':'A Club','group':'14U Boys','teamDepth':1,'teamDepthLabel':'primary/A-level','teamPage':'team.html?team=a','postRank':12,'postCPI':1900}]
evidence={'teams':{'participant-a':{'canonicalTeamId':'team-a','rankingEligible':True,'appearances':[{'eventId':'jo','eventName':'JO','divisionId':'d1','divisionLabel':'14U Championship','divisionTier':'D1','seed':10,'sourceUrl':'source','publicPath':'jo'}]}}}
performance={'teams':[{'canonicalTeamId':'team-a','appearances':[{'eventId':'jo','divisionId':'d1','confirmedPlacement':3,'finalGames':6,'wins':5,'losses':1,'ties':0,'goalsFor':60,'goalsAgainst':40,'goalDifference':20}],'bestWin':{'opponentName':'Beta'},'worstLoss':{'opponentName':'Gamma'}}]}
review={'recommendations':[{'canonicalTeamId':'team-a','evidenceScore':8.5,'recommendation':{'direction':'up','range':'4-8 places','confidence':'high'},'notableResults':[{'result':'W'}]}]}
rankings_before=copy.deepcopy(rankings)
result=mod.build(snapshot,rankings,evidence,performance,review)
assert rankings==rankings_before,'Build mutated published rankings'
assert result['counts']['packets']==1
assert result['counts']['readyForReview']==1
packet=result['packets'][0]
assert packet['expectedFinish']==10 and packet['actualFinish']==3 and packet['performanceDelta']==7
assert packet['priority'] in {'high','medium'}
assert packet['policy']=='manual_decision_only'

waiting=mod.build(snapshot,rankings,evidence,{'teams':[]},{'recommendations':[]})
assert waiting['counts']['readyForReview']==0
assert waiting['packets'][0]['reviewState']=='awaiting_results'
assert waiting['packets'][0]['actualFinish'] is None
print('POST-JO REVIEW ENGINE TESTS PASSED')
print(' - Official JO seed and verified finish produce division-local over/underperformance')
print(' - Completed placement evidence enters the controlled review queue')
print(' - Pre-tournament schedules remain awaiting results')
print(' - Published ranking inputs are never mutated')
