#!/usr/bin/env python3
"""
WPI Engine v2 Build Pipeline

Run from repo root:
  python build/build.py

This pipeline is intentionally safe:
- It writes v2 outputs.
- It does not overwrite the current live rankings unless publish_to_live=true in config.
"""

from pathlib import Path
import json
import re
import csv
import math
from collections import Counter, defaultdict
from datetime import datetime

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "build"
DATA = ROOT / "data"
QA = ROOT / "qa"
RAW = ROOT / "raw_tournaments"

def slugify(v):
    return re.sub(r"[^a-z0-9]+", "-", str(v or "").lower().strip()).strip("-") or "unknown"

def norm(v):
    return re.sub(r"\s+", " ", str(v or "").strip())

def read_json(path, default=None):
    p = Path(path)
    if not p.exists():
        return default if default is not None else {}
    return json.loads(p.read_text(encoding="utf-8"))

def write_json(path, data):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(data, indent=2), encoding="utf-8")

def load_config():
    return read_json(BUILD / "cpi_engine_config.json", {})

def validate_registries():
    required = [
        DATA / "tournament_registry.json",
        DATA / "team_alias_lookup.json",
        DATA / "team_registry.json",
        DATA / "tournament_import_normalizer_rules.json",
    ]
    warnings = []
    for p in required:
        if not p.exists():
            warnings.append({"level":"fail","type":"missing_registry","file":str(p.relative_to(ROOT))})
    return warnings

def clean_raw_team(raw, rules):
    original = norm(raw)
    s = original
    if not s or s.lower() in {"nan", "none", "break", "#ref!", "tbd", "bye"}:
        return ""
    changed = True
    while changed:
        changed = False
        for pat in rules.get("strip_prefix_patterns", []):
            ns = re.sub(pat, "", s, flags=re.I).strip()
            if ns != s:
                s = ns
                changed = True
    s = re.sub(r"\s+14U\s+Boys?\b", "", s, flags=re.I)
    s = re.sub(r"\s+14U\b", "", s, flags=re.I)
    s = re.sub(r"\s*\((Blue|Red|White|Black|Gold|Silver|Navy)\)\s*$", r" \1", s, flags=re.I)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def expand_abbrev(name, rules):
    s = norm(name)
    slug = slugify(s)
    parts = slug.split("-")
    level = ""
    if parts and parts[-1] in {"a","b","c","d"}:
        level = parts[-1].upper()
        base_slug = "-".join(parts[:-1])
    else:
        base_slug = slug
    abbr = rules.get("abbreviations", {})
    for key in sorted(abbr.keys(), key=lambda x: -len(x)):
        key_slug = slugify(key)
        if base_slug == key_slug or base_slug.startswith(key_slug + "-"):
            remainder = base_slug[len(key_slug):].strip("-").replace("-", " ")
            return norm(" ".join([abbr[key], remainder, level]).strip())
    return s

def normalize_name(raw, rules):
    cleaned = clean_raw_team(raw, rules)
    return expand_abbrev(cleaned, rules)

def infer_tournament_id(filename, registry):
    s = slugify(filename)
    if "super" in s or "futures" in s:
        return "futures-super-finals"
    if "kap7" in s:
        return "kap7"
    if "turbo" in s:
        return "turbo-oc-cup"
    if "county" in s:
        return "san-diego-county-cup"
    if "cca" in s:
        return "cca-jo-qualifier"
    if "sopac" in s:
        return "sopac-jo-qualifier"
    if "norcal" in s:
        return "norcal-jo-qualifier"
    return slugify(Path(filename).stem)

def score_value(v):
    try:
        if v is None or str(v).strip() == "":
            return None
        return float(v)
    except Exception:
        return None

def read_csv_rows(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.reader(f))

def is_header(row):
    vals = [str(x).strip().lower() for x in row]
    joined = "|".join(vals)
    return (("white" in vals or "white team" in vals) and ("dark" in vals or "dark team" in vals)) or ("team 1" in joined and "team 2" in joined)

def header_rows(rows):
    return [i for i, r in enumerate(rows) if is_header(r)]

