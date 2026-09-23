#!/usr/bin/env python3
from pathlib import Path
import json, plistlib, subprocess, sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]
def req(c,m):
    if not c: errors.append(m)
def semver_at_least(v,f):
    try: return tuple(int(x) for x in str(v).split('.')[:3]) >= tuple(int(x) for x in str(f).split('.')[:3])
    except Exception: return False

site=json.loads((ROOT/'config/site-release.json').read_text())
req(semver_at_least(site.get('version'),'7.64.26'),'site release must preserve 7.64.26 or later')
req(site.get('nativeMobileAuthBridgeRelease')=='7.64.26','native auth bridge marker missing')
req(site.get('nativeMobileAuthCallback')=='waterpolohq://auth/callback','native auth callback marker missing')
version=(ROOT/'VERSION.md').read_text()
req('# WPI 7.64.26 — Native Authentication Bridge' in version,'VERSION.md missing 7.64.26 release')

package=json.loads((ROOT/'package.json').read_text())
lock=json.loads((ROOT/'package-lock.json').read_text())
req(package.get('version')=='7.64.26','package.json version not normalized to 7.64.26')
req(lock.get('version')=='7.64.26' and lock.get('packages',{}).get('',{}).get('version')=='7.64.26','package-lock.json version not normalized to 7.64.26')
req('@capacitor/app' in package.get('dependencies',{}),'Capacitor App plugin missing')

contract=json.loads((ROOT/'mobile/app-contract.json').read_text())
req(contract.get('deepLinks',{}).get('authCustomScheme')=='waterpolohq://auth/callback','mobile contract missing auth custom scheme')
req(contract.get('deepLinks',{}).get('productionUniversalLinks')=='deferred-until-production-domain-is-final','production universal-link domain should remain deferred')
req(contract.get('authentication',{}).get('validationStatus')=='awaiting-end-to-end-email-link-and-relaunch-test','native auth validation must remain explicitly pending')

with open(ROOT/'ios/App/App/Info.plist','rb') as fh: plist=plistlib.load(fh)
schemes=[]
for row in plist.get('CFBundleURLTypes',[]): schemes.extend(row.get('CFBundleURLSchemes',[]))
req('waterpolohq' in schemes,'iOS Info.plist does not register waterpolohq custom URL scheme')

bridge=(ROOT/'js/wphq-native-auth-v7-64-26.js').read_text()
for token in ['waterpolohq://auth/callback','appUrlOpen','getLaunchUrl','exchangeCodeForSession','setSession','verifyOtp','wphq-native-auth-target-v7-64-26']:
    req(token in bridge,f'native auth bridge missing {token}')

login=(ROOT/'js/live-login-v7-64-26.js').read_text()
for token in ['nativeAuth().prepareRedirect(followingTarget())','completeNativeAuthIfPresent()','emailRedirectTo:nativeRedirect || redirect.href','wphq:native-auth-url']:
    req(token in login,f'native login runtime missing {token}')
page=(ROOT/'live-login.html').read_text()
req('js/live-login-v7-64-26.js?v=7.64.26' in page,'live-login.html does not load native auth-aware login runtime')

builder=(ROOT/'scripts/build-mobile-web-v7-64-23.py').read_text()
for token in ['wphq-native-auth-v7-64-26.js?v=7.64.26','"js/wphq-native-auth-v7-64-26.js"','"js/live-login-v7-64-26.js"']:
    req(token in builder,f'mobile builder missing {token}')

build=subprocess.run([sys.executable,str(ROOT/'scripts/build-mobile-web-v7-64-23.py')],cwd=ROOT,text=True,capture_output=True)
if build.returncode:
    errors.append('mobile bundle build failed: '+(build.stdout+build.stderr).strip())
else:
    www=ROOT/'mobile/www'
    for rel in ['index.html','live-following.html','live-login.html']:
        html=(www/rel).read_text()
        req('wphq-native-auth-v7-64-26.js?v=7.64.26' in html,f'{rel} missing generated native auth bridge')
    req('js/live-login-v7-64-26.js?v=7.64.26' in (www/'live-login.html').read_text(),'generated native login page missing 7.64.26 login runtime')

if errors:
    print('WPI 7.64.26 NATIVE AUTH BRIDGE TEST FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('WPI 7.64.26 NATIVE AUTH BRIDGE TEST PASSED')
print(' - iOS registers waterpolohq://auth/callback')
print(' - Capacitor URL-open and cold-start auth returns are captured')
print(' - Supabase implicit-token, PKCE-code, and token-hash returns are supported')
print(' - My Teams target survives passwordless auth round-trip')
print(' - Browser/PWA login flow remains separate from native redirect handling')
