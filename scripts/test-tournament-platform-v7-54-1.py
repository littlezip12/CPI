#!/usr/bin/env python3
from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []
load = lambda rel: json.loads((ROOT / rel).read_text(encoding="utf-8"))
site = load("config/site-release.json")
registry = load("data/tournaments/platform/registry.json")
source_registry = load("data/tournaments/registry.json")
quiksilver = load("data/tournaments/platform/events/2026-quiksilver-cup.json")
futures = load("data/tournaments/platform/events/2026-boys-futures-super-finals.json")
rankings = load("rankings.json")
clubs = load("clubs.json")
jo = load("data/tournaments/jo-results-2026.json")

if site.get("tournamentPlatformRelease") not in {"7.54.1", "7.54.2", "7.54.3", "7.54.4", "7.54.5", "7.54.6", "7.54.7", "7.54.8", "7.54.9", "7.54.10"}:
    errors.append("tournamentPlatformRelease must preserve 7.54.1")
if site.get("tournamentRegistryRelease") not in {"7.54.1", "7.54.2", "7.54.3", "7.54.4", "7.54.5", "7.54.6", "7.54.7", "7.54.8", "7.54.9", "7.54.10"}:
    errors.append("tournamentRegistryRelease must preserve 7.54.1")
if site.get("boysFuturesPlatformRelease") != "7.54.1":
    errors.append("boysFuturesPlatformRelease must remain 7.54.1")
if site.get("version") not in {"7.54.1", "7.54.2", "7.54.3", "7.54.4", "7.54.5", "7.54.6", "7.54.7", "7.54.8", "7.54.9", "7.54.10"}:
    errors.append("site version must preserve the Boys Futures migration")
if registry.get("release") not in {"7.54.1", "7.54.2", "7.54.3", "7.54.4", "7.54.5", "7.54.6", "7.54.7", "7.54.8", "7.54.9", "7.54.10"} or len(registry.get("events", [])) != 9:
    errors.append("platform registry must contain nine registered events")
platform_live = [event for event in registry.get("events", []) if event.get("migrationStatus") == "platform_live"]
if {event.get("id") for event in platform_live} != {"2026-quiksilver-cup", "2026-boys-futures-super-finals", "2025-evan-cousineau-memorial-cup", "2026-kap7-international", "2026-san-diego-county-cup"}:
    errors.append("Quiksilver, Boys Futures, Evan Cousineau, KAP7 International, and San Diego County Cup must be the five platform-live events")

expected_futures = {
    "divisionCount": 13,
    "gameCount": 709,
    "finalGameCount": 709,
    "scheduledGameCount": 0,
    "teamCount": 276,
    "placementCount": 238,
    "venueCount": 27,
    "dateCount": 3,
}
for key, value in expected_futures.items():
    if futures.get("summary", {}).get(key) != value:
        errors.append(f"Boys Futures {key} expected {value}, found {futures.get('summary', {}).get(key)}")
expected_quiksilver = {"divisionCount": 7, "gameCount": 226, "teamCount": 93, "placementCount": 80, "venueCount": 14}
for key, value in expected_quiksilver.items():
    if quiksilver.get("summary", {}).get(key) != value:
        errors.append(f"Quiksilver preservation failed for {key}")

if futures.get("event", {}).get("rankingEvidenceEnabled") is not False:
    errors.append("Boys Futures must remain ranking-quarantined")
if set(futures.get("capabilities", {}).get("filters", [])) != {"ageGroup", "gender", "division", "team", "date", "venue", "status", "search"}:
    errors.append("Boys Futures reusable filter contract is incomplete")
if {adapter.get("type") for adapter in futures.get("sourceAdapters", [])} != {"normalized_json", "google_sheets_csv"}:
    errors.append("Boys Futures source adapters are incomplete")

team_ids = {team.get("participantId") for team in futures.get("teams", [])}
route_pattern = re.compile(r"(?:#|\b(?:1st|2nd|3rd|4th)[A-Z]?\(|^[A-Z]\d\()", re.I)
for team in futures.get("teams", []):
    if route_pattern.search(team.get("name") or ""):
        errors.append(f"route metadata remains in team name: {team.get('name')}")
    logo = team.get("logo")
    if logo and not (ROOT / logo).exists():
        errors.append(f"team logo does not exist: {logo}")
    if len(team.get("gameIds", [])) != team.get("record", {}).get("wins", 0) + team.get("record", {}).get("losses", 0) + team.get("record", {}).get("ties", 0):
        errors.append(f"team record does not match journey length: {team.get('name')}")
for game in futures.get("games", []):
    for side in ["white", "dark"]:
        participant = game.get(side)
        if participant and participant.get("participantId") not in team_ids:
            errors.append(f"game {game.get('id')} references an unknown participant")
    for key in ["winnerParticipantId", "loserParticipantId"]:
        participant_id = game.get("outcome", {}).get(key)
        if participant_id and participant_id not in team_ids:
            errors.append(f"game {game.get('id')} outcome references an unknown participant")
for rows in futures.get("placements", {}).values():
    for row in rows:
        if row.get("participantId") not in team_ids:
            errors.append(f"placement references unknown participant: {row.get('name')}")

source_event = next((event for event in source_registry.get("events", []) if event.get("id") == "2026-boys-futures-super-finals"), {})
if source_event.get("platformEnabled") is not True or source_event.get("platformRelease") != "7.54.1":
    errors.append("source registry does not register the Boys Futures migration")
if source_event.get("legacyPublicPath") != "tournaments/boys-superfinals/index.html":
    errors.append("Boys Futures legacy URL was not preserved")
legacy = (ROOT / "tournaments/boys-superfinals/index.html").read_text(encoding="utf-8")
if "../../tournament.html?event=2026-boys-futures-super-finals" not in legacy:
    errors.append("legacy Boys Futures route does not converge on the platform")
public_hub = load("data/tournaments/public-hub.json")
if not any(e.get("id")=="2026-boys-futures-super-finals" and e.get("publicPath")=="tournament.html?event=2026-boys-futures-super-finals" for e in public_hub.get("events", [])):
    errors.append("public tournament archive does not register Boys Futures")
page = (ROOT / "tournament.html").read_text(encoding="utf-8")
for token in ["data/tournaments/platform/runtime.js?v=7.54.10", "js/tournament-platform-v7-54-0.js?v=7.54.10"]:
    if token not in page:
        errors.append(f"tournament.html missing {token}")

if len(rankings) != 724:
    errors.append(f"expected 724 rankings, found {len(rankings)}")
if len(clubs) != 182:
    errors.append(f"expected 182 clubs, found {len(clubs)}")
if jo.get("summary", {}).get("teamPlacements") != 976:
    errors.append("expected 976 JO placements")

if errors:
    print("WPI TOURNAMENT PLATFORM 7.54.1 TEST FAILED")
    for error in errors[:50]:
        print(" -", error)
    sys.exit(1)
print("WPI TOURNAMENT PLATFORM 7.54.1 TEST PASSED")
print(" - Quiksilver and Boys Futures share one reusable event registry and viewer")
print(" - Boys Futures includes 13 divisions, 709 finals, 276 clean team journeys, 238 placements, and 27 venues")
print(" - Bracket-route labels are merged into underlying team records and journeys")
print(" - Legacy URLs converge on the platform while rankings remain quarantined")
print(" - 724 rankings, 182 clubs, and 976 JO placements remain unchanged")
