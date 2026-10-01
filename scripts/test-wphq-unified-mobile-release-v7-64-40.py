#!/usr/bin/env python3
from pathlib import Path
import hashlib
import json
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []
require_ios = '--require-ios' in sys.argv[1:]

def req(cond, msg):
    if not cond:
        errors.append(msg)

def semver_at_least(value, floor):
    try:
        return tuple(int(x) for x in str(value).split('.')[:3]) >= tuple(int(x) for x in str(floor).split('.')[:3])
    except Exception:
        return False

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

site = json.loads((ROOT/'config/site-release.json').read_text())
package = json.loads((ROOT/'package.json').read_text())
lock = json.loads((ROOT/'package-lock.json').read_text())
contract = json.loads((ROOT/'mobile/app-contract.json').read_text())
release = site.get('version')

req(semver_at_least(release, '7.64.40'), 'site release must preserve 7.64.40 or later')
req(package.get('version') == release, 'package.json version must exactly match site release')
req(lock.get('version') == release, 'package-lock top-level version must exactly match site release')
req(lock.get('packages',{}).get('',{}).get('version') == release, 'package-lock root package version must exactly match site release')
req(contract.get('release') == release, 'mobile app contract release must exactly match site release')
req(site.get('nativeMobileUnifiedRelease') == '7.64.39', 'unified native release marker missing')
req(site.get('nativeMobileBundlePolicy') == 'same-source-generated-bundle', 'same-source native bundle policy missing')

scripts = package.get('scripts',{})
req(scripts.get('mobile:prepare') == 'python3 scripts/build-mobile-web-v7-64-39.py', 'mobile:prepare must use release-aware 7.64.39 builder')
req(scripts.get('mobile:verify') == 'python3 scripts/test-wphq-unified-mobile-release-v7-64-40.py', 'mobile:verify must use 7.64.40 parity verifier')
req('npx cap sync ios' in scripts.get('mobile:sync:ios',''), 'mobile:sync:ios must sync the generated bundle into iOS')
for token in ['mobile:preflight:ios','mobile:prepare','npx cap sync ios','mobile:verify -- --require-ios','npx cap open ios']:
    req(token in scripts.get('mobile:update:ios',''), f'mobile:update:ios missing {token}')

builder = ROOT/'scripts/build-mobile-web-v7-64-39.py'
build = subprocess.run([sys.executable, str(builder)], cwd=ROOT, text=True, capture_output=True)
if build.returncode:
    errors.append('mobile bundle build failed: ' + (build.stdout + build.stderr).strip())
else:
    www = ROOT/'mobile/www'
    manifest = json.loads((www/'wphq-native-release.json').read_text())
    req(manifest.get('sourceRelease') == release, 'generated native release manifest does not match web release')
    req(json.loads((www/'config/site-release.json').read_text()).get('version') == release, 'generated site-release does not match web release')

    html_pages = list(www.rglob('*.html'))
    req(bool(html_pages), 'generated mobile bundle contains no HTML pages')
    for page in html_pages:
        html = page.read_text(encoding='utf-8', errors='ignore')
        req(f'<meta name="wphq-native-bundle-release" content="{release}">' in html, f'{page.relative_to(www)} missing exact native source-release marker')

    parity_files = [
        'config/site-release.json',
        'js/live-team-insights-v7-64-38.js',
        'js/live-account-security-v7-64-40.js',
        'js/live-dashboard-v7-64-40.js',
        'js/live-club-onboarding-v7-64-40.js',
        'js/live-organization-insights-v7-64-40.js',
        'js/organization-profile-v7-64-40.js',
        'js/live-scale-readiness-v7-64-40.js',
        'js/champions-cup-qualifiers-v7-64-40.js',
        'css/live-team-insights-v7-64-38.css',
                'js/live-password-reset-v7-64-38.js',
        'js/live-login-v7-64-33-1.js',
        'js/live-organization-insights-v7-64-34.js',
        'js/wphq-native-auth-v7-64-26.js',
        'js/wphq-native-team-links-v7-64-28.js',
        'css/wphq-native-shell-v7-64-23.css',
    ]
    for rel in parity_files:
        src, dst = ROOT/rel, www/rel
        req(src.exists(), f'source parity file missing: {rel}')
        req(dst.exists(), f'generated parity file missing: {rel}')
        if src.exists() and dst.exists():
            req(sha(src) == sha(dst), f'generated mobile asset drifted from web source: {rel}')

    # If Capacitor has already synced iOS locally, prove that Xcode's generated public
    # payload is also on the same release. It is intentionally gitignored and may be absent
    # in a clean repository/archive before `npx cap sync ios`.
    ios_public = ROOT/'ios/App/App/public'
    if require_ios:
        req(ios_public.exists(), 'iOS public bundle is missing; run npm run mobile:sync:ios')
        if ios_public.exists():
            native_manifest = ios_public/'wphq-native-release.json'
            req(native_manifest.exists(), 'iOS public bundle has no native release manifest; run npm run mobile:sync:ios')
            if native_manifest.exists():
                synced = json.loads(native_manifest.read_text())
                req(synced.get('sourceRelease') == release, 'iOS public bundle is stale relative to the current web release')
                for rel in parity_files:
                    src, dst = ROOT/rel, ios_public/rel
                    req(dst.exists(), f'iOS parity file missing after sync: {rel}')
                    if src.exists() and dst.exists():
                        req(sha(src) == sha(dst), f'iOS bundle drifted from web source: {rel}')
    elif ios_public.exists():
        native_manifest = ios_public/'wphq-native-release.json'
        if native_manifest.exists():
            try:
                synced = json.loads(native_manifest.read_text())
                if synced.get('sourceRelease') != release:
                    print(f'WPHQ native note: local Xcode payload is {synced.get("sourceRelease")} and will be refreshed by npm run mobile:update:ios')
            except Exception:
                print('WPHQ native note: local Xcode payload manifest is unreadable and will be refreshed by npm run mobile:update:ios')
        else:
            print('WPHQ native note: local Xcode payload predates release manifests and will be refreshed by npm run mobile:update:ios')

readme=(ROOT/'mobile/README.md').read_text()
for token in ['same repository-root source', 'npm run mobile:update:ios', 'TestFlight/App Store binary']:
    req(token in readme, f'mobile README missing unified-release guidance: {token}')

if errors:
    print('WPHQ 7.64.40 UNIFIED WEB / NATIVE RELEASE TEST FAILED')
    for e in errors:
        print(' -', e)
    sys.exit(1)

print('WPHQ 7.64.40 UNIFIED WEB / NATIVE RELEASE TEST PASSED')
print(f' - web release {release} is the single source for the generated Capacitor bundle')
print(' - current Team Insights/auth/organization/native assets are copied byte-for-byte into mobile/www')
print(' - every native HTML page carries the exact source-release marker')
print(' - normal release gates tolerate a stale pre-sync Xcode payload; mobile:update:ios requires strict post-sync parity before Xcode opens')
print(' - TestFlight/App Store distribution remains a separate native binary delivery step, not a second codebase')
