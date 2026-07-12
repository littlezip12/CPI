# CPI Post-JO Intake Playbook

## Objective

Create a reliable intake layer for Junior Olympics results before CPI recalibrates rankings.

The goal is not to immediately publish new rankings. The goal is to ingest JO results, compare them against pre-JO CPI expectations, identify model misses, validate aliases, and produce review packets for each age/gender group.

## Intake sequence

### 1. Gather official JO result sources

For each age/gender/division, capture:

- Official source URL.
- Source name.
- Date captured.
- Division or bracket name.
- Final placement table if available.
- Game-level schedule/results if available.
- Notes about incomplete, disputed, or pending results.

Use:

```text
data/ranking-pipeline/templates/source-tracking.template.json
```

### 2. Normalize age/gender groups

Use only the CPI group keys:

```text
12u-boys
12u-girls
14u-boys
14u-girls
16u-boys
16u-girls
18u-boys
18u-girls
```

10U and coed groups may be stored for reference, but they should not drive the current CPI ranking tables unless CPI explicitly adds those groups later.

### 3. Normalize team identity

For each result row, separate:

- Display team name.
- Club identity.
- Team designation, such as A/B/C, Red/Blue, Navy/Black.
- Age/gender group.
- Raw source name.
- Alias decision.

Do not merge A/B/C or color teams unless the tournament source proves they are the same roster identity.

### 4. Capture JO finish and path

For each team, capture:

- JO division.
- Final placement.
- Record.
- Game count.
- Best win.
- Worst loss.
- Close losses.
- Placement game result.
- Bracket path notes.

Use:

```text
data/ranking-pipeline/templates/post-jo-results-intake.template.json
```

### 5. Compare against pre-JO CPI rank

For each ranked team:

- Pre-JO CPI rank.
- Pre-JO CPI score.
- JO finish.
- JO finish bucket.
- Rank delta.
- Expected vs actual outcome.
- Confidence level.

Use:

```text
data/ranking-pipeline/templates/post-jo-comparison.template.json
```

### 6. Flag review cases

Common review flags:

- Major overperformer.
- Major underperformer.
- Alias ambiguity.
- B team outperformed A team.
- Lower division team outperformed higher division team.
- Strong result but weak season-long evidence.
- Poor JO result but strong season-long evidence.
- Insufficient games.
- Cross-zone strength mismatch.
- Placement affected by bracket path.

### 7. Build review packets

Every age/gender group should have a review packet before ranking changes are made.

A review packet should summarize:

- Current pre-JO top 25.
- JO finish order.
- Biggest overperformers.
- Biggest underperformers.
- Candidate move-ups.
- Candidate move-downs.
- Alias issues.
- Team-depth issues.
- Recommended post-JO ranking changes.
- Reviewer notes.

Use:

```text
data/ranking-pipeline/templates/post-jo-review-packet.template.json
```

## Ranking judgment rules

JO results should carry the strongest recent signal, but should not erase the full season.

General rules:

- JO champion and top finishers should receive strong upward pressure.
- A single JO upset should not automatically override a full season of contrary evidence.
- Division placement matters.
- Bracket path matters.
- Head-to-head matters, especially when recent and same division.
- Common opponents matter when head-to-head is unavailable.
- A/B/C team identities must be reviewed carefully.
- Age/gender aliases must be isolated by group.

## Publication sequence

Recommended order:

1. Ingest all JO data.
2. Validate sources.
3. Normalize teams and aliases.
4. Generate comparison tables.
5. Review flags manually.
6. Draft post-JO rankings.
7. Run age/gender review packets.
8. Freeze final rankings.
9. Publish CPI 8.0 post-JO rankings.
10. Archive pre-JO and post-JO snapshots.
