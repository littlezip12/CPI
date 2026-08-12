#!/usr/bin/env python3
"""Focused static integrity checks for WPI Live 7.58.0 Club Workspace Foundation."""
from __future__ import annotations
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")

def sha(rel: str) -> str:
    return hashlib.sha256((ROOT / rel).read_bytes()).hexdigest()

def require(ok: bool, message: str) -> None:
    if not ok:
        raise AssertionError(message)

version = read("VERSION.md").strip()
release = json.loads(read("config/site-release.json"))
require(version == "# WPI 7.58.0 — Club Workspace Foundation", f"unexpected VERSION.md: {version}")
require(release.get("version") == "7.58.0", "site-release version must be 7.58.0")
require(release.get("liveScoringClubWorkspaceRelease") == "7.58.0", "club workspace release marker missing")

migration_rel = "supabase/migrations/202608110003_club_workspace_foundation.sql"
migration = read(migration_rel).lower()
for token in (
    "create table if not exists public.live_clubs",
    "create table if not exists public.live_club_members",
    "add column if not exists club_id uuid references public.live_clubs",
    "create or replace function public.live_list_user_teams_v2()",
    "create or replace function public.live_team_workspace_v2(target_team_id uuid)",
    "create or replace function public.live_club_workspace_v1(target_club_id uuid)",
    "create or replace function public.live_create_additional_team_v2(",
    "'club-lamorinda'",
    "'assets/logos/canonical/lamorinda.webp'",
):
    require(token in migration, f"migration contract missing: {token}")

# The foundation must wrap existing team IDs, never replace/re-key them.
for forbidden in (
    "delete from public.live_teams",
    "delete from public.live_rosters",
    "delete from public.live_games",
    "truncate public.live_",
    "drop table public.live_teams",
    "drop table public.live_games",
    "set id=",
    "set id =",
):
    require(forbidden not in migration, f"destructive/re-keying statement present: {forbidden}")

require("lamorinda-brentwood" in migration and "not like 'lamorinda-brentwood%" in migration,
        "Lamorinda Brentwood must be explicitly excluded from the Lamorinda club backfill")
require("canonical_wpi_team_id" in migration, "canonical team identity bridge missing")
require("team-2026-14u-boys-lamorinda-a" not in migration,
        "7.58.0 must not fabricate/reuse a prior-season canonical team ID for the active Live team")

require("values (lamorinda_club_id,lamorinda_owner,'owner'::public.live_club_role)" in migration,
        "pilot backfill must grant club authority only to the verified pilot Owner")
require("club_role <> 'owner'" in migration and "Club Owner access is required to create a team".lower() in migration,
        "new team creation must remain Club Owner-only")

clubs = json.loads(read("data/identity/clubs.json"))
lamo = next((row for row in clubs if row.get("id") == "club-lamorinda"), None)
require(lamo is not None, "public canonical club-lamorinda identity missing")
require(lamo.get("displayName") == "Lamorinda Water Polo", "unexpected Lamorinda display identity")
require(lamo.get("logo") == "assets/logos/canonical/lamorinda.webp", "unexpected Lamorinda canonical logo")

html = read("live-dashboard.html")
for token in (
    'id="dashboardClubName"',
    'id="clubOverviewPanel"',
    'id="clubTeamGrid"',
    'id="clubLiveGames"',
    'id="clubUpcomingGames"',
    'id="clubRecentFinals"',
    'id="teamWorkspaceLayout"',
    'id="newTeamGender"',
    'id="newTeamSquad"',
    'js/live-team-context-v7-58-0.js?v=7.58.0',
    'js/live-dashboard-v7-58-0.js?v=7.58.0',
    'css/live-dashboard-v7-58-0.css?v=7.58.0',
):
    require(token in html, f"dashboard wiring missing: {token}")
require("js/live-team-context-v7-57-3.js" not in html, "dashboard still loads old team context")
require("js/live-dashboard-v7-57-18.js" not in html, "dashboard still loads old dashboard controller")

context = read("js/live-team-context-v7-58-0.js")
for token in (
    'live_list_user_teams_v2',
    'live_list_user_clubs_v1',
    'live_team_workspace_v2',
    'live_club_workspace_v1',
    'live_create_additional_team_v2',
    'wpi-live-selected-team-v7-57-3',
):
    require(token in context, f"club context contract missing: {token}")

dashboard = read("js/live-dashboard-v7-58-0.js")
for token in (
    'All ${clubName} Teams',
    'clubOverviewPanel',
    'renderClubOverview',
    'data-club-team-jump',
    'team records stay isolated',
):
    require(token in dashboard, f"club dashboard behavior missing: {token}")
require('createTeamButton").hidden = clubWorkspace?.role !== "owner"' in dashboard, "dashboard must keep team creation Owner-only")

# Guard the validated scoring/delivery foundation from accidental edits in 7.58.0.
protected = {
    "js/live-backend-v7-56-8.js": "fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328",
    "js/live-game-v7-57-22.js": "a03145737d61767d6fbca3676b585d8476c3724dd0e45f4f2fd83c2deb87fca4",
    "js/live-sandbox-v7-56-15.js": "f32236d8e704c113ba9b868b18ae2b97e7bb366e9adbefd37000117aea0fc6da",
    "supabase/functions/groupme-post/index.ts": "1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6",
    "supabase/functions/roster-extract/index.ts": "26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb",
}
for rel, expected in protected.items():
    actual = sha(rel)
    require(actual == expected, f"protected foundation changed: {rel} ({actual})")

print("WPI Live 7.58.0 club workspace static integrity checks passed.")
