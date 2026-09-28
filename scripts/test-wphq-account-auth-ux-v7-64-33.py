#!/usr/bin/env python3
from pathlib import Path
import json, subprocess, sys

ROOT=Path(__file__).resolve().parents[1]
errors=[]
def req(c,m):
    if not c: errors.append(m)
def semver_at_least(v,f):
    try:return tuple(int(x) for x in str(v).split('.')[:3])>=tuple(int(x) for x in str(f).split('.')[:3])
    except:return False

site=json.loads((ROOT/'config/site-release.json').read_text())
req(site.get('version')=='7.64.33','site release must be 7.64.33')
for key in ['liveAccountAuthUxRelease','livePasswordFirstAuthRelease','liveSecondaryMagicLinkRelease']:
    req(site.get(key)=='7.64.33',f'{key} marker missing')
version=(ROOT/'VERSION.md').read_text()
req('# WPI 7.64.33 — Account Sign-Up & Login UX' in version,'VERSION.md missing 7.64.33 release')

package=json.loads((ROOT/'package.json').read_text())
lock=json.loads((ROOT/'package-lock.json').read_text())
req(package.get('version')=='7.64.33','package.json version must be 7.64.33')
req(lock.get('version')=='7.64.33' and lock.get('packages',{}).get('',{}).get('version')=='7.64.33','package-lock version must be 7.64.33')

page=(ROOT/'live-login.html').read_text()
for token in ['>Log in<','>Create account<','Email me a sign-in link instead','minlength="12"','js/live-login-v7-64-33-1.js?v=7.64.33.1']:
    req(token in page,f'login page missing {token}')
req('js/live-login-v7-64-27.js?v=7.64.27' not in page,'active login page still loads 7.64.27 runtime')

login=(ROOT/'js/live-login-v7-64-33-1.js').read_text()
for token in [
    'backend.client.auth.signUp({ email, password, options })',
    'data = await backend.signIn(email, password)',
    'shouldCreateUser: false',
    'backend.client.auth.signInWithOtp({ email, options })',
    'nativeRedirectForAuth()',
    'if (!isNativeAuth() || !following) return "";',
    'nativeAuth().prepareRedirect(followingTarget())',
    'loginPassword").minLength = signingUp ? 12 : 1',
    'emailRedirectTo: nativeRedirect || redirect.href',
    'followTeam',
    'setMode("signup")',
    'forgotPassword',
]:
    req(token in login,f'7.64.33 login runtime missing {token}')
req('passwordlessSupporter' not in login,'supporter flow must no longer force passwordless mode')
req('shouldCreateUser: true' not in login,'secondary Magic Link must not create accounts')
req('signupAllowed = true' in login,'normal login page must always allow permanent account creation')
req('$("signUpTab").hidden = false;' in login,'Create account tab must remain visible on normal login')
req('signupAllowed = Boolean(onboarding || following || invite || registration.bootstrapAvailable)' not in login,'account creation must not be hidden behind invitation/bootstrap state')

backend=(ROOT/'js/live-backend-v7-56-8.js').read_text()
for token in ['signInWithPassword','persistSession: true','autoRefreshToken: true','resetPasswordForEmail']:
    req(token in backend,f'backend auth/session foundation missing {token}')

bridge=(ROOT/'js/wphq-native-auth-v7-64-26.js').read_text()
for token in ['waterpolohq://auth/callback','exchangeCodeForSession','setSession','verifyOtp']:
    req(token in bridge,f'native auth bridge missing {token}')

for builder_name in ['scripts/build-mobile-web-v7-64-23.py','scripts/build-mobile-web-v7-64-28.py']:
    builder=(ROOT/builder_name).read_text()
    req('"js/live-login-v7-64-33-1.js"' in builder,f'{builder_name} missing 7.64.33 login runtime')

build=subprocess.run([sys.executable,str(ROOT/'scripts/build-mobile-web-v7-64-28.py')],cwd=ROOT,text=True,capture_output=True)
if build.returncode:
    errors.append('mobile bundle build failed: '+(build.stdout+build.stderr).strip())
else:
    www=ROOT/'mobile/www'
    generated=(www/'live-login.html').read_text()
    req('js/live-login-v7-64-33-1.js?v=7.64.33.1' in generated,'generated native login page missing cache-busted 7.64.33 runtime')
    req((www/'js/live-login-v7-64-33-1.js').exists(),'generated native bundle missing cache-busted 7.64.33 login JS')
    req('wphq-native-auth-v7-64-26.js?v=7.64.26' in generated,'generated native login page missing auth bridge')

# Server/scorer foundations should remain present and versioned.
req((ROOT/'js/live-backend-v7-64-31.js').exists(),'7.64.31 delivery/finalization backend missing')
req((ROOT/'js/live-game-v7-64-32.js').exists(),'7.64.32 scorer runtime missing')
req((ROOT/'js/live-quick-time-pad-v7-64-32.js').exists(),'7.64.32 Quick Time runtime missing')

if errors:
    print('WPHQ 7.64.33 ACCOUNT SIGN-UP & LOGIN UX TEST FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('WPHQ 7.64.33 ACCOUNT SIGN-UP & LOGIN UX TEST PASSED')
print(' - Log in / Create account toggle is always visible for permanent accounts')
print(' - supporter onboarding is password-first, not forced Magic Link')
print(' - returning members use persistent email/password sessions')
print(' - Magic Link remains secondary and cannot silently create accounts')
print(' - browser/native follow targets and native auth callback are preserved')
print(' - 7.64.31/7.64.32 server + scorer foundations remain present')
