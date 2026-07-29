#!/usr/bin/env python3
"""Publish the user-approved 2026 Boys post-JO rankings.

This script is intentionally deterministic and scoped:
- replaces only the four Boys ranking groups;
- publishes the approved top 100 JO entrants per age;
- normalizes tournament colors into A/B/C/D club depth;
- preserves existing identities/URLs when a same-club/same-depth row exists;
- rebuilds public club exports and data.js;
- never changes Girls ranking order.
"""
from __future__ import annotations

import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APPROVED = ROOT / "data" / "ranking-releases" / "boys-post-jo-2026-approved.json"
RANKINGS = ROOT / "rankings.json"
CLUBS = ROOT / "clubs.json"
CLUB_REGISTRY = ROOT / "club-registry.json"
IDENTITY_OVERRIDES = ROOT / "config" / "identity-manual-overrides.json"
DATA_JS = ROOT / "data.js"
AUDIT_JSON = ROOT / "qa" / "boys-post-jo-2026-ranking-audit.json"
RELEASE = "7.52.0"
UPDATE_LABEL = "2026 Boys Post-JO Rankings"

BOYS_GROUPS = ["12U Boys", "14U Boys", "16U Boys", "18U Boys"]
COLOR_TOKENS = {
    "red", "blue", "white", "black", "gold", "silver", "navy", "green",
    "orange", "opal", "cardinal", "yellow", "purple", "gray", "grey",
    "maroon", "teal", "drivers",
}
LEVEL_TOKENS = {"a", "b", "c", "d"}
DISPLAY_OVERRIDES = {
    "680": "680",
    "808": "808",
    "908": "908",
    "asa": "ASA",
    "boa": "BOA",
    "cc united": "CC United",
    "cdm": "CDM",
    "chawp": "CHAWP",
    "ciu": "CIU",
    "cmac": "CMAC",
    "ct premier": "CT Premier",
    "cvu": "CVU",
    "eca": "ECA",
    "la premier": "LA Premier",
    "lawpc": "LAWPC",
    "lb shore": "Long Beach Shore",
    "long beach shore": "Long Beach Shore",
    "lowpo": "LOWPO",
    "lv legends": "LV Legends",
    "ngen": "NGen",
    "nipc": "NIPC",
    "norcal": "NorCal",
    "ocwpc": "OCWPC",
    "orwp": "ORWP",
    "pac": "Pasadena AC",
    "pv wpc": "PV WPC",
    "sd dons": "SD Dons",
    "sd shores": "San Diego Shores",
    "set": "SET",
    "sfv": "SFV",
    "shaq": "SHAQ",
    "skip": "SKIP",
    "kern premier": "Kern Premier",
    "slap": "SLAP",
    "smac": "SMAC",
    "socal": "SOCAL",
    "tsm": "TSM",
    "wcac united": "WCAC United",
    "ypro": "YPro",
}
BASE_ALIASES = {
    "vegas north irvine": "North Irvine",
    "north irvine": "North Irvine",
    "shore aquatics": "Long Beach Shore",
    "lb shore": "Long Beach Shore",
    "long beach shore": "Long Beach Shore",
    "sd shores": "San Diego Shores",
    "san diego shores": "San Diego Shores",
    "sd dons": "SD Dons",
    "san diego dons": "SD Dons",
    "santa barbara wpc": "Santa Barbara",
    "sbwpc": "Santa Barbara",
    "cc united": "CC United",
    "ciu seniors": "CIU",
    "channel islands united": "CIU",
    "ciu": "CIU",
    "la premier": "LA Premier",
    "la jolla united": "La Jolla United",
    "norcal": "NorCal",
    "socal": "SOCAL",
    "set": "SET",
    "cmac": "CMAC",
    "smac": "SMAC",
    "san jose foundation": "SJ Foundation",
    "san jose wpf": "SJ Foundation",
    "san jose express": "San Jose Express",
    "sj express": "San Jose Express",
    "cal republic": "Cal Rep",
    "cal rep": "Cal Rep",
    "kern premier": "Kern Premier",
    "skip": "SKIP",
    "rancho tsunami": "Rancho Tsunami",
    "tsunami": "Rancho Tsunami",
    "topaz tsunami": "Topaz Tsunami",
    "corona del mar": "CDM",
    "cdm": "CDM",
    "central valley united": "CVU",
    "cvu": "CVU",
    "club daygo": "Club Daygo",
    "daygo": "Club Daygo",
    "pac": "Pasadena AC",
    "pasadena ac": "Pasadena AC",
    "pv wpc": "PV WPC",
    "palos verdes": "PV WPC",
    "nado": "Nado",
    "coronado": "Nado",
    "lb viking": "Viking",
    "viking": "Viking",
    "asphalt green": "Asphalt Green",
    "berkeley": "Berkeley WPC",
    "loyola": "Loyola WPC",
    "eca": "SD ECA",
    "honolulu": "Honolulu Water Polo",
    "chula vista premier": "CV Premier",
    "brookyln hustle": "Brooklyn Hustle",
    "brooklyn hustle": "Brooklyn Hustle",
    "third coast aquatics": "Third Coast",
    "third coast": "Third Coast",
    "navy": "Navy",
    "texas thunder": "Thunder",
    "gold coast": "Gold Coast",
    "team santa monica": "TSM",
    "san francisco warriors": "San Francisco",
    "texas thunder north": "Thunder",
    "texas thunder south": "Thunder",
    "texas thunder": "Thunder",
}
CLUB_SLUG_OVERRIDES = {
    "Long Beach Shore": "long-beach-shore",
    "San Diego Shores": "san-diego-shores",
    "SJ Foundation": "sj-foundation",
    "San Jose Express": "san-jose-express",
    "Santa Barbara": "santa-barbara",
    "SKIP": "skip",
    "Kern Premier": "kern-premier",
    "Rancho Tsunami": "rancho-tsunami",
    "Pasadena AC": "pasadena-ac",
    "PV WPC": "pv-wpc",
    "Cal Rep": "cal-rep",
    "North Irvine": "north-irvine",
    "CDM": "cdm",
    "CIU": "ciu",
    "CVU": "cvu",
    "SOCAL": "socal",
    "SET": "set",
    "NGen": "ngen",
    "WCAC United": "wcac-united",
    "Berkeley WPC": "berkeley-wpc",
    "Loyola WPC": "loyola-wpc",
    "SD ECA": "sd-eca",
    "Honolulu Water Polo": "honolulu-water-polo",
    "CV Premier": "cv-premier",
    "Brooklyn Hustle": "brooklyn-hustle",
    "Third Coast": "third-coast",
    "Thunder": "thunder",
}


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def norm(value: str) -> str:
    text = unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode("ascii")
    text = text.lower().replace("&", " and ")
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", norm(value)).strip("-") or "unknown"


