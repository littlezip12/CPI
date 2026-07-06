# CPI 5.0 Foundation — Logo Pipeline

## What this adds

- `scripts/build-logos.py`
- `scripts/validate-assets.py`
- `assets-original/logos/`
- `assets/logos/`
- `data/logo-registry.json` after the builder runs

## Key rule

Do not rename `.jpg` to `.webp` manually. That does not convert the file.

Use the builder.

## Workflow

From Terminal:

```bash
cd ~/Documents/GitHub/CPI

python3 scripts/build-logos.py
python3 scripts/validate-assets.py
```

If validation passes:

```bash
git add assets assets-original data scripts data.js
git commit -m "Add CPI logo pipeline"
git push
```

## How to use

Put raw/original logos here:

```text
assets-original/logos/
```

Examples:

```text
Skip.png
Rancho Tsunami.avif
Santa Barbara.webp
Commerce.jpg
CIU Polo.jpg
```

The script creates normalized website-ready files here:

```text
assets/logos/
```

Examples:

```text
skip.webp
rancho-tsunami.webp
santa-barbara.webp
commerce.webp
ciu-polo.webp
```

## What the builder does

- Converts PNG/JPG/JPEG/AVIF/WebP to WebP.
- Centers each logo on a consistent 512x512 transparent canvas.
- Adds consistent padding.
- Converts filenames to lowercase kebab-case.
- Creates `data/logo-registry.json`.
- Updates matching `data.js` logo paths where possible.
- Preserves SVGs as SVG copies for now.
