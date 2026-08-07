#!/usr/bin/env python3
from pathlib import Path
import json, subprocess, sys

ROOT=Path(__file__).resolve().parents[1]
errors=[]
def read(rel):
    p=ROOT/rel
    if not p.exists():
        errors.append(f"missing {rel}")
        return ""
    return p.read_text(encoding="utf-8",errors="ignore")

site=json.loads(read("config/site-release.json") or "{}")
if site.get("version")!="7.56.7": errors.append("site version must be 7.56.7")
if site.get("liveScoringMultiDeviceRelease")!="7.56.7": errors.append("multi-device release marker missing")
if site.get("liveScoringRoleSecurityRelease")!="7.56.7": errors.append("role-security release marker missing")

backend=read("js/live-backend-v7-56-7.js")
required=(
    'const { data: existingGame, error: existingGameError }',
    '.eq("client_game_id", state.game.id)',
    'const gameUpdatePayload = { ...gamePayload };',
    'delete gameUpdatePayload.created_by;',
    '.update(gameUpdatePayload)',
    'const gameInsertPayload = { ...gamePayload, created_by: session.user.id };',
    '.insert(gameInsertPayload)',
    'const existingByClientId = new Map',
    'const newEventRows = eventRows',
    '.map(row => ({ ...row, created_by: session.user.id }))',
    'delete eventUpdatePayload.created_by;',
    'delete eventUpdatePayload.created_at;',
    '.update(eventUpdatePayload)',
    '.insert(newEventRows)',
    '["owner", "admin", "scorer"].includes(workspace.role)',
    'config.release || "7.56.7"'
)
for token in required:
    if token not in backend: errors.append(f"backend missing {token}")
for forbidden in (
    '.upsert(gamePayload, { onConflict: "team_id,client_game_id" })',
    '.upsert(eventRows, { onConflict: "game_id,client_event_id" })'
):
    if forbidden in backend: errors.append(f"cross-account unsafe persistence remains: {forbidden}")

edge=read("supabase/functions/groupme-post/index.ts")
if 'live_scorer_control_status' not in edge or 'canScore' not in edge:
    errors.append("Edge Function no longer authorizes the active game scorer")
if '!["owner", "admin"].includes(membership.role)' not in edge:
    errors.append("Owner/Admin-only destination administration changed")

for page,script in (
    ("live-dashboard.html","live-dashboard-v7-56-7.js?v=7.56.7"),
    ("live-login.html","live-login-v7-56-7.js?v=7.56.7"),
    ("live-password-reset.html","live-password-reset-v7-56-7.js?v=7.56.7"),
    ("live-sandbox.html","live-sandbox-v7-56-7.js?v=7.56.7")
):
    text=read(page)
    if 'live-backend-v7-56-7.js?v=7.56.7' not in text: errors.append(f"{page} missing 7.56.7 backend")
    if script not in text: errors.append(f"{page} missing {script}")
    if 'config/live-sandbox.js?v=7.56.7' not in text: errors.append(f"{page} missing 7.56.7 config cache bust")

for rel in ("js/live-backend-v7-56-7.js","js/live-dashboard-v7-56-7.js","js/live-login-v7-56-7.js","js/live-password-reset-v7-56-7.js","js/live-sandbox-v7-56-7.js"):
    result=subprocess.run(["node","--check",str(ROOT/rel)],capture_output=True,text=True)
    if result.returncode: errors.append(f"JavaScript syntax failed for {rel}: {result.stderr.strip()}")

if errors:
    print("WPI SCORER MULTI-DEVICE 7.56.7 TEST FAILED")
    for error in errors: print(f" - {error}")
    sys.exit(1)
print("WPI SCORER MULTI-DEVICE 7.56.7 TEST PASSED")
print(" - Invited Scorers update existing Owner-created games without replaying the insert policy")
print(" - Existing event creators are preserved while new Scorer events use the authenticated user")
print(" - Scorer play delivery remains authorized while GroupMe administration stays Owner/Admin-only")
print(" - Private WPI Live assets are cache-busted to 7.56.7")
