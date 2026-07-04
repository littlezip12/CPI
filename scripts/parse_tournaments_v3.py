#!/usr/bin/env python3
"""
CPI Parser v3 — Registry First

Inputs:
- raw_tournaments/*.csv
- data/team_alias_lookup.json
- data/removed_team_registry.json
- data/tournament_registry.json
- data/team_registry.json

Outputs:
- data/games_v3.json
- data/teams_v3.json
- data/tournaments_v3.json
- qa/parser_v3_report.json

Run:
  python scripts/parse_tournaments_v3.py --input raw_tournaments --output data
"""

from pathlib import Path
import argparse
import csv
import json
import re
from collections import Counter

def slugify(v):
    return re.sub(r"[^a-z0-9]+", "-", str(v or "").lower().strip()).strip("-") or "unknown"

def norm(v):
    return re.sub(r"\s+", " ", str(v or "").strip())

def read_json(path, default=None):
    p = Path(path)
    if not p.exists():
        return default if default is not None else {}
    return json.loads(p.read_text(encoding="utf-8"))

def clean_raw_team(raw):
    s = norm(raw)
    if not s or s.lower() in {"nan", "none", "break", "#ref!", "tbd", "bye"}:
        return ""
    s = re.sub(r"^(?:Win|Winner|Los|Loss|Loser)\s+Gm\s+#?\d+\s*[-–]\s*", "", s, flags=re.I)
    s = re.sub(r"^(?:Win|Winner|Los|Loss|Loser)\s+Game\s+#?\d+\s*[-–]\s*", "", s, flags=re.I)
    s = re.sub(r"^(?:W|L)\#?[^-–]+[-–]\s*", "", s, flags=re.I)
    s = re.sub(r"^[A-Z]{1,2}\d+\([^)]*\)\([^)]*\)\s*[-–]\s*", "", s, flags=re.I)
    s = re.sub(r"^[A-Z]{1,2}\d+\([^)]*\)\s*[-–]\s*", "", s, flags=re.I)
    s = re.sub(r"^[A-Z]{1,2}\d+\s*[-–]\s*", "", s, flags=re.I)
    s = re.sub(r"\s+14U\s+Boys?\b", "", s, flags=re.I)
    # Preserve color names inside parentheses, e.g. 680 A (Blue) -> 680 A Blue
    s = re.sub(r"\s*\((Blue|Red|White|Black|Gold|Silver|Navy)\)\s*$", r" \1", s, flags=re.I)
    return norm(s)

def looks_like_placeholder(raw):
    s = slugify(raw)
    if not s or s == "unknown":
        return True
    if re.match(r"^(win|winner|los|loser|loss|game|gm)-", s):
        return True
    if re.match(r"^[qr]-overall-", s):
        return True
    if re.match(r"^[a-z]\d+$", s):
        return True
    if "overall-1st" in s or "overall-3rd" in s:
        return True
    return False

def non_14u(raw):
    s = slugify(raw)
    return bool(re.search(r"(^|-)12u?($|-)|(^|-)12($|-)|(^|-)10u?($|-)|(^|-)16u?($|-)|(^|-)18u?($|-)", s))

def normalize_team(raw, alias_lookup, removed_registry):
    cleaned = clean_raw_team(raw)
    if not cleaned:
        return None, "empty"
    if looks_like_placeholder(cleaned):
        return None, "placeholder"
    if non_14u(cleaned):
        return None, "non_14u"
    key = slugify(cleaned)
    if key in removed_registry:
        return None, "removed"
    if key in alias_lookup:
        return alias_lookup[key], "registry"
    key2 = re.sub(r"-(blue|red|white|black|gold|silver|navy)$", "", key)
    if key2 in alias_lookup:
        return alias_lookup[key2], "registry_cleaned"
    if re.search(r"-[abcd]$", key):
        return key, "canonical_shape"
    return None, "unknown"

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
    for tid in registry:
        if tid in s:
            return tid
    return slugify(Path(filename).stem)

def score_value(v):
    try:
        if v is None or str(v).strip() == "":
            return None
        return float(v)
    except Exception:
        return None

