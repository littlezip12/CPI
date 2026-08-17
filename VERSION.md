# WPI 7.63.1 — Supporter Analytics Privacy Correction

WPI 7.63.1 corrects the Supporter analytics boundary introduced in 7.63.0 while preserving the analytics and monetization foundation. Finalized canonical games generate server-derived analytics from `live_events`; reopening invalidates those analytics and refinalizing regenerates them. The `viewer`/Supporter role no longer counts as operational detailed-analytics access. Owner/Admin/Scorer retain detailed operational access; free Supporters receive result/period context only unless separately granted Team Insights or Organization Insights.

The release also adds a Platform-Owner-controlled youth-safe advertiser, creative, campaign and private reporting schema with explicit approval, scope, exclusivity/share-of-voice, event tier, contract value and payment-status fields. No ads are rendered and no billing integration is enabled yet.
