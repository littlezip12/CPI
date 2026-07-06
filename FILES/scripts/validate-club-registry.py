#!/usr/bin/env python3
"""
CPI Club Registry Validator

Usage:
  cd ~/Documents/GitHub/CPI
  python3 scripts/validate-club-registry.py
"""

from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
CLUB_REGISTRY = ROOT / "data" / "club-registry.json"

REQUIRED_FIELDS = [
    "slug",
    "displayName",
    "region",
    "logo",
    "colors",
]

def main():
    if not CLUB_REGISTRY.exists():
        print("FAILED: data/club-registry.json is missing.")
        sys.exit(1)

    data = json.loads(CLUB_REGISTRY.read_text(encoding="utf-8"))
    clubs = data.get("clubs", {})

    errors = []
    warnings = []

    for slug, club in clubs.items():
        for field in REQUIRED_FIELDS:
            if field not in club:
                errors.append(f"{slug}: missing required field '{field}'")

        if club.get("slug") != slug:
            errors.append(f"{slug}: slug field does not match registry key")

        logo = club.get("logo")
        if logo and not (ROOT / logo).exists():
            warnings.append(f"{slug}: logo file does not exist: {logo}")

        colors = club.get("colors", {})
        for key in ["primary", "secondary", "accent"]:
            if key not in colors:
                warnings.append(f"{slug}: missing color '{key}'")

    print("CPI Club Registry Validation")
    print("============================")
    print(f"Clubs: {len(clubs)}")
    print(f"Errors: {len(errors)}")
    print(f"Warnings: {len(warnings)}")

    for e in errors:
        print(f"ERROR: {e}")
    for w in warnings:
        print(f"WARNING: {w}")

    if errors:
        sys.exit(1)

    print("PASSED: club registry structure is valid.")

if __name__ == "__main__":
    main()
