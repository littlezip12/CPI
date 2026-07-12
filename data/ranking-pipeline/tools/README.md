# CPI Ranking Pipeline Tools

Release 7.20 adds lightweight Python tools for post-JO processing.

The tools use only the Python standard library. No package install is required.

## Setup

From the CPI repo root:

```bash
python3 data/ranking-pipeline/tools/run_post_jo_pipeline.py
```

Before running the pipeline, create these working files from the templates:

```text
data/ranking-pipeline/post-jo/input/pre-jo-rankings.csv
data/ranking-pipeline/post-jo/input/post-jo-results-intake.csv
```

## Scripts

### validate_post_jo_intake.py

Validates normalized JO intake data.

Default command:

```bash
python3 data/ranking-pipeline/tools/validate_post_jo_intake.py
```

### build_post_jo_comparison.py

Joins pre-JO rankings to JO results and creates a comparison CSV.

Default command:

```bash
python3 data/ranking-pipeline/tools/build_post_jo_comparison.py
```

### generate_post_jo_review_packets.py

Creates Markdown review packets by age/gender group.

Default command:

```bash
python3 data/ranking-pipeline/tools/generate_post_jo_review_packets.py
```

### run_post_jo_pipeline.py

Runs validation, comparison, and review-packet generation in sequence.

Default command:

```bash
python3 data/ranking-pipeline/tools/run_post_jo_pipeline.py
```

## Important

These tools do not publish rankings. They generate evidence and review material only.
