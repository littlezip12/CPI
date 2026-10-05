# Water Polo HQ 7.64.44 — Coach Report Contrast Polish

This is a lightweight visual cleanup on top of the already-pushed 7.64.43 repo.

## Scope
- preserves the 7.64.43 Coach Report behavior
- fixes dark Coach Report cells caused by older/global table styling bleeding into the full-roster report
- forces explicit light backgrounds, readable text color, zebra striping, and hover clarity for the full roster table
- no data model, Supabase, RPC, scoring, ECC, or routing changes
- no Supabase SQL required

## Install
From the CPI repo root, unzip this patch into the project and then refresh your web/iOS bundle:

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"
unzip -o "$HOME/Downloads/WPHQ_7.64.44_COACH_REPORT_CONTRAST_POLISH_PATCH.zip" -d .
npm run mobile:update:ios
```

If you are checking it in the browser first, do a hard refresh after unzipping so the updated CSS is loaded.
