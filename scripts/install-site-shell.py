#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

ROOT_HTML = [
    "index.html","rankings.html","clubs.html","club.html","tournaments.html","methodology.html",
    "team.html","team-profile.html","12u-boys.html","12u-girls.html","14u-boys.html","14u-girls.html",
    "16u-boys.html","16u-girls.html","18u-boys.html","18u-girls.html"
]

def install_tags(path, css_tag, js_tag):
    if not path.exists():
        return False
    text = path.read_text(encoding="utf-8")
    original = text
    if css_tag not in text:
        text = text.replace("</head>", f"  {css_tag}\n</head>") if "</head>" in text else css_tag + "\n" + text
    if js_tag not in text:
        text = text.replace("</body>", f"  {js_tag}\n</body>") if "</body>" in text else text + "\n" + js_tag + "\n"
    if text != original:
        path.write_text(text, encoding="utf-8")
        return True
    return False

def main():
    changed = 0
    for name in ROOT_HTML:
        if install_tags(ROOT / name, '<link rel="stylesheet" href="css/site-shell.css">', '<script src="js/site-shell.js"></script>'):
            print(f"Updated {name}")
            changed += 1

    club_dir = ROOT / "club"
    if club_dir.exists():
        for path in sorted(club_dir.glob("*.html")):
            if install_tags(path, '<link rel="stylesheet" href="../css/site-shell.css">', '<script src="../js/site-shell.js"></script>'):
                print(f"Updated {path.relative_to(ROOT)}")
                changed += 1

    print(f"Site shell install complete. Files changed: {changed}")

if __name__ == "__main__":
    main()
