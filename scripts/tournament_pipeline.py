#!/usr/bin/env python3
"""Shared CPI tournament ingestion and normalization helpers (release 7.49.1)."""
from __future__ import annotations

import csv
import hashlib
import io
import json
import re
import unicodedata
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parents[1]
RELEASE = "7.45.1"
SCHEMA_VERSION = 1
TIMEZONE = "America/Los_Angeles"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def normalize_space(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "").replace("\u00a0", " ")).strip()


def canonicalize_source_text(value: str) -> str:
    """Return deterministic UTF-8 text for hashing, parsing, and storage.

    Google CSV endpoints may emit LF or CRLF line endings on different tabs.
    Canonicalizing before hashing prevents validator mismatches after Python
    reads a stored file with universal-newline translation.
    """
    return str(value or "").lstrip("\ufeff").replace("\r\n", "\n").replace("\r", "\n")


def identity_normalize(value: Any) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = "".join(ch for ch in text if not unicodedata.combining(ch)).lower().replace("&", " and ")
    text = re.sub(r"^\s*#?\d+\s*[-–—:]\s+(?=[a-z])", "", text, flags=re.I)
    text = re.sub(r"\bwater\s+polo\s+club\b", "wpc", text)
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", text)).strip()


def slugify(value: Any) -> str:
    text = identity_normalize(value).replace(" ", "-")
    return text or "unknown"


class IdentityResolver:
    def __init__(self, index_path: Path | None = None):
        index_path = index_path or ROOT / "data" / "identity" / "index.json"
        data = load_json(index_path)
        self.release = data.get("release")
        self.clubs = data.get("clubs", {})
        self.teams = data.get("teams", {})
        self.club_aliases = data.get("clubAliasIndex", {})
        self.scoped = data.get("teamScopedAliasIndex", {})
        self.unscoped = data.get("teamUnscopedAliasIndex", {})
        override_path = ROOT / "config" / "tournament-identity-overrides.json"
        override_data = load_json(override_path) if override_path.exists() else {"teamOverrides": []}
        self.tournament_overrides = {
            "|".join([str(item.get("eventId", "")), str(item.get("divisionId", "")), identity_normalize(item.get("alias", ""))]): item.get("canonicalTeamId")
            for item in override_data.get("teamOverrides", [])
            if item.get("eventId") and item.get("divisionId") and item.get("alias") and item.get("canonicalTeamId")
        }

    def resolve_club(self, raw: str) -> dict[str, Any] | None:
        club_id = self.club_aliases.get(identity_normalize(raw))
        return self.clubs.get(club_id) if club_id else None

    def resolve_team(self, raw: str, *, season: str, age_group: str, gender: str, event_id: str = "", division_id: str = "") -> dict[str, Any] | None:
        normalized = identity_normalize(raw)
        if not normalized:
            return None
        override_key = "|".join([str(event_id), str(division_id), normalized])
        override_id = self.tournament_overrides.get(override_key)
        if override_id and override_id in self.teams:
            return {**self.teams[override_id], "_matchType": "tournament_override"}
        key = "|".join([str(season), str(age_group).lower(), str(gender).lower(), normalized])
        scoped_id = self.scoped.get(key)
        if scoped_id:
            return {**self.teams[scoped_id], "_matchType": "scoped_alias"}
        unscoped_id = self.unscoped.get(normalized)
        team = self.teams.get(unscoped_id) if unscoped_id else None
        if not team:
            return None
        if str(team.get("season", "")) != str(season):
            return None
        if str(team.get("ageGroup", "")).lower() != str(age_group).lower():
            return None
        if str(team.get("gender", "")).lower() != str(gender).lower():
            return None
        return {**team, "_matchType": "unique_unscoped_alias"}


PURE_BRACKET_RE = re.compile(r"^[WL]\s*(?:#\s*[A-Z0-9]+(?:/[A-Z0-9]+)?|\d[A-Z0-9]*(?:/[A-Z0-9]+)?)(?:\([^)]*\))?$", re.I)
PURE_SLOT_RE = re.compile(r"^(?:(?:ag|au|bz|cu|ni|pt)[_\s-]*[A-Z]{1,2}\d+(?:\([^)]*\))*|[A-Z]{1,4}\d*\s*\([^)]*\))$", re.I)
ORDINAL_SLOT_RE = re.compile(
    r"^\d+(?:st|nd|rd|th)[_\s-]*(?:(?:ag|au|bz|cu|ni|pt)[_\s-]*)?[A-Z](?:\d+)?(?:\s*\([WL]\d+[A-Z]?\))?$",
    re.I,
)
WL_SLOT_DESTINATION_RE = re.compile(
    r"^(?P<ref>[WL]\s*(?:#\s*[A-Z0-9]+(?:/[A-Z0-9]+)?|\d[A-Z0-9]*(?:/[A-Z0-9]+)?)(?:\([^)]*\))?)\s*[-:]\s*(?P<slot>.+)$",
    re.I,
)
SEED_RE = re.compile(r"^\s*#?(?P<seed>\d+)\s*[-–—:]\s*(?P<team>.+)$")
PLACEHOLDER_RE = re.compile(r"^(?:TBD|TBA|BYE|W|L|-|N/?A)$", re.I)

