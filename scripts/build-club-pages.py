#!/usr/bin/env python3
from pathlib import Path
import json
import re
from collections import defaultdict

ROOT = Path(__file__).resolve().parents[1]
DATA_JS = ROOT / "data.js"
CLUB_REGISTRY = ROOT / "club-registry.json"
OUT_DIR = ROOT / "club"
OUT_JSON = ROOT / "data" / "club-intelligence.json"

def extract_window_var(text, name, default):
    pattern = rf"window\.{name}\s*=\s*(.*?);\s*(?=window\.CPI_|$)"
    match = re.search(pattern, text, re.S)
    if not match:
        return default
    try:
        return json.loads(match.group(1))
    except Exception:
        return default

def slugify(value):
    value = str(value or "").lower().strip()
    value = value.replace("&", " and ")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value).strip("-")
    aliases = {
        "la-jolla-united-a": "la-jolla-united",
        "la-jolla-united-b": "la-jolla-united",
        "san-diego-dons": "sd-dons",
        "patriot-a": "patriot",
        "patriot-b": "patriot",
        "skip-a": "skip",
        "commerce-a": "commerce",
        "rancho-tsunami-a": "rancho-tsunami",
        "devils-gate-a": "devils-gate",
    }
    return aliases.get(value, value)

def esc(value):
    return str(value or "").replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace('"',"&quot;")

def load_sources():
    if not DATA_JS.exists():
        raise SystemExit("Missing data.js")
    text = DATA_JS.read_text(encoding="utf-8")
    rankings = extract_window_var(text, "CPI_RANKINGS", [])
    registry = {}
    if CLUB_REGISTRY.exists():
        raw_registry = json.loads(CLUB_REGISTRY.read_text(encoding="utf-8"))
        if isinstance(raw_registry, list):
            registry = {row.get("slug"): row for row in raw_registry if row.get("slug")}
        elif isinstance(raw_registry, dict):
            registry = raw_registry.get("clubs", raw_registry)
    return rankings, registry

def build_intelligence(rankings, registry):
    by_club = defaultdict(list)
    for r in rankings:
        club = r.get("club") or r.get("displayClubName") or r.get("clubDisplayName")
        if not club:
            continue
        slug = slugify(r.get("clubSlug") or club)
        by_club[slug].append(r)

    intelligence = {}
    for slug, teams in by_club.items():
        teams_sorted = sorted(teams, key=lambda x: x.get("postRank", 9999))
        top = teams_sorted[0] if teams_sorted else {}
        ranked_count = len(teams_sorted)
        best_rank = min([t.get("postRank", 9999) for t in teams_sorted] or [None])
        avg_cpi = round(sum(float(t.get("postCPI", 0) or 0) for t in teams_sorted) / ranked_count, 1) if ranked_count else 0
        total_movement = sum(int(t.get("movement", 0) or 0) for t in teams_sorted)
        biggest_mover = sorted(teams_sorted, key=lambda x: int(x.get("movement", 0) or 0), reverse=True)[0] if teams_sorted else {}

        reg = registry.get(slug, {})
        display_name = reg.get("displayName") or top.get("displayClubName") or top.get("club") or slug.replace("-", " ").title()

        intelligence[slug] = {
            "slug": slug,
            "displayName": display_name,
            "region": reg.get("region") or top.get("region") or "Region TBD",
            "city": reg.get("city") or top.get("city") or "",
            "state": reg.get("state") or top.get("state") or "",
            "country": reg.get("country") or top.get("country") or "",
            "locationLabel": reg.get("locationLabel") or top.get("locationLabel") or "",
            "metroRegion": reg.get("metroRegion") or top.get("metroRegion") or "",
            "macroRegion": reg.get("macroRegion") or top.get("macroRegion") or "",
            "website": reg.get("website") or top.get("website") or "",
            "websiteStatus": reg.get("websiteStatus") or top.get("websiteStatus") or "",
            "websiteVerifiedAt": reg.get("websiteVerifiedAt") or top.get("websiteVerifiedAt") or "",
            "websiteUpdatedAt": reg.get("websiteUpdatedAt") or top.get("websiteUpdatedAt") or "",
            "websiteSource": reg.get("websiteSource") or "",
            "logo": reg.get("logo") or top.get("logo") or "assets/cpi-logo-fallback.svg",
            "colors": reg.get("colors") or {
                "primary": top.get("primaryColor") or "#071426",
                "secondary": top.get("secondaryColor") or "#126dff",
                "accent": "#f6b700"
            },
            "rankedTeams": ranked_count,
            "bestRank": best_rank,
            "averageCPI": avg_cpi,
            "totalMovement": total_movement,
            "topTeam": {
                "team": top.get("team"),
                "rank": top.get("postRank"),
                "cpi": top.get("postCPI"),
                "movement": top.get("movement"),
                "record": top.get("latestTournamentRecord"),
                "page": top.get("teamPage") or "#"
            },
            "biggestMover": {
                "team": biggest_mover.get("team", ""),
                "rank": biggest_mover.get("postRank", ""),
                "movement": biggest_mover.get("movement", ""),
                "page": biggest_mover.get("teamPage", "#")
            },
            "teams": [
                {
                    "team": t.get("team"),
                    "group": t.get("group"),
                    "gender": t.get("gender"),
                    "ageGroup": t.get("ageGroup"),
                    "rank": t.get("postRank"),
                    "preRank": t.get("preRank"),
                    "movement": t.get("movement"),
                    "cpi": t.get("postCPI"),
                    "record": t.get("latestTournamentRecord"),
                    "latestTournament": t.get("latestTournament"),
                    "page": t.get("teamPage") or "#"
                }
                for t in teams_sorted
            ]
        }

    for slug, reg in registry.items():
        if slug not in intelligence:
            intelligence[slug] = {
                "slug": slug,
                "displayName": reg.get("displayName") or slug.replace("-", " ").title(),
                "region": reg.get("region") or "Region TBD",
                "city": reg.get("city") or "",
                "state": reg.get("state") or "",
                "country": reg.get("country") or "",
                "locationLabel": reg.get("locationLabel") or "",
                "metroRegion": reg.get("metroRegion") or "",
                "macroRegion": reg.get("macroRegion") or "",
                "website": reg.get("website") or "",
                "websiteStatus": reg.get("websiteStatus") or "",
                "websiteVerifiedAt": reg.get("websiteVerifiedAt") or "",
                "websiteUpdatedAt": reg.get("websiteUpdatedAt") or "",
                "websiteSource": reg.get("websiteSource") or "",
                "logo": reg.get("logo") or "assets/cpi-logo-fallback.svg",
                "colors": reg.get("colors") or {"primary":"#071426","secondary":"#126dff","accent":"#f6b700"},
                "rankedTeams": 0,
                "bestRank": None,
                "averageCPI": 0,
                "totalMovement": 0,
                "topTeam": {},
                "biggestMover": {},
                "teams": []
            }
    return intelligence

