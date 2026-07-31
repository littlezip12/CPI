#!/usr/bin/env python3
"""Build the verified 2026 KAP7 International tournament archive.

The supplied master file contains completed results for 18 divisions. Exact
placements are published only when the source identifies a placement game, an
official tied-placement game, or a complete unambiguous round robin. All other
teams retain records and complete game journeys without an inferred finish.
"""
from __future__ import annotations

import csv
import json
import re
from collections import defaultdict
from io import StringIO
from pathlib import Path

from tournament_pipeline import IdentityResolver, identity_normalize, normalize_csv

ROOT = Path(__file__).resolve().parents[1]
EVENT_ID = "2026-kap7-international"
RELEASE = "7.54.9"
GENERATED_AT = "2026-07-30T20:45:00-07:00"
SOURCE_DIR = ROOT / "data/tournaments/source" / EVENT_ID
MASTER = SOURCE_DIR / "master-by-division.csv"
RAW_DIR = ROOT / "data/tournaments/raw" / EVENT_ID
NORMALIZED_DIR = ROOT / "data/tournaments/normalized" / EVENT_ID
QA_DIR = ROOT / "data/tournaments/qa" / EVENT_ID
PLACEMENT_PATH = ROOT / "data/tournaments/archive" / f"{EVENT_ID}.json"
MANIFEST_PATH = ROOT / "data/tournaments/normalized/manifest.json"
REGISTRY_PATH = ROOT / "data/tournaments/registry.json"

MANUAL_CLUB_ALIASES = {
    "honolulu": "club-honolulu-water-polo",
    "honolulu blue": "club-honolulu-water-polo",
    "honolulu green": "club-honolulu-water-polo",
    "cal republic": "club-cal-rep",
    "devil s gate": "club-devils-gate",
}

EVENT = {
    "id": EVENT_ID,
    "name": "2026 KAP7 International",
    "kind": "tournament_results",
    "rankingEvidenceEnabled": False,
}

DIVISIONS = {
    "10U_COED_GOLD": ("10u-coed-gold", "10U Coed Gold", "10U", "Coed", "Gold", "D2"),
    "10U_COED_PLATINUM": ("10u-coed-platinum", "10U Coed Platinum", "10U", "Coed", "Platinum", "D1"),
    "10U_BOYS": ("10u-boys", "10U Boys", "10U", "Boys", "Open", "Open"),
    "12U_GIRLS_PLATINUM": ("12u-girls-platinum", "12U Girls Platinum", "12U", "Girls", "Platinum", "D1"),
    "12U_BOYS_GOLD": ("12u-boys-gold", "12U Boys Gold", "12U", "Boys", "Gold", "D2"),
    "12U_BOYS_PLATINUM": ("12u-boys-platinum", "12U Boys Platinum", "12U", "Boys", "Platinum", "D1"),
    "12U_COED": ("12u-coed", "12U Coed", "12U", "Coed", "Open", "Open"),
    "14U_GIRLS_GOLD": ("14u-girls-gold", "14U Girls Gold", "14U", "Girls", "Gold", "D2"),
    "14U_GIRLS_PLATINUM": ("14u-girls-platinum", "14U Girls Platinum", "14U", "Girls", "Platinum", "D1"),
    "14U_BOYS_SILVER": ("14u-boys-silver", "14U Boys Silver", "14U", "Boys", "Silver", "D3"),
    "14U_BOYS_GOLD": ("14u-boys-gold", "14U Boys Gold", "14U", "Boys", "Gold", "D2"),
    "14U_BOYS_PLATINUM": ("14u-boys-platinum", "14U Boys Platinum", "14U", "Boys", "Platinum", "D1"),
    "16U_BOYS_SILVER": ("16u-boys-silver", "16U Boys Silver", "16U", "Boys", "Silver", "D3"),
    "16U_BOYS_GOLD": ("16u-boys-gold", "16U Boys Gold", "16U", "Boys", "Gold", "D2"),
    "16U_BOYS_PLATINUM": ("16u-boys-platinum", "16U Boys Platinum", "16U", "Boys", "Platinum", "D1"),
    "19U_BOYS_SILVER": ("19u-boys-silver", "19U Boys Silver", "19U", "Boys", "Silver", "D3"),
    "19U_BOYS_GOLD": ("19u-boys-gold", "19U Boys Gold", "19U", "Boys", "Gold", "D2"),
    "19U_BOYS_PLATINUM": ("19u-boys-platinum", "19U Boys Platinum", "19U", "Boys", "Platinum", "D1"),
}


