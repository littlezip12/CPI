#!/usr/bin/env python3
"""Build the verified WPI archive placement file for 2026 JO Weekend 3.

Seven divisions retain complete scored results. The 12U Coed source still has
81 unscored games, but user-supplied final Platinum and Gold rankings now allow
WPI to publish verified finishes without inventing game scores or records.
"""
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NORMALIZED = ROOT / "data/tournaments/normalized/2026-jo-session-3"
OUTPUT = ROOT / "data/tournaments/archive/2026-jo-session-3.json"
RELEASE = "7.54.17"

DIVISIONS = {
    "10u-coed-championship": ("10U Coed Championship", "10U", "Coed"),
    "12u-coed-championship": ("12U Coed Championship", "12U", "Coed"),
    "14u-boys-championship": ("14U Boys Championship", "14U", "Boys"),
    "14u-girls-championship": ("14U Girls Championship", "14U", "Girls"),
    "16u-boys-championship": ("16U Boys Championship", "16U", "Boys"),
    "16u-girls-championship": ("16U Girls Championship", "16U", "Girls"),
    "18u-boys-championship": ("18U Boys Championship", "18U", "Boys"),
    "18u-girls-championship": ("18U Girls Championship", "18U", "Girls"),
}

NAME_FIXES = {
    "ORLANO THUNDER": "ORLANDO THUNDER",
    "CHICACO PARKS DISTRICT": "CHICAGO PARKS DISTRICT",
}

USER_CONFIRMED_FLIGHTS = {
    "12u-coed-championship": {
        "Platinum": [
            "HOUSTON HYDRA",
            "VIPER PIGEON BLUE",
            "PEAK POLO",
            "TEAM ORLANDO",
            "KRAKEN SATX POSEIDON",
            "GLADIATORS",
            "SOUTHLAKE",
            "ALAMO",
            "SWIM RVA",
            "PEGASUS RED",
            "SLAP",
            "KRAKEN SATX NEPTUNE",
        ],
        "Gold": [
            "PAC",
            "RISE",
            "STORM TYPHOONS",
            "FLEET",
            "ZILLA",
            "HOUSTON HYDRA WHITE",
            "THUNDER",
            "808",
            "VIPER PIGEON RED",
        ],
    },
    "14u-boys-championship": {
        "Platinum": [
            "TEAM ORLANDO",
            "WEST SUBURBAN",
            "HOUSTON HYDRA",
            "ROCKY MOUNTAIN WARRIORS",
            "NORCO",
            "ORLANDO THUNDER",
            "MIAMI WOLVERINES",
            "GLADIATORS",
            "PEAK POLO",
            "SLAP",
            "VP HILL COUNTRY",
            "VP HTOWN",
            "CHICAGO PARKS DISTRICT",
            "ALAMO",
            "FLEET",
            "RISE",
        ],
        "Gold": [
            "NORTHEAST ELITE",
            "STORM MONSOONS",
            "BCWP",
            "LONGHORN WHITE",
            "KRAKEN SATX",
            "Z TOWN",
            "PEAK POLO",
            "SLAP",
            "DISTRICT BLOSSOMS",
            "DAISY",
        ],
    },
}


def load(division_id: str) -> dict:
    return json.loads((NORMALIZED / f"{division_id}.json").read_text(encoding="utf-8"))


def dump(value: dict) -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def clean_name(value: str | None) -> str:
    text = re.sub(r"\s+", " ", str(value or "").strip())
    if "-" in text:
        prefix, suffix = text.rsplit("-", 1)
        if re.search(r"#|\(|\)|\]|\b(?:1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th|11th|12th)\b|^[A-Z]+\d", prefix, re.I):
            text = suffix.strip()
    return NAME_FIXES.get(text.upper(), text)


def ordinal(value: int) -> str:
    if 10 <= value % 100 <= 20:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(value % 10, "th")
    return f"{value}{suffix}"


def game_map(dataset: dict) -> dict[str, dict]:
    return {game["sourceGameId"]: game for game in dataset.get("games", [])}


