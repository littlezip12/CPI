#!/usr/bin/env python3
from pathlib import Path
import json, hashlib, sys
root=Path(__file__).resolve().parents[1]
errors=[]
def check(label, cond):
    if not cond: errors.append(label)
site=json.loads((root/'config/site-release.json').read_text())
dash=(root/'live-dashboard.html').read_text()
js=(root/'js/live-dashboard-v7-57-17.js').read_text()
css=(root/'css/live-dashboard-v7-57-17.css').read_text()
sql=(root/'supabase/migrations/202608090006_pilot_account_directory_access_operations.sql').read_text()
check('version', site.get('version')=='7.57.17')
check('name', site.get('name')=='Pilot Account Directory & Access Operations')
check('dashboard release', site.get('liveScoringDashboardRelease')=='7.57.17')
check('account ops release', site.get('liveScoringAccountOperationsRelease')=='7.57.17')
check('account export release', site.get('liveScoringAccountExportRelease')=='7.57.17')
check('dashboard script', 'js/live-dashboard-v7-57-17.js?v=7.57.17' in dash)
check('dashboard css', 'css/live-dashboard-v7-57-17.css?v=7.57.17' in dash)
check('registry button', 'openAccountRegistryButton' in dash and 'Account registry' in dash)
check('registry dialog', 'accountRegistryDialog' in dash and 'WPI Live account registry' in dash)
check('registry metrics', all(x in dash for x in ['accountRegistryTotal','accountRegistryVerified','accountRegistryActive30','accountRegistryInvited']))
check('registry export', 'exportAccountRegistryButton' in dash and 'Export CSV' in dash)
check('registry no marketing consent', 'not marketing consent' in dash.lower())
check('platform owner helper', 'live_is_platform_owner' in sql and "where m.role='owner'" in sql)
check('owner only rpc', 'live_platform_account_registry_v1' in sql and 'Platform Owner access required' in sql)
check('account lifecycle fields', all(x in sql for x in ['emailConfirmedAt','lastSignInAt','registeredAt','signupSource']))
check('account memberships', "'memberships'" in sql and "'teamName'" in sql and "'role'" in sql)
check('profile sync', 'live_sync_account_registry_from_profile' in sql and 'on_live_profile_updated_account_registry' in sql)
check('no account secrets', all(x not in sql.lower() for x in ['password_hash','access_token','refresh_token','openai_api_key','groupme_access_token']))
check('registry UI access probe', 'loadPlatformOwnerAccess' in js and 'live_is_platform_owner' in js)
check('registry protected rpc UI', 'live_platform_account_registry_v1' in js)
check('registry local search', 'filteredAccountRegistryRows' in js and 'accountRegistrySearch' in js)
check('csv export implementation', 'text/csv' in js and 'wpi-live-account-registry-' in js)
check('no new sidebar clutter', 'Account registry</a>' not in dash)
# Protected reliability / prior-release files must remain exact.
expected={
 'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
 'js/live-sandbox-v7-56-15.js':'f32236d8e704c113ba9b868b18ae2b97e7bb366e9adbefd37000117aea0fc6da',
 'js/live-game-v7-57-14.js':'0b9266ccfbf3e1e9fc31b79e33343661a21f4f8885086246e41cbf7e8cfb1c02',
 'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
 'supabase/functions/roster-extract/index.ts':'26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb',
 'supabase/migrations/202608090005_tournament_weekend_record_experience_signup_registry.sql':'d205967895a94632383e59128c67aad178d064b9faf21e61bc9ebfb380084b9b'
}
for rel,digest in expected.items():
    p=root/rel
    check(f'protected {rel}', p.exists() and hashlib.sha256(p.read_bytes()).hexdigest()==digest)
if errors:
    print('WPI LIVE PILOT ACCOUNT DIRECTORY 7.57.17 TEST FAILED')
    for e in errors: print('-',e)
    sys.exit(1)
print('WPI LIVE PILOT ACCOUNT DIRECTORY 7.57.17 TEST PASSED')
