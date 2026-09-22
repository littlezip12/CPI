# WPI 7.64.18 — Water Polo HQ Brand Foundation

## Purpose

7.64.18 begins the controlled consumer-facing transition from **WPI / Water Polo Index** to **Water Polo HQ (WPHQ)** while preserving the mature scoring, analytics, ranking, GroupMe, Supabase, and tournament foundations.

This is a front-end brand-foundation release. It does **not** rename database objects, RPCs, internal WPI identifiers, scoring contracts, or historical release files.

**Water Polo Index remains the name of the ranking methodology.** Water Polo HQ becomes the broader consumer/platform brand.

## What changes

- New Water Polo HQ / WPHQ logo system and app icons.
- New light visual foundation: white, pale blue, navy, blue, and cyan.
- Universal shell receives the Water Polo HQ identity at runtime.
- Homepage receives the new brand and lighter presentation.
- PWA / installable experience becomes **Water Polo HQ**, short name **WPHQ**.
- Key public/supporter entry surfaces move from WPI Live language to Water Polo HQ.
- Offline shell and PWA assets are updated to the new identity.
- Brand configuration is added to `config/site-release.json` and `platform.json`.
- Historical release gates are made compatible with 7.64.18 without weakening their behavioral assertions.

## Deliberately unchanged

- Supabase schema, RLS, migrations, Edge Functions, Auth behavior, and data.
- Live scoring behavior and game records.
- GroupMe delivery behavior.
- Player/team analytics calculations and roster logic.
- Ranking engine and ranking data.
- Existing internal WPI identifiers that users do not see.
- Water Polo Index as the rankings methodology name.

A deeper sweep of remaining operational/user-facing `WPI Live` copy is intentionally deferred to a later controlled release rather than handled with a risky global replacement.

## Install

From the repository root after applying the 7.64.18 patch:

```bash
./release-check-live-7.64.18
```

Then run the complete historical release gate:

```bash
./release-check-clean
```

No Supabase migration or Edge Function deployment is required.

## Suggested commit

`WPI 7.64.18 — Water Polo HQ Brand Foundation`
