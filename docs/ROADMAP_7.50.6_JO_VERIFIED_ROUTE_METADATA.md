# CPI 7.50.6 — JO Verified Route Metadata Preservation

## Problem

The official Google Sheet can publish current teams and scores while leaving some winner/loser destination cells blank. When the browser replaced the verified schedule with that live response, it lost the route from a completed game into a later pool slot. This caused a selected team to appear tournament-complete even though future game times and locations were already known.

Example: in 14U Girls Championship, Game 26 showed Diablo Alliance A's completed win but the live row omitted the `pt_P1` winner destination. Games 82 and 98 still used `pt_P1`, so search could see them, but the selected-team journey could not connect Diablo Alliance A to those games.

## Resolution

- Keep live scores, teams, and source freshness.
- Merge blank live routing fields from the verified embedded schedule by GMID/game number.
- Infer direct winner/loser destinations from downstream `W#` and `L#` slots when no verified reference exists.
- Store the enriched schedule in browser cache so route continuity persists across refreshes.
- Apply the same behavior to Boys and Girls JO viewers.

## Expected Diablo Alliance A journey

- Game 2: completed win
- Game 26: completed win
- Game 82: Sunday, 11:10 AM, UC Irvine 2, opponent TBD until `pt_P3` resolves
- Game 98: Sunday, 2:30 PM, UC Irvine 2, opponent TBD until `pt_P2` resolves

## Guardrails

This release does not change rankings, normalized tournament datasets, GitHub workflows, or automated ranking publication.