# A resolved tournament label often carries a bracket/pool reference before the
# real team name. The reference is preserved as metadata while only the team
# portion is sent through canonical identity resolution.
RESOLVED_PREFIXES = [
    # Historical result tables commonly prefix a resolved team with its pool
    # slot (A1-, H3-) or an advancement reference (W#Cross1-, L G#07-).
    # Preserve that source reference while resolving only the team text.
    re.compile(
        r"^(?P<ref>[A-Z]{1,4}\d{1,3})\s*[-:]\s*(?P<team>.+)$",
        re.I,
    ),
    re.compile(
        r"^(?P<ref>[WL]\s*(?:G\s*)?#?\s*[A-Z0-9/]+(?:\([^)]*\))?)\s*[-:]\s*(?P<team>.+)$",
        re.I,
    ),
    re.compile(
        r"^\(\s*(?P<ref>[WL]\s*#?\s*[A-Z0-9/]+(?:\([^)]*\))?|\d+(?:st|nd|rd|th)\s*[A-Z0-9_]*|[A-Z]{1,4}\d*\s*\([^)]*\))\s*\)\s*[-:]\s*(?P<team>.+)$",
        re.I,
    ),
    re.compile(
        r"^(?P<ref>[WL]\s*#?\s*[A-Z0-9/]+(?:\([^)]*\))?)\s*[-:]\s*(?P<team>.+)$",
        re.I,
    ),
    re.compile(
        r"^(?P<ref>[A-Z]{1,4}\d*\s*\((?P<meta>[^)]*)\))\s*[-:]\s*(?P<team>.+)$",
        re.I,
    ),
    re.compile(
        r"^(?P<ref>\d+(?:st|nd|rd|th)\s*(?:(?:ag|au|bz|cu|ni|pt)[_\s-]*)?[A-Z](?:\d+)?)\s*[-:]\s*(?P<team>.+)$",
        re.I,
    ),
    re.compile(r"^(?P<ref>(?:pt|au)[_\s-]*[A-Z]\d+)\s*[-:]\s*(?P<team>.+)$", re.I),
]


def bracket_slot_token(value: Any) -> bool:
    """Return True when a value is a bracket/pool slot rather than a team."""
    text = normalize_space(value).replace("–", "-").replace("—", "-").strip()
    if not text:
        return False
    text = text.rstrip("-: ").strip()
    if not text:
        return True
    if PLACEHOLDER_RE.fullmatch(text):
        return True
    if PURE_BRACKET_RE.fullmatch(text) or PURE_SLOT_RE.fullmatch(text) or ORDINAL_SLOT_RE.fullmatch(text):
        return True
    # Winner/loser destinations such as W29-3rdC and L25-2ndD are still
    # unresolved bracket slots. A suffix that is itself a slot cannot be a team.
    match = WL_SLOT_DESTINATION_RE.fullmatch(text)
    if match and bracket_slot_token(match.group("slot")):
        return True
    return False


def reference_seed(reference: str | None) -> int | None:
    """Extract a numeric tournament seed carried inside a source reference."""
    if not reference:
        return None
    match = re.search(r"\(\s*(\d+)\s*\)\s*$", reference)
    return int(match.group(1)) if match else None

JO_GAME_NUMBER_RE = re.compile(r"^\d+[A-Z]?$", re.I)
JO_GAME_ID_RE = re.compile(r"^[A-Z0-9_-]+-\d+[A-Z]?$", re.I)
HEADER_ALIASES = {
    "date": ["date"],
    "time": ["time"],
    "stage": ["type", "stage", "round", "comments", "comment"],
    "stage_detail": ["stage detail", "bracket stage", "bracket detail"],
    "venue": ["location", "venue", "site", "pool"],
    "game_number": ["gm #", "gm#", "game #", "game", "gm"],
    "white": ["white", "white team", "team 1", "team a", "home", "home team", "visitor", "visitor team"],
    "dark": ["dark", "dark team", "team 2", "team b", "away", "away team", "opponent", "opponent team"],
    "winner_to": ["w to #", "w to", "winner to", "win to"],
    "loser_to": ["l to #", "l to", "loser to", "loss to"],
    "game_id": ["gmid", "gm id", "game id", "gameid"],
}


