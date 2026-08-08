#!/usr/bin/env python3
from pathlib import Path
import json, sys
root=Path(__file__).resolve().parents[1]
errors=[]
js=(root/'js/live-sandbox-v7-56-10.js').read_text()
html=(root/'live-sandbox.html').read_text()
site=json.loads((root/'config/site-release.json').read_text())
checks=[
 ('release marker', 'const RELEASE = "7.56.10";' in js),
 ('fresh games deliver every action', 'messageFrequency: "all"' in js),
 ('save event retained', 'id:"save"' in js),
 ('field block retained', 'id:"field_block"' in js),
 ('goal retained', 'id:"goal"' in js),
 ('final sync is awaited', 'const result = await pushRemoteState();' in js),
 ('final sync no background-only schedule', 'scheduleRemoteSync(100);' not in js[js.find('async function endGame'):js.find('function downloadLog')]),
 ('7.56.10 scorer asset', 'js/live-sandbox-v7-56-10.js?v=7.56.10' in html),
 ('site release', site.get('version')=='7.56.10'),
]
for name,ok in checks:
    if not ok: errors.append(name)
if errors:
    print('WPI POST-HANDOFF DELIVERY 7.56.10 TEST FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('WPI POST-HANDOFF DELIVERY 7.56.10 TEST PASSED')
print(' - Goal, Save, and Field Block remain structured events')
print(' - Fresh games default to every recorded action for GroupMe')
print(' - Final Whistle uses an awaited final server sync')
