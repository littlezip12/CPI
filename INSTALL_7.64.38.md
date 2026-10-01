# Install WPHQ 7.64.38

This release is built from the pushed 7.64.36 GitHub baseline. It intentionally skips 7.64.37, which remains the abandoned/unpushed ECC live-source experiment.

## Install

Copy the patch contents over the local repository at:

`/Users/tylerdeshazer/Documents/GitHub/CPI`

Then run:

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"
./release-check-live-7.64.38
```

## Supabase

No SQL migration and no Edge Function deployment are required for 7.64.38. The security readiness checklist is in `WPHQ_7.64.38_SECURITY_READINESS.md`; its dashboard items can be reviewed separately before broad public signup volume.

## Browser / phone validation

1. Desktop Team Insights still shows the existing player comparison layout and up to four players.
2. On a phone, Player Stats shows one compact Choose players control; opening it shows a vertical roster/search picker and Done closes it.
3. On a phone, selected-player summary cards are removed; Overview is open and the remaining stat groups expand/collapse.
4. On a phone, Back and My Teams stay primary; More contains Live Scores, Sign out, and only the role-authorized Organization Insights / Commercial actions.
5. Supporter/scorer accounts do not gain Organization Insights or Commercial access.
6. Account Security, Privacy, Password Reset, Team Insights, and Event Results show Water Polo HQ consumer branding.
7. Password Reset requires at least 12 characters.

Do not commit/push until the release gate passes and the browser/phone checks look right.