def title_name(value: str) -> str:
    key = norm(value)
    if key in DISPLAY_OVERRIDES:
        return DISPLAY_OVERRIDES[key]
    return " ".join(word.capitalize() for word in key.split())


def infer_club(source_team: str) -> str:
    original = norm(source_team)
    if original in BASE_ALIASES:
        return BASE_ALIASES[original]
    # Preserve club names whose final word is part of the brand.
    if original in {"asphalt green", "gold coast", "topaz tsunami"}:
        return BASE_ALIASES.get(original, title_name(original))
    parts = original.split()
    while parts and (parts[-1] in COLOR_TOKENS or parts[-1] in LEVEL_TOKENS):
        parts.pop()
    base = " ".join(parts)
    # Tournament-specific descriptors that are not part of the club identity.
    base = re.sub(r"\b13a$", "", base).strip()
    if base.startswith("texas thunder north") or base.startswith("texas thunder south"):
        base = "texas thunder"
    if base.startswith("vegas north irvine"):
        base = "north irvine"
    if base.startswith("san francisco warriors"):
        base = "san francisco"
    if base.startswith("team santa monica"):
        base = "tsm"
    if base.startswith("ciu seniors"):
        base = "ciu"
    if base.startswith("santa barbara wpc"):
        base = "santa barbara"
    return BASE_ALIASES.get(base, title_name(base))


