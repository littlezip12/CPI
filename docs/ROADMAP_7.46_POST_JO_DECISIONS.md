# CPI 7.46 — Post-JO Review Packet & Controlled Decisions

## Purpose
Convert the pre-JO snapshot, official JO seed, verified division finish, completed-game evidence, and the advisory ranking engine into one controlled reviewer workflow.

## Review model
- The pre-JO snapshot is immutable and hash-verified.
- Expected finish means the official JO seed within the entered division.
- Verified finish is accepted only from normalized completed placement evidence.
- Reviewer decisions remain in browser local storage until exported.
- Approved change sets require a rationale and directionally valid proposed rank.
- Exported change sets can be validated, but no script in this release applies them.
- Published rankings remain unchanged until a separate, explicit publication step.

## Current pre-tournament state
The packet includes every ranked team currently resolved in a JO field. With zero completed games, all packets correctly remain in `awaiting_results` and none are ready for approval.
