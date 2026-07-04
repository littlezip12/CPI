#!/usr/bin/env python3
"""
CPI Team Identity Engine v1

Purpose:
- Resolve raw team names into canonical team IDs before ranking.
- Combine exact alias lookup, team registry, club pattern recognition, and color/team-level rules.
- Produce a QA report so unresolved names can be reviewed.

Run:
  python scripts/team_identity_engine.py --input data/games_v3.json --output data/games_identity_v1.json
"""

from pathlib import Path
import argparse, json, re, csv
from collections import Counter, defaultdict

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
QA = ROOT / "qa"

def slugify(v):
    return re.sub(r"[^a-z0-9]+", "-", str(v or "").lower().strip()).strip("-") or "unknown"

def normalize_text(v):
    s = str(v or "").strip()
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"^(?:Win|Winner|Los|Loss|Loser)\s+Gm\s+#?\d+\s*[-–]\s*", "", s, flags=re.I)
    s = re.sub(r"^(?:Win|Winner|Los|Loss|Loser)\s+Game\s+#?\d+\s*[-–]\s*", "", s, flags=re.I)
    s = re.sub(r"^(?:W|L)\#?[^-–]+[-–]\s*", "", s, flags=re.I)
    s = re.sub(r"^[A-Z]{1,2}\d+\([^)]*\)\([^)]*\)\s*[-–]\s*", "", s, flags=re.I)
    s = re.sub(r"^[A-Z]{1,2}\d+\([^)]*\)\s*[-–]\s*", "", s, flags=re.I)
    s = re.sub(r"^[A-Z]{1,2}\d+\s*[-–]\s*", "", s, flags=re.I)
    s = re.sub(r"\s+14U\s+Boys?\b", "", s, flags=re.I)
    s = re.sub(r"\s*\((Blue|Red|White|Black|Gold|Silver|Navy)\)\s*$", r" \1", s, flags=re.I)
    return s.strip()

def read_json(path, default=None):
    p = Path(path)
    if not p.exists():
        return default if default is not None else {}
    return json.loads(p.read_text(encoding="utf-8"))

def team_id(club_id, level):
    return f"{club_id}-{str(level).lower()}"

def detect_level(text, club_id, rules):
    s = slugify(text)
    # explicit A/B/C/D suffix
    m = re.search(r"(^|-)(a|b|c|d)$", s)
    if m:
        return m.group(2).upper()
    color_rules = rules.get("color_level_rules", {}).get(club_id, {})
    for color, level in color_rules.items():
        if re.search(rf"(^|-){re.escape(color)}($|-)", s):
            return level
    return rules.get("default_level", "A")

def detect_club(text, rules):
    low = normalize_text(text).lower()
    low_slug = slugify(low)
    for club_id, patterns in rules.get("club_patterns", {}).items():
        for pat in patterns:
            pat_slug = slugify(pat)
            if pat.lower() in low or pat_slug in low_slug:
                return club_id
    return None

def should_never_default(text, rules):
    low = normalize_text(text).lower()
    return any(x in low for x in rules.get("never_default_if_contains", []))

def resolve(raw, alias_lookup, team_registry, removed, rules):
    clean = normalize_text(raw)
    if not clean:
        return None, "empty"
    key = slugify(clean)

    if key in removed:
        return None, "removed"
    if key in alias_lookup:
        return alias_lookup[key], "alias_lookup"
    if key in team_registry:
        return key, "team_registry_id"

    # Retry stripping trailing colors for lookup.
    key_no_color = re.sub(r"-(blue|red|white|black|gold|silver|navy)$", "", key)
    if key_no_color in alias_lookup:
        return alias_lookup[key_no_color], "alias_lookup_no_color"
    if key_no_color in team_registry:
        return key_no_color, "team_registry_id_no_color"

    # If already canonical looking, accept only if registry knows it or club is known.
    if re.search(r"-[abcd]$", key):
        club = re.sub(r"-[abcd]$", "", key)
        if club in {v.get("club_id") for v in team_registry.values()}:
            return key, "canonical_shape_known_club"

    # Club/pattern detection
    if should_never_default(clean, rules):
        return None, "placeholder"

    club_id = detect_club(clean, rules)
    if club_id:
        level = detect_level(clean, club_id, rules)
        candidate = team_id(club_id, level)
        return candidate, "club_pattern_level_rule"

    return None, "unresolved"