def table_from_header(rows, start, end):
    header = [norm(x) or f"unnamed_{i}" for i, x in enumerate(rows[start])]
    seen = Counter()
    cols = []
    for h in header:
        seen[h] += 1
        cols.append(h if seen[h] == 1 else f"{h}.{seen[h]-1}")
    return [{col: (row[i] if i < len(row) else "") for i, col in enumerate(cols)} for row in rows[start+1:end]]

def col_find(cols, candidates):
    clean = {slugify(c): c for c in cols}
    for cand in candidates:
        if slugify(cand) in clean:
            return clean[slugify(cand)]
    return None

def valid_age_division(division_raw):
    d = str(division_raw or "").lower()
    if not d:
        return True
    if any(x in d for x in ["girls", "12u", "10u", "16u", "18u"]):
        return False
    if any(x in d for x in ["10u", "12u", "14u", "16u", "18u"]):
        return "14u" in d and ("boys" in d or "boy" in d or "14ub" in d)
    return True

def division_tier(raw, tournament):
    s = str(raw or "").lower()
    for pattern, tier in tournament.get("division_mapping", {}).items():
        if pattern.lower() in s:
            return tier
    if re.search(r"\bd1\b|division 1|platinum|\baa\b", s):
        return 1
    if re.search(r"\bd2\b|division 2|gold|(^|\s)a($|\s)", s):
        return 2
    if re.search(r"\bd3\b|division 3|silver|(^|\s)b($|\s)", s):
        return 3
    return 1 if tournament.get("type") == "jo_qualifier" else 2

def resolve_team(raw, alias_lookup, rules):
    normalized = normalize_name(raw, rules)
    slug = slugify(normalized)
    if slug in alias_lookup:
        return alias_lookup[slug], normalized, "alias"
    # if canonical-looking, keep
    if re.search(r"-[abcd]$", slug):
        return slug, normalized, "canonical_shape"
    return None, normalized, "unresolved"

