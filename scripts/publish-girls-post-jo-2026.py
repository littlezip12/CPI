#!/usr/bin/env python3
"""Publish the user-approved 2026 Girls post-JO rankings.

Scoped guarantees:
- replaces only 12U, 14U, 16U and 18U Girls;
- excludes 10U and coed fields;
- ranks only all-girls JO entrants;
- keeps subdivision bands fixed and preserves the approved proposed order;
- normalizes tournament colors into A/B/C/D club depth;
- preserves the already-published Boys ranking order;
- rebuilds public ranking and club exports deterministically.
"""
from __future__ import annotations

import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APPROVED = ROOT / "data" / "ranking-releases" / "girls-post-jo-2026-approved.json"
RANKINGS = ROOT / "rankings.json"
CLUBS = ROOT / "clubs.json"
CLUB_REGISTRY = ROOT / "club-registry.json"
IDENTITY_OVERRIDES = ROOT / "config" / "identity-manual-overrides.json"
IDENTITY_ALIASES = ROOT / "data" / "identity" / "aliases.json"
DATA_JS = ROOT / "data.js"
AUDIT_JSON = ROOT / "qa" / "girls-post-jo-2026-ranking-audit.json"
RELEASE = "7.52.2"
UPDATE_LABEL = "2026 Girls Post-JO Rankings"

GIRLS_GROUPS = ["12U Girls", "14U Girls", "16U Girls", "18U Girls"]
ALL_GROUPS = ["12U Boys", "14U Boys", "16U Boys", "18U Boys"] + GIRLS_GROUPS

DISPLAY_OVERRIDES = {
    "680": "680", "908": "908", "cc united": "CC United", "cdm": "CDM",
    "chawp": "CHAWP", "ciu": "CIU", "cmac": "CMAC", "ct premier": "CT Premier",
    "cvu": "CVU", "eca": "SD ECA", "la premier": "LA Premier", "lowpo": "LOWPO",
    "ngen": "NGen", "nipc": "NIPC", "norcal": "NorCal", "ocwpc": "OCWPC",
    "pac": "Pasadena AC", "pv wpc": "PV WPC", "sd dons": "SD Dons",
    "set": "SET", "sfv": "SFV", "shaq": "SHAQ", "skip": "SKIP",
    "socal": "SoCal", "wcac united": "WCAC United",
}

CANONICAL_NAME_OVERRIDES = {
    "shore aquatics": "Long Beach Shore",
    "lb shore": "Long Beach Shore",
    "long beach shore": "Long Beach Shore",
    "santa barbara wpc": "Santa Barbara",
    "sbwpc": "Santa Barbara",
    "sd shores": "San Diego Shores",
    "san diego shores": "San Diego Shores",
    "san joe express": "San Jose Express",
    "san jose express": "San Jose Express",
    "san jose wpf": "SJ Foundation",
    "san jose foundation": "SJ Foundation",
    "corona del mar": "CDM",
    "cdm": "CDM",
    "la verne legends": "LV Legends",
    "lv legends": "LV Legends",
    "loyola venice": "Loyola WPC",
    "loyola wpc": "Loyola WPC",
    "tri valley": "Tri-Valley Tritons",
    "tri valley tritons": "Tri-Valley Tritons",
    "triton gold": "Tri-Valley Tritons",
    "viper pigeon hill country": "Viper Pigeon",
    "viper pigeon htown": "Viper Pigeon",
    "viper pigeon": "Viper Pigeon",
    "kern premier": "SKIP",
    "skip": "SKIP",
    "palos verdes": "PV WPC",
    "pv wpc": "PV WPC",
    "pasadena ac": "Pasadena AC",
    "pac": "Pasadena AC",
    "nado": "Nado",
    "coronado": "Nado",
    "lb viking": "Viking",
    "viking": "Viking",
    "team santa monica": "TSM",
    "tsm": "TSM",
}

