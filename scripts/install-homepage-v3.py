#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

if not INDEX.exists():
    raise SystemExit("Missing index.html")

text = INDEX.read_text(encoding="utf-8")

for css in [
    "css/premium-homepage.css","css/homepage.css","css/hero-v2.css","css/editorial-feed.css",
    "css/at-a-glance.css","css/newsletter-footer.css","css/homepage-visual-system.css",
    "css/homepage-v7-cleanup.css","css/hero-polish.css","css/header-order-fix.css",
    "css/premium-homepage-polish.css","css/homepage-layout-lock.css","css/header-top-fix.css"
]:
    text = re.sub(r'\\s*<link rel="stylesheet" href="' + re.escape(css) + r'">\\s*', '\\n', text)

for script in [
    "js/site-shell.js","js/premium-homepage.js","js/homepage-loader.js","js/hero-v2.js",
    "js/editorial-feed.js","js/at-a-glance.js","js/newsletter-footer.js",
    "js/homepage-visual-system.js","js/homepage-v7-cleanup.js","js/hero-polish.js",
    "js/header-order-fix.js","js/premium-homepage-polish.js","js/homepage-layout-lock.js",
    "js/header-top-fix.js"
]:
    text = re.sub(r'\\s*<script src="' + re.escape(script) + r'"></script>\\s*', '\\n', text)

if '<link rel="stylesheet" href="css/homepage-v3.css">' not in text:
    text = text.replace("</head>", '  <link rel="stylesheet" href="css/homepage-v3.css">\\n</head>')

body = '''<body>
  <script src="data.js"></script>
  <script src="js/app.js"></script>
  <script src="js/command-palette.js"></script>
  <script src="js/homepage-v3.js"></script>
</body>'''

text = re.sub(r'<body>.*?</body>', body, text, count=1, flags=re.S)
INDEX.write_text(text, encoding="utf-8")
print("Installed deterministic Homepage V3")
