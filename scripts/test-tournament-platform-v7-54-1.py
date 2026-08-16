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
session3 = load("data/tournaments/platform/events/2026-jo-session-3.json")
rankings = load("rankings.json")
clubs = load("clubs.json")
jo = load("data/tournaments/jo-results-2026.json")

if site.get("tournamentPlatformRelease") not in {"7.54.1", "7.54.2", "7.54.3", "7.54.4", "7.54.5", "7.54.6", "7.54.7", "7.54.8", "7.54.9", "7.54.10","7.54.11","7.54.17", "7.54.18","7.55.0", "7.55.1", "7.55.2", "7.55.4", "7.55.5", "7.55.6", "7.55.7", "7.55.8", "7.55.9", "7.56.0", "7.56.1", "7.56.2", "7.56.3", "7.56.4", "7.56.7", "7.56.8","7.56.9", "7.56.11", "7.56.12", "7.56.13","7.56.14", "7.56.15","7.57.0", "7.57.1", "7.57.2", "7.57.3", "7.57.4", "7.57.5", "7.57.6", "7.57.7", "7.57.8", "7.57.9", "7.57.10", "7.57.11", "7.57.12", "7.57.13", "7.57.14", "7.57.15", "7.57.16", "7.57.17", "7.57.18", "7.57.19", "7.57.20", "7.57.21", "7.57.22", "7.58.0", "7.58.1", "7.58.2", "7.58.3", "7.58.4","7.58.5","7.58.6","7.58.7","7.58.8", "7.58.9", "7.58.10", "7.59.0", "7.60.0","7.60.1","7.60.2","7.60.3", "7.61.0"}:
    errors.append("tournamentPlatformRelease must preserve 7.54.1")
if site.get("tournamentRegistryRelease") not in {"7.54.1", "7.54.2", "7.54.3", "7.54.4", "7.54.5", "7.54.6", "7.54.7", "7.54.8", "7.54.9", "7.54.10","7.54.11","7.54.17", "7.54.18","7.55.0", "7.55.1", "7.55.2", "7.55.4", "7.55.5", "7.55.6", "7.55.7", "7.55.8", "7.55.9", "7.56.0", "7.56.1", "7.56.2", "7.56.3", "7.56.4", "7.56.7", "7.56.8","7.56.9", "7.56.11", "7.56.12", "7.56.13","7.56.14", "7.56.15","7.57.0", "7.57.1", "7.57.2", "7.57.3", "7.57.4", "7.57.5", "7.57.6", "7.57.7", "7.57.8", "7.57.9", "7.57.10", "7.57.11", "7.57.12", "7.57.13", "7.57.14", "7.57.15", "7.57.16", "7.57.17", "7.57.18", "7.57.19", "7.57.20", "7.57.21", "7.57.22", "7.58.0", "7.58.1", "7.58.2", "7.58.3", "7.58.4","7.58.5","7.58.6","7.58.7","7.58.8", "7.58.9", "7.58.10", "7.59.0", "7.60.0","7.60.1","7.60.2","7.60.3", "7.61.0"}:
    errors.append("tournamentRegistryRelease must preserve 7.54.1")
if site.get("boysFuturesPlatformRelease") != "7.54.1":
    errors.append("boysFuturesPlatformRelease must remain 7.54.1")