def placement_row(
    division_id: str,
    place: int,
    name: str,
    source: str,
    game_id: str | None = None,
    note: str | None = None,
    subdivision: str | None = None,
    suppress_participant_link: bool = False,
) -> dict:
    label, age_group, gender = DIVISIONS[division_id]
    row = {
        "place": place,
        "placeLabel": f"{ordinal(place)} in {subdivision}" if subdivision else ordinal(place),
        "subdivision": subdivision,
        "name": clean_name(name),
        "participantId": None,
        "teamId": None,
        "clubId": None,
        "source": source,
        "gameId": game_id,
        "divisionId": division_id,
        "divisionLabel": label,
        "ageGroup": age_group,
        "gender": gender,
        "suppressParticipantLink": suppress_participant_link,
    }
    if note:
        row["note"] = note
    return row


def add_game_pair(
    rows: list[dict],
    division_id: str,
    games: dict[str, dict],
    source_game_id: str,
    winner_place: int,
    loser_place: int,
    source: str = "placement_game",
) -> None:
    game = games[source_game_id]
    if game.get("status") != "final":
        raise ValueError(f"{division_id} {source_game_id} is not final")
    outcome = game.get("outcome") or {}
    winner = clean_name(outcome.get("winnerName"))
    loser = clean_name(outcome.get("loserName"))
    if not winner or not loser:
        raise ValueError(f"{division_id} {source_game_id} has no decided outcome")
    rows.append(placement_row(division_id, winner_place, winner, source, game.get("id")))
    rows.append(placement_row(division_id, loser_place, loser, source, game.get("id")))


def round_robin_rows(division_id: str, games: dict[str, dict], game_ids: list[str], start_place: int) -> list[dict]:
    records: dict[str, dict[str, int]] = defaultdict(lambda: {"wins": 0, "losses": 0, "diff": 0, "scored": 0})
    for source_game_id in game_ids:
        game = games[source_game_id]
        if game.get("status") != "final":
            raise ValueError(f"{division_id} {source_game_id} is not final")
        white = clean_name(game["participants"]["white"].get("displayName"))
        dark = clean_name(game["participants"]["dark"].get("displayName"))
        white_score = game["scores"].get("white")
        dark_score = game["scores"].get("dark")
        if white_score is None or dark_score is None or white_score == dark_score:
            raise ValueError(f"{division_id} {source_game_id} cannot produce unambiguous standings")
        records[white]["scored"] += white_score
        records[dark]["scored"] += dark_score
        records[white]["diff"] += white_score - dark_score
        records[dark]["diff"] += dark_score - white_score
        if white_score > dark_score:
            records[white]["wins"] += 1
            records[dark]["losses"] += 1
        else:
            records[dark]["wins"] += 1
            records[white]["losses"] += 1
    ordered = sorted(records, key=lambda name: (-records[name]["wins"], -records[name]["diff"], -records[name]["scored"], name))
    for left, right in zip(ordered, ordered[1:]):
        if records[left]["wins"] == records[right]["wins"] and records[left]["diff"] == records[right]["diff"] and records[left]["scored"] == records[right]["scored"]:
            raise ValueError(f"{division_id} round robin remains tied: {left} / {right}")
    return [
        placement_row(
            division_id,
            start_place + index,
            name,
            "complete_round_robin",
            None,
            f"{records[name]['wins']}-{records[name]['losses']} in verified placement round robin",
        )
        for index, name in enumerate(ordered)
    ]


def user_confirmed_rows(division_id: str) -> list[dict]:
    rows: list[dict] = []
    for subdivision, names in USER_CONFIRMED_FLIGHTS[division_id].items():
        for place, name in enumerate(names, start=1):
            rows.append(
                placement_row(
                    division_id,
                    place,
                    name,
                    "user_confirmed_final_ranking",
                    subdivision=subdivision,
                    note="Final flight ranking supplied by the site owner after tournament completion.",
                    suppress_participant_link=(
                        division_id == "14u-boys-championship"
                        and subdivision == "Gold"
                        and name in {"PEAK POLO", "SLAP"}
                    ),
                )
            )
    return rows


