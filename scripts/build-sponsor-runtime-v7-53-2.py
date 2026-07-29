#!/usr/bin/env python3
"""Build the static sponsor runtime from the editable WPI sponsor registry."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/sponsors/index.json"
OUTPUT = ROOT / "data/sponsors/runtime.js"

config = json.loads(SOURCE.read_text(encoding="utf-8"))
if config.get("schemaVersion") != 1:
    raise SystemExit("Sponsor registry schemaVersion must be 1")
if not isinstance(config.get("placements"), list) or not isinstance(config.get("campaigns"), list):
    raise SystemExit("Sponsor registry requires placements and campaigns arrays")
placement_ids = [item.get("id") for item in config["placements"]]
if any(not value for value in placement_ids) or len(placement_ids) != len(set(placement_ids)):
    raise SystemExit("Sponsor placement IDs must be present and unique")

OUTPUT.write_text(
    "window.WPI_SPONSOR_CONFIG = "
    + json.dumps(config, indent=2, ensure_ascii=False)
    + ";\n",
    encoding="utf-8",
)
print(f"WPI sponsor runtime built: {len(config['placements'])} placements, {len(config['campaigns'])} campaigns")
