#!/usr/bin/env python3
"""
Apply Master Team Dictionary collapse to identity-resolved games.

Run:
  python scripts/apply_master_team_dictionary.py
"""

from pathlib import Path
import json, re
from collections import Counter

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

def slugify(v):
    return re.sub(r"[^a-z0-9]+", "-", str(v or "").lower().strip()).strip("-") or "unknown"

def main():
    games = json.loads((DATA / "games_identity_v1.json").read_text(encoding="utf-8"))
    collapse = json.loads((DATA / "team_collapse_map.json").read_text(encoding="utf-8"))

    out = {}
    same_removed = 0
    counts = Counter()
    for gid, g in games.items():
        a = collapse.get(g.get("team_1_id"), g.get("team_1_id"))
        b = collapse.get(g.get("team_2_id"), g.get("team_2_id"))
        if a == b:
            same_removed += 1
            continue
        ng = dict(g)
        ng["team_1_id_before_dictionary"] = g.get("team_1_id")
        ng["team_2_id_before_dictionary"] = g.get("team_2_id")
        ng["team_1_id"] = a
        ng["team_2_id"] = b
        s1, s2 = ng.get("team_1_score"), ng.get("team_2_score")
        ng["winner_team_id"] = a if s1 > s2 else b if s2 > s1 else None
        ng["loser_team_id"] = b if s1 > s2 else a if s2 > s1 else None
        ng["id"] = "game-" + slugify("|".join([ng.get("tournament_id",""), min(a,b), max(a,b), str(s1), str(s2), str(ng.get("division_raw","")), str(ng.get("round",""))]))[:150]
        out[ng["id"]] = ng
        counts[a] += 1
        counts[b] += 1

    teams = {}
    for tid, count in counts.items():
        club_id = re.sub(r"-[abcd]$", "", tid)
        level = tid.rsplit("-",1)[-1].upper() if re.search(r"-[abcd]$", tid) else "A"
        teams[tid] = {"id":tid, "name":tid.replace("-"," ").title(), "club_id":club_id, "team_level":level, "games":count, "ranking_eligible":count>=5, "age_group":"14U", "gender":"Boys"}

    (DATA / "games_dictionary_v1.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
    (DATA / "teams_dictionary_v1.json").write_text(json.dumps(teams, indent=2), encoding="utf-8")
    print(f"Wrote {len(out)} games, {len(teams)} teams, removed {same_removed} same-team games.")

if __name__ == "__main__":
    main()
