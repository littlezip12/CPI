# WPI 7.56.8 — GroupMe Topic Delivery Foundation

- Adds a **Topic** delivery mode alongside the existing GroupMe Bot API fallback.
- Keeps GroupMe access tokens server-side in Supabase Edge Function secrets; no GroupMe token is stored in GitHub, browser JavaScript, localStorage, or database rows.
- Lets a Team Owner/Admin discover GroupMe groups and topics from the private WPI Live dashboard after a server-side credential has been configured.
- Stores only the selected GroupMe group/topic IDs, labels, delivery mode, and server-side secret-name reference in `live_destinations`.
- Routes tests and live scoring events through the selected topic when Topic mode is enabled.
- Preserves exactly-once delivery claims, retries, audit history, scorer transfer/Admin takeover rules, and the 7.56.7 Final Whistle persistence-order correction.
- Preserves the existing Bot mode for supported main-chat delivery and fallback.
- Requires one additive Supabase migration, one server-side GroupMe access-token secret for Topic mode, and redeployment of `groupme-post`.
