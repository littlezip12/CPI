#!/usr/bin/env python3
"""Build WPI's controlled post-JO ranking review packet.

This engine is intentionally read-only. It combines the immutable pre-JO snapshot,
current rankings, JO participation/performance, and advisory evidence. It never writes
published ranking files or reviewer decisions.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT = ROOT / "data" / "rankings" / "snapshots" / "2026-pre-jo-7.45.2.json"
CURRENT_RANKINGS = ROOT / "rankings.json"
EVIDENCE = ROOT / "data" / "tournaments" / "evidence" / "index.json"
PERFORMANCE = ROOT / "data" / "tournaments" / "jo-performance" / "index.json"
RECOMMENDATIONS = ROOT / "data" / "tournaments" / "ranking-review-engine" / "index.json"
OUT = ROOT / "data" / "tournaments" / "post-jo-review" / "index.json"
RUNTIME = ROOT / "data" / "tournaments" / "post-jo-review" / "runtime.js"
QA = ROOT / "qa" / "post-jo-review-7.46.0.json"
RELEASE = "7.46.0"


def load(path: Path, default: Any = None) -> Any:
    if not path.exists():
        return {} if default is None else default
    return json.loads(path.read_text(encoding="utf-8"))


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def stable_hash(value: Any) -> str:
    payload = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def priority(packet: dict[str, Any]) -> str:
    delta = packet.get("performanceDelta")
    recommendation = packet.get("engineRecommendation") or {}
    if packet.get("actualFinish") is None:
        return "waiting"
    if isinstance(delta, int) and abs(delta) >= 8:
        return "high"
    if recommendation.get("confidence") == "high" or (isinstance(delta, int) and abs(delta) >= 4):
        return "medium"
    return "standard"


def build(snapshot: dict[str, Any], current: list[dict[str, Any]], evidence: dict[str, Any],
          performance: dict[str, Any], recommendations: dict[str, Any]) -> dict[str, Any]:
    snapshot_rows = {r.get("canonicalTeamId"): r for r in snapshot.get("teams", []) if r.get("canonicalTeamId")}
    current_rows = {r.get("canonicalTeamId"): r for r in current if r.get("canonicalTeamId")}
    performance_rows = {r.get("canonicalTeamId"): r for r in performance.get("teams", []) if r.get("canonicalTeamId")}
    recommendation_rows = {r.get("canonicalTeamId"): r for r in recommendations.get("recommendations", []) if r.get("canonicalTeamId")}

    packets: list[dict[str, Any]] = []
    seen: set[str] = set()
    for participant in evidence.get("teams", {}).values():
        team_id = participant.get("canonicalTeamId")
        if not team_id or not participant.get("rankingEligible"):
            continue
        snap = snapshot_rows.get(team_id)
        current_row = current_rows.get(team_id)
        if not snap or not current_row:
            continue
        perf = performance_rows.get(team_id, {})
        perf_apps = {(a.get("eventId"), a.get("divisionId")): a for a in perf.get("appearances", [])}
        engine = recommendation_rows.get(team_id, {})
        for appearance in participant.get("appearances", []):
            event_id, division_id = appearance.get("eventId"), appearance.get("divisionId")
            packet_id = f"{team_id}::{event_id}::{division_id}"
            if packet_id in seen:
                continue
            seen.add(packet_id)
            perf_app = perf_apps.get((event_id, division_id), {})
            expected = appearance.get("seed") if isinstance(appearance.get("seed"), int) else None
            actual = perf_app.get("confirmedPlacement") if isinstance(perf_app.get("confirmedPlacement"), int) else None
            delta = expected - actual if isinstance(expected, int) and isinstance(actual, int) else None
            pre_rank = snap.get("rank")
            current_rank = current_row.get("postRank")
            ranking_drift = current_rank - pre_rank if isinstance(pre_rank, int) and isinstance(current_rank, int) else None
            recommendation = engine.get("recommendation") or {}
            packet = {
                "packetId": packet_id,
                "canonicalTeamId": team_id,
                "canonicalClubId": current_row.get("canonicalClubId"),
                "team": current_row.get("team"),
                "club": current_row.get("club"),
                "group": current_row.get("group"),
                "teamDepth": current_row.get("teamDepth"),
                "teamDepthLabel": current_row.get("teamDepthLabel"),
                "teamPage": current_row.get("teamPage"),
                "preJORank": pre_rank,
                "preJOCPI": snap.get("cpi"),
                "currentRank": current_rank,
                "currentCPI": current_row.get("postCPI"),
                "rankingDrift": ranking_drift,
                "eventId": event_id,
                "eventName": appearance.get("eventName"),
                "divisionId": division_id,
                "divisionLabel": appearance.get("divisionLabel"),
                "divisionTier": appearance.get("divisionTier"),
                "sourceUrl": appearance.get("sourceUrl"),
                "publicPath": appearance.get("publicPath"),
                "expectedFinish": expected,
                "expectedFinishMethod": "official_jo_seed" if expected is not None else None,
                "actualFinish": actual,
                "performanceDelta": delta,
                "finalGames": perf_app.get("finalGames", 0),
                "record": {
                    "wins": perf_app.get("wins", 0),
                    "losses": perf_app.get("losses", 0),
                    "ties": perf_app.get("ties", 0),
                    "goalsFor": perf_app.get("goalsFor", 0),
                    "goalsAgainst": perf_app.get("goalsAgainst", 0),
                    "goalDifference": perf_app.get("goalDifference", 0),
                },
                "bestWin": perf.get("bestWin"),
                "worstLoss": perf.get("worstLoss"),
                "evidenceScore": engine.get("evidenceScore"),
                "engineRecommendation": recommendation or None,
                "notableResults": engine.get("notableResults", []),
                "reviewState": "ready" if actual is not None else ("in_progress" if perf_app.get("finalGames", 0) else "awaiting_results"),
                "policy": "manual_decision_only",
            }
            packet["priority"] = priority(packet)
            packets.append(packet)

    packets.sort(key=lambda x: (
        {"high": 0, "medium": 1, "standard": 2, "waiting": 3}.get(x.get("priority"), 9),
        x.get("group") or "", x.get("currentRank") or 9999, x.get("team") or ""
    ))
    ready = [p for p in packets if p.get("reviewState") == "ready"]
    return {
        "schemaVersion": 1,
        "release": RELEASE,
        "generatedAt": now_iso(),
        "snapshot": {
            "id": snapshot.get("snapshotId"),
            "createdAt": snapshot.get("createdAt"),
            "sourceRelease": snapshot.get("sourceRelease"),
            "rankingDataRelease": snapshot.get("rankingDataRelease"),
            "teamsHash": snapshot.get("teamsHash"),
        },
        "policy": {
            "mode": "manual_review_only",
            "browserStorage": "Reviewer decisions are stored only in the reviewer's browser until exported.",
            "publication": "No page or build script changes rankings.json or data.js automatically.",
            "expectedFinish": "Expected finish is the official JO seed within that division, not a statewide WPI projection.",
        },
        "counts": {
            "packets": len(packets),
            "awaitingResults": sum(p.get("reviewState") == "awaiting_results" for p in packets),
            "inProgress": sum(p.get("reviewState") == "in_progress" for p in packets),
            "readyForReview": len(ready),
            "highPriority": sum(p.get("priority") == "high" for p in ready),
            "mediumPriority": sum(p.get("priority") == "medium" for p in ready),
            "rankingDrift": sum(bool(p.get("rankingDrift")) for p in packets),
        },
        "packets": packets,
    }


def main() -> int:
    snapshot = load(SNAPSHOT)
    current = load(CURRENT_RANKINGS, [])
    evidence = load(EVIDENCE)
    performance = load(PERFORMANCE)
    recommendations = load(RECOMMENDATIONS)
    result = build(snapshot, current, evidence, performance, recommendations)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    RUNTIME.write_text("window.CPI_POST_JO_REVIEW = " + json.dumps(result, separators=(",", ":"), ensure_ascii=False) + ";\n", encoding="utf-8")
    QA.write_text(json.dumps({
        "schemaVersion": 1,
        "release": RELEASE,
        "generatedAt": result["generatedAt"],
        "snapshot": result["snapshot"],
        "counts": result["counts"],
    }, indent=2) + "\n", encoding="utf-8")
    print("POST-JO REVIEW PACKET BUILD COMPLETE")
    print(f" - {result['counts']['packets']} ranked JO entries are packeted")
    print(f" - {result['counts']['readyForReview']} are ready for controlled ranking decisions")
    print(" - Reviewer decisions remain local until explicitly exported")
    print(" - Published rankings remain unchanged")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