def initials(value: str) -> str:
    words = re.findall(r"[A-Za-z0-9]+", str(value or ""))
    return "".join(w[0].upper() for w in words[:3]) or "WPI"


def team_depth_label(depth: int) -> str:
    return {1: "primary/A-level", 2: "secondary/B-level", 3: "tertiary/C-level", 4: "quaternary/D-level"}.get(depth, f"depth-{depth}")


def record_games(record: str) -> int:
    nums = [int(x) for x in re.findall(r"\d+", str(record or ""))[:2]]
    return sum(nums) if nums else 0


def canonical_slug_for_row(row: dict, club_name: str, club_lookup: dict[str, dict]) -> str:
    if club_name in CLUB_SLUG_OVERRIDES:
        return CLUB_SLUG_OVERRIDES[club_name]
    key = norm(club_name)
    if key in club_lookup:
        return club_lookup[key]["slug"]
    return slugify(club_name)


def rebuild_clubs(rankings: list[dict], old_clubs: list[dict]) -> list[dict]:
    profiles = {c["slug"]: c for c in old_clubs}
    grouped: dict[str, list[dict]] = defaultdict(list)
    for row in rankings:
        grouped[row["clubSlug"]].append(row)
    out = []
    for slug in sorted(grouped, key=lambda s: min(r["postRank"] for r in grouped[s])):
        teams = sorted(grouped[slug], key=lambda r: (r["group"], r["postRank"]))
        profile = dict(profiles.get(slug, {}))
        top = min(teams, key=lambda r: r["postRank"])
        club_name = top["club"]
        profile.update({
            "club": club_name,
            "displayName": profile.get("displayName") or top.get("displayClubName") or club_name,
            "slug": slug,
            "initials": profile.get("initials") or initials(club_name),
            "teamCount": len(teams),
            "bestRank": min(r["postRank"] for r in teams),
            "avgCPI": round(sum(float(r.get("postCPI") or 0) for r in teams) / len(teams), 1),
            "primaryColor": profile.get("primaryColor") or top.get("primaryColor") or "#073763",
            "secondaryColor": profile.get("secondaryColor") or top.get("secondaryColor") or "#F7B500",
            "website": profile.get("website") or top.get("website") or "",
            "region": profile.get("region") or top.get("region") or "Region TBD",
            "logo": profile.get("logo") or top.get("logo") or "assets/logos/cpi-logo-fallback.svg",
            "logoStatus": profile.get("logoStatus") or ("verified_by_user" if "canonical" in str(top.get("logo")) else "fallback"),
            "clubPage": f"club.html?club={slug}",
            "identityStatus": profile.get("identityStatus") or "generated_from_post_jo_rankings",
            "teams": teams,
            "topTeam": min(teams, key=lambda r: r["postRank"]),
        })
        out.append(profile)
    return out


