# Install WPHQ 7.64.40

Built from pushed 7.64.39.

1. Unzip the patch over the repository root.
2. `chmod +x release-check-live-7.64.40 scripts/test-wphq-public-beta-readiness-v7-64-40.py scripts/test-wphq-unified-mobile-release-v7-64-40.py`
3. `./release-check-live-7.64.40`
4. `npm run mobile:update:ios`
5. Validate browser + iPhone.
6. Commit/push only after validation.

No Supabase SQL or Edge Function deployment is required.