SLUG_OVERRIDES = {
    "Long Beach Shore": "long-beach-shore",
    "Santa Barbara": "santa-barbara",
    "San Diego Shores": "san-diego-shores",
    "San Jose Express": "san-jose-express",
    "SJ Foundation": "sj-foundation",
    "CDM": "cdm",
    "LV Legends": "lv-legends",
    "Loyola WPC": "loyola-wpc",
    "Tri-Valley Tritons": "tri-valley-tritons",
    "Viper Pigeon": "viper-pigeon",
    "SKIP": "skip",
    "PV WPC": "pv-wpc",
    "Pasadena AC": "pasadena-ac",
    "Nado": "nado",
    "Viking": "viking",
    "TSM": "tsm",
    "SD ECA": "sd-eca",
    "SoCal": "socal",
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


def canonical_club_name(value: str) -> str:
    key = norm(value)
    return CANONICAL_NAME_OVERRIDES.get(key, DISPLAY_OVERRIDES.get(key, str(value).strip() or title_name(key)))


def initials(value: str) -> str:
    words = re.findall(r"[A-Za-z0-9]+", str(value or ""))
    return "".join(w[0].upper() for w in words[:3]) or "CPI"


def team_depth_label(depth: int) -> str:
    return {1: "primary/A-level", 2: "secondary/B-level", 3: "tertiary/C-level", 4: "quaternary/D-level"}.get(depth, f"depth-{depth}")


def record_games(record: str) -> int:
    nums = [int(x) for x in re.findall(r"\d+", str(record or ""))[:2]]
    return sum(nums) if nums else 0


def build_alias_slug_map() -> dict[str, str]:
    if not IDENTITY_ALIASES.exists():
        return {}
    payload = read_json(IDENTITY_ALIASES)
    result = {}
    for row in payload.get("clubAliases", []):
        entity_id = str(row.get("entityId") or "")
        if entity_id.startswith("club-"):
            result[norm(row.get("alias") or row.get("normalized"))] = entity_id[5:]
    return result


def canonical_slug(club_name: str, alias_map: dict[str, str], old_lookup: dict[str, dict]) -> str:
    if club_name in SLUG_OVERRIDES:
        return SLUG_OVERRIDES[club_name]
    key = norm(club_name)
    if key in alias_map:
        return alias_map[key]
    if key in old_lookup:
        return old_lookup[key]["slug"]
    return slugify(club_name)


def rebuild_clubs(rankings: list[dict], old_clubs: list[dict]) -> list[dict]:
    profiles = {c["slug"]: c for c in old_clubs}
    grouped: dict[str, list[dict]] = defaultdict(list)
    for row in rankings:
        grouped[row["clubSlug"]].append(row)
    out = []
    for slug in sorted(grouped, key=lambda s: min(r["postRank"] for r in grouped[s])):
        teams = sorted(grouped[slug], key=lambda r: (ALL_GROUPS.index(r["group"]), r["postRank"]))
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
    by_group = {group: sorted([r for r in rankings if r.get("group") == group], key=lambda x: x["postRank"]) for group in GIRLS_GROUPS}
    out = []
    homepage_payload = None
    for line in lines:
        if line.startswith("window.CPI_PLATFORM = "):
            payload = json.loads(line[len("window.CPI_PLATFORM = "):-1])
            payload["currentUpdate"] = UPDATE_LABEL
            payload["release"] = RELEASE
            readiness = payload.setdefault("rankingDataReadiness", {})
            readiness["juniorOlympics"] = "Boys and Girls post-JO rankings published"
            readiness["girlsPostJORankings"] = "12U, 14U, 16U and 18U Girls JO entrants published; 10U and coed excluded"
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
                    "heroSummary": "Approved 2026 Girls rankings anchored by Junior Olympics division, subdivision, placement, head-to-head results, and full-season evidence.",
                    "topTeams": rows[:3],
                    "biggestMovers": movers,
                    "topStory": {
                        "eyebrow": "Post-JO Rankings",
                        "title": f"{group} post-JO rankings are live",
                        "summary": "The published field reflects the approved Girls JO review and full-season guardrails.",
                        "url": f"rankings.html?group={group.lower().replace(' ', '-')}",
                    },
                    "modules": [
                        {"label": "Ranked Teams", "value": str(len(rows))},
                        {"label": "Current #1", "value": rows[0]["team"]},
                        {"label": "Latest Event", "value": "Junior Olympics"},
                        {"label": "Release", "value": RELEASE},
                    ],
                    "headline": f"{group} Post-JO Rankings",
                    "description": "Final approved 2026 Girls post-JO ranking order with division and subdivision guardrails.",
                    "rankedTeams": len(rows),
                    "lastUpdated": f"Release {RELEASE}",
                    "modelStatus": "Post-JO published",
                })
            line = "window.CPI_GROUP_HUBS = " + json.dumps(hubs, separators=(",", ":"), ensure_ascii=True) + ";"
        elif line.startswith("window.CPI_TOURNAMENTS = "):
            tournaments = json.loads(line[len("window.CPI_TOURNAMENTS = "):-1])
            jo = next((x for x in tournaments if x.get("slug") == "junior-olympics"), None)
            note = "Weekend 1 Girls and Weekend 2 Boys results are included in the approved 12U, 14U, 16U and 18U post-JO rankings."
            if jo:
                jo.update({"status": "completed / Boys and Girls rankings published", "weightTier": "Tier 1 / season anchor", "notes": note})
            else:
                tournaments.insert(0, {"name": "Junior Olympics", "slug": "junior-olympics", "status": "completed / rankings published", "weightTier": "Tier 1 / season anchor", "notes": note})
            line = "window.CPI_TOURNAMENTS = " + json.dumps(tournaments, separators=(",", ":"), ensure_ascii=True) + ";"
        elif line.startswith("window.CPI_STORIES = "):
            stories = json.loads(line[len("window.CPI_STORIES = "):-1])
            stories = [x for x in stories if x.get("title") != "Girls post-JO rankings are live"]
            stories.insert(0, {"title": "Girls post-JO rankings are live", "label": "Rankings", "summary": "Approved rankings are now published for all 324 all-girls JO entrants from 12U through 18U.", "url": "rankings.html?group=12u-girls"})
            line = "window.CPI_STORIES = " + json.dumps(stories, separators=(",", ":"), ensure_ascii=True) + ";"
        elif line.startswith("window.CPI_HOMEPAGE = "):
            homepage = json.loads(line[len("window.CPI_HOMEPAGE = "):-1])
            homepage_payload = homepage
            hero = homepage.setdefault("hero", {}).setdefault("slides", [])
            slide = {
                "tag": "Post-JO Rankings",
                "title": "Girls post-JO rankings are live",
                "summary": "All 324 all-girls JO entrants from 12U through 18U are now ranked using the approved JO-first and full-season review.",
                "image": "assets/logos/cpi-logo-fallback.svg",
                "primaryCta": {"label": "View Girls rankings", "url": "rankings.html?group=12u-girls"},
                "secondaryCta": {"label": "Tournament results", "url": "tournaments.html#jo-results-browser"},
            }
            hero[:] = [slide] + [x for x in hero if x.get("title") != slide["title"]][:2]
            stories = homepage.setdefault("stories", [])
            story = {"category": "Rankings", "title": "Girls post-JO rankings published", "summary": "Four age groups and 324 all-girls JO entrants are represented in the approved ranking release.", "image": "assets/logos/cpi-logo-fallback.svg", "url": "rankings.html?group=12u-girls", "meta": f"Release {RELEASE}"}
            stories[:] = [story] + [x for x in stories if x.get("title") != story["title"]][:2]
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
    aliases = build_alias_slug_map()

    # Keep the user-approved Shore Aquatics / Long Beach Shore consolidation.
    overrides.setdefault("clubCanonicalSlugs", {})["shore-aquatics"] = "long-beach-shore"
    overrides.setdefault("clubAliases", {}).setdefault("club-long-beach-shore", [])
    for alias in ["Shore Aquatics", "LB Shore", "Long Beach Shore"]:
        if alias not in overrides["clubAliases"]["club-long-beach-shore"]:
            overrides["clubAliases"]["club-long-beach-shore"].append(alias)
    write_json(IDENTITY_OVERRIDES, overrides)

    old_lookup: dict[str, dict] = {}
    for club in old_clubs:
        for value in [club.get("club"), club.get("displayName"), club.get("slug")]:
            if value:
                old_lookup[norm(value)] = club

    canonical_slug_map = overrides.get("clubCanonicalSlugs", {})
    old_by_group_club_depth: dict[tuple[str, str, int], list[dict]] = defaultdict(list)
    for row in old_rankings:
        cslug = canonical_slug_map.get(row.get("clubSlug"), row.get("clubSlug"))
        old_by_group_club_depth[(row.get("group"), cslug, int(row.get("teamDepth") or 1))].append(row)

    final_girls: list[dict] = []
    audit_rows = []

    for group in GIRLS_GROUPS:
        age = group.split()[0]
        source_rows = approved["ages"][group]
        buckets: dict[str, list[dict]] = defaultdict(list)
        for source in source_rows:
            club_name = canonical_club_name(source.get("club") or source.get("sourceTeam"))
            cslug = canonical_slug(club_name, aliases, old_lookup)
            cslug = canonical_slug_map.get(cslug, cslug)
            item = dict(source)
            item["clubName"] = club_name
            item["clubSlug"] = cslug
            buckets[cslug].append(item)

        processed = []
        for cslug, members in buckets.items():
            members.sort(key=lambda r: int(r["proposedRank"]))
            for idx, item in enumerate(members, start=1):
                item["teamDepth"] = idx
                processed.append(item)
        processed.sort(key=lambda r: int(r["proposedRank"]))

        used_slugs = set()
        for item in processed:
            rank = int(item["proposedRank"])
            depth = int(item["teamDepth"])
            club_name = item["clubName"]
            cslug = item["clubSlug"]
            multi = len(buckets[cslug]) > 1
            suffix = {1: "A", 2: "B", 3: "C", 4: "D"}.get(depth, str(depth))
            team_name = f"{club_name} {suffix}" if multi else club_name

            candidates = old_by_group_club_depth.get((group, cslug, depth), [])
            existing = None
            mapped = str(item.get("mappedInitialIdentity") or "").strip()
            if mapped:
                existing = next((r for r in candidates if norm(r.get("team")) == norm(mapped)), None)
            if existing is None and candidates:
                existing = min(candidates, key=lambda r: abs(int(r.get("postRank") or 999) - rank))

            profile = old_lookup.get(norm(club_name), {})
            if not profile:
                profile = next((c for c in old_clubs if c.get("slug") == cslug), {})
            logo = profile.get("logo") or f"assets/logos/canonical/{cslug}.webp"
            if not (ROOT / logo).exists():
                logo = "assets/logos/cpi-logo-fallback.svg"

            if existing:
                row = dict(existing)
                slug = existing["slug"]
                previous_rank = existing.get("postRank")
                previous_cpi = existing.get("postCPI")
            else:
                slug = f"{slugify(team_name)}-{age.lower()}-girls"
                if slug in used_slugs:
                    slug = f"{slug}-{rank}"
                row = {}
                previous_rank = item.get("initialRank") if isinstance(item.get("initialRank"), int) else None
                previous_cpi = item.get("initialCPI") if isinstance(item.get("initialCPI"), (int, float)) else None
            used_slugs.add(slug)

            post_cpi = round(2200.0 - (rank - 1) * 7.5, 1)
            jo_games = record_games(item.get("joRecord"))
            previous_games = int(existing.get("gamesTracked") or 0) if existing else int(item.get("preJOGames") or 0)
            division_tier = {"Championship": "D1", "Classic": "D2"}.get(item["joDivision"], "")
            row.update({
                "season": "2026", "group": group, "gender": "Girls", "ageGroup": age,
                "postRank": rank, "preRank": previous_rank,
                "movement": (previous_rank - rank) if isinstance(previous_rank, int) else 0,
                "team": team_name, "slug": slug, "club": club_name, "clubSlug": cslug,
                "initials": initials(team_name), "clubInitials": initials(club_name),
                "postCPI": post_cpi,
                "cpiChange": round(post_cpi - float(previous_cpi), 1) if isinstance(previous_cpi, (int, float)) else 0.0,
                "latestTournament": "Junior Olympics", "latestTournamentRecord": item.get("joRecord") or "",
                "bestWinClean": (existing or {}).get("bestWinClean") or item.get("bestWin") or "",
                "gamesLatest": jo_games, "gamesTracked": previous_games + jo_games,
                "bestDivisionTier": division_tier, "teamDepth": depth, "teamDepthLabel": team_depth_label(depth),
                "girlsContextGames": previous_games + jo_games,
                "coedContextGames": int((existing or {}).get("coedContextGames") or 0),
                "eliteContextGames": previous_games + jo_games,
                "eliteContextRecord": item.get("joRecord") or "",
                "majorEventGames": jo_games, "majorEventRecord": item.get("joRecord") or "",
                "preJORanking": f"Pre-JO {group}",
                "rankingFlags": ["2026_girls_post_jo_published", f"jo_{item['joDivision'].lower()}_{item['joSubdivision'].lower()}"],
                "primaryColor": profile.get("primaryColor") or (existing or {}).get("primaryColor") or "#073763",
                "secondaryColor": profile.get("secondaryColor") or (existing or {}).get("secondaryColor") or "#F7B500",
                "teamPage": f"team.html?team={slug}", "clubPage": f"club.html?club={cslug}",
                "logo": logo, "website": profile.get("website") or (existing or {}).get("website") or "",
                "region": profile.get("region") or (existing or {}).get("region") or "Region TBD",
                "displayClubName": profile.get("displayName") or club_name,
                "previousRank": previous_rank, "previousCPI": previous_cpi,
                "rankingUpdate": UPDATE_LABEL,
                "joDivision": item["joDivision"], "joSubdivision": item["joSubdivision"],
                "joDivisionFinish": item["divisionFinish"], "joSubdivisionFinish": item["subdivisionFinish"],
                "joDerivedRank": item["joDerivedRank"],
            })
            row.pop("canonicalClubId", None)
            row.pop("canonicalTeamId", None)
            final_girls.append(row)
            audit_rows.append({
                "group": group, "rank": rank, "sourceTeam": item["sourceTeam"], "publishedTeam": team_name,
                "club": club_name, "clubSlug": cslug, "depth": depth, "previousRank": previous_rank,
                "joDivision": item["joDivision"], "joSubdivision": item["joSubdivision"],
                "joDerivedRank": item["joDerivedRank"],
            })

    boys = [r for r in old_rankings if r.get("gender") == "Boys"]
    rankings = boys + final_girls
    rankings.sort(key=lambda r: (ALL_GROUPS.index(r["group"]), int(r["postRank"])))
    write_json(RANKINGS, rankings)
    clubs = rebuild_clubs(rankings, old_clubs)
    write_json(CLUBS, clubs)
    write_json(CLUB_REGISTRY, clubs)
    replace_data_js(rankings, clubs)
    write_json(AUDIT_JSON, {
        "schemaVersion": 1,
        "release": RELEASE,
        "approvedTeams": len(final_girls),
        "groupCounts": {g: sum(1 for r in final_girls if r["group"] == g) for g in GIRLS_GROUPS},
        "identityRules": [
            "Only 12U, 14U, 16U and 18U all-girls JO entrants are ranked; 10U and coed are excluded.",
            "Tournament colors normalize to functional A/B/C/D depth by JO strength within club and age.",
            "Subdivision bands remain fixed; approved adjacent within-band adjustments are retained.",
            "Shore Aquatics and Long Beach Shore share the long-beach-shore canonical club.",
            "Kern Premier and SKIP remain separate rosters when both appear, under one club hierarchy.",
        ],
        "rows": audit_rows,
    })
    print(json.dumps({"publishedGirls": len(final_girls), "totalRankings": len(rankings), "clubs": len(clubs)}, indent=2))


if __name__ == "__main__":
    main()
