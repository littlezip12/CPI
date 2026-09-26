#!/usr/bin/env python3
from pathlib import Path
import json, re, subprocess, sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]
def req(c,m):
    if not c: errors.append(m)
def semver_at_least(v,f):
    try:return tuple(int(x) for x in str(v).split('.')[:3])>=tuple(int(x) for x in str(f).split('.')[:3])
    except:return False

site=json.loads((ROOT/'config/site-release.json').read_text())
req(semver_at_least(site.get('version'),'7.64.27'),'site release must preserve 7.64.27 or later')
req(site.get('nativeMobileAuthPolishRelease')=='7.64.27','native auth polish marker missing')
req(site.get('nativeMobileFollowPersistenceRelease')=='7.64.27','follow persistence marker missing')
version=(ROOT/'VERSION.md').read_text()
req('# WPI 7.64.27 — Native Auth Polish & Team Follow Persistence' in version,'VERSION.md missing 7.64.27 release')

package=json.loads((ROOT/'package.json').read_text()); lock=json.loads((ROOT/'package-lock.json').read_text())
req(semver_at_least(package.get('version'),'7.64.27'),'package.json must preserve 7.64.27 or later')
req(semver_at_least(lock.get('version'),'7.64.27') and semver_at_least(lock.get('packages',{}).get('',{}).get('version'),'7.64.27'),'package-lock must preserve 7.64.27 or later')

login=(ROOT/'js/live-login-v7-64-27.js').read_text()
for token in ['friendlyAuthError','Too many sign-in emails were requested','This secure sign-in link is invalid or has expired','Water Polo HQ will send a one-time secure sign-in link','Water Polo HQ could not complete sign-in']:
    req(token in login,f'login polish missing {token}')
for stale in ['Enter your email. WPI will send','Create your WPI Live account','Open WPI Live','read-only WPI game feed']:
    req(stale not in login,f'active login runtime still exposes stale copy: {stale}')
page=(ROOT/'live-login.html').read_text()
req('js/live-login-v7-64-27.js?v=7.64.27' in page,'login page does not load 7.64.27 runtime')
req('Water Polo HQ stores only the account information' in page,'supporter data notice is not WPHQ branded')
req('Water Polo HQ directory' in page,'supporter directory copy is not WPHQ branded')

backend=(ROOT/'js/live-backend-v7-56-8.js').read_text()
req('persistSession: true' in backend,'Supabase session persistence must remain enabled')
following_backend=(ROOT/'js/live-team-following-v7-60-3.js').read_text()
for token in ['live_following_overview_v2','live_set_team_follow_v2','live_set_public_team_follow_v1']:
    req(token in following_backend,f'follow backend missing {token}')

following=(ROOT/'js/live-following-v7-64-27.js').read_text()
for token in ['await backend.session()','await loadOverview()','await backend.setPublicTeamFamilyFollow','await backend.setTeamFollow','saved to your Water Polo HQ account and will remain in My Teams when you reopen the app']:
    req(token in following,f'active My Teams persistence path missing {token}')
req('localStorage' not in following and 'sessionStorage' not in following,'active My Teams follow ownership must not rely on local/session storage')
req('const RELEASE="7.64.27"' in following,'active My Teams runtime not stamped 7.64.27')
follow_page=(ROOT/'live-following.html').read_text()
req('js/live-following-v7-64-27.js?v=7.64.27' in follow_page,'My Teams page does not load 7.64.27 runtime')

sql=(ROOT/'supabase/migrations/202608140005_public_supporter_experience_scale.sql').read_text()
for token in ['create table if not exists public.live_public_team_follows','create or replace function public.live_set_public_team_follow_v1','create or replace function public.live_following_overview_v2']:
    req(token in sql,f'follow persistence migration missing {token}')
privacy=(ROOT/'supabase/migrations/202609210002_player_roster_privacy_hardening.sql').read_text()
req('create or replace function public.live_set_team_follow_v2' in privacy,'permanent-account direct follow RPC missing')

builder_path=ROOT/('scripts/build-mobile-web-v7-64-28.py' if (ROOT/'scripts/build-mobile-web-v7-64-28.py').exists() else 'scripts/build-mobile-web-v7-64-23.py')
builder=builder_path.read_text()
for token in ['"js/live-login-v7-64-27.js"','"js/live-following-v7-64-27.js"']:
    req(token in builder,f'mobile builder missing {token}')
build=subprocess.run([sys.executable,str(builder_path)],cwd=ROOT,text=True,capture_output=True)
if build.returncode:
    errors.append('mobile bundle build failed: '+(build.stdout+build.stderr).strip())
else:
    www=ROOT/'mobile/www'
    req('js/live-login-v7-64-27.js?v=7.64.27' in (www/'live-login.html').read_text(),'generated native login page missing 7.64.27 runtime')
    req('js/live-following-v7-64-27.js?v=7.64.27' in (www/'live-following.html').read_text(),'generated native My Teams page missing 7.64.27 runtime')

if errors:
    print('WPI 7.64.27 NATIVE AUTH / FOLLOW PERSISTENCE TEST FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('WPI 7.64.27 NATIVE AUTH / FOLLOW PERSISTENCE TEST PASSED')
print(' - Supporter sign-in uses Water Polo HQ consumer copy and friendly auth errors')
print(' - Supabase session persistence remains enabled')
print(' - My Teams follows are written/read through server-backed RPCs')
print(' - Follow ownership does not depend on localStorage/sessionStorage')
print(' - Generated iOS web bundle uses the 7.64.27 login and My Teams runtimes')
