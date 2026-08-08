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
html = (ROOT / "live-dashboard.html").read_text()
js = (ROOT / "js/live-dashboard-v7-57-1.js").read_text()
css = (ROOT / "css/live-sandbox-v7-57-1.css").read_text()
fn = (ROOT / "supabase/functions/roster-extract/index.ts").read_text()
setup = (ROOT / "LIVE_ROSTER_VISION_SETUP_7.57.1.md").read_text()
sandbox_html = (ROOT / "live-sandbox.html").read_text()

# Release wiring.
check("site version", site.get("version") == "7.57.1")
check("release name", site.get("name") == "High-Accuracy Roster Import")
check("dashboard marker", site.get("liveScoringDashboardRelease") == "7.57.1")
check("roster marker", site.get("liveScoringRosterRelease") == "7.57.1")
check("roster import marker", site.get("liveScoringRosterImportRelease") == "7.57.1")
check("team admin foundation preserved", site.get("liveScoringTeamAdminRelease") == "7.57.0")
check("7.57.1 dashboard JS", 'js/live-dashboard-v7-57-1.js?v=7.57.1' in html)
check("7.57.1 live CSS", 'css/live-sandbox-v7-57-1.css?v=7.57.1' in html)
check("scorer keeps proven JS", 'js/live-sandbox-v7-56-15.js?v=7.57.1' in sandbox_html)

# Browser OCR is removed as primary architecture.
check("Tesseract removed", "Tesseract" not in js and "tesseract" not in js.lower())
check("old OCR parser removed", "parseRosterText" not in js)
check("browser normalizes image", 'canvas.toDataURL("image/jpeg", 0.92)' in js and 'maxDimension = 2400' in js)
check("browser payload bounded", 'dataUrl.length > 8_000_000' in js)
check("vision function invoked", 'functions.invoke("roster-extract"' in js)
check("manual fallback preserved", 'Automatic reading unavailable' in js and 'enter the roster manually' in js)
check("confidence-aware draft", 'confidence !== "high"' in js and 'row.review' in js)
check("no auto-save", 'Review every row before saving. Nothing is saved automatically.' in js)
check("privacy disclosure", 'powered by OpenAI' in html and 'WPI does not store the image in the team record' in html)
check("manual path remains", 'id="manualRosterButton"' in html and 'openRosterDialog({source:"manual"' in js)

# Edge Function security + OpenAI vision structured output.
check("edge function exists", (ROOT / "supabase/functions/roster-extract/index.ts").exists())
check("signed-in user required", 'Authentication required' in fn and 'userClient.auth.getUser' in fn)
check("owner/admin team scope", '.from("live_team_members")' in fn and '["owner", "admin"].includes(membership.role)' in fn)
check("OpenAI key server-side", 'Deno.env.get("OPENAI_API_KEY")' in fn and 'OPENAI_API_KEY' not in js and 'OPENAI_API_KEY' not in html)
check("OpenAI responses endpoint", 'https://api.openai.com/v1/responses' in fn)
check("vision image input", 'type: "input_image"' in fn and 'detail: "original"' in fn)
check("strict structured output", 'type: "json_schema"' in fn and 'strict: true' in fn and 'water_polo_roster_extraction' in fn)
check("structured roster schema", all(token in fn for token in ['cap: { type: "string"', 'name: { type: "string"', 'enum: ["high", "medium", "low"]']))
check("no provider storage", 'store: false' in fn)
check("image never written", '.from(' not in fn.split('const openaiKey')[1] and 'writeFile' not in fn)
check("payload bounded server-side", 'MAX_DATA_URL_CHARS = 8_000_000' in fn)
check("no hallucination prompt", 'Do not invent, autocomplete, or infer' in fn and 'omit it rather than fabricate' in fn)
check("setup doc secret boundary", 'OPENAI_API_KEY' in setup and 'Never put the key in GitHub' in setup)

# Persistent structured roster path remains the existing reviewed save path.
check("structured roster save", '.from("live_players").upsert(rows, {onConflict:"roster_id,client_player_id"})' in js)
check("duplicate caps blocked", 'appears more than once' in js)
check("cap DB length guarded", 'cap.length > 3' in js)
check("no new DB migration", not any(p.name.startswith("20260809") for p in (ROOT / "supabase/migrations").glob("*.sql")))

# Proven scoring / delivery foundation remains byte-for-byte protected.
expected_hashes = {
    "js/live-backend-v7-56-8.js": "fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328",
    "js/live-sandbox-v7-56-15.js": "f32236d8e704c113ba9b868b18ae2b97e7bb366e9adbefd37000117aea0fc6da",
    "supabase/functions/groupme-post/index.ts": "42d994906dafba551681d69fd7d35b1d0e83a5a88de25c1563cb697b4b834777",
    "supabase/migrations/202608070001_groupme_topic_delivery.sql": "aacefc33e16c3d170953e68b6d52f99d9da35c1808dde9016ff94e6539525f04",
    "supabase/migrations/202608080001_game_summary_event.sql": "80e6a939aa87104849bd4ca84c8c91a2171017885a6883cbe5f9346b4e038a14",
}
for path, expected in expected_hashes.items():
    check(f"protected hash {path}", sha256(path) == expected)

check("new CSS marker", 'WPI 7.57.1 — High-Accuracy Roster Import' in css)

if errors:
    print("WPI LIVE HIGH-ACCURACY ROSTER IMPORT 7.57.1 TEST FAILED")
    for error in errors:
        print(" -", error)
    sys.exit(1)

print("WPI LIVE HIGH-ACCURACY ROSTER IMPORT 7.57.1 TEST PASSED")
print(" - Browser Tesseract OCR is removed from the primary roster path")
print(" - Photo import uses authenticated server-side vision with strict roster schema")
print(" - OpenAI key remains server-side and API storage is disabled for the request")
print(" - Confidence-aware review is mandatory before any roster save")
print(" - Manual roster entry remains a first-class fallback")
print(" - 7.56.15 scoring, GroupMe, scorer authority and summary assets remain protected")
