#!/usr/bin/env python3
from pathlib import Path
import json
import re
from collections import defaultdict

ROOT = Path(__file__).resolve().parents[1]
DATA_JS = ROOT / "data.js"
CLUB_REGISTRY = ROOT / "data" / "club-registry.json"
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
    registry = {"clubs": {}}
    if CLUB_REGISTRY.exists():
        registry = json.loads(CLUB_REGISTRY.read_text(encoding="utf-8"))
    return rankings, registry.get("clubs", {})

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
            "website": reg.get("website") or top.get("website") or "",
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
                "website": reg.get("website") or "",
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
    colors = club.get("colors", {})
    primary = colors.get("primary", "#071426")
    secondary = colors.get("secondary", "#126dff")
    accent = colors.get("accent", "#f6b700")
    logo = "../" + club.get("logo", "assets/cpi-logo-fallback.svg")

    rows = []
    for t in club.get("teams", []):
        move = int(t.get("movement") or 0)
        move_class = "up" if move > 0 else "down" if move < 0 else ""
        rows.append(f"""
        <tr>
          <td><strong>#{esc(t.get('rank', '—'))}</strong></td>
          <td><a href="../{esc(t.get('page', '#'))}">{esc(t.get('team'))}</a></td>
          <td>{esc(t.get('group') or t.get('ageGroup') or '')}</td>
          <td>{esc(t.get('cpi', '—'))}</td>
          <td class="move {move_class}">{esc(t.get('movement', '0'))}</td>
          <td>{esc(t.get('record', '—'))}</td>
          <td>{esc(t.get('latestTournament', '—'))}</td>
        </tr>""")
    team_rows = "\n".join(rows) if rows else '<tr><td colspan="7">No ranked teams yet.</td></tr>'

    website = club.get("website")
    website_link = f'<a class="club-btn secondary" href="{esc(website)}">Club Website</a>' if website else ""

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{esc(club['displayName'])} | Water Polo Index</title>
  <link rel="stylesheet" href="../css/styles.css">
  <link rel="stylesheet" href="../css/command-palette.css?v=7.52.3">
  <link rel="stylesheet" href="../css/site-shell.css?v=7.52.3">
  <style>
    .club-intel-page {{ min-height:100vh; background:#f4f7fb; color:#071426; }}
    .club-intel-hero {{
      background: radial-gradient(circle at 90% 10%, {accent}33, transparent 28%), linear-gradient(135deg, {primary}, {secondary});
      color:#fff; padding:56px 28px;
    }}
    .club-intel-wrap {{ max-width:1180px; margin:0 auto; }}
    .club-intel-lockup {{ display:grid; grid-template-columns:140px 1fr; gap:28px; align-items:center; }}
    .club-intel-logo {{ width:140px; height:140px; background:#fff; border-radius:34px; padding:18px; object-fit:contain; box-shadow:0 18px 44px rgba(0,0,0,.22); }}
    .club-intel-hero h1 {{ font-size:clamp(42px,7vw,88px); line-height:.92; margin:0 0 12px; letter-spacing:-.05em; }}
    .club-intel-hero p {{ font-size:20px; opacity:.82; margin:0; }}
    .club-intel-actions {{ display:flex; gap:12px; margin-top:24px; flex-wrap:wrap; }}
    .club-btn {{ display:inline-flex; align-items:center; justify-content:center; border-radius:999px; padding:12px 18px; background:#fff; color:#071426; text-decoration:none; font-weight:900; }}
    .club-btn.secondary {{ background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.22); color:#fff; }}
    .club-intel-main {{ max-width:1180px; margin:-28px auto 56px; padding:0 20px; }}
    .club-stat-grid {{ display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:16px; margin-bottom:18px; }}
    .club-stat-card,.club-table-card {{ background:#fff; border:1px solid rgba(7,20,38,.10); border-radius:22px; padding:22px; box-shadow:0 12px 30px rgba(7,20,38,.08); }}
    .club-stat-card span {{ color:#5c6b7c; font-weight:800; text-transform:uppercase; font-size:12px; letter-spacing:.08em; }}
    .club-stat-card strong {{ display:block; font-size:34px; margin-top:8px; letter-spacing:-.04em; }}
    .club-table-card h2 {{ margin-top:0; font-size:34px; letter-spacing:-.04em; }}
    .club-table {{ width:100%; border-collapse:collapse; }}
    .club-table th,.club-table td {{ border-bottom:1px solid rgba(7,20,38,.10); padding:14px 10px; text-align:left; }}
    .club-table th {{ color:#5c6b7c; font-size:12px; text-transform:uppercase; letter-spacing:.08em; }}
    .club-table a {{ color:#126dff; text-decoration:none; font-weight:900; }}
    .move.up {{ color:#16a34a; font-weight:900; }}
    .move.down {{ color:#dc2626; font-weight:900; }}
    @media (max-width:820px) {{
      .club-intel-lockup {{ grid-template-columns:1fr; }}
      .club-stat-grid {{ grid-template-columns:repeat(2,minmax(0,1fr)); }}
      .club-table-card {{ overflow-x:auto; }}
    }}
  </style>
</head>
<body class="club-intel-page">
  <section class="club-intel-hero">
    <div class="club-intel-wrap club-intel-lockup">
      <img class="club-intel-logo" src="{esc(logo)}" alt="{esc(club['displayName'])} logo">
      <div>
        <h1>{esc(club['displayName'])}</h1>
        <p>{esc(club.get('region', 'Region TBD'))} · {esc(club.get('rankedTeams', 0))} ranked teams</p>
        <div class="club-intel-actions">
          <a class="club-btn" href="../club.html?club={esc(club['slug'])}">Legacy Club View</a>
          {website_link}
        </div>
      </div>
    </div>
  </section>
  <main class="club-intel-main">
    <section class="club-stat-grid">
      <article class="club-stat-card"><span>Best Rank</span><strong>#{esc(club.get('bestRank') or '—')}</strong></article>
      <article class="club-stat-card"><span>Ranked Teams</span><strong>{esc(club.get('rankedTeams', 0))}</strong></article>
      <article class="club-stat-card"><span>Average CPI</span><strong>{esc(club.get('averageCPI', '—'))}</strong></article>
      <article class="club-stat-card"><span>Total Movement</span><strong>{esc(club.get('totalMovement', 0))}</strong></article>
    </section>
    <section class="club-table-card">
      <h2>Ranked Teams</h2>
      <table class="club-table">
        <thead><tr><th>Rank</th><th>Team</th><th>Group</th><th>CPI</th><th>Move</th><th>Record</th><th>Latest Event</th></tr></thead>
        <tbody>{team_rows}</tbody>
      </table>
    </section>
  </main>
  <script defer src="../js/command-palette.js?v=7.52.3"></script>
  <script defer src="../js/site-shell.js?v=7.52.3"></script>
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
