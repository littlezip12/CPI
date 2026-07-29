#!/usr/bin/env python3
"""Consolidate duplicate club families and propagate canonical identities everywhere.

Families covered:
- Clovis / Clovis Water Polo Club / Clovis Red -> club-clovis
- Vnited / Visalia United -> club-visalia-united
- Kern Premier remains distinct from Kearns and SKIP

This script updates rankings, club exports, identity overrides, normalized tournament
participants, logo compatibility aliases, and generated identity/profile artifacts.
It never changes rank order, WPI values, scores, records, placements, or pathways.
"""
from __future__ import annotations

import csv
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]


def load(rel: str) -> Any:
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))


def write(rel: str, value: Any) -> None:
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def norm(value: Any) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", str(value or "").lower())).strip()


def compute_club_record(base: dict[str, Any], rows: list[dict[str, Any]]) -> dict[str, Any]:
    ranked = [r for r in rows if isinstance(r.get("postRank"), int)]
    avg = round(sum(float(r.get("postCPI") or 0) for r in ranked) / len(ranked), 1) if ranked else None
    best = min((r.get("postRank") for r in ranked), default=None)
    top = min(ranked, key=lambda r: r.get("postRank", 9999)) if ranked else None
    out = dict(base)
    out.update({
        "teamCount": len(rows),
        "bestRank": best,
        "avgCPI": avg,
        "rankedTeams": len(ranked),
        "averageCPI": avg,
        "teams": sorted(rows, key=lambda r: (str(r.get("group") or ""), int(r.get("postRank") or 9999), str(r.get("team") or ""))),
        "topTeam": dict(top) if top else None,
        "canonicalClubId": f"club-{out['slug']}",
    })
    return out


