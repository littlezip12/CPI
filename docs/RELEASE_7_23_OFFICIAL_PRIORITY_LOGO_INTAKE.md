# CPI Release 7.23 — Official Priority Logo Intake

Date: 2026-07-12

## Purpose

Replace the highest-priority generated CPI logo badges with real club logo assets where clean downloadable logo files were available from the provided club websites or a matching secondary logo directory.

This release does **not** change rankings, CPI scores, routing, layouts, page behavior, or ranking pipeline files.

## Updated canonical assets

The following canonical logo files were updated:

| Slug | Source status |
|---|---|
| `908` | Secondary source match; official page did not expose a clean downloadable logo |
| `imperial` | Official source |
| `sbwpc` | Official source |
| `san-clemente` | Official source |
| `san-clemente-red` | Official source alias |
| `sj-express` | Official source |
| `san-jose-express` | Official source alias |
| `shore-aquatics` | Official source |
| `long-beach-shore` | Official source alias |
| `orwp` | Official source |
| `norco` | Secondary source match; official site was blocked |
| `regency` | Official source crop |
| `shaq` | Official source crop |

## Added audit file

`data/logo-source-audit-7-23.json`

This file records which logo sources were processed and which high-priority clubs still need clean official PNG/JPG/WebP uploads.

## Follow-up list

Several provided sites did not expose clean downloadable logo files in this pass, or returned blocked/AVIF-only assets. These remain on the official-logo follow-up list:

- Del Mar
- Greenwich
- Back Bay
- San Diego Shores / SD Shores
- CDM
- OVAC / Palos Verdes
- Foothill
- Aetos
- Santa Cruz
- Legacy
- CHAWP
- Temple City
- Supreme
- Arroyo Grande
- Sand Canyon
- Viking
- Carlsbad
- Club Daygo
- Los Alamitos
- Laguna Beach
- Meridian

## Validation notes

- All updated files are saved as canonical `.webp` assets under `assets/logos/canonical/`.
- Team pages continue to inherit club logos from existing data paths.
- Existing CPI fallback badges remain in place for clubs still awaiting official logo files.
