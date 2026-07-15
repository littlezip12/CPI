# CPI 7.40 — Canonical Identity Foundation

## Purpose

CPI previously repeated club and team names across rankings, profiles, tournament tools, QA files, and build scripts. Each surface could interpret the same source name differently. Release 7.40 introduces stable IDs and one scope-aware alias system without disrupting the live product.

## Delivered

- 138 canonical clubs generated from 143 legacy club records.
- 506 canonical 2026 team identities across 12U–18U Boys and Girls rankings.
- Stable IDs for club, season, age group, gender, and team identity.
- Functional team level, depth order, squad descriptor, and legacy URL references.
- Alias indexes scoped by season, age, and gender.
- Safe unscoped fallback only for globally unique aliases.
- Shared browser resolver used by both JO schedule applications.
- Canonical IDs embedded in ranking and club exports.
- Compatibility registries for the existing engine-v2 prototype.
- Automated identity validation in `./release-check`.

## Duplicate club convergence

The following legacy record families now point to one canonical club ID:

- Arroyo Grande / `arroyogrande`
- San Diego Shores / `sd-shores`
- San Jose Express / `sj-express`
- Santa Barbara / `sbwpc`
- Patriot / `patriot-red`

Legacy URLs remain available during migration. Public club-card consolidation can occur later without changing canonical IDs.

## Deliberately deferred

- Replacing legacy public URLs with canonical-ID URLs.
- Adding unranked JO-only teams to the canonical registry.
- Normalizing historical tournament games into a shared game schema.
- Merging duplicate public club cards and profile pages.

Those items belong to the normalized tournament ingestion and presentation consolidation phases.
