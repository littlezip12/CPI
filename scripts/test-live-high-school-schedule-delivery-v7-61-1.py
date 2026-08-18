#!/usr/bin/env python3
from pathlib import Path
import json, hashlib
ROOT=Path(__file__).resolve().parents[1]

def req(cond,msg):
    if not cond: raise AssertionError(msg)

version=(ROOT/'VERSION.md').read_text()
site=json.loads((ROOT/'config/site-release.json').read_text())
schedule=json.loads((ROOT/'data/live/high-school-schedule-2026-27.json').read_text())
html=(ROOT/'live-dashboard.html').read_text()
js=(ROOT/('js/live-dashboard-v7-62-0.js' if (ROOT/'js/live-dashboard-v7-62-0.js').exists() else 'js/live-dashboard-v7-61-1.js')).read_text()
sql=(ROOT/'supabase/migrations/202608160003_high_school_schedule_optional_delivery.sql').read_text()

req(any(v in version for v in ('7.61.1','7.62.0','7.62.1','7.62.2','7.62.3','7.62.4','7.62.5','7.62.6','7.63.0','7.63.1','7.63.2','7.63.3','7.63.4')),'VERSION no longer preserves 7.61.1 behavior')
req(site.get('version') in {'7.61.1','7.62.0','7.62.1','7.62.2','7.62.3','7.62.4','7.62.5','7.62.6','7.63.0','7.63.1','7.63.2','7.63.3','7.63.4'},'site release no longer preserves 7.61.1 behavior')
for marker in [
  'liveScoringHighSchoolGameDayIntegrationRelease','liveScoringHighSchoolRegularSeasonRelease',
  'liveScoringOptionalDeliveryRelease','liveScoringWpiLiveOnlyDeliveryRelease','liveScoringHighSchoolScheduleSyncRelease']:
    req(site.get(marker)=='7.61.1',f'missing release marker {marker}')

req(schedule.get('release')=='7.61.1','high-school schedule release not updated')
req(schedule.get('timezone')=='America/Los_Angeles','high-school timezone missing')
rows=schedule.get('games') or []
req(len(rows)==42,'must preserve exactly 42 user-supplied varsity schedule rows')
req(sum(bool(r.get('scheduledAt')) for r in rows)==37,'expected 37 schedule rows with known start times')
req(sum(not bool(r.get('scheduledAt')) for r in rows)==5,'expected 5 TBA schedule rows')
req(len({r.get('scheduleId') for r in rows})==42,'schedule IDs must be unique')
req(not any(r.get('organizationId')=='school-miramonte' for r in rows),'Miramonte schedule must remain unpublished')
req(not any('|jv' in str(r.get('teamFamilyKey','')).lower() for r in rows),'JV schedules must remain unpublished')
req(schedule.get('counts',{}).get('unpublishedTeamSchedules')==8,'eight team schedules must remain unpublished')

for token in ['id="highSchoolScheduleCard"','id="scoreDeliveryWpiOnly"','id="scoreDeliveryGroupMe"','id="gameRegularSeasonOption"','js/live-dashboard-v7-62-0.js?v=7.62.0']:
    req(token in html,f'dashboard missing {token}')
for token in ['live_sync_high_school_schedule_game_v1','live_game_day_queue_v5','live_save_game_day_v3','live_team_score_delivery_v1','live_set_team_score_delivery_mode_v1','autoSyncHighSchoolSchedule']:
    req(token in js,f'dashboard JS missing {token}')
req('Schedule not published yet.' in js and 'Nothing was fabricated.' in js,'unpublished schedule no-fabrication UX missing')
req('WPI Live only' in js and 'WPI Live + GroupMe' in html,'optional delivery UX missing')
req('scoreDeliveryReady' in js and 'Score delivery' in js,'club-level launch readiness must use optional delivery')

for token in [
  "score_delivery_mode text not null default 'wpi_live_only'",
  "score_delivery_mode in ('wpi_live_only','wpi_live_groupme')",
  "game_kind in ('tournament','scrimmage','friendly','regular_season')",
  "series_type in ('tournament','scrimmage_weekend','season_schedule')",
  'high_school_schedule_id text',
  'live_sync_high_school_schedule_game_v1',
  'live_team_score_delivery_v1',
  'live_set_team_score_delivery_mode_v1',
  'live_save_game_day_v3',
  'live_game_day_queue_v5',
  "score_delivery_mode='wpi_live_only' or r.groupme_ready",
  "'scoreDeliveryReady',score_delivery_ready",
  "return jsonb_build_object('scheduleId',schedule_id,'synced',false,'status','time_tba')"
]: req(token in sql,f'migration missing {token}')
req("if club_row.organization_type<>'high_school'" in sql,'high-school schedule sync scope guard missing')
req("coalesce(team_row.canonical_wpi_team_family_key,'')<>family_key" in sql,'team-family schedule identity guard missing')
req("candidate_count=1" in sql,'manual-game reconciliation must require one strong candidate')

expected={
'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
'js/live-game-v7-58-6.js':'5cb97ca79e8794e9d34cb5f958462d3e86121ec152afed6f64516a2941368b76',
'js/live-game-storage-v7-58-6.js':'ded90608e0ef38249382e692774f59b41ab59712fb80bf96fe4a66ad05567353',
'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
'supabase/functions/roster-extract/index.ts':'26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb',
'js/live-high-school-theme-v7-61-0.js':'bf979a0d178d15d7af1dc7f64752f17c132f9fbcb97d18da499254bbbe35fdcc',
'js/live-high-school-theme-registry-v7-61-0.js':'29cc9f330a9380010dfcc50746d73895796dbdde7dbb47c8f2f13c41f88a2eeb',
}
for rel,h in expected.items():
    req(hashlib.sha256((ROOT/rel).read_bytes()).hexdigest()==h,f'protected file changed: {rel}')
print('WPI Live 7.61.1 high-school schedule + optional-delivery checks passed.')
