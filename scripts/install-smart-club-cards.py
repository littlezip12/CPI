#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "clubs.html"
CSS_TAG = '<link rel="stylesheet" href="css/smart-club-cards.css">'
JS_TAG = '<script src="js/smart-club-cards.js"></script>'

def main():
    if not TARGET.exists():
        raise SystemExit("Missing clubs.html")

    text = TARGET.read_text(encoding="utf-8")
    original = text

    if CSS_TAG not in text:
        text = text.replace("</head>", f"  {CSS_TAG}\n</head>") if "</head>" in text else CSS_TAG + "\n" + text

    if JS_TAG not in text:
        text = text.replace("</body>", f"  {JS_TAG}\n</body>") if "</body>" in text else text + "\n" + JS_TAG + "\n"

    if text != original:
        TARGET.write_text(text, encoding="utf-8")
        print("Updated clubs.html")
    else:
        print("clubs.html already includes smart club cards")

if __name__ == "__main__":
    main()
