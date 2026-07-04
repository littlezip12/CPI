#!/usr/bin/env python3
"""
CPI QA Validator v2

Validates normalized data and Rankings v2 output.
"""

from pathlib import Path
import json
from collections import Counter, defaultdict

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
QA = ROOT / "qa"

def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))

def main():
    teams = read_json(DATA / "teams.json")
    games = read_json(DATA / "games.json")
    tournaments = read_json(DATA / "tournaments.json")
    rankings_path = DATA / "rankings_v2.json"
    rankings = read_json(rankings_path) if rankings_path.exists() else []
    warnings = []

    for gid, g in games.items():
        if g.get("team_1_id") and g["team_1_id"] not in teams:
            warnings.append({"type": "unknown_team", "level": "fail", "game_id": gid, "team_id": g["team_1_id"]})
        if g.get("team_2_id") and g["team_2_id"] not in teams:
            warnings.append({"type": "unknown_team", "level": "fail", "game_id": gid, "team_id": g["team_2_id"]})
        if g.get("tournament_id") not in tournaments:
            warnings.append({"type": "unknown_tournament", "level": "fail", "game_id": gid, "tournament_id": g.get("tournament_id")})

    names = Counter(t.get("name") for t in teams.values())
    for name, count in names.items():
        if name and count > 1:
            warnings.append({"type": "duplicate_team_name", "level": "warn", "team": name, "count": count})

    by_club = defaultdict(list)
    for r in rankings:
        by_club[r.get("club_id")].append(r)
    for cid, rows in by_club.items():
        a = [r for r in rows if r.get("team_level") == "A"]
        if not a:
            continue
        best_a = min(a, key=lambda r: r["rank"])
        for r in rows:
            if r.get("team_level") != "A" and r["rank"] + 20 < best_a["rank"]:
                warnings.append({
                    "type": "club_hierarchy",
                    "level": "warn",
                    "team": r["team"],
                    "message": f"{r['team']} is more than 20 places above same-club A team."
                })

    (QA / "normalized_data_warnings.json").write_text(json.dumps(warnings, indent=2), encoding="utf-8")
    print(f"QA complete. {len(warnings)} warnings.")

if __name__ == "__main__":
    main()
