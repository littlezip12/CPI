# CPI 7.42 — Full JO Data Banking & Tournament Evidence

## Purpose

Release 7.42 turns the normalized tournament pipeline into a usable evidence system. The public JO viewers remain live Google Sheet readers, while the repository stores auditable snapshots for profiles and ranking review.

## Data flow

1. GitHub Actions checks all 23 enabled JO divisions every two hours.
2. Raw CSV rows are preserved under `data/tournaments/raw/`.
3. Games are normalized with source rows, stable game IDs, clean team names, separate seeds, scores, bracket references, and participant IDs.
4. Canonical CPI teams retain their 7.40 team IDs.
5. Teams not in the CPI ranking registry receive stable `tournament-team-*` IDs. They remain outside published rankings until reviewed.
6. `build-tournament-evidence.py` generates profile evidence and two review queues.
7. Team profiles consume `data/tournaments/evidence/runtime.js`.
8. `tournament-evidence.html` exposes the manual review queue.

## Ranking safety

No tournament result changes a published ranking automatically. Final results move a team from `schedule_only` to `ready_for_ranking_review`. Ranking changes remain a separate, reviewed release.

## Current bootstrap

The checked-in baseline includes the 14U Girls Championship schedule:

- 192 normalized games
- 48 stable tournament participant identities
- 39 canonical ranked-team matches
- 9 tournament-only identities
- 0 blocking normalization errors

After the first successful GitHub workflow run, every reachable Weekend 1 and Weekend 2 tab will be banked and the evidence outputs will rebuild automatically.
