from pathlib import Path
from PIL import Image
import json

ROOT=Path(__file__).resolve().parents[1]
site=json.loads((ROOT/'config/site-release.json').read_text())
manifest=json.loads((ROOT/'manifest.webmanifest').read_text())
version=(ROOT/'VERSION.md').read_text()
shell=(ROOT/'js/site-shell.js').read_text()
brand_css=(ROOT/'css/wphq-brand-v7-64-18.css').read_text()
home=(ROOT/'index.html').read_text()
pwa=(ROOT/'js/live-pwa-v7-64-18.js').read_text()
sw=(ROOT/'sw-v7-64-18.js').read_text()

def req(cond,msg):
    if not cond: raise AssertionError(msg)

req(version.startswith('# WPI 7.64.18 — Water Polo HQ Brand Foundation'),'version mismatch')
req(site.get('version')=='7.64.18','site release mismatch')
req(site.get('consumerBrand')=='Water Polo HQ','consumer brand marker missing')
req(site.get('consumerShortName')=='WPHQ','consumer short name missing')
req(site.get('rankingMethodologyBrand')=='Water Polo Index','ranking methodology brand must remain Water Polo Index')
req(site.get('wphqBrandFoundationRelease')=='7.64.18','brand foundation marker missing')
for rel in ['assets/branding/wphq-logo-full.svg','assets/branding/wphq-logo-mark.svg','css/wphq-brand-v7-64-18.css','css/wphq-home-v7-64-18.css']:
    req((ROOT/rel).exists() and (ROOT/rel).stat().st_size>0,f'missing brand asset {rel}')
for rel,size in {
    'assets/app-icons/wphq-apple-touch-180.png':(180,180),
    'assets/app-icons/wphq-app-192.png':(192,192),
    'assets/app-icons/wphq-app-512.png':(512,512),
    'assets/app-icons/wphq-app-maskable-512.png':(512,512),
}.items():
    with Image.open(ROOT/rel) as im: req(im.size==size,f'wrong app icon size: {rel}')
for token in ['Water Polo HQ Home','assets/branding/wphq-logo-full.svg','label: "Live Scores"','label: "Teams & Clubs"','wphq-brand-v7-64-18.css?v=7.64.18']:
    req(token in shell,f'global shell missing {token}')
for token in ['background:rgba(255,255,255,.94)','--wphq-bg:#f5fbff','cpi-shell-footer']:
    req(token in brand_css,f'light brand system missing {token}')
for token in ['<title>Water Polo HQ | Scores, Rankings, Stats & Tournaments</title>','Water Polo HQ</p>','One water polo home.','wphq-home-v7-64-18.css?v=7.64.18']:
    req(token in home,f'homepage brand foundation missing {token}')
req(manifest.get('name')=='Water Polo HQ','PWA full name must be Water Polo HQ')
req(manifest.get('short_name')=='WPHQ','PWA short name must be WPHQ')
req(manifest.get('theme_color')=='#ffffff','PWA theme should match light shell')
for page in ['live.html','live-following.html','live-login.html','live-game.html','live-score.html','live-team-insights.html','live-game-recap.html','live-tournament.html']:
    html=(ROOT/page).read_text()
    req('manifest.webmanifest?v=7.64.18' in html,f'{page} missing current manifest')
    req('live-pwa-v7-64-18.js?v=7.64.18' in html,f'{page} missing current PWA runtime')
    req('wphq-apple-touch-180.png?v=7.64.18' in html,f'{page} missing WPHQ Apple icon')
for token in ['Water Polo HQ on iPhone or iPad','sw-v7-64-18.js']:
    req(token in pwa,f'PWA runtime missing {token}')
for token in ['./css/wphq-brand-v7-64-18.css?v=7.64.18','./assets/branding/wphq-logo-full.svg','./assets/app-icons/wphq-app-512.png']:
    req(token in sw,f'service worker must precache {token}')
req('supabase.co' not in sw.lower(),'service worker must not proxy/cache Supabase')
print('Water Polo HQ 7.64.18 Brand Foundation checks passed.')
