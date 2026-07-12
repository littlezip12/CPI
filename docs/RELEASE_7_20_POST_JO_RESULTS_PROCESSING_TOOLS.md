# CPI Release 7.20 — Post-JO Results Processing Tools

## Release purpose

Release 7.20 adds the first practical tooling layer for post-Junior Olympics ranking review.

Release 7.18 established the ranking-pipeline architecture.
Release 7.19 added post-JO intake templates and review structure.
Release 7.20 adds scripts that can validate intake files, compare pre-JO rank against JO finish, and generate review-packet drafts.

## What changed

Added:

- Post-JO intake CSV template.
- Pre-JO ranking snapshot CSV template.
- Post-JO source tracking CSV template.
- Lightweight validation script.
- Pre-JO vs JO comparison script.
- Review packet generator script.
- One-command pipeline runner.
- Tool README and workflow documentation.

## What did not change

This release does not change:

- Published rankings.
- CPI scores.
- Ranking JSON used by the site.
- Homepage.
- Rankings page.
- Team pages.
- Club pages.
- Public-facing UI.
- Routing.

## Intended workflow

1. Add pre-JO ranking snapshot data into:

   ```text
   data/ranking-pipeline/post-jo/input/pre-jo-rankings.csv
   ```

2. Add normalized JO results into:

   ```text
   data/ranking-pipeline/post-jo/input/post-jo-results-intake.csv
   ```

3. Run validation:

   ```bash
   python3 data/ranking-pipeline/tools/validate_post_jo_intake.py
   ```

4. Build comparison output:

   ```bash
   python3 data/ranking-pipeline/tools/build_post_jo_comparison.py
   ```

5. Generate review packets:

   ```bash
   python3 data/ranking-pipeline/tools/generate_post_jo_review_packets.py
   ```

Or run all steps:

```bash
python3 data/ranking-pipeline/tools/run_post_jo_pipeline.py
```

## Review principle

The tooling should not automatically publish ranking changes. It should surface evidence, movement candidates, and manual-review flags. Final ranking decisions remain human-reviewed until the CPI 8.0 post-JO recalibration release.
