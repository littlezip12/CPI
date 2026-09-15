from pathlib import Path
import json,sys
R=Path(__file__).resolve().parents[1]
def read(p): return (R/p).read_text()
def req(ok,msg):
    if not ok:
        print('WPI MOBILE RECAP / OPPONENT SEARCH 7.64.5 TEST FAILED\n - '+msg);sys.exit(1)
site=json.loads(read('config/site-release.json'));version=read('VERSION.md');dash=read('live-dashboard.html');game=read('live-game.html');css=read('css/live-mobile-polish-v7-64-5.css');js=read('js/live-opponent-autocomplete-v7-64-6.js')
req(site.get('version') in {'7.64.5','7.64.6'},'site release must preserve 7.64.5 or later')
req(any(v in version for v in ('WPI 7.64.5','WPI 7.64.6')),'VERSION must preserve 7.64.5 or later')
req(site.get('liveScoringMobileRecapActionsRelease')=='7.64.5','mobile recap marker missing')
req(site.get('liveScoringOpponentAutocompleteRelease') in {'7.64.5','7.64.6'},'opponent autocomplete marker missing')
for needle in ('gameOpponentAutocomplete','aria-autocomplete="list"','Start typing a team, e.g. Stanford','live-opponent-autocomplete-v7-64-6.js','live-mobile-polish-v7-64-5.css'):
    req(needle in dash,f'dashboard missing {needle}')
for needle in ('summaryDashboardButton','reopenGameButton','downloadLogButton','>Download log</button>','live-mobile-polish-v7-64-5.css'):
    req(needle in game,f'game page missing {needle}')
for needle in ('query.length < 2','matchScore(row,query)','contextRank(row,hints)','slice(0,8)','dispatchEvent(new Event("input"','dispatchEvent(new Event("change"'):
    req(needle in js,f'autocomplete logic missing {needle}')
req('fuzzy' not in js.lower(),'autocomplete must not implement silent fuzzy correction')
req('grid-column:1/-1' in css,'dashboard primary recap action must span mobile row')
req('#downloadLogButton' in css and 'white-space:nowrap' in css,'mobile recap actions must avoid awkward wrapping')
req('.live-opponent-option' in css and 'min-height:58px' in css,'mobile team suggestions need large touch targets')
req('manual opponent' in version.lower(),'manual opponent fallback must remain documented')
print('WPI MOBILE RECAP / OPPONENT SEARCH 7.64.5 TEST PASSED')
