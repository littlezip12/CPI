#!/usr/bin/env python3
from pathlib import Path
import hashlib,json,re
ROOT=Path(__file__).resolve().parents[1]
def read(path): return (ROOT/path).read_text(encoding='utf-8')
def sha(path): return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
def req(cond,msg):
    if not cond: raise AssertionError(msg)

site=json.loads(read('config/site-release.json'))
directory=json.loads(read('data/live/team-identity-directory-v7-60-2.json'))
index=json.loads(read('data/live/tournament-schedule-index.json'))
html=read('live-team-identity.html')
js=read('js/live-team-identity-v7-60-2.js')
dash=read('live-dashboard.html')
dashjs=read('js/live-dashboard-v7-62-0.js' if (ROOT/'js/live-dashboard-v7-62-0.js').exists() else ('js/live-dashboard-v7-61-1.js' if (ROOT/'js/live-dashboard-v7-61-1.js').exists() else 'js/live-dashboard-v7-60-2.js'))
sql=read('supabase/migrations/202608140004_team_directory_identity_management.sql')
css=read('css/live-team-identity-v7-60-2.css')

req(any(v in read('VERSION.md') for v in ('7.60.2','7.60.3','7.61.0','7.61.1','7.62.0','7.62.1','7.62.2','7.62.3','7.62.4','7.62.5','7.62.6','7.63.0','7.63.1','7.63.2','7.63.3','7.63.4','7.63.5','7.63.6','7.63.7')),'VERSION mismatch')
req(site.get('version') in {'7.60.2','7.60.3','7.61.0','7.61.1','7.62.0','7.62.1','7.62.2','7.62.3','7.62.4','7.62.5','7.62.6','7.63.0','7.63.1','7.63.2','7.63.3','7.63.4','7.63.5','7.63.6','7.63.7'},'release metadata version mismatch')
for key in ('liveScoringTeamDirectoryIdentityRelease','liveScoringTeamFamilyIdentityRelease','liveScoringIdentityAliasRelease','liveScoringIdentityReconciliationRelease','liveScoringPersistentOpponentAliasRelease'):
    req(site.get(key)=='7.60.2',f'missing 7.60.2 marker: {key}')
for key in ('liveScoringSelfServiceClubOnboardingRelease','liveScoringClubClaimReviewRelease','liveScoringFirstTeamProvisioningRelease'):
    req(site.get(key)=='7.60.1',f'7.60.1 onboarding marker changed: {key}')
for key in ('liveScoringClubBrandingPlatformRelease','liveScoringThemeRegistryRelease'):
    req(site.get(key)=='7.60.0',f'7.60.0 branding marker changed: {key}')

req(directory.get('release')=='7.60.2','identity directory release mismatch')
req(directory.get('counts')=={'clubs':182,'teams':724,'families':724},'canonical identity directory counts changed')
req(directory.get('policy')=='stable_family_key_plus_season_specific_team_id','stable family policy missing')
lamo=[r for r in directory.get('teams',[]) if r.get('clubId')=='club-lamorinda' and r.get('ageGroup')=='14U' and r.get('gender')=='Boys' and r.get('level')=='A']
req(len(lamo)==1 and lamo[0].get('familyKey')=='club-lamorinda|14U|Boys|A','Lamorinda 14U Boys A family key mismatch')
req(lamo[0].get('canonicalTeamId')=='team-2026-14u-boys-lamorinda-a','season-specific public team identity changed')

for token in ('Directory &amp; identity management','Team-family links','Club identity aliases','Unresolved opponents','Search 724 public team identities','stable <em>team family</em>'):
    req(token in html,f'identity page contract missing: {token}')
req('js/live-team-identity-v7-60-2.js?v=7.60.2' in html,'identity page script missing')
req('live-team-identity.html' in dash,'dashboard must expose Team identity entry')
req(any(x in dash for x in ('js/live-dashboard-v7-60-2.js?v=7.60.2','js/live-dashboard-v7-60-3.js?v=7.60.3','js/live-dashboard-v7-61-0.js','js/live-dashboard-v7-61-1.js?v=7.61.1','js/live-dashboard-v7-62-0.js?v=7.62.0')),'dashboard must preserve identity-aware controller')
req('grid-template-columns' in css and '@media(max-width:560px)' in css,'identity page must remain responsive')

