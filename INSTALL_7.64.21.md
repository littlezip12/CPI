# Install — WPI 7.64.21

## Summary
WPI 7.64.21 fixes Water Polo HQ shared-hero contrast on light section landing pages and cleans the Organizations page copy/navigation.

## Changes
- Fixes low-contrast hero text/buttons/fact cards on the shared Rankings / Teams / Clubs / Tournaments / Methodology landing heroes under the WPHQ light brand.
- Removes the redundant `← Water Polo Index` back-link from Organizations.
- Updates Organizations title/SEO copy to Water Polo HQ.
- Updates the universal shell to load the 7.64.21 WPHQ brand stylesheet and refreshed logo cache key.
- No migration or Edge Function deployment required.

## Run
```bash
./release-check-live-7.64.21
./release-check-clean
```
