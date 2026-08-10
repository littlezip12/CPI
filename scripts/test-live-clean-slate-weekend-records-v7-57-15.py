#!/usr/bin/env python3
from pathlib import Path
import json, hashlib, sys
root=Path(__file__).resolve().parents[1]
errors=[]
def check(label, cond):
    if not cond: errors.append(label)
site=json.loads((root/'config/site-release.json').read_text())
dash=(root/'live-dashboard.html').read_text()
js=(root/'js/live-dashboard-v7-57-15.js').read_text()
sql=(root/'supabase/migrations/202608090004_clean_slate_tournament_weekend_records.sql').read_text()
check('version', site.get('version')=='7.57.15')
check('name', site.get('name')=='Clean Slate & Tournament Weekend Records')
check('dashboard release', site.get('liveScoringDashboardRelease')=='7.57.15')
check('archive release', site.get('liveScoringGameArchiveRelease')=='7.57.15')
check('dashboard script', 'js/live-dashboard-v7-57-15.js?v=7.57.15' in dash)
check('history removed', 'Permanent records' not in dash and '<h2>Game history</h2>' not in dash and 'dashboardGameHistory' not in dash)
check('archive surface', 'Tournaments &amp; weekends' in dash and 'gameSeriesArchive' in dash)
check('friendly weekend field', 'gameScrimmageWeekendName' in dash and 'Scrimmage weekend' in dash)
check('atomic weekend save', 'live_save_game_day_v2' in js and 'requested_series_name:payload.seriesName' in js)
check('archive rpc', 'live_game_series_archive_v1' in js)
check('series table', 'create table if not exists public.live_game_series' in sql)
check('series link', 'live_games_series_link_trigger' in sql and 'series_id uuid references public.live_game_series' in sql)
check('production records', "new.environment := 'production'" in sql and "alter table public.live_games alter column environment set default 'production'" in sql)
check('intentional reset', 'delete from public.live_games;' in sql and 'delete from public.live_game_series;' in sql)
check('queue remains chunked', sql.count('|| jsonb_build_object(') >= 2)
# Protected reliability files must remain the authoritative historical implementation.
expected={
 'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
 'js/live-sandbox-v7-56-15.js':'f32236d8e704c113ba9b868b18ae2b97e7bb366e9adbefd37000117aea0fc6da',
 'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
 'supabase/functions/roster-extract/index.ts':'26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb'
}
for rel, digest in expected.items():
    p=root/rel
    check(f'protected {rel}', p.exists() and hashlib.sha256(p.read_bytes()).hexdigest()==digest)
if errors:
    print('WPI LIVE CLEAN SLATE & WEEKEND RECORDS 7.57.15 TEST FAILED')
    for e in errors: print('-',e)
    sys.exit(1)
print('WPI LIVE CLEAN SLATE & WEEKEND RECORDS 7.57.15 TEST PASSED')
