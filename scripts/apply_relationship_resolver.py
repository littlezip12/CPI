#!/usr/bin/env python3
"""
Apply Relationship Resolver merge map.

Run:
  python scripts/apply_relationship_resolver.py
"""
from pathlib import Path
import json,re
from collections import Counter

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"data"

def slugify(v):
    return re.sub(r"[^a-z0-9]+","-",str(v or "").lower().strip()).strip("-") or "unknown"
def club_base(tid): return re.sub(r"-[abcd]$","",tid)
def level(tid):
    m=re.search(r"-([abcd])$",tid)
    return m.group(1).upper() if m else "A"
def find(x,merge):
    seen=set()
    while x in merge and x not in seen:
        seen.add(x); x=merge[x]
    return x

def main():
    games=json.loads((DATA/"games_dictionary_v1.json").read_text(encoding="utf-8"))
    merge=json.loads((DATA/"relationship_merge_map.json").read_text(encoding="utf-8"))
    out={}
    counts=Counter()
    removed=0
    for gid,g in games.items():
        a=find(g["team_1_id"],merge); b=find(g["team_2_id"],merge)
        if a==b:
            removed+=1; continue
        ng=dict(g)
        ng["team_1_id"]=a; ng["team_2_id"]=b
        s1,s2=ng.get("team_1_score"),ng.get("team_2_score")
        ng["winner_team_id"]=a if s1>s2 else b if s2>s1 else None
        ng["loser_team_id"]=b if s1>s2 else a if s2>s1 else None
        ng["id"]="game-"+slugify("|".join([ng.get("tournament_id",""),min(a,b),max(a,b),str(s1),str(s2),str(ng.get("division_raw","")),str(ng.get("round",""))]))[:150]
        out[ng["id"]]=ng
        counts[a]+=1; counts[b]+=1
    teams={tid:{"id":tid,"name":tid.replace("-"," ").title(),"club_id":club_base(tid),"team_level":level(tid),"games":count,"ranking_eligible":count>=5,"age_group":"14U","gender":"Boys"} for tid,count in counts.items()}
    (DATA/"games_relationship_v1.json").write_text(json.dumps(out,indent=2),encoding="utf-8")
    (DATA/"teams_relationship_v1.json").write_text(json.dumps(teams,indent=2),encoding="utf-8")
    print(f"Wrote {len(out)} games, {len(teams)} teams, removed {removed}.")
if __name__=="__main__":
    main()
