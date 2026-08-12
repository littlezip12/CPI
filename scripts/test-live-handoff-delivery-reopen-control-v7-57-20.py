#!/usr/bin/env python3
from pathlib import Path
import json,hashlib,sys
root=Path(__file__).resolve().parents[1]
errors=[]
def check(label,cond):
    if not cond: errors.append(label)

site=json.loads((root/'config/site-release.json').read_text())
game=(root/'live-game.html').read_text()
gamejs=(root/'js/live-game-v7-57-20.js').read_text()

check('version',site.get('version')=='7.57.20')
check('name',site.get('name')=='Handoff Delivery & Reopen Control Reliability')
check('handoff delivery release',site.get('liveScoringHandoffDeliveryReliabilityRelease')=='7.57.20')
check('reopen control release',site.get('liveScoringReopenControlRecoveryRelease')=='7.57.20')
check('game script route','js/live-game-v7-57-20.js?v=7.57.20' in game)

check('game scoped authority helper','function syncGameScopedBackendAuthority()' in gamejs)
check('supporter scorer maps backend role only','role:"guest_scorer"' in gamejs and 'permanentRole = workspace.role' in gamejs)
check('supporter role remains permanent','backend.workspace = {' in gamejs and 'workspace.role' in gamejs)
check('backend authority tied to canScore','viewerRole && scorerControl?.canScore' in gamejs)
check('authority refreshed with scorer control','syncGameScopedBackendAuthority();' in gamejs)

check('supporter disabled controls tracked','data-wpi-supporter-disabled="1"' in gamejs)
check('supporter disabled controls restored','function restoreSupporterDisabledControls()' in gamejs)
check('reopen stale pending quarter cleared','state.game.pendingQuarter = null;' in gamejs)
check('reopen scoreboard rebuilt','renderScoreboard();' in gamejs and 'resetEventEntry({preserveClock:true});' in gamejs)
check('reopen submit state rebuilt','updateEventFields();' in gamejs and 'updateSubmitState();' in gamejs)
check('reopen final buttons reenabled','endGameButton' in gamejs and 'postPeriodEndGameButton' in gamejs and 'endShootoutGameButton' in gamejs)
check('reopen preserves score','event.correctedTeamScore = preservedTeamScore;' in gamejs and 'event.correctedOpponentScore = preservedOpponentScore;' in gamejs)

check('post handoff recoverable delivery schedule','hasGameScopedScoringAuthority' in gamejs and 'scheduleRemoteSync(150)' in gamejs)
check('supporter takeover still requires code','enterScorerCodeInlineButton' in gamejs and 'previewScorerHandoff' in gamejs and 'acceptScorerHandoff' in gamejs)
check('repeat final summary remains','ensureAutomaticGameSummary();' in gamejs and 'function voidAccidentalFinalOutput()' in gamejs)

expected={
 'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
 'js/live-sandbox-v7-56-15.js':'f32236d8e704c113ba9b868b18ae2b97e7bb366e9adbefd37000117aea0fc6da',
 'js/live-game-v7-57-14.js':'0b9266ccfbf3e1e9fc31b79e33343661a21f4f8885086246e41cbf7e8cfb1c02',
 'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
 'supabase/functions/roster-extract/index.ts':'26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb',
 'supabase/migrations/202608110001_scorer_access_game_recovery.sql':'12b4c8798fa0839d1f5eb649bcd0343eef5be7d81e7c1d363bc012a926b380fb'
}
for rel,digest in expected.items():
    p=root/rel
    check(f'protected {rel}',p.exists() and hashlib.sha256(p.read_bytes()).hexdigest()==digest)

if errors:
    print('WPI LIVE HANDOFF DELIVERY & REOPEN CONTROL 7.57.20 TEST FAILED')
    for e in errors: print('-',e)
    sys.exit(1)
print('WPI LIVE HANDOFF DELIVERY & REOPEN CONTROL 7.57.20 TEST PASSED')