def render_page(club):
    logo = "../" + club.get("logo", "assets/logos/cpi-logo-fallback.svg")
    target = f"../club.html?club={club['slug']}"
    website = club.get("website") or ""
    website_link = f'<a class="secondary" href="{esc(website)}" target="_blank" rel="noopener">Club Website</a>' if website else ""
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{esc(club['displayName'])} | Water Polo Index</title>
  <meta name="description" content="Open the current Water Polo Index profile for {esc(club['displayName'])}.">
  <meta http-equiv="refresh" content="0; url={esc(target)}">
  <link rel="canonical" href="{esc(target)}">
  <link rel="stylesheet" href="../css/styles.css">
  <link rel="stylesheet" href="../css/command-palette.css?v=7.52.3">
  <link rel="stylesheet" href="../css/site-shell.css?v=7.53.3">
  <style>
    body{{margin:0;min-height:100vh;display:grid;place-items:center;background:linear-gradient(145deg,#071426,#123968);font-family:Inter,Arial,sans-serif;color:#fff}}
    main{{width:min(520px,calc(100% - 40px));padding:34px;border:1px solid rgba(255,255,255,.16);border-radius:28px;background:rgba(255,255,255,.08);box-shadow:0 28px 80px rgba(0,0,0,.28);text-align:center}}
    img{{width:118px;height:118px;padding:10px;border-radius:25px;background:#fff;object-fit:contain}}
    h1{{margin:20px 0 8px;font-size:clamp(2.2rem,8vw,4rem);letter-spacing:-.055em}}
    p{{color:rgba(255,255,255,.72)}}
    .actions{{display:flex;justify-content:center;gap:10px;flex-wrap:wrap}}
    a{{display:inline-flex;margin-top:12px;padding:11px 16px;border-radius:999px;background:#fff;color:#071426;text-decoration:none;font-weight:900}}
    a.secondary{{background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.22);color:#fff}}
  </style>
</head>
<body>
  <main>
    <img src="{esc(logo)}" alt="{esc(club['displayName'])} logo">
    <h1>{esc(club['displayName'])}</h1>
    <p>Opening the current WPI club profile.</p>
    <div class="actions"><a href="{esc(target)}">Continue to club profile →</a>{website_link}</div>
  </main>
  <script>window.location.replace({json.dumps(target)});</script>
  <script defer src="../js/command-palette.js?v=7.52.3"></script>
  <script defer src="../js/site-shell.js?v=7.53.3"></script>
</body>
</html>"""

def main():
    rankings, registry = load_sources()
    intelligence = build_intelligence(rankings, registry)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps({"clubs": intelligence}, indent=2), encoding="utf-8")
    for slug, club in intelligence.items():
        (OUT_DIR / f"{slug}.html").write_text(render_page(club), encoding="utf-8")
    print(f"Wrote {OUT_JSON.relative_to(ROOT)}")
    print(f"Wrote {len(intelligence)} club pages to {OUT_DIR.relative_to(ROOT)}/")

if __name__ == "__main__":
    main()
