#!/usr/bin/env python3
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
js_path=ROOT/('js/live-dashboard-v7-62-0.js' if (ROOT/'js/live-dashboard-v7-62-0.js').exists() else ('js/live-dashboard-v7-61-1.js' if (ROOT/'js/live-dashboard-v7-61-1.js').exists() else 'js/live-dashboard-v7-61-0.js'))
js=js_path.read_text()
html=(ROOT/'live-dashboard.html').read_text()
sql=(ROOT/'supabase/migrations/202608160002_high_school_logo_propagation.sql').read_text()
checks={
 'dashboard loads corrected asset':('js/live-dashboard-v7-62-0.js?v=7.62.0' in html or 'js/live-dashboard-v7-61-1.js?v=7.61.1' in html or 'js/live-dashboard-v7-61-0.js?v=7.61.0-logo-fix' in html or 'js/live-dashboard-v7-61-0.js?v=7.61.0-workspace-selector-fix' in html),
 'workspace logo fallback':'workspace?.clubLogoUrl || null' in js,
 'high school directory loaded':'high-school-directory-v7-61-0.json?v=7.61.0-logo-fix' in js,
 'high school resolver':'function resolveHighSchoolIdentity' in js and 'high_school_organization' in js,
 'existing home game logo backfill':"c.organization_type = 'high_school'" in sql and 'set team_logo_url = c.logo_url' in sql,
 'existing opponent logo backfill':'set opponent_logo_url = c.logo_url' in sql,
 'seeded schools covered':all(x in sql for x in ['school-acalanes','school-campolindo','school-miramonte']),
}
failed=[k for k,v in checks.items() if not v]
print('WPI 7.61.0 High School Logo Propagation')
for k,v in checks.items(): print(('PASS' if v else 'FAIL'),'-',k)
if failed: raise SystemExit(1)
print('HIGH SCHOOL LOGO PROPAGATION 7.61.0 TEST PASSED')
