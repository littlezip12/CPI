# CPI 7.47 — Tournament Launch Readiness & Live Operations

## Purpose

CPI now has one tournament-agnostic operations layer. Junior Olympics Weekend 1 and Weekend 2 are the first live production implementation; Quiksilver Cup, Boys Futures Super Finals, and Girls US Club Championships remain explicitly registered for later normalized-data onboarding.

## Live controls

Each live division is evaluated for:

- A banked normalized schedule.
- Exact match to its verified schedule baseline.
- Official-source readability or protected fallback state.
- Fresh source verification.
- Blocking data defects.
- Partial and placeholder score states.
- Public tournament page wiring and optional published-page reachability.
- Reconciled scheduled and completed game counts.

## Alert policy

Blocking and warning checks produce a generated operations packet. The scheduled GitHub workflow updates one repository issue rather than creating duplicate incidents. When the next run is healthy, CPI closes the incident automatically.

## Source policy

- One authoritative source per live division.
- No automatic source blending.
- No silent failover to a different provider.
- Last-known-good snapshots remain available when a live source is invalid.
- Blank, partial, and placeholder scores do not become finals.
- Ranking changes remain manual.

## Pages deployment

The sync workflow requests a GitHub Pages rebuild after it commits updated tournament evidence so generated dashboards can publish without waiting for a manual repository push. The request is non-blocking; the live JO viewers still read their official Google Sheets directly in the browser.

## Next onboarding

After both JO weekends prove the operations framework under real results, onboard historical normalized data for:

1. Quiksilver Cup.
2. Boys Futures Super Finals.
3. Girls US Club Championships.
