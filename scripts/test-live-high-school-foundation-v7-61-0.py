from pathlib import Path
import json, hashlib
R=Path(__file__).resolve().parents[1]
def need(cond,msg):
    if not cond: raise AssertionError(msg)
ver=(R/'VERSION.md').read_text(); need(('7.61.0' in ver) or ('7.61.1' in ver),'VERSION must preserve 7.61.0 high-school foundation')
d=json.loads((R/'data/live/high-school-directory-v7-61-0.json').read_text())
s=json.loads((R/'data/live/high-school-schedule-2026-27.json').read_text())
need(d['counts']=={'organizations':3,'teams':12,'varsitySchedulesPublished':4},'high-school directory counts changed')
need(s['counts']['publishedTeamSchedules']==4 and s['counts']['games']==42 and s['counts']['unpublishedTeamSchedules']==8,'schedule counts changed')
ids={o['organizationId'] for o in d['organizations']}; need(ids=={'school-acalanes','school-campolindo','school-miramonte'},'school identity set changed')
for oid in ids:
    rows=[t for t in d['teams'] if t['organizationId']==oid]; need(len(rows)==4,f'{oid} must have four teams'); need({(x['gender'],x['level']) for x in rows}=={('Men','Varsity'),('Men','JV'),('Women','Varsity'),('Women','JV')},f'{oid} team model wrong')
need(not any(g['organizationId']=='school-miramonte' for g in s['games']),'Miramonte schedule must remain unpublished')
need(not any('|jv' in g['teamFamilyKey'] for g in s['games']),'JV schedule must remain unpublished')
for asset in ['assets/logos/high-schools/acalanes.jpg','assets/logos/high-schools/campolindo.png','assets/logos/high-schools/miramonte.png','live-high-schools.html','js/live-high-schools-v7-61-0.js','js/live-high-school-theme-v7-61-0.js','js/live-high-school-theme-registry-v7-61-0.js','supabase/migrations/202608160001_high_school_water_polo_foundation.sql']:
    need((R/asset).exists(),f'missing {asset}')
html=(R/'live-game.html').read_text(); need('live-high-school-theme-v7-61-0.js' in html,'game page does not load school theme')
follow=(R/'live-following.html').read_text(); need('organizationTypeFilter' in follow and 'High Schools' in follow,'supporter discovery does not expose organization type/high schools')
js=(R/'js/live-following-v7-61-0.js').read_text(); need('high-school-directory-v7-61-0.json' in js,'supporter hub does not load school directory')
sql=(R/'supabase/migrations/202608160001_high_school_water_polo_foundation.sql').read_text(); need("organization_type in ('club','high_school')" in sql,'organization type guard missing'); need("'HS','2026-2027'" in sql,'HS team seed missing')
expected={
'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
'js/live-game-v7-58-6.js':'5cb97ca79e8794e9d34cb5f958462d3e86121ec152afed6f64516a2941368b76',
'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
'supabase/functions/roster-extract/index.ts':'26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb',
'js/live-game-storage-v7-58-6.js':'ded90608e0ef38249382e692774f59b41ab59712fb80bf96fe4a66ad05567353'}
for rel,h in expected.items(): need(hashlib.sha256((R/rel).read_bytes()).hexdigest()==h,f'protected file changed: {rel}')
print('WPI Live 7.61.0 high-school foundation checks passed.')
