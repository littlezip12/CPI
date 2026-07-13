# CPI Release 7.23.6 — Logo Restore Hotfix

## Purpose

This hotfix restores the complete canonical logo library after a partial logo batch was installed in a way that replaced the existing `assets/logos/canonical/` folder.

The 7.23.x logo batches were intended to add/overwrite specific official logo assets. If the folder was replaced instead of merged, many existing canonical logos were deleted locally, which caused logos to stop rendering across pages.

## What changed

- Restored the full canonical logo set from the latest complete logo library.
- Re-applied the 7.23 official priority logo updates.
- Re-applied the cumulative 7.23.5 screenshot logo updates.
- Included the full `assets/` folder so replacing the folder will not remove existing assets.
- Added this release note and a logo restore audit.

## What did not change

- Rankings
- CPI scores
- Ranking model
- Pipeline files
- Page layouts
- Routing
- Team/club data

## Install guidance

Drag/drop the package contents into the CPI repo root and replace files when prompted. This package includes the full `assets/` folder intentionally, so replacing the folder is safe for this hotfix.
