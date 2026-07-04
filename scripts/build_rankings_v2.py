#!/usr/bin/env python3
"""
CPI Ranking Engine v2 Foundation

Reads normalized:
- data/teams.json
- data/games.json
- data/tournaments.json

Outputs:
- data/rankings_v2.json
- qa/rankings_v2_warnings.json

This is a foundation engine. It is not wired to the public UI yet.
"""

from pathlib import Path
import json
import math
from collections import Counter, defaultdict

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
QA = ROOT / "qa"

def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))

def expected(ra, rb):
    return 1 / (1 + 10 ** ((rb - ra) / 400))

def margin_mult(diff):
    return min(1.18, 1 + math.log(max(1, abs(diff))) / 7.0)

def tier_weight(tier):
    return {1: 1.00, 2: 0.72, 3: 0.45, 4: 0.32}.get(int(tier or 2), 0.62)

def run():
    teams = read_json(DATA / "teams.json")
    games = read_json(DATA / "games.json")
    tournaments = read_json(DATA / "tournaments.json")
    qa_rules = read_json(QA / "qa_rules.json") if (QA / "qa_rules.json").exists() else {}

    ratings = {tid: 1500.0 for tid in teams}
    played = Counter()
    wins = Counter()
    losses = Counter()
    ties = Counter()
    gf = Counter()
    ga = Counter()
    tier_counts = defaultdict(Counter)
    schedule = defaultdict(list)

    chronological = sorted(games.values(), key=lambda g: (tournaments.get(g.get("tournament_id"), {}).get("event_order", 99), g.get("source_row", 0)))

    for g in chronological:
        a, b = g.get("team_1_id"), g.get("team_2_id")
        if a not in ratings or b not in ratings:
            continue
        sa, sb = g.get("team_1_score"), g.get("team_2_score")
        if sa is None or sb is None:
            continue

        tour = tournaments.get(g.get("tournament_id"), {})
        w = float(tour.get("weight", 0.75)) * tier_weight(g.get("tier_num"))
        aa, bb = (1, 0) if sa > sb else (0, 1) if sb > sa else (0.5, 0.5)
        ea = expected(ratings[a], ratings[b])
        k = 14 * w * margin_mult(sa - sb)

        ratings[a] += k * (aa - ea)
        ratings[b] += k * (bb - (1 - ea))

        for tid, sf, sg in [(a, sa, sb), (b, sb, sa)]:
            played[tid] += 1
            gf[tid] += sf
            ga[tid] += sg
            tier_counts[tid][int(g.get("tier_num") or 2)] += 1
        schedule[a].append(b)
        schedule[b].append(a)

        if sa > sb:
            wins[a] += 1
            losses[b] += 1
        elif sb > sa:
            wins[b] += 1
            losses[a] += 1
        else:
            ties[a] += 1
            ties[b] += 1

    min_games = qa_rules.get("qualification", {}).get("min_games", 5)
    rows = []
    for tid, team in teams.items():
        if played[tid] < min_games:
            continue
        opp_avg = sum(ratings[o] for o in schedule[tid]) / len(schedule[tid]) if schedule[tid] else 1500
        primary_tier = tier_counts[tid].most_common(1)[0][0] if tier_counts[tid] else 2
        gd = (gf[tid] - ga[tid]) / played[tid] if played[tid] else 0
        score = ratings[tid] + (opp_avg - 1500) * 0.20 + gd * 1.2
        rows.append({
            "team_id": tid,
            "team": team.get("name", tid),
            "club_id": team.get("club_id"),
            "team_level": team.get("team_level", "A"),
            "cpi": round(score, 1),
            "record": f"{wins[tid]}-{losses[tid]}" + (f"-{ties[tid]}" if ties[tid] else ""),
            "games": played[tid],
            "primary_tier": primary_tier,
            "d1_games": tier_counts[tid][1],
            "schedule_strength": round(opp_avg - 1500, 1),
            "goal_diff_per_game": round(gd, 2)
        })

    rows.sort(key=lambda r: (-r["cpi"], -r["d1_games"], -r["games"], r["team"]))
    for i, r in enumerate(rows, 1):
        r["rank"] = i

    warnings = []
    for r in rows:
        if r["rank"] <= 10 and r["primary_tier"] != 1:
            warnings.append({"type": "division_guardrail", "level": "fail", "team": r["team"], "message": "Non Tier-1 team in Top 10."})
        if r["rank"] <= 15 and r["primary_tier"] >= 3:
            warnings.append({"type": "division_guardrail", "level": "fail", "team": r["team"], "message": "Tier 3 team in Top 15."})

    (DATA / "rankings_v2.json").write_text(json.dumps(rows, indent=2), encoding="utf-8")
    (QA / "rankings_v2_warnings.json").write_text(json.dumps(warnings, indent=2), encoding="utf-8")
    print(f"Wrote {len(rows)} ranked teams and {len(warnings)} warnings.")

if __name__ == "__main__":
    run()
