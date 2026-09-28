#!/usr/bin/env python3
from pathlib import Path
import subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
errors = []
def req(cond, msg):
    if not cond: errors.append(msg)

page = (ROOT / 'live.html').read_text()
for token in [
    'id="publicLoginButton"',
    'href="live-login.html?follow=1"',
    '>Log in<',
    'js/live-public-auth-cta-v7-64-33.js?v=7.64.33',
]:
    req(token in page, f'Live Scores page missing {token}')

runtime_path = ROOT / 'js/live-public-auth-cta-v7-64-33.js'
req(runtime_path.exists(), 'Live Scores auth CTA runtime missing')
if runtime_path.exists():
    runtime = runtime_path.read_text()
    for token in [
        'backend.session()',
        'backend.isAnonymousUser(session.user)',
        'button.style.display = signedIn ? "none" : "";',
        'button.style.display = "";',
    ]:
        req(token in runtime, f'Live Scores auth CTA runtime missing {token}')

for builder_name in ['scripts/build-mobile-web-v7-64-23.py','scripts/build-mobile-web-v7-64-28.py']:
    builder=(ROOT/builder_name).read_text()
    req('"js/live-public-auth-cta-v7-64-33.js"' in builder, f'{builder_name} does not require the Live Scores auth CTA runtime')

build = subprocess.run([sys.executable, str(ROOT/'scripts/build-mobile-web-v7-64-28.py')], cwd=ROOT, text=True, capture_output=True)
if build.returncode:
    errors.append('mobile bundle build failed: ' + (build.stdout + build.stderr).strip())
else:
    generated = (ROOT/'mobile/www/live.html').read_text()
    req('id="publicLoginButton"' in generated, 'generated native Live Scores page missing Log in CTA')
    req('js/live-public-auth-cta-v7-64-33.js?v=7.64.33' in generated, 'generated native Live Scores page missing auth CTA runtime')
    req((ROOT/'mobile/www/js/live-public-auth-cta-v7-64-33.js').exists(), 'generated native bundle missing Live Scores auth CTA JS')

if errors:
    print('WPHQ 7.64.33 LIVE SCORES LOGIN CTA TEST FAILED')
    for e in errors: print(' -', e)
    sys.exit(1)
print('WPHQ 7.64.33 LIVE SCORES LOGIN CTA TEST PASSED')
print(' - signed-out Live Scores has an explicit Log in action')
print(' - Log in uses the supporter/My Teams auth context')
print(' - permanent signed-in sessions hide the redundant Log in action')
print(' - browser and native Live Scores bundles include the same CTA runtime')
