#!/usr/bin/env python3
"""Apply WPI 7.52.14 club website audit wave 1.

Adds verified official website links for a first high-impact set of clubs,
records coverage/status metadata for every canonical club, and synchronizes
club/team/profile data without changing rankings or tournament results.
"""
from __future__ import annotations

import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RELEASE = "7.52.14"
VERIFIED_AT = "2026-07-27"

VERIFIED = {
    "san-diego-shores": {
        "url": "https://sdshores.org/",
        "source": "Official San Diego Shores club website",
    },
    "chawp": {
        "url": "https://chawp.com/",
        "source": "Official CHAWP Aquatics website",
    },
    "greenwich": {
        "url": "https://greenwichaquaticswaterpolo.com/",
        "source": "Official Greenwich Aquatics Water Polo website",
    },
    "shaq": {
        "url": "https://sleepyhollowaquatics.com/",
        "source": "Official Sleepy Hollow Aquatics / SHAQ website",
    },
    "san-clemente": {
        "url": "https://sanclementewaterpolo.teamsnapsites.com/",
        "source": "Official San Clemente Water Polo Club website",
    },
    "san-jose-express": {
        "url": "https://www.sanjoseexpress.org/",
        "source": "Official San Jose Express Aquatics website",
    },
    "wcac-united": {
        "url": "https://www.gomotionapp.com/team/mawaac/page/home",
        "source": "Official Wissahickon Community Aquatic Club website",
    },
    "long-beach-shore": {
        "url": "https://www.gomotionapp.com/team/shoreaquatics/page/home",
        "source": "Official Long Beach Shore Aquatics website",
    },
    "praetorian": {
        "url": "https://www.praetorianwaterpolo.com/",
        "source": "Official Praetorian Water Polo Club website",
    },
    "santa-cruz": {
        "url": "https://santacruzwaterpoloclub.teamsnap.site/",
        "source": "Official Santa Cruz Water Polo Club website",
    },
    "trojan": {
        "url": "https://www.gomotionapp.com/team/catwp/page/home",
        "source": "Official Trojan Water Polo website",
    },
    "asphalt-green": {
        "url": "https://www.asphaltgreen.org/aquatics/water-polo/",
        "source": "Official Asphalt Green Water Polo page",
    },
    "chicago-park": {
        "url": "https://cpdclubwaterpolo.com/",
        "source": "Official Chicago Park District Water Polo Club website",
    },
    "honolulu-water-polo": {
        "url": "https://www.hnlwaterpolo.org/",
        "source": "Official Honolulu Water Polo website",
    },
    "lyons-aquatics": {
        "url": "https://www.gomotionapp.com/team/illa/page/home",
        "source": "Official LYONS Aquatics website",
    },
}

REVIEW_FLAGS = {
    "foothill": "Possible duplicate/related identity with Foothill Club Water Polo; do not assign a website until the club family is reviewed.",
    "ciu": "Channel Islands United appears to operate as an alliance; standalone official website not yet confirmed.",
    "cdm": "Official club website not confidently verified in this wave.",
    "thunder": "Generic Thunder identity requires club-family verification before assigning the Texas Thunder website.",
    "brooklyn-hustle": "SportsEngine identifies nycap.nyc, but the exact Brooklyn Hustle landing page requires manual verification.",
}


def load(rel: str):
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))


def write(rel: str, value) -> None:
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def apply_metadata(row: dict) -> None:
    slug = row.get("slug") or row.get("clubSlug")
    verified = VERIFIED.get(slug)
    existing = str(row.get("website") or "").strip()
    if verified:
        row["website"] = verified["url"]
        row["websiteStatus"] = "verified_official"
        row["websiteVerifiedAt"] = VERIFIED_AT
        row["websiteSource"] = verified["source"]
        row.pop("websiteReviewNote", None)
    elif existing:
        row["websiteStatus"] = row.get("websiteStatus") or "present_unverified"
        row["websiteSource"] = row.get("websiteSource") or "Existing WPI registry value"
    else:
        row["website"] = ""
        row["websiteStatus"] = "needs_verification" if slug in REVIEW_FLAGS else "missing"
        row["websiteReviewNote"] = REVIEW_FLAGS.get(slug, "")
        row.pop("websiteVerifiedAt", None)
        row.pop("websiteSource", None)


def update_public() -> tuple[list[dict], list[dict]]:
    clubs = load("clubs.json")
    rankings = load("rankings.json")
    by_slug = {club.get("slug"): club for club in clubs}
    for club in clubs:
        apply_metadata(club)
        for team in club.get("teams", []):
            team["website"] = club.get("website", "")
            team["websiteStatus"] = club.get("websiteStatus")
            if club.get("websiteVerifiedAt"):
                team["websiteVerifiedAt"] = club["websiteVerifiedAt"]
            else:
                team.pop("websiteVerifiedAt", None)
    for row in rankings:
        club = by_slug.get(row.get("clubSlug"))
        if not club:
            continue
        row["website"] = club.get("website", "")
        row["websiteStatus"] = club.get("websiteStatus")
        if club.get("websiteVerifiedAt"):
            row["websiteVerifiedAt"] = club["websiteVerifiedAt"]
        else:
            row.pop("websiteVerifiedAt", None)
    write("clubs.json", clubs)
    write("club-registry.json", clubs)
    write("rankings.json", rankings)
    return clubs, rankings


