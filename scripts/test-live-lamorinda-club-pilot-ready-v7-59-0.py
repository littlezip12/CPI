from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
def read(path): return (ROOT/path).read_text()
def sha(path): return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
def req(cond,msg):
    if not cond: raise SystemExit(f"FAIL: {msg}")
site=json.loads(read('config/site-release.json'))
status=json.loads(read('data/live/lamorinda-pilot-status.json'))
req(read('VERSION.md').strip()=='# WPI 7.59.0 — Lamorinda Club Pilot Ready','VERSION mismatch')
req((site.get('version'),site.get('name'))==('7.59.0','Lamorinda Club Pilot Ready'),'release metadata mismatch')
for key in ['liveScoringLamorindaPilotReadyRelease','liveScoringManualGamePilotReadyRelease','liveScoringPilotStabilizationRelease','liveScoringProductionRunbookRelease']:
    req(site.get(key)=='7.59.0',f'{key} missing')
req(status.get('release')=='7.59.0' and status.get('status')=='ready','pilot status record must mark milestone ready')
validated={row.get('key'):row.get('status') for row in status.get('validatedCapabilities',[])}
for key in ['club_team_hierarchy','multi_team_operation','supporter_following','archives_and_recaps','manual_opponent_identity','launch_admin_safety','club_branding']:
    req(validated.get(key) in {'validated','observed'},f'{key} milestone evidence missing')
req(any(row.get('key')=='offline_reconnect' and row.get('status')=='deferred_resilience' for row in status.get('deferred',[])),'offline resilience must remain explicitly deferred')
req(any(row.get('key')=='official_2026_2027_tournament_feed' and row.get('status')=='external_dependency' for row in status.get('externalDependencies',[])),'official feed must remain an external dependency')
html=read('live-dashboard.html')
req('live-dashboard-v7-59-0.css?v=7.59.0' in html,'7.59.0 milestone stylesheet missing')
req('Lamorinda manual-game pilot ready' in html and 'official tournament-feed validation' in html,'pilot-ready milestone banner missing')
req('live_club_pilot_validation_v1' in read('js/live-dashboard-v7-58-10.js'),'canonical evidence panel wiring changed unexpectedly')
req('live-game-v7-58-6.js' in read('live-game.html'),'protected scoring engine reference changed')
req('live-club-theme-v7-58-8.js' in read('live-game.html'),'Lamorinda scoring theme changed')
protected={
 'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
 'js/live-sandbox-v7-56-15.js':'f32236d8e704c113ba9b868b18ae2b97e7bb366e9adbefd37000117aea0fc6da',
 'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
 'supabase/functions/roster-extract/index.ts':'26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb',
 'js/live-game-v7-58-6.js':'5cb97ca79e8794e9d34cb5f958462d3e86121ec152afed6f64516a2941368b76'}
for path,digest in protected.items(): req(sha(path)==digest,f'protected file changed: {path}')
req(not any('7_59_0' in p.name.lower() or '7590' in p.name.lower() for p in (ROOT/'supabase/migrations').glob('*')),'7.59.0 must not add a Supabase migration')
for doc in ['INSTALL_7.59.0.md','LIVE_LAMORINDA_CLUB_PILOT_RUNBOOK_7.59.0.md','LIVE_OWNER_SCORER_SUPPORTER_WORKFLOWS_7.59.0.md','WPI_7.59.0_LAMORINDA_CLUB_PILOT_READY_HANDOFF.md']:
    req((ROOT/doc).exists(),f'missing production doc: {doc}')
req('./release-check-live-7.59.0' in read('release-check'),'full release gate must invoke current focused gate')
req((ROOT/'release-check-clean').exists() and './release-check' in read('release-check-clean'),'clean full-gate wrapper missing')
req('data/tournaments' in read('release-check-clean') and 'qa' in read('release-check-clean'),'clean gate must preserve generated tournament/QA state')
print('WPI LIVE 7.59.0 LAMORINDA CLUB PILOT READY PASSED')
