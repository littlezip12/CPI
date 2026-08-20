#!/usr/bin/env python3
from pathlib import Path
import json,hashlib,sys
root=Path(__file__).resolve().parents[1]
errors=[]
def check(label,cond):
    if not cond: errors.append(label)
site=json.loads((root/'config/site-release.json').read_text())
html=(root/'live-game.html').read_text()
js=(root/'js/live-game-v7-58-6.js').read_text()
css=(root/'css/live-game-v7-57-22.css').read_text()
check('current version',site.get('version') in {'7.58.6','7.58.7','7.58.8','7.58.9','7.58.10','7.59.0','7.60.0','7.60.1','7.60.2','7.60.3','7.61.0','7.61.1','7.62.0','7.62.1','7.62.2','7.62.3','7.62.4','7.62.5','7.62.6','7.63.0','7.63.1','7.63.2','7.63.3','7.63.4','7.63.5','7.63.6','7.63.7','7.63.8'})
check('current name',site.get('name') in {'Club-Level Pilot Hardening','Club Pilot Validation & Observability','Club-Branded Game Experience','Club Operations & Scale Polish','Pilot Launch Prep & Admin Safety','Lamorinda Club Pilot Ready','Club Branding Platform','Self-Service Club Onboarding','Team Directory & Identity Management','Public / Supporter Experience at Scale'})
check('readiness field',site.get('liveScoringPilotReadinessRelease')=='7.57.22')
check('connectivity field',site.get('liveScoringConnectivityRecoveryRelease')=='7.57.22')
check('game script route','js/live-game-v7-58-6.js?v=7.58.6' in html)
check('readiness css route','css/live-game-v7-57-22.css?v=7.57.22' in html)
check('preflight panel','id="gamePreflight"' in html and 'id="preflightMatchup"' in html and 'id="preflightScorer"' in html)
check('simple start label','id="startGameButton" type="button">Start game</button>' in html)
check('poolside sync badge','id="gameSyncBadge"' in html)
check('readiness engine','function pilotReadinessState()' in js and 'function refreshPilotReadiness()' in js)
check('start gated','button.disabled = !readiness.canStart' in js and 'if (!readiness.canStart)' in js)
check('offline local preservation','navigator.onLine === false' in js and 'Offline · saved on this device' in js)
check('reconnect sync','window.addEventListener("online"' in js and 'scheduleRemoteSync(50)' in js)
check('resume recovery','visibilitychange' in js and 'pageshow' in js and 'restoreConnectedContinuity' in js)
check('groupme optional','Score updates are off. The game will still be recorded in WPI.' in js)
check('reopen eligibility preserved','live_reopen_game_eligibility_v1' in js and 'live_reopen_game_v1' in js)
check('score preservation preserved','event.correctedTeamScore = preservedTeamScore' in js and 'event.correctedOpponentScore = preservedOpponentScore' in js)
check('game scoped supporter sync preserved','role:"guest_scorer"' in js and 'syncGameScopedBackendAuthority' in js)
check('repeat final summary preserved','ensureAutomaticGameSummary()' in js and 'voidAccidentalFinalOutput()' in js)
check('mobile readiness css','@media (max-width:720px)' in css and '.live-preflight-grid { grid-template-columns:1fr;' in css)
expected={
 'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
 'js/live-sandbox-v7-56-15.js':'f32236d8e704c113ba9b868b18ae2b97e7bb366e9adbefd37000117aea0fc6da',
 'js/live-game-v7-57-14.js':'0b9266ccfbf3e1e9fc31b79e33343661a21f4f8885086246e41cbf7e8cfb1c02',
 'js/live-game-v7-57-22.js':'a03145737d61767d6fbca3676b585d8476c3724dd0e45f4f2fd83c2deb87fca4',
 'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
 'supabase/functions/roster-extract/index.ts':'26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb',
 'supabase/migrations/202608110001_scorer_access_game_recovery.sql':'12b4c8798fa0839d1f5eb649bcd0343eef5be7d81e7c1d363bc012a926b380fb',
 'supabase/migrations/202608110002_final_recovery_permission_hotfix.sql':'ac317bd5e593decc94752d55ef01b0c047b4626bcb4af2dcfdd0192e3aff7036'
}
for rel,digest in expected.items():
    p=root/rel
    check(f'protected {rel}',p.exists() and hashlib.sha256(p.read_bytes()).hexdigest()==digest)
if errors:
    print('WPI LIVE 7.57.22 PROTECTED PILOT REGRESSION TEST FAILED')
    for e in errors: print('-',e)
    sys.exit(1)
print('WPI LIVE 7.57.22 PROTECTED PILOT REGRESSION TEST PASSED')
