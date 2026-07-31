#!/usr/bin/env python3
"""Build the verified 2026 San Diego County Cup tournament archive.

The source workbooks are wide published-sheet exports with multiple pool blocks.
This builder extracts only the divisions supplied by the user, excludes 10U
Girls/Coed, preserves source game numbering, and publishes placements only when
an official placement game or unambiguous bracket progression establishes them.
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
EVENT_ID = "2026-san-diego-county-cup"
RELEASE = "7.54.8"
GENERATED_AT = "2026-07-30T20:30:00-07:00"
SOURCE_DIR = ROOT / "data/tournaments/source" / EVENT_ID
RAW_DIR = ROOT / "data/tournaments/raw" / EVENT_ID
NORMALIZED_DIR = ROOT / "data/tournaments/normalized" / EVENT_ID
QA_DIR = ROOT / "data/tournaments/qa" / EVENT_ID
PLACEMENT_PATH = ROOT / "data/tournaments/archive" / f"{EVENT_ID}.json"
MANIFEST_PATH = ROOT / "data/tournaments/normalized/manifest.json"

EVENT = {
    "id": EVENT_ID,
    "name": "2026 San Diego County Cup",
    "kind": "tournament_results",
    "rankingEvidenceEnabled": False,
}

# source file, row start inclusive, row end exclusive, division metadata
DIVISIONS = [
    ("10u-boys", "10U Boys", "10U", "Boys", "Open", "Open", "10u-boys-source.csv", 0, 41),
    ("12u-boys-division-2", "12U Boys Division 2", "12U", "Boys", "Division 2", "D2", "12u-boys-source.csv", 0, 54),
    ("12u-boys-division-1", "12U Boys Division 1", "12U", "Boys", "Division 1", "D1", "12u-boys-source.csv", 54, 107),
    ("12u-girls-division-2", "12U Girls Division 2", "12U", "Girls", "Division 2", "D2", "12u-girls-source.csv", 0, 44),
    ("12u-girls-division-1", "12U Girls Division 1", "12U", "Girls", "Division 1", "D1", "12u-girls-source.csv", 44, 86),
    ("14u-girls-division-2", "14U Girls Division 2", "14U", "Girls", "Division 2", "D2", "14u-girls-source.csv", 0, 60),
    ("14u-girls-division-1", "14U Girls Division 1", "14U", "Girls", "Division 1", "D1", "14u-girls-source.csv", 60, 110),
    ("14u-boys-division-3", "14U Boys Division 3", "14U", "Boys", "Division 3", "D3", "14u-boys-source.csv", 0, 44),
    ("14u-boys-division-2", "14U Boys Division 2", "14U", "Boys", "Division 2", "D2", "14u-boys-source.csv", 44, 99),
    ("14u-boys-division-1", "14U Boys Division 1", "14U", "Boys", "Division 1", "D1", "14u-boys-source.csv", 99, 152),
]

TIME_RE = re.compile(r"^\d{1,2}:\d{2}\s*(?:AM|PM)$", re.I)
HEADER_RE = re.compile(r"^(FRIDAY|SATURDAY|SUNDAY),?\s+MAY\s+(\d+)\s+@\s+(.+)$", re.I)
ORDINAL_RE = re.compile(r"^(\d+)(?:st|nd|rd|th)$", re.I)

# Placement games that are unambiguous from the source's bracket legends but
# whose row does not repeat the ordinal label beside the game.
SUPPLEMENTAL_STAGE = {
    "12u-boys-division-2": {87: "13th", 88: "15th"},
    "12u-boys-division-1": {87: "13th", 94: "15th"},
    "14u-boys-division-2": {86: "13th", 87: "15th"},
    "12u-girls-division-1": {37: "3rd", 38: "1st"},
}


def dump(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def clean_team(value: str) -> str:
    text = re.sub(r"\s+", " ", str(value or "").strip())
    # Keep official team colors/designations while normalizing common truncated names.
    text = re.sub(r"\bSan Clem\b", "San Clemente", text, flags=re.I)
    return text


def clean_venue(value: str) -> str:
    text = re.sub(r"\s+", " ", str(value or "").strip()).upper()
    replacements = [
        (r"^SOUTH WESTERN COLLEGE", "SOUTHWESTERN COLLEGE"),
        (r"^LOMA VERDE(?: AQUATIC CENTER)?", "LOMA VERDE AQUATIC CENTER"),
        (r"^STANDLEY(?: AQUATIC CENTER)?$", "STANDLEY AQUATIC CENTER"),
        (r"^TIERRASANTA(?: COMMUNITY POOL)?$", "TIERRASANTA COMMUNITY POOL"),
    ]
    for pattern, replacement in replacements:
        text = re.sub(pattern, replacement, text, flags=re.I)
    return text


def stage_from_row(row: list[str], time_col: int, white: str, dark: str, division_id: str, game_no: int) -> str:
    supplemental = SUPPLEMENTAL_STAGE.get(division_id, {}).get(game_no)
    if supplemental:
        return supplemental
    candidates = []
    if time_col > 0:
        candidates.append(row[time_col - 1].strip())
    if time_col + 6 < len(row):
        candidates.append(row[time_col + 6].strip())
    for value in candidates:
        if ORDINAL_RE.fullmatch(value):
            return value.lower()
        if re.fullmatch(r"semi", value, re.I):
            return "Semifinal"
        if re.fullmatch(r"bronze", value, re.I):
            return "3rd"
        if re.fullmatch(r"gold", value, re.I):
            return "1st"
    refs = []
    for team in (white, dark):
        match = re.match(r"^([A-Z]{1,3})\d+\s*-\s*", team)
        if match:
            refs.append(match.group(1))
    if len(refs) == 2 and refs[0] == refs[1]:
        return f"{refs[0]} bracket"
    return "Tournament game"


def extract_games(path: Path, start: int, end: int, division_id: str) -> list[dict]:
    rows = list(csv.reader(path.open(encoding="utf-8-sig")))
    contexts: dict[int, dict] = {}
    games = []
    occurrence = defaultdict(int)
    for row_index, row in enumerate(rows[start:end], start):
        for col, cell in enumerate(row):
            match = HEADER_RE.match(cell.strip())
            if match:
                contexts[col] = {
                    "date": f"{int(match.group(2)):02d}-May-2026",
                    "venue": clean_venue(match.group(3)),
                }
        for col, cell in enumerate(row):
            time = cell.strip()
            if not TIME_RE.fullmatch(time) or col + 5 >= len(row):
                continue
            game_raw = row[col + 1].strip()
            if not game_raw.isdigit():
                continue
            white = clean_team(row[col + 2])
            dark = clean_team(row[col + 3])
            if not white or not dark:
                continue
            context = contexts.get(col)
            if not context:
                raise ValueError(f"Missing date/venue context for {division_id} row {row_index + 1}, column {col + 1}")
            game_no = int(game_raw)
            occurrence[game_no] += 1
            source_id = f"SDC-{division_id}-{game_no}"
            if occurrence[game_no] > 1:
                source_id += f"-{occurrence[game_no]}"
            games.append({
                "date": context["date"],
                "time": time,
                "stage": stage_from_row(row, col, white, dark, division_id, game_no),
                "venue": context["venue"],
                "gameNumber": game_no,
                "white": white,
                "whiteScore": row[col + 4].strip(),
                "dark": dark,
                "darkScore": row[col + 5].strip(),
                "gameId": source_id,
                "sourceRow": row_index + 1,
            })
    games.sort(key=lambda item: (item["date"], item["time"], item["gameNumber"], item["sourceRow"]))
    return games


def flattened_csv(games: list[dict]) -> str:
    output = StringIO()
    writer = csv.writer(output, lineterminator="\n")
    writer.writerow(["Date", "Time", "Type", "Location", "Gm #", "White", "White Score", "Dark", "Dark Score", "GMID"])
    for game in games:
        writer.writerow([
            game["date"], game["time"], game["stage"], game["venue"], game["gameNumber"],
            game["white"], game["whiteScore"], game["dark"], game["darkScore"], game["gameId"],
        ])
    return output.getvalue()


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


def add_placement(rows: list[dict], place: int, participant: dict | None, source: str, game_id: str | None) -> None:
    if not participant or not participant.get("participantId"):
        return
    if any(item.get("participantId") == participant["participantId"] for item in rows):
        return
    rows.append({
        "place": place,
        "placeLabel": None,
        "subdivision": None,
        "name": participant.get("displayName"),
        "participantId": participant.get("participantId"),
        "teamId": participant.get("teamId"),
        "clubId": participant.get("clubId"),
        "source": source,
        "gameId": game_id,
    })


def build_placements(normalized: dict) -> list[dict]:
    rows: list[dict] = []
    for game in normalized.get("games", []):
        placement = (game.get("stageMeta") or {}).get("placement") or {}
        winner_place = placement.get("winnerPlace")
        loser_place = placement.get("loserPlace")
        if not winner_place or game.get("status") != "final":
            continue
        by_id = {game["participants"][side].get("participantId"): game["participants"][side] for side in ("white", "dark")}
        outcome = game.get("outcome") or {}
        add_placement(rows, int(winner_place), by_id.get(outcome.get("winnerParticipantId")), "placement_game", game.get("id"))
        add_placement(rows, int(loser_place), by_id.get(outcome.get("loserParticipantId")), "placement_game", game.get("id"))
    rows.sort(key=lambda item: (item.get("place") or 999, item.get("name") or ""))
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
    manifest.update({
        "release": RELEASE,
        "generatedAt": GENERATED_AT,
        "counts": dict(counts),
        "datasets": sorted(existing, key=lambda row: (row.get("eventId") or "", row.get("divisionId") or "")),
    })
    dump(MANIFEST_PATH, manifest)


def main() -> int:
    resolver = IdentityResolver()
    manifest_rows = []
    placement_groups = []
    total_games = total_final = total_placements = total_teams = 0
    unresolved = set()
    duplicate_notes = []

    for division_id, label, age_group, gender, division_name, tier, filename, start, end in DIVISIONS:
        games = extract_games(SOURCE_DIR / filename, start, end, division_id)
        counts = defaultdict(int)
        for game in games:
            counts[game["gameNumber"]] += 1
        duplicates = sorted(number for number, count in counts.items() if count > 1)
        missing = sorted(number for number in range(min(counts), max(counts) + 1) if number not in counts)
        if duplicates or missing:
            duplicate_notes.append({"divisionId": division_id, "duplicateGameNumbers": duplicates, "missingGameNumbers": missing})

        text = flattened_csv(games)
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
            "spreadsheetId": "user-upload-2026-san-diego-county-cup",
            "gid": division_id,
            "sourceUrl": f"data/tournaments/raw/{EVENT_ID}/{division_id}.csv",
        }
        normalized, qa = normalize_csv(text, event=EVENT, division=division, resolver=resolver, fetched_at=GENERATED_AT, source_mode="user_uploaded_verified")
        apply_club_identity_fallback(normalized, resolver)
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
        total_teams += len({p.get("participantId") for g in normalized.get("games", []) for p in g.get("participants", {}).values() if p.get("kind") == "team" and p.get("participantId")})
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
            "excludedDivisions": ["10U Girls", "10U Coed"],
            "note": "Only positions established by a completed placement game or an unambiguous official bracket path are published. All other teams retain records and complete game journeys.",
        },
        "sourceNumberingNotes": duplicate_notes,
        "groups": placement_groups,
    })
    update_manifest(manifest_rows)
    print("SAN DIEGO COUNTY CUP 2026 BUILD COMPLETE")
    print(f" - {len(DIVISIONS)} divisions, {total_games} games, {total_final} scored finals")
    print(f" - {total_teams} division-team journeys and {total_placements} verified placements")
    print(f" - {len(unresolved)} team labels remain unmatched to a verified WPI club identity")
    if duplicate_notes:
        print(" - Source numbering note: both 12U Boys divisions repeat game 24 and omit game 72; unique WPI IDs preserve every row")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
