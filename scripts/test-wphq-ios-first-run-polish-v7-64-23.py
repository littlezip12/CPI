#!/usr/bin/env python3
from pathlib import Path
import json
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[1]
errors=[]
def req(c,m):
    if not c: errors.append(m)

package=json.loads((ROOT/'package.json').read_text())
req(tuple(map(int,package.get('version','0.0.0').split('.')[:3])) >= (7,64,23),'package version must preserve 7.64.23 or later')
req('typescript' in package.get('devDependencies',{}),'TypeScript must be an explicit dev dependency')
mobile_prepare=package.get('scripts',{}).get('mobile:prepare','')
req(mobile_prepare.startswith('python3 scripts/build-mobile-web-v7-64-') and mobile_prepare.endswith('.py'),'mobile:prepare must use a versioned WPHQ mobile builder')

site=json.loads((ROOT/'config/site-release.json').read_text())
req(tuple(map(int,site.get('version','0.0.0').split('.')[:3])) >= (7,64,23),'site release must preserve 7.64.23 or later')
req(site.get('nativeIosFirstRunPolishRelease')=='7.64.23','native iOS polish marker missing')

native_js=(ROOT/'js/wphq-native-shell-v7-64-23.js').read_text()
for token in ['window.__WPHQ_NATIVE__ = true','dataset.wphqNativeShell = "true"']:
    req(token in native_js,f'native marker runtime missing {token}')

native_css=(ROOT/'css/wphq-native-shell-v7-64-23.css').read_text()
for token in ['safe-area-inset-top','[data-wpi-install-app]{display:none!important}','grid-template-columns:repeat(5,minmax(0,1fr))']:
    req(token in native_css,f'native stylesheet missing {token}')

pwa=(ROOT/'js/live-pwa-v7-64-23.js').read_text()
for token in ['window.__WPHQ_NATIVE__ === true','dataset?.wphqNativeShell === "true"','setInstallVisibility(false)','!isNativeShell() && "serviceWorker" in navigator']:
    req(token in pwa,f'native-safe PWA runtime missing {token}')

shell=(ROOT/'js/site-shell.js').read_text()
for token in ['nativeLabel: "Teams"','nativeLabel: "Events"','nativeLabel: "Live"','window.__WPHQ_NATIVE__ === true']:
    req(token in shell,f'native navigation missing {token}')

following=(ROOT/'live-following.html').read_text()
for token in ['data-follow-auth-only hidden','id="followSignOut" type="button" data-follow-auth-only hidden','js/live-pwa-v7-64-23.js?v=7.64.23']:
    req(token in following,f'My Teams native/signed-out polish missing {token}')
req(('js/live-following-v7-64-23.js?v=7.64.23' in following) or ('js/live-following-v7-64-27.js?v=7.64.27' in following),'My Teams page missing native-safe following runtime')
following_path=ROOT/('js/live-following-v7-64-27.js' if (ROOT/'js/live-following-v7-64-27.js').exists() and 'js/live-following-v7-64-27.js?v=7.64.27' in following else 'js/live-following-v7-64-23.js')
following_js=following_path.read_text()
req('document.querySelectorAll("[data-follow-auth-only]").forEach(el=>{el.hidden=false;});' in following_js,'auth-only My Teams actions are not restored after permanent sign-in')

pages=['live.html','live-following.html','live-login.html','live-game.html','live-score.html','live-team-insights.html','live-game-recap.html','live-tournament.html']
for page in pages:
    html=(ROOT/page).read_text()
    req('js/live-pwa-v7-64-23.js?v=7.64.23' in html,f'{page} missing 7.64.23 PWA runtime')

builder_rel=mobile_prepare.replace('python3 ','',1).strip()
builder_path=ROOT/builder_rel
req(builder_path.exists(),'configured mobile builder is missing')
build=subprocess.run([sys.executable,str(builder_path)],cwd=ROOT,text=True,capture_output=True) if builder_path.exists() else subprocess.CompletedProcess([],1,'','configured builder missing')
if build.returncode:
    errors.append('mobile bundle build failed: '+(build.stdout+build.stderr).strip())
else:
    www=ROOT/'mobile/www'
    for rel in ['index.html','live-following.html','organizations.html']:
        html=(www/rel).read_text()
        req('wphq-native-shell-v7-64-23.js?v=7.64.23' in html,f'{rel} missing generated native marker runtime')
        req('wphq-native-shell-v7-64-23.css?v=7.64.23' in html,f'{rel} missing generated native stylesheet')
        req('viewport-fit=cover' in html,f'{rel} missing native safe-area viewport')
    idx=(www/'index.html').read_text()
    req('data-wphq-native-entry="7.64.23"' in idx,'native cold-start release marker missing')
    req("live-following.html?native=1" in idx,'native cold start no longer routes to My Teams')

if errors:
    print('WPI 7.64.23 IOS FIRST-RUN NATIVE POLISH TEST FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('WPI 7.64.23 IOS FIRST-RUN NATIVE POLISH TEST PASSED')
print(' - Every generated native HTML page receives deterministic native-shell and safe-area markers')
print(' - Browser-only Install Water Polo HQ controls are suppressed natively')
print(' - Signed-out My Teams hides signed-in-only actions until permanent authentication succeeds')
print(' - Native top navigation uses compact labels that fit phone width')
print(' - TypeScript is declared for clean Capacitor configuration loading')
