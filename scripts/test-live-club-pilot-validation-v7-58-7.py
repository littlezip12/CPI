#!/usr/bin/env python3
"""Static acceptance checks for WPI Live 7.58.7 Club Pilot Validation & Observability."""
from pathlib import Path
import hashlib, json
ROOT=Path(__file__).resolve().parents[1]
def read(rel): return (ROOT/rel).read_text(encoding='utf-8')
def req(ok,msg):
    if not ok: raise AssertionError(msg)

site=json.loads(read('config/site-release.json'))
html=read('live-dashboard.html')
js=read('js/live-dashboard-v7-58-7.js')
css=read('css/live-dashboard-v7-58-7.css')
sql=read('supabase/migrations/202608130004_club_pilot_validation_observability.sql')
index=json.loads(read('data/live/tournament-schedule-index.json'))

req(read('VERSION.md').strip()=='# WPI 7.58.7 — Club Pilot Validation & Observability','VERSION mismatch')
req(site.get('version')=='7.58.7' and site.get('name')=='Club Pilot Validation & Observability','release metadata mismatch')
for key in ('liveScoringClubPilotValidationRelease','liveScoringClubPilotObservabilityRelease','liveScoringPilotEvidenceRelease','liveScoringDashboardRelease'):
    req(site.get(key)=='7.58.7',f'missing 7.58.7 marker {key}')
for key,expected in {
    'liveScoringClubPilotHardeningRelease':'7.58.6',
    'liveScoringTournamentFeedValidationRelease':'7.58.5',
    'liveScoringEventArchiveRelease':'7.58.4',
    'liveScoringMultiTeamAccessFollowingRelease':'7.58.3',
    'liveScoringRosterVersioningRelease':'7.58.2',
}.items(): req(site.get(key)==expected,f'protected release marker changed: {key}')

req('css/live-dashboard-v7-58-7.css?v=7.58.7' in html,'7.58.7 dashboard CSS not loaded')
req('js/live-dashboard-v7-58-7.js?v=7.58.7' in html,'7.58.7 dashboard JS not loaded')
for token in ('id="clubPilotValidationPanel"','id="clubPilotGateList"','id="clubPilotTeamRoutes"','id="clubPilotManualOpponents"','id="refreshClubPilotValidationButton"'):
    req(token in html,f'pilot validation UI mount missing: {token}')
for token in ('function renderClubPilotValidation','function loadClubPilotValidation','live_club_pilot_validation_v1','Next proof:','Preserved raw · review later, never auto-merged'):
    req(token in js,f'pilot observability behavior missing: {token}')
for token in ('.live-club-pilot-validation','.live-pilot-gate-list','.live-pilot-route-row','.live-pilot-next-test'):
    req(token in css,f'pilot validation styling missing: {token}')

lower=sql.lower()
for token in (
    'create or replace function public.live_club_pilot_validation_v1(target_club_id uuid)',
    'security definer',
    "public.live_has_club_role(target_club_id,array['owner','admin']::public.live_club_role[])",
    'tstzrange(a.started_at',
    "audit.action='handoff_accepted'",
    'groupmeroutemismatchcount',
    'followmembershipoverlapcount',
    "'offline_reconnect','state','manual'",
    "'official_schedule','state',case when official_game_count>0 then 'observed' else 'external' end",
    "g.opponent_wpi_team_id is null",
    "g.opponent_wpi_club_id is null",
): req(token in lower,f'pilot evidence contract missing: {token}')

# Observability is read-only and may never manufacture the milestone or mutate access/game data.
for forbidden in ('insert into public.live_team_members','update public.live_team_members','delete from public.live_team_members','insert into public.live_team_follows','update public.live_games','delete from public.live_games','insert into public.live_games'):
    req(forbidden not in lower,f'observability migration must be read-only: {forbidden}')
req("'state','ready'" not in lower,'diagnostic function must not manufacture a ready state')
req('does not itself declare 7.59.0 ready' in lower,'milestone guardrail comment missing')

req(index.get('release')=='7.58.7','schedule index release mismatch')
req(index.get('activeCompetitiveSeason')=='2026-2027','active competitive season changed')
req(index.get('counts')=={'events':0,'games':0},'7.58.7 must not fabricate an official current-season schedule')
req((index.get('feedState') or {}).get('currentSeasonSchedulePublished') is False,'external tournament schedule gate must remain explicit')

protected={
 'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
 'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
 'supabase/functions/roster-extract/index.ts':'26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb',
 'supabase/migrations/202608120001_multi_team_access_following.sql':'7bb9460a5f148ebe6699eec56639fed05f08f1c3aa7b71bb4f8abfad78150a0d',
 'supabase/migrations/202608130001_event_archive_game_recaps.sql':'8fc0881a48b842cb15d5453c13d3283f2c9efee7e5e2f78f729300efbb4f2cfe',
}
for rel,digest in protected.items():
    req(hashlib.sha256((ROOT/rel).read_bytes()).hexdigest()==digest,f'protected foundation changed: {rel}')

print('WPI LIVE 7.58.7 CLUB PILOT VALIDATION & OBSERVABILITY TEST PASSED')
print(' - Owner/Admin gets read-only evidence for remaining Club Pilot gates')
print(' - concurrent games, handoff, GroupMe routing, Following isolation and multi-game events are derived from canonical records')
print(' - offline/reconnect remains an explicit real-device manual proof')
print(' - official schedule remains an external pending gate until a real 2026-2027 feed exists')
print(' - no test result can automatically declare 7.59.0 ready')
