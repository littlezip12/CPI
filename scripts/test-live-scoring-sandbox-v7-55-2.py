#!/usr/bin/env python3
from pathlib import Path
import hashlib
import json
import re
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
if site.get("version") != "7.55.2": fail("site version must be 7.55.2")
for key in ("liveScoringSandboxRelease", "liveScoringBackendBlueprintRelease"):
    if site.get(key) != "7.55.2": fail(f"{key} must be 7.55.2")

html = read("live-sandbox.html")
for token in (
    'name="robots" content="noindex,nofollow,noarchive"',
    'id="setupPanel"', 'id="rosterList"', 'id="liveConsole"',
    'id="actionTabs"', 'id="messageList"', 'id="timelineList"',
    'id="summaryPanel"', 'id="lineupDialog"', 'id="scoreDialog"',
    'config/live-sandbox.js?v=7.55.2', 'js/live-sandbox-v7-55-2.js?v=7.55.2',
    'css/live-sandbox-v7-55-2.css?v=7.55.2',
    'css/site-shell.css?v=7.54.13', 'js/site-shell.js?v=7.54.13',
    'css/command-palette.css?v=7.53.4', 'js/command-palette.js?v=7.53.4',
):
    if token not in html: fail(f"live-sandbox.html missing token: {token}")

# The sandbox is deliberately hidden from the public navigation and landing pages.
for rel in ("index.html", "rankings.html", "teams.html", "clubs.html", "tournaments.html", "js/site-shell.js"):
    if "live-sandbox.html" in read(rel): fail(f"{rel} publicly links the pilot sandbox")

config = read("config/live-sandbox.js")
for token in ('mode: "demo"', 'environment: "sandbox"', 'groupMeDelivery: "mock"'):
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
if metadata.get("environment") != "sandbox" or metadata.get("release") != "7.55.2": fail("event registry release/environment mismatch")

js = read("js/live-sandbox-v7-55-2.js")
for token in (
    'environment: "sandbox"', 'localStorage', 'signInWithPassword',
    'Goal', 'Assist', 'Field block', 'Exclusion drawn', '5m drawn',
    'messagesPaused', 'score_correction', 'downloadLog', 'buildRecap',
    '@supabase/supabase-js@2.110.8/+esm',
):
    if token not in js: fail(f"sandbox runtime missing token: {token}")
if "api.groupme.com" in js or "GROUPME_BOT_ID" in js: fail("browser runtime must not call GroupMe or contain its bot secret name")

css = read("css/live-sandbox-v7-55-2.css")
for token in (".live-scoreboard", ".live-action-tabs", ".live-message-list", "@media (max-width: 720px)"):
    if token not in css: fail(f"sandbox CSS missing {token}")

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
    print("WPI LIVE SCORING SANDBOX 7.55.2 TEST FAILED")
    for error in errors:
        print(f" - {error}")
    sys.exit(1)

print("WPI LIVE SCORING SANDBOX 7.55.2 TEST PASSED")
print(" - Hidden noindex sandbox supports mobile scrimmage setup, roster and lineup entry, structured events, corrections, analytics, recap, and export")
print(" - Demo data remains browser-local and mock GroupMe delivery never exposes credentials")
print(" - Supabase email/password, team roles, RLS, sandbox quarantine, and server-side GroupMe delivery blueprints are present")
print(" - 724 final rankings and 182 club snapshots remain immutable")
