#!/usr/bin/env python3
from pathlib import Path
import hashlib
import json
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []

def fail(message):
    errors.append(message)

def read(rel):
    path = ROOT / rel
    if not path.exists() or path.stat().st_size == 0:
        fail(f"{rel} missing or empty")
        return ""
    return path.read_text(encoding="utf-8", errors="ignore")

site = json.loads(read("config/site-release.json") or "{}")
if site.get("version") != "7.55.5": fail("site version must be 7.55.5")
for key in ("liveScoringSandboxRelease", "liveScoringAuthGatewayRelease", "liveScoringMobileWorkflowRelease"):
    if site.get(key) != "7.55.5": fail(f"{key} must be 7.55.5")
if site.get("liveScoringBackendBlueprintRelease") != "7.55.2": fail("backend blueprint must remain 7.55.2")

login = read("live-login.html")
for token in (
    'name="robots" content="noindex,nofollow,noarchive"',
    'id="signInTab"', 'id="signUpTab"', 'id="loginForm"',
    'id="continueDemoButton"', 'config/live-sandbox.js?v=7.55.5',
    'js/live-login-v7-55-5.js?v=7.55.5',
    'css/live-sandbox-v7-55-5.css?v=7.55.5',
):
    if token not in login: fail(f"live-login.html missing token: {token}")

html = read("live-sandbox.html")
for token in (
    'name="robots" content="noindex,nofollow,noarchive"',
    'id="setupPanel"', 'id="rosterList"', 'id="liveConsole"',
    'id="clockTime"', 'placeholder="MM:SS"', 'id="eventType"',
    'id="primaryPlayer"', 'id="assistPlayer"', 'Unassisted',
    'id="messagePreview"', 'id="messagePreviewDetails"', 'id="eventForm"', 'id="recordEventButton"',
    'id="startNextQuarterButton"', 'id="lineupDialog"', 'id="showSetupButton"',
    'id="lastUpdateCard"', 'id="addNoteButton"', 'id="gameControlsDetails"',
    'id="messageList"', 'id="timelineList"', 'id="summaryPanel"',
    'config/live-sandbox.js?v=7.55.5', 'js/live-sandbox-v7-55-5.js?v=7.55.5',
    'css/live-sandbox-v7-55-5.css?v=7.55.5',
):
    if token not in html: fail(f"live-sandbox.html missing token: {token}")
for forbidden in ('id="clockSeconds"', 'id="clockMinutes"', 'id="actionTabs"', 'id="secondaryPlayer"', 'id="startQuarterButton"', 'Second player'):
    if forbidden in html: fail(f"live-sandbox.html retains removed control: {forbidden}")

# Both private pages remain absent from all public navigation/landing surfaces.
for rel in ("index.html", "rankings.html", "teams.html", "clubs.html", "tournaments.html", "js/site-shell.js"):
    text = read(rel)
    if "live-sandbox.html" in text or "live-login.html" in text:
        fail(f"{rel} publicly links the private live-scoring pilot")

config = read("config/live-sandbox.js")
for token in ('release: "7.55.5"', 'mode: "demo"', 'environment: "sandbox"', 'groupMeDelivery: "mock"'):
    if token not in config: fail(f"sandbox config missing {token}")
for forbidden in ("service_role", "GROUPME_BOT_ID:", "bot_id:", "password:"):
    if forbidden.lower() in config.lower(): fail(f"public sandbox config contains forbidden secret-like token: {forbidden}")

metadata = json.loads(read("data/live-sandbox/event-types.json") or "{}")
required = {
    "goal", "opponent_goal", "save", "field_block", "steal", "turnover",
    "exclusion_drawn", "exclusion_committed", "five_meter_drawn", "five_meter_committed",
    "quarter_start", "quarter_end", "score_correction",
}
actual = {row.get("id") for row in metadata.get("eventTypes", [])}
if actual != required: fail(f"event type registry mismatch: missing {sorted(required-actual)} extra {sorted(actual-required)}")
if metadata.get("environment") != "sandbox" or metadata.get("release") != "7.55.5": fail("event registry release/environment mismatch")
if metadata.get("entryModel") != "guided_dropdown": fail("event registry must use guided dropdown entry model")
goal = next((row for row in metadata.get("eventTypes", []) if row.get("id") == "goal"), {})
if goal.get("allowsAssist") is not True or goal.get("assistDefault") != "unassisted": fail("goal assist metadata is incomplete")
if any(row.get("allowsAssist") for row in metadata.get("eventTypes", []) if row.get("id") != "goal"):
    fail("only goals may allow an assist")

