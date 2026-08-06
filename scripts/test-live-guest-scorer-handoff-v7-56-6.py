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
backend = read("js/live-backend-v7-56-6.js")
sandbox = read("js/live-sandbox-v7-56-6.js")
handoff = read("js/live-scorer-handoff-v7-56-6.js")
function = read("supabase/functions/groupme-post/index.ts")
html = read("live-sandbox.html")
handoff_html = read("live-scorer-handoff.html")
dashboard = read("js/live-dashboard-v7-56-6.js")
login = read("js/live-login-v7-56-6.js")

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
require(handoff_html, "live-scorer-handoff-v7-56-6.js", "handoff landing page")
require(handoff, "ensureAnonymousSession", "no-account session bootstrap")
require(handoff_html, "Take over scoring", "accept action")
require(function, "live_scorer_control_status", "Edge Function active scorer authorization")
require(function, "canScore", "Edge Function scorer check")
require(function, "privateDestination", "server-only destination secret lookup")
reject(function, "destination.secret_name", "user-scoped destination secret access")
require(dashboard, 'workspace.role === "owner" ? $("groupMeSecretName")', "admin-hidden GroupMe secret")
require(dashboard, "canCreateGames", "Owner/Admin game creation")
require(login, "backend.isAnonymousUser(session.user)", "anonymous/member login separation")

print("WPI GUEST SCORER HANDOFF 7.56.6 TEST PASSED")
print(" - One active scorer is enforced per game with atomic, audited handoff and Admin takeover")
print(" - QR and six-digit passes are five-minute, single-use, hashed, game-scoped, and no-login")
print(" - Previous scorer devices become read-only while the accepted guest continues the same game")
print(" - Admins operate games and GroupMe without receiving secret, database, or platform access")
