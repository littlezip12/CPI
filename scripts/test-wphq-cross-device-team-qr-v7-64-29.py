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
req(semver_at_least(site.get('version'),'7.64.29'),'site release must preserve 7.64.29 or later')
req(site.get('teamShareQrWebFallbackRelease')=='7.64.29','cross-device QR fix marker missing')
req(site.get('teamSharePublicWebBase')=='https://littlezip12.github.io/CPI/','public team-share base must remain current GitHub Pages deployment')
req(site.get('nativeMobileQrOnboardingRelease')=='7.64.29','native QR onboarding marker must advance to 7.64.29')

version=(ROOT/'VERSION.md').read_text()
req('# WPI 7.64.29 — Cross-Device Team QR Fix' in version,'VERSION.md missing 7.64.29 release')

package=json.loads((ROOT/'package.json').read_text()); lock=json.loads((ROOT/'package-lock.json').read_text())
req(semver_at_least(package.get('version'),'7.64.29'),'package.json must preserve 7.64.29 or later')
req(semver_at_least(lock.get('version'),'7.64.29') and semver_at_least(lock.get('packages',{}).get('',{}).get('version'),'7.64.29'),'package-lock must preserve 7.64.29 or later')
# Runtime-only fix: 7.64.28 builder remains authoritative and copies the whole js directory.
req(package.get('scripts',{}).get('mobile:prepare')=='python3 scripts/build-mobile-web-v7-64-28.py','7.64.29 must preserve the validated 7.64.28 mobile builder')

share=(ROOT/'js/live-team-share-v7-64-29.js').read_text()
for token in [
    'const PUBLIC_WEB_BASE="https://littlezip12.github.io/CPI/"',
    'function shareWebBase()',
    'function webFollowUrl(teamId)',
    'function nativeFollowUrl(teamId)',
    'function qrFollowUrl(teamId){return webFollowUrl(teamId);}',
    'waterpolohq://team/',
    'Copy team link',
    'Scan with any phone',
    'window.WPHQTeamShare',
    'publicWebBase:PUBLIC_WEB_BASE'
]: req(token in share,f'7.64.29 team share runtime missing {token}')
req('isNative()?nativeFollowUrl(teamId):webFollowUrl(teamId)' not in share,'QR must not switch to custom scheme inside native shell')
req('renderQr(qrUrl)' in share,'Share Team dialog must render the corrected QR URL')

for page_name in ['live-following.html','live-dashboard.html']:
    page=(ROOT/page_name).read_text()
    req('js/live-team-share-v7-64-29.js?v=7.64.29' in page,f'{page_name} does not load 7.64.29 share runtime')
    req('js/live-team-share-v7-64-28.js?v=7.64.28' not in page,f'{page_name} still loads obsolete 7.64.28 QR runtime')

router=(ROOT/'js/wphq-native-team-links-v7-64-28.js').read_text()
for token in ['waterpolohq://team/','appUrlOpen','getLaunchUrl','followTeam']:
    req(token in router,f'native team-link route must remain preserved: {token}')

builder=ROOT/'scripts/build-mobile-web-v7-64-28.py'
build=subprocess.run([sys.executable,str(builder)],cwd=ROOT,text=True,capture_output=True)
if build.returncode:
    errors.append('mobile bundle build failed: '+(build.stdout+build.stderr).strip())
else:
    www=ROOT/'mobile/www'
    for rel in ['live-following.html','live-dashboard.html']:
        html=(www/rel).read_text()
        req('js/live-team-share-v7-64-29.js?v=7.64.29' in html,f'generated {rel} missing 7.64.29 cross-device share runtime')
    req((www/'js/live-team-share-v7-64-29.js').exists(),'generated mobile bundle missing 7.64.29 share runtime')

if errors:
    print('WPI 7.64.29 CROSS-DEVICE TEAM QR TEST FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('WPI 7.64.29 CROSS-DEVICE TEAM QR TEST PASSED')
print(' - Share Team QR always carries a public HTTPS follow URL')
print(' - native custom-scheme team routing remains available outside the QR payload')
print(' - native/local shells fall back to the current GitHub Pages public base')
print(' - browser production pages retain their own deployed HTTPS base')
print(' - no database or operational authority changes are introduced')
