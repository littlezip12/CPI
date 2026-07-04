#!/usr/bin/env python3
"""
CPI Parser v2 Foundation

Goal:
- Convert raw tournament CSV files into normalized CPI data:
  clubs.json, teams.json, tournaments.json, games.json
- Keep all team aliases and removed teams in data/aliases.json.
- Keep event metadata in data/tournament_registry.json.

Usage:
  python scripts/parse_tournaments_v2.py --input raw_tournaments --output data

Notes:
- This is the new parser foundation. It is additive and safe.
- It does not replace the live ranking engine until we explicitly wire that step.
"""

from pathlib import Path
import argparse
import json
import re
import csv
from collections import defaultdict, Counter

def slugify(v):
    return re.sub(r"[^a-z0-9]+", "-", str(v or "").lower().strip()).strip("-") or "unknown"

def norm(v):
    return re.sub(r"\s+", " ", str(v or "").strip())

def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))

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

def clean_team_name(raw):
    s = norm(raw)
    if not s or s.lower() in {"nan", "none", "break", "#ref!"}:
        return ""
    s = re.sub(r"^(?:Win|Winner|Los|Loss|Loser)\s+Gm\s+#?\d+\s*[-–]\s*", "", s, flags=re.I)
    s = re.sub(r"^(?:W|L)\#?[^-–]+[-–]\s*", "", s, flags=re.I)
    s = re.sub(r"^[A-Z]{1,2}\d+\([^)]*\)\([^)]*\)\s*[-–]\s*", "", s, flags=re.I)
    s = re.sub(r"^[A-Z]{1,2}\d+\([^)]*\)\s*[-–]\s*", "", s, flags=re.I)
    s = re.sub(r"^[A-Z]{1,2}\d+\s*[-–]\s*", "", s, flags=re.I)
    s = re.sub(r"\s+14U\s+Boys?\b", "", s, flags=re.I)
    return norm(s)

def canonical_team(raw, aliases, removed):
    cleaned = clean_team_name(raw)
    if not cleaned:
        return None
    key = slugify(cleaned)
    if key in removed:
        return None
    return aliases.get(key, key)

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

def find_header_rows(rows):
    header_rows = []
    for i, row in enumerate(rows):
        vals = [str(x).strip().lower() for x in row]
        joined = "|".join(vals)
        if ("white" in vals or "white team" in vals) and ("dark" in vals or "dark team" in vals):
            header_rows.append(i)
        elif "team 1" in joined and "team 2" in joined:
            header_rows.append(i)
    return header_rows

def make_table_from_header(rows, header_index, end_index):
    header = [norm(x) or f"unnamed_{i}" for i, x in enumerate(rows[header_index])]
    # dedupe headers
    seen = Counter()
    cols = []
    for h in header:
        seen[h] += 1
        cols.append(h if seen[h] == 1 else f"{h}.{seen[h]-1}")
    table = []
    for row in rows[header_index+1:end_index]:
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

def parse_table_records(records, tournament_id, tournament, aliases, removed, source_file):
    games = []
    if not records:
        return games
    cols = list(records[0].keys())
    white_col = col_find(cols, ["WHITE", "WHITE TEAM", "Team 1", "Home"])
    dark_col = col_find(cols, ["DARK", "DARK TEAM", "Team 2", "Away"])
    score_cols = [c for c in cols if slugify(c) in {"s", "s-1", "score", "score-1", "white-score", "dark-score"}]
    s1_col = col_find(cols, ["S", "Score", "WHITE SCORE", "Score 1"])
    s2_col = col_find(cols, ["S.1", "Score.1", "DARK SCORE", "Score 2"])
    div_col = col_find(cols, ["DIVISION", "Division", "Bracket"])
    round_col = col_find(cols, ["COMMENTS", "Comment", "Round"])
    date_col = col_find(cols, ["DATE", "Date"])
    time_col = col_find(cols, ["TIME", "Time"])
    loc_col = col_find(cols, ["LOCATION", "Location"])

    if not white_col or not dark_col or not s1_col or not s2_col:
        return games

    for idx, rec in enumerate(records):
        division_raw = rec.get(div_col, "") if div_col else ""
        # Strict age/gender filter if division field exists
        if div_col and division_raw:
            d = str(division_raw).lower()
            if "14u" not in d or "boys" not in d:
                continue

        team_id = canonical_team(rec.get(white_col, ""), aliases, removed)
        opp_id = canonical_team(rec.get(dark_col, ""), aliases, removed)
        s1 = score_value(rec.get(s1_col))
        s2 = score_value(rec.get(s2_col))
        if not team_id or not opp_id or s1 is None or s2 is None or team_id == opp_id:
            continue

        tier = division_tier(division_raw, tournament)

        game_base = {
            "tournament_id": tournament_id,
            "source_file": source_file,
            "source_row": idx + 1,
            "division_raw": division_raw,
            "tier_num": tier,
            "round": rec.get(round_col, "") if round_col else "",
            "date": rec.get(date_col, "") if date_col else "",
            "time": rec.get(time_col, "") if time_col else "",
            "location": rec.get(loc_col, "") if loc_col else "",
        }

        # Store one game object with both teams, plus result fields.
        if s1 > s2:
            winner, loser = team_id, opp_id
        elif s2 > s1:
            winner, loser = opp_id, team_id
        else:
            winner = loser = None

        game_id = "game-" + slugify("|".join([tournament_id, team_id, opp_id, str(s1), str(s2), str(idx)]))[:130]
        games.append({
            "id": game_id,
            **game_base,
            "team_1_id": team_id,
            "team_2_id": opp_id,
            "team_1_score": int(s1) if s1 == int(s1) else s1,
            "team_2_score": int(s2) if s2 == int(s2) else s2,
            "winner_team_id": winner,
            "loser_team_id": loser,
        })
    return games

