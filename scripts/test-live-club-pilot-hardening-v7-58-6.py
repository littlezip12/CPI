#!/usr/bin/env python3
"""Club-level concurrency/security/recovery acceptance checks for WPI Live 7.58.6."""
from pathlib import Path
import hashlib, json, re
ROOT=Path(__file__).resolve().parents[1]
def read(rel): return (ROOT/rel).read_text(encoding='utf-8')
def req(ok,msg):
    if not ok: raise AssertionError(msg)

site=json.loads(read('config/site-release.json'))
html=read('live-game.html')
game=read('js/live-game-v7-58-6.js')
storage=read('js/live-game-storage-v7-58-6.js')
handoff=read('supabase/migrations/202608050002_guest_scorer_handoff.sql')
backend_mig=read('supabase/migrations/202608040002_connected_live_backend.sql')
delivery=read('supabase/migrations/202608040003_groupme_delivery.sql')
following=read('supabase/migrations/202608120001_multi_team_access_following.sql')
archive=read('supabase/migrations/202608130001_event_archive_game_recaps.sql')
recovery=read('supabase/migrations/202608110002_final_recovery_permission_hotfix.sql')
feed=read('js/live-tournament-feed-v7-58-5.js')
index=json.loads(read('data/live/tournament-schedule-index.json'))

req(read('VERSION.md').strip() in {'# WPI 7.58.6 — Club-Level Pilot Hardening','# WPI 7.58.7 — Club Pilot Validation & Observability','# WPI 7.58.8 — Club-Branded Game Experience','# WPI 7.58.9 — Club Operations & Scale Polish','# WPI 7.58.10 — Pilot Launch Prep & Admin Safety','# WPI 7.59.0 — Lamorinda Club Pilot Ready','# WPI 7.60.0 — Club Branding Platform','# WPI 7.60.1 — Self-Service Club Onboarding','# WPI 7.60.2 — Team Directory & Identity Management','# WPI 7.60.3 — Public / Supporter Experience at Scale'},'VERSION mismatch')
req(site.get('version') in {'7.58.6','7.58.7','7.58.8','7.58.9','7.58.10','7.59.0','7.60.0','7.60.1','7.60.2','7.60.3','7.61.0','7.61.1','7.62.0','7.62.1','7.62.2','7.62.3','7.62.4','7.62.5','7.62.6','7.63.0','7.63.1'},'release metadata mismatch')
for key in ('liveScoringClubPilotHardeningRelease','liveScoringConcurrentGameIsolationRelease','liveScoringOfflineGameIsolationRelease','liveScoringClubRegressionRelease','liveScoringGameLocalStateRelease'):
    req(site.get(key)=='7.58.6',f'missing 7.58.6 marker {key}')
req(site.get('liveScoringTournamentFeedValidationRelease')=='7.58.5','7.58.5 tournament-feed marker changed')
req(site.get('liveScoringEventArchiveRelease')=='7.58.4','7.58.4 archive marker changed')

# Concurrent club games must not share one generic browser state key.
req('js/live-game-storage-v7-58-6.js?v=7.58.6' in html,'scoped storage helper not loaded')
req('js/live-game-v7-58-6.js?v=7.58.6' in html,'7.58.6 game controller not loaded')
for token in ('wpi-live-game-v7-58-6','gameKey','draftKey','routeScope','isDraftKey'):
    req(token in storage,f'game storage scoping missing: {token}')
for token in ('function scopedStateStorageKey','function persistLocalState','function clearLocalState','GameStorage?.gameKey','GameStorage?.draftKey'):
    req(token in game,f'game controller not using scoped storage: {token}')
req('localStorage.setItem(STORAGE_KEY' not in game,'legacy shared storage writes remain')
req('localStorage.removeItem(STORAGE_KEY' not in game,'legacy shared storage clear remains')
req('persistLocalState();' in game,'game state no longer persisted locally')

# Offline/reconnect/resume behavior remains intact, now on the game-scoped key.
for token in ('navigator.onLine === false','Offline · saved on this device','window.addEventListener("online"','scheduleRemoteSync(50)','visibilitychange','pageshow','restoreConnectedContinuity'):
    req(token in game,f'connectivity/recovery behavior missing: {token}')