def validate_flights(division_id: str, rows: list[dict]) -> None:
    expected = USER_CONFIRMED_FLIGHTS[division_id]
    for subdivision, names in expected.items():
        actual = [row for row in rows if row.get("subdivision") == subdivision]
        actual.sort(key=lambda row: row["place"])
        if [row["place"] for row in actual] != list(range(1, len(names) + 1)):
            raise ValueError(f"{division_id} {subdivision} placement range is incomplete")
        if [row["name"] for row in actual] != [clean_name(name) for name in names]:
            raise ValueError(f"{division_id} {subdivision} placement order changed")


def build_group(division_id: str) -> dict:
    label, age_group, gender = DIVISIONS[division_id]
    dataset = load(division_id)
    games = game_map(dataset)
    rows: list[dict] = []

    if division_id in USER_CONFIRMED_FLIGHTS:
        rows = user_confirmed_rows(division_id)
        validate_flights(division_id, rows)
        return {
            "id": division_id,
            "label": label,
            "ageGroup": age_group,
            "gender": gender,
            "status": "placement_complete_score_gap" if division_id == "12u-coed-championship" else "complete",
            "gameCount": len(dataset.get("games", [])),
            "finalGameCount": dataset.get("counts", {}).get("finalGames", 0),
            "placements": rows,
            "sourceNote": (
                "Final Platinum and Gold rankings are published from the site owner's post-event confirmation. "
                "The official source still contains no game scores, so records and game outcomes remain unavailable."
                if division_id == "12u-coed-championship"
                else "Final Platinum and Gold flight rankings are published from the site owner's post-event confirmation."
            ),
        }

    if division_id == "10u-coed-championship":
        for args in [("10C-022", 1, 2), ("10C-021", 3, 4), ("10C-020", 5, 6)]:
            add_game_pair(rows, division_id, games, *args)

    elif division_id == "14u-girls-championship":
        for args in [("14G-027", 1, 2), ("14G-026", 3, 4), ("14G-025", 5, 6)]:
            add_game_pair(rows, division_id, games, *args)
        rows.append(placement_row(division_id, 7, games["14G-022"]["outcome"]["loserName"], "placement_path", games["14G-022"]["id"]))

    elif division_id == "16u-girls-championship":
        for args in [("16G-048", 1, 2), ("16G-047", 3, 4), ("16G-046", 5, 6), ("16G-045", 7, 8), ("16G-044", 9, 10), ("16G-043", 11, 12)]:
            add_game_pair(rows, division_id, games, *args)

    elif division_id == "16u-boys-championship":
        for args in [("16B-090", 1, 2), ("16B-089", 3, 4), ("16B-087", 5, 6), ("16B-088", 7, 8), ("16B-083", 9, 10)]:
            add_game_pair(rows, division_id, games, *args)
        rows.extend(round_robin_rows(division_id, games, ["16B-76A", "16B-80A", "16B-084"], 11))
        for source_game_id, local_winner, local_loser in [("16B-092", 1, 2), ("16B-091", 3, 4), ("16B-086", 5, 6), ("16B-085", 7, 8), ("16B-082", 9, 10), ("16B-081", 11, 12)]:
            add_game_pair(rows, division_id, games, source_game_id, local_winner + 13, local_loser + 13, "placement_game_lower_flight")

    elif division_id == "18u-boys-championship":
        for args in [("18B-092", 1, 2), ("18B-091", 3, 4), ("18B-086", 5, 6), ("18B-085", 7, 8), ("18B-082", 9, 10), ("18B-081", 11, 12)]:
            add_game_pair(rows, division_id, games, *args)
        for source_game_id, local_winner, local_loser in [("18B-090", 1, 2), ("18B-089", 3, 4), ("18B-083", 5, 6), ("18B-088", 7, 8)]:
            add_game_pair(rows, division_id, games, source_game_id, local_winner + 12, local_loser + 12, "placement_game_lower_flight")
        for local_place, name in enumerate(["ZOO", "BCWP BLUE", "LONGHORN WHITE"], start=9):
            rows.append(placement_row(division_id, local_place + 12, name, "official_placement_footer", None))

    elif division_id == "18u-girls-championship":
        for args in [("18G-186", 1, 2), ("18G-185", 3, 4), ("18G-193", 5, 6), ("18G-178", 7, 8), ("18G-177", 9, 10), ("18G-181", 11, 12)]:
            add_game_pair(rows, division_id, games, *args)
        for source_game_id, local_winner, local_loser in [("18G-182", 1, 2), ("18G-191", 3, 4), ("18G-192", 5, 6)]:
            add_game_pair(rows, division_id, games, source_game_id, local_winner + 12, local_loser + 12, "placement_game_lower_flight")

    expected = {
        "10u-coed-championship": 6,
        "14u-girls-championship": 7,
        "16u-boys-championship": 25,
        "16u-girls-championship": 12,
        "18u-boys-championship": 23,
        "18u-girls-championship": 18,
    }[division_id]
    rows.sort(key=lambda row: row["place"])
    places = [row["place"] for row in rows]
    names = [row["name"].lower() for row in rows]
    if places != list(range(1, expected + 1)):
        raise ValueError(f"{division_id} placement range is incomplete: {places}")
    if len(names) != len(set(names)):
        raise ValueError(f"{division_id} contains duplicate placement identities")
    if dataset.get("counts", {}).get("finalGames") != len(dataset.get("games", [])):
        raise ValueError(f"{division_id} contains non-final games")
    return {
        "id": division_id,
        "label": label,
        "ageGroup": age_group,
        "gender": gender,
        "status": "complete",
        "gameCount": len(dataset.get("games", [])),
        "finalGameCount": dataset.get("counts", {}).get("finalGames", 0),
        "placements": rows,
    }


