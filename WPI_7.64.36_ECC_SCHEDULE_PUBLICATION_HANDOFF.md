# WPHQ 7.64.36 — Evan Cousineau Schedule + JO-Style Journey Routing

## Authoritative baseline

Built from the pushed **WPHQ 7.64.35** GitHub ZIP `CPI-main - 2026-09-28T222710.224.zip`. The newest pushed GitHub ZIP remains the authority after user validation/push.

## Current ECC bank

- 2026 Evan Cousineau Memorial Cup — October 3–4, 2026
- 13 divisions
- 335 scheduled games
- 162 tournament team entries
- 18 venues/pools
- 0 official scores/finals in the supplied snapshot
- all 13 source CSVs byte-match the original user uploads

## Routing contract — mimic Junior Olympics

ECC now follows the established JO tournament behavior rather than exposing raw bracket shorthand to users. Internal source references remain intact for correctness, but public display translates them to actual candidate teams. Supported routing forms include:

- winner/loser of a numbered game (`W#3`, `L#10`)
- winner/loser of a named matchup (`W#B1/B4`)
- group placement (`1stA`, `2ndG`, `3rdH`)
- routed group slots (`G1(1stA)`, `P4(4thF)`)

All **376 bracket-dependent participant sides** currently have non-empty source-backed candidate team sets. Raw `W#`, `L#`, `1stA`, etc. are routing data, not parent-facing matchup labels.

When results are available, the browser runtime resolves:

1. winner/loser references to the actual source-game winner/loser;
2. completed round-robin groups by wins, goal differential, goals for, then source seed;
3. ordinal group references such as `2ndA` into the actual team;
4. downstream possible paths so eliminated branches disappear and the actual next team/game remains.

A dedicated runtime regression simulates results and verifies both numbered W/L routing and Group A placement resolution.

## Lamorinda 14U Boys A regression

Confirmed Saturday games:
- Game 1 — Oct 3, 8:00 AM, Beckman HS — Lamorinda A vs SoCal Patriots Gold
- Game 7 — Oct 3, 1:00 PM, Beckman HS — San Diego Dons Red vs Lamorinda A

Possible Sunday branches are source-backed and visible with actual candidate team names:
- Game 20 if 1st in Group A
- Game 19 if 2nd in Group A
- Game 16 if 3rd in Group A
- downstream placement games from those branches are also preserved

## Source architecture

The supplied/public OneDrive workbook is the current **official schedule authority**. The checked-in normalized bank is the application schedule payload and retains stable game IDs.

The **official scores/results source is deliberately separate and replaceable**. It is currently marked pending. If OneDrive proves to be the fastest live-results source, it can become the result overlay; if a Google Sheet, public result page, or other source updates faster, that source can be connected instead without rebuilding the ECC tournament model.

The viewer polls the WPHQ repository event payload every 60 seconds so any ingested/published update can appear without a page redesign. This polling does not claim that OneDrive scores are being ingested today.

## Parser correction

The abandoned first 7.64.36 candidate incorrectly allowed the generic results parser to interpret ECC `TIME` as `winnerTo` and `LOCATION` as `loserTo`. The corrected builder explicitly clears those fabricated advancement fields and derives ECC routing only from authoritative participant references. The focused gate checks every normalized game for recurrence of this defect.

## Validation

`./release-check-live-7.64.36` passes, including:
- focused ECC schedule/routing QA
- dynamic JS route simulation
- 7.64.35 Team Stats regression
- 7.64.34 Organization Insights regression
- 7.64.33 auth regression
- 7.64.32 scorer regression
- 7.64.31 GroupMe/finalization reliability regression
- protected 7.64.30 / 7.64.11 game-day checks

No Supabase migration or Edge Function deployment is required.
