#!/usr/bin/env python3
"""
CPI Tournament Import Normalizer v1

Purpose:
- Normalize raw tournament team labels before parser identity resolution.
- Strip bracket prefixes like "1st in B", "2Ndh", "3Rdj", etc.
- Expand known abbreviations like NBWP, CIU, PV, SBWPC.
- Create a normalized-team report for QA.

Run:
  python scripts/tournament_import_normalizer.py
"""

from pathlib import Path
import json, re, csv
from collections import Counter

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
QA = ROOT / "qa"

def slugify(v):
    return re.sub(r"[^a-z0-9]+", "-", str(v or "").lower().strip()).strip("-") or "unknown"

def title_team(s):
    special = {"sd":"SD","la":"LA","sj":"SJ","cc":"CC","ocwpc":"OCWPC","lawpc":"LAWPC","cvu":"CVU","cdm":"CDM","ciu":"CIU","ovac":"OVAC","socal":"SOCAL","skip":"SKIP","wp":"WP","wpc":"WPC","eca":"ECA","pv":"PV","tmec":"TMEC","ngen":"NGEN","chawp":"CHAWP","cmac":"CMAC","sja":"SJA","lacuwp":"LACUWP","lowpo":"LOWPO","nsd":"NSD"}
    return " ".join(special.get(p.lower(), p.capitalize()) for p in re.split(r"\s+", s.strip()) if p)

def read_json(path, default=None):
    p = Path(path)
    if not p.exists():
        return default if default is not None else {}
    return json.loads(p.read_text(encoding="utf-8"))

def normalize_raw_name(raw, rules):
    original = str(raw or "").strip()
    s = original
    s = re.sub(r"\s+", " ", s).strip()

    # Remove bracket/placement prefixes iteratively.
    changed = True
    applied = []
    while changed:
        changed = False
        for pat in rules.get("strip_prefix_patterns", []):
            ns = re.sub(pat, "", s, flags=re.I).strip()
            if ns != s:
                applied.append(pat)
                s = ns
                changed = True

    # Specific cleanup after prefix strip.
    s = re.sub(r"\s+14U\s+A\b", " A", s, flags=re.I)
    s = re.sub(r"\s+14U\b", "", s, flags=re.I)
    s = re.sub(r"\s+", " ", s).strip()

    # Expand abbreviations from beginning of string, preserving trailing team level.
    slug = slugify(s)
    parts = slug.split("-")
    team_level = ""
    if parts and parts[-1] in {"a","b","c","d"}:
        team_level = parts[-1].upper()
        base_slug = "-".join(parts[:-1])
    else:
        base_slug = slug

    base_text = base_slug.replace("-", " ")
    abbr = rules.get("abbreviations", {})
    expanded = None

    # Longest match first.
    for key in sorted(abbr.keys(), key=lambda x: -len(x)):
        key_slug = slugify(key)
        if base_slug == key_slug or base_slug.startswith(key_slug + "-") or base_text.startswith(key.lower() + " "):
            replacement = abbr[key]
            remainder_slug = base_slug[len(key_slug):].strip("-")
            remainder = remainder_slug.replace("-", " ")
            expanded = " ".join([replacement, remainder, team_level]).strip()
            break

    if expanded:
        s = expanded
    else:
        s = title_team(s)

    canonical_slug = slugify(s)
    return {
        "raw": original,
        "normalized": s,
        "normalized_slug": canonical_slug,
        "prefix_removed": bool(applied),
        "rules_applied": applied
    }

def normalize_games(input_games, output_games):
    rules = read_json(DATA / "tournament_import_normalizer_rules.json")
    games = read_json(input_games)
    known_aliases = rules.get("known_team_aliases_to_add", {})

    output = {}
    mapping = {}
    stats = Counter()
    unresolved_after_normalization = Counter()

    for gid, g in games.items():
        raw_a = g.get("team_1_raw") or g.get("team_1_id")
        raw_b = g.get("team_2_raw") or g.get("team_2_id")
        na = normalize_raw_name(raw_a, rules)
        nb = normalize_raw_name(raw_b, rules)
        mapping[raw_a] = na
        mapping[raw_b] = nb
        if na["prefix_removed"]: stats["prefix_removed"] += 1
        if nb["prefix_removed"]: stats["prefix_removed"] += 1

        ng = dict(g)
        ng["team_1_raw_original"] = raw_a
        ng["team_2_raw_original"] = raw_b
        ng["team_1_normalized_name"] = na["normalized"]
        ng["team_2_normalized_name"] = nb["normalized"]
        ng["team_1_normalized_slug"] = na["normalized_slug"]
        ng["team_2_normalized_slug"] = nb["normalized_slug"]

        # If known alias maps this normalized slug, attach suggested canonical.
        ng["team_1_suggested_canonical"] = known_aliases.get(na["normalized_slug"])
        ng["team_2_suggested_canonical"] = known_aliases.get(nb["normalized_slug"])

        if not ng["team_1_suggested_canonical"]:
            unresolved_after_normalization[na["normalized"]] += 1
        if not ng["team_2_suggested_canonical"]:
            unresolved_after_normalization[nb["normalized"]] += 1

        output[gid] = ng

    Path(output_games).write_text(json.dumps(output, indent=2), encoding="utf-8")
    (QA / "tournament_import_normalizer_report.json").write_text(json.dumps({
        "summary": {
            "games": len(games),
            "unique_raw_names": len(mapping),
            "prefix_removals": stats["prefix_removed"],
            "unresolved_normalized_names": len(unresolved_after_normalization)
        },
        "top_unresolved_after_normalization": unresolved_after_normalization.most_common(200),
        "mapping": mapping
    }, indent=2), encoding="utf-8")

    with open(QA / "tournament_name_normalization_review.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["raw_name", "normalized_name", "normalized_slug", "prefix_removed"])
        for raw, meta in sorted(mapping.items()):
            w.writerow([raw, meta["normalized"], meta["normalized_slug"], meta["prefix_removed"]])

    print(json.dumps({"games": len(games), "unique_raw_names": len(mapping), "prefix_removals": stats["prefix_removed"], "unresolved": len(unresolved_after_normalization)}, indent=2))

def main():
    # Prefer identity/dictionary games, but this can be pointed at earlier outputs too.
    input_path = DATA / "games_identity_v1.json"
    if not input_path.exists():
        input_path = DATA / "games_v3.json"
    output_path = DATA / "games_import_normalized_v1.json"
    normalize_games(input_path, output_path)

if __name__ == "__main__":
    main()
