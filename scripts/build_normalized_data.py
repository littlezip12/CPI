#!/usr/bin/env python3
"""
CPI normalized data generator.

Run from repo root:
  python scripts/build_normalized_data.py

Inputs:
  data/cpi_clubs.js
  data/cpi_team_pages_2026_14u_boys.js
  data/cpi_qa_rankings_2026_14u_boys.js

Outputs:
  data/clubs.json
  data/teams.json
  data/tournaments.json
  data/games.json
  data/data_model.json
"""

from pathlib import Path
import json, re

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

def slugify(v):
    return re.sub(r"[^a-z0-9]+", "-", str(v or "").lower().strip()).strip("-") or "unknown"

def normalize_name(v):
    return re.sub(r"\s+", " ", str(v or "").strip())

def load_window_json(path, var):
    txt = Path(path).read_text(encoding="utf-8").strip()
    txt = re.sub(rf"^window\.{re.escape(var)}\s*=\s*", "", txt).rstrip(";")
    return json.loads(txt)

def safe_str_list(items):
    vals = []
    for item in items:
        if item is None:
            continue
        if isinstance(item, str):
            val = item.strip()
        elif isinstance(item, dict):
            val = item.get("name") or item.get("team") or item.get("alias") or item.get("value") or ""
        else:
            val = str(item)
        if val:
            vals.append(val)
    return sorted(set(vals))

def event_id(event_name):
    s = slugify(event_name)
    if "super-finals" in s or s == "futures-super-finals":
        return "futures-super-finals"
    if "kap7" in s:
        return "kap7"
    if "sopac" in s:
        return "sopac-jo-qualifier"
    if "cca" in s:
        return "cca-jo-qualifier"
    if "norcal" in s and "qual" in s:
        return "norcal-jo-qualifier"
    if "county" in s:
        return "san-diego-county-cup"
    return s

def team_letter(team_name):
    m = re.search(r"\s+([ABCD])$", normalize_name(team_name))
    return m.group(1) if m else "A"

def main():
    clubs = load_window_json(DATA / "cpi_clubs.js", "CPI_CLUBS")
    team_pages = load_window_json(DATA / "cpi_team_pages_2026_14u_boys.js", "CPI_TEAM_PAGES_2026_14U_BOYS")
    rankings = load_window_json(DATA / "cpi_qa_rankings_2026_14u_boys.js", "CPI_QA_RANKINGS_2026_14U_BOYS")
    team_index = team_pages.get("teamIndex", {})
    ranking_rows = rankings.get("rankings") or rankings.get("top100") or []
    ranking_by_slug = {r.get("slug") or slugify(r.get("team")): r for r in ranking_rows}

    alias_to_club = {}
    for cid, c in clubs.items():
        for val in [c.get("id"), c.get("name"), c.get("shortName")] + c.get("aliases", []):
            if isinstance(val, str) and val.strip():
                alias_to_club[slugify(val)] = cid

    def infer_club_id(team_name, club_name=""):
        raw_team = normalize_name(team_name)
        raw_club = normalize_name(club_name)
        for val in [raw_club, raw_team, re.sub(r"\s+[ABCD]$", "", raw_team).strip()]:
            if slugify(val) in alias_to_club:
                return alias_to_club[slugify(val)]
        text = f"{raw_team} {raw_club}".lower()
        for cid, c in clubs.items():
            vals = [c.get("name",""), c.get("shortName","")] + c.get("aliases", [])
            if any(str(v).lower().strip() and str(v).lower().strip() in text for v in vals):
                return cid
        return slugify(re.sub(r"\s+[ABCD]$", "", raw_team).strip() or raw_club or raw_team)

    teams = {}
    for key, t in team_index.items():
        if not isinstance(t, dict):
            continue
        name = normalize_name(t.get("team") or key)
        tid = t.get("slug") or slugify(name)
        r = ranking_by_slug.get(tid) or t.get("ranking") or {}
        teams[tid] = {
            "id": tid,
            "name": name,
            "club_id": infer_club_id(name, t.get("club", "")),
            "team_level": team_letter(name),
            "age_group": t.get("age_group") or "14U",
            "gender": t.get("gender") or "Boys",
            "rank": r.get("rank"),
            "cpi": r.get("cpi") or r.get("qa_cpi"),
            "record": r.get("record") or t.get("record"),
            "source_slug": tid,
            "aliases": safe_str_list([name, key, t.get("club","")] + (t.get("aliases", []) or []))
        }

    tournaments, games, seen = {}, {}, set()
    for key, raw_team in team_index.items():
        if not isinstance(raw_team, dict):
            continue
        tid = raw_team.get("slug") or slugify(raw_team.get("team") or key)
        if tid not in teams:
            continue
        for idx, g in enumerate(raw_team.get("games_list", []) or []):
            if not isinstance(g, dict):
                continue
            ev = normalize_name(g.get("event") or "Unknown Event")
            eid = event_id(ev)
            tournaments.setdefault(eid, {
                "id": eid,
                "name": ev,
                "season": "2026",
                "age_group": raw_team.get("age_group") or "14U",
                "gender": raw_team.get("gender") or "Boys",
                "type": "tournament",
                "url": "",
                "location": "California",
                "overall_context_label": g.get("overall_context") or "",
                "aliases": [ev]
            })
            opp = normalize_name(g.get("opponent") or "")
            score = normalize_name(g.get("score") or "")
            result = normalize_name(g.get("result") or "")
            gid = "game-" + slugify("|".join([eid, tid, opp, score, result, str(g.get("sort_key","")), str(idx)]))[:120]
            if gid in seen:
                continue
            seen.add(gid)
            games[gid] = {
                "id": gid,
                "tournament_id": eid,
                "team_id": tid,
                "opponent_team_id": slugify(opp) if slugify(opp) in teams else None,
                "opponent_name": opp,
                "result": result,
                "score": score,
                "goals_for": None,
                "goals_against": None,
                "round": g.get("round") or "",
                "date": g.get("date") or "",
                "overall_context": g.get("overall_context") or "",
                "tier_num": g.get("tier_num"),
                "sort_key": g.get("sort_key")
            }

    (DATA / "clubs.json").write_text(json.dumps(clubs, indent=2), encoding="utf-8")
    (DATA / "teams.json").write_text(json.dumps(teams, indent=2), encoding="utf-8")
    (DATA / "tournaments.json").write_text(json.dumps(tournaments, indent=2), encoding="utf-8")
    (DATA / "games.json").write_text(json.dumps(games, indent=2), encoding="utf-8")
    (DATA / "data_model.json").write_text(json.dumps({
        "version": "1.0",
        "season": "2026",
        "age_group": "14U",
        "gender": "Boys",
        "files": {
            "clubs": "data/clubs.json",
            "teams": "data/teams.json",
            "tournaments": "data/tournaments.json",
            "games": "data/games.json"
        }
    }, indent=2), encoding="utf-8")
    print(f"Wrote {len(clubs)} clubs, {len(teams)} teams, {len(tournaments)} tournaments, {len(games)} games.")

if __name__ == "__main__":
    main()
