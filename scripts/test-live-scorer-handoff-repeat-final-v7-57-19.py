#!/usr/bin/env python3
from pathlib import Path
import json,hashlib,sys
root=Path(__file__).resolve().parents[1]
errors=[]
def check(label,cond):
    if not cond: errors.append(label)
site=json.loads((root/'config/site-release.json').read_text())
game=(root/'live-game.html').read_text()
gamejs=(root/'js/live-game-v7-57-19.js').read_text()
check('version',site.get('version')=='7.57.19')
check('name',site.get('name')=='Scorer Handoff & Repeat Final Reliability')
check('game recovery release',site.get('liveScoringGameRecoveryRelease')=='7.57.19')
check('supporter handoff release',site.get('liveScoringSupporterHandoffRelease')=='7.57.19')
check('repeat final release',site.get('liveScoringRepeatFinalReliabilityRelease')=='7.57.19')
check('game script route','js/live-game-v7-57-19.js?v=7.57.19' in game)
check('supporter takeover copy','id="enterScorerCodeInlineButton" type="button">Take over scoring</button>' in game)
check('supporter code button allowed','"enterScorerCodeInlineButton"' in gamejs and 'control.closest("#scorerCodeDialog")' in gamejs)
check('supporter permanent role unchanged copy','Your permanent account role will not change.' in game)
check('reopen score preserved fields','event.correctedTeamScore = preservedTeamScore;' in gamejs and 'event.correctedOpponentScore = preservedOpponentScore;' in gamejs)
check('reopen score captured before correction','const preservedTeamScore = roundScore(state.game.teamScore);' in gamejs and 'const preservedOpponentScore = roundScore(state.game.opponentScore);' in gamejs)
check('reopen final buttons reenabled','endGameButton' in gamejs and 'postPeriodEndGameButton' in gamejs and 'endShootoutGameButton' in gamejs and 'control.disabled = false;' in gamejs)
check('old summary voided on reopen','voidAccidentalFinalOutput' in gamejs and 'event.type === "game_summary"' in gamejs)
check('fresh summary generator remains','function ensureAutomaticGameSummary()' in gamejs and 'const existing = automaticSummaryEvents();' in gamejs)
check('summary active events ignore voided','return activeEvents().filter(event => event.type === "game_summary");' in gamejs)
check('reopen correction message','Game reopened — previous final was entered in error.' in gamejs)
check('repeat final uses endGame','async function endGame' in gamejs and 'ensureAutomaticGameSummary();' in gamejs)
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
    print('WPI LIVE SCORER HANDOFF & REPEAT FINAL 7.57.19 TEST FAILED')
    for e in errors: print('-',e)
    sys.exit(1)
print('WPI LIVE SCORER HANDOFF & REPEAT FINAL 7.57.19 TEST PASSED')
