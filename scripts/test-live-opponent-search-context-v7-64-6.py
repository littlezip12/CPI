from pathlib import Path
import json,sys
R=Path(__file__).resolve().parents[1]
def read(p): return (R/p).read_text()
def req(ok,msg):
    if not ok:
        print('WPI OPPONENT SEARCH CONTEXT 7.64.6 TEST FAILED\n - '+msg);sys.exit(1)
site=json.loads(read('config/site-release.json')); version=read('VERSION.md'); dash=read('live-dashboard.html'); js=read('js/live-opponent-autocomplete-v7-64-6.js')
req(site.get('version') in {'7.64.6','7.64.7','7.64.8','7.64.9','7.64.10','7.64.11','7.64.12','7.64.13','7.64.14','7.64.15'},'site release must preserve 7.64.6 or later')
req(any(v in version for v in ('WPI 7.64.6','WPI 7.64.7')),'VERSION missing 7.64.6+')
req(site.get('liveScoringOpponentAutocompleteRelease')=='7.64.6','opponent autocomplete marker missing')
req(site.get('liveScoringOpponentSearchContextRelease')=='7.64.6','opponent context marker missing')
req('live-opponent-autocomplete-v7-64-6.js?v=7.64.6' in dash,'dashboard must load 7.64.6 autocomplete')
for needle in (
    'function primaryLabel(row)',
    '[age,row.team]',
    'function contextRank(row,hints)',
    'a.context - b.context',
    'const level = /\\bjunior varsity\\b|\\bjv\\b/',
    ': /\\bvarsity\\b/.test(text) ? "Varsity"',
    'data/live/high-school-directory-v7-61-0.json',
    'if (hints.highSchool)',
    'Selected WPI team: ${primaryLabel(row)}',
    'input.value = row.inputValue || row.team;',
    'query.length < 2'
):
    req(needle in js,f'context autocomplete missing {needle}')
req('fuzzy' not in js.lower(),'search must not silently fuzzy-correct opponents')
req('14U Stanford A' in version and '14U 680 A' in version and '14U Davis B' in version,'VERSION must document contextual labels')
print('WPI OPPONENT SEARCH CONTEXT 7.64.6 TEST PASSED')
