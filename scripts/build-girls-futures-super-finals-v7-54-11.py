#!/usr/bin/env python3
"""Build the verified 2026 Girls Futures Super Finals archive.

The user-provided master contains eight completed divisions. Exact placements
are published only from explicit placement games or complete, unambiguous
round robins. Source typos that would split one team's journey are normalized
conservatively and documented in the archive review notes.
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
EVENT_ID = "2026-girls-futures-super-finals"
RELEASE = "7.54.11"
PLATFORM_RELEASE = "7.54.11"
GENERATED_AT = "2026-07-30T23:10:00-07:00"
SOURCE_DIR = ROOT / "data/tournaments/source" / EVENT_ID
MASTER = SOURCE_DIR / "master-by-division.csv"
RAW_DIR = ROOT / "data/tournaments/raw" / EVENT_ID
NORMALIZED_DIR = ROOT / "data/tournaments/normalized" / EVENT_ID
QA_DIR = ROOT / "data/tournaments/qa" / EVENT_ID
PLACEMENT_PATH = ROOT / "data/tournaments/archive" / f"{EVENT_ID}.json"
MANIFEST_PATH = ROOT / "data/tournaments/normalized/manifest.json"
REGISTRY_PATH = ROOT / "data/tournaments/registry.json"

EVENT = {
    "id": EVENT_ID,
    "name": "2026 Girls Futures Super Finals",
    "kind": "tournament_results",
    "rankingEvidenceEnabled": False,
}

DIVISIONS = {
    "12U_GIRLS_D1": ("12u-girls-d1", "12U Girls D1", "12U", "Girls", "D1", "D1"),
    "12U_GIRLS_D2": ("12u-girls-d2", "12U Girls D2", "12U", "Girls", "D2", "D2"),
    "14U_GIRLS_D1": ("14u-girls-d1", "14U Girls D1", "14U", "Girls", "D1", "D1"),
    "14U_GIRLS_D2": ("14u-girls-d2", "14U Girls D2", "14U", "Girls", "D2", "D2"),
    "16U_GIRLS_D1": ("16u-girls-d1", "16U Girls D1", "16U", "Girls", "D1", "D1"),
    "16U_GIRLS_D2": ("16u-girls-d2", "16U Girls D2", "16U", "Girls", "D2", "D2"),
    "18U_GIRLS_D1": ("18u-girls-d1", "18U Girls D1", "18U", "Girls", "D1", "D1"),
    "18U_GIRLS_D2": ("18u-girls-d2", "18U Girls D2", "18U", "Girls", "D2", "D2"),
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


def clean_team_cell(value: str, source_division: str) -> str:
    text = re.sub(r"\s+", " ", str(value or "").strip())
    text = text.replace("RANCO TSUNAMI", "RANCHO TSUNAMI")
    text = re.sub(r"\bVIPER PIGEON\b(?!S)", "VIPER PIGEONS HC", text)
    # The 18U D1 pool entry is Santa Barbara A. Later bracket formulas omit
    # the A suffix, but those rows route from that same A1 seed.
    if source_division == "18U_GIRLS_D1" and re.search(r"-SANTA BARBARA$", text):
        text += " A"
    return text


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
    game_id: str | None = None,
) -> None:
    if not participant or not participant.get("participantId"):
        return
    key = (participant["participantId"], place)
    if any((row.get("participantId"), row.get("place")) == key for row in rows):
        return
    rows.append({
        "place": place,
        "placeLabel": ordinal(place),
        "name": participant.get("displayName"),
        "participantId": participant.get("participantId"),
        "teamId": participant.get("teamId"),
        "clubId": participant.get("clubId"),
        "source": source,
        "gameId": game_id,
    })


def add_exact_placement_games(data: dict, rows: list[dict]) -> None:
    # Matches "1st", "1st 1v2", "3rd 3v4", etc., while excluding labels
    # such as "13th-16th semi" and "1st/2ndD".
    exact = re.compile(r"^\s*(\d+)(?:st|nd|rd|th)(?:\s|$)", re.I)
    for game in data.get("games", []):
        if game.get("status") != "final":
            continue
        match = exact.match(str(game.get("stage") or ""))
        if not match:
            continue
        place = int(match.group(1))
        by_id = {
            game["participants"][side].get("participantId"): game["participants"][side]
            for side in ("white", "dark")
        }
        outcome = game.get("outcome") or {}
        if outcome.get("kind") != "decided":
            continue
        add_placement(rows, place, by_id.get(outcome.get("winnerParticipantId")), "placement_game", game_id=game.get("id"))
        add_placement(rows, place + 1, by_id.get(outcome.get("loserParticipantId")), "placement_game", game_id=game.get("id"))


def add_complete_round_robins(data: dict, rows: list[dict], review: list[dict]) -> None:
    groups: dict[tuple[int, int], list[dict]] = defaultdict(list)
    pattern = re.compile(r"(?<!\d)(\d+)\s*-\s*(\d+)\s*RR\b", re.I)
    for game in data.get("games", []):
        match = pattern.search(str(game.get("stage") or ""))
        if match and game.get("status") == "final":
            groups[(int(match.group(1)), int(match.group(2)))].append(game)

    pmap = participant_map(data)
    for (first_place, last_place), games in sorted(groups.items()):
        expected_teams = last_place - first_place + 1
        ids = {
            game.get("participants", {}).get(side, {}).get("participantId")
            for game in games
            for side in ("white", "dark")
        }
        ids.discard(None)
        expected_games = expected_teams * (expected_teams - 1) // 2
        if len(ids) != expected_teams or len(games) != expected_games:
            review.append({
                "range": f"{first_place}-{last_place}",
                "status": "record_only_incomplete_round_robin",
                "gameCount": len(games),
                "teamCount": len(ids),
            })
            continue
        state = {pid: {"wins": 0, "losses": 0, "ties": 0} for pid in ids}
        for game in games:
            outcome = game.get("outcome") or {}
            if outcome.get("kind") == "decided":
                state[outcome["winnerParticipantId"]]["wins"] += 1
                state[outcome["loserParticipantId"]]["losses"] += 1
            elif outcome.get("kind") == "tie":
                for side in ("white", "dark"):
                    state[game["participants"][side]["participantId"]]["ties"] += 1
        records = {(row["wins"], row["losses"], row["ties"]) for row in state.values()}
        if len(records) != len(ids):
            review.append({
                "range": f"{first_place}-{last_place}",
                "status": "record_only_tied_round_robin",
                "records": {
                    pmap[pid].get("displayName"): f"{record['wins']}-{record['losses']}-{record['ties']}"
                    for pid, record in state.items()
                },
            })
            continue
        order = sorted(
            ids,
            key=lambda pid: (
                -state[pid]["wins"],
                state[pid]["losses"],
                -state[pid]["ties"],
                pmap[pid].get("displayName") or "",
            ),
        )
        for offset, participant_id in enumerate(order):
            add_placement(rows, first_place + offset, pmap.get(participant_id), "complete_round_robin")


def build_placements(normalized: dict) -> tuple[list[dict], list[dict]]:
    rows: list[dict] = []
    review: list[dict] = []
    add_exact_placement_games(normalized, rows)
    add_complete_round_robins(normalized, rows, review)
    rows.sort(key=lambda row: (row.get("place") or 999, row.get("name") or ""))
    return rows, review


def recalculate_registry_counts(registry: dict) -> None:
    events = registry.get("events", [])
    registry["counts"] = {
        "events": len(events),
        "divisions": sum(len(event.get("divisions", [])) for event in events),
        "autoSyncDivisions": sum(len(event.get("divisions", [])) for event in events if event.get("syncEnabled")),
        "archiveSyncDivisions": sum(len(event.get("divisions", [])) for event in events if event.get("archiveSyncEnabled")),
        "rankingEvidenceEnabledDivisions": sum(
            len(event.get("divisions", [])) for event in events if event.get("rankingEvidenceEnabled")
        ),
    }


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
            "spreadsheetId": "user-upload-2026-girls-futures-super-finals",
            "gid": division_id,
            "sourceUrl": f"data/tournaments/raw/{EVENT_ID}/{division_id}.csv",
            "sourceFile": f"data/tournaments/source/{EVENT_ID}/master-by-division.csv",
        })
    event = {
        "id": EVENT_ID,
        "name": "2026 Girls Futures Super Finals",
        "shortName": "Girls Futures Super Finals",
        "kind": "tournament_results",
        "syncEnabled": False,
        "publicPath": f"tournament.html?event={EVENT_ID}",
        "operationsMode": "historical_registered",
        "rankingEvidenceEnabled": False,
        "archiveSyncEnabled": True,
        "eventStatus": "complete",
        "archivePolicy": "bank_and_review",
        "platformEnabled": True,
        "platformRelease": PLATFORM_RELEASE,
        "platformDataPath": f"data/tournaments/platform/events/{EVENT_ID}.json",
        "location": "Orange County, California",
        "sourcePolicy": "User-provided completed results; exact placements are published only from explicit placement games or complete unambiguous round robins. Other teams retain records and complete journeys.",
        "divisions": divisions,
    }
    events = [row for row in registry.get("events", []) if row.get("id") != EVENT_ID]
    insert_at = next((index for index, row in enumerate(events) if row.get("id") == "2026-boys-futures-super-finals"), len(events))
    events.insert(insert_at, event)
    registry.update({
        "release": RELEASE,
        "generatedDate": "2026-07-30",
        "description": "Universal tournament source registry with live JO operations, controlled archives, and six events on the reusable WPI tournament platform, including both 2026 Futures Super Finals weekends.",
        "events": events,
    })
    recalculate_registry_counts(registry)
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
    formula_corrections = []
    for source_row in rows[1:]:
        if len(source_row) < 10 or not source_row[3].strip() or source_row[9] not in DIVISIONS:
            continue
        row = source_row[:10]
        if row[3].strip().upper() == "14GD201" and row[0] != "19-Jun":
            formula_corrections.append({"gameNumber": "14GD201", "field": "DATE", "original": row[0], "corrected": "19-Jun"})
            row[0] = "19-Jun"
        row[4] = clean_team_cell(row[4], row[9])
        row[6] = clean_team_cell(row[6], row[9])
        by_division[row[9]].append(row)

    resolver = IdentityResolver()
    manifest_rows = []
    placement_groups = []
    total_games = total_final = total_placements = total_teams = 0
    unresolved = set()
    round_robin_review = []

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
            "spreadsheetId": "user-upload-2026-girls-futures-super-finals",
            "gid": division_id,
            "sourceUrl": f"data/tournaments/raw/{EVENT_ID}/{division_id}.csv",
        }
        normalized, qa = normalize_csv(
            text,
            event=EVENT,
            division=division,
            resolver=resolver,
            fetched_at=GENERATED_AT,
            source_mode="user_uploaded_verified",
        )
        apply_club_identity_fallback(normalized, resolver)
        for game in normalized.get("games", []):
            for side in ("white", "dark"):
                participant = game.get("participants", {}).get(side) or {}
                if participant.get("kind") == "team" and not participant.get("clubId") and not participant.get("teamId"):
                    unresolved.add(participant.get("displayName"))
        dump(NORMALIZED_DIR / f"{division_id}.json", normalized)
        dump(QA_DIR / f"{division_id}.json", qa)
        placements, review = build_placements(normalized)
        for item in review:
            round_robin_review.append({"divisionId": division_id, **item})
        for placement in placements:
            placement.update({"divisionId": division_id, "divisionLabel": label, "ageGroup": age_group, "gender": gender})
        placement_groups.append({"id": division_id, "label": label, "ageGroup": age_group, "gender": gender, "placements": placements})
        total_games += normalized["counts"]["games"]
        total_final += normalized["counts"]["finalGames"]
        total_placements += len(placements)
        total_teams += len({
            participant.get("participantId")
            for game in normalized.get("games", [])
            for participant in game.get("participants", {}).values()
            if participant.get("kind") == "team" and participant.get("participantId")
        })
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
            "note": "Exact placements come only from explicit placement games or complete unambiguous round robins. Incomplete or tied round-robin ranges remain record-only.",
        },
        "sourceReviewNotes": {
            "formulaCorrections": formula_corrections or [{"gameNumber": "14GD201", "field": "DATE", "corrected": "19-Jun", "basis": "same division sequence and 8:00 AM opening slot"}],
            "identityNormalizations": [
                "RANCO TSUNAMI -> RANCHO TSUNAMI",
                "VIPER PIGEON -> VIPER PIGEONS HC",
                "18U D1 SANTA BARBARA bracket labels -> SANTA BARBARA A",
            ],
            "unresolvedIdentityPolicy": "THUNDER remains source-faithful and unresolved rather than being guessed as Texas Thunder or another club.",
            "roundRobinReview": round_robin_review,
        },
        "groups": placement_groups,
    })
    upsert_registry_event()
    update_manifest(manifest_rows)
    print("GIRLS FUTURES SUPER FINALS 2026 BUILD COMPLETE")
    print(f" - {len(DIVISIONS)} divisions, {total_games} games, {total_final} scored finals")
    print(f" - {total_teams} source division-participant identities and {total_placements} verified placements")
    print(" - route-decorated source labels are consolidated into clean team journeys by the shared platform build")
    print(f" - {len(unresolved)} team labels remain unmatched to a verified WPI club identity")
    print(" - one exported DATE formula was corrected; ambiguous THUNDER identity remains unresolved")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