def parse_tournaments():
    registry = read_json(DATA / "tournament_registry.json")
    alias_lookup = read_json(DATA / "team_alias_lookup_with_tournament_normalizer.json") or read_json(DATA / "team_alias_lookup.json")
    rules = read_json(DATA / "tournament_import_normalizer_rules.json")
    qa = []
    games = {}
    raw_name_map = {}
    by_tournament = Counter()
    by_source = Counter()

    for path in sorted(RAW.glob("*.csv")):
        tid = infer_tournament_id(path.name, registry)
        tournament = registry.get(tid, {"id": tid, "name": path.stem, "division_mapping": {}})
        rows = read_csv_rows(path)
        hrs = header_rows(rows)
        tables = []
        if hrs:
            for pos, h in enumerate(hrs):
                end = hrs[pos+1] if pos+1 < len(hrs) else len(rows)
                tables.append(table_from_header(rows, h, end))
        else:
            tables.append(table_from_header(rows, 0, len(rows)))

        for records in tables:
            if not records:
                continue
            cols = list(records[0].keys())
            white = col_find(cols, ["WHITE", "WHITE TEAM", "Team 1", "Home"])
            dark = col_find(cols, ["DARK", "DARK TEAM", "Team 2", "Away"])
            s1c = col_find(cols, ["S", "Score", "WHITE SCORE", "Score 1"])
            s2c = col_find(cols, ["S.1", "Score.1", "DARK SCORE", "Score 2"])
            divc = col_find(cols, ["DIVISION", "Division", "Bracket"])
            roundc = col_find(cols, ["COMMENTS", "Comment", "Round"])
            datec = col_find(cols, ["DATE", "Date"])
            timec = col_find(cols, ["TIME", "Time"])
            locc = col_find(cols, ["LOCATION", "Location"])

            if not white or not dark or not s1c or not s2c:
                qa.append({"level":"fail","type":"missing_columns","file":path.name,"columns":cols})
                continue

            for idx, rec in enumerate(records):
                div = rec.get(divc, "") if divc else ""
                if not valid_age_division(div):
                    continue
                raw_a, raw_b = rec.get(white,""), rec.get(dark,"")
                a, norm_a, reason_a = resolve_team(raw_a, alias_lookup, rules)
                b, norm_b, reason_b = resolve_team(raw_b, alias_lookup, rules)
                raw_name_map[raw_a] = {"normalized": norm_a, "resolved": a, "reason": reason_a}
                raw_name_map[raw_b] = {"normalized": norm_b, "resolved": b, "reason": reason_b}
                s1, s2 = score_value(rec.get(s1c)), score_value(rec.get(s2c))
                if not a or not b:
                    qa.append({"level":"review","type":"unresolved_team","file":path.name,"row":idx+1,"raw_a":raw_a,"normalized_a":norm_a,"reason_a":reason_a,"raw_b":raw_b,"normalized_b":norm_b,"reason_b":reason_b})
                    continue
                if a == b:
                    qa.append({"level":"review","type":"same_team","file":path.name,"row":idx+1,"team":a})
                    continue
                if s1 is None or s2 is None:
                    qa.append({"level":"review","type":"missing_score","file":path.name,"row":idx+1})
                    continue
                tier = division_tier(div, tournament)
                gid = "game-" + slugify("|".join([tid, min(a,b), max(a,b), str(s1), str(s2), str(div), str(rec.get(roundc,"") if roundc else "")]))[:150]
                games[gid] = {
                    "id": gid,
                    "tournament_id": tid,
                    "source_file": path.name,
                    "source_row": idx+1,
                    "division_raw": div,
                    "tier_num": tier,
                    "round": rec.get(roundc, "") if roundc else "",
                    "date": rec.get(datec, "") if datec else "",
                    "time": rec.get(timec, "") if timec else "",
                    "location": rec.get(locc, "") if locc else "",
                    "team_1_id": a,
                    "team_2_id": b,
                    "team_1_raw": raw_a,
                    "team_2_raw": raw_b,
                    "team_1_normalized": norm_a,
                    "team_2_normalized": norm_b,
                    "team_1_score": int(s1) if s1 == int(s1) else s1,
                    "team_2_score": int(s2) if s2 == int(s2) else s2,
                    "winner_team_id": a if s1 > s2 else b if s2 > s1 else None,
                    "loser_team_id": b if s1 > s2 else a if s2 > s1 else None
                }
                by_tournament[tid] += 1
                by_source[path.name] += 1

    write_json(DATA / "games_engine_v2.json", games)
    write_json(QA / "raw_name_resolution_v2.json", raw_name_map)
    return games, qa, by_tournament, by_source

def build_teams(games):
    team_registry = read_json(DATA / "team_registry.json")
    counts = Counter()
    wins = Counter()
    losses = Counter()
    gf = Counter()
    ga = Counter()
    tournaments = defaultdict(set)
    opponents = defaultdict(set)
    tiers = defaultdict(Counter)

    for g in games.values():
        a, b = g["team_1_id"], g["team_2_id"]
        s1, s2 = g["team_1_score"], g["team_2_score"]
        counts[a] += 1; counts[b] += 1
        gf[a] += s1; ga[a] += s2
        gf[b] += s2; ga[b] += s1
        tournaments[a].add(g["tournament_id"]); tournaments[b].add(g["tournament_id"])
        opponents[a].add(b); opponents[b].add(a)
        tiers[a][g.get("tier_num") or 2] += 1
        tiers[b][g.get("tier_num") or 2] += 1
        if s1 > s2:
            wins[a] += 1; losses[b] += 1
        elif s2 > s1:
            wins[b] += 1; losses[a] += 1

    teams = {}
    for tid, game_count in counts.items():
        reg = team_registry.get(tid, {})
        club_id = reg.get("club_id") or re.sub(r"-[abcd]$", "", tid)
        level = reg.get("team_level") or (tid.rsplit("-",1)[-1].upper() if re.search(r"-[abcd]$", tid) else "A")
        confidence = "High" if game_count >= 12 else "Medium" if game_count >= 6 else "Limited"
        teams[tid] = {
            "id": tid,
            "name": reg.get("name") or tid.replace("-", " ").title(),
            "club_id": club_id,
            "team_level": level,
            "games": game_count,
            "wins": wins[tid],
            "losses": losses[tid],
            "record": f"{wins[tid]}-{losses[tid]}",
            "goals_for": gf[tid],
            "goals_against": ga[tid],
            "goal_diff_per_game": round((gf[tid]-ga[tid])/game_count, 2) if game_count else 0,
            "tournaments": sorted(tournaments[tid]),
            "unique_opponents": len(opponents[tid]),
            "primary_tier": tiers[tid].most_common(1)[0][0] if tiers[tid] else 2,
            "ranking_eligible": game_count >= load_config().get("ranking", {}).get("min_games_ranked", 4),
            "data_confidence": confidence,
            "age_group": "14U",
            "gender": "Boys"
        }
    write_json(DATA / "teams_engine_v2.json", teams)
    return teams

