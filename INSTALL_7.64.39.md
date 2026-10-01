# Install — WPHQ 7.64.39 Unified Web + Native Release Pipeline

## Scope
- Keeps the web product as the single source of truth.
- Makes the generated Capacitor bundle release-aware and traceable.
- Adds web/native parity validation.
- Adds `npm run mobile:update:ios` for one-command iOS refresh through Xcode open.
- Keeps TestFlight/App Store distribution as a separate native binary delivery step.
- Does not change Supabase, Edge Functions, scoring, GroupMe, tournament routing, analytics aggregation, or permissions.

## Validation

```bash
./release-check-live-7.64.39
```

## Refresh the local iOS app

```bash
npm run mobile:update:ios
```

Then choose the simulator or signed iPhone in Xcode and press Run.

## Important
`mobile/www` and `ios/App/App/public` are generated and intentionally ignored by Git. Do not commit them.
