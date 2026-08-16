#!/usr/bin/env python3
from pathlib import Path
import hashlib, json, re
ROOT=Path(__file__).resolve().parents[1]
def read(path): return (ROOT/path).read_text(encoding='utf-8')
def sha(path): return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
def req(cond,msg):
    if not cond: raise AssertionError(msg)

site=json.loads(read('config/site-release.json'))
registry=json.loads(read('data/live/club-theme-registry.json'))
overrides=json.loads(read('config/live-club-theme-overrides.json'))
html=read('live-club-onboarding.html')
js=read('js/live-club-onboarding-v7-60-1.js')
login=read('js/live-login-v7-60-1.js')
login_html=read('live-login.html')
dash=read('live-dashboard.html')
sql=read('supabase/migrations/202608140003_self_service_club_onboarding.sql')
css=read('css/live-club-onboarding-v7-60-1.css')

req(read('VERSION.md').strip() in {'# WPI 7.60.1 — Self-Service Club Onboarding','# WPI 7.60.2 — Team Directory & Identity Management','# WPI 7.60.3 — Public / Supporter Experience at Scale'},'VERSION mismatch')
req(site.get('version') in {'7.60.1','7.60.2','7.60.3','7.61.0','7.61.1'},'release metadata must preserve 7.60.1 or later')
for key in ('liveScoringSelfServiceClubOnboardingRelease','liveScoringClubClaimReviewRelease','liveScoringClubOnboardingAuthRelease','liveScoringFirstTeamProvisioningRelease'):
    req(site.get(key)=='7.60.1',f'missing 7.60.1 marker {key}')
for key in ('liveScoringClubBrandingPlatformRelease','liveScoringThemeRegistryRelease','liveScoringCanonicalClubBrandingRelease','liveScoringThemeActivationSafetyRelease'):
    req(site.get(key)=='7.60.0',f'7.60.0 branding foundation marker changed: {key}')

req(registry.get('counts',{}).get('canonicalClubs')==182,'canonical 182-club registry must remain available')
req(registry.get('counts',{}).get('liveEnabled')==1,'self-service onboarding must not auto-enable new themes')
req(overrides.get('enabledClubIds')==['club-lamorinda'],'Lamorinda must remain the only production-enabled theme')

for token in ('live-club-onboarding-v7-60-1.css?v=7.60.1','js/live-club-theme-registry-v7-60-0.js?v=7.60.0','js/live-club-onboarding-v7-60-1.js?v=7.60.1','Club not listed? Request a new/unlisted club','Platform Owner review'):
    req(token in html,f'onboarding page contract missing: {token}')
req('live-login.html?onboard=1' in html,'signed-out onboarding must route to dedicated onboarding auth')
req('live-club-onboarding.html' in dash,'dashboard must expose Club onboarding entry')
req(('js/live-login-v7-60-1.js?v=7.60.1' in login_html) or ('js/live-login-v7-60-3.js?v=7.60.3' in login_html),'login must use onboarding-aware auth entry')
req('Start club onboarding' in login_html,'login must expose club organizer entry')

for token in ('const onboarding = params.get("onboard") === "1"','signupAllowed = Boolean(onboarding || invite || registration.bootstrapAvailable)','live-club-onboarding.html','receives no team or club authority until the request is approved'):
    req(token in login,f'onboarding auth guard missing: {token}')
req('signupAllowed = Boolean(invite || registration.bootstrapAvailable)' not in login,'old invite-only-only gate must not remain in 7.60.1 auth file')

for token in ('live_club_onboarding_context_v1','live_submit_club_onboarding_request_v1','live_withdraw_club_onboarding_request_v1','live_review_club_onboarding_request_v1','request_then_platform_owner_review','live_is_platform_owner()'):
    req(token in sql,f'onboarding migration contract missing: {token}')
for token in ('create table if not exists public.live_club_onboarding_requests','status text not null default \'pending\'','create unique index if not exists live_club_onboarding_pending_canonical_idx'):
    req(token in sql,f'onboarding queue safety missing: {token}')
