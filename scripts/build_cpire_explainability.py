#!/usr/bin/env python3
"""
CPIRE Explainability v1

Builds:
- team explanation records
- comparison records
- public ranking principles page data

Inputs:
- data/cpi_evidence_rankings_v1.json
- data/cpi_team_evidence_v1.json
- data/games_relationship_v1.json / games_dictionary_v1.json
- data/cpire_metadata.json

Outputs:
- data/cpire_team_explanations_v1.json
- data/cpire_team_comparisons_v1.json
- qa/cpire-explainability-report.html
"""

from pathlib import Path
import json, re, math
from collections import defaultdict

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

def grade(value, thresholds):
    for label, cutoff in thresholds:
        if value >= cutoff:
            return label
    return thresholds[-1][0]

def stars(value, max_value=100):
    n = max(1, min(5, round((value / max_value) * 5)))
    return "★" * n + "☆" * (5-n)

def normalize_metric(value, center=0, spread=30):
    return max(0, min(100, 50 + (value-center)/spread*50))

def game_lookup(games):
    out = defaultdict(list)
    for g in games.values():
        out[g.get("team_1_id")].append(g)
        out[g.get("team_2_id")].append(g)
    return out

def perspective(g, tid):
    if g.get("team_1_id") == tid:
        opp = g.get("team_2_id")
        gf, ga = g.get("team_1_score"), g.get("team_2_score")
    else:
        opp = g.get("team_1_id")
        gf, ga = g.get("team_2_score"), g.get("team_1_score")
    res = "W" if gf > ga else "L" if ga > gf else "T"
    return opp, gf, ga, res

