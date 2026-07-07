#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ROOT_HTML = [
    "index.html","rankings.html","clubs.html","club.html","tournaments.html","methodology.html",
    "team.html","team-profile.html","12u-boys.html","12u-girls.html","14u-boys.html","14u-girls.html",
    "16u-boys.html","16u-girls.html","18u-boys.html","18u-girls.html"
]
CSS_ROOT = '<link rel="stylesheet" href="css/command-palette.css">'
JS_ROOT = '<script src="js/command-palette.js"></script>'
CSS_CLUB = '<link rel="stylesheet" href="../css/command-palette.css">'
JS_CLUB = '<script src="../js/command-palette.js"></script>'

def install(path, css, js):
    if not path.exists():
        return False
    text = path.read_text(encoding="utf-8")
    original = text
    if css not in text:
        text = text.replace("</head>", f"  {css}\n</head>") if "</head>" in text else css + "\n" + text
    if js not in text:
        text = text.replace("</body>", f"  {js}\n</body>") if "</body>" in text else text + "\n" + js + "\n"
    if text != original:
        path.write_text(text, encoding="utf-8")
        return True
    return False

def main():
    changed = 0
    for name in ROOT_HTML:
        if install(ROOT / name, CSS_ROOT, JS_ROOT):
            print(f"Updated {name}")
            changed += 1
    club_dir = ROOT / "club"
    if club_dir.exists():
        for path in sorted(club_dir.glob("*.html")):
            if install(path, CSS_CLUB, JS_CLUB):
                print(f"Updated {path.relative_to(ROOT)}")
                changed += 1
    print(f"Command palette install complete. Files changed: {changed}")

if __name__ == "__main__":
    main()
