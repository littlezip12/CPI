#!/usr/bin/env python3
from pathlib import Path
import json, subprocess, sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]
def req(c,m):
    if not c: errors.append(m)
def read(rel): return (ROOT/rel).read_text(encoding='utf-8')

def semver(v):
    try: return tuple(int(x) for x in str(v).split('.')[:3])
    except: return (0,0,0)

site=json.loads(read('config/site-release.json'))
pkg=json.loads(read('package.json'))
lock=json.loads(read('package-lock.json'))
req(site.get('version')=='7.64.38','site release must be 7.64.38')
req(pkg.get('version')=='7.64.38','package version must be 7.64.38')
req(lock.get('version')=='7.64.38' and lock.get('packages',{}).get('',{}).get('version')=='7.64.38','package-lock version must be 7.64.38')
for key in ['liveTeamInsightsMobileUxRelease','liveConsumerBrandCleanupRelease','liveAccountSecurityPolishRelease','livePasswordResetHardeningRelease']:
    req(site.get(key)=='7.64.38',f'{key} marker missing')
req(site.get('evanCousineau2026ScheduleRelease')=='7.64.36','ECC safe schedule baseline marker changed')
req(site.get('liveDeliveryFinalizationReliabilityRelease')=='7.64.31','7.64.31 reliability marker changed')
req(site.get('livePoolsideScoringThroughputRelease')=='7.64.32','7.64.32 scorer marker changed')

html=read('live-team-insights.html')
js=read('js/live-team-insights-v7-64-38.js')
css=read('css/live-team-insights-v7-64-38.css')
for token in [
    'live-team-insights-v7-64-38.css?v=7.64.38',
    'live-team-insights-v7-64-38.js?v=7.64.38',
    'id="playerPickerToggle"','id="playerPickerPanel"','id="playerPickerDone"',
    'id="insightsMobileMore"','id="insightsSecondaryActions"'
]: req(token in html,f'Team Insights missing {token}')
for token in [
    'function currentScopedSelectedPlayers()', 'function updatePlayerPickerSummary()',
    'function setPlayerPickerExpanded(', 'insights-mobile-compare-section',
    'index===0?" open":""', 'function bindMobileHeaderNav()',
    '$("organizationInsightsLink").hidden = access.analyticsLevel !== "organization_insights"',
    '$("teamInsightsCommercialLink").hidden = !isPlatformOwner',
    'rpc("live_team_player_insights_v2"', 'renderStableSeasonLeaders(playerScopeData?.players||[])'
]: req(token in js,f'Team Insights runtime missing {token}')
for token in [
    '.insights-player-picker-toggle{display:none', '.insights-player-picker-panel.is-open{display:block}',
    '.insights-player-picker{display:grid;grid-template-columns:1fr', '.insights-player-selected-cards{display:none}',
    '.insights-hero-secondary-actions.is-open{display:grid}', '.insights-mobile-more-toggle{display:block!important'
]: req(token in css,f'Team Insights CSS missing {token}')

# Consumer brand sweep is intentionally focused on supporter-facing surfaces, not internal WPI identifiers/contracts.
for rel in ['live-team-insights.html','live-event-recap.html','live-account-security.html','live-privacy.html','live-password-reset.html']:
    body=read(rel)
    req('WPI Live' not in body,f'{rel} still exposes WPI Live as consumer brand')
req('assets/branding/wphq-logo-mark.png' in read('live-event-recap.html'),'event recap still uses WPI logo mark')

reset_html=read('live-password-reset.html'); reset_js=read('js/live-password-reset-v7-64-38.js'); sec_js=read('js/live-account-security-v7-64-38.js')
req(reset_html.count('minlength="12"')==2,'password reset fields must both require 12 characters')
req('password.length < 12' in reset_js,'password reset runtime lacks 12-character guard')
req('friendlyName:"Water Polo HQ"' in sec_js,'MFA enrollment still uses legacy product label')
req('account-delete-v7-64-15' in sec_js,'account deletion function must remain unchanged')
security=read('WPHQ_7.64.38_SECURITY_READINESS.md')
for token in ['Confirm Email','Minimum password length','Leaked Password Protection','CAPTCHA/Turnstile','waterpolohq://auth/callback','Anonymous authentication','Row Level Security']:
    req(token in security,f'security readiness doc missing {token}')
req('No SQL needs to be copied into Supabase for 7.64.38.' in security,'security doc must clearly state no migration')

# Native bundle must inherit the same responsive/account surfaces.
build=subprocess.run([sys.executable,str(ROOT/'scripts/build-mobile-web-v7-64-28.py')],cwd=ROOT,text=True,capture_output=True)
if build.returncode:
    errors.append('mobile bundle build failed: '+(build.stdout+build.stderr).strip())
else:
    www=ROOT/'mobile/www'
    generated=read('mobile/www/live-team-insights.html')
    req('live-team-insights-v7-64-38.js?v=7.64.38' in generated,'native Team Insights missing 7.64.38 runtime')
    req((www/'js/live-team-insights-v7-64-38.js').exists(),'native bundle missing Team Insights runtime')
    req((www/'css/live-team-insights-v7-64-38.css').exists(),'native bundle missing Team Insights stylesheet')
    req('js/live-password-reset-v7-64-38.js?v=7.64.38' in read('mobile/www/live-password-reset.html'),'native password reset missing 7.64.38 runtime')

if errors:
    print('WPHQ 7.64.38 MOBILE PLAYER / SECURITY / BRAND TEST FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('WPHQ 7.64.38 MOBILE PLAYER / SECURITY / BRAND TEST PASSED')
print(' - mobile Player Stats uses one expandable up-to-four-player picker')
print(' - mobile comparison removes duplicate player cards and collapses detailed stat groups')
print(' - compact Team Insights mobile nav preserves role-gated Owner/platform actions')
print(' - supporter-facing account/results surfaces use Water Polo HQ branding')
print(' - password reset matches the 12-character signup minimum; MFA remains available')
print(' - no Supabase migration or Edge Function is required')