def division_tier(raw, tournament):
    s = str(raw or "").lower()
    mapping = tournament.get("division_mapping", {})
    for pattern, tier in mapping.items():
        if pattern.lower() in s:
            return tier
    if re.search(r"\bd1\b|division 1|platinum|\baa\b", s):
        return 1
    if re.search(r"\bd2\b|division 2|gold|(^|\s)a($|\s)", s):
        return 2
    if re.search(r"\bd3\b|division 3|silver|(^|\s)b($|\s)", s):
        return 3
    if re.search(r"\bd4\b|division 4|bronze|(^|\s)c($|\s)", s):
        return 4
    return 1 if tournament.get("type") == "jo_qualifier" else 2

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
    table = []
    for row in rows[start+1:end]:
        rec = {}
        for i, col in enumerate(cols):
            rec[col] = row[i] if i < len(row) else ""
        table.append(rec)
    return table

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
    if "girls" in d or "12u" in d or "10u" in d or "16u" in d or "18u" in d:
        return False
    if any(x in d for x in ["10u", "12u", "14u", "16u", "18u"]):
        return "14u" in d and ("boys" in d or "boy" in d or "14ub" in d)
    return True

def parse_records(records, tournament_id, tournament, alias_lookup, removed_registry, source_file):
    games = []
    qa = []
    if not records:
        return games, qa
    cols = list(records[0].keys())
    white_col = col_find(cols, ["WHITE", "WHITE TEAM", "Team 1", "Home"])
    dark_col = col_find(cols, ["DARK", "DARK TEAM", "Team 2", "Away"])
    s1_col = col_find(cols, ["S", "Score", "WHITE SCORE", "Score 1"])
    s2_col = col_find(cols, ["S.1", "Score.1", "DARK SCORE", "Score 2"])
    div_col = col_find(cols, ["DIVISION", "Division", "Bracket"])
    round_col = col_find(cols, ["COMMENTS", "Comment", "Round"])
    date_col = col_find(cols, ["DATE", "Date"])
    time_col = col_find(cols, ["TIME", "Time"])
    loc_col = col_find(cols, ["LOCATION", "Location"])

    if not white_col or not dark_col or not s1_col or not s2_col:
        qa.append({"level": "fail", "type": "missing_required_columns", "file": source_file, "columns": cols})
        return games, qa

    for idx, rec in enumerate(records):
        division_raw = rec.get(div_col, "") if div_col else ""
        if not valid_age_division(division_raw):
            qa.append({"level": "info", "type": "skipped_non_14u_division", "file": source_file, "row": idx+1, "division": division_raw})
            continue

        raw_a = rec.get(white_col, "")
        raw_b = rec.get(dark_col, "")
        team_a, reason_a = normalize_team(raw_a, alias_lookup, removed_registry)
        team_b, reason_b = normalize_team(raw_b, alias_lookup, removed_registry)
        s1 = score_value(rec.get(s1_col))
        s2 = score_value(rec.get(s2_col))

        if not team_a or not team_b:
            qa.append({"level": "review", "type": "skipped_unknown_or_invalid_team", "file": source_file, "row": idx+1, "raw_team_1": raw_a, "raw_team_2": raw_b, "reason_team_1": reason_a, "reason_team_2": reason_b})
            continue
        if team_a == team_b:
            qa.append({"level": "review", "type": "skipped_same_team", "file": source_file, "row": idx+1, "team": team_a})
            continue
        if s1 is None or s2 is None:
            qa.append({"level": "review", "type": "skipped_missing_score", "file": source_file, "row": idx+1})
            continue

        tier = division_tier(division_raw, tournament)
        game_id = "game-" + slugify("|".join([tournament_id, min(team_a, team_b), max(team_a, team_b), str(int(s1) if s1 == int(s1) else s1), str(int(s2) if s2 == int(s2) else s2), str(division_raw), str(rec.get(round_col, "") if round_col else "")]))[:150]

        games.append({
            "id": game_id,
            "tournament_id": tournament_id,
            "source_file": source_file,
            "source_row": idx+1,
            "division_raw": division_raw,
            "tier_num": tier,
            "round": rec.get(round_col, "") if round_col else "",
            "date": rec.get(date_col, "") if date_col else "",
            "time": rec.get(time_col, "") if time_col else "",
            "location": rec.get(loc_col, "") if loc_col else "",
            "team_1_id": team_a,
            "team_2_id": team_b,
            "team_1_raw": raw_a,
            "team_2_raw": raw_b,
            "team_1_score": int(s1) if s1 == int(s1) else s1,
            "team_2_score": int(s2) if s2 == int(s2) else s2,
            "winner_team_id": team_a if s1 > s2 else team_b if s2 > s1 else None,
            "loser_team_id": team_b if s1 > s2 else team_a if s2 > s1 else None
        })
    return games, qa

