#!/usr/bin/env python3
"""Build WPI 7.55.1 multi-season ranking and profile snapshots.

The current published ranking data is frozen as the immutable 2025-2026 final
season. The 2026-2027 season is opened without rankings; verified results can
be gathered without mutating the completed-season snapshot.
"""
from __future__ import annotations

import hashlib
import json
import re
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RELEASE = "7.55.1"
FINAL_ID = "2025-2026"
FINAL_LABEL = "2025–2026"
ACTIVE_ID = "2026-2027"
ACTIVE_LABEL = "2026–2027"
FINAL_DATE = "2026-08-03"


def load(rel: str):
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))


def dump(rel: str, data) -> None:
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def canonical_bytes(data) -> bytes:
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def sha(data) -> str:
    return hashlib.sha256(canonical_bytes(data)).hexdigest()


def tagged_rankings(source):
    output = []
    for item in source:
        row = deepcopy(item)
        row["competitiveSeason"] = FINAL_ID
        row["seasonLabel"] = FINAL_LABEL
        row["seasonStatus"] = "final"
        row["rankingLabel"] = f"{FINAL_LABEL} Final Rankings"
        output.append(row)
    return output


def tagged_clubs(source):
    output = []
    for item in source:
        row = deepcopy(item)
        row["competitiveSeason"] = FINAL_ID
        row["seasonLabel"] = FINAL_LABEL
        row["seasonStatus"] = "final"
        row["rankingLabel"] = f"{FINAL_LABEL} Final Rankings"
        output.append(row)
    return output


def update_data_js(final_rankings, final_clubs):
    path = ROOT / "data.js"
    lines = path.read_text(encoding="utf-8").splitlines()
    assignments = {}
    order = []
    pattern = re.compile(r"^window\.([A-Z0-9_]+) = (.*);$")
    for line in lines:
        match = pattern.match(line)
        if not match:
            continue
        key = match.group(1)
        assignments[key] = json.loads(match.group(2))
        order.append(key)

    platform = assignments["CPI_PLATFORM"]
    platform.update({
        "currentSeason": ACTIVE_ID,
        "currentCompetitiveSeason": ACTIVE_ID,
        "finalRankingSeason": FINAL_ID,
        "seasonModel": "competitive_year_range",
        "seasonDataRelease": RELEASE,
        "currentUpdate": "2025–2026 final rankings and 2026–2027 season foundation",
    })
    assignments["CPI_RANKINGS"] = final_rankings
    assignments["CPI_CLUBS"] = final_clubs

    for hub in assignments.get("CPI_GROUP_HUBS", []):
        group = hub.get("group", "Age group")
        hub["competitiveSeason"] = FINAL_ID
        hub["seasonLabel"] = FINAL_LABEL
        hub["seasonStatus"] = "final"
        hub["heroLabel"] = f"{FINAL_LABEL} Final Rankings"
        hub["heroTitle"] = f"{group} {FINAL_LABEL} Final Rankings"
        summary = str(hub.get("heroSummary") or "").strip()
        if summary and not summary.startswith(FINAL_LABEL):
            hub["heroSummary"] = f"{FINAL_LABEL} final rankings. {summary}"

    for event in assignments.get("CPI_TOURNAMENTS", []):
        event.setdefault("competitiveSeason", FINAL_ID)
        event.setdefault("seasonLabel", FINAL_LABEL)

    output = []
    for key in order:
        output.append(f"window.{key} = {json.dumps(assignments[key], separators=(',', ':'), ensure_ascii=False)};")
    path.write_text("\n".join(output) + "\n", encoding="utf-8")


rankings_source = load("rankings.json")
clubs_source = load("clubs.json")
hub = load("data/tournaments/public-hub.json")
seasons_registry = load("data/tournaments/seasons.json")

if len(rankings_source) != 724:
    raise SystemExit(f"Expected 724 rankings, found {len(rankings_source)}")
if len(clubs_source) != 182:
    raise SystemExit(f"Expected 182 clubs, found {len(clubs_source)}")

final_rankings = tagged_rankings(rankings_source)
final_clubs = tagged_clubs(clubs_source)

# Keep the primary exported JSON season-aware while preserving all competitive
# values and the legacy identity year in `season`.
dump("rankings.json", final_rankings)
dump("clubs.json", final_clubs)
update_data_js(final_rankings, final_clubs)

completed_events = [deepcopy(event) for event in hub.get("events", []) if event.get("competitiveSeason") == FINAL_ID]
completed_events.sort(key=lambda event: event.get("seasonOrder", 999))

team_index = []
for row in final_rankings:
    team_index.append({
        "canonicalTeamId": row.get("canonicalTeamId"),
        "slug": row.get("slug"),
        "team": row.get("team"),
        "club": row.get("displayClubName") or row.get("club"),
        "canonicalClubId": row.get("canonicalClubId"),
        "group": row.get("group"),
        "finalRank": row.get("postRank"),
        "finalWPI": row.get("postCPI"),
        "teamPage": row.get("teamPage"),
        "clubPage": row.get("clubPage"),
        "competitiveSeason": FINAL_ID,
        "seasonStatus": "final",
    })

snapshot_dir = f"data/seasons/{FINAL_ID}"
dump(f"{snapshot_dir}/rankings.json", final_rankings)
dump(f"{snapshot_dir}/clubs.json", final_clubs)
dump(f"{snapshot_dir}/teams.json", team_index)
dump(f"{snapshot_dir}/tournaments.json", completed_events)

