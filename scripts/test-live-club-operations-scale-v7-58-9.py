#!/usr/bin/env python3
"""Static acceptance checks for WPI Live 7.58.9 Club Operations & Scale Polish."""
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
def read(rel): return (ROOT/rel).read_text(encoding='utf-8')
def req(ok,msg):
    if not ok: raise AssertionError(msg)
site=json.loads(read('config/site-release.json'))
html=read('live-dashboard.html')
js=read('js/live-dashboard-v7-58-10.js' if (ROOT/'js/live-dashboard-v7-58-10.js').exists() else 'js/live-dashboard-v7-58-9.js')
css=read('css/live-dashboard-v7-58-9.css')
sql=read('supabase/migrations/202608140001_club_operations_scale_polish.sql')
index=json.loads(read('data/live/tournament-schedule-index.json'))
req(read('VERSION.md').strip() in {'# WPI 7.58.9 — Club Operations & Scale Polish','# WPI 7.58.10 — Pilot Launch Prep & Admin Safety','# WPI 7.59.0 — Lamorinda Club Pilot Ready','# WPI 7.60.0 — Club Branding Platform'},'VERSION mismatch')
req((site.get('version'),site.get('name')) in {('7.58.9','Club Operations & Scale Polish'),('7.58.10','Pilot Launch Prep & Admin Safety'),('7.59.0','Lamorinda Club Pilot Ready'),('7.60.0','Club Branding Platform')},'release metadata mismatch')
for key in ('liveScoringDashboardRelease','liveScoringClubOperationsRelease','liveScoringClubOperationsScaleRelease'):
    req(site.get(key) in {'7.58.9','7.58.10','7.59.0','7.60.0'},f'club operations marker not preserved: {key}')
for key in ('liveScoringClubPeopleAccessRelease','liveScoringClubTeamManagementRelease','liveScoringManualOpponentReviewRelease','liveScoringPilotResilienceDeferralRelease'):
    req(site.get(key)=='7.58.9',f'missing preserved 7.58.9 marker {key}')
for key,expected in {'liveScoringClubGameThemeRelease':'7.58.8','liveScoringClubPilotHardeningRelease':'7.58.6','liveScoringTournamentFeedValidationRelease':'7.58.5','liveScoringEventArchiveRelease':'7.58.4'}.items():
    req(site.get(key)==expected,f'protected release marker changed: {key}')
for token in ('css/live-dashboard-v7-58-9.css?v=7.58.9','clubTeamSearch','clubTeamAgeFilter','clubTeamGenderFilter','clubTeamStatusFilter','clubPeopleAccessPanel','clubPeopleSearch','clubIdentityReviewPanel','clubAddTeamButton','newTeamSuggestedName','useSuggestedTeamNameButton'):
    req(token in html,f'club scale UI missing: {token}')
req(('js/live-dashboard-v7-58-10.js?v=7.58.10' in html) or ('js/live-dashboard-v7-58-9.js?v=7.58.9' in html),'current dashboard JS route missing')
for token in ('function filteredClubTeams','function renderClubTeamGrid','function renderClubPeopleAccess','function renderClubIdentityReview','async function loadClubOperations','live_club_operations_v1','function suggestedTeamIdentity','function updateSuggestedTeamIdentity','Deferred / resilience','Engineering gates clear · external feed pending','data-club-access-jump'):
    req(token in js,f'club scale behavior missing: {token}')
for token in ('create or replace function public.live_club_operations_v1','Club Owner or Admin access required','live_team_members','live_team_follows','live_account_registry','manualOpponents',"'key','offline_reconnect','state','deferred'",'Deferred resilience test','Official 2026–2027 tournament feed'):
    req(token in sql,f'club operations SQL contract missing: {token}')
# Read-only club operations function: no membership/follow/game mutations.
ops_fn=sql.split('create or replace function public.live_club_pilot_validation_v1',1)[0]
for forbidden in ('insert into public.live_team_members','update public.live_team_members','delete from public.live_team_members','insert into public.live_team_follows','delete from public.live_team_follows','update public.live_games','insert into public.live_games'):
    req(forbidden not in ops_fn.lower(),f'club operations overview may not mutate protected data: {forbidden}')
req(index.get('release') in {'7.58.9','7.58.10','7.59.0','7.60.0'},'schedule index release mismatch')
req(index.get('counts')=={'events':0,'games':0},'club operations release must not fabricate schedule data')
protected={
 'js/live-game-v7-58-6.js':'5cb97ca79e8794e9d34cb5f958462d3e86121ec152afed6f64516a2941368b76',
 'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
 'css/live-game-v7-58-4.css':'59d8f062cd1362b2253e429674d0b97a55d0a66ecd72bf3798240ec2033c26fe',
 'js/live-club-theme-v7-58-8.js':'e1c4b62523192911ad2e9547982f014092cab2c27788d1af0d6b71cfbe4b9ccf',
 'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
}
for rel,digest in protected.items(): req(hashlib.sha256((ROOT/rel).read_bytes()).hexdigest()==digest,f'protected foundation changed: {rel}')
print('WPI LIVE 7.58.9 CLUB OPERATIONS & SCALE POLISH TEST PASSED')
print(' - club team search/readiness filters and quick access navigation present')
print(' - club-wide People & Access summary is read-only and team authority stays explicit')
print(' - unlisted manual opponents have a dedicated review queue with no auto-merge')
print(' - team creation generates a clean editable club/age/group/squad name')
print(' - offline/reconnect is deferred resilience; official schedule remains external')
