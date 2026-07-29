#!/usr/bin/env python3
"""Build JO division-finish and performance summaries from normalized final games.

The engine is deliberately read-only: it creates evidence for manual ranking review and
never edits published WPI rankings.
"""
from __future__ import annotations

import json
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
NORMALIZED_ROOT = ROOT / "data" / "tournaments" / "normalized"
REGISTRY = ROOT / "data" / "tournaments" / "registry.json"
RANKINGS = ROOT / "rankings.json"
OUT = ROOT / "data" / "tournaments" / "jo-performance" / "index.json"
RUNTIME = ROOT / "data" / "tournaments" / "jo-performance" / "runtime.js"
QA = ROOT / "qa" / "jo-performance-engine-7.45.0.json"
RELEASE = "7.45.0"
PLACEMENT_RE = re.compile(r"^\s*(\d+)(?:st|nd|rd|th)(?:\s+place)?\s*$", re.I)
SEED_PATTERNS = [
    re.compile(r"^\s*#?(\d+)\s*[-–—:]\s*"),
    re.compile(r"\((\d+)\)"),
]


def load(path: Path, default: Any = None) -> Any:
    if not path.exists():
        return {} if default is None else default
    return json.loads(path.read_text(encoding="utf-8"))


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def numeric_seed(participant: dict[str, Any]) -> int | None:
    seed = participant.get("seed")
    if isinstance(seed, int) and seed > 0:
        return seed
    for value in (participant.get("sourceReference"), participant.get("raw")):
        text = str(value or "")
        for pattern in SEED_PATTERNS:
            match = pattern.search(text)
            if match:
                number = int(match.group(1))
                return number if number > 0 else None
    return None


def placement_start(stage: str | None) -> int | None:
    match = PLACEMENT_RE.fullmatch(str(stage or ""))
    return int(match.group(1)) if match else None


def result_for_side(game: dict[str, Any], side: str) -> str | None:
    if game.get("status") != "final":
        return None
    white = game.get("scores", {}).get("white")
    dark = game.get("scores", {}).get("dark")
    if not isinstance(white, (int, float)) or not isinstance(dark, (int, float)):
        return None
    if white == dark:
        return "T"
    won = white > dark
    if side == "dark":
        won = not won
    return "W" if won else "L"


def participant_key(participant: dict[str, Any]) -> str | None:
    return participant.get("participantId") or participant.get("teamId")


def result_strength(row: dict[str, Any], win: bool) -> tuple:
    rank = row.get("opponentRank")
    seed = row.get("opponentSeed")
    margin = row.get("margin") or 0
    if win:
        return (0 if isinstance(rank, int) else 1, rank if isinstance(rank, int) else 9999,
                0 if isinstance(seed, int) else 1, seed if isinstance(seed, int) else 9999, -margin)
    return (0 if isinstance(rank, int) else 1, -(rank if isinstance(rank, int) else -9999),
            0 if isinstance(seed, int) else 1, -(seed if isinstance(seed, int) else -9999), margin)


