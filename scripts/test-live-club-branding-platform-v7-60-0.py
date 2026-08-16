#!/usr/bin/env python3
from pathlib import Path
import hashlib, json
ROOT=Path(__file__).resolve().parents[1]
def read(path): return (ROOT/path).read_text(encoding='utf-8')
def sha(path): return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
def req(cond,msg):
    if not cond: raise AssertionError(msg)

site=json.loads(read('config/site-release.json'))
registry=json.loads(read('data/live/club-theme-registry.json'))
overrides=json.loads(read('config/live-club-theme-overrides.json'))
html=read('live-game.html')
css=read('css/live-club-theme-v7-60-0.css')
js=read('js/live-club-theme-v7-60-0.js')
builder=read('scripts/build-live-club-theme-registry-v7-60-0.py')

req(read('VERSION.md').strip() in {'# WPI 7.60.0 — Club Branding Platform','# WPI 7.60.1 — Self-Service Club Onboarding','# WPI 7.60.2 — Team Directory & Identity Management','# WPI 7.60.3 — Public / Supporter Experience at Scale'},'VERSION mismatch')
req(site.get('version') in {'7.60.0','7.60.1','7.60.2','7.60.3','7.61.0'},'release metadata mismatch')
for key in ('liveScoringClubBrandingPlatformRelease','liveScoringThemeRegistryRelease','liveScoringCanonicalClubBrandingRelease','liveScoringThemeActivationSafetyRelease'):
    req(site.get(key)=='7.60.0',f'missing 7.60.0 marker {key}')
req(site.get('liveScoringLamorindaPilotReadyRelease')=='7.59.0','7.59.0 pilot-ready milestone must remain historical')

req(registry.get('release')=='7.60.0','registry release mismatch')
req(registry.get('source')=='data/identity/clubs.json','registry must derive from canonical WPI identity')
req(registry.get('policy')=='canonical_identity_candidates_explicit_live_activation','activation policy mismatch')
req(registry.get('counts',{}).get('canonicalClubs')==182,'expected all 182 canonical WPI clubs in theme candidate registry')
req(registry.get('counts',{}).get('liveEnabled')==1,'7.60.0 should production-enable exactly one club theme')
rows={row['clubId']:row for row in registry.get('clubs',[])}
req('club-lamorinda' in rows and 'club-lamorinda-brentwood' in rows and 'club-680' in rows,'required identity examples missing')
lamo=rows['club-lamorinda']
brentwood=rows['club-lamorinda-brentwood']
req(lamo['liveEnabled'] is True,'Lamorinda must stay Live-enabled')
req(brentwood['liveEnabled'] is False,'Lamorinda Brentwood must stay distinct and not be auto-enabled')
req(rows['club-680']['liveEnabled'] is False,'other canonical clubs must not be auto-enabled')
req(lamo['theme']['primary']=='#082F61' and lamo['theme']['secondary']=='#0F4D92' and lamo['theme']['accent']=='#E0B83F','validated Lamorinda palette changed')
req('lamorinda.webp' in lamo['logo'],'Lamorinda logo missing')
req(overrides.get('enabledClubIds')==['club-lamorinda'],'activation must remain explicit in small reviewed config')

for token in ('data/identity/clubs.json','config/live-club-theme-overrides.json','liveEnabled','aliases.sort(key=len, reverse=True)','canonical_identity_candidates_explicit_live_activation'):
    req(token in builder,f'branding registry build contract missing: {token}')
for token in ('WPILiveClubThemeRegistry7600','identifyClub','resolveTheme','known-not-enabled','data-live-canonical-club-id','--club-logo-image','clearThemePresentation'):
    req(token in js,f'generic theme resolver contract missing: {token}')
for forbidden in ('fetch(','.rpc(','.from(', 'localStorage','sessionStorage','state.game','teamScore','opponentScore','insert(','update('):
    req(forbidden not in js,f'theme resolver may not touch scoring/data contract: {forbidden}')

