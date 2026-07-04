#!/usr/bin/env python3
"""
Apply Tournament Import Normalizer alias patch.

Run:
  python scripts/apply_tournament_normalizer_alias_patch.py
"""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

def read(path, default):
    p = Path(path)
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else default

def write(path, data):
    Path(path).write_text(json.dumps(data, indent=2), encoding="utf-8")

def main():
    aliases = read(DATA / "aliases.json", {"team_aliases": {}, "removed_teams": []})
    lookup = read(DATA / "team_alias_lookup.json", {})
    patch = read(DATA / "tournament_normalizer_alias_patch.json", {"team_aliases_to_add": {}})
    count = 0
    for raw_slug, canonical in patch.get("team_aliases_to_add", {}).items():
        aliases.setdefault("team_aliases", {})[raw_slug] = canonical
        lookup[raw_slug] = canonical
        count += 1
    write(DATA / "aliases.json", aliases)
    write(DATA / "team_alias_lookup.json", lookup)
    print(f"Applied {count} tournament-normalizer aliases.")

if __name__ == "__main__":
    main()
