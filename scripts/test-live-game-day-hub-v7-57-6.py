#!/usr/bin/env python3
from pathlib import Path
import hashlib, json, sys

ROOT = Path(__file__).resolve().parents[1]
errors = []

def check(name, condition):
    if not condition:
        errors.append(name)

def sha256(path):
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()

site = json.loads((ROOT / "config/site-release.json").read_text())
dashboard_html = (ROOT / "live-dashboard.html").read_text()
dashboard_js = (ROOT / ("js/live-dashboard-v7-57-8.js" if (ROOT / "js/live-dashboard-v7-57-8.js").exists() else ("js/live-dashboard-v7-57-7.js" if (ROOT / "js/live-dashboard-v7-57-7.js").exists() else "js/live-dashboard-v7-57-6.js"))).read_text()
css = (ROOT / ("css/live-sandbox-v7-57-8.css" if (ROOT / "css/live-sandbox-v7-57-8.css").exists() else ("css/live-sandbox-v7-57-7.css" if (ROOT / "css/live-sandbox-v7-57-7.css").exists() else "css/live-sandbox-v7-57-6.css"))).read_text()
migration = (ROOT / "supabase/migrations/202608080005_game_day_hub_universal_game_model.sql").read_text()
sandbox_html = (ROOT / "live-sandbox.html").read_text()

check("site version", site.get("version") in {"7.57.6","7.57.7","7.57.8"})
check("release name", site.get("name") in {"Game-Day Hub & Universal Game Model","Game-Day Identity & Launch Reliability","Tournament Schedule Integration & Reconciliation"})
for key in ["liveScoringDashboardRelease","liveScoringTeamAdminRelease","liveScoringGameDayHubRelease"]:
    check(f"release marker {key}", site.get(key) in {"7.57.6","7.57.7","7.57.8"})
for key in ["liveScoringUniversalGameModelRelease","liveScoringManualTournamentFallbackRelease","liveScoringReconciliationFoundationRelease"]:
    check(f"release marker {key}", site.get(key) == "7.57.6")
check("guided readiness remains 7.57.5", site.get("liveScoringGuidedLaunchRelease") == "7.57.5")
check("groupme remains 7.57.4", site.get("liveScoringGroupMeSetupUxRelease") == "7.57.4")
check("multi-team remains 7.57.3", site.get("liveScoringMultiTeamRelease") == "7.57.3")
check("roster import remains 7.57.1", site.get("liveScoringRosterImportRelease") == "7.57.1")

for token in [
    'id="dashboardGameDay"', 'Game-Day Hub', 'id="addGameDayButton"', 'id="gameDayQueue"',
    'Tournament game', 'id="gameDayDialog"', 'Save to Game Day',
    'Save &amp; start', 'Reconciliation-ready.',
    'id="gameTeamLogoPreview"', 'id="gameOpponentLogoPreview"'
]:
    check(f"dashboard UI {token}", token in dashboard_html)
check("dashboard JS wired", ('js/live-dashboard-v7-57-6.js?v=7.57.6' in dashboard_html or 'js/live-dashboard-v7-57-7.js?v=7.57.7' in dashboard_html or 'js/live-dashboard-v7-57-8.js?v=7.57.8' in dashboard_html))
check("7.57.6 CSS wired", ('css/live-sandbox-v7-57-6.css?v=7.57.6' in dashboard_html or 'css/live-sandbox-v7-57-7.css?v=7.57.7' in dashboard_html or 'css/live-sandbox-v7-57-8.css?v=7.57.8' in dashboard_html))
check("history retained for build phase", 'History section will be replaced by the permanent Games &amp; Results experience before pilot completion.' in dashboard_html)
check("reconciliation copy preserved", ('official tournament schedule later instead of creating a duplicate' in dashboard_html or "reconciles it to that same scored record instead of creating a duplicate" in dashboard_html))
check("official link source label preserved", ('Official tournament link verified' in dashboard_js or 'Manual tournament · matched to WPI schedule' in dashboard_js or 'WPI tournament schedule' in dashboard_js))

for token in [
    'function loadGameCatalog()', 'fetch("clubs.json"', 'fetch("data/tournaments/public-hub.json"',
    'function openGameDayDialog(game = null)', 'function saveGameDay({startAfter=false} = {})',
    ('live_create_manual_game_v3' if site.get('version') in {'7.57.7','7.57.8'} else 'live_create_manual_game_v2'), ('live_update_planned_game_v2' if site.get('version') in {'7.57.7','7.57.8'} else 'live_update_planned_game_v1'), 'live_cancel_planned_game_v1',
    'function renderGameDayHub()', 'Manual tournament · official link pending',
    'Final games move to History',
    'A similar ${payload.kind === "tournament" ? "tournament " : ""}game is already on Game Day',
    'No duplicate was added.', 'opponentWpiTeamId', 'teamLogoUrl', 'opponentLogoUrl'
]:
    check(f"dashboard logic {token}", token in dashboard_js)