req('css/live-club-theme-v7-60-0.css?v=7.60.0' in html,'generic theme CSS not loaded')
req('js/live-club-theme-registry-v7-60-0.js?v=7.60.0' in html,'theme registry not loaded')
req('js/live-club-theme-v7-60-0.js?v=7.60.0' in html,'generic theme resolver not loaded')
req(html.index('css/live-club-theme-v7-60-0.css?v=7.60.0') > html.index('css/live-game-v7-58-4.css?v=7.58.4'),'theme CSS must remain a presentation layer after validated game CSS')
req(html.index('js/live-club-theme-v7-60-0.js?v=7.60.0') > html.index('js/live-game-v7-58-6.js?v=7.58.6'),'theme JS must load after validated scoring engine')

for token in ('data-live-club-theme="active"','--club-primary-rgb','--club-secondary-rgb','--club-accent-rgb','var(--club-logo-image)','var(--club-short-label)','@media (max-width: 720px)'):
    req(token in css,f'generic CSS variable contract missing: {token}')
req('data-live-club-theme="lamorinda"' not in css,'7.60.0 stylesheet must not hard-code a Lamorinda selector')
req('assets/canonical/lamorinda.webp' not in css and 'assets/logos/canonical/lamorinda.webp' not in css,'club logo must come from registry, not CSS')
req('display:none' not in css.replace(' ', '').lower(),'theme must not hide validated scoring controls')
req('grid-template-columns' not in css,'theme must not change validated scoring layout geometry')

# Strip only the 7.60.0 presentation assets; the underlying scoring page markup must remain byte-equivalent to the validated 7.58.x layout.
stripped=html
for line in (
    '  <link rel="stylesheet" href="css/live-club-theme-v7-60-0.css?v=7.60.0">\n',
    '  <script src="js/live-club-theme-registry-v7-60-0.js?v=7.60.0"></script>\n',
    '  <script src="js/live-club-theme-v7-60-0.js?v=7.60.0"></script>\n',
    '  <script src="js/live-game-supporter-return-v7-60-3.js?v=7.60.3"></script>\n',
): stripped=stripped.replace(line,'')
req(hashlib.sha256(stripped.encode()).hexdigest()=='0f069e63a7cbfe39c15f0130d288d8c3bed2989753de03531b8eff68ec8dfb94','live-game layout changed beyond theme asset swap')

protected={
 'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
 'js/live-sandbox-v7-56-15.js':'f32236d8e704c113ba9b868b18ae2b97e7bb366e9adbefd37000117aea0fc6da',
 'js/live-game-v7-58-6.js':'5cb97ca79e8794e9d34cb5f958462d3e86121ec152afed6f64516a2941368b76',
 'js/live-game-storage-v7-58-6.js':'ded90608e0ef38249382e692774f59b41ab59712fb80bf96fe4a66ad05567353',
 'css/live-game-v7-58-4.css':'59d8f062cd1362b2253e429674d0b97a55d0a66ecd72bf3798240ec2033c26fe',
 'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
 'supabase/functions/roster-extract/index.ts':'26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb',
}
for path,digest in protected.items(): req(sha(path)==digest,f'protected foundation changed: {path}')

migrations=[p.name for p in (ROOT/'supabase/migrations').glob('*') if '7_60_0' in p.name.lower() or '7600' in p.name.lower()]
req(not migrations,'7.60.0 must not add a Supabase migration')
index=json.loads(read('data/live/tournament-schedule-index.json'))
req(index.get('release') in {'7.60.0','7.60.1','7.60.2','7.60.3','7.61.0'},'schedule index release marker mismatch')
req(index.get('counts')=={'events':0,'games':0},'branding release must not fabricate current-season schedule data')
print('WPI LIVE 7.60.0 CLUB BRANDING PLATFORM PASSED')
print(' - all canonical WPI clubs are available as branding candidates')
print(' - only Lamorinda is explicitly Live-enabled in this release')
print(' - Lamorinda Brentwood remains separate and does not inherit Lamorinda styling')
print(' - future clubs can be enabled by reviewed config without rewriting scoring CSS/layout')
print(' - protected scoring, GroupMe, recovery and roster foundations remain byte-stable')