# Server-side scorer authority is one active controller PER GAME, not globally.
for token in ('live_game_one_active_scorer_idx','on public.live_game_scorer_sessions(game_id)',
              'live_game_pending_scorer_pass_idx','on public.live_game_scorer_passes(game_id)',
              'live_scorer_control_status(target_game_id uuid)','live_accept_scorer_handoff_pass('):
    req(token in handoff,f'game-scoped scorer/handoff protection missing: {token}')
req('live_events_game_client_id_idx' in backend_mig and 'on public.live_events(game_id,client_event_id)' in backend_mig,
    'event idempotency must remain game-scoped')

# Following expands visibility only; it cannot become operational membership/scoring authority.
req('create table if not exists public.live_team_follows' in following,'Following relationship missing')
req('insert into public.live_team_members' not in following.lower(),'Following must not create membership')
req('update public.live_team_members' not in following.lower(),'Following must not mutate membership')
req('live_can_view_game' in following,'follower read helper missing')
view_section=following[following.index('create or replace function public.live_can_view_game'):following.index('grant execute on function public.live_can_view_game')]
req('public.live_can_score_game' not in view_section,'Following leaked into scoring authority')

# GroupMe claims remain serialized/idempotent per event/provider with retry history.
for token in ("pg_advisory_xact_lock(hashtextextended(target_event_id::text || ':groupme'", "status','already_sent'", "status','in_flight'", 'unique(delivery_id,attempt_number)'):
    req(token in delivery,f'GroupMe exactly-once/retry protection missing: {token}')

# Reopen/final recovery and archive/recap foundations remain present.
for token in ('live_reopen_game_eligibility_v1','live_reopen_game_v1'):
    req(token in game or token in recovery,f'reopen recovery missing: {token}')
for token in ('live_game_series_archive_v3','live_game_recap_detail_v1','live_merge_game_series_v1'):
    req(token in archive,f'archive/recap contract missing: {token}')
req('delete from public.live_games' not in archive.lower(),'archive hardening must not delete canonical games')

# Tournament reconciliation remains squad-safe; current-season source is still external/pending.
for token in ('club_only_multiple_live_squads','club_plus_matching_squad','peerCount > 1'):
    req(token in feed,f'squad-safe tournament matching missing: {token}')
req(index.get('release') in {'7.58.6','7.58.7','7.58.8','7.58.9','7.58.10','7.59.0','7.60.0','7.60.1','7.60.2','7.60.3','7.61.0'},'current tournament schedule index release mismatch')
req(index.get('activeCompetitiveSeason')=='2026-2027','active season changed')
req(index.get('counts')=={'events':0,'games':0},'do not fabricate a current-season schedule during hardening')
req((index.get('feedState') or {}).get('currentSeasonSchedulePublished') is False,'pending real schedule state must remain explicit')

# No 7.58.6 database/function deployment: this is browser isolation + regression hardening.
req(not list((ROOT/'supabase/migrations').glob('*club_level_pilot_hardening*')),'unexpected 7.58.6 hardening migration')

protected={
 'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
 'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
 'supabase/functions/roster-extract/index.ts':'26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb',
 'supabase/migrations/202608120001_multi_team_access_following.sql':'7bb9460a5f148ebe6699eec56639fed05f08f1c3aa7b71bb4f8abfad78150a0d',
 'supabase/migrations/202608130001_event_archive_game_recaps.sql':'8fc0881a48b842cb15d5453c13d3283f2c9efee7e5e2f78f729300efbb4f2cfe',
}
for rel,digest in protected.items():
    req(hashlib.sha256((ROOT/rel).read_bytes()).hexdigest()==digest,f'protected foundation changed: {rel}')

print('WPI Live 7.58.6 Club-Level Pilot Hardening checks passed.')
print(' - concurrent games have isolated local/offline browser state')
print(' - scorer sessions and handoff passes remain game-scoped')
print(' - Following remains read-only and separate from permission')
print(' - GroupMe claim/retry exactly-once protections remain intact')
print(' - archive/reopen/tournament identity safeguards remain protected')
print(' - first real 2026-2027 schedule observation remains pending external validation')
