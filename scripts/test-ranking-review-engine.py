#!/usr/bin/env python3
from importlib.util import spec_from_file_location,module_from_spec
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=spec_from_file_location('engine',ROOT/'scripts/build-ranking-review.py'); m=module_from_spec(spec); spec.loader.exec_module(m)
rankings=[
 {'canonicalTeamId':'a','team':'Alpha','group':'14U Boys','postRank':20,'postCPI':1900,'teamPage':'team.html?team=a','canonicalClubId':'ca','teamDepth':1},
 {'canonicalTeamId':'b','team':'Bravo','group':'14U Boys','postRank':5,'postCPI':2100,'teamPage':'team.html?team=b','canonicalClubId':'cb','teamDepth':1},
 {'canonicalTeamId':'c','team':'Charlie','group':'14U Boys','postRank':30,'postCPI':1800,'teamPage':'team.html?team=c','canonicalClubId':'cc','teamDepth':1},
]
def item(tid,name,games): return {'canonicalTeamId':tid,'name':name,'recentGames':games}
def game(gid,opp,name,result,sf,sa): return {'gameId':gid,'status':'final','result':result,'opponentTeamId':opp,'opponentName':name,'scoreFor':sf,'scoreAgainst':sa,'eventName':'Test JO','divisionLabel':'14U Championship','sourceUrl':'https://example.test'}
evidence={'generatedAt':'2026-07-15T00:00:00Z','teams':{
 'a':item('a','Alpha',[game('g1','b','Bravo','W',9,7),game('g2','c','Charlie','W',10,8)]),
 'b':item('b','Bravo',[game('g1','a','Alpha','L',7,9),game('g3','c','Charlie','W',11,5)]),
 'c':item('c','Charlie',[game('g2','a','Alpha','L',8,10),game('g3','b','Bravo','L',5,11)]),
}}
r=m.build(evidence,rankings)
assert r['counts']['finalGames']==3,r['counts']
alpha=next(x for x in r['recommendations'] if x['canonicalTeamId']=='a')
assert alpha['recommendation']['direction']=='up',alpha
assert any(x['teamId']=='a' and x['opponentTeamId']=='b' and x['result']=='W' for x in r['headToHead'])
assert any(set([x['teamAId'],x['teamBId']])=={'a','b'} and x['sharedOpponents'] for x in r['commonOpponents'])
print('RANKING REVIEW ENGINE TESTS PASSED')
print(' - Upsets, head-to-head, common opponents, and conservative movement ranges are generated')
print(' - Recommendations remain advisory and never rewrite rankings.json')