def header_normalize(value: Any) -> str:
    return normalize_space(value).lstrip("\ufeff").lower()


def _first_header_index(headers: list[str], candidates: Iterable[str]) -> int:
    # Prefer exact header cells, but support official result sheets whose first
    # row combines tournament metadata and the actual header label in one cell,
    # e.g. "14U BOYS ... DATE" or "FOLLOW AND TAG! COMMENTS".
    for candidate in candidates:
        try:
            return headers.index(candidate)
        except ValueError:
            continue
    for candidate in candidates:
        pattern = re.compile(rf"(?:^|\s){re.escape(candidate)}\s*$", re.I)
        for index, value in enumerate(headers):
            if pattern.search(value):
                return index
    return -1


def detect_header(row: list[str]) -> dict[str, int] | None:
    headers = [header_normalize(x) for x in row]
    mapping = {name: _first_header_index(headers, aliases) for name, aliases in HEADER_ALIASES.items()}
    if mapping["white"] < 0 or mapping["dark"] < 0:
        return None
    white, dark = mapping["white"], mapping["dark"]
    # Some official JO sheets intentionally leave Date, Time, Gm #, W To, and
    # L To header cells blank while retaining a stable positional layout around
    # Type/Location/White/Dark/GMID. Infer only those missing indices.
    stage, venue, game_id = mapping["stage"], mapping["venue"], mapping["game_id"]
    # JO workbooks carry an unlabeled machine-readable stage token three cells
    # after GMID (for example ag_9-12 semi or bz_15th). Preserve it separately
    # from the human Type column so Classic Silver/Bronze paths can be labeled.
    if mapping.get("stage_detail", -1) < 0 and game_id >= 0 and game_id + 2 < len(headers):
        mapping["stage_detail"] = game_id + 2
    if mapping["date"] < 0 and stage >= 2:
        mapping["date"] = stage - 2
    if mapping["time"] < 0 and stage >= 1:
        mapping["time"] = stage - 1
    if mapping["game_number"] < 0 and venue >= 0 and white - venue >= 2:
        mapping["game_number"] = white - 1
    if game_id >= 2 and stage >= 0:
        if mapping["winner_to"] < 0:
            mapping["winner_to"] = game_id - 2
        if mapping["loser_to"] < 0:
            mapping["loser_to"] = game_id - 1
    winner_to = mapping["winner_to"]
    mapping["white_score"] = next((i for i, value in enumerate(headers) if value in {"white score", "home score", "team 1 score", "team a score", "w score", "score 1"}), -1)
    if mapping["white_score"] < 0:
        mapping["white_score"] = next((i for i, value in enumerate(headers) if white < i < dark and value in {"s", "score", "result"}), -1)
    mapping["dark_score"] = next((i for i, value in enumerate(headers) if value in {"dark score", "away score", "team 2 score", "team b score", "d score", "score 2"}), -1)
    if mapping["dark_score"] < 0:
        mapping["dark_score"] = next((i for i, value in enumerate(headers) if i > dark and (winner_to < 0 or i < winner_to) and value in {"s", "score", "result"}), -1)
    mapping["combined_score"] = next((i for i, value in enumerate(headers) if value in {"final score", "score/result", "result score"}), -1)
    # Completed-event result tables often leave the score headers blank while
    # retaining a stable WHITE, score, DARK, score positional layout. Infer
    # those columns only when they sit directly beside the team columns.
    if mapping["white_score"] < 0 and white + 1 < dark:
        mapping["white_score"] = white + 1
    if mapping["dark_score"] < 0 and dark + 1 < len(headers):
        mapping["dark_score"] = dark + 1
    if all(mapping[name] < 0 for name in ("date", "time", "game_number", "game_id", "stage", "venue", "white_score", "dark_score", "combined_score")):
        return None
    return mapping


def parse_csv_text(text: str) -> list[list[str]]:
    return [[normalize_space(cell) for cell in row] for row in csv.reader(io.StringIO(text.lstrip("\ufeff")))]


def parse_score(raw: Any) -> int | float | None:
    text = normalize_space(raw)
    if re.fullmatch(r"\d+", text):
        return int(text)
    if re.fullmatch(r"\d+\.\d+", text):
        return float(text)
    return None


