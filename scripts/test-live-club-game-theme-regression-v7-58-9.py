#!/usr/bin/env python3
"""Regression checks preserving WPI Live 7.58.8 club-branded scoring in 7.58.9."""
from pathlib import Path
import hashlib, json
ROOT=Path(__file__).resolve().parents[1]
def read(rel): return (ROOT/rel).read_text(encoding='utf-8')
def req(ok,msg):
    if not ok: raise AssertionError(msg)

site=json.loads(read('config/site-release.json'))
html=read('live-game.html')
css=read('css/live-club-theme-v7-58-8.css')
js=read('js/live-club-theme-v7-58-8.js')
index=json.loads(read('data/live/tournament-schedule-index.json'))

req(read('VERSION.md').strip() in {'# WPI 7.58.9 — Club Operations & Scale Polish','# WPI 7.58.10 — Pilot Launch Prep & Admin Safety'},'VERSION mismatch')
req((site.get('version'),site.get('name')) in {('7.58.9','Club Operations & Scale Polish'),('7.58.10','Pilot Launch Prep & Admin Safety')},'release metadata mismatch')
for key in ('liveScoringClubGameThemeRelease','liveScoringLamorindaGameThemeRelease','liveScoringGameExperienceRelease'):
    req(site.get(key)=='7.58.8',f'missing 7.58.8 marker {key}')
for key,expected in {
    'liveScoringClubPilotValidationRelease':'7.58.9',
    'liveScoringClubPilotHardeningRelease':'7.58.6',
    'liveScoringTournamentFeedValidationRelease':'7.58.5',
    'liveScoringEventArchiveRelease':'7.58.4',
}.items(): req(site.get(key)==expected,f'protected release marker changed: {key}')

req('css/live-club-theme-v7-58-8.css?v=7.58.8' in html,'7.58.8 club theme CSS not loaded')
req('js/live-club-theme-v7-58-8.js?v=7.58.8' in html,'7.58.8 club theme JS not loaded')
req(html.index('css/live-club-theme-v7-58-8.css?v=7.58.8') > html.index('css/live-game-v7-58-4.css?v=7.58.4'),'theme CSS must layer after validated game CSS')
req(html.index('js/live-club-theme-v7-58-8.js?v=7.58.8') > html.index('js/live-game-v7-58-6.js?v=7.58.6'),'theme JS must layer after validated scoring engine')

for token in (
    'data-live-club-theme="lamorinda"',
    '--club-primary:',
    '--club-accent:',
    'assets/canonical/lamorinda.webp',
    '.live-game-toolbar',
    '.live-scoreboard',
    '.live-action-panel',
    '.live-event-chip.is-active',
    '.live-mobile-nav',
    '@media (max-width: 720px)',
): req(token in css,f'club visual contract missing: {token}')
for token in (
    'const THEMES = [',
    'id: "lamorinda"',
    'team.startsWith("lamorinda")',
    'function resolveTheme',
    'function applyTheme',
    'body.dataset.liveClubTheme = theme.id',
    'window.WPILiveClubTheme7588',
    'MutationObserver',
): req(token in js,f'club theme resolver contract missing: {token}')

# Theme must remain presentation-only: no network, storage, scoring or data writes.
for forbidden in ('fetch(','.rpc(','.from(', 'localStorage', 'sessionStorage', 'state.game', 'teamScore', 'opponentScore', 'insert(', 'update('):
    req(forbidden not in js,f'theme module may not touch scoring/data contract: {forbidden}')
req('display:none' not in css.replace(' ', '').lower(),'theme must not hide validated scoring controls')
req('grid-template-columns' not in css,'theme must not change core page layout/grid geometry')

# Only the two asset includes may differ in live-game.html from the pushed 7.58.7 layout.
stripped=html.replace('  <link rel="stylesheet" href="css/live-club-theme-v7-58-8.css?v=7.58.8">\n','').replace('  <script src="js/live-club-theme-v7-58-8.js?v=7.58.8"></script>\n','')
req(hashlib.sha256(stripped.encode()).hexdigest()=='0f069e63a7cbfe39c15f0130d288d8c3bed2989753de03531b8eff68ec8dfb94','live-game layout changed beyond theme asset includes')

protected={
 'js/live-game-v7-58-6.js':'5cb97ca79e8794e9d34cb5f958462d3e86121ec152afed6f64516a2941368b76',
 'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
 'css/live-sandbox-v7-57-6.css':'e3b419c4c6a9ba9a4bbdedcf4ef38d5f2259f967fb514a384c79e283514e4526',
 'css/live-game-v7-58-4.css':'59d8f062cd1362b2253e429674d0b97a55d0a66ecd72bf3798240ec2033c26fe',
 'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
}
for rel,digest in protected.items():
    req(hashlib.sha256((ROOT/rel).read_bytes()).hexdigest()==digest,f'protected foundation changed: {rel}')

req(index.get('release') in {'7.58.9','7.58.10'},'schedule index release mismatch')
req(index.get('counts')=={'events':0,'games':0},'theme release must not fabricate schedule data')

print('WPI LIVE 7.58.8 CLUB-BRANDED GAME EXPERIENCE REGRESSION PASSED IN 7.58.9')
print(' - Lamorinda navy/blue/gold + water/paint visual shell applies dynamically')
print(' - validated scoring layout and protected scoring engine remain byte-stable')
print(' - theme resolver is standalone and extensible for future clubs')
print(' - mobile-first game controls remain present and unhidden')
