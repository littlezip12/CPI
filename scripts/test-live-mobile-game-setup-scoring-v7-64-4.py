from pathlib import Path
import json,sys
R=Path(__file__).resolve().parents[1]
def read(p): return (R/p).read_text()
def req(ok,msg):
    if not ok:
        print('WPI MOBILE GAME SETUP 7.64.4 TEST FAILED\n - '+msg);sys.exit(1)
site=json.loads(read('config/site-release.json'));version=read('VERSION.md');dash=read('live-dashboard.html');game=read('live-game.html');css=read('css/live-mobile-game-ux-v7-64-4.css');wizard=read('js/live-mobile-game-setup-v7-64-4.js');clock=read('js/live-mobile-clock-v7-64-4.js')
req(site.get('version') in {'7.64.4','7.64.5','7.64.6','7.64.7','7.64.8','7.64.9'},'site release must preserve 7.64.4 or later')
req(any(v in version for v in ('WPI 7.64.4','WPI 7.64.5','WPI 7.64.6','WPI 7.64.7','WPI 7.64.8')),'VERSION missing 7.64.4+')
for needle in ('data-game-step="1"','data-game-step="2"','data-game-step="3"','data-game-step="4"','gameWizardBack','gameWizardNext','gameMobileReview','live-mobile-game-setup-v7-64-4.js','live-mobile-game-ux-v7-64-4.css'):
    req(needle in dash,f'dashboard missing {needle}')
for needle in ('clockConfirmButton','enterkeyhint="done"','live-mobile-game-ux-v7-64-4.css'):
    req(needle in game,f'game scoring page missing {needle}')
req(('live-quick-time-pad-v7-64-8.js' in game) or ('live-quick-time-pad-v7-64-9.js' in game),'game scoring page missing Quick Time Pad successor')
req('max-height:calc(100dvh - 10px)' in css,'mobile dialog must fit dynamic viewport')
req('overflow-x:hidden' in css,'mobile page must block horizontal overflow')
req('grid-template-columns:minmax(0,1fr) 70px minmax(0,1fr)' in css,'mobile scoreboard containment missing')
req('validate(n)' in wizard and 'Step ${step} of 4' in wizard,'wizard validation/progress missing')
qtp=read('js/live-quick-time-pad-v7-64-9.js' if 'live-quick-time-pad-v7-64-9.js' in game else 'js/live-quick-time-pad-v7-64-8.js')
req('clock.dispatchEvent(new Event("blur"))' in qtp,'Quick Time Pad must sync through existing protected blur handler')
req('m>15||s>59' in qtp and 'raw.length<=2' in qtp,'Quick Time Pad parser must preserve shorthand/range rules')
print('WPI MOBILE GAME SETUP 7.64.4 TEST PASSED')
