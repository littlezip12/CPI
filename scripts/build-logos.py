#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageOps, ImageChops
import json
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
ORIGINALS = ROOT / "assets-original" / "logos"
OUTPUT = ROOT / "assets" / "logos" / "canonical"
DATA_DIR = ROOT / "data"
REGISTRY = DATA_DIR / "logo-registry.json"
DATA_JS = ROOT / "data.js"

SUPPORTED = {".png", ".jpg", ".jpeg", ".webp", ".avif", ".bmp", ".tif", ".tiff"}
CANVAS_SIZE = 512
PADDING = 64
WEBP_QUALITY = 90

SHARED_ARTWORK = {
    "lamorinda-brentwood": "lamorinda",
    "vnited": "visalia-united",
    "vegas-patriot": "team-vegas",
    "hilo-grammaz": "hilo-hammahz",
}

ALIASES = {
    "la-jolla-united-a": "la-jolla-united",
    "la-jolla-united-b": "la-jolla-united",
    "san-diego-dons": "sd-dons",
    "patriot-a": "patriot",
    "patriot-b": "patriot",
    "commerce-a": "commerce",
    "skip-a": "skip",
    "rancho-tsunami-a": "rancho-tsunami",
    "devils-gate-a": "devils-gate",
}

def slugify(value):
    value = value.lower().strip()
    value = value.replace("&", " and ")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value).strip("-")
    return ALIASES.get(value, value)

def trim_transparency(img):
    if img.mode != "RGBA":
        return img
    bbox = img.getchannel("A").getbbox()
    return img.crop(bbox) if bbox else img

def remove_simple_white_background(img):
    img = img.convert("RGBA")
    bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
    diff = ImageChops.difference(img, bg).convert("L")
    mask = diff.point(lambda p: 255 if p < 18 else 0)

    w, h = img.size
    edge = []
    for x in range(w):
        edge.append(mask.getpixel((x, 0)))
        edge.append(mask.getpixel((x, h - 1)))
    for y in range(h):
        edge.append(mask.getpixel((0, y)))
        edge.append(mask.getpixel((w - 1, y)))

    edge_white_ratio = sum(1 for p in edge if p == 255) / max(len(edge), 1)
    if edge_white_ratio < 0.55:
        return img

    alpha = img.getchannel("A")
    img.putalpha(ImageChops.subtract(alpha, mask))
    return img

def normalize_raster(src, out):
    img = Image.open(src)
    img = ImageOps.exif_transpose(img).convert("RGBA")
    img = remove_simple_white_background(img)
    img = trim_transparency(img)

    max_dim = CANVAS_SIZE - (PADDING * 2)
    scale = min(max_dim / img.width, max_dim / img.height)
    new_w = max(1, int(img.width * scale))
    new_h = max(1, int(img.height * scale))
    img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (255, 255, 255, 0))
    x = (CANVAS_SIZE - new_w) // 2
    y = (CANVAS_SIZE - new_h) // 2
    canvas.alpha_composite(img, (x, y))

    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out, "WEBP", quality=WEBP_QUALITY, method=6)

def build_registry():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    ORIGINALS.mkdir(parents=True, exist_ok=True)

    registry = {
        "format": "webp",
        "canvasSize": CANVAS_SIZE,
        "padding": PADDING,
        "logos": {},
        "svgCopies": {},
    }

    for src in sorted(ORIGINALS.iterdir()):
        if not src.is_file():
            continue

        ext = src.suffix.lower()
        slug = slugify(src.stem)
        if not slug:
            continue

        if ext in SUPPORTED:
            out = OUTPUT / f"{slug}.webp"
            try:
                normalize_raster(src, out)
                registry["logos"][slug] = f"assets/logos/canonical/{slug}.webp"
                print(f"Built {out.relative_to(ROOT)}")
            except Exception as e:
                print(f"ERROR processing {src.name}: {e}")

        elif ext == ".svg":
            out = OUTPUT / f"{slug}.svg"
            shutil.copy2(src, out)
            registry["logos"][slug] = f"assets/logos/canonical/{slug}.svg"
            registry["svgCopies"][slug] = f"assets/logos/canonical/{slug}.svg"
            print(f"Copied SVG {out.relative_to(ROOT)}")

    for alias, canonical in SHARED_ARTWORK.items():
        src = OUTPUT / f"{canonical}.webp"
        out = OUTPUT / f"{alias}.webp"
        if src.exists():
            shutil.copy2(src, out)
            registry["logos"][alias] = f"assets/logos/canonical/{alias}.webp"
            print(f"Built shared artwork {out.relative_to(ROOT)} from {canonical}")

    REGISTRY.write_text(json.dumps(registry, indent=2), encoding="utf-8")
    print(f"Wrote {REGISTRY.relative_to(ROOT)}")
    return registry

def update_data_js(registry):
    if not DATA_JS.exists():
        print("No data.js found; skipped data.js update.")
        return

    text = DATA_JS.read_text(encoding="utf-8")

    def replace_logo_path(match):
        old_path = match.group(0)
        slug = slugify(Path(old_path).stem)
        if slug in registry["logos"]:
            return registry["logos"][slug]
        return old_path

    new_text = re.sub(r'assets/logos/[^"\']+', replace_logo_path, text)

    if new_text != text:
        DATA_JS.write_text(new_text, encoding="utf-8")
        print("Updated data.js logo paths.")
    else:
        print("No data.js logo path changes needed.")

def main():
    print("CPI Logo Builder")
    print("================")
    print(f"Original logos: {ORIGINALS.relative_to(ROOT)}")
    print(f"Optimized logos: {OUTPUT.relative_to(ROOT)}")
    registry = build_registry()
    update_data_js(registry)
    print("Done. Next: python3 scripts/validate-assets.py")

if __name__ == "__main__":
    main()
