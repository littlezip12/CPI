#!/usr/bin/env python3
"""Fail safely before running the experimental WPI Engine v2 pipeline."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = [
    ROOT / "data" / "tournament_registry.json",
    ROOT / "data" / "team_alias_lookup.json",
    ROOT / "data" / "team_registry.json",
    ROOT / "data" / "tournament_import_normalizer_rules.json",
]
RAW = ROOT / "raw_tournaments"

missing = [p for p in REQUIRED if not p.exists()]
raw_files = sorted(RAW.glob("*.csv")) if RAW.exists() else []

if missing or not raw_files:
    print("WPI Engine v2 preflight failed safely.")
    if missing:
        print("Missing required registries:")
        for path in missing:
            print(f" - {path.relative_to(ROOT)}")
    if not raw_files:
        print(" - raw_tournaments/ contains no CSV source files")
    print("\nNo engine outputs were generated or overwritten.")
    print("Use ./release-check for the current static-site release validation.")
    sys.exit(1)

print("WPI Engine v2 preflight passed.")
print(f" - {len(raw_files)} raw tournament source file(s)")
