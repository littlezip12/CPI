# Install — WPI 7.64.25

## Summary
Removes the deferred High Schools action from My Teams and replaces it with Find a Team for the current season.

## Changes
- Signed-out My Teams hero now shows **Live Scores** and **Find a Team**.
- **Find a Team** routes to the public Teams & Clubs directory (`organizations.html`).
- The High Schools route/code/data remain preserved for future-season use.
- No Supabase migration or Edge Function deployment required.

## Run
```bash
./release-check-live-7.64.25
npm run mobile:sync
npm run mobile:open:ios
```