def parse_score_components(raw: Any) -> dict[str, Any]:
    """Parse official scores, including decimal shootout notation.

    A value such as 7.5 means the game was tied 7-7 before penalties and the
    team scored five penalty shots. The decimal is an outcome notation, not a
    fractional goal, so regulation and shootout totals are stored separately.
    """
    text = normalize_space(raw)
    if re.fullmatch(r"\d+", text):
        value = int(text)
        return {"encoded": value, "regulation": value, "shootout": None, "raw": text}
    match = re.fullmatch(r"(?P<regulation>\d+)\.(?P<shootout>\d+)", text)
    if match:
        return {
            "encoded": float(text),
            "regulation": int(match.group("regulation")),
            "shootout": int(match.group("shootout")),
            "raw": text,
        }
    return {"encoded": None, "regulation": None, "shootout": None, "raw": text or None}


def classify_stage(stage: Any, stage_detail: Any, division: dict[str, Any]) -> dict[str, Any]:
    raw = normalize_space(stage)
    detail = normalize_space(stage_detail)
    source = detail or raw
    bracket_code = None
    bracket_label = None
    round_text = raw or detail
    match = re.match(r"^(?P<code>[A-Za-z]{2,3})[_-](?P<round>.+)$", detail)
    if match:
        bracket_code = match.group("code").lower()
        round_text = normalize_space(match.group("round").replace("_", " "))
    # USAWP Classic brackets use AG for Silver and BZ for Bronze. Keep unknown
    # codes raw rather than guessing at a medal/tier name.
    if str(division.get("divisionTier", "")).upper() == "D2" or str(division.get("division", "")).lower() == "classic":
        bracket_label = {"ag": "Silver", "bz": "Bronze"}.get(bracket_code)
    text = normalize_space(round_text)
    lowered = text.lower()
    if re.search(r"\bsemi(?:finals?)?\b", lowered):
        round_label = re.sub(r"\bsemi(?:finals?)?\b", "Semifinal", text, flags=re.I)
        round_type = "semifinal"
    elif re.search(r"\bqtr\b|\bquarter(?:finals?)?\b", lowered):
        round_label = re.sub(r"\bqtr\b|\bquarter(?:finals?)?\b", "Quarterfinal", text, flags=re.I)
        round_type = "quarterfinal"
    elif re.fullmatch(r"\d+(?:st|nd|rd|th)", lowered):
        round_label = f"{text} place game"
        round_type = "placement"
    elif re.search(r"\bplay[- ]?in\b", lowered):
        round_label = "Play-in"
        round_type = "play_in"
    elif re.search(r"\bgroup\b|\bpool\b", lowered):
        round_label = "Group play"
        round_type = "group"
    elif re.search(r"\brr\b|round robin", lowered):
        round_label = re.sub(r"\bRR\b", "round robin", text, flags=re.I)
        round_type = "round_robin"
    elif re.search(r"\b1st\b|championship|final", lowered):
        round_label = "Championship game" if re.fullmatch(r"1st", lowered) else text
        round_type = "final"
    else:
        round_label = text
        round_type = "other" if text else None
    placement = None
    ordinal = re.fullmatch(r"(?P<n>\d+)(?:st|nd|rd|th)", lowered)
    if ordinal:
        winner_place = int(ordinal.group("n"))
        placement = {"winnerPlace": winner_place, "loserPlace": winner_place + 1}
    range_match = re.search(r"(?P<start>\d+)\s*[-–—]\s*(?P<end>\d+)", text)
    placement_range = None
    if range_match:
        placement_range = {"start": int(range_match.group("start")), "end": int(range_match.group("end"))}
    display = " · ".join(part for part in ((f"{bracket_label} bracket" if bracket_label else None), round_label) if part)
    return {
        "raw": raw or None,
        "detailRaw": detail or None,
        "bracketCode": bracket_code,
        "bracketLabel": bracket_label,
        "roundType": round_type,
        "roundLabel": round_label or None,
        "placementRange": placement_range,
        "placement": placement,
        "displayLabel": display or raw or detail or None,
    }


def parse_combined_score(raw: Any) -> tuple[int | float | None, int | float | None]:
    text = normalize_space(raw)
    match = re.fullmatch(r"(\d+(?:\.\d+)?)\s*[-–—:]\s*(\d+(?:\.\d+)?)", text)
    if not match:
        return None, None
    left = float(match.group(1)) if "." in match.group(1) else int(match.group(1))
    right = float(match.group(2)) if "." in match.group(2) else int(match.group(2))
    return left, right


def parse_date_iso(raw: str, season: str) -> str | None:
    text = normalize_space(raw)
    for fmt in ("%d-%b-%Y", "%d-%b", "%m/%d/%Y", "%m/%d/%y", "%m/%d"):
        try:
            parsed = datetime.strptime(text, fmt)
            if "%Y" not in fmt and "%y" not in fmt:
                parsed = parsed.replace(year=int(season))
            return parsed.date().isoformat()
        except ValueError:
            pass
    return None


