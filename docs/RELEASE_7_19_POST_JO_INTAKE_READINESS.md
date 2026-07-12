# Release 7.19 — Post-JO Intake Readiness

## Purpose

Release 7.19 prepares California Polo Index for post-Junior Olympics ranking recalibration without changing the live rankings or UI.

This release turns the 7.18 ranking-pipeline architecture into a usable intake workflow. The intent is to make the post-JO update structured, auditable, and reviewable before any CPI score or ranking changes are published.

## What changed

- Added a post-JO intake playbook.
- Added a post-JO review packet guide.
- Added templates for JO result intake, pre-JO vs JO comparison, source tracking, alias corrections, team-depth review, and age/gender review packets.
- Added schemas for post-JO intake, comparison, source tracking, and review packet validation.
- Added a post-JO README and age/gender group manifest.

## What did not change

- No ranking positions changed.
- No CPI scores changed.
- No ranking model code changed.
- No homepage, rankings page, team page, club page, routing, CSS, or JavaScript changed.
- No public-facing content changed except the version file if exposed by the repo.

## Why this release exists

The post-JO recalibration should not be a one-off manual rewrite. It should be based on:

1. Pre-JO CPI rank.
2. JO finish and division path.
3. Game-level evidence.
4. Strength of schedule.
5. Best wins and concerning losses.
6. Alias and team-depth validation.
7. Human review notes before publishing.

Release 7.19 creates the intake structure for that process.

## Install

Copy the included files into the CPI repo:

```text
VERSION.md                                  -> repo root
/docs/*                                     -> docs/
/data/ranking-pipeline/README.md            -> data/ranking-pipeline/
/data/ranking-pipeline/post-jo/*            -> data/ranking-pipeline/post-jo/
/data/ranking-pipeline/schemas/*            -> data/ranking-pipeline/schemas/
/data/ranking-pipeline/templates/*          -> data/ranking-pipeline/templates/
```

## Acceptance checklist

- [ ] Files are in the correct folders.
- [ ] Existing site still loads locally.
- [ ] Rankings page still shows the same pre-JO rankings.
- [ ] Team and club pages still load.
- [ ] No ranking data files were changed.
- [ ] No UI files were changed.
- [ ] Post-JO templates are available under `data/ranking-pipeline/templates/`.

## Suggested commit message

```text
Release 7.19 post-JO intake readiness
```

## Suggested commit description

```text
- Add post-JO intake playbook and review packet guide
- Add templates for JO results intake, pre-JO vs JO comparison, source tracking, alias review, and team-depth validation
- Add schemas for post-JO intake, comparison, source tracking, and review packets
- Add post-JO age/gender manifest and workflow README
- Preserve existing rankings, CPI scores, UI, routing, and page behavior
```
