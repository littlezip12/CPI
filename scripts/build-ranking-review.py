#!/usr/bin/env python3
"""Build transparent, manual-only ranking review recommendations from normalized final games."""
from __future__ import annotations
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / 'data/tournaments/evidence/index.json'
RANKINGS = ROOT / 'rankings.json'
OUT = ROOT / 'data/tournaments/ranking-review-engine/index.json'
RUNTIME = ROOT / 'data/tournaments/ranking-review-engine/runtime.js'
QA = ROOT / 'qa/ranking-review-engine-7.44.0.json'
RELEASE = '7.44.0'


def load(path: Path):
    return json.loads(path.read_text(encoding='utf-8'))

def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00','Z')

def opponent_quality(rank: int | None) -> str:
    if not isinstance(rank, int): return 'unranked'
    if rank <= 10: return 'top_10'
    if rank <= 25: return 'top_25'
    if rank <= 50: return 'top_50'
    return 'ranked'

def suggestion(delta: float) -> dict[str, Any]:
    # Deliberately conservative: recommendation range, never an automatic rank.
    if delta >= 7: return {'direction':'up','range':'4-8 places','confidence':'high'}
    if delta >= 3: return {'direction':'up','range':'1-4 places','confidence':'medium'}
    if delta <= -7: return {'direction':'down','range':'4-8 places','confidence':'high'}
    if delta <= -3: return {'direction':'down','range':'1-4 places','confidence':'medium'}
    return {'direction':'hold','range':'0-2 places','confidence':'low'}

def score_game(result: str, team_rank: int | None, opp_rank: int | None, margin: int) -> float:
    base = {'W':2.0,'T':0.0,'L':-2.0}.get(result,0.0)
    if isinstance(team_rank,int) and isinstance(opp_rank,int):
        gap = team_rank - opp_rank  # positive = opponent ranked better
        if result == 'W': base += max(-1.5, min(4.0, gap / 8))
        elif result == 'L': base -= max(-1.5, min(4.0, -gap / 8))
    base += max(-1.0, min(1.0, margin / 8))
    return round(base,2)

