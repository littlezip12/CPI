#!/usr/bin/env python3
"""Build CPI's canonical club/team identity layer from the published ranking snapshot.

The generated registry is deterministic and non-destructive:
- one stable club ID per club slug;
- one stable season/age/gender team ID per ranked team;
- scoped alias resolution so identical club names in different age groups do not collide;
- compatibility outputs for the existing ranking-engine prototype;
- canonical IDs injected into current ranking and club exports without changing display names.
"""
from __future__ import annotations

import csv
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
IDENTITY = DATA / "identity"
CONFIG = ROOT / "config" / "identity-manual-overrides.json"
RELEASE = "7.40.0"
RELEASE_DATE = "2026-07-14"
SCHEMA_VERSION = 1


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def slugify(value: str) -> str:
    text = unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode("ascii")
    text = text.lower().replace("&", " and ")
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-") or "unknown"


def normalize_alias(value: str) -> str:
    text = unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode("ascii")
    text = text.lower().replace("&", " and ")
    text = re.sub(r"^\s*#?\d+\s*[-–—:]\s+(?=[A-Za-z])", "", text)
    text = re.sub(r"\bwater\s+polo\s+club\b", "wpc", text)
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def scope_key(season: str, age: str, gender: str, alias: str) -> str:
    return "|".join([str(season), str(age).lower(), str(gender).lower(), normalize_alias(alias)])


def infer_squad_descriptor(team_name: str, club_name: str) -> str:
    name = str(team_name).strip()
    base = str(club_name).strip()
    if name.lower().startswith(base.lower() + " "):
        suffix = name[len(base):].strip()
        if suffix:
            return suffix
    token = name.split()[-1] if name else ""
    if token.upper() in {"A", "B", "C", "D"} or token.lower() in {
        "red", "blue", "white", "black", "gold", "silver", "navy", "green", "orange", "opal", "cardinal"
    }:
        return token
    return "Primary"


def functional_level(depth) -> str:
    try:
        depth = int(depth)
    except Exception:
        depth = 1
    return {1: "A", 2: "B", 3: "C", 4: "D"}.get(depth, f"Depth {depth}")


def stable_team_id(row: dict, existing: dict, overrides: dict) -> str:
    source_key = "|".join([str(row.get("season")), row.get("group", ""), row.get("slug", "")])
    if source_key in overrides:
        return overrides[source_key]
    old = existing.get(source_key)
    if old:
        return old
    return "team-" + slugify(source_key)


def add_alias(bucket: list[dict], seen: set[tuple], *, alias: str, entity_id: str, entity_type: str,
              source: str, season: str | None = None, age: str | None = None, gender: str | None = None) -> None:
    alias = str(alias or "").strip()
    normalized = normalize_alias(alias)
    if not normalized:
        return
    key = (entity_type, entity_id, normalized, season, age, gender)
    if key in seen:
        return
    seen.add(key)
    row = {
        "alias": alias,
        "normalized": normalized,
        "entityType": entity_type,
        "entityId": entity_id,
        "source": source,
    }
    if season is not None:
        row.update({"season": str(season), "ageGroup": age, "gender": gender})
    bucket.append(row)


def replace_data_js(rankings: list[dict], clubs: list[dict], manifest: dict) -> None:
    path = ROOT / "data.js"
    lines = path.read_text(encoding="utf-8").splitlines()
    out = []
    for line in lines:
        if line.startswith("window.CPI_PLATFORM = "):
            payload = json.loads(line[len("window.CPI_PLATFORM = "):-1])
            payload["identityLayer"] = {
                "release": RELEASE,
                "schemaVersion": SCHEMA_VERSION,
                "clubCount": manifest["counts"]["clubs"],
                "teamCount": manifest["counts"]["teams"],
                "source": "data/identity/manifest.json",
            }
            line = "window.CPI_PLATFORM = " + json.dumps(payload, separators=(",", ":"), ensure_ascii=True) + ";"
        elif line.startswith("window.CPI_RANKINGS = "):
            line = "window.CPI_RANKINGS = " + json.dumps(rankings, separators=(",", ":"), ensure_ascii=True) + ";"
        elif line.startswith("window.CPI_CLUBS = "):
            line = "window.CPI_CLUBS = " + json.dumps(clubs, separators=(",", ":"), ensure_ascii=True) + ";"
        out.append(line)
    path.write_text("\n".join(out) + "\n", encoding="utf-8")


