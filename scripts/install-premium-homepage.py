#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "index.html"
CSS = '<link rel="stylesheet" href="css/premium-homepage.css">'
JS = '<script src="js/premium-homepage.js"></script>'

def main():
    if not TARGET.exists():
        raise SystemExit("Missing index.html")

    text = TARGET.read_text(encoding="utf-8")
    original = text

    if CSS not in text:
        text = text.replace("</head>", f"  {CSS}\n</head>") if "</head>" in text else CSS + "\n" + text

    if JS not in text:
        text = text.replace("</body>", f"  {JS}\n</body>") if "</body>" in text else text + "\n" + JS + "\n"

    if text != original:
        TARGET.write_text(text, encoding="utf-8")
        print("Updated index.html")
    else:
        print("index.html already includes premium homepage")

if __name__ == "__main__":
    main()
