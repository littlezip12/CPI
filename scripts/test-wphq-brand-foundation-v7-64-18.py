from pathlib import Path
from PIL import Image
import json, re

ROOT=Path(__file__).resolve().parents[1]
site=json.loads((ROOT/'config/site-release.json').read_text())
manifest=json.loads((ROOT/'manifest.webmanifest').read_text())
version=(ROOT/'VERSION.md').read_text()
shell=(ROOT/'js/site-shell.js').read_text()
brand_css=(ROOT/'css/wphq-brand-v7-64-18.css').read_text()
home=(ROOT/'index.html').read_text()
pwa_path=ROOT/('js/live-pwa-v7-64-19.js' if (ROOT/'js/live-pwa-v7-64-19.js').exists() else 'js/live-pwa-v7-64-18.js')
pwa=pwa_path.read_text()
sw_path=ROOT/('sw-v7-64-19.js' if (ROOT/'sw-v7-64-19.js').exists() else 'sw-v7-64-18.js')
sw=sw_path.read_text()

def req(cond,msg):
    if not cond: raise AssertionError(msg)

def semver_at_least(value, floor):
    def parts(v): return tuple(int(x) for x in str(v).split('.')[:3])
    return parts(value) >= parts(floor)

req('# WPI 7.64.18 — Water Polo HQ Brand Foundation' in version,'7.64.18 foundation history missing from VERSION')
req(semver_at_least(site.get('version'),'7.64.18'),'site release must preserve 7.64.18 or later')
req(site.get('consumerBrand')=='Water Polo HQ','consumer brand marker missing')
req(site.get('consumerShortName')=='WPHQ','consumer short name missing')
req(site.get('rankingMethodologyBrand')=='Water Polo Index','ranking methodology brand must remain Water Polo Index')
req(site.get('wphqBrandFoundationRelease')=='7.64.18','brand foundation marker missing')
for rel in ['assets/branding/wphq-logo-full.png','assets/branding/wphq-logo-mark.svg','css/wphq-brand-v7-64-18.css','css/wphq-home-v7-64-18.css']:
    req((ROOT/rel).exists() and (ROOT/rel).stat().st_size>0,f'missing brand asset {rel}')
for rel,size in {
    'assets/app-icons/wphq-apple-touch-180.png':(180,180),
    'assets/app-icons/wphq-app-192.png':(192,192),
    'assets/app-icons/wphq-app-512.png':(512,512),
    'assets/app-icons/wphq-app-maskable-512.png':(512,512),
}.items():
    with Image.open(ROOT/rel) as im: req(im.size==size,f'wrong app icon size: {rel}')
req('Water Polo HQ Home' in shell,'global shell missing Water Polo HQ Home')
req('label: "Live Scores"' in shell,'global shell missing Live Scores nav')
req('label: "Teams & Clubs"' in shell,'global shell missing Teams & Clubs nav')
req(bool(re.search(r'assets/branding/wphq-logo-full\.png\?v=7\.64\.(?:19|2[01])', shell)),'global shell missing current WPHQ full-logo cache key')
req(('wphq-brand-v7-64-18.css?v=7.64.18' in shell) or ('wphq-brand-v7-64-21.css?v=7.64.21' in shell),'global shell missing approved WPHQ brand stylesheet')
for token in ['background:rgba(255,255,255,.94)','--wphq-bg:#f5fbff','cpi-shell-footer']:
    req(token in brand_css,f'light brand system missing {token}')
for token in ['<title>Water Polo HQ | Scores, Rankings, Stats & Tournaments</title>','Water Polo HQ</p>','for the water polo community.','wphq-home-v7-64-18.css?v=7.64.18']:
    req(token in home,f'homepage brand foundation missing {token}')
req(manifest.get('name')=='Water Polo HQ','PWA full name must be Water Polo HQ')
req(manifest.get('short_name')=='WPHQ','PWA short name must be WPHQ')
for page in ['live.html','live-following.html','live-login.html','live-game.html','live-score.html','live-team-insights.html','live-game-recap.html','live-tournament.html']:
    html=(ROOT/page).read_text()
    req(('manifest.webmanifest?v=7.64.18' in html or 'manifest.webmanifest?v=7.64.19' in html),f'{page} missing current manifest')
    req(any(v in html for v in ('live-pwa-v7-64-18.js?v=7.64.18','live-pwa-v7-64-19.js?v=7.64.19','live-pwa-v7-64-22.js?v=7.64.22')),f'{page} missing current PWA runtime')
    req(('wphq-apple-touch-180.png?v=7.64.18' in html or 'wphq-apple-touch-180.png?v=7.64.19' in html),f'{page} missing WPHQ Apple icon')
req('Water Polo HQ on iPhone or iPad' in pwa,'PWA runtime missing Water Polo HQ iOS instructions')
req(('sw-v7-64-18.js' in pwa or (ROOT/'js/live-pwa-v7-64-19.js').exists()),'PWA runtime successor missing')
for token in ['./css/wphq-brand-v7-64-18.css?v=7.64.18','./assets/branding/wphq-logo-full.png?v=7.64.19','./assets/app-icons/wphq-app-512.png?v=7.64.19']:
    req(token in sw,f'service worker must precache {token}')
req('supabase.co' not in sw.lower(),'service worker must not proxy/cache Supabase')
print('Water Polo HQ 7.64.18 Brand Foundation checks passed.')
