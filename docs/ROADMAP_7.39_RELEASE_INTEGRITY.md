# CPI 7.39 — Release Integrity Foundation

## Purpose

CPI has accumulated strong public features through many incremental releases, but the repository contains duplicated implementations, stale release references, missing source inputs, and assets that are present in the public experience but not reproducible from the current repository archive.

Release 7.39 establishes a migration-safe quality gate. It does **not** hide existing debt and it does **not** require every legacy issue to be corrected at once. Instead:

1. Existing issues are captured in a checked-in baseline.
2. Every existing issue remains visible in the audit report.
3. Any **new** blocking issue fails `./release-check` immediately.
4. `./release-check --strict` is represented by running `python3 scripts/release-audit.py --strict` and will fail until all legacy blockers are removed.

## Checks included

- Canonical release metadata and version consistency.
- JSON parse validation across the repository.
- JavaScript syntax validation with Node.
- Broken local links, scripts, stylesheets, downloads, and images in HTML.
- Missing local assets referenced by CSS and primary data files.
- Duplicate HTML IDs.
- Ranking group coverage, rank continuity, duplicate teams, required fields, age/gender consistency, and invalid embedded JO seeds.
- Existing Boys and Girls JO release validation.

## Standard release command

```bash
./release-check
```

A JSON report is written to:

```text
qa/release-audit-latest.json
```

## Migration policy

The baseline is a temporary ledger, not an exception forever. Each cleanup release should remove a category of baseline debt:

1. Restore and normalize the canonical logo library.
2. Restore missing QA downloads or remove dead links.
3. Consolidate release/version metadata.
4. Make the ranking engine reproducible from checked-in source data.
5. Move deployable files into a generated `dist/` package.

No new issue should ever be added to the baseline merely to make a release pass.

## Safe build behavior

- `./build-cpi` no longer rewrites the logo registry from an empty `assets-original/logos/` directory.
- `./build.sh` now runs an engine-input preflight and stops before writing empty ranking outputs when the required registries or raw tournament CSV files are absent.
- The existing public release remains static and reproducible only after the missing canonical logo/source assets are restored; this release makes that limitation explicit rather than silently succeeding.
