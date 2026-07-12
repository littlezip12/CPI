# Post-JO Intake Workspace

This folder is the intended workspace for Junior Olympics intake and recalibration review.

Do not publish post-JO rankings directly from raw results. Use this sequence:

1. Store source tracking records.
2. Normalize JO results into the intake CSV.
3. Validate the intake CSV.
4. Join JO results to pre-JO ranking snapshots.
5. Generate pre-JO vs JO comparison records.
6. Create review packets by age/gender group.
7. Resolve alias and team-depth flags.
8. Draft post-JO rankings.
9. Archive final post-JO ranking snapshots.

## Workspace folders

```text
post-jo/
  input/
    pre-jo-rankings.template.csv
    post-jo-results-intake.template.csv
    source-tracking.template.csv
  output/
  review-packets/
  validation/
```

## Active CPI groups

The active ranking groups are stored in:

```text
age-gender-groups.json
```

Current CPI groups:

- 12U Boys
- 12U Girls
- 14U Boys
- 14U Girls
- 16U Boys
- 16U Girls
- 18U Boys
- 18U Girls

10U and coed data can be retained as source material but should not update the active CPI ranking tables unless CPI formally adds those groups.
