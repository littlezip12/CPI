# CPI 7.45.1 — Tournament Identity Cleanup

## Problem corrected

The normalized tournament bank previously allowed bracket placeholders such as `2nd A-`, `pt_M1-`, and `W29-3rdC` to become tournament-only teams. Pool labels such as `A1(1)-LAMORINDA A` also retained their source prefix during identity resolution.

## Data rules

1. Bracket slots are metadata, never participants.
2. Pool/seed prefixes are preserved as `sourceReference` and `seed`.
3. Only the clean team name is sent to the canonical identity resolver.
4. Tournament-only real teams remain stable evidence entities and cannot enter rankings automatically.
5. A successful live source check updates verification freshness even when the source CSV is unchanged.
6. A cached repository rebuild never pretends the source was freshly fetched.

## Girls JO ingestion correction

Several official Weekend 1 sheets leave Date, Time, Game #, W To, and L To header cells blank while preserving their positional columns. The shared parser now infers only those missing indices. Lettered game numbers are recovered from GMID when the visible Game # cell is blank.

## Release gates

The release fails when:
- Any bracket or pool slot appears as a team.
- Any placement label appears in the participant registry.
- A prefixed team label is not cleaned.
- A JO schedule game lacks date, time, or game number.
- Tournament health counts diverge from the normalized manifest.
- Tracked `.DS_Store` or TextClipping files are present.
