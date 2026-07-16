# CPI 7.44 — Ranking Evidence & Review Engine

## Purpose
Create a transparent decision-support layer between normalized tournament results and published CPI rankings.

## Guardrails
- Final scores only.
- One source-traceable game record per result.
- Recommendations are ranges, not replacement ranks.
- No automated writes to published ranking files.
- Human review remains mandatory.

## Evidence generated
- Result quality based on opponent's current CPI rank.
- Upset and unexpected-loss impact.
- Head-to-head records.
- Common-opponent comparisons.
- Notable result summaries.
- Same-club A/B/C hierarchy review flags.

## Current pre-JO state
Zero completed games correctly produces zero movement recommendations. The engine activates as verified finals arrive.