def expected(ra, rb):
    return 1 / (1 + 10 ** ((rb - ra) / 400))

def margin_mult(diff):
    return min(1.25, 1 + math.log(max(1, abs(diff))) / 6.5)

def tier_weight(tier):
    return {1:1.00, 2:0.72, 3:0.45, 4:0.30}.get(int(tier or 2), 0.65)

def build_rankings(games, teams):
    config = load_config()
    tournament_registry = read_json(DATA / "tournament_registry.json")
    ratings = {tid: config["ranking"]["base_rating"] for tid in teams}
    played = Counter()
    schedule = defaultdict(list)
    quality_wins = defaultdict(list)
    quality_losses = defaultdict(list)

    chronological = sorted(games.values(), key=lambda g: (tournament_registry.get(g.get("tournament_id"), {}).get("event_order", 99), g.get("source_file",""), g.get("source_row",0)))

    for g in chronological:
        a,b = g["team_1_id"], g["team_2_id"]
        if a not in ratings or b not in ratings:
            continue
        s1,s2 = g["team_1_score"], g["team_2_score"]
        tour = tournament_registry.get(g["tournament_id"], {})
        weight = float(tour.get("weight", 0.8)) * tier_weight(g.get("tier_num"))
        ea = expected(ratings[a], ratings[b])
        aa = 1 if s1 > s2 else 0 if s2 > s1 else 0.5
        k = 16 * weight * margin_mult(s1 - s2)
        old_a, old_b = ratings[a], ratings[b]
        ratings[a] += k * (aa - ea)
        ratings[b] += k * ((1-aa) - (1-ea))
        played[a] += 1; played[b] += 1
        schedule[a].append(b); schedule[b].append(a)

    rows = []
    for tid, t in teams.items():
        if not t.get("ranking_eligible"):
            continue
        opp_avg = sum(ratings[o] for o in schedule[tid]) / len(schedule[tid]) if schedule[tid] else 1500
        cpi = ratings[tid] + (opp_avg - 1500) * 0.22 + t.get("goal_diff_per_game", 0) * 1.5
        rows.append({
            "team_id": tid,
            "team": t["name"],
            "club_id": t["club_id"],
            "team_level": t["team_level"],
            "cpi": round(cpi, 1),
            "record": t["record"],
            "games": t["games"],
            "wins": t["wins"],
            "losses": t["losses"],
            "schedule_strength": round(opp_avg - 1500, 1),
            "goal_diff_per_game": t["goal_diff_per_game"],
            "primary_tier": t["primary_tier"],
            "data_confidence": t["data_confidence"],
            "tournaments": t["tournaments"],
            "unique_opponents": t["unique_opponents"]
        })

    rows.sort(key=lambda r: (-r["cpi"], -r["games"], r["team"]))
    rows = rows[:config["ranking"].get("max_ranked_teams", 100)]
    for i,r in enumerate(rows,1):
        r["rank"] = i
    write_json(DATA / "rankings_engine_v2.json", rows)
    return rows

