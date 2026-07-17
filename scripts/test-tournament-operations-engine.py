#!/usr/bin/env python3
"""Unit tests for CPI 7.47 tournament operations decision rules."""
from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("ops", ROOT / "scripts/build-tournament-operations.py")
ops = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(ops)


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


ready = [
    ops.check("dataset", "blocking", True, "banked"),
    ops.check("fresh", "warning", True, "fresh"),
]
require(ops.severity_for(ready, "live") == "ready", "Healthy live divisions must be ready")

attention = ready + [ops.check("partial", "warning", False, "no partial", "1 partial score")]
require(ops.severity_for(attention, "live") == "attention", "Partial scores must create attention status")

blocking = ready + [ops.check("count", "blocking", False, "count matches", "Expected 192, found 0")]
require(ops.severity_for(blocking, "live") == "blocking", "Schedule regressions must block a live division")
require(ops.severity_for(blocking, "historical_registered") == "historical", "Historical registrations must not masquerade as live blockers")

sample = {
    "generatedAt": "2026-07-16T12:00:00Z",
    "counts": {"liveDivisions": 23, "ready": 22, "attention": 0, "blocking": 1, "completedGames": 0},
    "alerts": [{"severity": "blocking", "eventName": "JO Weekend 2", "divisionLabel": "14U Boys Classic", "message": "Expected 192, found 0."}],
}
body = ops.issue_markdown(sample)
require("Action required" in body and "14U Boys Classic" in body, "Incident markdown must name affected divisions")
require("does not blend sources" in body, "Incident markdown must preserve the source policy")

print("TOURNAMENT OPERATIONS ENGINE TESTS PASSED")
print(" - Healthy, attention, blocking, and historical states remain distinct")
print(" - Schedule regressions and partial scores receive the correct severity")
print(" - Operational incident summaries identify affected divisions without blending sources")
