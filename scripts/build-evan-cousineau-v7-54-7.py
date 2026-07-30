#!/usr/bin/env python3
"""Build the verified 2025 Evan Cousineau Memorial Cup tournament bank.

Only placements established by an official placement game, complete round robin,
provided footer, or cross-pool final are published. Other teams retain records
and game journeys without an inferred finish.
"""
from __future__ import annotations

import csv
import json
import re
from collections import defaultdict
from pathlib import Path

from tournament_pipeline import IdentityResolver, identity_normalize, normalize_csv

ROOT = Path(__file__).resolve().parents[1]
EVENT_ID = "2025-evan-cousineau-memorial-cup"
RELEASE = "7.54.7"
GENERATED_AT = "2026-07-29T21:10:00-07:00"
SOURCE_DIR = ROOT / "data/tournaments/source" / EVENT_ID
MASTER = SOURCE_DIR / "master-by-division.csv"
CORRECTION_10U = SOURCE_DIR / "10u-coed-platinum-gold.csv"
RAW_DIR = ROOT / "data/tournaments/raw" / EVENT_ID
NORMALIZED_DIR = ROOT / "data/tournaments/normalized" / EVENT_ID
QA_DIR = ROOT / "data/tournaments/qa" / EVENT_ID
PLACEMENT_PATH = ROOT / "data/tournaments/archive" / f"{EVENT_ID}.json"
MANIFEST_PATH = ROOT / "data/tournaments/normalized/manifest.json"

EVENT = {
    "id": EVENT_ID,
    "name": "2025 Evan Cousineau Memorial Cup",
    "kind": "tournament_results",
    "rankingEvidenceEnabled": False,
}

DIVISIONS = {
    "10U_COED_SILVER_&_GIRLS": ("10u-coed-silver-girls", "10U Coed Silver & Girls", "10U", "Coed", "Silver & Girls", "Mixed"),
    "10U_COED_PLATINUM_&_GOLD": ("10u-coed-platinum-gold", "10U Coed Platinum & Gold", "10U", "Coed", "Platinum & Gold", "Mixed"),
    "10U_BOYS": ("10u-boys", "10U Boys", "10U", "Boys", "Open", "Open"),
    "12U_GIRLS_GOLD": ("12u-girls-gold", "12U Girls Gold", "12U", "Girls", "Gold", "D2"),
    "12U_GIRLS_PLATINUM": ("12u-girls-platinum", "12U Girls Platinum", "12U", "Girls", "Platinum", "D1"),
    "12U_BOYS_SILVER": ("12u-boys-silver", "12U Boys Silver", "12U", "Boys", "Silver", "D3"),
    "12U_BOYS_GOLD": ("12u-boys-gold", "12U Boys Gold", "12U", "Boys", "Gold", "D2"),
    "12U_BOYS_PLATINUM": ("12u-boys-platinum", "12U Boys Platinum", "12U", "Boys", "Platinum", "D1"),
    "12U_COED": ("12u-coed", "12U Coed", "12U", "Coed", "Open", "Open"),
    "14U_GIRLS_GOLD": ("14u-girls-gold", "14U Girls Gold", "14U", "Girls", "Gold", "D2"),
    "14U_GIRLS_PLATINUM": ("14u-girls-platinum", "14U Girls Platinum", "14U", "Girls", "Platinum", "D1"),
    "14U_BOYS_SILVER": ("14u-boys-silver", "14U Boys Silver", "14U", "Boys", "Silver", "D3"),
    "14U_BOYS_GOLD": ("14u-boys-gold", "14U Boys Gold", "14U", "Boys", "Gold", "D2"),
    "14U_BOYS_PLATINUM": ("14u-boys-platinum", "14U Boys Platinum", "14U", "Boys", "Platinum", "D1"),
    "HS_GIRLS_A_&_B": ("hs-girls-a-b", "HS Girls A & B", "HS", "Girls", "A & B", "HS"),
}


