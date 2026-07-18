#!/usr/bin/env python3
"""Validate historical shootouts/placements and JO stage labels."""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def load(rel: str):
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))

def norm(value):
    return " ".join(str(value or "").upper().split())

def require(condition, message):
    if not condition:
        raise AssertionError(message)

quick = load("data/tournaments/normalized/2026-quiksilver-cup/14u-boys-championship.json")
games = quick.get("games", [])
require(len(games) == 40, f"Quiksilver 14U Boys should contain 40 games, found {len(games)}")

def team_games(name):
    key = norm(name)
    return [g for g in games if key in {norm(g["participants"]["white"].get("displayName")), norm(g["participants"]["dark"].get("displayName"))}]

def result_for(game, name):
    key = norm(name)
    outcome = game.get("outcome") or {}
    if norm(outcome.get("winnerName")) == key:
        return "W"
    if norm(outcome.get("loserName")) == key:
        return "L"
    return None

lamo = team_games("Lamorinda")
require(len(lamo) == 5, f"Lamorinda should have 5 Quiksilver games, found {len(lamo)}")
require(sum(result_for(g, "Lamorinda") == "W" for g in lamo) == 2, "Lamorinda should be 2-3, not missing or mixing games")
require(sum(result_for(g, "Lamorinda") == "L" for g in lamo) == 3, "Lamorinda should be 2-3, not missing or mixing games")
shootout = next((g for g in lamo if norm(g["participants"]["white"].get("displayName")) == "CC UNITED"), None)
require(shootout is not None, "Missing CC United vs Lamorinda placement game")
require(shootout.get("scores", {}).get("whiteRaw") == "7.5" and shootout.get("scores", {}).get("darkRaw") == "7.4", "CC United-Lamorinda official score should remain 7.5-7.4")
require(shootout.get("shootout", {}).get("whiteRegulation") == 7 and shootout.get("shootout", {}).get("darkRegulation") == 7, "Shootout regulation score should be 7-7")
require(shootout.get("shootout", {}).get("whiteShootout") == 5 and shootout.get("shootout", {}).get("darkShootout") == 4, "Shootout tally should be 5-4")
require((shootout.get("stageMeta") or {}).get("placement") == {"winnerPlace": 11, "loserPlace": 12}, "CC United-Lamorinda should be the 11th-place game")

lajolla = team_games("La Jolla United")
require(len(lajolla) == 5, f"La Jolla United should have 5 Quiksilver games, found {len(lajolla)}")
require(any((g.get("stageMeta") or {}).get("placement") == {"winnerPlace": 15, "loserPlace": 16} and result_for(g, "La Jolla United") == "W" for g in lajolla), "La Jolla should win the 15th-place shootout")

archive = load("data/tournaments/archive/index.json")
placements = [p for event in archive.get("events", []) if event.get("id") == "2026-quiksilver-cup" for division in event.get("divisions", []) if division.get("id") == "14u-boys-championship" for p in division.get("placements", [])]
place_by_team = {norm(p.get("name")): p.get("place") for p in placements}
for team, place in {"NorCal": 1, "Newport": 2, "CC United": 11, "Lamorinda": 12, "La Jolla United": 15, "Rancho Tsunami": 16}.items():
    require(place_by_team.get(norm(team)) == place, f"{team} should finish {place}, found {place_by_team.get(norm(team))}")

jo = load("data/tournaments/normalized/2026-jo-weekend-2/14u-boys-classic.json")
silver = next((g for g in jo.get("games", []) if str(g.get("sourceGameNumber")) == "149"), None)
require(silver is not None, "Missing 14U Boys Classic Game 149")
require((silver.get("stageMeta") or {}).get("bracketLabel") == "Silver", "Classic AG path should display as Silver")
require((silver.get("stageMeta") or {}).get("roundType") == "semifinal", "Game 149 should be recognized as a semifinal")
require("Silver bracket" in (silver.get("stageDisplay") or ""), "Game 149 should expose Silver bracket context")
bronze = next((g for g in jo.get("games", []) if (g.get("stageMeta") or {}).get("bracketCode") == "bz"), None)
require(bronze is not None and (bronze.get("stageMeta") or {}).get("bracketLabel") == "Bronze", "Classic BZ path should display as Bronze")

for g in games:
    require(g.get("dateIso"), f"Historical game {g.get('sourceGameNumber')} must have a real date")
    require(":" in str(g.get("timeLabel") or ""), f"Historical game {g.get('sourceGameNumber')} must have a real time")

print("TOURNAMENT RESULTS & STAGE VALIDATION PASSED")
print(" - Lamorinda has 5 Quicksilver games, a 2-3 record, and a 12th-place finish")
print(" - Decimal shootouts remain regulation-plus-penalty results, including 7.5-7.4")
print(" - NorCal/Newport and La Jolla/Rancho Tsunami placements resolve correctly")
print(" - JO Classic AG/BZ paths display as Silver/Bronze with round labels such as Semifinal")