if site.get("version") not in {"7.54.1", "7.54.2", "7.54.3", "7.54.4", "7.54.5", "7.54.6", "7.54.7", "7.54.8", "7.54.9", "7.54.10","7.54.11","7.54.12","7.54.13", "7.54.14", "7.54.15", "7.54.17", "7.54.18","7.55.0", "7.55.1", "7.55.2", "7.55.4", "7.55.5", "7.55.6", "7.55.7", "7.55.8", "7.55.9", "7.56.0", "7.56.1", "7.56.2", "7.56.3", "7.56.4", "7.56.7", "7.56.8","7.56.9", "7.56.11", "7.56.12", "7.56.13","7.56.14", "7.56.15","7.57.0", "7.57.1", "7.57.2", "7.57.3", "7.57.4", "7.57.5", "7.57.6", "7.57.7", "7.57.8", "7.57.9", "7.57.10", "7.57.11", "7.57.12", "7.57.13", "7.57.14", "7.57.15", "7.57.16", "7.57.17", "7.57.18", "7.57.19", "7.57.20", "7.57.21", "7.57.22", "7.58.0", "7.58.1", "7.58.2", "7.58.3", "7.58.4","7.58.5","7.58.6","7.58.7","7.58.8", "7.58.9", "7.58.10", "7.59.0", "7.60.0","7.60.1","7.60.2","7.60.3", "7.61.0"}:
    errors.append("site version must preserve the Boys Futures migration")
if registry.get("release") not in {"7.54.1", "7.54.2", "7.54.3", "7.54.4", "7.54.5", "7.54.6", "7.54.7", "7.54.8", "7.54.9", "7.54.10","7.54.11","7.54.17", "7.54.18","7.55.0", "7.55.1", "7.55.2", "7.55.4", "7.55.5", "7.55.6", "7.55.7", "7.55.8", "7.55.9", "7.56.0", "7.56.1", "7.56.2", "7.56.3", "7.56.4", "7.56.7", "7.56.8","7.56.9", "7.56.11", "7.56.12", "7.56.13","7.56.14", "7.56.15","7.57.0", "7.57.1", "7.57.2", "7.57.3", "7.57.4", "7.57.5", "7.57.6", "7.57.7", "7.57.8", "7.57.9", "7.57.10", "7.57.11", "7.57.12", "7.57.13", "7.57.14", "7.57.15", "7.57.16", "7.57.17", "7.57.18", "7.57.19", "7.57.20", "7.57.21", "7.57.22", "7.58.0", "7.58.1", "7.58.2", "7.58.3", "7.58.4","7.58.5","7.58.6","7.58.7","7.58.8", "7.58.9", "7.58.10", "7.59.0", "7.60.0","7.60.1","7.60.2","7.60.3", "7.61.0"} or len(registry.get("events", [])) != 10:
    errors.append("platform registry must contain ten registered events")
platform_live = [event for event in registry.get("events", []) if event.get("migrationStatus") == "platform_live"]
if {event.get("id") for event in platform_live} != {"2026-quiksilver-cup", "2026-girls-futures-super-finals", "2026-boys-futures-super-finals", "2025-evan-cousineau-memorial-cup", "2026-kap7-international", "2026-san-diego-county-cup", "2026-jo-session-3"}:
    errors.append("the seven approved reusable tournament experiences must remain platform-live")


expected_session3 = {"divisionCount": 8, "gameCount": 545, "finalGameCount": 464, "scheduledGameCount": 81, "teamCount": 138, "placementCount": 138}
for key, value in expected_session3.items():
    if session3.get("summary", {}).get(key) != value:
        errors.append(f"Session 3 {key} expected {value}, found {session3.get('summary', {}).get(key)}")
if session3.get("event", {}).get("clubLogosEnabled") is not False:
    errors.append("Session 3 platform must keep club logos disabled")
if session3.get("event", {}).get("sourceGap", {}).get("divisionId") != "12u-coed-championship":
    errors.append("Session 3 must disclose the 12U Coed source gap")

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
for token in ["data/tournaments/platform/runtime.js?v=7.54.17", "js/tournament-platform-v7-54-0.js?v=7.54.17"]:
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
print(" - Seven completed-event experiences share one reusable event registry and viewer")
print(" - Boys Futures includes 13 divisions, 709 finals, 276 clean team journeys, 238 placements, and 27 venues")
print(" - Bracket-route labels are merged into underlying team records and journeys")
print(" - Legacy URLs converge on the platform while rankings remain quarantined")
print(" - Session 3 adds 138 verified placements while the legacy 976-placement SoCal archive remains protected")
