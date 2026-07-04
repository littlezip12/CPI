#!/usr/bin/env python3
"""
CPI Ranking Engine v1 with Tournament Path Score

Inputs:
- games + teams from current engine/dictionary outputs
- tournament_path_scores_v1.json

Outputs:
- data/cpi_rankings_with_path_v1.json
- qa/cpi-ranking-path-report.html

Run:
  python scripts/build_cpi_rankings_with_path.py
"""

from pathlib import Path
import json, re, math
from collections import Counter, defaultdict

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
QA = ROOT / "qa"

def read_json(path, default=None):
    p = Path(path)
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else (default if default is not None else {})

def first_existing(*paths):
    for p in paths:
        if Path(p).exists():
            return Path(p)
    return None

def expected(ra, rb):
    return 1 / (1 + 10 ** ((rb - ra) / 400))

def margin_mult(diff):
    return min(1.2, 1 + math.log(max(1, abs(diff))) / 7)

def tier_weight(tier):
    return {1:1.0,2:0.72,3:0.45,4:0.3}.get(int(tier or 2),0.65)

def main():
    games = read_json(first_existing(DATA/"games_engine_v2.json", DATA/"games_relationship_v1.json", DATA/"games_dictionary_v1.json"), {})
    teams = read_json(first_existing(DATA/"teams_engine_v2.json", DATA/"teams_relationship_v1.json", DATA/"teams_dictionary_v1.json"), {})
    tournaments = read_json(DATA/"tournament_registry.json", {})
    path_scores = read_json(DATA/"tournament_path_scores_v1.json", {})

    ratings = {tid:1500.0 for tid in teams}
    played = Counter(); wins=Counter(); losses=Counter(); gf=Counter(); ga=Counter()
    schedule=defaultdict(list); quality_wins=defaultdict(int); top_games=defaultdict(int)

    chronological=sorted(games.values(), key=lambda g:(tournaments.get(g.get("tournament_id"),{}).get("event_order",99), g.get("source_file",""), g.get("source_row",0)))
    for g in chronological:
        a,b=g["team_1_id"],g["team_2_id"]
        if a not in ratings or b not in ratings: continue
        s1,s2=g["team_1_score"],g["team_2_score"]
        ea=expected(ratings[a],ratings[b])
        aa=1 if s1>s2 else 0 if s2>s1 else 0.5
        tw=float(tournaments.get(g["tournament_id"],{}).get("weight",0.8))*tier_weight(g.get("tier_num"))
        k=16*tw*margin_mult(s1-s2)
        pre_a,pre_b=ratings[a],ratings[b]
        ratings[a]+=k*(aa-ea)
        ratings[b]+=k*((1-aa)-(1-ea))
        played[a]+=1; played[b]+=1
        schedule[a].append(b); schedule[b].append(a)
        gf[a]+=s1; ga[a]+=s2; gf[b]+=s2; ga[b]+=s1
        if s1>s2:
            wins[a]+=1; losses[b]+=1
            if pre_b >= 1650: quality_wins[a]+=1
        elif s2>s1:
            wins[b]+=1; losses[a]+=1
            if pre_a >= 1650: quality_wins[b]+=1

    rows=[]
    for tid,t in teams.items():
        games_n=played[tid] or t.get("games",0)
        if games_n < 4: 
            continue
        opp_avg=sum(ratings[o] for o in schedule[tid])/len(schedule[tid]) if schedule[tid] else 1500
        gd=(gf[tid]-ga[tid])/games_n if games_n else 0
        path=path_scores.get(tid,{}).get("tournament_path_score",0)
        base=ratings[tid]
        sos=(opp_avg-1500)*0.22
        gd_component=max(-18,min(18,gd*1.4))
        quality_component=quality_wins[tid]*5
        path_component=path*0.35
        cpi=base+sos+gd_component+quality_component+path_component
        rows.append({
            "team_id":tid,
            "team":t.get("name",tid),
            "club_id":t.get("club_id"),
            "team_level":t.get("team_level"),
            "cpi":round(cpi,1),
            "base_rating":round(base,1),
            "schedule_strength":round(opp_avg-1500,1),
            "quality_wins":quality_wins[tid],
            "goal_diff_per_game":round(gd,2),
            "tournament_path_score":path,
            "components":{
                "base_rating":round(base,1),
                "sos_component":round(sos,1),
                "goal_diff_component":round(gd_component,1),
                "quality_win_component":round(quality_component,1),
                "path_component":round(path_component,1)
            },
            "record":f"{wins[tid]}-{losses[tid]}",
            "games":games_n
        })
    rows.sort(key=lambda r:(-r["cpi"],-r["games"],r["team"]))
    for i,r in enumerate(rows,1): r["rank"]=i
    rows=rows[:100]
    (DATA/"cpi_rankings_with_path_v1.json").write_text(json.dumps(rows,indent=2),encoding="utf-8")

    table="\n".join(f"<tr><td>#{r['rank']}</td><td>{r['team']}</td><td>{r['cpi']}</td><td>{r['record']}</td><td>{r['schedule_strength']}</td><td>{r['quality_wins']}</td><td>{r['tournament_path_score']}</td></tr>" for r in rows[:100])
    html=f"""<!doctype html><html><head><meta charset='utf-8'><title>CPI Rankings with Path Score</title>
<style>body{{font-family:system-ui;margin:30px;background:#f6f8fb;color:#071832}}.card{{background:white;border:1px solid #dce6f2;border-radius:14px;padding:18px;margin:18px 0;box-shadow:0 10px 30px #0001}}table{{width:100%;border-collapse:collapse}}td,th{{border-bottom:1px solid #dce6f2;padding:10px;text-align:left}}th{{font-size:12px;text-transform:uppercase;color:#607086}}</style></head><body>
<h1>CPI Rankings v1 with Tournament Path Score</h1>
<p>Path score supports CPI but does not determine rankings by itself.</p>
<div class='card'><table><thead><tr><th>Rank</th><th>Team</th><th>CPI</th><th>Record</th><th>SOS</th><th>Q Wins</th><th>Path</th></tr></thead><tbody>{table}</tbody></table></div>
</body></html>"""
    (QA/"cpi-ranking-path-report.html").write_text(html,encoding="utf-8")
    print(json.dumps({"ranked":len(rows),"top":rows[0] if rows else None},indent=2))

if __name__=="__main__":
    main()