def main() -> None:
    rankings = read_json(ROOT / "rankings.json")
    clubs_source = read_json(ROOT / "clubs.json")
    overrides = read_json(CONFIG) if CONFIG.exists() else {}

    existing_ids: dict[str, str] = {}
    existing_team_path = IDENTITY / "teams.json"
    if existing_team_path.exists():
        for team in read_json(existing_team_path):
            source_key = team.get("sourceKey")
            if source_key and team.get("id"):
                existing_ids[source_key] = team["id"]

    club_by_slug = {club["slug"]: club for club in clubs_source}
    canonical_slug_map = overrides.get("clubCanonicalSlugs", {})
    def canonical_club_slug(legacy_slug: str) -> str:
        return canonical_slug_map.get(legacy_slug, legacy_slug)

    grouped_clubs: dict[str, list[dict]] = defaultdict(list)
    for club in clubs_source:
        grouped_clubs[canonical_club_slug(club["slug"])].append(club)

    canonical_clubs = []
    canonical_club_by_id: dict[str, dict] = {}
    club_aliases: list[dict] = []
    alias_seen: set[tuple] = set()

    for canonical_slug in sorted(grouped_clubs):
        members = grouped_clubs[canonical_slug]
        preferred = next((x for x in members if x["slug"] == canonical_slug), members[0])
        club_id = f"club-{slugify(canonical_slug)}"
        profile_override = overrides.get("clubProfileOverrides", {}).get(club_id, {})
        canonical = {
            "id": club_id,
            "slug": canonical_slug,
            "legacySlugs": sorted(x["slug"] for x in members),
            "name": profile_override.get("name") or preferred.get("club") or preferred.get("displayName"),
            "displayName": profile_override.get("displayName") or preferred.get("displayName") or preferred.get("club"),
            "region": profile_override.get("region") or preferred.get("region") or "Region TBD",
            "city": profile_override.get("city") or preferred.get("city") or "",
            "state": profile_override.get("state") or preferred.get("state") or "",
            "country": profile_override.get("country") or preferred.get("country") or "United States",
            "locationLabel": profile_override.get("locationLabel") or preferred.get("locationLabel") or "",
            "metroRegion": profile_override.get("metroRegion") or preferred.get("metroRegion") or "",
            "macroRegion": profile_override.get("macroRegion") or preferred.get("macroRegion") or "",
            "locationConfidence": profile_override.get("locationConfidence") or preferred.get("locationConfidence") or "",
            "locationSource": profile_override.get("locationSource") or preferred.get("locationSource") or "",
            "website": profile_override.get("website") or preferred.get("website") or next((x.get("website") for x in members if x.get("website")), ""),
            "logo": profile_override.get("logo") or preferred.get("logo") or next((x.get("logo") for x in members if x.get("logo")), "assets/logos/cpi-logo-fallback.svg"),
            "primaryColor": profile_override.get("primaryColor") or preferred.get("primaryColor") or "#073763",
            "secondaryColor": profile_override.get("secondaryColor") or preferred.get("secondaryColor") or "#F7B500",
            "identityStatus": "verified" if any(x.get("identityStatus") == "verified" for x in members) else (preferred.get("identityStatus") or "needs_review"),
            "legacyClubPage": preferred.get("clubPage") or f"club.html?club={preferred['slug']}",
        }
        canonical_clubs.append(canonical)
        canonical_club_by_id[club_id] = canonical
        for member in members:
            for alias, source in [
                (member.get("club"), "legacy_name"),
                (member.get("displayName"), "legacy_display_name"),
                (member.get("slug"), "legacy_slug"),
            ]:
                add_alias(club_aliases, alias_seen, alias=alias, entity_id=club_id, entity_type="club", source=source)
        for alias, source in [(canonical["name"], "canonical_name"), (canonical["displayName"], "display_name")]:
            add_alias(club_aliases, alias_seen, alias=alias, entity_id=club_id, entity_type="club", source=source)
        for alias in overrides.get("clubAliases", {}).get(club_id, []):
            add_alias(club_aliases, alias_seen, alias=alias, entity_id=club_id, entity_type="club", source="manual_override")

    canonical_teams = []
    team_aliases: list[dict] = []
    row_by_key: dict[tuple[str, str], dict] = {}
    team_id_by_key: dict[tuple[str, str], str] = {}
    source_key_to_id: dict[str, str] = {}

    for row in rankings:
        source_key = "|".join([str(row.get("season")), row.get("group", ""), row.get("slug", "")])
        team_id = stable_team_id(row, existing_ids, overrides.get("teamIdOverrides", {}))
        canonical_slug = canonical_club_slug(row["clubSlug"])
        club_id = f"club-{slugify(canonical_slug)}"
        depth = int(row.get("teamDepth") or 1)
        team = {
            "id": team_id,
            "sourceKey": source_key,
            "season": str(row.get("season") or "2026"),
            "group": row["group"],
            "ageGroup": row["ageGroup"],
            "gender": row["gender"],
            "name": row["team"],
            "slug": row["slug"],
            "clubId": club_id,
            "clubSlug": row["clubSlug"],
            "clubName": row["club"],
            "displayClubName": row.get("displayClubName") or row["club"],
            "level": functional_level(depth),
            "depthOrder": depth,
            "depthLabel": row.get("teamDepthLabel") or "",
            "squadDescriptor": infer_squad_descriptor(row["team"], row["club"]),
            "identityStatus": "generated_from_rankings",
            "legacyTeamPage": row.get("teamPage") or f"team.html?team={row['slug']}",
        }
        canonical_teams.append(team)
        row_by_key[(row["group"], row["slug"])] = row
        team_id_by_key[(row["group"], row["slug"])] = team_id
        source_key_to_id[source_key] = team_id

        aliases = [(team["name"], "canonical_name"), (team["slug"], "legacy_slug")]
        club = club_by_slug.get(row["clubSlug"], {})
        short = row["club"]
        canonical_club = canonical_club_by_id.get(club_id, {})
        display = canonical_club.get("displayName") or club.get("displayName") or row.get("displayClubName") or short
        if team["name"].lower().startswith(short.lower() + " "):
            suffix = team["name"][len(short):].strip()
            aliases.append((f"{display} {suffix}", "display_club_variant"))
            for manual_club_alias in overrides.get("clubAliases", {}).get(club_id, []):
                aliases.append((f"{manual_club_alias} {suffix}", "manual_club_variant"))
        elif team["name"].lower() == short.lower() and display.lower() != short.lower():
            aliases.append((display, "display_club_variant"))
        for alias, source in aliases:
            add_alias(team_aliases, alias_seen, alias=alias, entity_id=team_id, entity_type="team", source=source,
                      season=team["season"], age=team["ageGroup"], gender=team["gender"])

    for manual in overrides.get("teamAliases", []):
        team_id = manual.get("teamId")
        team = next((x for x in canonical_teams if x["id"] == team_id), None)
        if not team:
            continue
        for alias in manual.get("aliases", []):
            add_alias(team_aliases, alias_seen, alias=alias, entity_id=team_id, entity_type="team", source="manual_override",
                      season=team["season"], age=team["ageGroup"], gender=team["gender"])

    canonical_teams.sort(key=lambda x: (x["season"], x["ageGroup"], x["gender"], x["clubSlug"], x["depthOrder"], x["name"]))
    team_lookup = {team["id"]: team for team in canonical_teams}

    scoped_candidates: dict[str, set[str]] = defaultdict(set)
    unscoped_candidates: dict[str, set[str]] = defaultdict(set)
    for alias in team_aliases:
        key = scope_key(alias["season"], alias["ageGroup"], alias["gender"], alias["alias"])
        scoped_candidates[key].add(alias["entityId"])
        unscoped_candidates[alias["normalized"]].add(alias["entityId"])

    scoped_index = {key: next(iter(ids)) for key, ids in sorted(scoped_candidates.items()) if len(ids) == 1}
    unscoped_index = {key: next(iter(ids)) for key, ids in sorted(unscoped_candidates.items()) if len(ids) == 1}
    ambiguous_scoped = [
        {"scopeKey": key, "teamIds": sorted(ids), "teams": [team_lookup[x]["name"] for x in sorted(ids)]}
        for key, ids in sorted(scoped_candidates.items()) if len(ids) > 1
    ]
    ambiguous_unscoped = [
        {"alias": key, "teamIds": sorted(ids)} for key, ids in sorted(unscoped_candidates.items()) if len(ids) > 1
    ]

    club_candidates: dict[str, set[str]] = defaultdict(set)
    for alias in club_aliases:
        club_candidates[alias["normalized"]].add(alias["entityId"])
    club_index = {key: next(iter(ids)) for key, ids in sorted(club_candidates.items()) if len(ids) == 1}
    ambiguous_clubs = [
        {"alias": key, "clubIds": sorted(ids)} for key, ids in sorted(club_candidates.items()) if len(ids) > 1
    ]

    # Inject identity references into the existing public exports without changing legacy URLs.
    for row in rankings:
        row["canonicalClubId"] = f"club-{slugify(canonical_club_slug(row['clubSlug']))}"
        row["canonicalTeamId"] = team_id_by_key[(row["group"], row["slug"])]

    clubs_enriched = []
    for club in clubs_source:
        enriched = dict(club)
        enriched["canonicalClubId"] = f"club-{slugify(canonical_club_slug(club['slug']))}"
        teams = []
        for row in club.get("teams", []):
            item = dict(row)
            item["canonicalClubId"] = f"club-{slugify(canonical_club_slug(row['clubSlug']))}"
            item["canonicalTeamId"] = team_id_by_key.get((row["group"], row["slug"]))
            teams.append(item)
        enriched["teams"] = teams
        if enriched.get("topTeam"):
            top = dict(enriched["topTeam"])
            top["canonicalTeamId"] = team_id_by_key.get((top.get("group"), top.get("slug")))
            enriched["topTeam"] = top
        clubs_enriched.append(enriched)

    manifest = {
        "schemaVersion": SCHEMA_VERSION,
        "release": RELEASE,
        "season": "2026",
        "generatedDate": RELEASE_DATE,
        "source": "rankings.json and clubs.json",
        "counts": {
            "clubs": len(canonical_clubs),
            "teams": len(canonical_teams),
            "clubAliases": len(club_aliases),
            "teamAliases": len(team_aliases),
            "scopedResolvableAliases": len(scoped_index),
            "unscopedResolvableAliases": len(unscoped_index),
            "ambiguousScopedAliases": len(ambiguous_scoped),
        },
        "files": {
            "clubs": "data/identity/clubs.json",
            "teams": "data/identity/teams.json",
            "aliases": "data/identity/aliases.json",
            "index": "data/identity/index.json",
            "runtime": "data/identity/runtime.js",
        },
    }

    aliases_payload = {
        "schemaVersion": SCHEMA_VERSION,
        "clubAliases": sorted(club_aliases, key=lambda x: (x["normalized"], x["entityId"])),
        "teamAliases": sorted(team_aliases, key=lambda x: (x["season"], x["ageGroup"], x["gender"], x["normalized"], x["entityId"])),
    }
    index_payload = {
        "schemaVersion": SCHEMA_VERSION,
        "release": RELEASE,
        "clubs": {club["id"]: club for club in canonical_clubs},
        "teams": {team["id"]: team for team in canonical_teams},
        "clubAliasIndex": club_index,
        "teamScopedAliasIndex": scoped_index,
        "teamUnscopedAliasIndex": unscoped_index,
    }

    write_json(IDENTITY / "manifest.json", manifest)
    write_json(IDENTITY / "clubs.json", canonical_clubs)
    write_json(IDENTITY / "teams.json", canonical_teams)
    write_json(IDENTITY / "aliases.json", aliases_payload)
    write_json(IDENTITY / "index.json", index_payload)
    (IDENTITY / "runtime.js").write_text(
        "window.CPI_IDENTITY_RUNTIME=" + json.dumps(index_payload, separators=(",", ":"), ensure_ascii=True) + ";\n",
        encoding="utf-8",
    )

    # Compatibility registries for the current engine prototype. It currently imports 14U Boys only.
    engine_registry = {
        team["id"]: {
            "id": team["id"],
            "name": team["name"],
            "club_id": team["clubId"],
            "team_level": team["level"],
            "age_group": team["ageGroup"],
            "gender": team["gender"],
            "season": team["season"],
        }
        for team in canonical_teams
    }
    engine_aliases = {}
    for key, team_id in scoped_index.items():
        season, age, gender, alias = key.split("|", 3)
        if season == "2026" and age == "14u" and gender == "boys":
            engine_aliases[slugify(alias)] = team_id
    write_json(DATA / "team_registry.json", engine_registry)
    write_json(DATA / "team_alias_lookup.json", engine_aliases)
    write_json(DATA / "team_alias_lookup_with_tournament_normalizer.json", engine_aliases)

    write_json(ROOT / "rankings.json", rankings)
    write_json(ROOT / "clubs.json", clubs_enriched)
    write_json(ROOT / "club-registry.json", clubs_enriched)
    csv_registry = ROOT / "club-registry.csv"
    if csv_registry.exists():
        with csv_registry.open(newline="", encoding="utf-8-sig") as handle:
            legacy_rows = list(csv.DictReader(handle))
        fields = list(legacy_rows[0].keys()) if legacy_rows else ["slug"]
        if "canonicalClubId" not in fields:
            fields.insert(1, "canonicalClubId")
        with csv_registry.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore")
            writer.writeheader()
            for legacy in legacy_rows:
                legacy["canonicalClubId"] = f"club-{slugify(canonical_club_slug(legacy.get('slug', '')))}"
                writer.writerow(legacy)
    replace_data_js(rankings, clubs_enriched, manifest)

    audit = {
        "release": RELEASE,
        "summary": manifest["counts"],
        "ambiguousScopedAliases": ambiguous_scoped,
        "ambiguousUnscopedAliases": ambiguous_unscoped,
        "ambiguousClubAliases": ambiguous_clubs,
        "notes": [
            "Ambiguous aliases are intentionally excluded from automatic resolution.",
            "Tournament seeds are stripped by the normalizer and are never stored in canonical team names.",
            "Legacy team and club URLs remain unchanged during the identity migration.",
        ],
    }
    write_json(ROOT / "qa" / "identity-audit-7.40.0.json", audit)
    csv_path = ROOT / "qa" / "identity-ambiguous-aliases-7.40.0.csv"
    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["scope_key", "team_ids", "team_names", "status"])
        for item in ambiguous_scoped:
            writer.writerow([item["scopeKey"], " | ".join(item["teamIds"]), " | ".join(item["teams"]), "manual_review"])

    print(json.dumps(manifest["counts"], indent=2))


if __name__ == "__main__":
    main()