def update_overrides() -> None:
    rel = "config/identity-manual-overrides.json"
    data = load(rel)
    profiles = data.setdefault("clubProfileOverrides", {})
    for slug, info in VERIFIED.items():
        club_id = f"club-{slug}"
        profile = profiles.setdefault(club_id, {})
        profile.update({
            "website": info["url"],
            "websiteStatus": "verified_official",
            "websiteVerifiedAt": VERIFIED_AT,
            "websiteSource": info["source"],
        })
    write(rel, data)


def update_builders() -> None:
    identity_path = ROOT / "scripts/build-identity-registry.py"
    text = identity_path.read_text(encoding="utf-8")
    needle = '            "website": profile_override.get("website") or preferred.get("website") or next((x.get("website") for x in members if x.get("website")), ""),\n'
    replacement = needle + (
        '            "websiteStatus": profile_override.get("websiteStatus") or preferred.get("websiteStatus") or "",\n'
        '            "websiteVerifiedAt": profile_override.get("websiteVerifiedAt") or preferred.get("websiteVerifiedAt") or "",\n'
        '            "websiteSource": profile_override.get("websiteSource") or preferred.get("websiteSource") or "",\n'
        '            "websiteReviewNote": profile_override.get("websiteReviewNote") or preferred.get("websiteReviewNote") or "",\n'
    )
    if '"websiteStatus": profile_override.get("websiteStatus")' not in text:
        if needle not in text:
            raise SystemExit("Could not patch identity website metadata builder")
        text = text.replace(needle, replacement)
        identity_path.write_text(text, encoding="utf-8")

    club_path = ROOT / "scripts/build-club-pages.py"
    text = club_path.read_text(encoding="utf-8")
    text = text.replace(
        '            "website": reg.get("website") or top.get("website") or "",\n',
        '            "website": reg.get("website") or top.get("website") or "",\n'
        '            "websiteStatus": reg.get("websiteStatus") or top.get("websiteStatus") or "",\n'
        '            "websiteVerifiedAt": reg.get("websiteVerifiedAt") or top.get("websiteVerifiedAt") or "",\n'
        '            "websiteSource": reg.get("websiteSource") or "",\n'
    )
    text = text.replace(
        '                "website": reg.get("website") or "",\n',
        '                "website": reg.get("website") or "",\n'
        '                "websiteStatus": reg.get("websiteStatus") or "",\n'
        '                "websiteVerifiedAt": reg.get("websiteVerifiedAt") or "",\n'
        '                "websiteSource": reg.get("websiteSource") or "",\n'
    )
    text = text.replace(
        '    website_link = f\'<a class="club-btn secondary" href="{esc(website)}">Club Website</a>\' if website else ""\n',
        '    website_link = f\'<a class="club-btn secondary" href="{esc(website)}" target="_blank" rel="noopener">Official Club Website</a>\' if website else ""\n'
    )
    club_path.write_text(text, encoding="utf-8")


def update_csv(clubs: list[dict]) -> None:
    path = ROOT / "club-registry.csv"
    fields = [
        "club", "displayName", "slug", "initials", "teamCount", "bestRank", "avgCPI",
        "primaryColor", "secondaryColor", "website", "websiteStatus", "websiteVerifiedAt",
        "websiteSource", "websiteReviewNote", "locationLabel", "city", "state", "country",
        "region", "metroRegion", "macroRegion", "locationConfidence", "locationSource", "logo",
        "logoStatus", "clubPage", "identityStatus", "canonicalClubId",
    ]
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(clubs)


def update_site_release() -> None:
    site = load("config/site-release.json")
    site.update({
        "version": RELEASE,
        "name": "Club Website Audit Wave 1",
        "date": VERIFIED_AT,
        "notes": "Adds 15 verified official club website links, records website verification status for all 182 canonical clubs, and creates a complete missing-link audit without changing rankings, tournament results, placements, or identities.",
        "clubWebsiteRelease": RELEASE,
    })
    write("config/site-release.json", site)
    (ROOT / "VERSION.md").write_text(
        "# WPI 7.52.14\n\nClub website audit — wave 1.\n"
        "- Adds 15 verified official club website links.\n"
        "- Records website coverage and verification status for all 182 canonical clubs.\n"
        "- Generates a complete missing-link audit and flags ambiguous club families for review.\n"
        "- Does not change rankings, CPI values, tournament results, placements, or team identities.\n",
        encoding="utf-8",
    )


