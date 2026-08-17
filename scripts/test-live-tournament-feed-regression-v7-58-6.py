#!/usr/bin/env python3
"""Protect the validated 7.58.5 tournament feed/reconciliation foundation during 7.58.6."""
from pathlib import Path
import hashlib, json
ROOT=Path(__file__).resolve().parents[1]
def read(rel): return (ROOT/rel).read_text(encoding='utf-8')
def req(ok,msg):
    if not ok: raise AssertionError(msg)
site=json.loads(read('config/site-release.json'))
html=read('live-dashboard.html')
js=read('js/live-dashboard-v7-58-5.js')
matcher=read('js/live-tournament-feed-v7-58-5.js')
index=json.loads(read('data/live/tournament-schedule-index.json'))
evidence=json.loads(read('data/live/tournament-feed-validation.json'))
mig=read('supabase/migrations/202608080007_tournament_schedule_integration_reconciliation.sql')
req(site.get('version') in {'7.58.6','7.58.7','7.58.8','7.58.9','7.58.10','7.59.0','7.60.0','7.60.1','7.60.2','7.60.3','7.61.0','7.61.1','7.62.0','7.62.1'},'current release must preserve 7.58.6 hardening or later')
for key in ('liveScoringTournamentFeedValidationRelease','liveScoringTournamentIdentitySafetyRelease','liveScoringTournamentReconciliationValidationRelease'):
    req(site.get(key)=='7.58.5',f'7.58.5 marker changed: {key}')
for token in ('js/live-tournament-feed-v7-58-5.js?v=7.58.5',):
    req(token in html,f'7.58.5 dashboard/feed asset changed: {token}')
for token in ('club_only_multiple_live_squads','club_plus_matching_squad','club_but_different_squad','peerCount > 1'):
    req(token in matcher,f'squad-safe matcher rule missing: {token}')
for token in ('tournamentScheduleIdentityReviews','officialGameAssessmentForWorkspace','identity review','will not auto-import or guess'):
    req(token in js,f'identity review behavior missing: {token}')
req(index.get('release') in {'7.58.6','7.58.7','7.58.8','7.58.9','7.58.10','7.59.0','7.60.0','7.60.1','7.60.2','7.60.3','7.61.0'},'schedule index should preserve the current live release')
req(index.get('counts')=={'events':0,'games':0},'current-season schedule must remain empty until published')
req((index.get('feedState') or {}).get('teamIdentityPolicy')=='squad_safe_no_guessing','squad-safe feed policy marker changed')
req(evidence.get('release')=='7.58.5' and len(evidence.get('cases') or [])==3,'7.58.5 source-backed evidence changed')
for token in ('live_games_unique_official_schedule_game_idx','pg_advisory_xact_lock','A scored manual game always remains the canonical live_games row',"reconciliation_status='possible_match'","resulting_status := 'conflict'",'live_confirm_tournament_reconciliation_v1','live_dismiss_tournament_reconciliation_v1'):
    req(token in mig,f'reconciliation safeguard missing: {token}')
req('delete from public.live_games' not in mig.lower(),'official sync must not delete canonical games')
print('WPI Live 7.58.5 Tournament Feed foundation regression passed.')
