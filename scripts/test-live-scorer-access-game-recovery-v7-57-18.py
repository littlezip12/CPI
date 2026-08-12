#!/usr/bin/env python3
from pathlib import Path
import json,hashlib,sys
root=Path(__file__).resolve().parents[1]
errors=[]
def check(label,cond):
    if not cond: errors.append(label)
site=json.loads((root/'config/site-release.json').read_text())
dash=(root/'live-dashboard.html').read_text()
dashjs=(root/'js/live-dashboard-v7-57-18.js').read_text()
game=(root/'live-game.html').read_text()
gamejs=(root/'js/live-game-v7-57-18.js').read_text()
gamecss=(root/'css/live-game-v7-57-18.css').read_text()
sql=(root/'supabase/migrations/202608110001_scorer_access_game_recovery.sql').read_text()
check('version',site.get('version')=='7.57.18','7.57.19')
check('name',site.get('name')=='Scorer Access & Game Recovery')
check('dashboard release',site.get('liveScoringDashboardRelease')=='7.57.18','7.57.19')
check('promotion release',site.get('liveScoringScorerPromotionRelease')=='7.57.18','7.57.19')
check('recovery release',site.get('liveScoringGameRecoveryRelease')=='7.57.18','7.57.19')
check('notes release',site.get('liveScoringGameNotesRelease')=='7.57.18','7.57.19')
check('actions ux release',site.get('liveScoringGameActionsUxRelease')=='7.57.18','7.57.19')
check('dashboard script', 'js/live-dashboard-v7-57-18.js?v=7.57.18' in dash)
check('game script', 'js/live-game-v7-57-18.js?v=7.57.18' in game)
check('game css', 'css/live-game-v7-57-18.css?v=7.57.18' in game)
check('supporter make scorer button', 'data-make-scorer' in dashjs and 'Make scorer' in dashjs)
check('dedicated promotion rpc ui', 'live_promote_supporter_to_scorer_v1' in dashjs)
check('dropdown promotion uses reliable path', 'member.role === "viewer" && role === "scorer"' in dashjs)
check('promotion rpc db', 'live_promote_supporter_to_scorer_v1' in sql and "set role='scorer'" in sql)
check('promotion authorization', "caller_role not in ('owner','admin')" in sql)
check('notes always open', 'live-note-field--open' in game and '<summary>Add note' not in game)
check('notes label', 'Notes <em>Optional</em>' in game)
check('game actions copy', '<summary>Game actions</summary>' in game and '<summary>More controls</summary>' not in game)
check('mobile actions copy', '<strong>Actions</strong>' in game)
check('reopen button', 'id="reopenGameButton"' in game and 'Reopen game' in game)
check('reopen rpc ui', 'live_reopen_game_v1' in gamejs and 'async function reopenGame()' in gamejs)
check('reopen rpc db', 'live_reopen_game_v1' in sql and "status='live'" in sql and 'ended_at=null' in sql)
check('reopen scorer session', "'game_reopen'" in sql and "'game_reopened'" in sql)
check('reopen recent scorer guard', "interval '30 minutes'" in sql)
check('reopen correction message', 'Game reopened — previous final was entered in error.' in gamejs)
check('old automatic summary voided', 'voidAccidentalFinalOutput' in gamejs and 'event.type === "game_summary"' in gamejs)
check('accidental final whistle voided', '"final whistle"' in gamejs.lower())
check('core event type unchanged for reopen correction', 'id:"score_correction", label:"Game reopened"' in gamejs)
check('no edge function change requested', 'groupme-post' not in sql and 'roster-extract' not in sql)
expected={
 'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
 'js/live-sandbox-v7-56-15.js':'f32236d8e704c113ba9b868b18ae2b97e7bb366e9adbefd37000117aea0fc6da',
 'js/live-game-v7-57-14.js':'0b9266ccfbf3e1e9fc31b79e33343661a21f4f8885086246e41cbf7e8cfb1c02',
 'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
 'supabase/functions/roster-extract/index.ts':'26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb',
 'supabase/migrations/202608090006_pilot_account_directory_access_operations.sql':'0a2b6a3d8023f98e78dc3b95e00dbf4c2d5bf7ddb80f55734abd04097c146bb7'
}
for rel,digest in expected.items():
    p=root/rel
    check(f'protected {rel}',p.exists() and hashlib.sha256(p.read_bytes()).hexdigest()==digest)
if errors:
    print('WPI LIVE SCORER ACCESS & GAME RECOVERY 7.57.18 TEST FAILED')
    for e in errors: print('-',e)
    sys.exit(1)
print('WPI LIVE SCORER ACCESS & GAME RECOVERY 7.57.18 TEST PASSED')
