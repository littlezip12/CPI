#!/usr/bin/env python3
"""
CPI Club Registry Builder

Purpose:
- Builds data/club-registry.json from existing CPI data sources.
- Normalizes club slugs.
- Connects clubs to logo-registry.json when available.
- Adds default metadata fields for future club pages.

Usage:
  cd ~/Documents/GitHub/CPI
  python3 scripts/build-club-registry.py
"""

from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
DATA_JS = ROOT / "data.js"
DATA_DIR = ROOT / "data"
CLUB_REGISTRY = DATA_DIR / "club-registry.json"
LOGO_REGISTRY = DATA_DIR / "logo-registry.json"

DEFAULT_COLORS = {
    "primary": "#071426",
    "secondary": "#0B4AA2",
    "accent": "#F8B700",
}

KNOWN_ALIASES = {
    "la-jolla-united-a": "la-jolla-united",
    "la-jolla-united-b": "la-jolla-united",
    "san-diego-dons": "sd-dons",
    "patriot-a": "patriot",
    "patriot-b": "patriot",
    "commerce-a": "commerce",
    "skip-a": "skip",
    "rancho-tsunami-a": "rancho-tsunami",
    "devils-gate-a": "devils-gate",
}

def slugify(value):
    value = str(value or "").lower().strip()
    value = value.replace("&", " and ")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value).strip("-")
    return KNOWN_ALIASES.get(value, value)

def extract_window_var(text, name, default):
    pattern = rf"window\.{name}\s*=\s*(.*?);\s*(?=window\.CPI_|$)"
    match = re.search(pattern, text, re.S)
    if not match:
        return default
    try:
        return json.loads(match.group(1))
    except Exception:
        return default

def load_data_js():
    if not DATA_JS.exists():
        return [], []
    text = DATA_JS.read_text(encoding="utf-8")
    clubs = extract_window_var(text, "CPI_CLUBS", [])
    rankings = extract_window_var(text, "CPI_RANKINGS", [])
    return clubs, rankings

def load_logo_registry():
    if not LOGO_REGISTRY.exists():
        return {}
    try:
        data = json.loads(LOGO_REGISTRY.read_text(encoding="utf-8"))
        return data.get("logos", {})
    except Exception:
        return {}

def best_logo_for(slug, existing_logo, logo_registry):
    if slug in logo_registry:
        return logo_registry[slug]
    if existing_logo:
        return existing_logo
    return "assets/cpi-logo-fallback.svg"

def infer_region(club_name):
    name = (club_name or "").lower()
    if any(x in name for x in ["san diego", "la jolla", "north irvine", "newport", "socal", "set", "commerce", "los angeles", "rose bowl", "orange county", "santa barbara"]):
        return "Southern California"
    if any(x in name for x in ["norcal", "lamorinda", "680", "diablo", "stanford", "alameda", "davis", "american river", "clovis"]):
        return "Northern California"
    return "Region TBD"

def build_registry():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    clubs, rankings = load_data_js()
    logo_registry = load_logo_registry()

    existing = {}
    if CLUB_REGISTRY.exists():
        try:
            existing = json.loads(CLUB_REGISTRY.read_text(encoding="utf-8")).get("clubs", {})
        except Exception:
            existing = {}

    registry = {
        "schemaVersion": "1.0",
        "description": "Canonical club registry for California Polo Index.",
        "clubs": {}
    }

    # Start from CPI_CLUBS
    for c in clubs:
        display = c.get("displayName") or c.get("club") or c.get("name")
        if not display:
            continue
        slug = slugify(c.get("slug") or c.get("club") or display)
        prior = existing.get(slug, {})
        logo = best_logo_for(slug, c.get("logo") or c.get("logoPath"), logo_registry)

        registry["clubs"][slug] = {
            "slug": slug,
            "displayName": prior.get("displayName") or display,
            "abbreviation": prior.get("abbreviation") or c.get("abbreviation") or "",
            "city": prior.get("city") or c.get("city") or "",
            "region": prior.get("region") or c.get("region") or infer_region(display),
            "website": prior.get("website") or c.get("website") or "",
            "logo": logo,
            "colors": prior.get("colors") or {
                "primary": c.get("primaryColor") or DEFAULT_COLORS["primary"],
                "secondary": c.get("secondaryColor") or DEFAULT_COLORS["secondary"],
                "accent": c.get("accentColor") or DEFAULT_COLORS["accent"],
            },
            "verified": bool(prior.get("verified") or c.get("logoStatus") in ["verified_by_user", "resolved"]),
            "notes": prior.get("notes") or "",
            "source": prior.get("source") or "generated-from-cpi-data"
        }

    # Add clubs only found in rankings
    for r in rankings:
        club_name = r.get("club") or r.get("clubDisplayName")
        if not club_name:
            continue
        slug = slugify(club_name)
        if slug not in registry["clubs"]:
            prior = existing.get(slug, {})
            registry["clubs"][slug] = {
                "slug": slug,
                "displayName": prior.get("displayName") or club_name,
                "abbreviation": prior.get("abbreviation") or "",
                "city": prior.get("city") or "",
                "region": prior.get("region") or infer_region(club_name),
                "website": prior.get("website") or "",
                "logo": best_logo_for(slug, r.get("logo") or r.get("clubLogo"), logo_registry),
                "colors": prior.get("colors") or DEFAULT_COLORS,
                "verified": bool(prior.get("verified")),
                "notes": prior.get("notes") or "",
                "source": "generated-from-rankings"
            }

    CLUB_REGISTRY.write_text(json.dumps(registry, indent=2), encoding="utf-8")
    print(f"Wrote {CLUB_REGISTRY.relative_to(ROOT)}")
    print(f"Clubs: {len(registry['clubs'])}")

if __name__ == "__main__":
    build_registry()
