#!/usr/bin/env python3
"""
Normalize raw/parser team names using data/team_registry.json.

Usage:
  python scripts/normalize_with_team_registry.py "La Jolla Navy"
  python scripts/normalize_with_team_registry.py --test
"""

from pathlib import Path
import argparse, json, re

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

def slugify(v):
    return re.sub(r"[^a-z0-9]+", "-", str(v or "").lower().strip()).strip("-") or "unknown"

def load_lookup():
    return json.loads((DATA / "team_alias_lookup.json").read_text(encoding="utf-8"))

def normalize_name(raw, lookup):
    key = slugify(raw)
    if key in lookup:
        return lookup[key]
    # common cleanup pass
    cleaned = re.sub(r"^(win|winner|los|loser|loss)-gm-\d+-", "", key)
    cleaned = re.sub(r"-14u-boys?", "", cleaned)
    if cleaned in lookup:
        return lookup[cleaned]
    return None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("name", nargs="?")
    ap.add_argument("--test", action="store_true")
    args = ap.parse_args()
    lookup = load_lookup()
    if args.test:
        tests = ["La Jolla Navy","Stanford Black","Vanguard","SD Dons Black","680 Blue","Mission 14b","OCWPC Red"]
        for t in tests:
            print(f"{t} -> {normalize_name(t, lookup)}")
        return
    print(normalize_name(args.name, lookup))

if __name__ == "__main__":
    main()
