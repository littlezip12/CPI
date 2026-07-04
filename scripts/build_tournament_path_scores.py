#!/usr/bin/env python3
"""
CPI Tournament Path Score v1

Purpose:
- Add tournament-path evidence to CPI without making final tournament placement the ranking outcome.
- Uses opponent quality, path/round context, tournament type, division tier, and optional finish context.
- Outputs team-level tournament resume and path score components.

Inputs, in preference order:
- data/games_engine_v2.json OR data/games_relationship_v1.json OR data/games_dictionary_v1.json
- data/teams_engine_v2.json OR data/teams_relationship_v1.json OR data/teams_dictionary_v1.json
- data/tournament_registry.json
- data/tournament_path_score_config.json

Outputs:
- data/tournament_path_scores_v1.json
- data/team_tournament_resumes_v1.json
- qa/tournament-path-score-report.html
- qa/tournament_path_score_report.json

Run:
  python scripts/build_tournament_path_scores.py
"""

from pathlib import Path
import json, re, math
from collections import Counter, defaultdict

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
QA = ROOT / "qa"

def read_json(path, default=None):
    p = Path(path)
    if not p.exists():
        return default if default is not None else {}
    return json.loads(p.read_text(encoding="utf-8"))

def first_existing(*paths):
    for p in paths:
        if Path(p).exists():
            return Path(p)
    return None

def round_stage(round_text):
    s = str(round_text or "").lower()
    if "final" in s or "1st" in s or "championship" in s:
        return "final"
    if "semi" in s:
        return "semifinal"
    if "quarter" in s:
        return "quarterfinal"
    if "cross" in s:
        return "crossover"
    if "place" in s or "placement" in s or re.search(r"\d+(st|nd|rd|th)", s):
        return "placement"
    if "consol" in s:
        return "consolation"
    if "pool" in s or "bracket" in s:
        return "pool"
    return "unknown"

def tier_mult(tier, config):
    return float(config.get("division_tier_multiplier", {}).get(str(int(tier or 2)), 0.65))

def tournament_type_weight(tournament, config):
    t = tournament.get("type", "unknown")
    return float(config.get("tournament_type_weight", {}).get(t, config.get("tournament_type_weight", {}).get("unknown", 0.7)))

def stage_weight(stage, config):
    return float(config.get("round_stage_weight", {}).get(stage, 0.5))

def normalized_rating(value, min_v=1200, max_v=2100):
    if max_v == min_v:
        return 50
    return max(0, min(100, (value - min_v) / (max_v - min_v) * 100))

def team_baseline_ratings(teams):
    # Baseline if CPI already exists; otherwise use record/gd proxy.
    ratings = {}
    for tid, t in teams.items():
        if "cpi" in t and t["cpi"]:
            ratings[tid] = float(t["cpi"])
        else:
            games = max(1, int(t.get("games", 0) or 0))
            wins = float(t.get("wins", 0) or 0)
            gd = float(t.get("goal_diff_per_game", 0) or 0)
            win_pct = wins / games
            ratings[tid] = 1450 + win_pct * 300 + gd * 7
    return ratings

def game_perspective(game, team_id):
    if game["team_1_id"] == team_id:
        opp = game["team_2_id"]
        gf = game["team_1_score"]
        ga = game["team_2_score"]
    else:
        opp = game["team_1_id"]
        gf = game["team_2_score"]
        ga = game["team_1_score"]
    result = "W" if gf > ga else "L" if ga > gf else "T"
    return opp, gf, ga, result