def replace_data_js(rankings: list[dict], clubs: list[dict]) -> None:
    lines = DATA_JS.read_text(encoding="utf-8").splitlines()
    by_group = {group: sorted([r for r in rankings if r.get("group") == group], key=lambda x: x["postRank"]) for group in BOYS_GROUPS}
    out = []
    homepage_payload = None
    for line in lines:
        if line.startswith("window.CPI_PLATFORM = "):
            payload = json.loads(line[len("window.CPI_PLATFORM = "):-1])
            payload["currentUpdate"] = UPDATE_LABEL
            payload["release"] = RELEASE
            payload.setdefault("rankingDataReadiness", {})["juniorOlympics"] = "Boys post-JO rankings published; Girls review remains separate"
            payload["rankingDataReadiness"]["boysPostJORankings"] = "12U, 14U, 16U and 18U Boys top 100 published"
            line = "window.CPI_PLATFORM = " + json.dumps(payload, separators=(",", ":"), ensure_ascii=True) + ";"
        elif line.startswith("window.CPI_RANKINGS = "):
            line = "window.CPI_RANKINGS = " + json.dumps(rankings, separators=(",", ":"), ensure_ascii=True) + ";"
        elif line.startswith("window.CPI_CLUBS = "):
            line = "window.CPI_CLUBS = " + json.dumps(clubs, separators=(",", ":"), ensure_ascii=True) + ";"
        elif line.startswith("window.CPI_GROUP_HUBS = "):
            hubs = json.loads(line[len("window.CPI_GROUP_HUBS = "):-1])
            for hub in hubs:
                group = hub.get("group")
                if group not in by_group:
                    continue
                rows = by_group[group]
                movers = sorted([r for r in rows if isinstance(r.get("preRank"), int)], key=lambda r: abs(int(r.get("movement") or 0)), reverse=True)[:3]
                hub.update({
                    "status": "live",
                    "heroLabel": "Post-JO Rankings",
                    "heroTitle": f"{group} Post-JO Rankings",
                    "heroSummary": "Approved 2026 Boys rankings anchored by Junior Olympics division, subdivision, final placement, head-to-head results, and full-season evidence.",
                    "topTeams": rows[:3],
                    "biggestMovers": movers,
                    "topStory": {
                        "eyebrow": "Post-JO Rankings",
                        "title": f"{group} post-JO rankings are live",
                        "summary": "The published top 100 reflects the approved JO-first review and full-season guardrails.",
                        "url": f"rankings.html?group={group.lower().replace(' ', '-')}"
                    },
                    "modules": [
                        {"label": "Ranked Teams", "value": str(len(rows))},
                        {"label": "Current #1", "value": rows[0]["team"]},
                        {"label": "Latest Event", "value": "Junior Olympics"},
                        {"label": "Release", "value": RELEASE},
                    ],
                    "headline": f"{group} Post-JO Rankings",
                    "description": "Final approved 2026 Boys post-JO ranking order with JO division and subdivision guardrails.",
                    "rankedTeams": len(rows),
                    "lastUpdated": f"Release {RELEASE}",
                    "modelStatus": "Post-JO published",
                })
            line = "window.CPI_GROUP_HUBS = " + json.dumps(hubs, separators=(",", ":"), ensure_ascii=True) + ";"
        elif line.startswith("window.CPI_TOURNAMENTS = "):
            tournaments = json.loads(line[len("window.CPI_TOURNAMENTS = "):-1])
            jo = next((x for x in tournaments if x.get("slug") == "junior-olympics"), None)
            if jo:
                jo.update({"status": "completed / Boys rankings published", "weightTier": "Tier 1 / season anchor", "notes": "Weekend 2 Boys results are included in the approved 12U, 14U, 16U and 18U post-JO rankings."})
            else:
                tournaments.insert(0, {"name": "Junior Olympics", "slug": "junior-olympics", "status": "completed / Boys rankings published", "weightTier": "Tier 1 / season anchor", "notes": "Weekend 2 Boys results are included in the approved post-JO rankings."})
            line = "window.CPI_TOURNAMENTS = " + json.dumps(tournaments, separators=(",", ":"), ensure_ascii=True) + ";"
        elif line.startswith("window.CPI_STORIES = "):
            stories = json.loads(line[len("window.CPI_STORIES = "):-1])
            stories = [x for x in stories if x.get("title") != "Boys post-JO rankings are live"]
            stories.insert(0, {"title": "Boys post-JO rankings are live", "label": "Rankings", "summary": "Approved top-100 rankings are now published for 12U, 14U, 16U and 18U Boys.", "url": "rankings.html?group=12u-boys"})
            line = "window.CPI_STORIES = " + json.dumps(stories, separators=(",", ":"), ensure_ascii=True) + ";"
        elif line.startswith("window.CPI_HOMEPAGE = "):
            homepage = json.loads(line[len("window.CPI_HOMEPAGE = "):-1])
            homepage_payload = homepage
            hero = homepage.setdefault("hero", {}).setdefault("slides", [])
            post_slide = {
                "tag": "Post-JO Rankings",
                "title": "Boys post-JO rankings are live",
                "summary": "The approved top 100 for 12U, 14U, 16U and 18U Boys now reflects Junior Olympics and the full 2026 season.",
                "image": "assets/logos/cpi-logo-fallback.svg",
                "primaryCta": {"label": "View Boys rankings", "url": "rankings.html?group=12u-boys"},
                "secondaryCta": {"label": "Tournament results", "url": "tournaments/jo-boys/index.html"},
            }
            hero[:] = [post_slide] + [x for x in hero if x.get("title") != post_slide["title"]][:2]
            stories = homepage.setdefault("stories", [])
            post_story = {"category": "Rankings", "title": "Boys post-JO rankings published", "summary": "Four age groups and 400 JO entrants are now represented in the approved ranking release.", "image": "assets/logos/cpi-logo-fallback.svg", "url": "rankings.html?group=12u-boys", "meta": f"Release {RELEASE}"}
            stories[:] = [post_story] + [x for x in stories if x.get("title") != post_story["title"]][:2]
            line = "window.CPI_HOMEPAGE = " + json.dumps(homepage, separators=(",", ":"), ensure_ascii=True) + ";"
        out.append(line)
    DATA_JS.write_text("\n".join(out) + "\n", encoding="utf-8")
    if homepage_payload is not None:
        write_json(ROOT / "data" / "homepage.json", homepage_payload)


