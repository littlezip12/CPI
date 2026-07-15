#!/usr/bin/env python3
"""Regression tests for the 7.42.1 tournament sync safety guard."""
from __future__ import annotations

import importlib.util
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "scripts" / "sync-tournament-data.py"
spec = importlib.util.spec_from_file_location("cpi_sync_tournament_data", MODULE_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError("Unable to load sync-tournament-data.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

from tournament_pipeline import IdentityResolver, load_json, normalize_csv, write_json  # noqa: E402


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def normalized_counts(games: int, blockers: int = 0) -> dict:
    return {"counts": {"games": games, "blockers": blockers}}


def main() -> int:
    require(module.candidate_rejection_reason(normalized_counts(0), {}) is not None, "Zero-game candidates must be rejected")
    require(module.candidate_rejection_reason(normalized_counts(192), {"games": 192}) is None, "Stable game counts should pass")
    require(module.candidate_rejection_reason(normalized_counts(20), {"games": 192}) is not None, "Large game-count collapses must be rejected")
    require(module.candidate_rejection_reason(normalized_counts(192, 1), {"games": 192}) is not None, "Candidates with blockers must be rejected")

    registry = load_json(ROOT / "data" / "tournaments" / "registry.json")
    event = next(x for x in registry["events"] if x["id"] == "2026-jo-weekend-2")
    division = next(x for x in event["divisions"] if x["id"] == "14u-boys-classic")
    resolver = IdentityResolver()
    fixture = (ROOT / "tests" / "fixtures" / "tournaments" / "jo-bracket-v1.csv").read_text(encoding="utf-8")
    existing_normalized, existing_qa = normalize_csv(
        fixture,
        event=event,
        division=division,
        resolver=resolver,
        fetched_at="2026-07-14T00:00:00Z",
        source_mode="test_fixture",
    )

    original_root = module.ROOT
    original_roots = (module.RAW_ROOT, module.NORMALIZED_ROOT, module.QA_ROOT)
    original_source_urls = module.source_urls
    original_fetch = module.fetch_url_text
    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            module.ROOT = temp
            module.RAW_ROOT = temp / "raw"
            module.NORMALIZED_ROOT = temp / "normalized"
            module.QA_ROOT = temp / "qa"
            raw_path, normalized_path, qa_path = module.paths_for(event["id"], division["id"])
            raw_path.parent.mkdir(parents=True, exist_ok=True)
            raw_path.write_text(fixture, encoding="utf-8")
            write_json(normalized_path, existing_normalized)
            write_json(qa_path, existing_qa)

            module.source_urls = lambda _division: ["https://example.invalid/blank", "https://example.invalid/good"]
            calls: list[str] = []

            def fetch_candidate(url: str, timeout: int = 25) -> str:
                calls.append(url)
                if url.endswith("blank"):
                    return "This,is,a,valid-looking,CSV\nBut,it,contains,no,schedule"
                return fixture + "\n"

            module.fetch_url_text = fetch_candidate
            result = module.sync_one(event, division, resolver, no_fetch=False)
            require(len(calls) == 2, "Sync should try the next configured source after a zero-game candidate")
            require(result["counts"]["games"] == 4, "Valid alternate source should retain all games")
            require(raw_path.read_text(encoding="utf-8-sig").startswith("Date,Time"), "Rejected candidate must never overwrite raw data")

            module.source_urls = lambda _division: ["https://example.invalid/blank-only"]
            module.fetch_url_text = lambda _url, timeout=25: "This,is,a,valid-looking,CSV\nBut,it,contains,no,schedule"
            before = raw_path.read_text(encoding="utf-8-sig")
            stale = module.sync_one(event, division, resolver, no_fetch=False)
            require(stale.get("staleFallback") is True, "All-invalid live candidates should preserve the last known-good snapshot")
            require(stale["counts"]["games"] == 4, "Stale fallback should retain the prior game count")
            require(raw_path.read_text(encoding="utf-8-sig") == before, "Stale fallback must not modify raw data")
    finally:
        module.ROOT = original_root
        module.RAW_ROOT, module.NORMALIZED_ROOT, module.QA_ROOT = original_roots
        module.source_urls = original_source_urls
        module.fetch_url_text = original_fetch

    print("TOURNAMENT SYNC SAFETY TESTS PASSED")
    print(" - Zero-game and blocking candidates are rejected before any files are written")
    print(" - Alternate GIDs and sheet-name fallbacks are tried automatically")
    print(" - Large schedule regressions cannot replace a banked dataset")
    print(" - Last known-good snapshots survive invalid live Google Sheet responses")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