def run(input_path, output_path):
    alias_lookup = read_json(DATA / "team_alias_lookup.json")
    team_registry = read_json(DATA / "team_registry.json")
    removed = read_json(DATA / "removed_team_registry.json")
    rules = read_json(DATA / "identity_rules.json")
    games = read_json(input_path)

    resolved_games = {}
    qa = []
    resolutions = Counter()
    raw_mapping = {}
    team_counts = Counter()

    for gid, g in games.items():
        raw_a = g.get("team_1_raw") or g.get("team_1_id")
        raw_b = g.get("team_2_raw") or g.get("team_2_id")
        a, reason_a = resolve(raw_a, alias_lookup, team_registry, removed, rules)
        b, reason_b = resolve(raw_b, alias_lookup, team_registry, removed, rules)
        resolutions[reason_a] += 1
        resolutions[reason_b] += 1

        if raw_a:
            raw_mapping[raw_a] = {"canonical": a, "reason": reason_a}
        if raw_b:
            raw_mapping[raw_b] = {"canonical": b, "reason": reason_b}

        if not a or not b:
            qa.append({"level":"review","type":"unresolved_game_team","game_id":gid,"raw_team_1":raw_a,"resolved_1":a,"reason_1":reason_a,"raw_team_2":raw_b,"resolved_2":b,"reason_2":reason_b})
            continue
        if a == b:
            qa.append({"level":"review","type":"same_team_after_identity","game_id":gid,"team":a,"raw_team_1":raw_a,"raw_team_2":raw_b})
            continue

        ng = dict(g)
        ng["team_1_id_pre_identity"] = g.get("team_1_id")
        ng["team_2_id_pre_identity"] = g.get("team_2_id")
        ng["team_1_id"] = a
        ng["team_2_id"] = b
        s1, s2 = ng.get("team_1_score"), ng.get("team_2_score")
        ng["winner_team_id"] = a if s1 > s2 else b if s2 > s1 else None
        ng["loser_team_id"] = b if s1 > s2 else a if s2 > s1 else None
        ng["identity_reason_team_1"] = reason_a
        ng["identity_reason_team_2"] = reason_b
        new_id = "game-" + slugify("|".join([ng.get("tournament_id",""), min(a,b), max(a,b), str(s1), str(s2), str(ng.get("division_raw","")), str(ng.get("round",""))]))[:150]
        ng["id"] = new_id
        resolved_games[new_id] = ng
        team_counts[a] += 1
        team_counts[b] += 1

    teams = {}
    for tid, count in team_counts.items():
        reg = team_registry.get(tid, {})
        club_id = reg.get("club_id") or re.sub(r"-[abcd]$", "", tid)
        level = reg.get("team_level") or (tid.rsplit("-",1)[-1].upper() if re.search(r"-[abcd]$", tid) else "A")
        teams[tid] = {
            "id": tid,
            "name": reg.get("name") or tid.replace("-", " ").title(),
            "club_id": club_id,
            "team_level": level,
            "games": count,
            "ranking_eligible": count >= 5,
            "age_group": "14U",
            "gender": "Boys"
        }

    output_path = Path(output_path)
    output_path.write_text(json.dumps(resolved_games, indent=2), encoding="utf-8")
    (DATA / "teams_identity_v1.json").write_text(json.dumps(teams, indent=2), encoding="utf-8")
    (QA / "team_identity_report.json").write_text(json.dumps({
        "summary": {
            "input_games": len(games),
            "resolved_games": len(resolved_games),
            "teams": len(teams),
            "ranking_eligible_teams_5plus": sum(1 for t in teams.values() if t["ranking_eligible"]),
            "qa_items": len(qa)
        },
        "resolution_reasons": dict(resolutions),
        "qa_preview": qa[:500],
        "raw_mapping": raw_mapping
    }, indent=2), encoding="utf-8")

    with open(QA / "team_identity_mapping.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["raw_name", "canonical_team_id", "reason"])
        for raw, meta in sorted(raw_mapping.items()):
            w.writerow([raw, meta.get("canonical"), meta.get("reason")])

    print(json.dumps({"games": len(resolved_games), "teams": len(teams), "eligible": sum(1 for t in teams.values() if t["ranking_eligible"]), "qa": len(qa)}, indent=2))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", default=str(DATA / "games_v3.json"))
    ap.add_argument("--output", default=str(DATA / "games_identity_v1.json"))
    args = ap.parse_args()
    run(args.input, args.output)

if __name__ == "__main__":
    main()
