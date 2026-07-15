# CPI 7.38.1 — JO schedule reliability

## Root cause

The 7.38.0 incremental deployment package restored the Girls entry page but did not include `tournaments/jo-girls/app.js`. A repository that did not already contain that exact file therefore rendered the visual shell but never initialized the age, division, team, or schedule data.

## Correction

7.38.1 includes the complete Girls application file and updates both Weekend 1 and Weekend 2 entry pages to report a clear deployment error if their JavaScript file is unavailable.

## Automatic updates

Both applications read their official public Google Sheet directly:

- immediately when the page opens;
- every 120 seconds while the page remains open;
- when the tab becomes active again;
- when the browser reconnects after being offline;
- whenever the user presses **Refresh schedule**.

A cache-busting query and `cache: no-store` are applied to live CSV requests. Local browser cache is used only when Google Sheets cannot be reached.
