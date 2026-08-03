#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIT_PATH = ROOT / "data" / "club-location-audit-7.54.18.json"
LOCATION_FIELDS = [
    "region", "city", "state", "country", "locationLabel", "metroRegion",
    "macroRegion", "locationConfidence", "locationSource",
]


def load_json(rel: str):
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))


def write_json(rel: str, value):
    (ROOT / rel).write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def update_rows(rows: list[dict], approved_by_id: dict[str, dict], approved_by_slug: dict[str, dict]) -> list[dict]:
    output = []
    for raw in rows:
        row = dict(raw)
        approved = approved_by_id.get(row.get("canonicalClubId")) or approved_by_slug.get(row.get("slug"))
        if approved:
            for field in LOCATION_FIELDS:
                row[field] = approved.get(field, "")
            # Club records carry nested ranked-team summaries; synchronize those too.
            for nested_key in ("teams",):
                if isinstance(row.get(nested_key), list):
                    for team in row[nested_key]:
                        if not isinstance(team, dict):
                            continue
                        for field in LOCATION_FIELDS:
                            team[field] = approved.get(field, "")
            if isinstance(row.get("topTeam"), dict):
                for field in LOCATION_FIELDS:
                    row["topTeam"][field] = approved.get(field, "")
            # Keep the audit's regional-only marker available without changing public schemas.
            row["locationReviewStatus"] = "city_pending" if approved.get("cityPending") else "approved"
        output.append(row)
    return output


def update_rankings(rows: list[dict], approved_by_id: dict[str, dict], approved_by_slug: dict[str, dict]) -> list[dict]:
    output = []
    for raw in rows:
        row = dict(raw)
        approved = approved_by_id.get(row.get("canonicalClubId")) or approved_by_slug.get(row.get("clubSlug"))
        if approved:
            for field in LOCATION_FIELDS:
                row[field] = approved.get(field, "")
        output.append(row)
    return output


def update_csv(approved_by_id: dict[str, dict], approved_by_slug: dict[str, dict]):
    path = ROOT / "club-registry.csv"
    with path.open(newline="", encoding="utf-8-sig") as handle:
        rows = list(csv.DictReader(handle))
        fields = list(rows[0].keys()) if rows else []
    for field in LOCATION_FIELDS + ["locationReviewStatus"]:
        if field not in fields:
            insert_at = fields.index("logo") if "logo" in fields else len(fields)
            fields.insert(insert_at, field)
    for row in rows:
        approved = approved_by_id.get(row.get("canonicalClubId")) or approved_by_slug.get(row.get("slug"))
        if approved:
            for field in LOCATION_FIELDS:
                row[field] = approved.get(field, "")
            row["locationReviewStatus"] = "city_pending" if approved.get("cityPending") else "approved"
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def update_overrides(approved_by_id: dict[str, dict]):
    path = ROOT / "config" / "identity-manual-overrides.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    profile = data.setdefault("clubProfileOverrides", {})
    for club_id, approved in approved_by_id.items():
        entry = profile.setdefault(club_id, {})
        for field in LOCATION_FIELDS:
            entry[field] = approved.get(field, "")
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def update_tournament_participants(approved_by_id: dict[str, dict]):
    path = ROOT / "data" / "tournaments" / "identity" / "participants.json"
    if not path.exists():
        return
    data = json.loads(path.read_text(encoding="utf-8"))
    changed = 0
    for participant in data.get("participants", []):
        approved = approved_by_id.get(participant.get("canonicalClubId"))
        if not approved:
            continue
        for field in LOCATION_FIELDS:
            participant[field] = approved.get(field, "")
        changed += 1
    data["locationRelease"] = "7.54.18"
    data.setdefault("counts", {})["locationSynchronizedParticipants"] = changed
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def update_site_release():
    path = ROOT / "config" / "site-release.json"
    site = json.loads(path.read_text(encoding="utf-8"))
    site.update({
        "version": "7.54.18",
        "name": "Club Location and National Region Foundation",
        "date": "2026-08-03",
        "notes": "Applies the user-reviewed club location audit, introduces Hawaii and directional U.S. regions, classifies Barcelona Lions as Spain, and launches a real state-boundary club region map. Rankings remain unchanged.",
        "clubLocationRelease": "7.54.18",
        "publicExperienceRelease": "7.54.18",
        "navigationRelease": site.get("navigationRelease", "7.54.13"),
    })
    path.write_text(json.dumps(site, indent=2) + "\n", encoding="utf-8")


def update_data_js_platform():
    path = ROOT / "data.js"
    text = path.read_text(encoding="utf-8")
    match = re.search(r"window\.CPI_PLATFORM = (.*?);\n", text)
    if not match:
        return
    platform = json.loads(match.group(1))
    platform["clubLocationCoverage"] = {
        "release": "7.54.18",
        "clubs": 182,
        "cityResolved": 182,
        "cityPending": 0,
        "californiaRegions": 9,
        "nationalRegions": 7,
        "internationalClubs": 1,
    }
    platform["currentUpdate"] = "Club locations, national regions, and U.S. map"
    replacement = "window.CPI_PLATFORM = " + json.dumps(platform, separators=(",", ":"), ensure_ascii=True) + ";\n"
    path.write_text(text[:match.start()] + replacement + text[match.end():], encoding="utf-8")


def main():
    audit = json.loads(AUDIT_PATH.read_text(encoding="utf-8"))
    approved = audit.get("clubs", [])
    if len(approved) != 182:
        raise SystemExit(f"Expected 182 approved club rows, found {len(approved)}")
    approved_by_id = {row["canonicalClubId"]: row for row in approved}
    approved_by_slug = {row["slug"]: row for row in approved}

    clubs = update_rows(load_json("clubs.json"), approved_by_id, approved_by_slug)
    registry = update_rows(load_json("club-registry.json"), approved_by_id, approved_by_slug)
    rankings = update_rankings(load_json("rankings.json"), approved_by_id, approved_by_slug)

    write_json("clubs.json", clubs)
    write_json("club-registry.json", registry)
    write_json("rankings.json", rankings)
    update_csv(approved_by_id, approved_by_slug)
    update_overrides(approved_by_id)
    update_tournament_participants(approved_by_id)
    update_site_release()

    subprocess.run([sys.executable, "scripts/build-identity-registry.py"], cwd=ROOT, check=True)
    subprocess.run([sys.executable, "scripts/build-club-pages.py"], cwd=ROOT, check=True)
    update_data_js_platform()

    print("WPI CLUB LOCATION AUDIT 7.54.18 APPLIED")
    print(" - 182 clubs synchronized across public, identity, ranking, and profile data")
    print(" - all 182 clubs have city-level locations; Back Bay is based in Irvine, California")
    print(" - Hawaii plus Northwest, Southwest, Mountain West, Midwest, Northeast, Southeast, and International regions")
    print(" - Barcelona Lions classified as Barcelona, Spain")


if __name__ == "__main__":
    main()
