from pathlib import Path
import json, plistlib, re, struct
ROOT=Path(__file__).resolve().parents[1]
fail=[]; warn=[]; ok=[]
def need(cond, good, bad):
    (ok if cond else fail).append(good if cond else bad)
config=(ROOT/'capacitor.config.ts').read_text()
project=(ROOT/'ios/App/App.xcodeproj/project.pbxproj').read_text()
plist_path=ROOT/'ios/App/App/Info.plist'
need(plist_path.exists(),'Info.plist present','iOS Info.plist missing')
need("appId: 'com.waterpolohq.app'" in config,'Capacitor app ID is com.waterpolohq.app','Capacitor app ID changed unexpectedly')
need("appName: 'Water Polo HQ'" in config,'Capacitor app name is Water Polo HQ','Capacitor app name mismatch')
need('PRODUCT_BUNDLE_IDENTIFIER = com.waterpolohq.app;' in project,'Xcode bundle ID matches Capacitor','Xcode bundle ID mismatch')
need('CODE_SIGN_STYLE = Automatic;' in project,'Automatic signing is enabled','Automatic signing is not enabled')
need('MARKETING_VERSION = 1.0;' in project,'Marketing version is 1.0','Marketing version is not 1.0')
need('CURRENT_PROJECT_VERSION = 1;' in project,'Build number is 1','Build number is not 1')
if plist_path.exists():
    plist=plistlib.loads(plist_path.read_bytes())
    schemes=[]
    for item in plist.get('CFBundleURLTypes',[]) or []:
        schemes += item.get('CFBundleURLSchemes',[]) or []
    need('waterpolohq' in schemes,'waterpolohq:// URL scheme registered','waterpolohq:// URL scheme missing')
icon=ROOT/'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'
need(icon.exists(),'App Store icon asset present','App Store icon asset missing')
if icon.exists():
    b=icon.read_bytes()[:24]
    if b[:8] == b'\x89PNG\r\n\x1a\n' and len(b)>=24:
        w,h=struct.unpack('>II',b[16:24])
        need((w,h)==(1024,1024),f'App icon is {w}x{h}',f'App icon must be 1024x1024, found {w}x{h}')
    else: fail.append('App icon is not a readable PNG')
if not re.search(r'DEVELOPMENT_TEAM = [A-Z0-9]+;', project):
    warn.append('No Apple Development Team is committed. Select your team in Xcode before installing on a physical iPhone or archiving for TestFlight.')
warn.append('com.waterpolohq.app is still the provisional bundle ID. Confirm it is the permanent App Store identifier before the first TestFlight/App Store registration.')
warn.append('Universal Links are intentionally deferred until the final production Water Polo HQ domain is ready; custom-scheme auth/team routing remains the current native contract.')
print('Water Polo HQ iOS physical-device readiness')
for line in ok: print(' PASS:',line)
for line in warn: print(' ACTION:',line)
if fail:
    for line in fail: print(' FAIL:',line)
    raise SystemExit(1)
print('RESULT: source/project configuration is ready for physical-device signing setup; manual Apple signing gates remain.')
