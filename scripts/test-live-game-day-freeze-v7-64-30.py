from pathlib import Path
import hashlib, json
ROOT=Path(__file__).resolve().parents[1]
EXPECTED={
  "js/live-backend-v7-64-11.js":"c76270a1dce00b8c29c7a76203fbad96ed5bd88fb85fa16f87e2c1da7c59e44b",
  "js/live-game-v7-64-11.js":"302c6819ab317f9053320bf4bbce60291a7c9dabf290d6fa244dfa914125b9c7",
  "js/live-quick-time-pad-v7-64-11.js":"06a96147f5fbbbfd3299bfa6b08a405c4e19c72079e6f3fcfcd456fd7608b8a8",
  "config/live-sandbox.js":"90604af21497c271aab1e659e6ad12f5950e71314bdc3acc600c2f2628e01175",
  "supabase/functions/groupme-post-v7-64-11/index.ts":"c8a616be0f70f496fb398968be9f5a2ec0d9b100413a6099e3c87e13a9394fcd",
}
for rel, expected in EXPECTED.items():
    path=ROOT/rel
    actual=hashlib.sha256(path.read_bytes()).hexdigest()
    if actual != expected:
        raise SystemExit(f"FAIL: game-day protected file changed: {rel}\nexpected {expected}\nactual   {actual}")

html=(ROOT/'live-game.html').read_text()
if not (
    'js/live-backend-v7-64-11.js?v=7.64.11' in html
    or 'js/live-backend-v7-64-31.js?v=7.64.31' in html
):
    raise SystemExit('FAIL: live-game.html no longer loads the validated 7.64.11 backend or an approved reliability successor')
if not (
    'js/live-game-v7-64-11.js?v=7.64.11' in html
    or 'js/live-game-v7-64-31.js?v=7.64.31' in html
):
    raise SystemExit('FAIL: live-game.html no longer loads the validated 7.64.11 scorer or an approved reliability successor')
if 'js/live-quick-time-pad-v7-64-11.js?v=7.64.11' not in html:
    raise SystemExit('FAIL: Quick Time runtime changed during reliability work')
site=json.loads((ROOT/'config/site-release.json').read_text())
for key, expected in {
    'liveFastScorekeepingRelease':'7.64.11',
    'liveCorrectionRecoveryRelease':'7.64.11',
    'liveFinalWhistleRelease':'7.64.11',
    'liveScoringQuickTimePadRelease':'7.64.9',
}.items():
    if site.get(key) != expected:
        raise SystemExit(f"FAIL: {key} changed from validated game-day runtime {expected}")
print('WPHQ 7.64.30 GAME-DAY FREEZE TEST PASSED')
print(' - protected 7.64.11 scorer/backend/Quick Time files remain byte-for-byte identical; approved successor refs are allowed')
print(' - connected Supabase configuration remains unchanged')
print(' - Final Whistle GroupMe function source remains unchanged')