final_manifest = {
    "schemaVersion": 1,
    "release": RELEASE,
    "season": {
        "id": FINAL_ID,
        "label": FINAL_LABEL,
        "status": "final",
        "rankingStatus": "final",
        "publicLabel": f"{FINAL_LABEL} Final Rankings",
        "finalizedAt": FINAL_DATE,
        "openingEventId": "2025-evan-cousineau-memorial-cup",
        "closingEventId": "2026-junior-olympics",
    },
    "counts": {
        "rankings": len(final_rankings),
        "rankingGroups": len({row.get("group") for row in final_rankings}),
        "clubs": len(final_clubs),
        "rankedTeams": len(team_index),
        "publicTournaments": len(completed_events),
    },
    "integrity": {
        "rankingsSha256": sha(final_rankings),
        "clubsSha256": sha(final_clubs),
        "teamsSha256": sha(team_index),
        "tournamentsSha256": sha(completed_events),
    },
    "data": {
        "rankings": "rankings.json",
        "clubs": "clubs.json",
        "teams": "teams.json",
        "tournaments": "tournaments.json",
    },
    "policy": [
        "This snapshot is immutable after publication.",
        "Future tournament imports and ranking releases must not rewrite these files.",
        "The legacy identity year remains 2026 while competitive-season grouping uses 2025-2026.",
    ],
}
dump(f"{snapshot_dir}/manifest.json", final_manifest)

active_dir = f"data/seasons/{ACTIVE_ID}"
active_manifest = {
    "schemaVersion": 1,
    "release": RELEASE,
    "season": {
        "id": ACTIVE_ID,
        "label": ACTIVE_LABEL,
        "status": "active",
        "rankingStatus": "results_gathering",
        "publicLabel": f"{ACTIVE_LABEL} Results Gathering in Progress",
        "startDate": "2026-10-03",
        "openingEventId": "2026-evan-cousineau-memorial-cup",
    },
    "counts": {"rankings": 0, "rankingGroups": 0, "clubs": 182, "rankedTeams": 0, "publicTournaments": 0},
    "data": {"rankings": None, "clubs": None, "teams": None, "tournaments": None},
    "policy": [
        "No preseason rankings are fabricated.",
        "Teams are not automatically aged into a new ranking group.",
        "Verified tournament evidence may be collected before public rankings are published.",
    ],
}
dump(f"{active_dir}/manifest.json", active_manifest)

season_rows = {row["id"]: row for row in seasons_registry.get("seasons", [])}
season_index = {
    "schemaVersion": 1,
    "release": RELEASE,
    "model": "competitive_year_range",
    "displayConvention": "startYear–endYear",
    "activeSeasonId": ACTIVE_ID,
    "finalRankingSeasonId": FINAL_ID,
    "pageDefaults": {
        "rankings": FINAL_ID,
        "teams": FINAL_ID,
        "team": FINAL_ID,
        "clubs": FINAL_ID,
        "club": FINAL_ID,
        "tournaments": FINAL_ID,
    },
    "seasons": [
        {
            **season_rows[ACTIVE_ID],
            "manifestPath": f"data/seasons/{ACTIVE_ID}/manifest.json",
            "rankingsPath": None,
            "clubsPath": None,
        },
        {
            **season_rows[FINAL_ID],
            "manifestPath": f"data/seasons/{FINAL_ID}/manifest.json",
            "rankingsPath": f"data/seasons/{FINAL_ID}/rankings.json",
            "clubsPath": f"data/seasons/{FINAL_ID}/clubs.json",
            "teamsPath": f"data/seasons/{FINAL_ID}/teams.json",
            "tournamentsPath": f"data/seasons/{FINAL_ID}/tournaments.json",
        },
    ],
}
dump("data/seasons/index.json", season_index)

runtime = """(() => {\n  \"use strict\";\n  const index = __INDEX__;\n  const aliases = new Map(index.seasons.map(season => [season.id, season]));\n  const pageName = () => {\n    const name = (location.pathname.split('/').pop() || 'index.html').replace(/\\.html$/,'');\n    return name || 'index';\n  };\n  const defaultSeasonId = (page = pageName()) => index.pageDefaults[page] || index.finalRankingSeasonId;\n  const resolve = (page = pageName()) => {\n    const requested = new URLSearchParams(location.search).get('season');\n    return aliases.get(requested) || aliases.get(defaultSeasonId(page)) || index.seasons[0];\n  };\n  const withSeason = (href, seasonId = resolve().id) => {\n    if (!href || href.startsWith('#') || /^(?:https?:|mailto:|tel:)/i.test(href)) return href;\n    const [raw, hash = ''] = href.split('#', 2);\n    const base = new URL(raw, location.href);\n    base.searchParams.set('season', seasonId);\n    const relative = `${base.pathname.split('/').pop()}${base.search}`;\n    return hash ? `${relative}#${hash}` : relative;\n  };\n  window.WPI_SEASON_INDEX = index;\n  window.WPISeason = { index, pageName, defaultSeasonId, resolve, withSeason, get: id => aliases.get(id) || null };\n})();\n""".replace("__INDEX__", json.dumps(season_index, separators=(",", ":"), ensure_ascii=False))
(ROOT / "data/seasons/runtime.js").write_text(runtime, encoding="utf-8")

print("WPI MULTI-SEASON FOUNDATION BUILD COMPLETE")
print(f" - {FINAL_LABEL}: {len(final_rankings)} immutable final rankings across {final_manifest['counts']['rankingGroups']} groups")
print(f" - {len(final_clubs)} club snapshots and {len(team_index)} ranked-team profile records preserved")
print(f" - {ACTIVE_LABEL}: active with zero fabricated rankings")
print(f" - snapshot SHA-256: {final_manifest['integrity']['rankingsSha256']}")