def validate_outputs(games, teams, rankings, parse_qa, by_tournament, by_source):
    warnings = list(parse_qa)
    for tid, t in teams.items():
        if t["games"] < load_config()["ranking"]["min_games_manual_review"]:
            warnings.append({"level":"review","type":"low_game_team","team_id":tid,"games":t["games"]})
    for r in rankings:
        if r["rank"] <= 10 and r["primary_tier"] > 1:
            warnings.append({"level":"fail","type":"non_top_tier_top_10","team_id":r["team_id"],"rank":r["rank"],"primary_tier":r["primary_tier"]})
        if r["rank"] <= 15 and r["primary_tier"] >= 3:
            warnings.append({"level":"fail","type":"tier3_top_15","team_id":r["team_id"],"rank":r["rank"],"primary_tier":r["primary_tier"]})

    report = {
        "build_timestamp": datetime.now().isoformat(timespec="seconds"),
        "summary": {
            "games": len(games),
            "teams": len(teams),
            "ranking_eligible_teams": sum(1 for t in teams.values() if t.get("ranking_eligible")),
            "ranked_teams": len(rankings),
            "tournaments": len(by_tournament),
            "qa_items": len(warnings),
            "failures": sum(1 for w in warnings if w.get("level") == "fail"),
            "reviews": sum(1 for w in warnings if w.get("level") == "review")
        },
        "games_by_tournament": dict(by_tournament),
        "games_by_source": dict(by_source),
        "qa_items": warnings[:1000]
    }
    write_json(QA / "engine_v2_build_report.json", report)
    return report

def build_qa_dashboard(report):
    rows = "\n".join(f"<tr><td>{k}</td><td>{v}</td></tr>" for k,v in report.get("games_by_tournament",{}).items())
    qa_rows = "\n".join(f"<tr><td>{q.get('level','')}</td><td>{q.get('type','')}</td><td><code>{json.dumps(q)[:300]}</code></td></tr>" for q in report.get("qa_items",[])[:250])
    s = report["summary"]
    html = f"""<!doctype html><html><head><meta charset='utf-8'><title>WPI Engine v2 QA</title>
<style>
body{{font-family:system-ui;margin:30px;background:#f6f8fb;color:#071832}}
.grid{{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}}
.metric{{background:#08264f;color:white;border-radius:12px;padding:16px}}
.metric strong{{display:block;font-size:32px}}.metric span{{font-size:11px;text-transform:uppercase;color:#dbe7f5;font-weight:900}}
.card{{background:white;border:1px solid #dce6f2;border-radius:14px;padding:18px;margin:18px 0;box-shadow:0 10px 30px #0001}}
table{{width:100%;border-collapse:collapse}}td,th{{border-bottom:1px solid #dce6f2;padding:10px;text-align:left}}th{{font-size:12px;text-transform:uppercase;color:#607086}}code{{white-space:normal}}
</style></head><body>
<h1>WPI Engine v2 QA Dashboard</h1>
<p>Build: {report.get('build_timestamp')}</p>
<div class='grid'>
<div class='metric'><strong>{s['games']}</strong><span>Games</span></div>
<div class='metric'><strong>{s['teams']}</strong><span>Teams</span></div>
<div class='metric'><strong>{s['ranking_eligible_teams']}</strong><span>Eligible</span></div>
<div class='metric'><strong>{s['ranked_teams']}</strong><span>Ranked</span></div>
<div class='metric'><strong>{s['failures']}</strong><span>Failures</span></div>
<div class='metric'><strong>{s['reviews']}</strong><span>Reviews</span></div>
</div>
<div class='card'><h2>Games by Tournament</h2><table><thead><tr><th>Tournament</th><th>Games</th></tr></thead><tbody>{rows}</tbody></table></div>
<div class='card'><h2>QA Items</h2><table><thead><tr><th>Level</th><th>Type</th><th>Details</th></tr></thead><tbody>{qa_rows}</tbody></table></div>
</body></html>"""
    (QA / "engine-v2-dashboard.html").write_text(html, encoding="utf-8")

def main():
    DATA.mkdir(exist_ok=True)
    QA.mkdir(exist_ok=True)
    warnings = validate_registries()
    games, parse_qa, by_tournament, by_source = parse_tournaments()
    teams = build_teams(games)
    rankings = build_rankings(games, teams)
    report = validate_outputs(games, teams, rankings, warnings + parse_qa, by_tournament, by_source)
    build_qa_dashboard(report)
    print(json.dumps(report["summary"], indent=2))

if __name__ == "__main__":
    main()
