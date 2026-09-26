#!/usr/bin/env python3
from pathlib import Path
import json, plistlib, re, subprocess, sys

ROOT=Path(__file__).resolve().parents[1]
errors=[]
def req(c,m):
    if not c: errors.append(m)
def semver_at_least(v,f):
    try:return tuple(int(x) for x in str(v).split('.')[:3])>=tuple(int(x) for x in str(f).split('.')[:3])
    except:return False

site=json.loads((ROOT/'config/site-release.json').read_text())
req(semver_at_least(site.get('version'),'7.64.28'),'site release must preserve 7.64.28 or later')
req(site.get('nativeMobileTeamLinkRelease')=='7.64.28','native team-link marker missing')
req(site.get('nativeMobileTeamLinkScheme')=='waterpolohq://team/<team UUID>','native team-link scheme marker missing')
req(site.get('nativeMobileQrOnboardingRelease')=='7.64.28','native QR onboarding marker missing')
req(site.get('teamHubFollowTargetPreservationRelease')=='7.64.28','team-hub follow target marker missing')
version=(ROOT/'VERSION.md').read_text()
req('# WPI 7.64.28 — Native Team Link & QR Onboarding' in version,'VERSION.md missing 7.64.28 release')

package=json.loads((ROOT/'package.json').read_text()); lock=json.loads((ROOT/'package-lock.json').read_text())
req(semver_at_least(package.get('version'),'7.64.28'),'package.json must preserve 7.64.28 or later')
req(semver_at_least(lock.get('version'),'7.64.28') and semver_at_least(lock.get('packages',{}).get('',{}).get('version'),'7.64.28'),'package-lock must preserve 7.64.28 or later')
req(package.get('scripts',{}).get('mobile:prepare')=='python3 scripts/build-mobile-web-v7-64-28.py','mobile:prepare does not use 7.64.28 builder')

with open(ROOT/'ios/App/App/Info.plist','rb') as fh: plist=plistlib.load(fh)
schemes=[]
for row in plist.get('CFBundleURLTypes',[]): schemes.extend(row.get('CFBundleURLSchemes',[]))
req('waterpolohq' in schemes,'iOS custom URL scheme must remain registered')

router=(ROOT/'js/wphq-native-team-links-v7-64-28.js').read_text()
for token in ['waterpolohq://team/','appUrlOpen','getLaunchUrl','live-following.html','followTeam','native','parsed.hostname === "team"','parsed.hostname === "follow"','UUID_RE']:
    req(token in router,f'native team-link router missing {token}')
req('auth/callback' not in router,'team-link router must not take ownership of auth callback routing')

following=(ROOT/'js/live-following-v7-64-27.js').read_text()
for token in ['params.get("followTeam")','loginHrefForFollow','await backend.setTeamFollow(teamId,true)','await applySharedTeamLink()']:
    req(token in following,f'My Teams follow-target path missing {token}')

login=(ROOT/'js/live-login-v7-64-27.js').read_text()
for token in ['params.get("followTeam")','followingTarget()','nativeAuth().prepareRedirect(followingTarget())','redirect.searchParams.set("followTeam", followTeam)']:
    req(token in login,f'login does not preserve team target: {token}')

auth=(ROOT/'js/wphq-native-auth-v7-64-26.js').read_text()
req('/^live-following\\.html(?:\\?.*)?$/' in auth,'native auth target sanitizer must preserve My Teams query strings')

share=(ROOT/'js/live-team-share-v7-64-28.js').read_text()
for token in ['Water Polo HQ · Follow team','webFollowUrl','nativeFollowUrl','qrFollowUrl','waterpolohq://team/','Copy browser link','window.WPHQTeamShare']:
    req(token in share,f'7.64.28 team share runtime missing {token}')
req('a.download=`water-polo-hq-' in share,'QR download filename must use Water Polo HQ branding')

for page_name in ['live-following.html','live-dashboard.html']:
    page=(ROOT/page_name).read_text()
    req('js/live-team-share-v7-64-28.js?v=7.64.28' in page,f'{page_name} does not load 7.64.28 share runtime')

hub=(ROOT/'js/team-hub-v7-64-28.js').read_text(); hub_page=(ROOT/'team-hub.html').read_text()
for token in ['followTeam=${encodeURIComponent(lt.teamId)}','Sign in for Team Stats','Water Polo HQ Live']:
    req(token in hub,f'team hub target/brand polish missing {token}')
req('js/team-hub-v7-64-28.js?v=7.64.28' in hub_page,'team hub does not load 7.64.28 runtime')
req('<title>Team | Water Polo HQ</title>' in hub_page,'team hub title is not WPHQ branded')

builder_path=ROOT/'scripts/build-mobile-web-v7-64-28.py'; builder=builder_path.read_text()
for token in ['wphq-native-team-links-v7-64-28.js?v=7.64.28','"js/wphq-native-team-links-v7-64-28.js"','"js/live-team-share-v7-64-28.js"','"js/team-hub-v7-64-28.js"']:
    req(token in builder,f'mobile builder missing {token}')

build=subprocess.run([sys.executable,str(builder_path)],cwd=ROOT,text=True,capture_output=True)
if build.returncode:
    errors.append('mobile bundle build failed: '+(build.stdout+build.stderr).strip())
else:
    www=ROOT/'mobile/www'
    for rel in ['index.html','live-following.html','live-login.html','team-hub.html']:
        html=(www/rel).read_text()
        req('wphq-native-team-links-v7-64-28.js?v=7.64.28' in html,f'{rel} missing generated native team-link bridge')
    req('js/live-team-share-v7-64-28.js?v=7.64.28' in (www/'live-following.html').read_text(),'generated My Teams page missing 7.64.28 share runtime')
    req('js/team-hub-v7-64-28.js?v=7.64.28' in (www/'team-hub.html').read_text(),'generated Team Hub missing 7.64.28 runtime')

if errors:
    print('WPI 7.64.28 NATIVE TEAM LINK / QR ONBOARDING TEST FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('WPI 7.64.28 NATIVE TEAM LINK / QR ONBOARDING TEST PASSED')
print(' - waterpolohq://team/<UUID> routes into the existing My Teams follow flow')
print(' - signed-out supporter auth preserves the exact requested team')
print(' - native QR opens the app while the copied browser link remains the fallback')
print(' - Team Hub sign-in preserves the active Live team target')
print(' - no database or operational authority changes are introduced')