def parse_destination(raw: Any) -> dict[str, Any] | None:
    text = normalize_space(raw)
    if not text:
        return None
    if JO_GAME_NUMBER_RE.fullmatch(text):
        number: int | str = int(text) if text.isdigit() else text.upper()
        return {"kind": "game", "gameNumber": number, "raw": text}
    if re.fullmatch(r"\d+(?:st|nd|rd|th)", text, re.I):
        return {"kind": "placement", "placement": text.lower(), "raw": text}
    return {"kind": "slot", "slot": text, "raw": text}


def parse_participant(raw: Any, scope: dict[str, str], resolver: IdentityResolver) -> dict[str, Any]:
    original = normalize_space(raw).replace("–", "-").replace("—", "-")
    result: dict[str, Any] = {
        "raw": original,
        "kind": "empty" if not original else "unknown",
        "seed": None,
        "sourceReference": None,
        "displayName": None,
        "participantId": None,
        "teamId": None,
        "clubId": None,
        "rankingEligible": False,
        "identityStatus": "not_applicable" if not original else "unresolved",
        "identityMatchType": None,
    }
    if not original:
        return result
    if PLACEHOLDER_RE.fullmatch(original):
        result["kind"] = "placeholder"
        return result
    if bracket_slot_token(original):
        result.update({
            "kind": "bracket_reference",
            "sourceReference": re.sub(r"\s+", "", original.rstrip("-: ")),
            "identityStatus": "not_applicable",
        })
        return result

    source_reference = None
    source_seed = None
    team_text = original
    for pattern in RESOLVED_PREFIXES:
        match = pattern.match(team_text)
        if not match:
            continue
        candidate_team = normalize_space(match.group("team"))
        # Examples such as W29-3rdC are destinations, not resolved teams.
        if bracket_slot_token(candidate_team):
            result.update({
                "kind": "bracket_reference",
                "sourceReference": re.sub(r"\s+", "", original.rstrip("-: ")),
                "identityStatus": "not_applicable",
            })
            return result
        source_reference = normalize_space(match.group("ref"))
        source_seed = reference_seed(source_reference)
        team_text = candidate_team
        break

    seed_match = SEED_RE.match(team_text)
    seed = source_seed
    if seed_match:
        seed = int(seed_match.group("seed"))
        team_text = normalize_space(seed_match.group("team"))

    team_text = re.sub(r"\s*\(Seed-Team Name\)\s*$", "", team_text, flags=re.I).strip()
    if not team_text or PLACEHOLDER_RE.fullmatch(team_text) or bracket_slot_token(team_text):
        result.update({
            "kind": "bracket_reference" if source_reference or bracket_slot_token(team_text) else "placeholder",
            "sourceReference": source_reference or re.sub(r"\s+", "", original.rstrip("-: ")),
            "identityStatus": "not_applicable",
        })
        return result

    identity = resolver.resolve_team(
        team_text,
        season=scope["season"],
        age_group=scope["ageGroup"],
        gender=scope["gender"],
        event_id=scope.get("eventId", ""),
        division_id=scope.get("divisionId", ""),
    )
    club = resolver.resolve_club(team_text)
    participant_id = identity.get("id") if identity else f"tournament-team-{slugify(scope['season'])}-{slugify(scope['ageGroup'])}-{slugify(scope['gender'])}-{slugify(team_text)}"
    result.update({
        "kind": "team",
        "seed": seed,
        "sourceReference": source_reference,
        "displayName": identity.get("name") if identity else team_text,
        "participantId": participant_id,
        "teamId": identity.get("id") if identity else None,
        "clubId": identity.get("clubId") if identity else (club.get("id") if club else None),
        "rankingEligible": bool(identity),
        "identityStatus": "resolved_team" if identity else ("resolved_club_only" if club else "unresolved"),
        "identityMatchType": identity.get("_matchType") if identity else ("club_alias" if club else "tournament_only"),
    })
    return result


def participant_issue(participant: dict[str, Any], side: str, row_number: int) -> dict[str, Any] | None:
    if participant["kind"] == "team" and participant["identityStatus"] != "resolved_team":
        return {
            "severity": "review",
            "code": "unresolved_team_identity",
            "sourceRow": row_number,
            "side": side,
            "raw": participant["raw"],
            "cleanName": participant["displayName"],
            "identityStatus": participant["identityStatus"],
        }
    if participant["kind"] == "placeholder" and participant["raw"]:
        return {
            "severity": "info",
            "code": "placeholder_participant",
            "sourceRow": row_number,
            "side": side,
            "raw": participant["raw"],
        }
    return None


PLACEMENT_RE = re.compile(r"^(?P<number>\d+)(?:st|nd|rd|th)$", re.I)


