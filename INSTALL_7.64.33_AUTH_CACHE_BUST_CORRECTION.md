# WPI 7.64.33 — Auth Cache-Bust Correction

Observed behavior: the corrected HTML briefly displayed **Create account**, then the tab disappeared after JavaScript initialized. That matches a stale copy of the first 7.64.33 login runtime being served from browser/CDN cache.

Correction:
- keep release version at 7.64.33;
- publish the corrected login runtime under a new immutable asset name: `js/live-login-v7-64-33-1.js`;
- load it with `?v=7.64.33.1`;
- update mobile builders and auth regression gates to the successor runtime;
- preserve the old file only as an unused historical asset.

No database migration or Edge Function deployment is required.
