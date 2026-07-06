#!/usr/bin/env python3
from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
DATA_JS = ROOT / "data.js"
HOMEPAGE_JSON = ROOT / "data" / "homepage.json"
REGISTRY = ROOT / "data" / "logo-registry.json"

def find_paths(text):
    patterns = [
        r'assets/logos/[^"\']+',
        r'assets/photos/[^"\']+',
        r'assets/media/[^"\']+',
        r'assets/[^"\']+\.(?:svg|png|jpg|jpeg|webp|avif)',
    ]
    paths = set()
    for pattern in patterns:
        paths.update(re.findall(pattern, text))
    return sorted(paths)

def check(label, paths):
    missing = [p for p in paths if not (ROOT / p).exists()]
    print(f"{label}: {len(paths)} referenced, {len(missing)} missing")
    for p in missing:
        print(f"  MISSING: {p}")
    return missing

def main():
    all_missing = []

    if DATA_JS.exists():
        all_missing += check("data.js assets", find_paths(DATA_JS.read_text(encoding="utf-8")))
    else:
        all_missing.append("data.js")
        print("MISSING: data.js")

    if HOMEPAGE_JSON.exists():
        all_missing += check("homepage.json assets", find_paths(HOMEPAGE_JSON.read_text(encoding="utf-8")))

    if REGISTRY.exists():
        registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
        all_missing += check("logo registry assets", sorted(set(registry.get("logos", {}).values())))

    print("")
    if all_missing:
        print(f"FAILED: {len(all_missing)} missing asset reference(s).")
        sys.exit(1)

    print("PASSED: no missing asset references found.")

if __name__ == "__main__":
    main()