def dump(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def ordinal(number: int) -> str:
    if 10 <= number % 100 <= 20:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(number % 10, "th")
    return f"{number}{suffix}"


def clean_team_cell(value: str) -> str:
    text = re.sub(r"\s+", " ", str(value or "").strip())
    return text.replace("MISSON WPC", "MISSION WPC")


def csv_text(header: list[str], rows: list[list[str]]) -> str:
    out = StringIO()
    writer = csv.writer(out, lineterminator="\n")
    writer.writerow(header)
    writer.writerows(rows)
    return out.getvalue()


def apply_club_identity_fallback(normalized: dict, resolver: IdentityResolver) -> None:
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
            club_id = MANUAL_CLUB_ALIASES.get(value)
            if not club_id:
                club_id = next(
                    (club_id for alias, club_id in aliases if alias == value or (len(alias) >= 3 and value.startswith(alias + " "))),
                    None,
                )
            if club_id:
                participant["clubId"] = club_id
                participant["identityStatus"] = "resolved_club_only"
                participant["identityMatchType"] = "historical_club_alias"


def participant_map(data: dict) -> dict[str, dict]:
    return {
        participant["participantId"]: participant
        for game in data.get("games", [])
        for participant in game.get("participants", {}).values()
        if participant.get("participantId")
    }


def add_placement(
    rows: list[dict],
    place: int,
    participant: dict | None,
    source: str,
    *,
    place_label: str | None = None,
    subdivision: str | None = None,
    game_id: str | None = None,
) -> None:
    if not participant or not participant.get("participantId"):
        return
    key = (participant["participantId"], place_label or str(place), subdivision)
    if any((row.get("participantId"), row.get("placeLabel") or str(row.get("place")), row.get("subdivision")) == key for row in rows):
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


def add_exact_placement_games(data: dict, rows: list[dict]) -> None:
    for game in data.get("games", []):
        if game.get("status") != "final":
            continue
        stage = str(game.get("stage") or "").strip()
        lowered = stage.lower()
        place = None
        subdivision = None
        label_prefix = None
        exact = re.fullmatch(r"(?:overall\s+)?(\d+)(?:st|nd|rd|th)(?:\s+(coed))?", lowered)
        if exact:
            place = int(exact.group(1))
            if exact.group(2):
                subdivision = "Coed"
                label_prefix = "Coed"
        else:
            # 16U Boys Gold uses labels such as "1st 1stG/1stH" and
            # "3rd 2ndG/2ndH" for its overall medal games.
            leading = re.fullmatch(r"(1st|3rd)\s+(?:1st|2nd)[a-z0-9/]+", lowered)
            if leading:
                place = int(re.match(r"\d+", leading.group(1)).group())
        if place is None:
            continue
        by_id = {game["participants"][side].get("participantId"): game["participants"][side] for side in ("white", "dark")}
        outcome = game.get("outcome") or {}
        add_placement(
            rows,
            place,
            by_id.get(outcome.get("winnerParticipantId")),
            "placement_game",
            place_label=f"{label_prefix} {ordinal(place)}" if label_prefix else None,
            subdivision=subdivision,
            game_id=game.get("id"),
        )
        add_placement(
            rows,
            place + 1,
            by_id.get(outcome.get("loserParticipantId")),
            "placement_game",
            place_label=f"{label_prefix} {ordinal(place + 1)}" if label_prefix else None,
            subdivision=subdivision,
            game_id=game.get("id"),
        )


def add_tied_placement_games(data: dict, rows: list[dict]) -> None:
    """Publish the source's explicit tied-place format for 12U Boys Gold.

    Two parallel games marked "tie 5th" award both winners T-5th and both
    losers T-7th. The same structure repeats at 9th, 13th, 17th, and 21st.
    """
    for game in data.get("games", []):
        if game.get("status") != "final":
            continue
        match = re.fullmatch(r"tie\s+(\d+)(?:st|nd|rd|th)", str(game.get("stage") or "").strip().lower())
        if not match:
            continue
        place = int(match.group(1))
        by_id = {game["participants"][side].get("participantId"): game["participants"][side] for side in ("white", "dark")}
        outcome = game.get("outcome") or {}
        add_placement(rows, place, by_id.get(outcome.get("winnerParticipantId")), "official_tied_placement", place_label=f"T-{ordinal(place)}", game_id=game.get("id"))
        add_placement(rows, place + 2, by_id.get(outcome.get("loserParticipantId")), "official_tied_placement", place_label=f"T-{ordinal(place + 2)}", game_id=game.get("id"))


def add_10u_girls_round_robin(data: dict, rows: list[dict]) -> None:
    games = [game for game in data.get("games", []) if str(game.get("stage") or "").strip().lower() == "girls 1st-4th" and game.get("status") == "final"]
    ids = {game["participants"][side].get("participantId") for game in games for side in ("white", "dark")}
    ids.discard(None)
    if len(ids) != 4 or len(games) != 6:
        return
    state = {pid: {"wins": 0, "losses": 0, "ties": 0} for pid in ids}
    for game in games:
        outcome = game.get("outcome") or {}
        if outcome.get("kind") == "decided":
            state[outcome["winnerParticipantId"]]["wins"] += 1
            state[outcome["loserParticipantId"]]["losses"] += 1
        elif outcome.get("kind") == "tie":
            for side in ("white", "dark"):
                state[game["participants"][side]["participantId"]]["ties"] += 1
    records = [(row["wins"], row["losses"], row["ties"]) for row in state.values()]
    if len(set(records)) != len(ids):
        return
    pmap = participant_map(data)
    order = sorted(ids, key=lambda pid: (-state[pid]["wins"], state[pid]["losses"], -state[pid]["ties"], pmap[pid]["displayName"]))
    for index, pid in enumerate(order, start=1):
        add_placement(rows, index, pmap[pid], "complete_round_robin", place_label=f"Girls {ordinal(index)}", subdivision="Girls")


def build_placements(normalized: dict) -> list[dict]:
    rows: list[dict] = []
    add_exact_placement_games(normalized, rows)
    add_tied_placement_games(normalized, rows)
    if normalized.get("division", {}).get("id") == "10u-coed-gold":
        add_10u_girls_round_robin(normalized, rows)
    rows.sort(key=lambda row: ({"Coed": 0, "Girls": 1}.get(row.get("subdivision"), 2), row.get("place") or 999, row.get("placeLabel") or "", row.get("name") or ""))
    return rows


def upsert_registry_event() -> None:
    registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    divisions = []
    for source_key, meta in DIVISIONS.items():
        division_id, label, age_group, gender, division_name, tier = meta
        divisions.append({
            "id": division_id,
            "label": label,
            "season": "2026",
            "ageGroup": age_group,
            "gender": gender,
            "division": division_name,
            "divisionTier": tier,
            "parser": "results_table_v1",
            "sourceType": "uploaded_csv",
            "spreadsheetId": "user-upload-2026-kap7-international",
            "gid": division_id,
            "sourceUrl": f"data/tournaments/raw/{EVENT_ID}/{division_id}.csv",
            "sourceFile": f"data/tournaments/source/{EVENT_ID}/master-by-division.csv",
        })
    event = {
        "id": EVENT_ID,
        "name": "2026 KAP7 International",
        "shortName": "KAP7 International",
        "kind": "tournament_results",
        "syncEnabled": False,
        "publicPath": f"tournament.html?event={EVENT_ID}",
        "operationsMode": "historical_registered",
        "rankingEvidenceEnabled": False,
        "archiveSyncEnabled": True,
        "eventStatus": "complete",
        "archivePolicy": "bank_and_review",
        "platformEnabled": True,
        "platformRelease": RELEASE,
        "platformDataPath": f"data/tournaments/platform/events/{EVENT_ID}.json",
        "location": "Orange County, California",
        "sourcePolicy": "User-provided completed results; only verified exact or officially tied placements are published. All other teams retain records and complete journeys.",
        "divisions": divisions,
    }
    events = [row for row in registry.get("events", []) if row.get("id") != EVENT_ID]
    insert_at = next((index for index, row in enumerate(events) if row.get("id") == "2026-san-diego-county-cup"), len(events))
    events.insert(insert_at, event)
    registry["events"] = events
    dump(REGISTRY_PATH, registry)


def update_manifest(datasets: list[dict]) -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    existing = [row for row in manifest.get("datasets", []) if row.get("eventId") != EVENT_ID]
    existing.extend(datasets)
    counts = defaultdict(int)
    for row in existing:
        counts["datasets"] += 1
        for key in ("games", "finalGames", "scheduledGames", "zeroZeroPlaceholders", "partialScores", "blockers", "reviewItems"):
            counts[key] += int((row.get("counts") or {}).get(key) or 0)
    manifest.update({
        "release": RELEASE,
        "generatedAt": GENERATED_AT,
        "counts": dict(counts),
        "datasets": sorted(existing, key=lambda row: (row.get("eventId") or "", row.get("divisionId") or "")),
    })
    dump(MANIFEST_PATH, manifest)


def main() -> int:
    rows = list(csv.reader(MASTER.open(encoding="utf-8-sig")))
    header = rows[0][:10]
    by_division: dict[str, list[list[str]]] = defaultdict(list)
    for source_row in rows[1:]:
        if len(source_row) < 10 or not source_row[3].strip() or source_row[9] not in DIVISIONS:
            continue
        row = source_row[:10]
        row[4] = clean_team_cell(row[4])
        row[6] = clean_team_cell(row[6])
        by_division[row[9]].append(row)

    resolver = IdentityResolver()
    manifest_rows = []
    placement_groups = []
    total_games = total_final = total_placements = total_teams = 0
    unresolved = set()
    partial_rows = []

    for source_key, meta in DIVISIONS.items():
        division_id, label, age_group, gender, division_name, tier = meta
        text = csv_text(header, by_division[source_key])
        raw_path = RAW_DIR / f"{division_id}.csv"
        raw_path.parent.mkdir(parents=True, exist_ok=True)
        raw_path.write_text(text, encoding="utf-8")
        division = {
            "id": division_id,
            "label": label,
            "season": "2026",
            "ageGroup": age_group,
            "gender": gender,
            "division": division_name,
            "divisionTier": tier,
            "parser": "results_table_v1",
            "sourceType": "uploaded_csv",
            "spreadsheetId": "user-upload-2026-kap7-international",
            "gid": division_id,
            "sourceUrl": f"data/tournaments/raw/{EVENT_ID}/{division_id}.csv",
        }
        normalized, qa = normalize_csv(text, event=EVENT, division=division, resolver=resolver, fetched_at=GENERATED_AT, source_mode="user_uploaded_verified")
        apply_club_identity_fallback(normalized, resolver)
        for issue in qa.get("issues", []):
            if issue.get("code") == "partial_score":
                partial_rows.append({"divisionId": division_id, **issue})
        for game in normalized.get("games", []):
            for side in ("white", "dark"):
                participant = game.get("participants", {}).get(side) or {}
                if participant.get("kind") == "team" and not participant.get("clubId") and not participant.get("teamId"):
                    unresolved.add(participant.get("displayName"))
        dump(NORMALIZED_DIR / f"{division_id}.json", normalized)
        dump(QA_DIR / f"{division_id}.json", qa)
        placements = build_placements(normalized)
        for row in placements:
            row.update({"divisionId": division_id, "divisionLabel": label, "ageGroup": age_group, "gender": gender})
        placement_groups.append({"id": division_id, "label": label, "ageGroup": age_group, "gender": gender, "placements": placements})
        total_games += normalized["counts"]["games"]
        total_final += normalized["counts"]["finalGames"]
        total_placements += len(placements)
        total_teams += len({p.get("participantId") for game in normalized.get("games", []) for p in game.get("participants", {}).values() if p.get("kind") == "team" and p.get("participantId")})
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
            "officialTiesPreserved": True,
            "note": "Exact placements come only from explicit placement games, the source's official tied-placement games, or the complete unambiguous 10U Girls round robin. All other teams display records and complete journeys only.",
        },
        "sourceReviewNotes": {
            "partialScoreRows": partial_rows,
            "note": "10U Coed Gold game 10Cau32 has one missing score in the supplied master. It remains score-unavailable and does not create an inferred placement.",
        },
        "groups": placement_groups,
    })
    upsert_registry_event()
    update_manifest(manifest_rows)
    print("KAP7 INTERNATIONAL 2026 BUILD COMPLETE")
    print(f" - {len(DIVISIONS)} divisions, {total_games} games, {total_final} scored finals")
    print(f" - {total_teams} division-team journeys and {total_placements} verified placements")
    print(f" - {len(unresolved)} team labels remain unmatched to a verified WPI club identity")
    print(" - One partial score (10Cau32) is preserved as score unavailable; no finish is inferred")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