def parse_placement_row(row: list[str], scope: dict[str, str], resolver: IdentityResolver, row_number: int) -> dict[str, Any] | None:
    """Extract explicit footer placements such as `1st, ARROYO GRANDE`."""
    for index, cell in enumerate(row):
        match = PLACEMENT_RE.fullmatch(normalize_space(cell))
        if not match:
            continue
        team_raw = next((normalize_space(value) for value in row[index + 1:] if normalize_space(value)), "")
        if not team_raw:
            return None
        participant = parse_participant(team_raw, scope, resolver)
        if participant.get("kind") != "team":
            return None
        return {
            "place": int(match.group("number")),
            "label": normalize_space(cell).lower(),
            "participant": participant,
            "sourceRow": row_number,
        }
    return None


def stable_game_id(event_id: str, division_id: str, source_game_id: str, game_number: Any, row: dict[str, Any]) -> str:
    preferred = normalize_space(source_game_id) or normalize_space(game_number)
    if preferred:
        suffix = slugify(preferred)
    else:
        basis = "|".join(normalize_space(row.get(k)) for k in ("date", "time", "venue", "white", "dark"))
        suffix = hashlib.sha1(basis.encode("utf-8")).hexdigest()[:12]
    return f"game-{slugify(event_id)}-{slugify(division_id)}-{suffix}"


