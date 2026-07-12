# CPI Ranking Pipeline

This folder contains the architecture scaffolding for CPI ranking updates.

Release 7.18 created the base model architecture, schemas, and ranking workflow.

Release 7.19 adds the post-Junior Olympics intake readiness layer:

- JO result intake templates.
- Pre-JO vs JO comparison templates.
- Source tracking templates.
- Alias correction checklists.
- Team-depth review checklists.
- Post-JO review packet templates.
- Post-JO schemas and age/gender manifest.

## Folder map

```text
data/ranking-pipeline/
  README.md
  model-weighting-7-18.json
  schemas/
  templates/
  post-jo/
```

## Current workflow stage

CPI is currently in pre-public/post-pre-JO readiness mode.

No post-JO ranking changes should be made until:

1. JO results are sourced.
2. Team identities are normalized.
3. Pre-JO rank vs JO finish comparisons are generated.
4. Review packets are completed.
5. Alias and team-depth flags are resolved.
6. Final ranking changes are approved for the CPI 8.0 release.
