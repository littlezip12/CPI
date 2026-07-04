#!/usr/bin/env python3
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
    removed = read(DATA / "removed_team_registry.json", {})
    patch = read(DATA / "alias_cleanup_patch.json", {"team_aliases_to_add": {}, "removed_teams_to_add": {}})

    for raw_slug, canonical in patch.get("team_aliases_to_add", {}).items():
        aliases.setdefault("team_aliases", {})[raw_slug] = canonical
        lookup[raw_slug] = canonical

    removed_list = set(aliases.get("removed_teams", []))
    for raw_slug, meta in patch.get("removed_teams_to_add", {}).items():
        removed[raw_slug] = meta
        removed_list.add(raw_slug)
    aliases["removed_teams"] = sorted(removed_list)

    write(DATA / "aliases.json", aliases)
    write(DATA / "team_alias_lookup.json", lookup)
    write(DATA / "removed_team_registry.json", removed)
    print(f"Applied {len(patch.get('team_aliases_to_add', {}))} aliases and {len(patch.get('removed_teams_to_add', {}))} removals.")

if __name__ == "__main__":
    main()
