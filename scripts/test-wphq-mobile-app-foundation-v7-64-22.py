#!/usr/bin/env python3
from pathlib import Path
import json
import re
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[1]
errors=[]

def req(cond,msg):
    if not cond: errors.append(msg)

package=json.loads((ROOT/'package.json').read_text())
req(package.get('name')=='water-polo-hq','package name mismatch')
req(package.get('version')=='7.64.22','package version mismatch')
req(package.get('engines',{}).get('node')=='>=22','Node 22+ engine requirement missing')
for dep in ['@capacitor/core','@capacitor/app']:
    req(str(package.get('dependencies',{}).get(dep,'')).startswith('^8.'),f'{dep} must use Capacitor 8')
for dep in ['@capacitor/cli','@capacitor/ios','@capacitor/android']:
    req(str(package.get('devDependencies',{}).get(dep,'')).startswith('^8.'),f'{dep} must use Capacitor 8')
for script in ['mobile:prepare','mobile:doctor','mobile:sync','mobile:add:ios','mobile:add:android']:
    req(script in package.get('scripts',{}),f'package script missing: {script}')

cap=(ROOT/'capacitor.config.ts').read_text()
for token in ["appId: 'com.waterpolohq.app'","appName: 'Water Polo HQ'","webDir: 'mobile/www'"]:
    req(token in cap,f'Capacitor config missing {token}')

contract=json.loads((ROOT/'mobile/app-contract.json').read_text())
req(contract.get('coldStartRoute')=='live-following.html','native cold start must be My Teams')
req(contract.get('webHomeRoute')=='index.html?home=1','native web Home route missing')
req(contract.get('rankingMethodologyBrand')=='Water Polo Index','ranking methodology brand changed')
req(contract.get('deepLinks',{}).get('status')=='deferred-until-production-domain-is-final','deep-link domain should not be fabricated')
req(contract.get('authentication',{}).get('nativeMagicLinkCallbackStatus')=='must-be-validated-before-beta','native auth callback validation marker missing')

pwa=(ROOT/'js/live-pwa-v7-64-22.js').read_text()
for token in ['isNativeShell','window.Capacitor?.isNativePlatform?.()','!isNativeShell() && "serviceWorker" in navigator','setInstallVisibility(false)']:
    req(token in pwa,f'native-safe PWA runtime missing {token}')

pages=['live.html','live-following.html','live-login.html','live-game.html','live-score.html','live-team-insights.html','live-game-recap.html','live-tournament.html']
for page in pages:
    html=(ROOT/page).read_text()
    req('js/live-pwa-v7-64-22.js?v=7.64.22' in html,f'{page} missing 7.64.22 PWA runtime')

shell=(ROOT/'js/site-shell.js').read_text()
for token in ['function isNativeShell()', 'function nativeAwareHref(item)', 'index.html?home=1']:
    req(token in shell,f'site shell missing native navigation token: {token}')

ignore=(ROOT/'.gitignore').read_text()
req('node_modules/' in ignore,'node_modules ignore missing')
req('mobile/www/' in ignore,'generated mobile webDir ignore missing')

site=json.loads((ROOT/'config/site-release.json').read_text())
req(site.get('version')=='7.64.22','site release mismatch')
req(site.get('nativeMobileFoundationRelease')=='7.64.22','mobile foundation release marker missing')
req(site.get('nativeMobileRuntime')=='Capacitor 8','mobile runtime marker missing')

build=subprocess.run([sys.executable,str(ROOT/'scripts/build-mobile-web-v7-64-22.py')],cwd=ROOT,text=True,capture_output=True)
if build.returncode != 0:
    errors.append('mobile web build failed: '+(build.stdout+build.stderr).strip())
else:
    www=ROOT/'mobile/www'
    index=(www/'index.html').read_text()
    req('data-wphq-native-entry="7.64.22"' in index,'native cold-start injection missing from generated index')
    req("live-following.html?native=1" in index,'generated index does not route native cold start to My Teams')
    for rel in ['live-following.html','live-login.html','live-game.html','live-score.html','organizations.html','assets/branding/wphq-logo-full.png']:
        req((www/rel).exists(),f'generated mobile bundle missing {rel}')
    for forbidden in ['scripts','tests','supabase','qa','docs','.github','assets-original','build']:
        req(not (www/forbidden).exists(),f'generated mobile bundle leaked source-only directory: {forbidden}')

if errors:
    print('WPI 7.64.22 MOBILE APP FOUNDATION TEST FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('WPI 7.64.22 MOBILE APP FOUNDATION TEST PASSED')
print(' - Capacitor 8 project contract and Node 22+ requirement are defined')
print(' - Native My Teams cold start and normal app Home route are defined')
print(' - Browser PWA install/service-worker behavior is suppressed inside the native shell')
print(' - Generated mobile bundle excludes source-only operational directories')
print(' - Deep-link domain and native magic-link callback remain explicitly gated for the next phase')
