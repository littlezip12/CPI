#!/usr/bin/env python3
from pathlib import Path

root = Path(__file__).resolve().parents[1]
html = (root / 'live-dashboard.html').read_text()
js = (root / 'js/live-dashboard-v7-61-0.js').read_text()
css = (root / 'css/live-dashboard-v7-61-0.css').read_text()

checks = {
    'workspace search input exists': 'id="dashboardTeamSearch"' in html,
    'workspace selector is labeled as workspace': '<small>Workspace</small>' in html,
    'search placeholder is organization aware': 'Search school, club or team' in html,
    'selector correction css is loaded': 'css/live-dashboard-v7-61-0.css?v=7.61.0-workspace-selector-fix' in html,
    'selector correction js cache key is loaded': 'js/live-dashboard-v7-61-0.js?v=7.61.0-workspace-selector-fix' in html,
    'team labels preserve organization for multi-org accounts': '`${organization} · ${label} · ${roleLabel(team.role)}`' in js,
    'organization all-teams rows are explicit scoped choices': '`${organizationName(club)} · All Teams`' in js,
    'organization overview values are club scoped': '__club__:' in js,
    'workspace search filters organization and team metadata': 'workspaceMatchesSearch(search,[orgName,team.teamName,team.teamDisplayLabel' in js,
    'workspace selector groups choices by organization': '<optgroup label=' in js,
    'search escape clears the filter': 'event.key === "Escape"' in js and 'teamWorkspaceSearch = ""' in js,
    'search UI has responsive styling': '.live-team-switcher-search' in css and '@media (max-width:760px)' in css,
}
failed = [name for name, ok in checks.items() if not ok]
if failed:
    print('PLATFORM OWNER WORKSPACE SELECTOR 7.61.0 TEST FAILED')
    for name in failed:
        print(f' - {name}')
    raise SystemExit(1)
print('PLATFORM OWNER WORKSPACE SELECTOR 7.61.0 TEST PASSED')
