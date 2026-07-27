#!/usr/bin/env python3
"""Regression tests for the CPI 7.42 tournament normalizer."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from tournament_pipeline import IdentityResolver, load_json, normalize_csv, parse_participant  # noqa: E402


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> int:
    registry = load_json(ROOT / "data" / "tournaments" / "registry.json")
    event = next(x for x in registry["events"] if x["id"] == "2026-jo-weekend-2")
    division = next(x for x in event["divisions"] if x["id"] == "14u-boys-classic")
    resolver = IdentityResolver()
    fixture = (ROOT / "tests" / "fixtures" / "tournaments" / "jo-bracket-v1.csv").read_text(encoding="utf-8")
    normalized, qa = normalize_csv(
        fixture,
        event=event,
        division=division,
        resolver=resolver,
        fetched_at="2026-07-14T00:00:00Z",
        source_mode="test_fixture",
    )

    require(normalized["counts"]["games"] == 4, "Fixture should normalize four games")
    require(normalized["counts"]["blockers"] == 0, "Fixture should contain no blocking errors")
    first = normalized["games"][0]
    require(first["participants"]["white"]["displayName"] == "Lamorinda A", "Seeded Lamorinda should resolve to canonical team")
    require(first["participants"]["white"]["seed"] == 18, "JO seed must be separate metadata")
    require(first["participants"]["white"]["teamId"], "Lamorinda should have a canonical team ID")
    require(first["participants"]["white"]["participantId"] == first["participants"]["white"]["teamId"], "Canonical teams should use the canonical team ID as participant ID")
    require(not first["participants"]["white"]["displayName"].startswith("18"), "Seed must not remain in canonical name")
    require(first["status"] == "final", "Scored game should be final")
    require(first["outcome"]["winnerName"] == "Lamorinda A", "Winner should be determined")

    second = normalized["games"][1]
    require(second["participants"]["white"]["kind"] == "bracket_reference", "W#31 must remain a bracket reference")
    require(second["participants"]["dark"]["kind"] == "placeholder", "Bare L must never become a team")

    third = normalized["games"][2]
    require(third["participants"]["white"]["kind"] == "team", "Resolved W#31 - NorCal should be a team")
    require(third["participants"]["white"]["sourceReference"].replace(" ", "").upper() == "W#31", "Resolved reference should be preserved")
    require(third["participants"]["white"]["displayName"].lower() == "norcal", "Resolved reference should retain actual team name")
    require(third["participants"]["dark"]["kind"] == "team", "Pool slot with actual SBWPC should be a team")
    require(third["participants"]["dark"]["sourceReference"].startswith("M1"), "Pool source reference should be preserved")

    raw = parse_participant("#18 - Lamorinda", {"season": "2026", "ageGroup": "14U", "gender": "Boys"}, resolver)
    require(raw["seed"] == 18 and raw["displayName"] == "Lamorinda", "Hash-prefixed seeds should cleanly separate the source name")
    require(raw["clubId"] and not raw["teamId"], "Ambiguous bare club names should remain club-resolved review items rather than guessing a team")
    require(raw["participantId"].startswith("tournament-team-"), "Unranked tournament teams must receive a stable tournament participant ID")
    require(not raw["rankingEligible"], "Tournament-only participants must not enter rankings automatically")
    cross_scope = parse_participant("99 Alliance", {"season": "2026", "ageGroup": "14U", "gender": "Girls"}, resolver)
    require(not cross_scope["teamId"], "A globally unique alias from another age group must not resolve across scope")
    slot = parse_participant("pt_M1", {"season": "2026", "ageGroup": "14U", "gender": "Girls"}, resolver)
    require(slot["kind"] == "bracket_reference", "Pool/placement slots must not become teams")
    for label in ["pt_M1-", "2nd A-", "1st ag_M-", "W29-3rdC", "L25-2ndD", "A(1)-"]:
        parsed = parse_participant(label, {"season": "2026", "ageGroup": "14U", "gender": "Boys"}, resolver)
        require(parsed["kind"] == "bracket_reference", f"Bracket slot {label} must not become a team")
    prefixed = parse_participant("A1(18)-Lamorinda A", {"season": "2026", "ageGroup": "14U", "gender": "Boys"}, resolver)
    require(prefixed["kind"] == "team" and prefixed["displayName"] == "Lamorinda A", "Pool prefix must be stripped before identity resolution")
    require(prefixed["seed"] == 18 and prefixed["sourceReference"] == "A1(18)", "Pool seed/reference must remain structured metadata")
    resolved_loser = parse_participant("L1(12)-Santa Barbara WPC", {"season": "2026", "ageGroup": "14U", "gender": "Boys"}, resolver)
    require(resolved_loser["kind"] == "team" and resolved_loser["displayName"] == "Santa Barbara", "Resolved loser reference must retain the canonical team name")
    require(resolved_loser["seed"] == 12 and resolved_loser["sourceReference"] == "L1(12)", "Resolved loser seed/reference must remain metadata")
    require(all(issue["code"] != "duplicate_game_id" for issue in qa["issues"]), "Fixture should not create duplicate IDs")

    pre_fixture = (ROOT / "tests" / "fixtures" / "tournaments" / "jo-pre-tournament-scores.csv").read_text(encoding="utf-8")
    pre_normalized, _ = normalize_csv(
        pre_fixture,
        event=event,
        division=division,
        resolver=resolver,
        fetched_at="2026-07-14T00:00:00Z",
        source_mode="test_fixture",
    )
    require(pre_normalized["counts"]["games"] == 3, "Pre-tournament fixture should normalize three games")
    require(pre_normalized["games"][0]["scoreState"] == "zero_zero_placeholder", "0-0 should be recorded as a placeholder score state")
    require(pre_normalized["games"][0]["status"] == "scheduled", "0-0 placeholders must not become final games")
    require(pre_normalized["games"][1]["scoreState"] == "partial", "One-sided score entries should remain partial")
    require(pre_normalized["games"][1]["status"] == "scheduled", "Partial scores must not become final games")
    require(pre_normalized["games"][2]["status"] == "final", "A complete non-placeholder score should become final")

    print("TOURNAMENT PIPELINE TESTS PASSED")
    print(" - JO seeds are metadata, not team-name text")
    print(" - Pure and resolved winner/loser references are distinguished")
    print(" - Bracket slots, pool placements, and W/L destinations cannot become teams")
    print(" - Pool/seed prefixes are stripped before canonical identity resolution")
    print(" - Canonical team and club IDs are attached when identities resolve")
    print(" - Tournament-only teams receive stable non-ranking participant IDs")
    print(" - Final outcomes and advancement destinations normalize consistently")
    print(" - Blank 0-0 and partial score cells remain scheduled until a real result exists")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