login_js = read("js/live-login-v7-55-5.js")
for token in ('signInWithPassword', 'signUp', 'wpi-live-auth-v7-55-5', 'live-sandbox.html'):
    if token not in login_js: fail(f"login runtime missing token: {token}")

js = read("js/live-sandbox-v7-55-5.js")
for token in (
    'environment: "sandbox"', 'localStorage', 'live-login.html',
    'parseClock', 'clockTime', 'eventType', 'primaryPlayer', 'assistPlayer',
    'guided', 'Unassisted', 'allowsAssist', 'startNextQuarterButton', 'lastUpdateCard',
    'addNoteButton', 'messagesPaused', 'score_correction',
    'downloadLog', 'buildRecap', 'showSetup', 'hideSetup',
    '@supabase/supabase-js@2.110.8/+esm',
):
    if token not in js: fail(f"sandbox runtime missing token: {token}")
for forbidden in ("api.groupme.com", "GROUPME_BOT_ID", "actionTabs", '$("clockSeconds")', '$("secondaryPlayer")', '$("startQuarterButton")'):
    if forbidden in js: fail(f"browser runtime contains removed or secret token: {forbidden}")

css = read("css/live-sandbox-v7-55-5.css")
for token in (".live-scoreboard", ".live-time-row", ".live-event-form", ".live-preview-details", ".live-game-controls", "body.wpi-live-sandbox-page.is-live-game", ".live-login-shell", "@media (max-width: 720px)"):
    if token not in css: fail(f"sandbox CSS missing {token}")

for rel in ("js/live-login-v7-55-5.js", "js/live-sandbox-v7-55-5.js"):
    result = subprocess.run(["node", "--check", str(ROOT / rel)], capture_output=True, text=True)
    if result.returncode:
        fail(f"{rel} JavaScript syntax failed: {result.stderr.strip()}")

sql = read("supabase/migrations/202608040001_live_scoring_sandbox.sql")
for token in (
    "create table public.live_teams", "create table public.live_team_members",
    "create table public.live_rosters", "create table public.live_players",
    "create table public.live_games", "create table public.live_lineups",
    "create table public.live_events", "create table public.live_deliveries",
    "enable row level security", "live_environment", "sandbox",
    "live_has_team_role", "GROUPME_BOT_ID",
):
    if token not in sql: fail(f"Supabase migration missing token: {token}")

edge = read("supabase/functions/groupme-post/index.ts")
for token in (
    'Deno.env.get("GROUPME_BOT_ID")', 'Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")',
    'https://api.groupme.com/v3/bots/post', 'live_team_members', 'live_deliveries',
    'event_id', 'already_sent',
):
    if token not in edge: fail(f"GroupMe Edge Function missing token: {token}")
if re.search(r'[A-Za-z0-9_-]{20,}\s*#?\s*actual bot', edge, re.I): fail("Edge Function appears to contain a hardcoded bot credential")

# Historical competitive data must remain identical to the immutable snapshot.
rankings = json.loads(read("rankings.json") or "[]")
clubs = json.loads(read("clubs.json") or "[]")
manifest = json.loads(read("data/seasons/2025-2026/manifest.json") or "{}")
if len(rankings) != 724: fail(f"rankings changed: {len(rankings)}")
if len(clubs) != 182: fail(f"clubs changed: {len(clubs)}")
def digest(data):
    raw = json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
    return hashlib.sha256(raw).hexdigest()
if digest(rankings) != manifest.get("integrity", {}).get("rankingsSha256"): fail("final ranking snapshot integrity changed")
if digest(clubs) != manifest.get("integrity", {}).get("clubsSha256"): fail("final club snapshot integrity changed")

if errors:
    print("WPI LIVE SCORING SANDBOX 7.55.5 TEST FAILED")
    for error in errors:
        print(f" - {error}")
    sys.exit(1)

print("WPI LIVE SCORING SANDBOX 7.55.5 TEST PASSED")
print(" - Dedicated hidden sign-in/create-account gateway protects entry to the scorer")
print(" - One-hand active-game mode keeps only time, guided event/player entry, goal-only assist, and contextual submit visible")
print(" - Setup, roster, controls, GroupMe log, and full timeline remain available without crowding the live scorer")
print(" - Demo data and mock GroupMe delivery remain quarantined from 724 final rankings and 182 club snapshots")
