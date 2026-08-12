#!/usr/bin/env python3
from pathlib import Path
import json,hashlib,sys
root=Path(__file__).resolve().parents[1]
errors=[]
def check(label,cond):
    if not cond: errors.append(label)
site=json.loads((root/'config/site-release.json').read_text())
html=(root/'live-game.html').read_text()
js=(root/'js/live-game-v7-57-21.js').read_text()
sql=(root/'supabase/migrations/202608110002_final_recovery_permission_hotfix.sql').read_text()
check('version',site.get('version')=='7.57.21')
check('name',site.get('name')=='Final Recovery Permission Hotfix')
check('release field',site.get('liveScoringFinalRecoveryPermissionRelease')=='7.57.21')
check('game script route','js/live-game-v7-57-21.js?v=7.57.21' in html)
check('eligibility rpc client','live_reopen_game_eligibility_v1' in js)
check('server driven visibility','refreshReopenEligibility' in js and 'button.hidden = !allowed' in js)
check('old viewer-only hide removed','reopenButton.hidden = isViewer' not in js)
check('eligibility function','create or replace function public.live_reopen_game_eligibility_v1' in sql)
check('handoff supporter eligible',"latest_session.source in ('member_handoff','guest_handoff','game_reopen')" in sql)
check('ordinary supporter not blanket allowed',"caller_role in ('owner','admin') or recent_scorer" in sql)
check('reopen uses eligibility','eligibility := public.live_reopen_game_eligibility_v1(target_game_id);' in sql)
check('recovery window',"interval '30 minutes'" in sql)
# Preserve critical reliability assets.
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
    print('WPI LIVE FINAL RECOVERY PERMISSION 7.57.21 TEST FAILED')
    for e in errors: print('-',e)
    sys.exit(1)
print('WPI LIVE FINAL RECOVERY PERMISSION 7.57.21 TEST PASSED')
