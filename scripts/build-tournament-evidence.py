#!/usr/bin/env python3
"""Build reusable team evidence and tournament-only identity registries from normalized CPI games."""
from __future__ import annotations

import csv
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from tournament_pipeline import ROOT, identity_normalize, load_json, slugify, write_json

RELEASE = "7.43.0"
IDENTITY_RELEASE = "7.40.0"
NORMALIZED_ROOT = ROOT / "data" / "tournaments" / "normalized"
EVIDENCE_ROOT = ROOT / "data" / "tournaments" / "evidence"
TOURNAMENT_IDENTITY_ROOT = ROOT / "data" / "tournaments" / "identity"
REGISTRY_PATH = ROOT / "data" / "tournaments" / "registry.json"
RANKINGS_PATH = ROOT / "rankings.json"
IDENTITY_INDEX_PATH = ROOT / "data" / "identity" / "index.json"
QA_JSON_PATH = ROOT / "qa" / "tournament-evidence-summary-7.43.0.json"
QA_CSV_PATH = ROOT / "qa" / "tournament-identity-review-7.43.0.csv"


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def dataset_paths() -> list[Path]:
    return sorted(path for path in NORMALIZED_ROOT.glob("*/*.json") if path.name != "manifest.json")


def empty_evidence(entity: dict[str, Any]) -> dict[str, Any]:
    return {
        "participantId": entity["id"],
        "canonicalTeamId": entity.get("canonicalTeamId"),
        "canonicalClubId": entity.get("canonicalClubId"),
        "name": entity.get("name"),
        "season": entity.get("season"),
        "ageGroup": entity.get("ageGroup"),
        "gender": entity.get("gender"),
        "group": entity.get("group"),
        "rankingEligible": bool(entity.get("rankingEligible")),
        "identityStatus": entity.get("identityStatus"),
        "summary": {
            "events": 0,
            "games": 0,
            "finalGames": 0,
            "scheduledGames": 0,
            "wins": 0,
            "losses": 0,
            "ties": 0,
            "goalsFor": 0,
            "goalsAgainst": 0,
            "goalDifference": 0,
        },
        "appearances": [],
        "recentGames": [],
    }


def canonical_entity(participant: dict[str, Any], game: dict[str, Any], teams: dict[str, Any], clubs: dict[str, Any], ranked_ids: set[str]) -> dict[str, Any]:
    canonical_team_id = participant.get("teamId")
    participant_id = participant.get("participantId") or canonical_team_id
    if not participant_id:
        participant_id = f"tournament-team-{slugify(game.get('season'))}-{slugify(game.get('ageGroup'))}-{slugify(game.get('gender'))}-{slugify(participant.get('displayName'))}"
    team = teams.get(canonical_team_id, {}) if canonical_team_id else {}
    canonical_club_id = participant.get("clubId") or team.get("clubId")
    club = clubs.get(canonical_club_id, {}) if canonical_club_id else {}
    name = team.get("name") or participant.get("displayName") or participant.get("raw") or participant_id
    return {
        "id": participant_id,
        "canonicalTeamId": canonical_team_id,
        "canonicalClubId": canonical_club_id,
        "tournamentClubId": canonical_club_id or f"tournament-club-{slugify(name)}",
        "name": name,
        "normalizedName": identity_normalize(name),
        "season": str(game.get("season") or ""),
        "ageGroup": game.get("ageGroup"),
        "gender": game.get("gender"),
        "group": f"{game.get('ageGroup')} {game.get('gender')}",
        "clubName": club.get("displayName") or club.get("name") or name,
        "region": club.get("region") or "Unclassified",
        "rankingEligible": bool(canonical_team_id and canonical_team_id in ranked_ids),
        "identityStatus": "canonical_ranked_team" if canonical_team_id and canonical_team_id in ranked_ids else ("canonical_unranked_team" if canonical_team_id else ("canonical_club_tournament_team" if canonical_club_id else "tournament_only_team")),
        "aliases": set(),
        "sources": set(),
    }


def result_for(side: str, game: dict[str, Any]) -> str | None:
    if game.get("status") != "final":
        return None
    white_score = game.get("scores", {}).get("white")
    dark_score = game.get("scores", {}).get("dark")
    if white_score is None or dark_score is None:
        return None
    if white_score == dark_score:
        return "T"
    if side == "white":
        return "W" if white_score > dark_score else "L"
    return "W" if dark_score > white_score else "L"