def dump(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def normalize_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()


def clean_team_cell(value: str) -> str:
    text = re.sub(r"\s+", " ", str(value or "").strip())
    text = re.sub(r"\s+(?:pt|au)$", "", text, flags=re.I)
    return text.replace("J2(2ndE-MISSION WPC B", "J2(2ndE)-MISSION WPC B")




def apply_club_identity_fallback(normalized: dict, resolver: IdentityResolver) -> None:
    """Attach canonical club IDs when a historical team label adds color/coed text.

    Historical events predate the current season-scoped team registry, so a team
    may not resolve to a canonical 2026 team. Longest-prefix club matching keeps
    verified club identity and artwork without inventing a historical rank/team ID.
    """
    aliases = sorted(
        ((identity_normalize(alias), club_id) for alias, club_id in resolver.club_aliases.items() if club_id),
        key=lambda row: len(row[0]),
        reverse=True,
    )
    for game in normalized.get("games", []):
        for side in ("white", "dark"):
            participant = (game.get("participants") or {}).get(side) or {}
            if participant.get("clubId") or participant.get("kind") != "team":
                continue
            value = identity_normalize(participant.get("displayName") or participant.get("raw"))
            club_id = next(
                (club_id for alias, club_id in aliases if alias == value or (len(alias) >= 3 and value.startswith(alias + " "))),
                None,
            )
            if not club_id:
                continue
            participant["clubId"] = club_id
            participant["identityStatus"] = "resolved_club_only"
            participant["identityMatchType"] = "historical_club_alias"


def csv_text(header: list[str], rows: list[list[str]]) -> str:
    from io import StringIO
    out = StringIO()
    writer = csv.writer(out, lineterminator="\n")
    writer.writerow(header)
    writer.writerows(rows)
    return out.getvalue()


def participants(data: dict) -> dict[str, dict]:
    result = {}
    for game in data.get("games", []):
        for side in ("white", "dark"):
            participant = game.get("participants", {}).get(side) or {}
            if participant.get("participantId"):
                result[participant["participantId"]] = participant
    return result


def add_placement(rows: list[dict], place: int, participant: dict | None, source: str, *, place_label: str | None = None, subdivision: str | None = None, game_id: str | None = None) -> None:
    if not participant or not participant.get("participantId"):
        return
    key = (participant["participantId"], place_label or str(place))
    if any((row.get("participantId"), row.get("placeLabel") or str(row.get("place"))) == key for row in rows):
        return
    rows.append({
        "place": place,
        "placeLabel": place_label,
        "subdivision": subdivision,
        "name": participant.get("displayName"),
        "participantId": participant.get("participantId"),
        "teamId": participant.get("teamId"),
        "clubId": participant.get("clubId"),
        "source": source,
        "gameId": game_id,
    })


def add_explicit_placement_games(data: dict, rows: list[dict]) -> None:
    for game in data.get("games", []):
        stage = str(game.get("stage") or "").strip().lower()
        placement = (game.get("stageMeta") or {}).get("placement") or {}
        winner_place = placement.get("winnerPlace")
        loser_place = placement.get("loserPlace")
        if not winner_place:
            match = re.match(r"^(?:overall\s+)?(1st|3rd|5th|7th|9th|11th)(?:\s|$)", stage)
            if match:
                winner_place = int(re.match(r"\d+", match.group(1)).group())
                loser_place = winner_place + 1
        if not winner_place or game.get("status") != "final":
            continue
        by_id = {game["participants"][side]["participantId"]: game["participants"][side] for side in ("white", "dark")}
        outcome = game.get("outcome") or {}
        add_placement(rows, winner_place, by_id.get(outcome.get("winnerParticipantId")), "placement_game", game_id=game.get("id"))
        add_placement(rows, loser_place, by_id.get(outcome.get("loserParticipantId")), "placement_game", game_id=game.get("id"))


def add_complete_round_robin(data: dict, rows: list[dict], stage_fragment: str, start_place: int) -> bool:
    games = [game for game in data.get("games", []) if stage_fragment.lower() in str(game.get("stage") or "").lower()]
    ids = {game["participants"][side]["participantId"] for game in games for side in ("white", "dark")}
    if len(ids) < 2 or len(games) != len(ids) * (len(ids) - 1) // 2:
        return False
    state = {pid: {"wins": 0, "losses": 0, "ties": 0} for pid in ids}
    for game in games:
        outcome = game.get("outcome") or {}
        if outcome.get("kind") == "decided":
            state[outcome["winnerParticipantId"]]["wins"] += 1
            state[outcome["loserParticipantId"]]["losses"] += 1
        elif outcome.get("kind") == "tie":
            for side in ("white", "dark"):
                state[game["participants"][side]["participantId"]]["ties"] += 1
    records = [(value["wins"], value["losses"], value["ties"]) for value in state.values()]
    if len(set(records)) != len(ids):
        return False
    pmap = participants(data)
    order = sorted(ids, key=lambda pid: (-state[pid]["wins"], state[pid]["losses"], -state[pid]["ties"], pmap[pid]["displayName"]))
    for offset, pid in enumerate(order):
        add_placement(rows, start_place + offset, pmap[pid], "complete_round_robin")
    return True


def build_placements(normalized: dict) -> list[dict]:
    division_id = normalized["division"]["id"]
    rows: list[dict] = []
    add_explicit_placement_games(normalized, rows)
    if division_id == "10u-boys":
        add_complete_round_robin(normalized, rows, "F bracket (1st-3rd)", 1)
        add_complete_round_robin(normalized, rows, "E bracket (4th-6th)", 4)
        add_complete_round_robin(normalized, rows, "D bracket (7th-9th)", 7)
    elif division_id == "12u-coed":
        add_complete_round_robin(normalized, rows, "A bracket", 1)
    elif division_id == "14u-girls-platinum":
        add_complete_round_robin(normalized, rows, "5th-7th", 5)
    elif division_id == "hs-girls-a-b":
        for game in normalized.get("games", []):
            if str(game.get("stage") or "").lower() != "cross":
                continue
            refs = [str(game["participants"][side].get("sourceReference") or "") for side in ("white", "dark")]
            positions = [int(match.group(1)) for ref in refs if (match := re.match(r"(\d+)(?:st|nd|rd|th)[AB]$", ref, re.I))]
            if len(positions) != 2 or positions[0] != positions[1]:
                continue
            winner_place = positions[0] * 2 - 1
            by_id = {game["participants"][side]["participantId"]: game["participants"][side] for side in ("white", "dark")}
            outcome = game.get("outcome") or {}
            add_placement(rows, winner_place, by_id.get(outcome.get("winnerParticipantId")), "cross_pool_final", game_id=game.get("id"))
            add_placement(rows, winner_place + 1, by_id.get(outcome.get("loserParticipantId")), "cross_pool_final", game_id=game.get("id"))
    elif division_id == "10u-coed-platinum-gold":
        pmap = {normalize_name(row.get("displayName")): row for row in participants(normalized).values()}
        official = [
            (1, "NBWP BLUE COED", "Platinum 1st", "Platinum"),
            (2, "NORTH IRVINE BLACK COED", "Platinum 2nd", "Platinum"),
            (1, "ORANGE COUNTY WPC", "Gold 1st", "Gold"),
            (2, "LAMORINDA", "Gold 2nd", "Gold"),
            (3, "LONG BEACH VIKING", "Gold 3rd", "Gold"),
        ]
        for place, name, label, subdivision in official:
            add_placement(rows, place, pmap.get(normalize_name(name)), "official_footer", place_label=label, subdivision=subdivision)
    rows.sort(key=lambda row: ({"Platinum": 0, "Gold": 1}.get(row.get("subdivision"), 2), row.get("place") or 999, row.get("name") or ""))
    return rows


def update_manifest(datasets: list[dict]) -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    existing = [row for row in manifest.get("datasets", []) if row.get("eventId") != EVENT_ID]
    existing.extend(datasets)
    counts = defaultdict(int)
    for row in existing:
        counts["datasets"] += 1
        for key in ("games", "finalGames", "scheduledGames", "zeroZeroPlaceholders", "partialScores", "blockers", "reviewItems"):
            counts[key] += int((row.get("counts") or {}).get(key) or 0)
    manifest.update({"release": RELEASE, "generatedAt": GENERATED_AT, "counts": dict(counts), "datasets": sorted(existing, key=lambda row: (row.get("eventId") or "", row.get("divisionId") or ""))})
    dump(MANIFEST_PATH, manifest)


def main() -> None:
    rows = list(csv.reader(MASTER.open(encoding="utf-8-sig")))
    header = rows[0][:10]
    master_by_game = {row[3]: row[:10] for row in rows[1:] if len(row) >= 10 and row[3].strip()}
    for row in csv.reader(CORRECTION_10U.open(encoding="utf-8-sig")):
        if len(row) >= 10 and row[3] == "10Cptau09":
            master_by_game[row[3]] = row[:10]
    ordered = [master_by_game[row[3]] for row in rows[1:] if len(row) >= 10 and row[3].strip()]
    by_division: dict[str, list[list[str]]] = defaultdict(list)
    for source_row in ordered:
        row = source_row.copy()
        row[4] = clean_team_cell(row[4])
        row[6] = clean_team_cell(row[6])
        by_division[row[9]].append(row)

    resolver = IdentityResolver()
    manifest_rows = []
    placement_groups = []
    total_games = total_placements = 0
    for source_key, meta in DIVISIONS.items():
        division_id, label, age_group, gender, division_name, tier = meta
        text = csv_text(header, by_division[source_key])
        raw_path = RAW_DIR / f"{division_id}.csv"
        raw_path.parent.mkdir(parents=True, exist_ok=True)
        raw_path.write_text(text, encoding="utf-8")
        division = {
            "id": division_id,
            "label": label,
            "season": "2025",
            "ageGroup": age_group,
            "gender": gender,
            "division": division_name,
            "divisionTier": tier,
            "parser": "results_table_v1",
            "sourceType": "uploaded_csv",
            "spreadsheetId": "user-upload-2025-ec-cup",
            "gid": division_id,
            "sourceUrl": f"data/tournaments/raw/{EVENT_ID}/{division_id}.csv",
        }
        normalized, qa = normalize_csv(text, event=EVENT, division=division, resolver=resolver, fetched_at=GENERATED_AT, source_mode="user_uploaded_verified")
        apply_club_identity_fallback(normalized, resolver)
        dump(NORMALIZED_DIR / f"{division_id}.json", normalized)
        dump(QA_DIR / f"{division_id}.json", qa)
        placements = build_placements(normalized)
        for row in placements:
            row.update({"divisionId": division_id, "divisionLabel": label, "ageGroup": age_group, "gender": gender})
        placement_groups.append({"id": division_id, "label": label, "ageGroup": age_group, "gender": gender, "placements": placements})
        total_games += normalized["counts"]["games"]
        total_placements += len(placements)
        manifest_rows.append({
            "eventId": EVENT_ID,
            "divisionId": division_id,
            "path": f"data/tournaments/normalized/{EVENT_ID}/{division_id}.json",
            "sourceSha256": normalized["source"]["contentSha256"],
            "fetchedAt": normalized["source"]["fetchedAt"],
            "sourceMode": normalized["source"]["mode"],
            "counts": normalized["counts"],
        })

    dump(PLACEMENT_PATH, {
        "schemaVersion": 1,
        "release": RELEASE,
        "eventId": EVENT_ID,
        "eventName": EVENT["name"],
        "policy": {
            "publishOnlyVerifiedPlacements": True,
            "unplacedTeamsShowRecordOnly": True,
            "note": "Lower-place teams without an official placement game remain unranked and display only their tournament record and journey.",
        },
        "groups": placement_groups,
    })
    update_manifest(manifest_rows)
    print("EVAN COUSINEAU 2025 BUILD COMPLETE")
    print(f" - {len(DIVISIONS)} divisions and {total_games} verified final games")
    print(f" - {total_placements} verified placements; all other teams display record and journey only")
    print(" - 10U Coed missing score restored from the supplied individual bracket")


if __name__ == "__main__":
    main()
