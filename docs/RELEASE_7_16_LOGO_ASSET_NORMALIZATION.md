# Release 7.16 — Logo Asset Normalization

## Objective

Normalize verified CPI club logo assets so rankings, club pages, and team pages pull from predictable, production-safe logo files.

## What changed

- Created canonical WebP logo assets in `assets/logos/canonical/`.
- Converted 30 verified bitmap logos to 512x512 WebP canvases.
- Updated `club-registry.csv`, `club-registry.json`, `logo_map.csv`, `rankings.json`, `clubs.json`, `platform.json`, and `data.js` to reference canonical logo paths where available.
- Added `data/logo-audit-7-16.json`, refreshed `data/logo-registry.json`, and added logo path validation.
- Adjusted logo display CSS to reduce harsh circular/boxed treatments and better preserve each logo's natural aspect ratio.

## What did not change

- Rankings order did not change.
- CPI scores did not change.
- Ranking model logic did not change.
- Page routing did not change.
- Placeholder SVGs were not replaced unless a verified bitmap source existed.

## Remaining work

Some clubs still use generated placeholder SVGs or source images with baked-in backgrounds. For best final polish, replace those with transparent PNG or SVG originals.

## Broken logo path cleanup

Generated 48 lightweight SVG placeholders for previously missing logo references so ranking and team pages do not show broken images while source art is pending.
