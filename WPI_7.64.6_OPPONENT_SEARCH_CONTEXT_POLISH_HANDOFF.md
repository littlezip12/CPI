# WPI 7.64.6 — Opponent Search Context Polish Handoff

Baseline: pushed WPI 7.64.5 repository ZIP `CPI-main - 2026-09-14T221707.540.zip`.

Scope:
- Add age/division to opponent suggestion primary labels.
- Rank current workspace age/division first.
- Preserve current gender context as a secondary ranking signal.
- Support JV/Varsity-first ranking when high-school workspaces are reactivated.
- Keep current club-only mode free of archived high-school suggestions.
- Preserve manual opponent entry and existing canonical identity resolution.

Examples: **14U Stanford A**, **14U 680 A**, **14U Davis B**.

No Supabase migration. Protected scoring/backend files unchanged.