def compute_path_scores(games, teams, tournaments, config):
    ratings = team_baseline_ratings(teams)
    games_by_team_tournament = defaultdict(list)
    for g in games.values():
        games_by_team_tournament[(g["team_1_id"], g["tournament_id"])].append(g)
        games_by_team_tournament[(g["team_2_id"], g["tournament_id"])].append(g)

    resumes = {}
    team_path_totals = defaultdict(float)
    team_path_counts = Counter()

    for (team_id, tournament_id), glist in games_by_team_tournament.items():
        tournament = tournaments.get(tournament_id, {"id": tournament_id, "name": tournament_id, "type": "unknown", "event_order": 99})
        t_weight = tournament_type_weight(tournament, config)
        wins = losses = ties = 0
        opp_ratings = []
        stage_points = []
        tier_points = []
        best_win = None
        worst_loss = None
        goal_diff = 0
        quality_path_events = []

        for g in glist:
            opp, gf, ga, result = game_perspective(g, team_id)
            opp_rating = ratings.get(opp, 1500)
            opp_ratings.append(opp_rating)
            stage = round_stage(g.get("round", ""))
            s_weight = stage_weight(stage, config)
            tmult = tier_mult(g.get("tier_num"), config)
            tier_points.append(tmult * 100)
            stage_points.append(s_weight * 100)

            gd = max(-10, min(10, gf - ga))
            goal_diff += gd

            if result == "W":
                wins += 1
                q = opp_rating * s_weight * tmult
                if best_win is None or q > best_win["quality"]:
                    best_win = {"opponent": opp, "score": f"{gf}-{ga}", "quality": round(q,1), "stage": stage, "tier": g.get("tier_num")}
                quality_path_events.append((opp_rating - 1500) / 8 + 8 * s_weight * tmult)
            elif result == "L":
                losses += 1
                q = opp_rating * s_weight * tmult
                if worst_loss is None or q < worst_loss["quality"]:
                    worst_loss = {"opponent": opp, "score": f"{gf}-{ga}", "quality": round(q,1), "stage": stage, "tier": g.get("tier_num")}
                # Losing to a strong opponent in a later path is not as damaging as a weak loss.
                quality_path_events.append((opp_rating - 1500) / 12 - 5 * (1.1 - s_weight) - 4 * (1.0 - tmult))
            else:
                ties += 1
                quality_path_events.append((opp_rating - 1500) / 10)

        games_count = len(glist)
        avg_opp = sum(opp_ratings) / games_count if games_count else 1500
        avg_stage = sum(stage_points) / games_count if games_count else 50
        avg_tier = sum(tier_points) / games_count if games_count else 65
        win_pct = wins / games_count if games_count else 0

        # Path advancement proxy: teams that play later-stage/higher-tier games get credit for path strength.
        path_advancement = avg_stage * 0.70 + avg_tier * 0.30

        # Finish context is intentionally weak. Without explicit final placement metadata, use record + path quality as proxy.
        finish_context = (win_pct * 55) + (path_advancement * 0.35) + max(-10, min(10, goal_diff / max(1,games_count))) * 1.0
        finish_context = max(0, min(100, finish_context))

        opponent_quality = normalized_rating(avg_opp, 1250, 2050)

        quality_event_score = 50 + (sum(quality_path_events) / games_count if games_count else 0)
        quality_event_score = max(0, min(100, quality_event_score))

        w = config.get("weights", {})
        raw_score = (
            opponent_quality * w.get("opponent_quality", 0.40) +
            path_advancement * w.get("path_advancement", 0.25) +
            finish_context * w.get("finish_context", 0.15) +
            avg_tier * w.get("division_tier", 0.15) +
            min(100, tournament.get("event_order", 99) * 12) * w.get("recency", 0.05)
        )
        raw_score = raw_score * t_weight
        # Convert to CPI-style bonus/penalty around 50 baseline.
        path_bonus = (raw_score - 50) * 0.70
        path_bonus = max(config["cap"]["min_path_penalty"], min(config["cap"]["max_path_bonus"], path_bonus))

        resume = {
            "team_id": team_id,
            "tournament_id": tournament_id,
            "tournament_name": tournament.get("name", tournament_id),
            "tournament_type": tournament.get("type", "unknown"),
            "games": games_count,
            "record": f"{wins}-{losses}" + (f"-{ties}" if ties else ""),
            "wins": wins,
            "losses": losses,
            "ties": ties,
            "avg_opponent_rating": round(avg_opp, 1),
            "opponent_quality_score": round(opponent_quality, 1),
            "path_advancement_score": round(path_advancement, 1),
            "finish_context_score": round(finish_context, 1),
            "division_tier_score": round(avg_tier, 1),
            "raw_path_score": round(raw_score, 1),
            "path_bonus": round(path_bonus, 1),
            "best_win": best_win,
            "worst_loss": worst_loss,
            "note": "Path score values path quality; final placement is not used as the ranking result."
        }
        resumes[f"{team_id}::{tournament_id}"] = resume
        team_path_totals[team_id] += path_bonus * games_count
        team_path_counts[team_id] += games_count

    team_scores = {}
    for tid in teams:
        if team_path_counts[tid]:
            team_scores[tid] = {
                "team_id": tid,
                "tournament_path_score": round(team_path_totals[tid] / team_path_counts[tid], 1),
                "tournament_games": team_path_counts[tid],
                "tournaments_played": len([k for k in resumes if k.startswith(tid + "::")])
            }
        else:
            team_scores[tid] = {"team_id": tid, "tournament_path_score": 0, "tournament_games": 0, "tournaments_played": 0}

    return team_scores, resumes

