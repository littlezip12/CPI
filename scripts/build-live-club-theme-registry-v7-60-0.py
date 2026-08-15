#!/usr/bin/env python3
"""Build the WPI Live club-theme registry from canonical WPI club identity.

7.60.0 deliberately separates *known WPI identity* from *Live theme activation*.
Every canonical club is emitted as a theme candidate with its verified WPI colors/logo,
but only explicitly reviewed club IDs in config/live-club-theme-overrides.json are enabled.
"""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
CLUBS = ROOT / "data/identity/clubs.json"
OVERRIDES = ROOT / "config/live-club-theme-overrides.json"
OUT_JSON = ROOT / "data/live/club-theme-registry.json"
OUT_JS = ROOT / "js/live-club-theme-registry-v7-60-0.js"
RELEASE = "7.60.0"


def normalize_alias(value):
    value = re.sub(r"\s+", " ", str(value or "").strip().lower())
    return value


def hex_to_rgb(value, fallback="#174EA6"):
    value = str(value or fallback).strip().lstrip("#")
    if len(value) == 3:
        value = "".join(ch * 2 for ch in value)
    if not re.fullmatch(r"[0-9a-fA-F]{6}", value):
        value = fallback.lstrip("#")
    return ",".join(str(int(value[i:i+2], 16)) for i in (0, 2, 4))


def darken(value, factor=.72):
    value = str(value or "#174EA6").strip().lstrip("#")
    if not re.fullmatch(r"[0-9a-fA-F]{6}", value):
        value = "174EA6"
    rgb = [int(value[i:i+2], 16) for i in (0, 2, 4)]
    return "#" + "".join(f"{max(0,min(255,round(c*factor))):02X}" for c in rgb)


def lighten(value, amount=.72):
    value = str(value or "#F7B500").strip().lstrip("#")
    if not re.fullmatch(r"[0-9a-fA-F]{6}", value):
        value = "F7B500"
    rgb = [int(value[i:i+2], 16) for i in (0, 2, 4)]
    vals = [round(c + (255-c)*amount) for c in rgb]
    return "#" + "".join(f"{max(0,min(255,c)):02X}" for c in vals)


clubs = json.loads(CLUBS.read_text(encoding="utf-8"))
settings = json.loads(OVERRIDES.read_text(encoding="utf-8"))
enabled = set(settings.get("enabledClubIds") or [])
overrides = settings.get("overrides") or {}

rows = []
for club in clubs:
    cid = club.get("id")
    if not cid:
        continue
    primary = club.get("primaryColor") or "#174EA6"
    secondary = club.get("secondaryColor") or "#F7B500"
    ovr = overrides.get(cid) or {}
    primary = ovr.get("primary") or primary
    secondary_theme = ovr.get("secondary") or primary
    accent = ovr.get("accent") or secondary
    aliases = []
    for raw in [club.get("slug"), club.get("name"), club.get("displayName"), *(club.get("legacySlugs") or [])]:
        alias = normalize_alias(raw)
        if alias and alias not in aliases:
            aliases.append(alias)
    # Longest aliases first prevents e.g. Lamorinda Brentwood from falling through to Lamorinda.
    aliases.sort(key=len, reverse=True)
    row = {
        "clubId": cid,
        "slug": club.get("slug") or "",
        "label": club.get("displayName") or club.get("name") or club.get("slug") or cid,
        "shortLabel": ovr.get("shortLabel") or club.get("name") or club.get("slug") or cid,
        "aliases": aliases,
        "logo": club.get("logo") or "",
        "canonicalPrimary": club.get("primaryColor") or "",
        "canonicalSecondary": club.get("secondaryColor") or "",
        "liveEnabled": cid in enabled,
        "theme": {
            "primary": primary,
            "primaryDeep": ovr.get("primaryDeep") or darken(primary),
            "secondary": secondary_theme,
            "accent": accent,
            "accentSoft": ovr.get("accentSoft") or lighten(accent),
            "scoreAccent": ovr.get("scoreAccent") or accent,
            "pageWarm": ovr.get("pageWarm") or "#F8F7F2",
            "pageWater": ovr.get("pageWater") or "#E7F2F8",
            "surfaceWarm": ovr.get("surfaceWarm") or "#FFFDF8",
            "primaryRgb": hex_to_rgb(primary),
            "secondaryRgb": hex_to_rgb(secondary_theme),
            "accentRgb": hex_to_rgb(accent),
        }
    }
    rows.append(row)

rows.sort(key=lambda r: (-(max((len(a) for a in r["aliases"]), default=0)), r["label"].lower()))
payload = {
    "schemaVersion": 1,
    "release": RELEASE,
    "source": "data/identity/clubs.json",
    "activationSource": "config/live-club-theme-overrides.json",
    "policy": "canonical_identity_candidates_explicit_live_activation",
    "counts": {
        "canonicalClubs": len(rows),
        "liveEnabled": sum(1 for r in rows if r["liveEnabled"]),
    },
    "clubs": rows,
}
OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
OUT_JSON.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
OUT_JS.write_text(
    "/* WPI 7.60.0 — generated Live club-theme registry. Do not hand-edit; run scripts/build-live-club-theme-registry-v7-60-0.py. */\n"
    "window.WPILiveClubThemeRegistry7600 = " + json.dumps(payload, separators=(",", ":")) + ";\n",
    encoding="utf-8",
)
print(f"Built {OUT_JSON.relative_to(ROOT)} with {payload['counts']['canonicalClubs']} canonical clubs; {payload['counts']['liveEnabled']} Live-enabled.")
print(f"Built {OUT_JS.relative_to(ROOT)} for synchronous/offline-safe scoring-page theme resolution.")
