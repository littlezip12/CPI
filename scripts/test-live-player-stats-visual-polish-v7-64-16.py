from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]
site=json.loads((ROOT/'config/site-release.json').read_text())
html=(ROOT/'live-team-insights.html').read_text()
css=(ROOT/'css/live-team-insights-v7-64-16.css').read_text()
global_css=(ROOT/'css/styles.css').read_text()
version=(ROOT/'VERSION.md').read_text()

def req(cond,msg):
    if not cond:
        raise AssertionError(msg)

req(version.startswith('# WPI 7.64.16 — Player Stats Visual Polish') or version.startswith('# WPI 7.64.17 — Installable App Experience'),'version mismatch')
req(site.get('version') in {'7.64.16','7.64.17'},'site release mismatch')
req(site.get('livePlayerStatsVisualPolishRelease')=='7.64.16','visual polish release marker missing')
req('live-team-insights-v7-64-16.css?v=7.64.16' in html,'7.64.16 Player Stats CSS not linked')
req('live-team-insights-v7-64-15.js?v=7.64.15' in html,'Player Stats behavior runtime should remain 7.64.15')

# Guard the exact regression seen on desktop: the legacy global table skin is dark,
# so Player Stats must explicitly override table, label cells, and value cells.
req('table { width: 100%; border-collapse: collapse; min-width: 980px; background: rgba(4,16,29,.82); }' in global_css,
    'legacy global table baseline unexpectedly changed')
for token in [
    '.insights-stat-section table{',
    'min-width:0;',
    'background:#fff;',
    '.insights-stat-section tbody th{',
    'background:#f2f6fa;',
    'color:#51677e;',
    '.insights-stat-section tbody td{',
    'color:#18324c;',
    '.insights-stat-section tbody tr:nth-child(even) td{',
    'background:#f7fafc;',
    '.insights-stat-section h3{',
    'background:#edf4fa;',
]:
    req(token in css,f'visual polish missing {token}')

req('#061b32' not in css[css.rfind('/* WPI 7.64.16'):], 'new Player Stats polish must not reintroduce the dark legacy table header')
print('WPI Live 7.64.16 Player Stats Visual Polish checks passed.')