req("using (false)" in sql,'onboarding request table must have no broad direct authenticated read')
req("if not public.live_is_platform_owner() then raise exception 'Platform Owner access required'" in sql,'approval must be Platform-Owner-only')
req("if request_row.status <> 'pending'" in sql,'review must reject already-reviewed requests')
req("canonical_wpi_club_id=request_row.canonical_wpi_club_id" in sql,'approval must protect canonical duplicate claims')
for token in ('insert into public.live_clubs','insert into public.live_club_members','insert into public.live_teams','insert into public.live_team_members','insert into public.live_rosters'):
    req(token in sql,f'approval provisioning missing: {token}')
req("'brandingState','reviewed_activation_required'" in sql,'approval must keep branding activation separate')
req('live_account_registry_signup_source_check' in sql and "'club_onboarding'" in sql,'account registry must record onboarding-origin accounts')
req("public.live_account_registry.signup_source in ('owner_bootstrap','team_invite','club_onboarding')" in sql,'auth lifecycle updates must preserve club_onboarding attribution')
req(sql.count("A WPI Live workspace already uses that club name") >= 2,'unlisted onboarding must reject duplicate active club workspaces at submit and approval')

for token in ('candidateState','claimedCanonicalClubIds','pendingCanonicalClubIds','useUnlistedClub','live_submit_club_onboarding_request_v1','live_review_club_onboarding_request_v1','data-withdraw-request','data-review-request'):
    req(token in js,f'onboarding UI workflow missing: {token}')
for forbidden in ('.from("live_clubs")','.from(\'live_clubs\')','insert into','service_role','supabaseService'):
    req(forbidden not in js,f'browser onboarding must not bypass reviewed RPCs: {forbidden}')
req('grid-template-columns' in css and '@media(max-width:560px)' in css,'onboarding page must be responsive')

protected={
 'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
 'js/live-sandbox-v7-56-15.js':'f32236d8e704c113ba9b868b18ae2b97e7bb366e9adbefd37000117aea0fc6da',
 'js/live-game-v7-58-6.js':'5cb97ca79e8794e9d34cb5f958462d3e86121ec152afed6f64516a2941368b76',
 'js/live-game-storage-v7-58-6.js':'ded90608e0ef38249382e692774f59b41ab59712fb80bf96fe4a66ad05567353',
 'css/live-game-v7-58-4.css':'59d8f062cd1362b2253e429674d0b97a55d0a66ecd72bf3798240ec2033c26fe',
 'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
 'supabase/functions/roster-extract/index.ts':'26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb',
 'config/live-club-theme-overrides.json':'815ea307a1deb43a33145eb5c07f6e64b013db22f35f13d95f8e49bbe0862580',
 'js/live-club-theme-v7-60-0.js':'3c2189a44ca38a82945c7c4cad581fd040ed14fd55b8bc23d6487eebf9eeb1c8',
 'js/live-club-theme-registry-v7-60-0.js':'7c24c4d65731c05918e24a46dee8afc58ef070ec336197a5d6814f89a2b3268a',
}
for path,digest in protected.items(): req(sha(path)==digest,f'protected foundation changed: {path}')

index=json.loads(read('data/live/tournament-schedule-index.json'))
req(index.get('release') in {'7.60.1','7.60.2','7.60.3','7.61.0'},'schedule index release marker mismatch')
req(index.get('counts')=={'events':0,'games':0},'onboarding release must not fabricate current-season schedule data')
print('WPI LIVE 7.60.1 SELF-SERVICE CLUB ONBOARDING PASSED')
print(' - canonical club search + unlisted request path are available')
print(' - account creation for onboarding grants no existing club/team access')
print(' - requests create no authority before Platform Owner review')
print(' - approval provisions Club + first Team + empty roster + requester Owner access')
print(' - branding activation remains separately reviewed; Lamorinda is still the only enabled theme')
print(' - protected scoring, GroupMe, recovery and theme foundations remain byte-stable')
