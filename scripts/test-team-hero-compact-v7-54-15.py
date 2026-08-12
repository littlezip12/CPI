#!/usr/bin/env python3
from pathlib import Path
import json, sys
ROOT = Path(__file__).resolve().parents[1]
errors=[]
read=lambda rel:(ROOT/rel).read_text(encoding="utf-8")
site=json.loads(read("config/site-release.json"))
for key, expected in {
    "sectionLandingRelease":"7.54.15",
    "teamDirectoryRelease":"7.54.14",
}.items():
    if site.get(key)!=expected: errors.append(f"{key} must be {expected}")
if site.get("version") not in {"7.54.18", "7.55.0", "7.55.1", "7.55.2", "7.55.4", "7.55.5", "7.55.6", "7.55.7", "7.55.8", "7.55.9", "7.56.0", "7.56.1", "7.56.2", "7.56.3", "7.56.4", "7.56.7", "7.56.8","7.56.9", "7.56.11", "7.56.12", "7.56.13","7.56.14", "7.56.15","7.57.0", "7.57.1", "7.57.2", "7.57.3", "7.57.4", "7.57.5", "7.57.6", "7.57.7", "7.57.8", "7.57.9", "7.57.10", "7.57.11", "7.57.12", "7.57.13", "7.57.14", "7.57.15", "7.57.16", "7.57.17", "7.57.18", "7.57.19"}: errors.append("version must preserve 7.54.18 or later")
if site.get("publicExperienceRelease") not in {"7.54.18", "7.55.0", "7.55.1", "7.55.2", "7.55.4", "7.55.5", "7.55.6", "7.55.7", "7.55.8", "7.55.9", "7.56.0", "7.56.1", "7.56.2", "7.56.3", "7.56.4", "7.56.7", "7.56.8","7.56.9", "7.56.11", "7.56.12", "7.56.13","7.56.14", "7.56.15","7.57.0", "7.57.1", "7.57.2", "7.57.3", "7.57.4", "7.57.5", "7.57.6", "7.57.7", "7.57.8", "7.57.9", "7.57.10", "7.57.11", "7.57.12", "7.57.13", "7.57.14", "7.57.15", "7.57.16", "7.57.17", "7.57.18", "7.57.19"}: errors.append("publicExperienceRelease must preserve 7.54.18 or later")
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
