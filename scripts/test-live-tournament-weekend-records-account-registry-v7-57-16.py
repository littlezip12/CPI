#!/usr/bin/env python3
from pathlib import Path
import json, hashlib, sys
root=Path(__file__).resolve().parents[1]
errors=[]
def check(label, cond):
    if not cond: errors.append(label)
site=json.loads((root/'config/site-release.json').read_text())
dash=(root/'live-dashboard.html').read_text()
login=(root/'live-login.html').read_text()
js=(root/'js/live-dashboard-v7-57-16.js').read_text()
loginjs=(root/'js/live-login-v7-57-16.js').read_text()
css=(root/'css/live-dashboard-v7-57-16.css').read_text()
sql=(root/'supabase/migrations/202608090005_tournament_weekend_record_experience_signup_registry.sql').read_text()
check('version', site.get('version')=='7.57.16')
check('name', site.get('name')=='Tournament & Weekend Record Experience')
check('dashboard release', site.get('liveScoringDashboardRelease')=='7.57.16')
check('archive release', site.get('liveScoringGameArchiveRelease')=='7.57.16')
check('account registry release', site.get('liveScoringAccountRegistryRelease')=='7.57.16')
check('signup data release', site.get('liveScoringSignupDataRelease')=='7.57.16')
check('dashboard script', 'js/live-dashboard-v7-57-16.js?v=7.57.16' in dash)
check('dashboard css', 'css/live-dashboard-v7-57-16.css?v=7.57.16' in dash)
check('archive season filter', 'gameArchiveSeasonFilter' in dash and 'gameArchiveSummary' in dash)
check('season grouped archive', 'live-archive-season' in js and 'competitiveSeason' in js)
check('archive logos', 'live-archive-team' in js and 'teamLogoUrl' in js and 'opponentLogoUrl' in js)
check('archive result state', 'archiveResult' in js and 'data-state="${escapeHtml(result.state)}"' in js)
check('archive recap links', 'View recap' in js and 'live-game.html' in js)
check('archive v2 rpc', 'live_game_series_archive_v2' in js and 'live_game_series_archive_v2' in sql)
check('archive division context', 'officialDivisionLabel' in sql and 'officialStage' in sql and 'officialGameNumber' in sql)
check('supporter archive', 'body[data-live-role="viewer"] #dashboardGameArchive' in css)
check('no flat history', 'Permanent records' not in dash and '<h2>Game history</h2>' not in dash)
check('account registry table', 'create table if not exists public.live_account_registry' in sql)
for field in ['email text not null','display_name text','signup_source text','registered_at timestamptz','email_confirmed_at timestamptz','last_sign_in_at timestamptz']:
    check(f'account registry {field}', field in sql)
check('auth registry trigger', 'on_auth_user_updated_live_account_registry' in sql and 'live_capture_account_registry' in sql)
check('registry backfill', 'from auth.users u' in sql and 'on conflict (user_id) do update' in sql)
check('registry rls', 'alter table public.live_account_registry enable row level security' in sql)
check('no broad account registry grant', 'grant select on public.live_account_registry to authenticated' not in sql.lower())
check('signup notice', 'signupDataNotice' in login and 'name, email, registration date' in login and 'does not subscribe you to marketing' in login)
check('signup notice behavior', 'signupDataNotice' in loginjs and 'hidden = !signingUp' in loginjs)
check('login script', 'js/live-login-v7-57-16.js?v=7.57.16' in login)
# Core reliability files remain the exact validated implementations.
expected={
 'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
 'js/live-sandbox-v7-56-15.js':'f32236d8e704c113ba9b868b18ae2b97e7bb366e9adbefd37000117aea0fc6da',
 'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
 'supabase/functions/roster-extract/index.ts':'26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb',
 'supabase/migrations/202608090004_clean_slate_tournament_weekend_records.sql':'f33ef7e3dedb072017a2bdcdace43d2a537c921bec839f552014bc196fe48f44'
}
for rel,digest in expected.items():
    p=root/rel
    check(f'protected {rel}', p.exists() and hashlib.sha256(p.read_bytes()).hexdigest()==digest)
if errors:
    print('WPI LIVE TOURNAMENT/WEEKEND RECORDS + ACCOUNT REGISTRY 7.57.16 TEST FAILED')
    for e in errors: print('-',e)
    sys.exit(1)
print('WPI LIVE TOURNAMENT/WEEKEND RECORDS + ACCOUNT REGISTRY 7.57.16 TEST PASSED')
