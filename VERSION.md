# WPI 7.64.5 — Mobile Recap & Opponent Search Polish

WPI 7.64.5 is a focused pre-ECC usability correction built on the pushed 7.64.4 mobile setup release. It cleans up the end-of-game mobile action area and replaces the browser-native opponent datalist with a visible WPI-controlled autocomplete.

On mobile, the final recap actions now use a clear hierarchy: **Back to dashboard** spans the full row, with **Reopen game** and **Download log** beneath it. Narrow phones stack the actions.

Opponent search now begins after two characters, prioritizes the current age/gender context, ranks starts-with matches before contains matches, supports keyboard navigation, and provides large tap targets on phones. Selecting a suggestion fills the existing opponent field so the established WPI identity-resolution path remains authoritative. Manual opponent entry is still supported; WPI does not silently fuzzy-correct misspellings.

No Supabase migration is required. Protected scoring/backend files are unchanged. No Edge Function redeploy, secret, Stripe activation, hosting migration, or infrastructure change is required.
