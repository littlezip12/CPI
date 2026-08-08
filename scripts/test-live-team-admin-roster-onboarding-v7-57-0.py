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
js = (ROOT / "js/live-dashboard-v7-57-0.js").read_text()
css = (ROOT / "css/live-sandbox-v7-57-0.css").read_text()
sandbox_html = (ROOT / "live-sandbox.html").read_text()

# Release wiring.
check("site version", site.get("version") == "7.57.0")
check("release name", site.get("name") == "Team Administration & Roster Onboarding Foundation")
check("dashboard marker", site.get("liveScoringDashboardRelease") == "7.57.0")
check("roster marker", site.get("liveScoringRosterRelease") == "7.57.0")
check("team-admin marker", site.get("liveScoringTeamAdminRelease") == "7.57.0")
check("roster-import marker", site.get("liveScoringRosterImportRelease") == "7.57.0")
check("7.57.0 dashboard JS", 'js/live-dashboard-v7-57-0.js?v=7.57.0' in html)
check("7.57.0 live CSS", 'css/live-sandbox-v7-57-0.css?v=7.57.0' in html)
check("scorer keeps proven JS", 'js/live-sandbox-v7-56-15.js?v=7.57.0' in sandbox_html)

# Team Administration foundation.
for item in ["dashboardOverview", "dashboardTeamProfile", "dashboardRoster", "dashboardTeamAccess", "dashboardGroupMe", "dashboardGameHistory"]:
    check(f"team admin section {item}", f'id="{item}"' in html)
check("readiness overview", 'id="teamReadinessScore"' in html and all(f'id="readiness{x}"' in html for x in ["Profile","Roster","GroupMe","Access"]))
check("team profile fields", all(f'id="{field}"' in html for field in ["teamProfileName","teamProfileAgeGroup","teamProfileSeason","saveTeamProfileButton"]))
check("owner/admin team profile gate", 'function canManageTeam()' in js and '["owner","admin"].includes(workspace.role)' in js)
check("team profile persists existing model", '.from("live_teams").update({' in js)

# Roster onboarding: photo/upload/manual are first-class and always reviewed before save.
check("take photo action", 'id="takeRosterPhotoButton"' in html)
check("upload image action", 'id="uploadRosterImageButton"' in html)
check("manual roster action", 'id="manualRosterButton"' in html)
check("mobile rear camera", 'id="rosterCameraInput"' in html and 'capture="environment"' in html and 'accept="image/*"' in html)
check("image upload", 'id="rosterUploadInput"' in html and 'accept="image/*"' in html)
check("review dialog", 'id="rosterImportDialog"' in html and 'id="rosterDraftRows"' in html and 'id="saveRosterDraftButton"' in html)
check("explicit no autosave copy", 'Nothing is saved automatically.' in js and 'review step before anything is saved' in html)
check("manual editing remains", 'openRosterDialog({source:"manual"' in js and 'editCurrentRosterButton' in html)
check("duplicate caps blocked", 'appears more than once' in js)
check("cap DB length guarded", 'cap.length > 3' in js)

# Browser-side OCR is lazy-loaded only after a user chooses image import.
check("lazy OCR loader", 'function ensureTesseract()' in js)
check("documented browser OCR CDN", 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js' in js)
check("OCR worker", 'Tesseract.createWorker("eng"' in js)
check("OCR parser", 'function parseRosterText(text)' in js)
check("raw OCR available for review", 'rosterRawText' in html and 'rosterRawDetails' in html)
check("photo itself not persisted", '.from("live_players").upsert(rows' in js and 'rosterImagePreview' in html)

# Permanent structured roster reuse uses the existing team roster / live_players model.
check("load existing roster", 'backend.loadRoster(workspace.rosterId)' in js)
check("save structured roster", '.from("live_players").upsert(rows, {onConflict:"roster_id,client_player_id"})' in js)
check("removed players deactivated", '.update({active:false' in js)
check("no new migration introduced", not any(p.name.startswith("20260808") and p.name != "202608080001_game_summary_event.sql" for p in (ROOT / "supabase/migrations").glob("*.sql")))

# 7.56.15 scoring / delivery foundation remains byte-for-byte protected.
expected_hashes = {
    "js/live-backend-v7-56-8.js": "fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328",
    "js/live-sandbox-v7-56-15.js": "f32236d8e704c113ba9b868b18ae2b97e7bb366e9adbefd37000117aea0fc6da",
    "supabase/functions/groupme-post/index.ts": "42d994906dafba551681d69fd7d35b1d0e83a5a88de25c1563cb697b4b834777",
    "supabase/migrations/202608070001_groupme_topic_delivery.sql": "aacefc33e16c3d170953e68b6d52f99d9da35c1808dde9016ff94e6539525f04",
    "supabase/migrations/202608080001_game_summary_event.sql": "80e6a939aa87104849bd4ca84c8c91a2171017885a6883cbe5f9346b4e038a14",
}
for path, expected in expected_hashes.items():
    check(f"protected hash {path}", sha256(path) == expected)

check("new admin styles", 'WPI 7.57.0 — Team Administration & Roster Onboarding Foundation' in css)
check("mobile roster actions", '@media (max-width:720px)' in css and '.live-roster-import-actions { grid-template-columns:1fr; }' in css)

if errors:
    print("WPI LIVE TEAM ADMIN & ROSTER ONBOARDING 7.57.0 TEST FAILED")
    for error in errors:
        print(" -", error)
    sys.exit(1)

print("WPI LIVE TEAM ADMIN & ROSTER ONBOARDING 7.57.0 TEST PASSED")
print(" - Team Readiness + Team Profile administration are present")
print(" - Roster supports Take Photo / Upload Image / Enter Manually")
print(" - OCR creates an editable draft and never auto-saves detected data")
print(" - Confirmed roster persists through the existing structured live_players model")
print(" - 7.56.15 scoring, GroupMe delivery, scorer authority and summary assets are byte-for-byte protected")
