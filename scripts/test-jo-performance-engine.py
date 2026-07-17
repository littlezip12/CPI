#!/usr/bin/env python3
from __future__ import annotations
import importlib.util
import json
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "scripts" / "build-jo-performance.py"
spec = importlib.util.spec_from_file_location("jo_performance", MODULE_PATH)
module = importlib.util.module_from_spec(spec)
assert spec.loader
spec.loader.exec_module(module)


def participant(pid, team_id, name, seed):
    return {
        "raw": f"{seed} - {name}", "kind": "team", "seed": seed,
        "sourceReference": None, "displayName": name, "participantId": pid,
        "teamId": team_id, "clubId": "club-test", "rankingEligible": bool(team_id),
    }


def game(gid, stage, white, dark, ws, ds, status="final"):
    decided = status == "final" and ws != ds
    winner = white if ws > ds else dark
    loser = dark if ws > ds else white
    return {
        "id": gid, "eventId": "test-jo", "divisionId": "14u-boys-championship",
        "season": "2026", "ageGroup": "14U", "gender": "Boys", "division": "Championship",
        "divisionTier": "D1", "stage": stage, "dateIso": "2026-07-25", "status": status,
        "participants": {"white": white, "dark": dark},
        "scores": {"white": ws if status == "final" else None, "dark": ds if status == "final" else None},
        "outcome": ({"kind": "decided", "winnerParticipantId": winner["participantId"],
                     "winnerTeamId": winner.get("teamId"), "winnerName": winner["displayName"],
                     "loserParticipantId": loser["participantId"], "loserTeamId": loser.get("teamId"),
                     "loserName": loser["displayName"]} if decided else {"kind": "pending"}),
    }


def main():
    a = participant("team-alpha", "team-alpha", "Alpha", 8)
    b = participant("team-beta", "team-beta", "Beta", 1)
    c = participant("team-charlie", "team-charlie", "Charlie", 3)
    d = participant("team-delta", "team-delta", "Delta", 4)
    payload = {
        "schemaVersion": 1,
        "event": {"id": "test-jo", "name": "Synthetic JO", "kind": "junior_olympics"},
        "division": {"id": "14u-boys-championship", "label": "14U Boys Championship", "ageGroup": "14U", "gender": "Boys", "divisionTier": "D1"},
        "source": {"url": "https://example.test/source"},
        "games": [
            game("game-title", "1st", a, b, 9, 7),
            game("game-third", "3rd", c, d, 8, 6),
            game("game-group", "Group", b, c, 10, 8),
            game("game-future", "5th", a, d, 0, 0, status="scheduled"),
            game("game-not-placement", "1st/2ndR", a, c, 7, 6),
        ],
    }
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "synthetic.json"
        path.write_text(json.dumps(payload), encoding="utf-8")
        result = module.build([path])
    assert result["counts"]["uniqueFinalGames"] == 4
    assert result["counts"]["confirmedPlacements"] == 4
    by_id = {row["participantId"]: row for row in result["teams"]}
    a_app = by_id["team-alpha"]["appearances"][0]
    b_app = by_id["team-beta"]["appearances"][0]
    c_app = by_id["team-charlie"]["appearances"][0]
    d_app = by_id["team-delta"]["appearances"][0]
    assert (a_app["confirmedPlacement"], a_app["seedDelta"]) == (1, 7)
    assert (b_app["confirmedPlacement"], b_app["seedDelta"]) == (2, -1)
    assert c_app["confirmedPlacement"] == 3
    assert d_app["confirmedPlacement"] == 4
    assert result["counts"]["overSeedPerformers"] == 1
    assert module.placement_start("1st/2ndR") is None
    assert by_id["team-alpha"]["bestWin"]["opponentName"] == "Beta"
    assert by_id["team-charlie"]["worstLoss"]["opponentName"] == "Alpha"
    print("JO PERFORMANCE ENGINE TESTS PASSED")
    print(" - Exact placement games assign winner/loser finishes without misreading bracket labels")
    print(" - Seed-versus-finish performance is calculated separately from team identity")
    print(" - Scheduled games never become performance evidence")
    print(" - Best wins and worst losses remain source-traceable")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
