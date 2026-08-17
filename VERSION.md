# WPI 7.63.2 — Team Insights Experience

WPI 7.63.2 turns the 7.63.0/7.63.1 analytics and privacy foundation into the first real Team Insights product experience. Free Supporters keep the final score, period progression and a clear upgrade path. Team Insights is introduced at launch pricing of **$5/month or $50/year** (checkout remains disabled until the billing release). Owner/Admin/Scorer and explicitly entitled users can now move from canonical game analytics to tournament/weekend aggregates and full-season team/player totals.

This release also closes the remaining direct `live_game_analytics` RLS gap so the `viewer`/Supporter role cannot read detailed analytics rows merely through team membership. The recap UI now correctly hides its loading/error states, shows a single prominent Team Insights upgrade CTA for free Supporters, and surfaces trusted server-derived game totals for detailed users.

No Stripe checkout, payment collection, advertisements, Edge Function redeploys, new secrets, scoring-engine changes, or scale-tier purchases are enabled in 7.63.2.