def main() -> int:
    groups = [build_group(division_id) for division_id in DIVISIONS]
    value = {
        "schemaVersion": 1,
        "release": RELEASE,
        "eventId": "2026-jo-session-3",
        "eventName": "2026 Junior Olympics Weekend 3",
        "policy": {
            "publishOnlyVerifiedPlacements": True,
            "unplacedTeamsShowScheduleOnly": True,
            "rankingEvidenceEnabled": False,
            "note": "Weekend 3 results are archived for public review and remain quarantined from WPI rankings. User-confirmed final rankings may publish even when underlying game scores are unavailable, but records and outcomes are never inferred.",
        },
        "sourceReviewNotes": {
            "reviewedAt": "2026-08-02",
            "placementCompleteDivisions": 8,
            "scoreCompleteDivisions": 7,
            "scoreGapDivisions": ["12u-coed-championship"],
            "finalGames": 464,
            "scheduledWithoutScores": 81,
            "verifiedPlacements": 138,
            "identityNormalizations": [
                "ORLANO THUNDER -> ORLANDO THUNDER (obvious source typo)",
                "CHICACO PARKS DISTRICT -> CHICAGO PARKS DISTRICT (obvious source typo)",
            ],
            "sourceDiscrepancies": [
                "The scored 14U Boys game 14B-120 lists Pegasus Red and Sierra Nevada, while the user-confirmed final Gold ranking places Peak Polo 7th and SLAP 8th. WPI preserves the scored game row but uses the confirmed final ranking for placement display.",
                "12U Coed includes all 81 scheduled games and bracket routing, but every score cell remains blank in the official source snapshot. Final Platinum and Gold rankings were supplied after the event; records remain unavailable.",
            ],
            "unresolvedIdentityPolicy": "National and tournament-only team labels remain source-faithful. THUNDER is not guessed as a specific club.",
        },
        "groups": groups,
    }
    dump(value)
    print("JO SESSION 3 ARCHIVE BUILD COMPLETE")
    print(" - 8 divisions, 545 scheduled games")
    print(" - 138 verified placements across all eight divisions")
    print(" - 7 divisions have 464 verified finals; 12U Coed retains 81 unscored games")
    print(" - 12U and 14U final rankings are separated into Platinum and Gold flights")
    print(" - Rankings remain manual and unchanged")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
