# WPI 7.64.6 — Opponent Search Context Polish

WPI 7.64.6 is a focused pre-ECC opponent-search refinement built on the pushed WPI 7.64.5 baseline.

Opponent suggestions now show the team context directly in the primary label. Club teams render as **age + team name**, for example **14U Stanford A**, **14U 680 A**, or **14U Davis B**. The club and gender remain visible as secondary context.

Search results are ranked by the team creating the game before text-match strength. A 14U Boys workspace therefore sees 14U Boys matches first; a 12U workspace sees 12U matches first. The same ranking framework recognizes JV and Varsity context so, when high-school workspaces are reactivated, a JV workspace prioritizes JV opponents and a Varsity workspace prioritizes Varsity opponents.

High-school teams remain excluded from normal club opponent search while WPI is in the current club-only operating mode. The archived high-school directory is consulted only when the active workspace itself is a high-school/JV/Varsity workspace.

Selecting a club suggestion still writes the established canonical team name into the opponent field so the existing identity-resolution and reconciliation path remains unchanged. WPI also shows a confirmation using the full contextual label after selection. Manual opponent entry remains available.

No Supabase migration is required. No protected scoring/backend files are changed. No Edge Function, secret, Stripe, hosting, or infrastructure change is required.