for token in [
    'game_kind text not null default \'scrimmage\'',
    'creation_source text not null default \'manual\'',
    'reconciliation_status text not null default \'not_applicable\'',
    'create or replace function public.live_game_day_queue',
    'create or replace function public.live_create_manual_game_v2',
    'create or replace function public.live_update_planned_game_v1',
    'create or replace function public.live_cancel_planned_game_v1',
    'create or replace function public.live_link_manual_tournament_game_v1',
    "when cleaned_kind='tournament' then 'provisional'",
    "source_mode='tournament_override'",
    'Official tournament game is already linked to another WPI Live record',
    "game_row.status not in ('setup','scheduled')",
    "creation_source is\n  'Provenance only. Manual tournament records remain manual-origin after later official reconciliation.'"
]:
    check(f"migration contract {token}", token in migration)

check("manual tournament stays manual origin", "cleaned_kind,'manual',cleaned_tournament" in migration)
check("official link enriches same row", "where id=target_game_id" in migration and "tournament_event_id=official_tournament_event_id" in migration)
check("official source unique index preserved by prior migration", (ROOT / "supabase/migrations/202608050001_manual_game_schema_integrity.sql").exists())
check("no destructive game delete", "delete from public.live_games" not in migration.lower())
check("no score rewrite in reconciliation function", "team_score=" not in migration[migration.find("live_link_manual_tournament_game_v1"):])
check("sandbox setup language universal", "Game day" in sandbox_html and "manual fallback in the Game-Day Hub" in sandbox_html)

for token in [
    'WPI 7.57.6 — Game-Day Hub & Universal Game Model', '.live-game-day-hub',
    '.live-game-day-matchup', '.live-game-day-source[data-state="provisional"]',
    '.live-game-kind-options', '.live-game-reconcile-note'
]:
    check(f"CSS {token}", token in css)

# Protect the validated scoring/delivery plane and earlier 7.57.x foundations.
expected_hashes = {
    "js/live-backend-v7-56-8.js": "fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328",
    "js/live-sandbox-v7-56-15.js": "f32236d8e704c113ba9b868b18ae2b97e7bb366e9adbefd37000117aea0fc6da",
    "supabase/functions/roster-extract/index.ts": "26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb",
    "supabase/functions/groupme-post/index.ts": "1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6",
    "supabase/migrations/202608080004_self_service_groupme_setup.sql": "7c1ee70da73621dfdd33b7bb57b4ad1d4d55e2905650c8e8c4c24fc693a29631",
    "js/live-team-context-v7-57-3.js": "def547d5f29e409b972f3efe344f8d24ff9365792f85d43a30a9b19d0621f521",
    "js/live-groupme-setup-v7-57-4.js": "d6c12f4f41d3663956a0b4b53242a38d076ba67046f9816a929db46946fc06dd",
    "js/live-dashboard-v7-57-5.js": "d0cc8094b03a9c2154a5a7b9e642abaf116c07f228bccd780c98cb1a9ffc5f1e",
    "css/live-sandbox-v7-57-5.css": "33418766dac004d54f721756d01ba2e11c2b6de2ec8917afcb2b1b09cf97e333",
}
for path, expected in expected_hashes.items():
    check(f"protected hash {path}", sha256(path) == expected)

# 7.57.6 needs exactly one database migration and no Edge Function changes.
check("7.57.6 migration exists", (ROOT / "supabase/migrations/202608080005_game_day_hub_universal_game_model.sql").exists())
check("no new 7.57.6 edge function", not any((ROOT / "supabase/functions").glob("*7576*")))

if errors:
    print("WPI LIVE GAME-DAY HUB 7.57.6 TEST FAILED")
    for error in errors:
        print(" -", error)
    sys.exit(1)

print("WPI LIVE GAME-DAY HUB 7.57.6 TEST PASSED")
print(" - Game-Day Hub foundation supports manual game creation; 7.57.7+ presents Tournament or Friendly only" if site.get("version") in {"7.57.7","7.57.8"} else " - Game-Day Hub supports manual Tournament Game, Scrimmage, and Friendly creation")
print(" - Known WPI teams can carry existing logos into manual matchup cards")
print(" - Manual tournament games are provisional canonical records built for later official-schedule reconciliation")
print(" - Reconciliation attaches official identifiers to the same scored record and refuses an already-linked duplicate")
print(" - Completed History remains temporarily available; development/test cleanup is intentionally deferred")
print(" - 7.56.15 scoring/delivery and earlier 7.57.x service foundations remain protected")
