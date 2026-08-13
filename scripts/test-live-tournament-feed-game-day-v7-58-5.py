#!/usr/bin/env python3
"""Static/source-backed acceptance checks for WPI Live 7.58.5."""
from pathlib import Path
import hashlib, json, re
ROOT=Path(__file__).resolve().parents[1]
def read(rel): return (ROOT/rel).read_text(encoding='utf-8')
def req(ok,msg):
    if not ok: raise AssertionError(msg)

site=json.loads(read('config/site-release.json'))
html=read('live-dashboard.html')
js=read('js/live-dashboard-v7-58-5.js')
matcher=read('js/live-tournament-feed-v7-58-5.js')
builder=read('scripts/build-live-tournament-schedule-index.py')
index=json.loads(read('data/live/tournament-schedule-index.json'))
evidence=json.loads(read('data/live/tournament-feed-validation.json'))
mig=read('supabase/migrations/202608080007_tournament_schedule_integration_reconciliation.sql')

req(read('VERSION.md').strip()=='# WPI 7.58.5 — Tournament Feed → Game-Day Validation','VERSION mismatch')
req(site.get('version')=='7.58.5' and site.get('name')=='Tournament Feed → Game-Day Validation','release metadata mismatch')
for key in ('liveScoringDashboardRelease','liveScoringTournamentFeedValidationRelease','liveScoringTournamentIdentitySafetyRelease','liveScoringTournamentReconciliationValidationRelease'):
    req(site.get(key)=='7.58.5',f'missing marker {key}')
req(site.get('liveScoringEventArchiveRelease')=='7.58.4','7.58.4 archive marker changed')

for token in ('css/live-dashboard-v7-58-5.css?v=7.58.5','js/live-tournament-feed-v7-58-5.js?v=7.58.5','js/live-dashboard-v7-58-5.js?v=7.58.5'):
    req(token in html,f'missing dashboard asset {token}')
for token in ('club_only_multiple_live_squads','club_plus_matching_squad','club_but_different_squad','peerCount > 1'):
    req(token in matcher,f'missing squad-safe matcher rule {token}')
for token in ('tournamentScheduleIdentityReviews','officialGameAssessmentForWorkspace','identity review','will not auto-import or guess'):
    req(token in js,f'missing identity review behavior {token}')

req(index.get('release')=='7.58.5','schedule index release mismatch')
req(index.get('activeCompetitiveSeason')=='2026-2027','active season changed')
req(index.get('counts')=={'events':0,'games':0},'current-season schedule must remain empty until source is published')
req((index.get('feedState') or {}).get('currentSeasonSchedulePublished') is False,'feed state must explicitly say schedule unpublished')
req((index.get('feedState') or {}).get('teamIdentityPolicy')=='squad_safe_no_guessing','identity policy marker missing')
req('outside_active_competitive_season' in builder,'builder must remain active-season scoped')

req(evidence.get('release')=='7.58.5' and len(evidence.get('cases') or [])==3,'real feed QA evidence missing')
expected={'auto_match_a_only','auto_match_b_only','identity_review_when_multiple_live_squads'}
req({c.get('expected') for c in evidence['cases']}==expected,'validation case policy mismatch')
for case in evidence['cases']:
    source=ROOT/case['sourcePath']; req(source.exists(),f'missing real source {source}')
    doc=json.loads(source.read_text())
    game=next((g for g in doc.get('games',[]) if g.get('id')==case.get('gameId')),None)
    req(game is not None,f"source game missing {case.get('gameId')}")
    names=[(g.get('name') if isinstance(g,dict) else str(g or '')) for g in (game.get('white'),game.get('dark'))]
    req(case.get('sourceTeamName') in names,f"source label not preserved for {case.get('gameId')}")

# Existing server reconciliation remains the canonical data-preservation mechanism.
for token in ('live_games_unique_official_schedule_game_idx','pg_advisory_xact_lock','A scored manual game always remains the canonical live_games row',"reconciliation_status='possible_match'","resulting_status := 'conflict'",'live_confirm_tournament_reconciliation_v1','live_dismiss_tournament_reconciliation_v1'):
    req(token in mig,f'missing reconciliation safeguard {token}')
req('delete from public.live_games' not in mig.lower(),'official sync must not delete canonical games')

# No new database/function deployment in 7.58.5.
req(not (ROOT/'supabase/migrations/202608130002_tournament_feed_game_day_validation.sql').exists(),'unexpected 7.58.5 migration')

ids=set(re.findall(r'id="([^"]+)"',html)); refs=set(re.findall(r'\$\("([A-Za-z0-9_-]+)"\)',js))
req(not sorted(refs-ids),f'dashboard DOM refs missing: {sorted(refs-ids)}')

protected={
 'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
 'js/live-game-v7-57-22.js':'a03145737d61767d6fbca3676b585d8476c3724dd0e45f4f2fd83c2deb87fca4',
 'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
 'supabase/functions/roster-extract/index.ts':'26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb',
 'supabase/migrations/202608130001_event_archive_game_recaps.sql':'8fc0881a48b842cb15d5453c13d3283f2c9efee7e5e2f78f729300efbb4f2cfe',
}
for rel,digest in protected.items(): req(hashlib.sha256((ROOT/rel).read_bytes()).hexdigest()==digest,f'protected file changed {rel}')

print('WPI Live 7.58.5 Tournament Feed → Game-Day Validation static checks passed.')
print(' - active 2026-2027 production feed remains empty rather than fabricated')
print(' - real banked tournament rows validate A/B-specific and ambiguous club-only identity cases')
print(' - official schedule sync preserves manual canonical games and duplicate protection')