def game_sort_key(item: dict[str, Any]) -> tuple[str, str, int]:
    return (str(item.get("dateIso") or ""), str(item.get("timeLabel") or ""), int(item.get("sourceRow") or 0))


def main() -> int:
    registry = load_json(REGISTRY_PATH)
    identity = load_json(IDENTITY_INDEX_PATH)
    teams = identity.get("teams", {})
    clubs = identity.get("clubs", {})
    rankings = load_json(RANKINGS_PATH)
    ranked_ids = {item.get("canonicalTeamId") for item in rankings if item.get("canonicalTeamId")}
    ranking_by_id = {item.get("canonicalTeamId"): item for item in rankings if item.get("canonicalTeamId")}
    registry_lookup = {
        (event["id"], division["id"]): (event, division)
        for event in registry.get("events", [])
        for division in event.get("divisions", [])
    }

    participants: dict[str, dict[str, Any]] = {}
    evidence: dict[str, dict[str, Any]] = {}
    appearance_maps: dict[str, dict[str, dict[str, Any]]] = defaultdict(dict)
    dataset_summaries: list[dict[str, Any]] = []

    for path in dataset_paths():
        data = load_json(path)
        event_id = data.get("event", {}).get("id")
        division_id = data.get("division", {}).get("id")
        event, division = registry_lookup.get((event_id, division_id), (data.get("event", {}), data.get("division", {})))
        source_url = division.get("sourceUrl") or data.get("source", {}).get("url")
        public_path = event.get("publicPath")
        dataset_summaries.append({
            "eventId": event_id,
            "eventName": event.get("name"),
            "divisionId": division_id,
            "divisionLabel": division.get("label"),
            "sourceUrl": source_url,
            "publicPath": public_path,
            "fetchedAt": data.get("source", {}).get("fetchedAt"),
            "counts": data.get("counts", {}),
        })

        for game in data.get("games", []):
            sides = game.get("participants", {})
            for side in ("white", "dark"):
                participant = sides.get(side, {})
                if participant.get("kind") != "team":
                    continue
                entity = canonical_entity(participant, game, teams, clubs, ranked_ids)
                participant_id = entity["id"]
                if participant_id not in participants:
                    participants[participant_id] = entity
                    evidence[participant_id] = empty_evidence(entity)
                current = participants[participant_id]
                for alias in (participant.get("raw"), participant.get("displayName")):
                    if alias:
                        current["aliases"].add(str(alias))
                current["sources"].add(f"{event_id}|{division_id}")

                opponent_side = "dark" if side == "white" else "white"
                opponent = sides.get(opponent_side, {})
                result = result_for(side, game)
                score_for = game.get("scores", {}).get(side)
                score_against = game.get("scores", {}).get(opponent_side)
                game_item = {
                    "gameId": game.get("id"),
                    "eventId": event_id,
                    "eventName": event.get("name"),
                    "divisionId": division_id,
                    "divisionLabel": division.get("label"),
                    "divisionTier": game.get("divisionTier"),
                    "sourceUrl": source_url,
                    "publicPath": public_path,
                    "sourceRow": game.get("sourceRow"),
                    "sourceGameNumber": game.get("sourceGameNumber"),
                    "dateIso": game.get("dateIso"),
                    "dateLabel": game.get("dateLabel"),
                    "timeLabel": game.get("timeLabel"),
                    "venue": game.get("venue"),
                    "stage": game.get("stage"),
                    "status": game.get("status"),
                    "seed": participant.get("seed"),
                    "opponentSeed": opponent.get("seed"),
                    "opponentParticipantId": opponent.get("participantId") or opponent.get("teamId"),
                    "opponentTeamId": opponent.get("teamId"),
                    "opponentName": opponent.get("displayName") or opponent.get("raw") or "Bracket opponent pending",
                    "scoreFor": score_for,
                    "scoreAgainst": score_against,
                    "result": result,
                }
                evidence[participant_id]["recentGames"].append(game_item)
                summary = evidence[participant_id]["summary"]
                summary["games"] += 1
                if game.get("status") == "final":
                    summary["finalGames"] += 1
                    if result == "W": summary["wins"] += 1
                    elif result == "L": summary["losses"] += 1
                    elif result == "T": summary["ties"] += 1
                    if isinstance(score_for, (int, float)): summary["goalsFor"] += score_for
                    if isinstance(score_against, (int, float)): summary["goalsAgainst"] += score_against
                else:
                    summary["scheduledGames"] += 1

                appearance_key = f"{event_id}|{division_id}"
                appearance = appearance_maps[participant_id].setdefault(appearance_key, {
                    "eventId": event_id,
                    "eventName": event.get("name"),
                    "divisionId": division_id,
                    "divisionLabel": division.get("label"),
                    "divisionTier": division.get("divisionTier"),
                    "seed": participant.get("seed"),
                    "sourceUrl": source_url,
                    "publicPath": public_path,
                    "games": 0,
                    "finalGames": 0,
                    "scheduledGames": 0,
                    "wins": 0,
                    "losses": 0,
                    "ties": 0,
                })
                if appearance.get("seed") is None and participant.get("seed") is not None:
                    appearance["seed"] = participant.get("seed")
                appearance["games"] += 1
                if game.get("status") == "final":
                    appearance["finalGames"] += 1
                    if result == "W": appearance["wins"] += 1
                    elif result == "L": appearance["losses"] += 1
                    elif result == "T": appearance["ties"] += 1
                else:
                    appearance["scheduledGames"] += 1

    generated_at = max((str(item.get("fetchedAt") or "") for item in dataset_summaries), default="") or now_iso()

    for participant_id, item in evidence.items():
        item["appearances"] = sorted(appearance_maps[participant_id].values(), key=lambda x: (x.get("eventName") or "", x.get("divisionLabel") or ""))
        item["summary"]["events"] = len(item["appearances"])
        item["summary"]["goalDifference"] = item["summary"]["goalsFor"] - item["summary"]["goalsAgainst"]
        item["recentGames"] = sorted(item["recentGames"], key=game_sort_key, reverse=True)[:12]
        rank = ranking_by_id.get(item.get("canonicalTeamId"))
        if rank:
            item["rankingSnapshot"] = {
                "rank": rank.get("postRank"),
                "cpi": rank.get("postCPI"),
                "group": rank.get("group"),
                "teamPage": rank.get("teamPage"),
            }

    participant_records = []
    for item in sorted(participants.values(), key=lambda x: (x.get("group") or "", x.get("name") or "")):
        participant_records.append({**item, "aliases": sorted(item["aliases"]), "sources": sorted(item["sources"])})

    canonical_evidence = {key: value for key, value in evidence.items() if value.get("canonicalTeamId")}
    tournament_only = [item for item in participant_records if not item.get("canonicalTeamId")]
    ranking_queue = []
    for team_id, item in sorted(canonical_evidence.items(), key=lambda kv: ((kv[1].get("group") or ""), (kv[1].get("rankingSnapshot", {}).get("rank") or 999))):
        summary = item["summary"]
        reasons = ["junior_olympics_schedule_banked"]
        status = "schedule_only"
        if summary["finalGames"]:
            status = "ready_for_ranking_review"
            reasons.append("new_final_results")
        seed_gaps = []
        cpi_rank = item.get("rankingSnapshot", {}).get("rank")
        for appearance in item.get("appearances", []):
            seed = appearance.get("seed")
            if isinstance(seed, int) and isinstance(cpi_rank, int) and abs(seed - cpi_rank) >= 10:
                seed_gaps.append({"divisionId": appearance.get("divisionId"), "seed": seed, "cpiRank": cpi_rank, "gap": seed - cpi_rank})
        if seed_gaps:
            reasons.append("jo_seed_cpi_rank_gap")
        ranking_queue.append({
            "canonicalTeamId": item.get("canonicalTeamId"),
            "name": item.get("name"),
            "group": item.get("group"),
            "status": status,
            "reasons": reasons,
            "summary": summary,
            "appearances": item.get("appearances"),
            "teamPage": item.get("rankingSnapshot", {}).get("teamPage"),
            "cpiRank": item.get("rankingSnapshot", {}).get("rank"),
            "cpi": item.get("rankingSnapshot", {}).get("cpi"),
            "seedRankGaps": seed_gaps,
        })

    participant_registry = {
        "schemaVersion": 1,
        "release": RELEASE,
        "identityRelease": IDENTITY_RELEASE,
        "generatedAt": generated_at,
        "description": "Stable tournament participant identities. Tournament-only teams are evidence entities and never enter published rankings automatically.",
        "counts": {
            "participants": len(participant_records),
            "canonicalTeams": sum(bool(x.get("canonicalTeamId")) for x in participant_records),
            "tournamentOnlyTeams": len(tournament_only),
            "rankingEligible": sum(bool(x.get("rankingEligible")) for x in participant_records),
        },
        "participants": participant_records,
    }
    evidence_index = {
        "schemaVersion": 1,
        "release": RELEASE,
        "identityRelease": IDENTITY_RELEASE,
        "generatedAt": generated_at,
        "description": "Normalized tournament evidence keyed by stable participant ID. Published rankings remain unchanged until manual ranking review.",
        "counts": {
            "datasets": len(dataset_summaries),
            "participants": len(participant_records),
            "canonicalTeamsWithEvidence": len(canonical_evidence),
            "tournamentOnlyTeams": len(tournament_only),
            "games": sum(x.get("counts", {}).get("games", 0) for x in dataset_summaries),
            "finalGames": sum(x.get("counts", {}).get("finalGames", 0) for x in dataset_summaries),
        },
        "datasets": dataset_summaries,
        "teams": evidence,
    }
    review_queue = {
        "schemaVersion": 1,
        "release": RELEASE,
        "generatedAt": generated_at,
        "policy": "Tournament evidence is review input only. No ranking changes are applied automatically.",
        "counts": {
            "rankingItems": len(ranking_queue),
            "readyForRankingReview": sum(x["status"] == "ready_for_ranking_review" for x in ranking_queue),
            "scheduleOnly": sum(x["status"] == "schedule_only" for x in ranking_queue),
            "identityReviewItems": len(tournament_only),
        },
        "rankingReview": ranking_queue,
        "identityReview": tournament_only,
    }

    write_json(TOURNAMENT_IDENTITY_ROOT / "participants.json", participant_registry)
    write_json(EVIDENCE_ROOT / "index.json", evidence_index)
    write_json(EVIDENCE_ROOT / "ranking-review.json", review_queue)
    runtime = {
        "release": RELEASE,
        "generatedAt": generated_at,
        "counts": evidence_index["counts"],
        "teams": canonical_evidence,
    }
    (EVIDENCE_ROOT / "runtime.js").parent.mkdir(parents=True, exist_ok=True)
    (EVIDENCE_ROOT / "runtime.js").write_text("window.CPI_TOURNAMENT_EVIDENCE = " + json.dumps(runtime, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
    (EVIDENCE_ROOT / "review-runtime.js").write_text("window.CPI_TOURNAMENT_REVIEW = " + json.dumps(review_queue, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")

    QA_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    write_json(QA_JSON_PATH, {
        "schemaVersion": 1,
        "release": RELEASE,
        "generatedAt": generated_at,
        "summary": evidence_index["counts"],
        "participantCounts": participant_registry["counts"],
        "reviewCounts": review_queue["counts"],
    })
    with QA_CSV_PATH.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["participantId", "name", "season", "ageGroup", "gender", "group", "canonicalClubId", "identityStatus", "aliases", "sources"])
        writer.writeheader()
        for item in tournament_only:
            writer.writerow({
                "participantId": item.get("id"),
                "name": item.get("name"),
                "season": item.get("season"),
                "ageGroup": item.get("ageGroup"),
                "gender": item.get("gender"),
                "group": item.get("group"),
                "canonicalClubId": item.get("canonicalClubId") or "",
                "identityStatus": item.get("identityStatus"),
                "aliases": " | ".join(item.get("aliases", [])),
                "sources": " | ".join(item.get("sources", [])),
            })

    print("TOURNAMENT EVIDENCE BUILD COMPLETE")
    print(f" - {len(dataset_summaries)} banked datasets and {evidence_index['counts']['games']} games")
    print(f" - {len(canonical_evidence)} canonical teams have profile-ready evidence")
    print(f" - {len(tournament_only)} tournament-only teams have stable non-ranking identities")
    print(f" - {review_queue['counts']['readyForRankingReview']} teams have final results ready for manual ranking review")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
