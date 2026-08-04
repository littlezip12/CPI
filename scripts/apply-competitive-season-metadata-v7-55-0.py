#!/usr/bin/env python3
"""Apply WPI's competitive-season range metadata without changing results.

Calendar event dates and legacy identity-season fields remain intact. Public
history uses startYear-endYear competitive seasons.
"""
from __future__ import annotations

import glob
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FINAL_SEASON = "2025-2026"
FINAL_LABEL = "2025–2026"
ACTIVE_SEASON = "2026-2027"
ACTIVE_LABEL = "2026–2027"


def load(rel: str):
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))


def write(rel: str, data) -> None:
    (ROOT / rel).write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


# Public tournament hub and season tabs.
hub = load("data/tournaments/public-hub.json")
hub["schemaVersion"] = 2
hub["release"] = "7.55.1"
hub["seasonModel"] = {
    "type": "competitive_year_range",
    "labelFormat": "startYear–endYear",
    "openingWindow": "fall",
    "closingWindow": "summer",
    "currentSeason": ACTIVE_SEASON,
    "finalSeason": FINAL_SEASON,
}
hub["nextTournament"].update(
    {
        "competitiveSeason": ACTIVE_SEASON,
        "seasonLabel": ACTIVE_LABEL,
        "description": "The Evan Cousineau Memorial Cup opens the 2026–2027 club season. Divisions and schedules will be added when an official source is published.",
    }
)
hub.pop("years", None)
hub["seasons"] = [
    {
        "id": ACTIVE_SEASON,
        "label": ACTIVE_LABEL,
        "status": "active",
        "summary": "New season · results gathering begins with Evan Cousineau",
        "emptyTitle": "2026–2027 results will begin with Evan Cousineau.",
        "emptyDescription": "The tournament is announced for October 3–4, 2026. Results will appear here after verified schedules and scores are available.",
    },
    {
        "id": FINAL_SEASON,
        "label": FINAL_LABEL,
        "status": "final",
        "summary": "Completed season · Evan Cousineau through Junior Olympics",
    },
]
order = {
    "2025-evan-cousineau-memorial-cup": 10,
    "2026-kap7-international": 20,
    "2026-san-diego-county-cup": 30,
    "2026-girls-futures-super-finals": 40,
    "2026-boys-futures-super-finals": 50,
    "2026-quiksilver-cup": 60,
    "2026-jo-session-3": 90,
    "2026-junior-olympics": 100,
}
for event in hub.get("events", []):
    event_id = event.get("id", "")
    raw_year = event.get("eventYear", event.get("year"))
    if raw_year is None and event_id[:4].isdigit():
        raw_year = int(event_id[:4])
    event.pop("year", None)
    event["eventYear"] = int(raw_year)
    event["competitiveSeason"] = FINAL_SEASON
    event["seasonLabel"] = FINAL_LABEL
    event["seasonOrder"] = order[event_id]
hub["events"].sort(key=lambda event: event["seasonOrder"])
write("data/tournaments/public-hub.json", hub)

# Canonical competitive-season registry.
write(
    "data/tournaments/seasons.json",
    {
        "schemaVersion": 1,
        "release": "7.55.1",
        "model": "competitive_year_range",
        "displayConvention": "startYear–endYear",
        "description": "WPI seasons begin with fall club tournaments and close after the following summer championship cycle. Calendar event dates remain unchanged.",
        "seasons": [
            {
                "id": ACTIVE_SEASON,
                "label": ACTIVE_LABEL,
                "status": "active",
                "startDate": "2026-10-03",
                "endDate": None,
                "openingEventId": "2026-evan-cousineau-memorial-cup",
                "rankingStatus": "results_gathering",
                "publicRankingLabel": "Results gathering in progress",
            },
            {
                "id": FINAL_SEASON,
                "label": FINAL_LABEL,
                "status": "final",
                "startDate": "2025-10-04",
                "endDate": "2026-08-02",
                "openingEventId": "2025-evan-cousineau-memorial-cup",
                "closingEventId": "2026-junior-olympics",
                "rankingStatus": "final",
                "publicRankingLabel": "2025–2026 Final Rankings",
            },
        ],
    },
)

