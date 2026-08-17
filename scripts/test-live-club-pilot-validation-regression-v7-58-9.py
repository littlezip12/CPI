#!/usr/bin/env python3
"""Regression checks preserving Club Pilot observability under WPI Live 7.58.9."""
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
def read(rel): return (ROOT/rel).read_text(encoding='utf-8')
def req(ok,msg):
    if not ok: raise AssertionError(msg)
site=json.loads(read('config/site-release.json'))
html=read('live-dashboard.html')
js=read('js/live-dashboard-v7-58-10.js' if (ROOT/'js/live-dashboard-v7-58-10.js').exists() else 'js/live-dashboard-v7-58-9.js')
css7=read('css/live-dashboard-v7-58-7.css')
css9=read('css/live-dashboard-v7-58-9.css')
sql=read('supabase/migrations/202608140001_club_operations_scale_polish.sql')
index=json.loads(read('data/live/tournament-schedule-index.json'))
req(read('VERSION.md').strip() in {'# WPI 7.58.9 — Club Operations & Scale Polish','# WPI 7.58.10 — Pilot Launch Prep & Admin Safety','# WPI 7.59.0 — Lamorinda Club Pilot Ready','# WPI 7.60.0 — Club Branding Platform','# WPI 7.60.1 — Self-Service Club Onboarding','# WPI 7.60.2 — Team Directory & Identity Management','# WPI 7.60.3 — Public / Supporter Experience at Scale'},'current VERSION mismatch')
req(site.get('version') in {'7.58.9','7.58.10','7.59.0','7.60.0','7.60.1','7.60.2','7.60.3','7.61.0','7.61.1','7.62.0','7.62.1','7.62.2','7.62.3','7.62.4','7.62.5','7.62.6','7.63.0'},'current release must preserve 7.58.9 observability')
for key in ('liveScoringClubPilotValidationRelease','liveScoringClubPilotObservabilityRelease','liveScoringPilotEvidenceRelease'):
    req(site.get(key)=='7.58.9',f'missing preserved pilot marker {key}')
req(site.get('liveScoringDashboardRelease') in {'7.58.9','7.58.10','7.59.0','7.60.0','7.60.1','7.60.2','7.60.3','7.61.0'},'dashboard release must preserve pilot observability')
for key,expected in {'liveScoringClubPilotHardeningRelease':'7.58.6','liveScoringTournamentFeedValidationRelease':'7.58.5','liveScoringEventArchiveRelease':'7.58.4','liveScoringMultiTeamAccessFollowingRelease':'7.58.3','liveScoringRosterVersioningRelease':'7.58.2'}.items():
    req(site.get(key)==expected,f'protected release marker changed: {key}')
req('css/live-dashboard-v7-58-7.css?v=7.58.7' in html,'base pilot dashboard CSS not loaded')
req('css/live-dashboard-v7-58-9.css?v=7.58.9' in html,'7.58.9 dashboard delta CSS not loaded')
req((('js/live-dashboard-v7-60-3.js?v=7.60.3' in html or 'js/live-dashboard-v7-60-2.js?v=7.60.2' in html)) or ('js/live-dashboard-v7-58-10.js?v=7.58.10' in html) or ('js/live-dashboard-v7-58-9.js?v=7.58.9' in html),'current dashboard JS not loaded')
for token in ('id="clubPilotValidationPanel"','id="clubPilotGateList"','id="clubPilotTeamRoutes"','id="clubPilotManualOpponents"','id="refreshClubPilotValidationButton"'):
    req(token in html,f'pilot validation UI mount missing: {token}')
for token in ('function renderClubPilotValidation','function loadClubPilotValidation','live_club_pilot_validation_v1','Engineering gates clear · external feed pending','Deferred / resilience','Preserved raw · review later, never auto-merged'):
    req(token in js,f'pilot observability behavior missing: {token}')
for token in ('.live-club-pilot-validation','.live-pilot-gate-list','.live-pilot-route-row','.live-pilot-next-test'):
    req(token in css7,f'base pilot validation styling missing: {token}')
req('.live-pilot-gate[data-state="deferred"]' in css9,'deferred pilot styling missing')
lower=sql.lower()
for token in (
    'create or replace function public.live_club_pilot_validation_v1(target_club_id uuid)',
    'security definer',
    "public.live_has_club_role(target_club_id,array['owner','admin']::public.live_club_role[])",
    'tstzrange(a.started_at',
    "audit.action='handoff_accepted'",
    'groupmeroutemismatchcount',
    'followmembershipoverlapcount',
    "'offline_reconnect','state','deferred'",
    "'official_schedule','state',case when official_game_count>0 then 'observed' else 'external' end",
    'deferred resilience test',
    'g.opponent_wpi_team_id is null',
    'g.opponent_wpi_club_id is null',
): req(token in lower,f'pilot evidence contract missing: {token}')
for forbidden in ('insert into public.live_team_members','update public.live_team_members','delete from public.live_team_members','insert into public.live_team_follows','update public.live_games','delete from public.live_games','insert into public.live_games'):
    req(forbidden not in lower,f'observability migration must be read-only: {forbidden}')
req("'state','ready'" not in lower,'diagnostic function must not manufacture a ready state')
req('does not itself declare 7.59.0 ready' in lower,'milestone guardrail comment missing')
req(index.get('release') in {'7.58.9','7.58.10','7.59.0','7.60.0','7.60.1','7.60.2','7.60.3','7.61.0'},'schedule index release mismatch')
req(index.get('activeCompetitiveSeason')=='2026-2027','active competitive season changed')
req(index.get('counts')=={'events':0,'games':0},'current release must not fabricate an official current-season schedule')
req((index.get('feedState') or {}).get('currentSeasonSchedulePublished') is False,'external tournament schedule gate must remain explicit')
protected={
 'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
 'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
 'supabase/functions/roster-extract/index.ts':'26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb',
 'supabase/migrations/202608120001_multi_team_access_following.sql':'7bb9460a5f148ebe6699eec56639fed05f08f1c3aa7b71bb4f8abfad78150a0d',
 'supabase/migrations/202608130001_event_archive_game_recaps.sql':'8fc0881a48b842cb15d5453c13d3283f2c9efee7e5e2f78f729300efbb4f2cfe',
}
for rel,digest in protected.items(): req(hashlib.sha256((ROOT/rel).read_bytes()).hexdigest()==digest,f'protected foundation changed: {rel}')
print('WPI LIVE CLUB PILOT VALIDATION REGRESSION PASSED UNDER 7.58.9')
print(' - canonical pilot evidence remains read-only')
print(' - offline/reconnect is deferred resilience rather than a blocking proof')
print(' - official schedule remains an external dependency until a real 2026-2027 feed exists')
print(' - no test result can automatically declare 7.59.0 ready')