for token in ('live_club_identity_context_v1','live_set_team_identity_family_v1','live_clear_team_identity_family_v1','live_upsert_identity_alias_v1','live_remove_identity_alias_v1','live_resolve_manual_opponent_v1','live_identity_aliases_for_club_v1'):
    req(token in sql,f'identity SQL contract missing: {token}')
for token in ('canonical_wpi_team_family_key','identity_link_status','create table if not exists public.live_identity_aliases','create table if not exists public.live_identity_audit'):
    req(token in sql,f'identity storage contract missing: {token}')
req("identity_link_status in ('unlinked','family_linked','exact_verified')" in sql,'identity link status safety missing')
req("using (false) with check (false)" in sql,'identity tables must deny broad direct authenticated writes')
req("Team family must belong to this club canonical identity" in sql,'cross-club family-link safety missing')
req("Team family age group does not match Live team" in sql and "Team family gender does not match Live team" in sql,'team-family age/gender safety missing')
req("identity_link_status=case when canonical_wpi_team_id is not null then 'exact_verified' else 'family_linked' end" in sql,'family link must not invent exact public identity')
# The family-link action must never assign the season-specific exact public ID.
family_fn=sql.split('create or replace function public.live_set_team_identity_family_v1',1)[1].split('create or replace function public.live_clear_team_identity_family_v1',1)[0]
req('canonical_wpi_team_id=' not in family_fn,'family-link function must not write canonical_wpi_team_id')
req("source='manual_opponent_resolution'" in sql and "aliasSaved',true" in sql,'manual opponent resolution must save a reusable alias')

for token in ('familyCandidates','live_set_team_identity_family_v1','live_upsert_identity_alias_v1','live_remove_identity_alias_v1','live_resolve_manual_opponent_v1'):
    req(token in js,f'identity UI workflow missing: {token}')
req('Choose a <strong>Club</strong> when the exact current-season team is uncertain' in html,'identity uncertainty copy missing')
for forbidden in ('.from("live_teams")','.from(\'live_teams\')','service_role','supabaseService'):
    req(forbidden not in js,f'identity browser must use reviewed RPCs: {forbidden}')

for token in ('persistentIdentityAliases','resolvePersistentIdentityAlias','live_identity_aliases_for_club_v1','matchType:"club_saved_alias"'):
    req(token in dashjs,f'dashboard persistent alias bridge missing: {token}')
# Explicit saved aliases must be checked before broad static heuristics.
resolver=dashjs.split('function resolveGameDayTeamIdentity(name)',1)[1].split('function catalogTeamMatch',1)[0]
req('const savedAlias = resolvePersistentIdentityAlias(name);' in resolver and 'if (savedAlias) return savedAlias;' in resolver,'saved explicit aliases must take precedence')

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
 'js/live-club-onboarding-v7-60-1.js':'2a60cfee1b4231ec221ce089a13fb3da0f2726fac2d1021e311c72e4dbdd2cff',
 'js/live-login-v7-60-1.js':'6cf7e8f746dbd6881d9939a787202024c62f3f03b716dd50481329bb648acb6c',
}
for path,digest in protected.items(): req(sha(path)==digest,f'protected foundation changed: {path}')
req(index.get('release') in {'7.60.2','7.60.3','7.61.0'},'schedule index release marker mismatch')
req(index.get('counts')=={'events':0,'games':0},'identity release must not fabricate current-season schedule data')
print('WPI LIVE 7.60.2 TEAM DIRECTORY & IDENTITY MANAGEMENT PASSED')
print(' - 182 clubs / 724 public team identities remain canonical')
print(' - Live teams link to stable family keys without inventing exact season-specific public IDs')
print(' - explicit aliases are club-scoped, audited, removable, and reusable in future game setup')
print(' - manual opponent resolution preserves raw labels and now saves the explicit alias')
print(' - protected scoring, GroupMe, recovery, onboarding and branding foundations remain byte-stable')
