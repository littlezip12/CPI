# Post-JO Intake Workspace

This folder is the intended workspace for Junior Olympics intake and recalibration review.

Do not publish post-JO rankings directly from raw results. Use this sequence:

1. Store source tracking records.
2. Normalize JO results into the intake template.
3. Join JO results to pre-JO ranking snapshots.
4. Generate pre-JO vs JO comparison records.
5. Create review packets by age/gender group.
6. Resolve alias and team-depth flags.
7. Draft post-JO rankings.
8. Archive final post-JO ranking snapshots.

## CPI ranking groups

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
