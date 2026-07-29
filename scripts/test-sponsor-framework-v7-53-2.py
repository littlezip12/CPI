#!/usr/bin/env python3
"""Regression checks for the WPI 7.53.2 sponsor framework."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RELEASE = "7.53.2"


def fail(message: str) -> None:
    raise SystemExit(f"Sponsor framework check failed: {message}")


config_path = ROOT / "data/sponsors/index.json"
runtime_path = ROOT / "data/sponsors/runtime.js"
framework_path = ROOT / "js/sponsor-framework-v7-53-2.js"
css_path = ROOT / "css/sponsor-framework-v7-53-2.css"

for path in (config_path, runtime_path, framework_path, css_path, ROOT / "docs/SPONSOR_FRAMEWORK.md"):
    if not path.exists():
        fail(f"missing {path.relative_to(ROOT)}")

config = json.loads(config_path.read_text())
if config.get("release") != RELEASE:
    fail(f"config release is {config.get('release')!r}, expected {RELEASE}")
if config.get("status") != "ready_no_active_campaigns":
    fail("release must ship with no active advertiser")
if config.get("campaigns") != []:
    fail("campaign list must be empty until a real sponsor is approved")
if config.get("privacy") != {
    "collectsPersonalData": False,
    "usesCookies": False,
    "usesLocalStorage": False,
    "clickTrackingEnabled": False,
    "outboundAttribution": "UTM parameters only",
}:
    fail("privacy contract changed")
if "never influences WPI rankings" not in config.get("disclosure", ""):
    fail("independence disclosure is missing")

placements = config.get("placements") or []
ids = [placement.get("id") for placement in placements]
expected = {
    "club.presenting", "club.inline", "club.region",
    "team.presenting", "team.inline",
    "rankings.presenting", "rankings.inline",
    "tournaments.presenting", "tournaments.inline",
    "regions.directory",
}
if set(ids) != expected or len(ids) != len(set(ids)):
    fail(f"placement inventory changed: {ids}")
for placement in placements:
    if not placement.get("label") or not placement.get("format"):
        fail(f"placement metadata incomplete: {placement.get('id')}")
    if not placement.get("mount", {}).get("selectors"):
        fail(f"placement mount missing: {placement.get('id')}")

runtime = runtime_path.read_text().strip()
match = re.fullmatch(r"window\.WPI_SPONSOR_CONFIG = (.*);", runtime, flags=re.S)
if not match:
    fail("runtime assignment format is invalid")
if json.loads(match.group(1)) != config:
    fail("runtime.js is not synchronized with index.json")

framework = framework_path.read_text()
for token in (
    'rel="sponsored noopener noreferrer"',
    'utm_source',
    'utm_medium',
    'wpi:sponsors-rendered',
    'campaign.status === "active"',
    'document.querySelectorAll("[data-wpi-sponsor-placement]")',
):
    if token not in framework:
        fail(f"framework contract missing {token}")
for forbidden in ("localStorage", "sessionStorage", "document.cookie", "fetch(", "XMLHttpRequest"):
    if forbidden in framework:
        fail(f"privacy regression: framework contains {forbidden}")

root_pages = [
    "club.html", "team.html", "rankings.html", "clubs.html", "tournaments.html", "quicksilver-cup-2026.html",
    "12u-boys.html", "12u-girls.html", "14u-boys.html", "14u-girls.html",
    "16u-boys.html", "16u-girls.html", "18u-boys.html", "18u-girls.html",
]
sub_pages = [
    "tournaments/boys-superfinals/index.html",
    "tournaments/girls-club-championships/index.html",
    "tournaments/jo-boys/index.html",
    "tournaments/jo-girls/index.html",
    "tournaments/quicksilver-cup/index.html",
]
for rel in root_pages:
    text = (ROOT / rel).read_text()
    for ref in (
        'css/sponsor-framework-v7-53-2.css?v=7.53.2',
        'data/sponsors/runtime.js?v=7.53.2',
        'js/sponsor-framework-v7-53-2.js?v=7.53.2',
    ):
        if ref not in text:
            fail(f"{rel} missing {ref}")
for rel in sub_pages:
    text = (ROOT / rel).read_text()
    for ref in (
        '../../css/sponsor-framework-v7-53-2.css?v=7.53.2',
        '../../data/sponsors/runtime.js?v=7.53.2',
        '../../js/sponsor-framework-v7-53-2.js?v=7.53.2',
    ):
        if ref not in text:
            fail(f"{rel} missing {ref}")

club_js = (ROOT / "js/club-profile-v7-53-0.js").read_text()
if "renderSponsorModule" in club_js or 'id="club-partners"' in club_js or "WPI partner opportunity" in club_js:
    fail("legacy always-visible club sponsor solicitation remains")
if "rankings and results are not influenced by sponsorship" not in club_js:
    fail("club profile independence language was removed")

# Protect the positive data baseline while adding commercial infrastructure.
data_lines = (ROOT / "data.js").read_text().splitlines()
def assigned_json(prefix: str):
    line = next((line for line in data_lines if line.startswith(prefix)), None)
    if line is None or not line.endswith(";"):
        fail(f"could not read {prefix}")
    return json.loads(line[len(prefix):-1])
rankings = assigned_json("window.CPI_RANKINGS = ")
clubs = assigned_json("window.CPI_CLUBS = ")
if len(rankings) != 724:
    fail(f"ranking count changed: {len(rankings)}")
if len(clubs) != 182:
    fail(f"club count changed: {len(clubs)}")
if sum(bool(club.get("website")) for club in clubs) != 177:
    fail("club website coverage changed")

jo_results = json.loads((ROOT / "data/tournaments/jo-results-2026.json").read_text())
if jo_results.get("summary", {}).get("teamPlacements") != 976:
    fail("JO placement count changed")

print("WPI 7.53.2 sponsor framework check passed.")
print(f"  {len(placements)} placements; 0 active campaigns; {len(rankings)} rankings; {len(clubs)} clubs; 976 JO placements")
