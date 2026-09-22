from pathlib import Path
from PIL import Image
import json

ROOT=Path(__file__).resolve().parents[1]
site=json.loads((ROOT/'config/site-release.json').read_text())
manifest=json.loads((ROOT/'manifest.webmanifest').read_text())
sw=(ROOT/'sw-v7-64-17.js').read_text()
pwa=(ROOT/'js/live-pwa-v7-64-17.js').read_text()
version=(ROOT/'VERSION.md').read_text()

def req(cond,msg):
    if not cond: raise AssertionError(msg)

req(version.startswith('# WPI 7.64.17 — Installable App Experience'),'version mismatch')
req(site.get('version')=='7.64.17','site release mismatch')
for key in ['livePwaRelease','liveInstallableAppRelease','liveOfflineShellRelease']:
    req(site.get(key)=='7.64.17',f'{key} marker missing')
req(manifest.get('display')=='standalone','manifest must launch standalone')
req(manifest.get('start_url','').startswith('./live-following.html'),'installed app must launch into My Teams')
req(manifest.get('scope')=='./','manifest scope must preserve WPI deep links')
req(manifest.get('theme_color')=='#071426','manifest theme must use WPI navy')

expected_icons={
 'assets/app-icons/wpi-apple-touch-180.png':(180,180),
 'assets/app-icons/wpi-app-192.png':(192,192),
 'assets/app-icons/wpi-app-512.png':(512,512),
 'assets/app-icons/wpi-app-maskable-512.png':(512,512),
}
for rel,size in expected_icons.items():
    p=ROOT/rel
    req(p.exists(),f'missing app icon {rel}')
    with Image.open(p) as im: req(im.size==size,f'wrong icon dimensions for {rel}')

for page in ['live.html','live-following.html','live-login.html','live-game.html','live-score.html','live-team-insights.html','live-game-recap.html','live-tournament.html']:
    html=(ROOT/page).read_text()
    req('manifest.webmanifest?v=7.64.17' in html,f'{page} missing manifest')
    req('live-pwa-v7-64-17.js?v=7.64.17' in html,f'{page} missing PWA registration')
    req('apple-touch-icon' in html,f'{page} missing Apple Home Screen icon')

req('data-wpi-install-app' in (ROOT/'live.html').read_text(),'Live page needs Install WPI action')
req('live-pwa-v7-64-17.css?v=7.64.17' in (ROOT/'live.html').read_text(),'Live page missing install-action styling')
req((ROOT/'css/live-pwa-v7-64-17.css').exists(),'PWA install-action stylesheet missing')
req('data-wpi-install-app' in (ROOT/'live-following.html').read_text(),'My Teams needs Install WPI action')
for token in ['beforeinstallprompt','navigator.serviceWorker.register','display-mode: standalone','Add to Home Screen']:
    req(token in pwa,f'PWA install runtime missing {token}')
for token in ['request.method !== "GET"','url.origin !== self.location.origin','request.mode === "navigate"','await fetch(request)','offline.html']:
    req(token in sw,f'service worker safety missing {token}')
req('supabase.co' not in sw.lower(),'service worker must not explicitly cache/proxy Supabase')
req((ROOT/'offline.html').exists(),'offline shell missing')
offline=(ROOT/'offline.html').read_text()
for token in ['css/site-shell.css?v=7.54.13','js/site-shell.js?v=7.62.3','css/command-palette.css?v=7.53.4','js/command-palette.js?v=7.62.2']:
    req(offline.count(token)==1,f'offline shell missing shared WPI shell asset {token}')
for token in ['./css/site-shell.css?v=7.54.13','./css/command-palette.css?v=7.53.4','./js/site-shell.js?v=7.62.3','./js/command-palette.js?v=7.62.2','./assets/branding/wpi-logo-mark.png','./assets/branding/wpi-logo-full.png']:
    req(token in sw,f'service worker must precache offline shell asset {token}')
print('WPI Live 7.64.17 Installable App Experience checks passed.')
