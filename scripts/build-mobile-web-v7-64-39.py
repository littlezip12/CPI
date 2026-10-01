#!/usr/bin/env python3
from pathlib import Path
import json
import shutil
import re

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "mobile" / "www"

RUNTIME_DIRS = ["assets", "club", "config", "css", "data", "js", "stories", "tournaments"]
ROOT_SUFFIXES = {".html", ".js", ".css", ".json", ".csv", ".webmanifest"}
ROOT_EXCLUDES = {"package.json"}
NATIVE_HEAD = '''<script src="js/wphq-native-shell-v7-64-23.js?v=7.64.23"></script>\n  <script src="js/wphq-native-auth-v7-64-26.js?v=7.64.26"></script>\n  <script src="js/wphq-native-team-links-v7-64-28.js?v=7.64.28"></script>\n  <link rel="stylesheet" href="css/wphq-native-shell-v7-64-23.css?v=7.64.23">'''

site = json.loads((ROOT / "config" / "site-release.json").read_text(encoding="utf-8"))
release = str(site.get("version") or "").strip()
release_name = str(site.get("name") or "").strip()
if not re.fullmatch(r"\d+\.\d+\.\d+", release):
    raise SystemExit("mobile build failed: config/site-release.json has no valid release version")

if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir(parents=True)

for dirname in RUNTIME_DIRS:
    src = ROOT / dirname
    if src.exists():
        shutil.copytree(src, OUT / dirname)

for src in ROOT.iterdir():
    if not src.is_file() or src.name in ROOT_EXCLUDES:
        continue
    if src.suffix.lower() in ROOT_SUFFIXES:
        shutil.copy2(src, OUT / src.name)

# Every native HTML document receives the native marker and exact source-release marker
# before page/application scripts execute. This makes the native bundle traceable to the
# same release as the web product while keeping the web codebase as the single source.
release_meta = f'<meta name="wphq-native-bundle-release" content="{release}">'
for page in OUT.rglob("*.html"):
    html = page.read_text(encoding="utf-8", errors="ignore")
    html = re.sub(
        r'<meta\s+name=["\']viewport["\']\s+content=["\']([^"\']*)["\']\s*/?>',
        lambda m: f'<meta name="viewport" content="{m.group(1).rstrip(", ")}, viewport-fit=cover">' if 'viewport-fit=cover' not in m.group(1) else m.group(0),
        html,
        count=1,
        flags=re.I,
    )
    if 'name="wphq-native-bundle-release"' not in html:
        html = re.sub(r"(<head[^>]*>)", r"\1\n  " + release_meta, html, count=1, flags=re.I)
    if 'wphq-native-team-links-v7-64-28.js' not in html:
        html = re.sub(r"(<head[^>]*>)", r"\1\n  " + NATIVE_HEAD, html, count=1, flags=re.I)
    page.write_text(html, encoding="utf-8")

index = OUT / "index.html"
if not index.exists():
    raise SystemExit("mobile build failed: index.html missing")

html = index.read_text(encoding="utf-8")
launch = '''<script data-wphq-native-entry="7.64.23">\n(function(){\n  try {\n    var p = new URLSearchParams(window.location.search);\n    if (!p.has('home')) { window.location.replace('live-following.html?native=1'); }\n  } catch (_) {}\n})();\n</script>'''
if 'data-wphq-native-entry="7.64.23"' not in html:
    html = re.sub(r"(<head[^>]*>)", r"\1\n  " + launch, html, count=1, flags=re.I)
index.write_text(html, encoding="utf-8")

# Deterministic manifest travels with the generated bundle and into the Capacitor shell.
manifest = {
    "schemaVersion": 1,
    "sourceRelease": release,
    "sourceReleaseName": release_name,
    "runtime": "Capacitor 8",
    "generatedFrom": "repository-root",
    "webDir": "mobile/www",
    "coldStartRoute": "live-following.html",
    "nativeDistribution": "requires-capacitor-sync-and-native-binary-install-or-TestFlight-build"
}
(OUT / "wphq-native-release.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

for forbidden in ["scripts", "tests", "supabase", "qa", "docs", ".github", "assets-original", "build"]:
    if (OUT / forbidden).exists():
        raise SystemExit(f"mobile build failed: forbidden source directory copied: {forbidden}")

required = [
    "index.html",
    "live-following.html",
    "live-login.html",
    "live-game.html",
    "live-score.html",
    "live-team-insights.html",
    "live-account-security.html",
    "live-password-reset.html",
    "live-privacy.html",
    "organizations.html",
    "assets/branding/wphq-logo-full.png",
    "js/live-pwa-v7-64-23.js",
    "js/wphq-native-shell-v7-64-23.js",
    "js/wphq-native-auth-v7-64-26.js",
    "js/wphq-native-team-links-v7-64-28.js",
    "js/live-login-v7-64-27.js",
    "js/live-login-v7-64-33-1.js",
    "js/live-public-auth-cta-v7-64-33.js",
    "js/live-following-v7-64-27.js",
    "js/live-team-share-v7-64-28.js",
    "js/team-hub-v7-64-28.js",
    "js/live-organization-insights-v7-64-34.js",
    "css/live-organization-insights-v7-64-34.css",
    "js/live-team-insights-v7-64-38.js",
    "css/live-team-insights-v7-64-38.css",
    "js/live-account-security-v7-64-38.js",
    "js/live-password-reset-v7-64-38.js",
    "css/wphq-native-shell-v7-64-23.css",
    "config/site-release.json",
    "wphq-native-release.json",
]
missing = [rel for rel in required if not (OUT / rel).exists()]
if missing:
    raise SystemExit("mobile build failed: missing runtime files: " + ", ".join(missing))

files = sum(1 for p in OUT.rglob('*') if p.is_file())
bytes_total = sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file())
print(f"WPHQ mobile web bundle ready: {files} files, {bytes_total / (1024*1024):.1f} MiB")
print(f" - source release: {release} — {release_name}")
print(" - web and native use the same repository-root source")
print(" - cold start: live-following.html")
print(" - native marker + source-release marker + safe-area stylesheet injected into every HTML page")
print(" - browser-only install UI: suppressed in native shell")
print(" - native team links: waterpolohq://team/<team UUID> → My Teams follow flow")
print(" - source-only operational directories excluded")
