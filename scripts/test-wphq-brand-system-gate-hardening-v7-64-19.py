from pathlib import Path
from PIL import Image
import hashlib, json, re
ROOT=Path(__file__).resolve().parents[1]
site=json.loads((ROOT/'config/site-release.json').read_text())
version=(ROOT/'VERSION.md').read_text()
shell=(ROOT/'js/site-shell.js').read_text()
pwa=(ROOT/'js/live-pwa-v7-64-19.js').read_text()
sw=(ROOT/'sw-v7-64-19.js').read_text()
def req(c,m):
    if not c: raise AssertionError(m)
def semver_at_least(value, floor):
    def parts(v): return tuple(int(x) for x in str(v).split('.')[:3])
    return parts(value) >= parts(floor)
req('# WPI 7.64.19 — Water Polo HQ Brand System & Release Gate Hardening' in version,'7.64.19 history block missing from VERSION.md')
req(semver_at_least(site.get('version'),'7.64.19'),'site release must preserve 7.64.19 or later')
req(site.get('consumerBrand')=='Water Polo HQ','consumer brand changed')
req(site.get('rankingMethodologyBrand')=='Water Polo Index','ranking methodology identity changed')
req(site.get('wphqBrandSystemRelease')=='7.64.19','brand system marker missing')
req(site.get('releaseGateHardeningRelease')=='7.64.19','gate hardening marker missing')
full=ROOT/'assets/branding/wphq-logo-full.png'; mark=ROOT/'assets/branding/wphq-logo-mark.png'
for p in (full,mark): req(p.exists() and p.stat().st_size>10000,f'missing production logo {p.name}')
with Image.open(full) as im:
    req(im.mode=='RGBA','full logo must preserve transparency')
    req(im.width>=1000 and im.width/im.height>2.0,'full logo must be production-scale horizontal artwork')
with Image.open(mark) as im:
    req(im.size==(512,512),'brand mark must be 512 square')
# Approved corrected art should continue to be used in the site, not the superseded hand-drawn SVG path.
logo_key_ok = bool(re.search(r'wphq-logo-full\.png\?v=7\.64\.(?:19|2[01])', shell))
req(logo_key_ok,'shell must use approved production PNG with a current cache key')
for rel,size in {'wphq-apple-touch-180.png':(180,180),'wphq-app-192.png':(192,192),'wphq-app-512.png':(512,512),'wphq-app-maskable-512.png':(512,512)}.items():
    with Image.open(ROOT/'assets/app-icons'/rel) as im: req(im.size==size,f'wrong icon size {rel}')
req('sw-v7-64-19.js' in pwa,'PWA must register current service worker')
req('wphq-live-shell-v7-64-19' in sw,'service worker cache must be current')
req('wphq-logo-full.png?v=7.64.19' in sw,'service worker must cache corrected logo')
# Recurring gates: validate that the three known offenders no longer enumerate current site versions manually.
brand_gate=(ROOT/'scripts/test-brand-teams-section-landing-v7-53-4.py').read_text()
public_gate=(ROOT/'scripts/test-live-public-game-publishing-v7-62-4.py').read_text()
logo_gate=(ROOT/'scripts/test-team-directory-logos-v7-53-6.js').read_text()
req("semver_at_least(site.get('version'),'7.54.18')" in brand_gate,'brand gate is not future tolerant')
req('PATCH_MANIFEST_' in brand_gate and "continue" in brand_gate,'release manifests must be excluded from public-brand scan')
req('semver_at_least(site.get("version"), "7.62.4")' in public_gate,'public publishing gate is not future tolerant')
req("brand=site.get('consumerBrand')" in public_gate,'public publishing gate must derive current consumer brand')
req("semverAtLeast(site.version,'7.53.7')" in logo_gate,'team-logo gate is not future tolerant')
print('Water Polo HQ 7.64.19 Brand System & Release Gate Hardening checks passed.')