def main() -> None:
    approved = read_json(APPROVED)
    old_rankings = read_json(RANKINGS)
    old_clubs = read_json(CLUBS)
    overrides = read_json(IDENTITY_OVERRIDES)

    # The user explicitly approved this canonical merge.
    overrides.setdefault("clubCanonicalSlugs", {})["shore-aquatics"] = "long-beach-shore"
    overrides.setdefault("clubAliases", {}).setdefault("club-long-beach-shore", [])
    for alias in ["Shore Aquatics", "LB Shore", "Long Beach Shore"]:
        if alias not in overrides["clubAliases"]["club-long-beach-shore"]:
            overrides["clubAliases"]["club-long-beach-shore"].append(alias)
    write_json(IDENTITY_OVERRIDES, overrides)

    old_club_lookup: dict[str, dict] = {}
    for club in old_clubs:
        for value in [club.get("club"), club.get("displayName"), club.get("slug")]:
            if value:
                old_club_lookup[norm(value)] = club

    # Canonicalize existing club slugs for lookup.
    canonical_slug_map = overrides.get("clubCanonicalSlugs", {})
    old_by_group_club_depth: dict[tuple[str, str, int], list[dict]] = defaultdict(list)
    for row in old_rankings:
        cslug = canonical_slug_map.get(row.get("clubSlug"), row.get("clubSlug"))
        depth = int(row.get("teamDepth") or 1)
        old_by_group_club_depth[(row.get("group"), cslug, depth)].append(row)

    final_boys: list[dict] = []
    audit_rows = []

    for group in BOYS_GROUPS:
        rows = approved["ages"][group]
        age = group.split()[0]
        # Infer canonical club and assign depth by JO strength within that club.
        club_buckets: dict[str, list[dict]] = defaultdict(list)
        for row in rows:
            club_name = infer_club(row["sourceTeam"])
            club_slug = canonical_slug_for_row(row, club_name, old_club_lookup)
            club_slug = canonical_slug_map.get(club_slug, club_slug)
            item = dict(row)
            item["clubName"] = club_name
            item["clubSlug"] = club_slug
            club_buckets[club_slug].append(item)

        processed = []
        for club_slug, members in club_buckets.items():
            members.sort(key=lambda r: r["proposedRank"])
            start_depth = 2 if norm(members[0]["clubName"]) == "trilogy" else 1
            for idx, item in enumerate(members):
                item["teamDepth"] = start_depth + idx
                processed.append(item)
        processed.sort(key=lambda r: r["proposedRank"])

        used_slugs = set()
        for item in processed:
            rank = int(item["proposedRank"])
            depth = int(item["teamDepth"])
            club_name = item["clubName"]
            club_slug = item["clubSlug"]
            multi = len(club_buckets[club_slug]) > 1
            suffix = {1: "A", 2: "B", 3: "C", 4: "D"}.get(depth, str(depth))
            team_name = f"{club_name} {suffix}" if multi or depth > 1 else club_name

            candidates = old_by_group_club_depth.get((group, club_slug, depth), [])
            existing = None
            mapped = str(item.get("mappedInitialIdentity") or "").strip()
            if mapped:
                existing = next((r for r in candidates if norm(r.get("team")) == norm(mapped)), None)
            if existing is None and candidates:
                existing = min(candidates, key=lambda r: abs(int(r.get("postRank") or 999) - rank))

            profile = old_club_lookup.get(norm(club_name), {})
            if not profile and club_slug in {c.get("slug") for c in old_clubs}:
                profile = next((c for c in old_clubs if c.get("slug") == club_slug), {})
            logo_path = profile.get("logo") or f"assets/logos/canonical/{club_slug}.webp"
            if not (ROOT / logo_path).exists():
                logo_path = "assets/logos/cpi-logo-fallback.svg"

            if existing:
                row = dict(existing)
                slug = existing["slug"]
                previous_rank = existing.get("postRank")
                previous_cpi = existing.get("postCPI")
            else:
                slug = f"{slugify(team_name)}-{age.lower()}-boys"
                if slug in used_slugs:
                    slug = f"{slug}-{rank}"
                previous_rank = item.get("initialRank") if isinstance(item.get("initialRank"), int) else None
                previous_cpi = item.get("initialCPI") if isinstance(item.get("initialCPI"), (int, float)) else None
                row = {}
            used_slugs.add(slug)

            # Rank-calibrated score: preserves descending order while retaining a familiar WPI range.
            post_cpi = round(2200.0 - (rank - 1) * 7.5, 1)
            jo_games = record_games(item.get("joRecord"))
            previous_games = int(existing.get("gamesTracked") or 0) if existing else 0
            division_tier = {"Championship": "D1", "Classic": "D2", "Invitational": "D3"}.get(item["joDivision"], "")
            row.update({
                "season": "2026",
                "group": group,
                "gender": "Boys",
                "ageGroup": age,
                "postRank": rank,
                "preRank": previous_rank,
                "movement": (previous_rank - rank) if isinstance(previous_rank, int) else 0,
                "team": team_name,
                "slug": slug,
                "club": club_name,
                "clubSlug": club_slug,
                "initials": initials(team_name),
                "clubInitials": initials(club_name),
                "postCPI": post_cpi,
                "cpiChange": round(post_cpi - float(previous_cpi), 1) if isinstance(previous_cpi, (int, float)) else 0.0,
                "latestTournament": "Junior Olympics",
                "latestTournamentRecord": item.get("joRecord") or "",
                "bestWinClean": (existing or {}).get("bestWinClean") or item.get("bestWin") or "",
                "gamesLatest": jo_games,
                "gamesTracked": previous_games + jo_games,
                "bestDivisionTier": division_tier,
                "teamDepth": depth,
                "teamDepthLabel": team_depth_label(depth),
                "boysContextGames": previous_games + jo_games,
                "eliteContextGames": previous_games + jo_games,
                "preJORanking": f"Pre-JO {group}",
                "rankingFlags": [
                    "2026_boys_post_jo_published",
                    f"jo_{item['joDivision'].lower()}_{item['joSubdivision'].lower()}",
                ],
                "primaryColor": profile.get("primaryColor") or (existing or {}).get("primaryColor") or "#073763",
                "secondaryColor": profile.get("secondaryColor") or (existing or {}).get("secondaryColor") or "#F7B500",
                "teamPage": f"team.html?team={slug}",
                "clubPage": f"club.html?club={club_slug}",
                "logo": logo_path,
                "website": profile.get("website") or (existing or {}).get("website") or "",
                "region": profile.get("region") or (existing or {}).get("region") or "Region TBD",
                "displayClubName": profile.get("displayName") or club_name,
                "previousRank": previous_rank,
                "previousCPI": previous_cpi,
                "rankingUpdate": UPDATE_LABEL,
                "joDivision": item["joDivision"],
                "joSubdivision": item["joSubdivision"],
                "joDivisionFinish": item["divisionFinish"],
                "joSubdivisionFinish": item["subdivisionFinish"],
                "joDerivedRank": item["joDerivedRank"],
            })
            row.pop("canonicalClubId", None)
            row.pop("canonicalTeamId", None)
            final_boys.append(row)
            audit_rows.append({
                "group": group,
                "rank": rank,
                "sourceTeam": item["sourceTeam"],
                "publishedTeam": team_name,
                "club": club_name,
                "clubSlug": club_slug,
                "depth": depth,
                "previousRank": previous_rank,
                "joDivision": item["joDivision"],
                "joSubdivision": item["joSubdivision"],
                "joDerivedRank": item["joDerivedRank"],
            })

    girls = [r for r in old_rankings if r.get("gender") == "Girls"]
    rankings = girls + final_boys

    # User-approved club consolidation: Shore Aquatics and Long Beach Shore are one club.
    shore_by_group: dict[str, list[dict]] = defaultdict(list)
    for row in rankings:
        if row.get("clubSlug") in {"shore-aquatics", "long-beach-shore"}:
            shore_by_group[row["group"]].append(row)
    long_beach_profile = next((c for c in old_clubs if c.get("slug") == "long-beach-shore"), {})
    for group, members in shore_by_group.items():
        members.sort(key=lambda r: r["postRank"])
        for idx, row in enumerate(members, start=1):
            row["club"] = "Long Beach Shore"
            row["clubSlug"] = "long-beach-shore"
            row["displayClubName"] = long_beach_profile.get("displayName") or "Long Beach Shore"
            row["clubPage"] = "club.html?club=long-beach-shore"
            row["logo"] = long_beach_profile.get("logo") or "assets/logos/canonical/long-beach-shore.webp"
            row["primaryColor"] = long_beach_profile.get("primaryColor") or row.get("primaryColor") or "#073763"
            row["secondaryColor"] = long_beach_profile.get("secondaryColor") or row.get("secondaryColor") or "#F7B500"
            row["teamDepth"] = idx
            row["teamDepthLabel"] = team_depth_label(idx)
            row["team"] = f"Long Beach Shore {chr(64 + idx)}" if len(members) > 1 else "Long Beach Shore"
            row["initials"] = initials(row["team"])
            row["clubInitials"] = initials("Long Beach Shore")
            row.pop("canonicalClubId", None)
            row.pop("canonicalTeamId", None)

    rankings.sort(key=lambda r: (BOYS_GROUPS.index(r["group"]) if r["group"] in BOYS_GROUPS else 100 + ["12U Girls", "14U Girls", "16U Girls", "18U Girls"].index(r["group"]), r["postRank"]))

    write_json(RANKINGS, rankings)
    clubs = rebuild_clubs(rankings, old_clubs)
    write_json(CLUBS, clubs)
    write_json(CLUB_REGISTRY, clubs)
    replace_data_js(rankings, clubs)
    write_json(AUDIT_JSON, {
        "schemaVersion": 1,
        "release": RELEASE,
        "approvedTeams": len(final_boys),
        "groupCounts": {g: sum(1 for r in final_boys if r["group"] == g) for g in BOYS_GROUPS},
        "identityRules": [
            "Tournament colors normalized to A/B/C/D by JO strength within club and age.",
            "Shore Aquatics and Long Beach Shore share the long-beach-shore canonical club.",
            "North Irvine source labels never publish as Vegas North Irvine.",
            "Kern Premier and SKIP remain separate club and team identities in every age group.",
            "Trilogy Invitational entries begin at B-level.",
            "Only JO entrants are published; each Boys age is capped at top 100.",
        ],
        "rows": audit_rows,
    })
    print(json.dumps({"publishedBoys": len(final_boys), "totalRankings": len(rankings), "clubs": len(clubs)}, indent=2))


if __name__ == "__main__":
    main()