def parse_file(path, registry, alias_lookup, removed_registry):
    tournament_id = infer_tournament_id(path.name, registry)
    tournament = registry.get(tournament_id, {"id": tournament_id, "name": path.stem, "division_mapping": {}})
    rows = read_csv_rows(path)
    hrs = header_rows(rows)
    all_games, all_qa = [], []
    if hrs:
        for pos, h in enumerate(hrs):
            end = hrs[pos+1] if pos+1 < len(hrs) else len(rows)
            records = table_from_header(rows, h, end)
            games, qa = parse_records(records, tournament_id, tournament, alias_lookup, removed_registry, path.name)
            all_games.extend(games); all_qa.extend(qa)
    else:
        records = table_from_header(rows, 0, len(rows))
        games, qa = parse_records(records, tournament_id, tournament, alias_lookup, removed_registry, path.name)
        all_games.extend(games); all_qa.extend(qa)
    return tournament_id, all_games, all_qa

def team_name(team_id):
    special = {"sd":"SD","la":"LA","sj":"SJ","cc":"CC","ocwpc":"OCWPC","lawpc":"LAWPC","cvu":"CVU","cdm":"CDM","ciu":"CIU","ovac":"OVAC","socal":"SOCAL","skip":"SKIP"}
    return " ".join(special.get(p, p.upper() if p.isdigit() else p.capitalize()) for p in team_id.split("-"))

def build_teams(games, registry):
    counts = Counter()
    for g in games:
        counts[g["team_1_id"]] += 1
        counts[g["team_2_id"]] += 1
    teams = {}
    for tid, count in counts.items():
        entry = registry.get(tid, {})
        club = entry.get("club_id") or re.sub(r"-[abcd]$", "", tid)
        level = entry.get("team_level") or (tid.rsplit("-", 1)[-1].upper() if re.search(r"-[abcd]$", tid) else "A")
        teams[tid] = {"id": tid, "name": entry.get("name") or team_name(tid), "club_id": club, "team_level": level, "age_group": "14U", "gender": "Boys", "games": count, "ranking_eligible": count >= 5}
    return teams

def run(input_dir, output_dir):
    input_dir = Path(input_dir)
    output_dir = Path(output_dir)
    qa_dir = output_dir.parent / "qa"
    qa_dir.mkdir(parents=True, exist_ok=True)

    registry = read_json(output_dir / "tournament_registry.json")
    alias_lookup = read_json(output_dir / "team_alias_lookup.json")
    removed_registry = read_json(output_dir / "removed_team_registry.json")
    team_registry = read_json(output_dir / "team_registry.json")

    all_games, qa = [], []
    games_by_source, games_by_tournament = Counter(), Counter()

    for path in sorted(input_dir.glob("*.csv")):
        tid, games, file_qa = parse_file(path, registry, alias_lookup, removed_registry)
        all_games.extend(games); qa.extend(file_qa)
        games_by_source[path.name] += len(games)
        games_by_tournament[tid] += len(games)

    dedup = {}
    duplicate_count = 0
    for g in all_games:
        if g["id"] in dedup:
            duplicate_count += 1
        dedup[g["id"]] = g
    games = list(dedup.values())
    teams = build_teams(games, team_registry)
    tournaments = {tid: {**registry.get(tid, {"id": tid, "name": tid}), "games_parsed": games_by_tournament[tid]} for tid in games_by_tournament}

    output = {"summary": {"raw_files": len(list(input_dir.glob("*.csv"))), "games_before_dedupe": len(all_games), "games_after_dedupe": len(games), "duplicates_removed": duplicate_count, "teams": len(teams), "ranking_eligible_teams_5plus": sum(1 for t in teams.values() if t["ranking_eligible"]), "tournaments": len(tournaments), "qa_items": len(qa)}, "games_by_tournament": dict(games_by_tournament), "games_by_source": dict(games_by_source), "qa_preview": qa[:500]}

    (output_dir / "games_v3.json").write_text(json.dumps({g["id"]: g for g in games}, indent=2), encoding="utf-8")
    (output_dir / "teams_v3.json").write_text(json.dumps(teams, indent=2), encoding="utf-8")
    (output_dir / "tournaments_v3.json").write_text(json.dumps(tournaments, indent=2), encoding="utf-8")
    (qa_dir / "parser_v3_report.json").write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(json.dumps(output["summary"], indent=2))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", default="raw_tournaments")
    ap.add_argument("--output", default="data")
    args = ap.parse_args()
    run(args.input, args.output)

if __name__ == "__main__":
    main()
