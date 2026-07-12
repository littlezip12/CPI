# CPI Ranking Model Specification — 7.18

## Ranking philosophy

CPI rankings estimate team strength, not just tournament placement.

A team is evaluated by what it has proven across the season:

- who it played
- where it played
- which division it played in
- how it performed against strong opponents
- whether it improved over time
- whether its results were supported by enough games

## Major principles

### 1. Division tier matters

Division labels should be converted to ranking tiers:

- Platinum / Championship / D1 = strongest tier
- Gold / Classic / D2 = second tier
- Silver / Invitational / D3 = third tier

Guardrail:

- D1 teams generally rank above D2 teams unless D1 teams consistently finish near the bottom.
- Top 2–5 D2 teams can pass bottom 2–5 D1 teams with evidence.
- Top 5–7 D3 teams can pass lower D2 teams with evidence.
- D2/D3 success alone should not create a top-tier ranking.

### 2. Team-depth hierarchy matters

A/B/C team logic is part of the model.

Guardrail:

- A teams generally rank above B teams.
- B teams can rank above weaker A teams only with clear evidence.
- C teams can rank above weaker B teams only with clear evidence.
- Any B team in the top 25 should be flagged for review.
- Any C team in the top 50 should be flagged for review.

### 3. Girls major-event weighting

For girls groups, Futures Super Finals and US Club Championships should be treated as peer-level major events.

- Teams are not punished for attending only one.
- Teams that attend both receive higher confidence, not automatic higher ranking.
- Common-opponent crossover is important when events have different fields.

### 4. Boys major-event weighting

For boys groups, Futures Super Finals is a major anchor event before JO.

JO Qualifiers provide recent validation and zone strength context.

### 5. JO weighting

Junior Olympics should become the strongest late-season signal, but not the only signal.

JO should heavily influence post-JO rankings, while full-season body of work remains relevant.

### 6. Recency

Recent major events should matter more than early-season events.

Early-season tournaments remain useful for baseline strength but should decay as more recent evidence becomes available.

### 7. Head-to-head and common opponents

Head-to-head matters when teams have similar profiles.

Common opponents matter heavily when teams did not play each other, especially across Futures and US Club Championships.

### 8. Manual review is part of the product

The ranking model should generate a draft. CPI review should catch:

- alias issues
- same-club team confusion
- B/C teams ranked too high
- D2/D3 teams ranked too high
- low-game teams ranked too high
- teams whose ranking conflicts with known event placement context

## Public framing

Until JO data is processed, current rankings should be considered Pre-JO working rankings.

After JO, rankings should be published as Post-JO rankings with validation notes.