# Central source registry. Existing per-division `season` values remain legacy
# identity years and are intentionally not rewritten.
registry = load("data/tournaments/registry.json")
registry["release"] = "7.55.1"
registry["competitiveSeasonModel"] = "startYear-endYear"
registry["activeCompetitiveSeason"] = ACTIVE_SEASON
registry["finalCompetitiveSeason"] = FINAL_SEASON
for event in registry.get("events", []):
    if event.get("id", "").startswith(("2025-", "2026-")):
        event["competitiveSeason"] = FINAL_SEASON
        event["seasonLabel"] = FINAL_LABEL
write("data/tournaments/registry.json", registry)

# Reusable platform registry.
platform_registry = load("data/tournaments/platform/registry.json")
platform_registry["release"] = "7.55.1"
platform_registry["competitiveSeasonModel"] = "startYear-endYear"
platform_registry["activeCompetitiveSeason"] = ACTIVE_SEASON
platform_registry["finalCompetitiveSeason"] = FINAL_SEASON
for event in platform_registry.get("events", []):
    event_id = event.get("id", "")
    if event_id[:4].isdigit():
        event["eventYear"] = int(event_id[:4])
    event["competitiveSeason"] = FINAL_SEASON
    event["seasonLabel"] = FINAL_LABEL
write("data/tournaments/platform/registry.json", platform_registry)

# Platform event bundles.
for raw_path in glob.glob(str(ROOT / "data/tournaments/platform/events/*.json")):
    path = Path(raw_path)
    data = json.loads(path.read_text(encoding="utf-8"))
    event = data.setdefault("event", {})
    start = str(event.get("startDate") or "")
    if start[:4].isdigit():
        event["eventYear"] = int(start[:4])
    elif path.stem[:4].isdigit():
        event["eventYear"] = int(path.stem[:4])
    event["competitiveSeason"] = FINAL_SEASON
    event["seasonLabel"] = FINAL_LABEL
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

# Placement archives. The Girls US Club Championship remains banked but is not
# added to the public hub.
for raw_path in glob.glob(str(ROOT / "data/tournaments/archive/*.json")):
    path = Path(raw_path)
    if path.name == "index.json":
        continue
    data = json.loads(path.read_text(encoding="utf-8"))
    event_id = str(data.get("eventId") or path.stem)
    if event_id[:4].isdigit():
        data["eventYear"] = int(event_id[:4])
        data["competitiveSeason"] = FINAL_SEASON
        data["seasonLabel"] = FINAL_LABEL
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

# JO aggregate files.
for rel in ("data/tournaments/jo-recap-2026.json", "data/tournaments/jo-results-2026.json"):
    data = load(rel)
    data["eventYear"] = 2026
    data["competitiveSeason"] = FINAL_SEASON
    data["seasonLabel"] = FINAL_LABEL
    write(rel, data)

# The normalized archive index is rebuilt later in release-check, so this block
# is intentionally safe to run both before and after that rebuild.
archive_index_path = ROOT / "data/tournaments/archive/index.json"
if archive_index_path.exists():
    archive_index = json.loads(archive_index_path.read_text(encoding="utf-8"))
    archive_index["seasonModel"] = {
        "type": "competitive_year_range",
        "finalSeason": FINAL_SEASON,
        "activeSeason": ACTIVE_SEASON,
    }
    for event in archive_index.get("events", []):
        event_id = str(event.get("id") or "")
        if event_id[:4].isdigit():
            event["eventYear"] = int(event_id[:4])
        event["competitiveSeason"] = FINAL_SEASON
        event["seasonLabel"] = FINAL_LABEL
    archive_index_path.write_text(json.dumps(archive_index, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

print("WPI COMPETITIVE SEASON METADATA APPLIED")
print(" - 2025–2026: Evan Cousineau through Junior Olympics")
print(" - 2026–2027: active, opening with upcoming Evan Cousineau")
print(" - calendar event years and legacy identity seasons remain intact")
