#!/usr/bin/env python3
"""
CPI Parser Intelligence

Purpose:
- Collapse parser raw team identifiers into canonical team IDs.
- Produce canonical games and teams for CPI v2 ranking work.
- Produce QA reports showing unresolved/defaulted names.

Run:
  python scripts/canonicalize_parser_output.py
"""

from pathlib import Path
import json, re
from collections import Counter

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
QA = ROOT / "qa"

def slugify(v):
    return re.sub(r"[^a-z0-9]+", "-", str(v or "").lower().strip()).strip("-") or "unknown"

def nice_name(team_id):
    return " ".join(w.upper() if w in {"sd","la","sj","cc","ocwpc","lawpc","cvu"} or w.isdigit() else w.capitalize() for w in team_id.split("-"))

def canonicalize(raw_id, aliases, removed):
    s = slugify(raw_id)
    if s in removed:
        return None
    if s in aliases:
        return aliases[s]
    s = re.sub(r"^(win|winner|los|loser|loss)-gm-\d+-", "", s)
    s = re.sub(r"-14u-boys?", "", s)
    if re.search(r"(^|-)12u?($|-)|(^|-)12($|-)|(^|-)10u?($|-)|(^|-)16u?($|-)|(^|-)18u?($|-)", s):
        return None
    if re.search(r"-[abcd]$", s):
        return s
    if re.search(r"^(q|r|winner|loser|win|los|loss|game|gm)-", s):
        return None
    return f"{s}-a"

def main():
    games = json.loads((DATA / "games_v2_test.json").read_text(encoding="utf-8"))
    alias_data = json.loads((DATA / "aliases.json").read_text(encoding="utf-8"))
    aliases = alias_data.get("team_aliases", {})
    removed = set(alias_data.get("removed_teams", []))

    canonical_games = {}
    raw_to_canonical = {}
    removed_games = 0

    for gid, g in games.items():
        a_raw, b_raw = g.get("team_1_id"), g.get("team_2_id")
        a = canonicalize(a_raw, aliases, removed)
        b = canonicalize(b_raw, aliases, removed)
        if a_raw and a: raw_to_canonical[a_raw] = a
        if b_raw and b: raw_to_canonical[b_raw] = b
        if not a or not b or a == b:
            removed_games += 1
            continue
        ng = dict(g)
        ng["team_1_id_raw"] = a_raw
        ng["team_2_id_raw"] = b_raw
        ng["team_1_id"] = a
        ng["team_2_id"] = b
        ng["id"] = "game-" + slugify("|".join([ng.get("tournament_id",""), min(a,b), max(a,b), str(ng.get("team_1_score")), str(ng.get("team_2_score")), str(ng.get("division_raw","")), str(ng.get("round",""))]))[:140]
        canonical_games[ng["id"]] = ng

    teams = {}
    counts = Counter()
    for g in canonical_games.values():
        counts[g["team_1_id"]] += 1
        counts[g["team_2_id"]] += 1
    for tid, count in counts.items():
        club = re.sub(r"-[abcd]$", "", tid)
        level = tid.rsplit("-", 1)[-1].upper() if re.search(r"-[abcd]$", tid) else "A"
        teams[tid] = {"id": tid, "name": nice_name(tid), "club_id": club, "team_level": level, "age_group": "14U", "gender": "Boys", "games": count}

    (DATA / "games_v2_canonical.json").write_text(json.dumps(canonical_games, indent=2), encoding="utf-8")
    (DATA / "teams_v2_canonical.json").write_text(json.dumps(teams, indent=2), encoding="utf-8")
    (QA / "parser_intelligence_report.json").write_text(json.dumps({
        "summary": {
            "raw_team_identifiers": len(set([g.get("team_1_id") for g in games.values()] + [g.get("team_2_id") for g in games.values()])),
            "canonical_teams": len(teams),
            "canonical_teams_with_5plus_games": sum(1 for t in teams.values() if t["games"] >= 5),
            "canonical_games": len(canonical_games),
            "games_removed": removed_games
        },
        "raw_to_canonical": raw_to_canonical
    }, indent=2), encoding="utf-8")
    print(f"Wrote {len(teams)} canonical teams and {len(canonical_games)} canonical games.")

if __name__ == "__main__":
    main()
