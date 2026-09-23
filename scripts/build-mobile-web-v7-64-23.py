#!/usr/bin/env python3
from pathlib import Path
import shutil
import re

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "mobile" / "www"

RUNTIME_DIRS = ["assets", "club", "config", "css", "data", "js", "stories", "tournaments"]
ROOT_SUFFIXES = {".html", ".js", ".css", ".json", ".csv", ".webmanifest"}
ROOT_EXCLUDES = {"package.json"}
NATIVE_HEAD = '''<script src="js/wphq-native-shell-v7-64-23.js?v=7.64.23"></script>\n  <link rel="stylesheet" href="css/wphq-native-shell-v7-64-23.css?v=7.64.23">'''

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

# Every native HTML document receives the native marker before page/application scripts execute.
for page in OUT.rglob("*.html"):
    html = page.read_text(encoding="utf-8", errors="ignore")
    html = re.sub(
        r'<meta\s+name=["\']viewport["\']\s+content=["\']([^"\']*)["\']\s*/?>',
        lambda m: f'<meta name="viewport" content="{m.group(1).rstrip(", ")}, viewport-fit=cover">' if 'viewport-fit=cover' not in m.group(1) else m.group(0),
        html,
        count=1,
        flags=re.I,
    )
    if 'wphq-native-shell-v7-64-23.js' not in html:
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

for forbidden in ["scripts", "tests", "supabase", "qa", "docs", ".github", "assets-original", "build"]:
    if (OUT / forbidden).exists():
        raise SystemExit(f"mobile build failed: forbidden source directory copied: {forbidden}")

required = [
    "index.html",
    "live-following.html",
    "live-login.html",
    "live-game.html",
    "live-score.html",
    "organizations.html",
    "assets/branding/wphq-logo-full.png",
    "js/live-pwa-v7-64-23.js",
    "js/wphq-native-shell-v7-64-23.js",
    "css/wphq-native-shell-v7-64-23.css",
]
missing = [rel for rel in required if not (OUT / rel).exists()]
if missing:
    raise SystemExit("mobile build failed: missing runtime files: " + ", ".join(missing))

files = sum(1 for p in OUT.rglob('*') if p.is_file())
bytes_total = sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file())
print(f"WPHQ mobile web bundle ready: {files} files, {bytes_total / (1024*1024):.1f} MiB")
print(" - cold start: live-following.html")
print(" - native marker + safe-area stylesheet: injected into every HTML page")
print(" - browser-only install UI: suppressed in native shell")
print(" - source-only operational directories excluded")