def build_explanations():
    meta = read_json(DATA/"cpire_metadata.json")
    rankings = read_json(DATA/"cpi_evidence_rankings_v1.json", [])
    evidence = read_json(DATA/"cpi_team_evidence_v1.json", {})
    games = read_json(first_existing(DATA/"games_relationship_v1.json", DATA/"games_dictionary_v1.json", DATA/"games_engine_v2.json"), {})
    by_team = game_lookup(games)
    rank_by_team = {r["team_id"]: r.get("rank") for r in rankings}

    explanations = {}
    for tid, e in evidence.items():
        rank = rank_by_team.get(tid)
        schedule_score = normalize_metric(e.get("schedule_context", 0), 0, 35)
        evidence_score = normalize_metric(e.get("evidence_value", 0), 0, 25)
        path_score = normalize_metric(e.get("tournament_path_score", 0), 0, 30)
        recent_score = normalize_metric(e.get("recent_form", 0), 0, 25)
        confidence = e.get("confidence", 0)

        strengths = []
        concerns = []

        if schedule_score >= 70:
            strengths.append("Played a strong schedule relative to the field.")
        elif schedule_score <= 40:
            concerns.append("Schedule strength is limited compared with higher-ranked teams.")

        if evidence_score >= 70:
            strengths.append("Produced multiple high-value results against strong opponents.")
        elif evidence_score <= 40:
            concerns.append("Few high-value results are currently present in the dataset.")

        if path_score >= 70:
            strengths.append("Tournament path evidence supports the rating.")
        elif path_score <= 40:
            concerns.append("Tournament path evidence is limited or mixed.")

        if recent_score >= 70:
            strengths.append("Recent form is trending positively.")
        elif recent_score <= 40:
            concerns.append("Recent form is weaker than the overall rating.")

        if confidence >= 85:
            strengths.append("High confidence rating based on broad game coverage.")
        elif confidence < 65:
            concerns.append("Limited confidence because the team has fewer games, tournaments, or connected opponents.")

        # Pull best high-value results and negative results from evidence model.
        high_value = e.get("high_value_results", [])[:5]
        negative = e.get("negative_results", [])[:5]

        # Recent games
        recent = []
        for g in by_team.get(tid, [])[-8:]:
            opp, gf, ga, res = perspective(g, tid)
            recent.append({
                "opponent": opp,
                "result": res,
                "score": f"{gf}-{ga}",
                "tournament_id": g.get("tournament_id")
            })

        explanation = {
            "team_id": tid,
            "team": e.get("team", tid),
            "rank": rank,
            "cpi": e.get("cpi"),
            "record": e.get("record"),
            "confidence": confidence,
            "confidence_label": e.get("data_confidence_label"),
            "headline": f"CPIRE estimates {e.get('team', tid)} at {e.get('cpi')} CPI" + (f" and rank #{rank}." if rank else "."),
            "why_ranked_here": {
                "network_rating": {
                    "value": e.get("network_rating"),
                    "description": "Strength estimate from the connected result graph."
                },
                "evidence_value": {
                    "value": e.get("evidence_value"),
                    "score": round(evidence_score),
                    "stars": stars(evidence_score),
                    "description": "High-value results, including strong wins and informative close losses."
                },
                "schedule_context": {
                    "value": e.get("schedule_context"),
                    "score": round(schedule_score),
                    "stars": stars(schedule_score),
                    "description": "Opponent strength and connectedness, not simply number of opportunities."
                },
                "tournament_path": {
                    "value": e.get("tournament_path_score"),
                    "score": round(path_score),
                    "stars": stars(path_score),
                    "description": "Path-aware tournament signal that supports the rating without replacing it."
                },
                "recent_form": {
                    "value": e.get("recent_form"),
                    "score": round(recent_score),
                    "stars": stars(recent_score),
                    "description": "Recent evidence, weighted modestly."
                }
            },
            "strengths": strengths[:5],
            "concerns": concerns[:5],
            "high_value_results": high_value,
            "negative_results": negative,
            "recent_games": recent,
            "public_explanation": {
                "plain_english": "CPIRE estimates team strength using every game as evidence. This team's rating is driven most by its connected results, opponent strength, tournament path context, and confidence level.",
                "not_a_resume": "This is not a trophy or resume score. It is a strength estimate."
            }
        }
        explanations[tid] = explanation

    (DATA/"cpire_team_explanations_v1.json").write_text(json.dumps(explanations, indent=2), encoding="utf-8")

    # Pairwise comparison base for top 100 only to keep size manageable.
    comparisons = {}
    top_ids = [r["team_id"] for r in rankings[:100]]
    for i, a in enumerate(top_ids):
        for b in top_ids[i+1:]:
            ea, eb = evidence.get(a, {}), evidence.get(b, {})
            if not ea or not eb:
                continue
            diff = ea.get("cpi", 1500) - eb.get("cpi", 1500)
            prob_a = 1 / (1 + 10 ** (-diff / 400))
            comparisons[f"{a}__vs__{b}"] = {
                "team_a": a,
                "team_b": b,
                "team_a_name": ea.get("team", a),
                "team_b_name": eb.get("team", b),
                "team_a_win_probability": round(prob_a * 100, 1),
                "team_b_win_probability": round((1-prob_a) * 100, 1),
                "cpi_diff": round(diff, 1),
                "metrics": {
                    "cpi": [ea.get("cpi"), eb.get("cpi")],
                    "network_rating": [ea.get("network_rating"), eb.get("network_rating")],
                    "evidence_value": [ea.get("evidence_value"), eb.get("evidence_value")],
                    "schedule_context": [ea.get("schedule_context"), eb.get("schedule_context")],
                    "tournament_path_score": [ea.get("tournament_path_score"), eb.get("tournament_path_score")],
                    "confidence": [ea.get("confidence"), eb.get("confidence")],
                    "record": [ea.get("record"), eb.get("record")]
                },
                "plain_english": f"CPIRE would currently lean {ea.get('team', a) if prob_a >= .5 else eb.get('team', b)} on a neutral site, but this is an estimate rather than a prediction guarantee."
            }

    (DATA/"cpire_team_comparisons_v1.json").write_text(json.dumps(comparisons, indent=2), encoding="utf-8")

    report = {
        "summary": {
            "teams_explained": len(explanations),
            "ranked_teams": len(rankings),
            "comparison_pairs": len(comparisons),
            "engine_name": meta.get("name", "CPIRE"),
            "engine_version": meta.get("version")
        },
        "sample_top_10": [explanations[r["team_id"]] for r in rankings[:10] if r["team_id"] in explanations]
    }
    (QA/"cpire_explainability_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")

    rows = ""
    for r in rankings[:30]:
        e = explanations.get(r["team_id"], {})
        rows += f"<tr><td>#{r.get('rank')}</td><td>{e.get('team')}</td><td>{e.get('cpi')}</td><td>{e.get('record')}</td><td>{e.get('confidence')}%</td><td>{'<br>'.join(e.get('strengths', [])[:2])}</td><td>{'<br>'.join(e.get('concerns', [])[:2])}</td></tr>"

    html = f"""<!doctype html><html><head><meta charset="utf-8"><title>CPIRE Explainability v1</title>
<style>
body{{font-family:system-ui;margin:30px;background:#f6f8fb;color:#071832}}
.card{{background:#fff;border:1px solid #dce6f2;border-radius:14px;padding:18px;margin:18px 0;box-shadow:0 10px 30px #0001}}
.metric{{display:inline-block;background:#08264f;color:white;border-radius:12px;padding:16px;margin:0 10px 10px 0;min-width:150px}}
.metric strong{{display:block;font-size:32px}}.metric span{{font-size:11px;text-transform:uppercase;color:#dbe7f5;font-weight:900}}
table{{width:100%;border-collapse:collapse}}td,th{{border-bottom:1px solid #dce6f2;padding:10px;text-align:left;vertical-align:top}}th{{font-size:12px;text-transform:uppercase;color:#607086}}
</style></head><body>
<h1>CPIRE Explainability v1</h1>
<p><strong>CPI Rating Engine:</strong> explains why teams are ranked where they are, without turning the ranking into a simple resume score.</p>
<div class="metric"><strong>{len(explanations)}</strong><span>Teams Explained</span></div>
<div class="metric"><strong>{len(rankings)}</strong><span>Ranked Teams</span></div>
<div class="metric"><strong>{len(comparisons)}</strong><span>Comparison Pairs</span></div>
<div class="card"><h2>Top 30 Explanation Preview</h2><table><thead><tr><th>Rank</th><th>Team</th><th>CPI</th><th>Record</th><th>Confidence</th><th>Strengths</th><th>Concerns</th></tr></thead><tbody>{rows}</tbody></table></div>
</body></html>"""
    (QA/"cpire-explainability-report.html").write_text(html, encoding="utf-8")

    print(json.dumps(report["summary"], indent=2))

if __name__ == "__main__":
    build_explanations()