def update_data_js(clubs: list[dict], rankings: list[dict]) -> None:
    path = ROOT / "data.js"
    lines = path.read_text(encoding="utf-8").splitlines()
    output = []
    for line in lines:
        if line.startswith("window.CPI_PLATFORM = "):
            payload = json.loads(line[len("window.CPI_PLATFORM = "):-1])
            payload["release"] = RELEASE
            payload["clubWebsiteCoverage"] = {
                "release": RELEASE,
                "totalClubs": len(clubs),
                "websitePresent": sum(bool(str(x.get("website") or "").strip()) for x in clubs),
                "verifiedThisRelease": len(VERIFIED),
                "missing": sum(not bool(str(x.get("website") or "").strip()) for x in clubs),
                "audit": "data/club-website-audit-7.52.14.json",
            }
            line = "window.CPI_PLATFORM = " + json.dumps(payload, separators=(",", ":"), ensure_ascii=True) + ";"
        elif line.startswith("window.CPI_RANKINGS = "):
            line = "window.CPI_RANKINGS = " + json.dumps(rankings, separators=(",", ":"), ensure_ascii=True) + ";"
        elif line.startswith("window.CPI_CLUBS = "):
            line = "window.CPI_CLUBS = " + json.dumps(clubs, separators=(",", ":"), ensure_ascii=True) + ";"
        output.append(line)
    path.write_text("\n".join(output) + "\n", encoding="utf-8")


def build_audit(clubs: list[dict]) -> None:
    rows = []
    for club in sorted(clubs, key=lambda x: str(x.get("displayName") or x.get("club") or x.get("slug")).lower()):
        rows.append({
            "slug": club.get("slug"),
            "club": club.get("displayName") or club.get("club"),
            "region": club.get("region"),
            "locationLabel": club.get("locationLabel") or "",
            "rankedTeams": club.get("teamCount") or club.get("rankedTeams") or 0,
            "website": club.get("website") or "",
            "websiteStatus": club.get("websiteStatus"),
            "websiteVerifiedAt": club.get("websiteVerifiedAt") or "",
            "websiteSource": club.get("websiteSource") or "",
            "reviewNote": club.get("websiteReviewNote") or "",
        })
    present = [row for row in rows if row["website"]]
    verified = [row for row in rows if row["websiteStatus"] == "verified_official"]
    missing = [row for row in rows if not row["website"]]
    review = [row for row in rows if row["websiteStatus"] == "needs_verification"]
    audit = {
        "schemaVersion": 1,
        "release": RELEASE,
        "verifiedAt": VERIFIED_AT,
        "summary": {
            "totalClubs": len(rows),
            "websitePresent": len(present),
            "verifiedOfficial": len(verified),
            "presentUnverified": len(present) - len(verified),
            "missing": len(missing),
            "needsIdentityReview": len(review),
        },
        "verifiedThisRelease": sorted(VERIFIED),
        "reviewFlags": REVIEW_FLAGS,
        "clubs": rows,
    }
    write("data/club-website-audit-7.52.14.json", audit)
    path = ROOT / "qa/club-website-audit-7.52.14.csv"
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def patch_compatibility_tests() -> None:
    # Presentation release advances while ranking/tournament releases remain 7.52.13.
    for path in (ROOT / "scripts").glob("test-*.py"):
        text = path.read_text(encoding="utf-8")
        if "7.52.13" in text and "7.52.14" not in text:
            text = text.replace("'7.52.13'}", "'7.52.13','7.52.14'}")
            text = text.replace('"7.52.13"}', '"7.52.13", "7.52.14"}')
            text = text.replace("site.get('version')!='7.52.13'", "site.get('version') not in {'7.52.13','7.52.14'}")
            text = text.replace('site.get("version") != "7.52.13"', 'site.get("version") not in {"7.52.13", "7.52.14"}')
            path.write_text(text, encoding="utf-8")
    for path in (ROOT / "scripts").glob("test-*.js"):
        text = path.read_text(encoding="utf-8")
        if "7.52.13" in text and "7.52.14" not in text:
            text = text.replace("'7.52.13']", "'7.52.13','7.52.14']")
            path.write_text(text, encoding="utf-8")



def patch_public_cache_keys() -> None:
    for path in ROOT.rglob("*.html"):
        text = path.read_text(encoding="utf-8")
        if "data.js?v=7.52.13" in text:
            path.write_text(text.replace("data.js?v=7.52.13", "data.js?v=7.52.14"), encoding="utf-8")
    for rel in [
        "scripts/test-jo-logo-delivery-v7-52-9.py",
        "scripts/test-boys-post-jo-rankings-v7-52-0.py",
        "scripts/test-girls-post-jo-rankings-v7-52-2.py",
        "scripts/test-kern-skip-separation-v7-52-13.py",
    ]:
        path = ROOT / rel
        value = path.read_text(encoding="utf-8")
        path.write_text(value.replace("data.js?v=7.52.13", "data.js?v=7.52.14"), encoding="utf-8")


def main() -> None:
    update_overrides()
    update_builders()
    clubs, rankings = update_public()
    update_csv(clubs)
    update_data_js(clubs, rankings)
    build_audit(clubs)
    update_site_release()
    patch_compatibility_tests()
    patch_public_cache_keys()
    print(f"Applied {RELEASE}: {len(VERIFIED)} verified websites; {sum(not c.get('website') for c in clubs)} missing.")


if __name__ == "__main__":
    main()
