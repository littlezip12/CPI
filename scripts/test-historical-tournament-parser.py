#!/usr/bin/env python3
"""Regression tests for completed-event results_table_v1 normalization."""
from pathlib import Path

from tournament_pipeline import IdentityResolver, ROOT, normalize_csv

EVENT = {"id": "fixture-completed-event", "name": "Fixture Completed Event", "kind": "invite", "rankingEvidenceEnabled": False}
DIVISION = {
    "id": "14u-boys-d1", "label": "14U Boys D1", "season": "2026", "ageGroup": "14U", "gender": "Boys",
    "division": "D1", "divisionTier": "D1", "parser": "results_table_v1", "sourceType": "fixture_csv",
    "spreadsheetId": "fixture", "gid": "0", "sourceUrl": "https://example.invalid/fixture",
}


def require(value: bool, message: str) -> None:
    if not value:
        raise AssertionError(message)


def parse(name: str):
    text = (ROOT / "tests" / "fixtures" / "tournaments" / "archive" / name).read_text(encoding="utf-8")
    return normalize_csv(text, event=EVENT, division=DIVISION, resolver=IdentityResolver(), fetched_at="2026-07-16T12:00:00Z", source_mode="fixture")


separate, separate_qa = parse("results-table-separate-scores.csv")
require(separate["counts"]["games"] == 3, "Separate-score table should produce three games")
require(separate["counts"]["finalGames"] == 2, "Blank 0-0 must remain scheduled rather than final")
require(separate["counts"]["zeroZeroPlaceholders"] == 1, "Blank 0-0 must be identified explicitly")
require(separate["games"][0]["participants"]["white"]["displayName"] == "Lamorinda A", "Pool/seed prefix should be separated from the team")
require(separate["games"][0]["participants"]["white"]["seed"] == 1, "Tournament seed should be retained as metadata")
require(separate["counts"]["blockers"] == 0 and separate_qa["summary"]["blockers"] == 0, "Fixture should contain no blocking defects")

combined, _ = parse("results-table-combined-score.csv")
require(combined["counts"]["games"] == 2, "Combined-score table should produce two games")
require(combined["counts"]["finalGames"] == 2, "Combined scores must normalize as finals")
require(combined["games"][0]["scores"]["white"] == 8 and combined["games"][0]["scores"]["dark"] == 6, "Dash-delimited score should parse")
require(combined["games"][1]["scores"]["white"] == 11 and combined["games"][1]["scores"]["dark"] == 9, "Colon-delimited score should parse")
require(all(not game["participants"]["white"].get("rankingEligible") or game["participants"]["white"].get("teamId") for game in combined["games"]), "Ranking eligibility requires a canonical team ID")

print("HISTORICAL TOURNAMENT PARSER TESTS PASSED")
print(" - Separate and combined score layouts normalize consistently")
print(" - Blank 0-0 rows remain scheduled; real scores become finals")
print(" - Pool/seed prefixes stay metadata rather than team-name text")
