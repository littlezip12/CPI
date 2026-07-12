# CPI Post-JO Results Processing Tools

## Goal

The post-JO tools turn normalized Junior Olympics results into review material for the CPI ranking model.

They are intentionally conservative. They should help answer:

- Which teams matched their pre-JO ranking?
- Which teams overperformed?
- Which teams underperformed?
- Which teams were missing from the pre-JO ranking set?
- Which teams need alias review?
- Which teams need team-depth review?
- Which rankings are safe to hold versus which need manual review?

## Folder structure

```text
data/ranking-pipeline/
  tools/
    validate_post_jo_intake.py
    build_post_jo_comparison.py
    generate_post_jo_review_packets.py
    run_post_jo_pipeline.py
    README.md

  post-jo/
    input/
      pre-jo-rankings.template.csv
      post-jo-results-intake.template.csv
      source-tracking.template.csv
    output/
      .gitkeep
    review-packets/
      .gitkeep
    validation/
      .gitkeep
```

## Input 1: pre-JO rankings

Template:

```text
data/ranking-pipeline/post-jo/input/pre-jo-rankings.template.csv
```

Expected working file:

```text
data/ranking-pipeline/post-jo/input/pre-jo-rankings.csv
```

Required columns:

```text
group_key,team_key,display_team_name,club_key,pre_jo_rank,pre_jo_cpi_score,pre_jo_confidence,pre_jo_notes
```

## Input 2: JO results intake

Template:

```text
data/ranking-pipeline/post-jo/input/post-jo-results-intake.template.csv
```

Expected working file:

```text
data/ranking-pipeline/post-jo/input/post-jo-results-intake.csv
```

Required columns:

```text
source_batch_id,group_key,age,gender,division_name,division_tier,raw_team_name,display_team_name,club_key,team_key,team_designation,final_placement,wins,losses,ties,games_played,source_confidence,review_flags,notes
```

## Output 1: validation report

Generated files:

```text
data/ranking-pipeline/post-jo/validation/post-jo-validation-report.json
data/ranking-pipeline/post-jo/validation/post-jo-validation-report.md
```

The report flags missing required columns, invalid numeric fields, duplicate team keys, blank team names, unsupported group keys, and rows requiring manual review.

## Output 2: pre-JO vs JO comparison

Generated file:

```text
data/ranking-pipeline/post-jo/output/post-jo-comparison.csv
```

This file joins pre-JO ranking data against JO results and calculates a directional movement signal.

A positive movement signal means the JO finish was better than the pre-JO rank expectation. A negative signal means the JO finish was worse than the pre-JO rank expectation.

## Output 3: review packets

Generated files:

```text
data/ranking-pipeline/post-jo/review-packets/<group-key>-post-jo-review.md
```

Each packet summarizes:

- Top JO finishers.
- Major overperformers.
- Major underperformers.
- Unranked or missing pre-JO teams.
- Manual-review rows.
- Full comparison table.

## Movement classification

The scripts use conservative defaults:

- Large positive signal: likely move-up candidate.
- Large negative signal: likely move-down candidate.
- Missing placement or weak source confidence: manual review.
- Unranked JO performer: manual review.
- D2/D3 top finishers: manual review instead of automatic movement.

These outputs are not final rankings. They are review inputs for CPI 8.0.
