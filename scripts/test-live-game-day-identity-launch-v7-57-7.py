#!/usr/bin/env python3
from pathlib import Path
import hashlib,json,sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]
def check(name,cond):
    if not cond: errors.append(name)
def sha(path): return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
site=json.loads((ROOT/'config/site-release.json').read_text())
html=(ROOT/'live-dashboard.html').read_text()
js=(ROOT/('js/live-dashboard-v7-57-9.js' if (ROOT/'js/live-dashboard-v7-57-9.js').exists() else ('js/live-dashboard-v7-57-8.js' if (ROOT/'js/live-dashboard-v7-57-8.js').exists() else 'js/live-dashboard-v7-57-7.js'))).read_text()
css=(ROOT/('css/live-sandbox-v7-57-9.css' if (ROOT/'css/live-sandbox-v7-57-9.css').exists() else ('css/live-sandbox-v7-57-8.css' if (ROOT/'css/live-sandbox-v7-57-8.css').exists() else 'css/live-sandbox-v7-57-7.css'))).read_text()
mig=(ROOT/'supabase/migrations/202608080006_game_day_identity_launch_reliability.sql').read_text()
alias=json.loads((ROOT/'data/live/team-identity-aliases.json').read_text())
check('version',site.get('version') in {'7.57.7','7.57.8','7.57.9','7.57.10','7.57.11'})
check('name',site.get('name') in {'Game-Day Identity & Launch Reliability','Tournament Schedule Integration & Reconciliation','Scorer Assignments & Game-Day Operations'})
for key in ['liveScoringDashboardRelease','liveScoringTeamAdminRelease','liveScoringGameDayHubRelease']:
    check(key,site.get(key) in {'7.57.7','7.57.8','7.57.9','7.57.10','7.57.11'})
for key in ['liveScoringGameDayIdentityRelease','liveScoringGameDayLaunchReliabilityRelease']:
    check(key,site.get(key)=='7.57.7')
check('only two visible types',html.count('name="gameKind"')==2 and 'value="tournament"' in html and 'value="friendly"' in html and 'value="scrimmage"' not in html)
check('friendly covers scrimmage', 'Scrimmage, practice, or any non-tournament game' in html)
check('typing hint', 'id="gameOpponentMatchHint"' in html)
check('new js wired',('js/live-dashboard-v7-57-7.js?v=7.57.7' in html or 'js/live-dashboard-v7-57-8.js?v=7.57.8' in html or 'js/live-dashboard-v7-57-9.js?v=7.57.9' in html))
check('new css wired',('css/live-sandbox-v7-57-7.css?v=7.57.7' in html or 'css/live-sandbox-v7-57-8.css?v=7.57.8' in html or 'css/live-sandbox-v7-57-9.css?v=7.57.9' in html))
for token in ['resolveGameDayTeamIdentity','GAME_DAY_SQUAD_TOKENS','data/live/team-identity-aliases.json','Matched WPI club: ${identity.displayName}','opponentSourceName','opponentWpiClubId','live_create_manual_game_v3','live_update_planned_game_v2',('live_game_day_queue_v4' if site.get('version')=='7.57.9' else ('live_game_day_queue_v3' if site.get('version')=='7.57.8' else 'live_game_day_queue_v2')),('live_prepare_game_start_v2' if site.get('version')=='7.57.9' else 'live_prepare_game_start_v1'),'Preparing scorer control…','prepareGameDayStart(gameId)']:
    check('js '+token,token in js)
clubs={row['canonicalClubSlug']:row for row in alias.get('clubs',[])}
check('Stanford aliases','stanford' in clubs and clubs['stanford'].get('displayName')=='Stanford' and clubs['stanford'].get('squadAliases',{}).get('black')=='B')
check('CCU aliases','cc-united' in clubs and clubs['cc-united'].get('displayName')=='CCU' and 'CCU' in clubs['cc-united'].get('aliases',[]) and clubs['cc-united'].get('squadAliases',{}).get('black')=='B')

clubs_data=json.loads((ROOT/'clubs.json').read_text())
club_by_slug={row.get('slug'):row for row in clubs_data}
stanford=club_by_slug.get('stanford',{})
ccu=club_by_slug.get('cc-united',{})
check('Stanford canonical logo exists',stanford.get('logo')=='assets/logos/canonical/stanford.webp' and (ROOT/stanford.get('logo')).exists())
check('CCU canonical logo exists',ccu.get('logo')=='assets/logos/canonical/cc-united.webp' and (ROOT/ccu.get('logo')).exists())
stanford_14=[t for t in stanford.get('teams',[]) if t.get('ageGroup')=='14U' and t.get('gender')=='Boys']
ccu_14=[t for t in ccu.get('teams',[]) if t.get('ageGroup')=='14U' and t.get('gender')=='Boys']
check('Stanford B target exists',any(t.get('team')=='Stanford B' and t.get('canonicalTeamId') for t in stanford_14))
check('CCU A/B targets exist',all(any(t.get('team')==name and t.get('canonicalTeamId') for t in ccu_14) for name in ['CC United A','CC United B']))
for token in ['opponent_source_name text','opponent_wpi_club_id text','live_create_manual_game_v3','live_update_planned_game_v2','live_game_day_queue_v2','live_prepare_game_start_v1','live_claim_game_scorer(target_game_id,display_name)','exactly-one-active-scorer enforcement']:
    check('migration '+token,token in mig)
check('legacy scrimmage maps friendly', "if cleaned_kind='scrimmage' then cleaned_kind := 'friendly'; end if;" in mig)
check('new game restriction', "cleaned_kind not in ('tournament','friendly')" in mig)
# protected scoring/delivery plane remains byte-identical to 7.57.6 baseline
expected={
 'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
 'js/live-sandbox-v7-56-15.js':'f32236d8e704c113ba9b868b18ae2b97e7bb366e9adbefd37000117aea0fc6da',
 'supabase/functions/roster-extract/index.ts':'26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb',
 'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
 'supabase/migrations/202608080005_game_day_hub_universal_game_model.sql':'61cbcad25a1b61d85b3bbefb005ddf75941b36465265679adb32a22767b46ebe'
}
for path,expected_hash in expected.items(): check('protected '+path,sha(path)==expected_hash)
if errors:
 print('WPI LIVE GAME-DAY IDENTITY & LAUNCH 7.57.7 TEST FAILED')
 for e in errors: print(' -',e)
 sys.exit(1)
print('WPI LIVE GAME-DAY IDENTITY & LAUNCH 7.57.7 TEST PASSED')
print(' - Game types are Tournament or Friendly; legacy Scrimmage inputs normalize to Friendly')
print(' - Typed club/team aliases resolve logo + canonical display without requiring a dropdown selection')
print(' - Stanford Black resolves through Stanford identity; CCU A/Black resolves through CCU identity')
print(' - Planned games explicitly claim scorer control before entering the validated scoring console')
print(' - Raw opponent labels remain preserved for future official tournament reconciliation')
print(' - 7.56.15 scoring/delivery and GroupMe/roster Edge Functions remain byte-for-byte protected')