def main() -> int:
    rankings = load("rankings.json")
    clubs = load("clubs.json")
    by_slug = {c.get("slug"): c for c in clubs}

    clovis_base = dict(by_slug["clovis-red"])
    clovis_base.update({
        "club": "Clovis",
        "displayName": "Clovis Water Polo Club",
        "slug": "clovis",
        "initials": "C",
        "logo": "assets/logos/canonical/clovis.webp",
        "clubPage": "club.html?club=clovis",
        "canonicalClubId": "club-clovis",
        "identityStatus": "verified",
        "city": "Clovis",
        "state": "CA",
        "country": "United States",
        "locationLabel": "Clovis, CA",
        "metroRegion": "Fresno / Clovis",
        "macroRegion": "California",
        "locationConfidence": "high",
        "locationSource": "Clovis Water Polo Club",
    })

    visalia_base = dict(by_slug["visalia-united"])
    visalia_base.update({
        "club": "Visalia United",
        "displayName": "Visalia United",
        "slug": "visalia-united",
        "initials": "VU",
        "logo": "assets/logos/canonical/visalia-united.webp",
        "clubPage": "club.html?club=visalia-united",
        "canonicalClubId": "club-visalia-united",
        "identityStatus": "verified",
    })

    ranking_changes = {"clovis": 0, "visalia": 0}
    for row in rankings:
        slug = row.get("clubSlug")
        if slug in {"clovis", "clovis-red"}:
            row.update({
                "club": "Clovis",
                "clubSlug": "clovis",
                "displayClubName": "Clovis Water Polo Club",
                "clubInitials": "C",
                "logo": "assets/logos/canonical/clovis.webp",
                "website": clovis_base.get("website", ""),
                "region": "Central Valley",
                "primaryColor": clovis_base.get("primaryColor", "#C8102E"),
                "secondaryColor": clovis_base.get("secondaryColor", "#111111"),
                "clubPage": "club.html?club=clovis",
                "canonicalClubId": "club-clovis",
                "city": "Clovis",
                "state": "CA",
                "country": "United States",
                "locationLabel": "Clovis, CA",
                "metroRegion": "Fresno / Clovis",
                "macroRegion": "California",
            })
            ranking_changes["clovis"] += 1
        elif slug in {"vnited", "visalia-united"}:
            row.update({
                "club": "Visalia United",
                "clubSlug": "visalia-united",
                "displayClubName": "Visalia United",
                "clubInitials": "VU",
                "logo": "assets/logos/canonical/visalia-united.webp",
                "website": visalia_base.get("website", ""),
                "region": "Central Valley",
                "primaryColor": visalia_base.get("primaryColor", "#073763"),
                "secondaryColor": visalia_base.get("secondaryColor", "#F7B500"),
                "clubPage": "club.html?club=visalia-united",
                "canonicalClubId": "club-visalia-united",
                "city": "Visalia",
                "state": "CA",
                "country": "United States",
                "locationLabel": "Visalia, CA",
                "metroRegion": "Visalia / Tulare County",
                "macroRegion": "California",
            })
            ranking_changes["visalia"] += 1

    clovis_rows = [r for r in rankings if r.get("clubSlug") == "clovis"]
    visalia_rows = [r for r in rankings if r.get("clubSlug") == "visalia-united"]
    merged_clovis = compute_club_record(clovis_base, clovis_rows)
    merged_visalia = compute_club_record(visalia_base, visalia_rows)

    merged_clubs = [c for c in clubs if c.get("slug") not in {"clovis", "clovis-red", "vnited", "visalia-united"}]
    merged_clubs.extend([merged_clovis, merged_visalia])
    merged_clubs.sort(key=lambda c: (str(c.get("displayName") or c.get("club") or "").lower(), str(c.get("slug") or "")))

    write("rankings.json", rankings)
    write("clubs.json", merged_clubs)
    write("club-registry.json", merged_clubs)

    # Keep future rebuilds canonical even if an old source name reappears.
    overrides = load("config/identity-manual-overrides.json")
    overrides.setdefault("clubCanonicalSlugs", {}).update({
        "clovis-red": "clovis",
        "vnited": "visalia-united",
    })
    overrides.setdefault("clubAliases", {}).setdefault("club-clovis", [])
    overrides["clubAliases"]["club-clovis"] = sorted(set(overrides["clubAliases"]["club-clovis"] + [
        "Clovis", "Clovis Water Polo Club", "Clovis WPC", "Clovis Red"
    ]))
    overrides.setdefault("clubAliases", {}).setdefault("club-visalia-united", [])
    overrides["clubAliases"]["club-visalia-united"] = sorted(set(overrides["clubAliases"]["club-visalia-united"] + [
        "Visalia United", "Vnited", "V'nited"
    ]))
    overrides.setdefault("clubProfileOverrides", {})["club-clovis"] = {
        "name": "Clovis", "displayName": "Clovis Water Polo Club", "region": "Central Valley",
        "city": "Clovis", "state": "CA", "country": "United States", "locationLabel": "Clovis, CA",
        "metroRegion": "Fresno / Clovis", "macroRegion": "California", "locationConfidence": "high",
        "locationSource": "Clovis Water Polo Club", "website": clovis_base.get("website", ""),
        "logo": "assets/logos/canonical/clovis.webp", "primaryColor": clovis_base.get("primaryColor", "#C8102E"),
        "secondaryColor": clovis_base.get("secondaryColor", "#111111")
    }
    overrides["clubProfileOverrides"]["club-visalia-united"] = {
        "name": "Visalia United", "displayName": "Visalia United", "region": "Central Valley",
        "city": "Visalia", "state": "CA", "country": "United States", "locationLabel": "Visalia, CA",
        "metroRegion": "Visalia / Tulare County", "macroRegion": "California", "locationConfidence": "high",
        "locationSource": "Visalia United Water Polo", "website": visalia_base.get("website", ""),
        "logo": "assets/logos/canonical/visalia-united.webp", "primaryColor": visalia_base.get("primaryColor", "#073763"),
        "secondaryColor": visalia_base.get("secondaryColor", "#F7B500")
    }
    write("config/identity-manual-overrides.json", overrides)

    # Logo aliases remain supported, but duplicate clubs disappear from public data.
    logo_registry = load("data/logo-registry.json")
    logo_registry.setdefault("logos", {})["clovis-red"] = "assets/logos/canonical/clovis.webp"
    logo_registry["logos"]["vnited"] = "assets/logos/canonical/visalia-united.webp"
    write("data/logo-registry.json", logo_registry)

    # Remove duplicate rows from CSV registries.
    for rel, slug_field in [("club-registry.csv", "slug")]:
        path = ROOT / rel
        if path.exists():
            with path.open(newline="", encoding="utf-8-sig") as handle:
                reader = csv.DictReader(handle); fields = reader.fieldnames or []; rows = list(reader)
            rows = [r for r in rows if r.get(slug_field) not in {"clovis-red", "vnited"}]
            with path.open("w", newline="", encoding="utf-8") as handle:
                writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore"); writer.writeheader(); writer.writerows(rows)

    # Correct every normalized tournament participant, including historical datasets.
    team_ids = {
        (r.get("group"), norm(r.get("team"))): r.get("canonicalTeamId")
        for r in rankings if r.get("canonicalTeamId")
    }
    primary_by_group = {
        "14U Boys": team_ids.get(("14U Boys", "clovis a")),
        "16U Boys": team_ids.get(("16U Boys", "clovis a")),
        "18U Boys": team_ids.get(("18U Boys", "clovis a")),
        "14U Girls": team_ids.get(("14U Girls", "clovis a")),
        "16U Girls": team_ids.get(("16U Girls", "clovis")),
        "18U Girls": team_ids.get(("18U Girls", "clovis")),
    }
    visalia_team_ids = {
        "16U Boys": team_ids.get(("16U Boys", "vnited")),
        "18U Boys": team_ids.get(("18U Boys", "vnited")),
        "16U Girls": team_ids.get(("16U Girls", "visalia united")),
    }
    normalized_files = 0; participant_updates = 0
    for path in sorted((ROOT / "data/tournaments/normalized").glob("*/*.json")):
        data = json.loads(path.read_text(encoding="utf-8")); touched = False
        for game in data.get("games", []):
            group = f"{game.get('ageGroup')} {game.get('gender')}"
            for participant in game.get("participants", {}).values():
                if participant.get("kind") != "team":
                    continue
                name = norm(participant.get("displayName") or participant.get("raw"))
                club_id = None; team_id = participant.get("teamId")
                if name.startswith("clovis"):
                    club_id = "club-clovis"
                    if not team_id and name == "clovis": team_id = primary_by_group.get(group)
                elif name.startswith("vnited") or name.startswith("visalia united"):
                    club_id = "club-visalia-united"
                    if not team_id and name in {"vnited", "vnited a", "visalia united"}: team_id = visalia_team_ids.get(group)
                elif name.startswith("kern premier"):
                    club_id = "club-kern-premier"
                elif name.startswith("kearns"):
                    club_id = "club-kearns"
                if club_id:
                    desired = {
                        "clubId": club_id,
                        "teamId": team_id,
                        "participantId": team_id or participant.get("participantId"),
                        "rankingEligible": bool(team_id),
                        "identityStatus": "resolved_team" if team_id else "resolved_club_only",
                        "identityMatchType": "team_alias" if team_id else "club_alias",
                    }
                    for key, value in desired.items():
                        if participant.get(key) != value:
                            participant[key] = value; touched = True
                    participant_updates += 1
        if touched:
            path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            normalized_files += 1

    # Rebuild all downstream identity and profile artifacts.
    commands = [
        [sys.executable, "scripts/build-identity-registry.py"],
        [sys.executable, "scripts/build-tournament-evidence.py"],
        [sys.executable, "scripts/build-tournament-archive.py"],
        [sys.executable, "scripts/build-historical-profiles.py"],
        [sys.executable, "scripts/build-jo-profile-bridge.py"],
        [sys.executable, "scripts/build-club-pages.py"],
    ]
    for command in commands:
        subprocess.run(command, cwd=ROOT, check=True)

    # Compatibility redirects for old public URLs.
    redirects = {"clovis-red": "clovis", "vnited": "visalia-united"}
    for old, new in redirects.items():
        (ROOT / "club" / f"{old}.html").write_text(
            f'<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=../club.html?club={new}"><title>Club moved | WPI</title><script>location.replace("../club.html?club={new}");</script>',
            encoding="utf-8",
        )

    audit = {
        "release": "7.52.12",
        "canonicalFamilies": {
            "club-clovis": {"aliases": ["clovis", "clovis-red"], "rankedTeams": len(clovis_rows)},
            "club-visalia-united": {"aliases": ["visalia-united", "vnited"], "rankedTeams": len(visalia_rows)},
            "club-kern-premier": {"distinctFrom": ["club-kearns", "club-skip"]},
        },
        "counts": {
            "publicClubs": len(merged_clubs),
            "rankingRows": len(rankings),
            "rankingRowsUpdated": ranking_changes,
            "normalizedFilesUpdated": normalized_files,
            "participantRowsReviewed": participant_updates,
        },
        "guardrail": "No rank, WPI, score, record, placement, or tournament-path value was changed.",
    }
    write("data/identity/club-family-cleanup-7.52.12.json", audit)
    print(json.dumps(audit, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
