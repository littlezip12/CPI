#!/usr/bin/env python3
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
CLUB_INTEL = ROOT / "data" / "club-intelligence.json"
CLUB_DIR = ROOT / "club"

def main():
    errors = []
    warnings = []
    if not CLUB_INTEL.exists():
        errors.append("Missing data/club-intelligence.json")
    else:
        data = json.loads(CLUB_INTEL.read_text(encoding="utf-8"))
        clubs = data.get("clubs", {})
        for slug, club in clubs.items():
            if not (CLUB_DIR / f"{slug}.html").exists():
                errors.append(f"Missing club page: club/{slug}.html")
            logo = club.get("logo")
            if logo and not (ROOT / logo).exists():
                warnings.append(f"{slug}: logo missing: {logo}")
            if club.get("rankedTeams", 0) == 0:
                warnings.append(f"{slug}: no ranked teams yet")

    print("WPI Club Intelligence Validation")
    print("================================")
    print(f"Errors: {len(errors)}")
    print(f"Warnings: {len(warnings)}")
    for e in errors:
        print(f"ERROR: {e}")
    for w in warnings[:80]:
        print(f"WARNING: {w}")
    if len(warnings) > 80:
        print(f"...and {len(warnings) - 80} more warnings")
    if errors:
        sys.exit(1)
    print("PASSED: club intelligence pages are structurally valid.")

if __name__ == "__main__":
    main()