def parse_csv_file(path, registry, aliases, removed):
    tournament_id = infer_tournament_id(path.name, registry)
    tournament = registry.get(tournament_id, {"id": tournament_id, "name": Path(path).stem, "division_mapping": {}})
    rows = read_csv_rows(path)
    header_rows = find_header_rows(rows)
    all_games = []

    if header_rows:
        for pos, header_index in enumerate(header_rows):
            end = header_rows[pos+1] if pos + 1 < len(header_rows) else len(rows)
            records = make_table_from_header(rows, header_index, end)
            all_games.extend(parse_table_records(records, tournament_id, tournament, aliases, removed, path.name))
    else:
        # Assume first row is header.
        records = make_table_from_header(rows, 0, len(rows))
        all_games.extend(parse_table_records(records, tournament_id, tournament, aliases, removed, path.name))

    return tournament_id, all_games

def build_teams(games, clubs):
    teams = {}
    for g in games:
        for tid in [g["team_1_id"], g["team_2_id"]]:
            if tid not in teams:
                base = re.sub(r"-[abcd]$", "", tid)
                team_level = tid.split("-")[-1].upper() if re.search(r"-[abcd]$", tid) else "A"
                teams[tid] = {
                    "id": tid,
                    "name": tid.replace("-", " ").title(),
                    "club_id": base,
                    "team_level": team_level,
                    "age_group": "14U",
                    "gender": "Boys"
                }
    return teams

def run(input_dir, output_dir):
    input_dir = Path(input_dir)
    output_dir = Path(output_dir)
    registry = read_json(output_dir / "tournament_registry.json")
    alias_data = read_json(output_dir / "aliases.json")
    clubs_path = output_dir / "clubs.json"
    clubs = read_json(clubs_path) if clubs_path.exists() else {}

    aliases = alias_data.get("team_aliases", {})
    removed = set(alias_data.get("removed_teams", []))

    all_games = []
    tournament_ids_seen = set()
    for path in sorted(input_dir.glob("*.csv")):
        tid, games = parse_csv_file(path, registry, aliases, removed)
        tournament_ids_seen.add(tid)
        all_games.extend(games)

    # Dedupe
    dedup = {}
    for g in all_games:
        key = (g["tournament_id"], min(g["team_1_id"], g["team_2_id"]), max(g["team_1_id"], g["team_2_id"]), g["team_1_score"], g["team_2_score"], g.get("source_file"), g.get("source_row"))
        dedup[key] = g
    games = list(dedup.values())

    tournaments = {tid: registry.get(tid, {"id": tid, "name": tid}) for tid in sorted(tournament_ids_seen)}
    teams = build_teams(games, clubs)

    (output_dir / "games.json").write_text(json.dumps({g["id"]: g for g in games}, indent=2), encoding="utf-8")
    (output_dir / "teams.json").write_text(json.dumps(teams, indent=2), encoding="utf-8")
    (output_dir / "tournaments.json").write_text(json.dumps(tournaments, indent=2), encoding="utf-8")
    (output_dir / "data_model.json").write_text(json.dumps({
        "version": "2.0-foundation",
        "source": "parse_tournaments_v2.py",
        "counts": {
            "clubs": len(clubs),
            "teams": len(teams),
            "tournaments": len(tournaments),
            "games": len(games)
        }
    }, indent=2), encoding="utf-8")

    print(f"Wrote {len(teams)} teams, {len(tournaments)} tournaments, {len(games)} games.")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", default="raw_tournaments")
    ap.add_argument("--output", default="data")
    args = ap.parse_args()
    run(args.input, args.output)

if __name__ == "__main__":
    main()
