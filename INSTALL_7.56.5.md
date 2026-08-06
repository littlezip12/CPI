# Install WPI 7.56.5 — Scorer Multi-Device Delivery Reliability

This release fixes invited Scorers continuing games created by the Owner. The browser now updates existing games and events without replaying creator-bound INSERT policies, then sends the resulting play through the existing GroupMe Edge Function.

## Installation

Run the package installer from the CPI repository root. The installer preserves the connected Supabase URL and publishable key, advances the private WPI Live assets to 7.56.5, and runs focused validation.

## Hosted services

- No SQL migration is required.
- Do not rerun full setup SQL.
- No GroupMe secret change is required.
- No Edge Function deployment is required.

After GitHub Pages publishes, hard-refresh both Owner and Scorer sessions. Reopen the same active game as Scorer and submit one new play. It should progress from Sending to Sent and appear once in GroupMe.