def build(normalized_files: list[Path] | None = None) -> dict[str, Any]:
    registry = load(REGISTRY)
    rankings = load(RANKINGS, [])
    rank_by_team = {row.get("canonicalTeamId"): row for row in rankings if row.get("canonicalTeamId")}
    registry_lookup: dict[tuple[str, str], dict[str, Any]] = {}
    for event in registry.get("events", []):
        if event.get("kind") != "junior_olympics":
            continue
        for division in event.get("divisions", []):
            registry_lookup[(event.get("id"), division.get("id"))] = {**division, "eventName": event.get("name"), "publicPath": event.get("publicPath")}

    if normalized_files is None:
        normalized_files = sorted(NORMALIZED_ROOT.glob("2026-jo-weekend-*/*.json"))

    team_rows: dict[str, dict[str, Any]] = {}
    division_rows: list[dict[str, Any]] = []
    unique_final_games: set[str] = set()
    inferred_placements: dict[tuple[str, str, str], dict[str, Any]] = {}

    for path in normalized_files:
        data = load(path)
        event = data.get("event", {})
        division = data.get("division", {})
        event_id = event.get("id")
        division_id = division.get("id")
        if event.get("kind") != "junior_olympics" or not event_id or not division_id:
            continue
        config = registry_lookup.get((event_id, division_id), {})
        games = data.get("games", [])
        final_games = [game for game in games if game.get("status") == "final"]
        unique_final_games.update(str(game.get("id")) for game in final_games if game.get("id"))
        placement_games = 0

        for game in games:
            stage_place = placement_start(game.get("stage"))
            if game.get("status") == "final" and stage_place is not None and game.get("outcome", {}).get("kind") == "decided":
                winner_id = game.get("outcome", {}).get("winnerParticipantId")
                loser_id = game.get("outcome", {}).get("loserParticipantId")
                if winner_id and loser_id:
                    placement_games += 1
                    inferred_placements[(event_id, division_id, winner_id)] = {
                        "placement": stage_place,
                        "gameId": game.get("id"),
                        "stage": game.get("stage"),
                        "method": "placement_game",
                    }
                    inferred_placements[(event_id, division_id, loser_id)] = {
                        "placement": stage_place + 1,
                        "gameId": game.get("id"),
                        "stage": game.get("stage"),
                        "method": "placement_game",
                    }

            for side in ("white", "dark"):
                participant = game.get("participants", {}).get(side, {})
                if participant.get("kind") != "team":
                    continue
                pid = participant_key(participant)
                if not pid:
                    continue
                opponent_side = "dark" if side == "white" else "white"
                opponent = game.get("participants", {}).get(opponent_side, {})
                row = team_rows.setdefault(pid, {
                    "participantId": pid,
                    "canonicalTeamId": participant.get("teamId"),
                    "canonicalClubId": participant.get("clubId"),
                    "name": participant.get("displayName"),
                    "season": game.get("season"),
                    "ageGroup": game.get("ageGroup"),
                    "gender": game.get("gender"),
                    "group": f"{game.get('ageGroup')} {game.get('gender')}",
                    "rankingEligible": bool(participant.get("rankingEligible")),
                    "currentRank": None,
                    "currentCPI": None,
                    "teamPage": None,
                    "appearances": {},
                    "finalGames": [],
                })
                canonical = rank_by_team.get(row.get("canonicalTeamId"), {})
                if canonical:
                    row["currentRank"] = canonical.get("postRank")
                    row["currentCPI"] = canonical.get("postCPI")
                    row["teamPage"] = canonical.get("teamPage")
                    row["name"] = canonical.get("team") or row["name"]

                appearance_key = f"{event_id}/{division_id}"
                appearance = row["appearances"].setdefault(appearance_key, {
                    "eventId": event_id,
                    "eventName": event.get("name") or config.get("eventName"),
                    "divisionId": division_id,
                    "divisionLabel": division.get("label") or config.get("label"),
                    "divisionTier": division.get("divisionTier") or config.get("divisionTier"),
                    "sourceUrl": data.get("source", {}).get("url") or config.get("sourceUrl"),
                    "publicPath": config.get("publicPath"),
                    "seed": numeric_seed(participant),
                    "scheduledGames": 0,
                    "finalGames": 0,
                    "wins": 0,
                    "losses": 0,
                    "ties": 0,
                    "goalsFor": 0,
                    "goalsAgainst": 0,
                    "goalDifference": 0,
                    "confirmedPlacement": None,
                    "placementMethod": None,
                    "placementGameId": None,
                    "seedDelta": None,
                })
                if appearance.get("seed") is None:
                    appearance["seed"] = numeric_seed(participant)
                if game.get("status") == "scheduled":
                    appearance["scheduledGames"] += 1
                    continue

                result = result_for_side(game, side)
                if not result:
                    continue
                white_score = game.get("scores", {}).get("white")
                dark_score = game.get("scores", {}).get("dark")
                score_for = white_score if side == "white" else dark_score
                score_against = dark_score if side == "white" else white_score
                appearance["finalGames"] += 1
                appearance["goalsFor"] += int(score_for)
                appearance["goalsAgainst"] += int(score_against)
                appearance["goalDifference"] = appearance["goalsFor"] - appearance["goalsAgainst"]
                if result == "W": appearance["wins"] += 1
                elif result == "L": appearance["losses"] += 1
                else: appearance["ties"] += 1

                opponent_pid = participant_key(opponent)
                opponent_rank = rank_by_team.get(opponent.get("teamId"), {}).get("postRank")
                game_row = {
                    "gameId": game.get("id"),
                    "eventId": event_id,
                    "divisionId": division_id,
                    "divisionLabel": appearance.get("divisionLabel"),
                    "stage": game.get("stage"),
                    "dateIso": game.get("dateIso"),
                    "result": result,
                    "scoreFor": score_for,
                    "scoreAgainst": score_against,
                    "margin": int(score_for) - int(score_against),
                    "opponentParticipantId": opponent_pid,
                    "opponentTeamId": opponent.get("teamId"),
                    "opponentName": opponent.get("displayName"),
                    "opponentSeed": numeric_seed(opponent),
                    "opponentRank": opponent_rank,
                    "sourceUrl": appearance.get("sourceUrl"),
                }
                row["finalGames"].append(game_row)

        division_rows.append({
            "eventId": event_id,
            "eventName": event.get("name") or config.get("eventName"),
            "divisionId": division_id,
            "divisionLabel": division.get("label") or config.get("label"),
            "ageGroup": division.get("ageGroup"),
            "gender": division.get("gender"),
            "divisionTier": division.get("divisionTier"),
            "scheduledGames": len(games) - len(final_games),
            "finalGames": len(final_games),
            "totalGames": len(games),
            "confirmedPlacementGames": placement_games,
            "status": "not_started" if not final_games else ("complete" if len(final_games) == len(games) else "in_progress"),
            "sourceUrl": data.get("source", {}).get("url") or config.get("sourceUrl"),
            "publicPath": config.get("publicPath"),
        })

    over_seed = under_seed = on_seed = 0
    confirmed = 0
    output_teams: list[dict[str, Any]] = []
    for pid, row in team_rows.items():
        appearances = []
        for key, appearance in sorted(row.pop("appearances").items()):
            event_id, division_id = key.split("/", 1)
            placement = inferred_placements.get((event_id, division_id, pid))
            if placement:
                confirmed += 1
                appearance["confirmedPlacement"] = placement["placement"]
                appearance["placementMethod"] = placement["method"]
                appearance["placementGameId"] = placement["gameId"]
                seed = appearance.get("seed")
                if isinstance(seed, int):
                    appearance["seedDelta"] = seed - placement["placement"]
                    if appearance["seedDelta"] >= 4: over_seed += 1
                    elif appearance["seedDelta"] <= -4: under_seed += 1
                    else: on_seed += 1
            appearances.append(appearance)
        games = sorted(row.get("finalGames", []), key=lambda x: (x.get("dateIso") or "", x.get("gameId") or ""), reverse=True)
        wins = [g for g in games if g.get("result") == "W"]
        losses = [g for g in games if g.get("result") == "L"]
        row["appearances"] = appearances
        row["finalGames"] = games[:20]
        row["summary"] = {
            "events": len({g.get("eventId") for g in games}),
            "finalGames": len(games),
            "wins": sum(g.get("result") == "W" for g in games),
            "losses": sum(g.get("result") == "L" for g in games),
            "ties": sum(g.get("result") == "T" for g in games),
            "goalsFor": sum(int(g.get("scoreFor") or 0) for g in games),
            "goalsAgainst": sum(int(g.get("scoreAgainst") or 0) for g in games),
        }
        row["summary"]["goalDifference"] = row["summary"]["goalsFor"] - row["summary"]["goalsAgainst"]
        row["bestWin"] = sorted(wins, key=lambda x: result_strength(x, True))[0] if wins else None
        row["worstLoss"] = sorted(losses, key=lambda x: result_strength(x, False))[0] if losses else None
        if games:
            output_teams.append(row)

    observed_participants = len(team_rows)
    output_teams.sort(key=lambda x: (x.get("group") or "", x.get("currentRank") or 9999, x.get("name") or ""))
    division_rows.sort(key=lambda x: (x.get("eventId") or "", x.get("ageGroup") or "", x.get("gender") or "", x.get("divisionTier") or ""))
    teams_with_finals = sum(item.get("summary", {}).get("finalGames", 0) > 0 for item in output_teams)
    return {
        "schemaVersion": 1,
        "release": RELEASE,
        "generatedAt": now_iso(),
        "policy": "JO finish and performance evidence is advisory. Published WPI rankings are never changed automatically.",
        "counts": {
            "divisions": len(division_rows),
            "divisionsStarted": sum(row["finalGames"] > 0 for row in division_rows),
            "uniqueFinalGames": len(unique_final_games),
            "participantsObserved": observed_participants,
            "teams": len(output_teams),
            "teamsWithFinals": teams_with_finals,
            "confirmedPlacements": confirmed,
            "overSeedPerformers": over_seed,
            "underSeedPerformers": under_seed,
            "onSeedPerformers": on_seed,
        },
        "divisions": division_rows,
        "teams": output_teams,
    }


def write(result: dict[str, Any]) -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    RUNTIME.write_text("window.CPI_JO_PERFORMANCE = " + json.dumps(result, separators=(",", ":"), ensure_ascii=False) + ";\n", encoding="utf-8")
    QA.write_text(json.dumps({"schemaVersion": 1, "release": RELEASE, "generatedAt": result["generatedAt"], "counts": result["counts"]}, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    result = build()
    write(result)
    counts = result["counts"]
    print("JO PERFORMANCE ENGINE BUILD COMPLETE")
    print(f" - {counts['uniqueFinalGames']} unique final games")
    print(f" - {counts['teamsWithFinals']} teams with completed-game performance")
    print(f" - {counts['confirmedPlacements']} confirmed division placements")
    print(" - Published rankings remain unchanged")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
