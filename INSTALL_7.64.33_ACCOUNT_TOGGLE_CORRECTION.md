# WPHQ 7.64.33 Account Toggle Correction

Apply at the repository root after the original 7.64.33 patch.

This correction keeps **Log in** and **Create account** visible on the normal account page for every user. Creating an account still grants no team, scorer, admin, or club authority; those privileges remain controlled by the existing invitation/onboarding workflows.

After extracting, run:

```bash
./release-check-live-7.64.33
```
