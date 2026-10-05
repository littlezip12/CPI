# Water Polo HQ 7.64.45 — Coach Report Contrast Cache-Bust Hotfix

7.64.44 corrected the Coach Report CSS rules but left the page requesting the old 7.64.43 stylesheet URL. That allowed browser/WebView caching to keep showing the old dark global-table appearance.

7.64.45 uses a new physical stylesheet filename and query string and preserves the explicit light Coach Report surfaces.

No Supabase SQL, migration, Edge Function, data model, analytics, scoring, or ECC changes are required.