def build(evidence: dict[str,Any], rankings: list[dict[str,Any]]) -> dict[str,Any]:
    rank_by_id = {r.get('canonicalTeamId'):r for r in rankings if r.get('canonicalTeamId')}
    teams = evidence.get('teams',{})
    final_games = {}
    team_games = defaultdict(list)
    for participant_id,item in teams.items():
        team_id = item.get('canonicalTeamId')
        if not team_id: continue
        for game in item.get('recentGames',[]):
            if game.get('status') != 'final' or game.get('result') not in {'W','L','T'}: continue
            gid = game.get('gameId')
            final_games[gid] = True
            team_games[team_id].append(game)

    recommendations=[]
    h2h=[]
    common_opponents=[]
    hierarchy=[]
    for team_id,games in team_games.items():
        rank = rank_by_id.get(team_id)
        if not rank: continue
        scored=[]; notable=[]; opponents={}
        for g in games:
            opp_id=g.get('opponentTeamId'); opp=rank_by_id.get(opp_id,{})
            tr=rank.get('postRank'); orank=opp.get('postRank')
            sf=g.get('scoreFor'); sa=g.get('scoreAgainst'); margin=(sf-sa) if isinstance(sf,(int,float)) and isinstance(sa,(int,float)) else 0
            impact=score_game(g.get('result'),tr,orank,margin)
            row={
                'gameId':g.get('gameId'),'eventName':g.get('eventName'),'divisionLabel':g.get('divisionLabel'),
                'opponentTeamId':opp_id,'opponentName':g.get('opponentName'),'opponentRank':orank,
                'opponentQuality':opponent_quality(orank),'result':g.get('result'),'scoreFor':sf,'scoreAgainst':sa,
                'margin':margin,'impact':impact,'sourceUrl':g.get('sourceUrl')
            }
            scored.append(row)
            if abs(impact)>=3 or (g.get('result')=='W' and isinstance(orank,int) and orank<=25): notable.append(row)
            if opp_id: opponents[opp_id]=row
            if opp_id and opp_id in rank_by_id:
                h2h.append({'teamId':team_id,'teamName':rank.get('team'),'teamRank':tr,'opponentTeamId':opp_id,'opponentName':opp.get('team'),'opponentRank':orank,'result':g.get('result'),'impact':impact,'gameId':g.get('gameId')})
        evidence_score=round(sum(x['impact'] for x in scored),2)
        rec=suggestion(evidence_score)
        recommendations.append({
            'canonicalTeamId':team_id,'team':rank.get('team'),'group':rank.get('group'),'currentRank':rank.get('postRank'),
            'currentCPI':rank.get('postCPI'),'teamPage':rank.get('teamPage'),'finalGames':len(scored),
            'evidenceScore':evidence_score,'recommendation':rec,'notableResults':sorted(notable,key=lambda x:abs(x['impact']),reverse=True)[:5],
            'allResults':sorted(scored,key=lambda x:abs(x['impact']),reverse=True),'policy':'manual_review_only'
        })

    # Common-opponent comparisons, same group only, requiring at least one shared opponent.
    ids=list(team_games)
    for i,a in enumerate(ids):
        ra=rank_by_id.get(a)
        if not ra: continue
        map_a={g.get('opponentTeamId'):g for g in team_games[a] if g.get('opponentTeamId')}
        for b in ids[i+1:]:
            rb=rank_by_id.get(b)
            if not rb or ra.get('group')!=rb.get('group'): continue
            map_b={g.get('opponentTeamId'):g for g in team_games[b] if g.get('opponentTeamId')}
            shared=sorted(set(map_a)&set(map_b))
            if not shared: continue
            details=[]; edge=0
            for oid in shared:
                ga,gb=map_a[oid],map_b[oid]
                order={'W':1,'T':0,'L':-1}; diff=order.get(ga.get('result'),0)-order.get(gb.get('result'),0); edge+=diff
                details.append({'opponentTeamId':oid,'opponentName':ga.get('opponentName'),'teamAResult':ga.get('result'),'teamBResult':gb.get('result')})
            common_opponents.append({'group':ra.get('group'),'teamAId':a,'teamA':ra.get('team'),'teamARank':ra.get('postRank'),'teamBId':b,'teamB':rb.get('team'),'teamBRank':rb.get('postRank'),'sharedOpponents':details,'edge':edge})

    # Same-club depth/hierarchy review from ranking metadata and evidence recommendations.
    by_club_group=defaultdict(list)
    rec_by_id={r['canonicalTeamId']:r for r in recommendations}
    for r in rankings:
        if r.get('canonicalClubId'): by_club_group[(r.get('canonicalClubId'),r.get('group'))].append(r)
    for (_,group),rows in by_club_group.items():
        if len(rows)<2: continue
        rows=sorted(rows,key=lambda x:x.get('postRank',999))
        for a,b in zip(rows,rows[1:]):
            da=a.get('teamDepth') or 1; db=b.get('teamDepth') or 1
            if da>db or (da==db and a.get('postRank',999)<b.get('postRank',999)): continue
            ea=rec_by_id.get(a.get('canonicalTeamId')); eb=rec_by_id.get(b.get('canonicalTeamId'))
            if ea or eb:
                hierarchy.append({'group':group,'higherDepthTeam':a.get('team'),'higherDepthRank':a.get('postRank'),'lowerDepthTeam':b.get('team'),'lowerDepthRank':b.get('postRank'),'reason':'same_club_depth_review','evidenceAvailable':bool(ea or eb)})

    recommendations.sort(key=lambda x:(x['group'], -abs(x['evidenceScore']), x['currentRank'] or 999))
    return {
        'schemaVersion':1,'release':RELEASE,'generatedAt':evidence.get('generatedAt') or now_iso(),
        'policy':'Recommendations are advisory review ranges only. WPI rankings never change automatically.',
        'counts':{'finalGames':len(final_games),'teamsWithFinalEvidence':len(recommendations),'moveUp':sum(r['recommendation']['direction']=='up' for r in recommendations),'moveDown':sum(r['recommendation']['direction']=='down' for r in recommendations),'hold':sum(r['recommendation']['direction']=='hold' for r in recommendations),'headToHeadItems':len(h2h),'commonOpponentItems':len(common_opponents),'hierarchyWarnings':len(hierarchy)},
        'recommendations':recommendations,'headToHead':h2h,'commonOpponents':common_opponents,'hierarchyWarnings':hierarchy
    }

def main():
    result=build(load(EVIDENCE),load(RANKINGS))
    OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    RUNTIME.write_text('window.CPI_RANKING_REVIEW_ENGINE = '+json.dumps(result,separators=(',',':'),ensure_ascii=False)+';\n',encoding='utf-8')
    QA.write_text(json.dumps({'release':RELEASE,'generatedAt':result['generatedAt'],'counts':result['counts']},indent=2)+'\n',encoding='utf-8')
    print('RANKING REVIEW ENGINE BUILD COMPLETE')
    print(f" - {result['counts']['finalGames']} unique final games")
    print(f" - {result['counts']['teamsWithFinalEvidence']} teams with ranking evidence")
    print(' - Published rankings remain unchanged')
    return 0
if __name__=='__main__': raise SystemExit(main())
