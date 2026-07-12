# CPI Ranking Pipeline

This folder contains CPI ranking update architecture, templates, and tooling.

Release 7.18 created the base model architecture, schemas, and ranking workflow.
Release 7.19 added the post-Junior Olympics intake readiness layer.
Release 7.20 adds lightweight post-JO processing tools:

- Intake validation.
- Pre-JO vs JO comparison generation.
- Review packet generation.
- One-command local pipeline runner.

## Folder map

```text
data/ranking-pipeline/
  README.md
  model-weighting-7-18.json
  schemas/
  templates/
  tools/
  post-jo/
```

## Current workflow stage

CPI is currently in pre-public/post-pre-JO readiness mode.

No post-JO ranking changes should be made until:

1. JO results are sourced.
2. Team identities are normalized.
3. Intake files validate.
4. Pre-JO rank vs JO finish comparisons are generated.
5. Review packets are completed.
6. Alias and team-depth flags are resolved.
7. Final ranking changes are approved for the CPI 8.0 release.

## Running the post-JO tools

From the CPI repo root:

```bash
python3 data/ranking-pipeline/tools/run_post_jo_pipeline.py
```

The tools are intentionally non-publishing. They generate validation reports, comparison CSVs, and Markdown review packets only.
