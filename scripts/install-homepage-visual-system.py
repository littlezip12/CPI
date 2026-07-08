#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

CSS_TAG = '<link rel="stylesheet" href="css/homepage-visual-system.css">'
JS_TAG = '<script src="js/homepage-visual-system.js"></script>'

if not INDEX.exists():
    raise SystemExit("Missing index.html")

text = INDEX.read_text(encoding="utf-8")
original = text

if CSS_TAG not in text:
    text = text.replace("</head>", f"  {CSS_TAG}\n</head>") if "</head>" in text else CSS_TAG + "\n" + text

if JS_TAG not in text:
    text = text.replace("</body>", f"  {JS_TAG}\n</body>") if "</body>" in text else text + "\n" + JS_TAG + "\n"

INDEX.write_text(text, encoding="utf-8")

if text != original:
    print("Updated index.html")
else:
    print("index.html already includes Homepage Visual System")
