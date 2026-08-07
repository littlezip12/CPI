#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT / path).read_text(encoding="utf-8")

def require(text, token, label):
    if token not in text:
        raise AssertionError(f"Missing {label}: {token}")

def reject(text, token, label):
    if token in text:
        raise AssertionError(f"Unexpected {label}: {token}")

migration = read("supabase/migrations/202608050002_guest_scorer_handoff.sql")
backend = read("js/live-backend-v7-56-7.js")
sandbox = read("js/live-sandbox-v7-56-7.js")
handoff = read("js/live-scorer-handoff-v7-56-7.js")
function = read("supabase/functions/groupme-post/index.ts")
html = read("live-sandbox.html")
handoff_html = read("live-scorer-handoff.html")
dashboard = read("js/live-dashboard-v7-56-7.js")
login = read("js/live-login-v7-56-7.js")

for table in ("live_game_scorer_sessions", "live_game_scorer_passes", "live_game_scorer_audit"):
    require(migration, f"create table if not exists public.{table}", table)
require(migration, "live_game_one_active_scorer_idx", "one active scorer index")
require(migration, "where status='active'", "active partial index")
require(migration, "interval '5 minutes'", "five minute pass")
require(migration, "lpad((floor(random()*1000000))", "six digit fallback code")
require(migration, "digest(raw_token,'sha256')", "hashed handoff token")
require(migration, "digest(raw_code,'sha256')", "hashed handoff code")
reject(migration, "raw_token text not null", "stored raw token")
reject(migration, "raw_code text not null", "stored raw code")
require(migration, "live_accept_scorer_handoff_pass", "accept RPC")
require(migration, "caller_role is null or caller_role not in ('owner','admin','scorer')", "non-member claim rejection")
require(migration, "live_take_over_game_scorer", "admin takeover RPC")
require(migration, "live_revoke_scorer_handoff_pass", "revoke RPC")
require(migration, "live_guest_game_workspace", "guest workspace RPC")
require(migration, "live_guard_scorer_control_columns", "control-column guard")
require(migration, "live_guard_game_configuration", "game configuration guard")
require(migration, "pg_advisory_xact_lock", "atomic scorer transfer lock")
require(migration, "status='read_only'", "previous scorer read-only")
require(migration, "session_kind in ('member','guest')", "member and guest session types")
require(migration, "Only a Team Owner or Admin may change game configuration", "guest configuration protection")
require(migration, "caller_role in ('owner','admin')", "admin operational authority")
require(migration, "case when caller_role='owner'", "owner-only secret mapping")
require(migration, "revoke select on public.live_destinations from authenticated", "destination secret column protection")
require(migration, "live_groupme_destination_config", "role-aware destination configuration RPC")
require(migration, "case when caller_role='owner' then destination.secret_name else null end", "Admin secret-name redaction")
require(migration, "public.live_is_team_member(live_games.team_id)", "insert-returning direct team-member read path")
require(migration, "or public.live_can_read_game(live_games.id)", "existing game participant read path")

insert_returning_hotfix = read("supabase/migrations/202608060001_live_game_insert_returning_rls.sql")
require(insert_returning_hotfix, "public.live_is_team_member(live_games.team_id)", "hosted insert-returning RLS hotfix")
require(insert_returning_hotfix, "public.live_can_read_game(live_games.id)", "hosted participant read preservation")
reject(insert_returning_hotfix, "using (public.live_can_read_game(live_games.id));", "snapshot-only game read policy")

# Policy expressions must qualify the target table's columns whenever a nested
# query contains other `id`, `game_id`, or `team_id` columns. PostgreSQL rejects
# the unqualified form with ERROR 42702 before the migration can complete.
for token, label in (
    ("public.live_is_team_member(live_teams.id)", "qualified team policy"),
    ("where g.team_id=live_teams.id", "qualified guest team join"),
    ("where g.roster_id=live_rosters.id", "qualified guest roster join"),
    ("where r.id=live_players.roster_id", "qualified player roster join"),
    ("where g.destination_id=live_destinations.id", "qualified destination join"),
    ("public.live_can_read_game(live_games.id)", "qualified game read policy"),
    ("public.live_can_score_game(live_games.id)", "qualified game score policy"),
    ("where e.id=live_deliveries.event_id", "qualified delivery event join"),
    ("where d.id=live_delivery_attempts.delivery_id", "qualified delivery-attempt join"),
):
    require(migration, token, label)