def normalize_csv(
    text: str,
    *,
    event: dict[str, Any],
    division: dict[str, Any],
    resolver: IdentityResolver,
    fetched_at: str,
    source_mode: str,
) -> tuple[dict[str, Any], dict[str, Any]]:
    text = canonicalize_source_text(text)
    rows = parse_csv_text(text)
    mapping: dict[str, int] | None = None
    games: list[dict[str, Any]] = []
    placements: list[dict[str, Any]] = []
    issues: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    scope = {
        "season": division["season"],
        "ageGroup": division["ageGroup"],
        "gender": division["gender"],
        "eventId": event["id"],
        "divisionId": division["id"],
    }

    for row_number, row in enumerate(rows, start=1):
        candidate = detect_header(row)
        if candidate:
            if division.get("parser") == "results_table_v1":
                # Completed-event sheets commonly omit DATE and TIME labels in
                # repeated (and sometimes initial) headers while keeping the
                # stable DATE, TIME, LOCATION layout. Derive those columns from
                # LOCATION, not COMMENTS; otherwise DARK and its score can be
                # misread as date/time.
                header_cells = [header_normalize(x) for x in row]
                venue_index = candidate.get("venue", -1)
                if _first_header_index(header_cells, HEADER_ALIASES["date"]) < 0 and venue_index >= 2:
                    candidate["date"] = venue_index - 2
                if _first_header_index(header_cells, HEADER_ALIASES["time"]) < 0 and venue_index >= 1:
                    candidate["time"] = venue_index - 1
            mapping = candidate
            continue
        if not mapping:
            continue

        def get(name: str) -> str:
            idx = mapping.get(name, -1)
            return normalize_space(row[idx]) if idx is not None and idx >= 0 and idx < len(row) else ""

        raw_white, raw_dark = get("white"), get("dark")
        if division.get("parser") == "results_table_v1" and not raw_white and not raw_dark:
            placement = parse_placement_row(row, scope, resolver, row_number)
            if placement and not any(item.get("place") == placement.get("place") for item in placements):
                placements.append(placement)
            continue
        if not raw_white and not raw_dark:
            continue
        date_label, time_label = get("date"), get("time")
        game_number_raw, source_game_id = get("game_number"), get("game_id")
        if not game_number_raw and JO_GAME_ID_RE.fullmatch(source_game_id):
            inferred_number = source_game_id.rsplit("-", 1)[-1]
            if JO_GAME_NUMBER_RE.fullmatch(inferred_number):
                game_number_raw = inferred_number
        if not (date_label or time_label or game_number_raw or source_game_id):
            continue
        if division.get("parser") == "results_table_v1":
            if not (date_label and time_label and game_number_raw):
                continue
            if parse_date_iso(date_label, division["season"]) is None:
                continue
            if not re.fullmatch(r"\d{1,2}:\d{2}\s*(?:AM|PM)?", time_label, re.I):
                continue
        if division.get("parser") == "jo_bracket_v1":
            # JO workbooks contain seed/crossover tables beneath repeated schedule
            # headers. Only rows with a real date, time, game number, and GMID
            # are authoritative schedule records. Lettered games such as 5A
            # and 140A are valid and must remain distinct.
            if not date_label or not time_label:
                continue
            if not JO_GAME_NUMBER_RE.fullmatch(game_number_raw):
                continue
            if not JO_GAME_ID_RE.fullmatch(source_game_id):
                continue

        white = parse_participant(raw_white, scope, resolver)
        dark = parse_participant(raw_dark, scope, resolver)
        white_detail = parse_score_components(get("white_score"))
        dark_detail = parse_score_components(get("dark_score"))
        white_score, dark_score = white_detail["encoded"], dark_detail["encoded"]
        if white_score is None or dark_score is None:
            combined_white, combined_dark = parse_combined_score(get("combined_score"))
            if white_score is None and combined_white is not None:
                white_score = combined_white
                white_detail = parse_score_components(str(combined_white))
            if dark_score is None and combined_dark is not None:
                dark_score = combined_dark
                dark_detail = parse_score_components(str(combined_dark))
        complete_scores = white_score is not None and dark_score is not None
        zero_zero_placeholder = complete_scores and white_score == 0 and dark_score == 0
        if white_score is None and dark_score is None:
            score_state = "empty"
        elif white_score is None or dark_score is None:
            score_state = "partial"
        elif zero_zero_placeholder:
            score_state = "zero_zero_placeholder"
        else:
            score_state = "complete"
        status = "final" if score_state == "complete" else "scheduled"
        if score_state == "partial":
            issues.append({"severity": "review", "code": "partial_score", "sourceRow": row_number, "whiteScore": get("white_score"), "darkScore": get("dark_score")})
        if status == "final" and (white["kind"] != "team" or dark["kind"] != "team"):
            issues.append({"severity": "blocker", "code": "final_game_without_two_teams", "sourceRow": row_number, "white": raw_white, "dark": raw_dark})
        shootout = None
        if white_detail.get("shootout") is not None or dark_detail.get("shootout") is not None:
            shootout = {
                "occurred": True,
                "whiteRegulation": white_detail.get("regulation"),
                "darkRegulation": dark_detail.get("regulation"),
                "whiteShootout": white_detail.get("shootout"),
                "darkShootout": dark_detail.get("shootout"),
            }
        outcome: dict[str, Any] = {"kind": "pending", "winnerTeamId": None, "loserTeamId": None}
        if status == "final":
            if shootout and shootout.get("whiteShootout") is not None and shootout.get("darkShootout") is not None:
                white_won = shootout["whiteShootout"] > shootout["darkShootout"]
                winner = white if white_won else dark
                loser = dark if white_won else white
                outcome = {
                    "kind": "decided",
                    "decidedBy": "shootout",
                    "winnerParticipantId": winner.get("participantId"),
                    "winnerTeamId": winner.get("teamId"),
                    "winnerName": winner.get("displayName"),
                    "loserParticipantId": loser.get("participantId"),
                    "loserTeamId": loser.get("teamId"),
                    "loserName": loser.get("displayName"),
                }
            elif white_score == dark_score:
                outcome["kind"] = "tie"
            else:
                white_won = white_score > dark_score
                winner = white if white_won else dark
                loser = dark if white_won else white
                outcome = {
                    "kind": "decided",
                    "winnerParticipantId": winner.get("participantId"),
                    "winnerTeamId": winner.get("teamId"),
                    "winnerName": winner.get("displayName"),
                    "loserParticipantId": loser.get("participantId"),
                    "loserTeamId": loser.get("teamId"),
                    "loserName": loser.get("displayName"),
                }

        row_info = {"date": date_label, "time": time_label, "venue": get("venue"), "white": raw_white, "dark": raw_dark}
        game_id = stable_game_id(event["id"], division["id"], source_game_id, game_number_raw, row_info)
        if game_id in seen_ids:
            if division.get("parser") == "results_table_v1":
                # Some completed-event sheets reuse a visible GMID at different
                # venues. Preserve both real games and retain the duplicated
                # source ID as traceable metadata rather than dropping a row.
                disambiguator = hashlib.sha1("|".join(normalize_space(row_info.get(k)) for k in ("date", "time", "venue", "white", "dark")).encode("utf-8")).hexdigest()[:8]
                game_id = f"{game_id}-{disambiguator}"
                issues.append({"severity": "review", "code": "duplicate_source_game_id_disambiguated", "sourceRow": row_number, "sourceGameId": source_game_id or game_number_raw, "gameId": game_id})
            else:
                issues.append({"severity": "blocker", "code": "duplicate_game_id", "sourceRow": row_number, "gameId": game_id})
                continue
        seen_ids.add(game_id)

        for side, participant in (("white", white), ("dark", dark)):
            issue = participant_issue(participant, side, row_number)
            if issue:
                issues.append(issue)

        game_number = int(game_number_raw) if game_number_raw.isdigit() else (game_number_raw.upper() if game_number_raw else None)
        stage_meta = classify_stage(get("stage"), get("stage_detail"), division)
        games.append({
            "id": game_id,
            "eventId": event["id"],
            "divisionId": division["id"],
            "season": division["season"],
            "ageGroup": division["ageGroup"],
            "gender": division["gender"],
            "division": division["division"],
            "divisionTier": division.get("divisionTier", ""),
            "sourceGameId": source_game_id or None,
            "sourceGameNumber": game_number,
            "sourceRow": row_number,
            "dateLabel": date_label or None,
            "dateIso": parse_date_iso(date_label, division["season"]),
            "timeLabel": time_label or None,
            "timezone": TIMEZONE,
            "stage": get("stage") or None,
            "stageDisplay": stage_meta.get("displayLabel"),
            "stageMeta": stage_meta,
            "venue": get("venue") or None,
            "status": status,
            "scoreState": score_state,
            "participants": {"white": white, "dark": dark},
            "scores": {
                "white": white_score,
                "dark": dark_score,
                "whiteRaw": get("white_score") or None,
                "darkRaw": get("dark_score") or None,
                "whiteRegulation": white_detail.get("regulation"),
                "darkRegulation": dark_detail.get("regulation"),
                "whiteShootout": white_detail.get("shootout"),
                "darkShootout": dark_detail.get("shootout"),
            },
            "shootout": shootout,
            "outcome": outcome,
            "advancement": {"winnerTo": parse_destination(get("winner_to")), "loserTo": parse_destination(get("loser_to"))},
        })

    content_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
    participant_rows = [p for g in games for p in g["participants"].values()]
    team_participants = [p for p in participant_rows if p["kind"] == "team"]
    resolved = [p for p in team_participants if p["identityStatus"] == "resolved_team"]
    blockers = [x for x in issues if x["severity"] == "blocker"]
    reviews = [x for x in issues if x["severity"] == "review"]

    normalized = {
        "schemaVersion": SCHEMA_VERSION,
        "release": RELEASE,
        "identityRelease": resolver.release,
        "event": {"id": event["id"], "name": event["name"], "kind": event["kind"]},
        "division": {key: division.get(key) for key in ("id", "label", "season", "ageGroup", "gender", "division", "divisionTier", "parser")},
        "source": {
            "type": division["sourceType"],
            "spreadsheetId": division["spreadsheetId"],
            "gid": division["gid"],
            "sheetName": division.get("sheetName"),
            "url": division["sourceUrl"],
            "fetchedAt": fetched_at,
            "mode": source_mode,
            "contentSha256": content_hash,
            "rowCount": len(rows),
        },
        "counts": {
            "games": len(games),
            "finalGames": sum(g["status"] == "final" for g in games),
            "scheduledGames": sum(g["status"] == "scheduled" for g in games),
            "zeroZeroPlaceholders": sum(g.get("scoreState") == "zero_zero_placeholder" for g in games),
            "partialScores": sum(g.get("scoreState") == "partial" for g in games),
            "teamParticipants": len(team_participants),
            "resolvedTeamParticipants": len(resolved),
            "unresolvedTeamParticipants": len(team_participants) - len(resolved),
            "bracketReferences": sum(p["kind"] == "bracket_reference" for p in participant_rows),
            "placeholders": sum(p["kind"] == "placeholder" for p in participant_rows),
            "blockers": len(blockers),
            "reviewItems": len(reviews),
        },
        "placements": placements,
        "games": games,
    }
    qa = {
        "schemaVersion": SCHEMA_VERSION,
        "release": RELEASE,
        "eventId": event["id"],
        "divisionId": division["id"],
        "sourceSha256": content_hash,
        "summary": normalized["counts"],
        "issues": issues,
    }
    return normalized, qa


def registry_lookup(registry: dict[str, Any], event_id: str, division_id: str) -> tuple[dict[str, Any], dict[str, Any]]:
    event = next((x for x in registry.get("events", []) if x.get("id") == event_id), None)
    if not event:
        raise KeyError(f"Unknown event: {event_id}")
    division = next((x for x in event.get("divisions", []) if x.get("id") == division_id), None)
    if not division:
        raise KeyError(f"Unknown division {division_id} for {event_id}")
    return event, division


def all_registry_divisions(
    registry: dict[str, Any],
    *,
    sync_enabled_only: bool = False,
    archive_enabled_only: bool = False,
):
    for event in registry.get("events", []):
        if sync_enabled_only and not event.get("syncEnabled"):
            continue
        if archive_enabled_only and not event.get("archiveSyncEnabled"):
            continue
        for division in event.get("divisions", []):
            yield event, division
