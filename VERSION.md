# WPI 7.64.0 — Live Game UX & Fan Experience

WPI 7.64.0 turns the authenticated read-only Supporter game view into a dedicated mobile-first fan Game Center while leaving the mature scoring console and scorer authority unchanged. Supporters now receive an always-clear score/period/clock surface plus Game, Plays, Stats and Info views, a latest-play snapshot, period score progression, recorded team comparison metrics, player leaders, share controls and a direct Final-to-Recap transition.

The fan layer activates only when the validated scoring controller places the page in `is-live-viewer` mode. Owner/Admin/Scorer workflows continue using the existing scoring console; accepting a scorer handoff removes fan mode immediately and restores scorer UI. Existing supporter sponsorship remains above the fan surface, and free-launch Team Insights remains available and ad-supported.

No Supabase migration, Edge Function redeploy, push-notification permission, Stripe activation, new secret or infrastructure upgrade is required. Protected scoring, game storage, backend, GroupMe delivery and roster-extraction files remain byte-stable.
