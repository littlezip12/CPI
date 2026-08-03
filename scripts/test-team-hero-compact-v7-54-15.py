#!/usr/bin/env python3
from pathlib import Path
import json, sys
ROOT = Path(__file__).resolve().parents[1]
errors=[]
read=lambda rel:(ROOT/rel).read_text(encoding="utf-8")
site=json.loads(read("config/site-release.json"))
for key, expected in {
    "version":"7.54.17",
    "publicExperienceRelease":"7.54.17",
    "sectionLandingRelease":"7.54.15",
    "teamDirectoryRelease":"7.54.14",
}.items():
    if site.get(key)!=expected: errors.append(f"{key} must be {expected}")
teams=read("teams.html")
if 'css/section-landing-v7-53-4.css?v=7.54.15' not in teams: errors.append("Teams page does not load compact hero CSS")
css=read("css/section-landing-v7-53-4.css")
for token in (
    'height: 276px',
    'max-height: 276px',
    'grid-template-columns: minmax(0, 1.56fr) minmax(280px, .44fr)',
    'font-size: clamp(32px, 3vw, 44px)',
    'object-position: center 52%',
    'height: 136px',
):
    if token not in css: errors.append(f"compact Teams hero missing {token}")
if 'wpi-section-hero-facts' in teams: errors.append("oversized hero facts returned")
if errors:
    print("WPI TEAM HERO 7.54.15 TEST FAILED")
    for error in errors: print(f" - {error}")
    sys.exit(1)
print("WPI TEAM HERO 7.54.15 TEST PASSED")
print(" - Desktop hero is capped at 276px with a narrower athlete photo")
print(" - Team title, copy, and actions use a smaller visual footprint")
print(" - Tablet and mobile crops retain the athletes without restoring the oversized layout")