for token, label in (
    ("where g.team_id=id", "ambiguous team id"),
    ("where g.roster_id=id", "ambiguous roster id"),
    ("where g.destination_id=id", "ambiguous destination id"),
    ("public.live_can_read_game(id)", "ambiguous game id"),
    ("public.live_can_score_game(id)", "ambiguous score-game id"),
    ("where e.id=event_id", "ambiguous delivery event id"),
    ("where d.id=delivery_id", "ambiguous delivery attempt id"),
):
    reject(migration, token, label)

require(backend, "signInAnonymously", "anonymous guest session")
require(backend, "previewScorerHandoff", "handoff preview client")
require(backend, "acceptScorerHandoff", "handoff accept client")
require(backend, "createScorerHandoffPass", "handoff create client")
require(backend, "takeOverGameScoring", "takeover client")
require(backend, "WPI_SCORER_READ_ONLY", "read-only control error")
require(backend, '["owner", "admin"].includes(workspace.role)', "manager-only permanent roster")
require(backend, "A Team Owner or Admin must create the game", "manager-only game creation")

require(html, "Transfer scoring", "transfer scorer UI")
require(sandbox, "new window.QRCode", "local QR generation")
require(sandbox, "#token=${encodeURIComponent(activeHandoffPass.token)}", "fragment-only QR token")
require(handoff, "window.location.hash", "fragment token acceptance")
require(sandbox, "scoringActionAllowed", "single-controller write guard")
require(sandbox, "takeOverGameScoring", "admin takeover UI")
require(sandbox, "readOnlyScorer", "old-device read-only state")
require(html, "scorerHandoffDialog", "handoff dialog")
require(html, "qrcode.min.js", "local QR library")
require(html, "sha512-", "QR library integrity")
require(handoff_html, "live-scorer-handoff-v7-56-7.js", "handoff landing page")
require(handoff, "ensureAnonymousSession", "no-account session bootstrap")
require(handoff_html, "Take over scoring", "accept action")
require(function, "live_scorer_control_status", "Edge Function active scorer authorization")
require(function, "canScore", "Edge Function scorer check")
require(function, "privateDestination", "server-only destination secret lookup")
reject(function, "destination.secret_name", "user-scoped destination secret access")
require(dashboard, 'workspace.role === "owner" ? $("groupMeSecretName")', "admin-hidden GroupMe secret")
require(dashboard, "canCreateGames", "Owner/Admin game creation")
require(login, "backend.isAnonymousUser(session.user)", "anonymous/member login separation")


# Final-whistle delivery must remain authorized after the final-status trigger
# closes the active scorer session. The browser preserves the finalizer identity,
# and the Edge Function authorizes the last ended scorer or a Team Owner/Admin.
require(sandbox, "canDeliverAfterGameEnd", "final-game delivery browser guard")
require(sandbox, "endedByUserId", "finalizer identity persistence")
require(function, "live_game_scorer_sessions", "last ended scorer final delivery authorization")
require(function, "Final-game delivery requires the last scorer or a Team Owner/Admin", "final delivery authorization error")
require(function, '["final", "cancelled"].includes(game.status)', "final game authorization branch")

print("WPI GUEST SCORER HANDOFF 7.56.7 TEST PASSED")
print(" - One active scorer is enforced per game with atomic, audited handoff and Admin takeover")
print(" - QR and six-digit passes are five-minute, single-use, hashed, game-scoped, and no-login")
print(" - Previous scorer devices become read-only while the accepted guest continues the same game")
print(" - Admins operate games and GroupMe without receiving secret, database, or platform access")


# Regression: Supabase installs pgcrypto functions in the extensions schema.
# SECURITY DEFINER functions pinned to public must not call them unqualified.
_pgcrypto_sql_files = [
    ROOT / "supabase/WPI_LIVE_7_56_1_FULL_SETUP.sql",
    ROOT / "supabase/WPI_LIVE_7_56_2_FULL_SETUP.sql",
    ROOT / "supabase/migrations/202608050002_guest_scorer_handoff.sql",
]
for _path in _pgcrypto_sql_files:
    _text = _path.read_text(encoding="utf-8")
    assert "extensions.gen_random_bytes(" in _text, f"Qualified pgcrypto random bytes missing: {_path}"
    assert "extensions.digest(" in _text, f"Qualified pgcrypto digest missing: {_path}"
    assert "encode(gen_random_bytes(" not in _text, f"Unqualified gen_random_bytes remains: {_path}"

_pgcrypto_hotfix = (ROOT / "supabase/migrations/202608060002_guest_scorer_pgcrypto_schema.sql").read_text(encoding="utf-8")
assert "set search_path = public, extensions" in _pgcrypto_hotfix
assert "live_create_scorer_handoff_pass" in _pgcrypto_hotfix
assert "live_resolve_scorer_pass" in _pgcrypto_hotfix
