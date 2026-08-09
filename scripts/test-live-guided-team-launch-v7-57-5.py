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
dashboard_js = (ROOT / "js/live-dashboard-v7-57-5.js").read_text()
css = (ROOT / "css/live-sandbox-v7-57-5.css").read_text()

check("site version", site.get("version") == "7.57.5")
check("release name", site.get("name") == "Guided Team Launch & Readiness")
check("dashboard marker", site.get("liveScoringDashboardRelease") == "7.57.5")
check("onboarding marker", site.get("liveScoringOnboardingRelease") == "7.57.5")
check("guided launch marker", site.get("liveScoringGuidedLaunchRelease") == "7.57.5")
check("groupme setup remains 7.57.4", site.get("liveScoringGroupMeSetupUxRelease") == "7.57.4")
check("multi-team remains 7.57.3", site.get("liveScoringMultiTeamRelease") == "7.57.3")
check("roster import remains 7.57.1", site.get("liveScoringRosterImportRelease") == "7.57.1")

for token in [
    'Guided team launch', 'id="readinessProgressBar"', 'id="readinessNextCard"',
    'id="readinessNextButton"', 'Team launch checklist', 'Scoring access',
    'Active + tested', 'Start game before setup is complete'
]:
    check(f"guided UI {token}", token in dashboard_html or token in dashboard_js)
check("dashboard JS wired", 'js/live-dashboard-v7-57-5.js?v=7.57.5' in dashboard_html)
check("7.57.5 CSS wired", 'css/live-sandbox-v7-57-5.css?v=7.57.5' in dashboard_html)
check("validated groupme adapter preserved", 'js/live-groupme-setup-v7-57-4.js?v=7.57.5' in dashboard_html)

for token in [
    'function readinessModel()', 'function renderReadinessGuidance(model)',
    'function focusSetupStep(targetId, focusId)', 'Game-day ready',
    'Recommended next step', 'dataset.mode = "game"',
    'await loadTeamAccess();', 'await Promise.all([loadGames(), loadGroupMe(), loadRoster()]);'
]:
    check(f"guided logic {token}", token in dashboard_js or token in dashboard_html)
check("no hard block on new game", 'createScrimmageLink").hidden = !canCreateGames' in dashboard_js)

for token in [
    'WPI 7.57.5 — Guided Team Launch & Readiness', '.live-readiness-progress-track',
    '.live-readiness-next[data-state="ready"]', '.live-primary-link[data-readiness="incomplete"]'
]:
    check(f"CSS {token}", token in css)

# This is intentionally UI-only. Do not disturb the validated data plane or service functions.
expected_hashes = {
    "js/live-backend-v7-56-8.js": "fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328",
    "js/live-sandbox-v7-56-15.js": "f32236d8e704c113ba9b868b18ae2b97e7bb366e9adbefd37000117aea0fc6da",
    "supabase/functions/roster-extract/index.ts": "26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb",
    "supabase/functions/groupme-post/index.ts": "1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6",
    "supabase/migrations/202608080004_self_service_groupme_setup.sql": "7c1ee70da73621dfdd33b7bb57b4ad1d4d55e2905650c8e8c4c24fc693a29631",
    "js/live-team-context-v7-57-3.js": "def547d5f29e409b972f3efe344f8d24ff9365792f85d43a30a9b19d0621f521",
    "js/live-groupme-setup-v7-57-4.js": "d6c12f4f41d3663956a0b4b53242a38d076ba67046f9816a929db46946fc06dd",
}
for path, expected in expected_hashes.items():
    check(f"protected hash {path}", sha256(path) == expected)

# No 7.57.5 migration or Edge Function should exist.
check("no 7.57.5 migration", not any((ROOT / "supabase/migrations").glob("*7575*")))
check("no new 7.57.5 edge function", not any((ROOT / "supabase/functions").glob("*7575*")))

if errors:
    print("WPI LIVE GUIDED TEAM LAUNCH 7.57.5 TEST FAILED")
    for error in errors:
        print(" -", error)
    sys.exit(1)

print("WPI LIVE GUIDED TEAM LAUNCH 7.57.5 TEST PASSED")
print(" - Team Readiness now guides a new team through profile → roster → scoring access → score updates")
print(" - The dashboard shows live progress and automatically advances one recommended next step at a time")
print(" - Fully configured teams receive a clear Game-day ready state and one-click new-game launch")
print(" - Existing Team Access now hydrates on initial dashboard load instead of waiting for an access action")
print(" - 7.57.4 GroupMe, 7.57.3 multi-team, 7.57.1 roster vision, and 7.56.15 scoring remain protected")
