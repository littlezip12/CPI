# CPI Canonical Identity Layer

Release 7.40.0 introduces one shared identity model for clubs and teams.

## Generated files

- `manifest.json` — release metadata and counts.
- `clubs.json` — canonical clubs. Multiple legacy club slugs can point to one club ID.
- `teams.json` — season, age, gender, club, level, and stable team IDs.
- `aliases.json` — provenance-preserving aliases.
- `index.json` — complete lookup index for scripts and future ingestion.
- `runtime.js` — browser-ready index used by JO schedule pages.

## Source of truth

Run from the repository root:

```bash
python3 scripts/build-identity-registry.py
```

The build reads `rankings.json`, `clubs.json`, and `config/identity-manual-overrides.json`. Manual exceptions belong in the override file; generated files should not be hand-edited.

## Resolution rule

Team aliases resolve using season + age group + gender first. An unscoped fallback is available only when an alias maps to exactly one team across the full registry. Ambiguous aliases are excluded from automatic resolution and written to the QA report.

Tournament seeds are presentation metadata and are never included in canonical team names or IDs.