def main():
    games_path = first_existing(DATA/"games_engine_v2.json", DATA/"games_relationship_v1.json", DATA/"games_dictionary_v1.json", DATA/"games_identity_v1.json")
    teams_path = first_existing(DATA/"teams_engine_v2.json", DATA/"teams_relationship_v1.json", DATA/"teams_dictionary_v1.json", DATA/"teams_identity_v1.json")
    games = read_json(games_path, {})
    teams = read_json(teams_path, {})
    tournaments = read_json(DATA/"tournament_registry.json", {})
    config = read_json(DATA/"tournament_path_score_config.json", {})

    team_scores, resumes = compute_path_scores(games, teams, tournaments, config)
    (DATA/"tournament_path_scores_v1.json").write_text(json.dumps(team_scores, indent=2), encoding="utf-8")
    (DATA/"team_tournament_resumes_v1.json").write_text(json.dumps(resumes, indent=2), encoding="utf-8")

    ranked = sorted(team_scores.values(), key=lambda x: -x["tournament_path_score"])
    report = {
        "summary": {
            "teams_scored": len(team_scores),
            "tournament_resumes": len(resumes),
            "games_used": len(games),
            "top_path_score": ranked[0]["tournament_path_score"] if ranked else None,
            "bottom_path_score": ranked[-1]["tournament_path_score"] if ranked else None
        },
        "top_50": ranked[:50],
        "method": config
    }
    (QA/"tournament_path_score_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")

    rows = "\n".join(f"<tr><td>{r['team_id']}</td><td>{r['tournament_path_score']}</td><td>{r['tournament_games']}</td><td>{r['tournaments_played']}</td></tr>" for r in ranked[:100])
    html = f"""<!doctype html><html><head><meta charset='utf-8'><title>CPI Tournament Path Score</title>
<style>
body{{font-family:system-ui;margin:30px;background:#f6f8fb;color:#071832}}
.card{{background:white;border:1px solid #dce6f2;border-radius:14px;padding:18px;margin:18px 0;box-shadow:0 10px 30px #0001}}
.metric{{display:inline-block;background:#08264f;color:white;border-radius:12px;padding:16px;margin-right:10px;min-width:150px}}
.metric strong{{display:block;font-size:32px}}
.metric span{{font-size:11px;text-transform:uppercase;color:#dbe7f5;font-weight:900}}
table{{width:100%;border-collapse:collapse}}td,th{{border-bottom:1px solid #dce6f2;padding:10px;text-align:left}}th{{font-size:12px;text-transform:uppercase;color:#607086}}
</style></head><body>
<h1>CPI Tournament Path Score v1</h1>
<p>Path-aware tournament evidence. Final placement is a light supporting signal, not the ranking outcome.</p>
<div class='metric'><strong>{len(team_scores)}</strong><span>Teams Scored</span></div>
<div class='metric'><strong>{len(resumes)}</strong><span>Tournament Resumes</span></div>
<div class='metric'><strong>{len(games)}</strong><span>Games Used</span></div>
<div class='card'><h2>Top Tournament Path Scores</h2><table><thead><tr><th>Team</th><th>Path Score</th><th>Games</th><th>Tournaments</th></tr></thead><tbody>{rows}</tbody></table></div>
</body></html>"""
    (QA/"tournament-path-score-report.html").write_text(html, encoding="utf-8")
    print(json.dumps(report["summary"], indent=2))

if __name__ == "__main__":
    main()
