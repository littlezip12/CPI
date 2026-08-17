# WPI Scale, Monetization, Data & Security Plan

**Planning baseline:** WPI 7.62.6 — Homepage Live Pulse & Public Score Discovery  
**Plan date:** 2026-08-16  
**Purpose:** Preserve the decisions behind WPI's next phase so the product can launch lean, remain safe for youth sports, and scale without a later architectural reset.

---

## 1. Product/business objective

WPI should be engineered for national-scale youth and high-school water polo while operating lean at the beginning. The target is not to spend for national scale today; it is to avoid data, security, hosting, advertising, and entitlement decisions that would force a rewrite if adoption grows.

The long-term revenue model should combine:

1. Direct club/organization sponsorships.
2. Premium tournament and weekend sponsorships/takeovers.
3. Team Insights subscriptions.
4. Organization Insights subscriptions.
5. Broader regional/platform partnerships.
6. Carefully controlled future programmatic fill only if it can meet WPI's youth-safety standard.

At small scale, direct sponsorship is expected to matter more than programmatic CPM revenue.

---

## 2. Capacity envelope

WPI should be designed and tested toward the following envelope. These are engineering targets, not near-term usage forecasts.

| Capacity target | WPI design target |
|---|---:|
| Organizations | 250+ |
| Active teams | 1,000+ |
| Games/year | 150,000 capable |
| Major tournaments/year | 10–20+ |
| Additional weekends/year | 10–20+ major weekend programs, plus team-level friendlies/scrimmages |
| Normal large tournament | 500–1,500 games |
| Mega-event / JO-scale | 6,000 games |
| Extreme four-day session target | 3,500 games |
| Event records/game ceiling | 250 |
| Event rows for a 6,000-game event | ~1.5 million |
| Annual event-row capacity envelope | 25–37.5M+ |
| Simultaneous Live viewers | 10,000 minimum design/load-test target |

### Why 6,000 games

The current WPI tournament data showed roughly 3,924 games across the first two 2026 Junior Olympics weekends. Applying 1.5x headroom produces 5,886 games, rounded to a 6,000-game design target.

### Critical interpretation

A 6,000-game event is not primarily a database-storage problem. The bigger risks are concurrent score delivery, query efficiency, archive/search patterns, analytics aggregation, ad telemetry volume, and operational load.

---

## 3. Canonical data architecture

### Preserve raw scoring history

`live_events` remains the canonical structured event history. Raw events should not be discarded after Final. They are the source for audit, correction, analytics regeneration, and future statistics that do not exist yet.

### Derive analytics server-side

Use this hierarchy:

`live_events` → finalized game analytics → tournament/weekend aggregates → season aggregates

A Finalized game should have a trusted server-derived analytics record based on active canonical events rather than relying only on a browser-generated snapshot.

### Final/Reopen rule

`Final` → generate/refresh analytics  
`Reopen` → invalidate analytics  
corrections → canonical events change  
`Final again` → regenerate analytics

This prevents a permanent stats record from disagreeing with the canonical game.

### Opponent-data rule

WPI may always know the opponent score, but it must not manufacture complete opponent player/team statistics when WPI did not record the underlying opponent actions.

---

## 4. Analytics access model

Keep three separate concepts:

- **Operational role** = what a person is allowed to do in WPI Live.
- **Analytics entitlement** = which protected analytics the person may view.
- **Subscription/commercial source** = why the entitlement exists (purchase, club grant, platform grant, etc.).

### Supporter — Free

Expected access:

- Live score and game state.
- Upcoming games and finals.
- Schedules.
- Basic W-L/weekend results.
- Basic team-level final result/period progression.

Not included by default:

- Individual youth-athlete stats.
- Full player event timeline.
- Lineups/starters.
- Detailed player season analytics.

### Team Insights

For one team:

- Complete finalized game stats.
- Player stats.
- Event timeline.
- Weekend/tournament aggregates.
- Team and player season totals.

### Organization Insights

For one club/high school/organization:

- Team Insights across every entitled team.
- Cross-team organization reporting.
- Organization W-L and performance views.
- Tournament/month/season filtering.
- Future exports/reporting.

Do not create separate premium products merely because the customer is a coach versus a parent. A coach may receive the same analytics entitlement through a club grant while a parent may receive it through a subscription.

---

## 5. Advertising model

### Audience rules

**Free Supporter:** advertising enabled.  
**Team Insights:** rotating/interstitial advertising removed; subtle contractual `Presented by` sponsorship may remain if desired.  
**Organization Insights:** analytics/admin experience should be ad-free.

### Live game inventory

Default behavior for the spectator/public experience:

- One top game banner.
- Change creative at natural period/quarter transitions, not every few seconds.
- Do not place rotating advertising inside the scorer controls.
- Scoring must remain visually stable and operationally isolated from monetization.

### Takeovers / exclusivity

The system must support 100% share-of-voice/exclusive campaigns for:

- One game.
- One team.
- One organization/club.
- One tournament.
- One weekend.
- One region.
- The full WPI platform.

An exclusive campaign should outrank normal rotating inventory inside its eligible scope.

### Inventory priority

1. Exclusive WPI direct takeover.
2. Normal WPI direct campaigns.
3. Future tightly controlled programmatic fill, only if WPI can meet its safety standard.
4. WPI house ads.

No sponsor is required for the platform to function. Unsold inventory can show Team Insights, Follow your Team, rankings, tournament discovery, or other WPI house creative.

### Free recap interstitial

A Free Supporter may receive a short sponsor interstitial before opening a finalized detailed recap:

- Approximately 3–5 seconds.
- Continue/dismiss becomes available after the short delay.
- Frequency capped so it does not repeatedly fire as a user navigates back and forth during the same game-viewing session.

Paid Team Insights should not receive this interstitial.

---

## 6. Youth advertising safety — non-negotiable

WPI is a youth-sports platform. The advertising standard is stricter than simply relying on a third-party category filter.

### Default policy

Only WPI-approved advertisers and WPI-approved creatives may serve on youth-facing WPI surfaces.

A campaign should not activate unless:

- Advertiser is approved.
- Creative is approved.
- Creative is explicitly marked youth-safe.

### Prohibited categories/content

No 18+ or sexually suggestive content, dating, pornography, gambling, alcohol, nicotine/tobacco/vaping, recreational drugs, or similar adult/restricted themes. Avoid even suggestive edge cases.

Safe ordinary categories may include appropriate games, hospitals/health systems, waste/trash companies, restaurants, sporting goods, auto, banks/credit unions, technology, hotels/travel, insurance, physical therapy, orthodontics, colleges, and other normal family/community businesses, subject to WPI review.

### Targeting rule

Use contextual targeting such as:

- organization
- team
- tournament/weekend
- age/level/group
- region
- date
- placement

Do not behaviorally target advertising based on an individual youth athlete's identity, statistics, address, or other personal attributes.

### Programmatic warning

Third-party ad networks can provide category blocking, but those systems may classify imperfectly. Because WPI's requirement is effectively zero tolerance for adult/suggestive creative, unrestricted programmatic ads should not be the default on youth game pages.

---

## 7. Sponsorship pricing strategy

Pricing below is a **planning framework**, not a permanent public rate card. Actual prices should evolve with verified traffic and advertiser demand.

### Founding / early club pricing

For the first few clubs, founding pricing may be intentionally discounted to prove the product:

- Founding Club Partner: roughly **$1,500–$2,500/year**.

Once WPI has demonstrated audience and sponsor value, normal club presenting packages may move toward roughly:

- **$3,000–$7,500/year**, depending on teams, games, reach, placement mix, and exclusivity.

Do not permanently anchor mature WPI inventory to founding prices.

### Event/tournament planning ranges

| Event type | Initial planning range |
|---|---:|
| Friendly / scrimmage / fun weekend | $250–$750 |
| Small local tournament | $750–$2,000 |
| Established tournament | $2,500–$7,500 |
| Major 200–500 game tournament | $7,500–$20,000 |
| 500+ game flagship event | $15,000–$40,000+ once traffic supports it |

Friendly/fun inventory should be discounted. Major/flagship events should command a premium.

### CPM

Use CPM mainly as an internal valuation and optional selling mechanism at small scale, not as the whole business model.

A working internal direct-inventory benchmark discussed was approximately **$20–$30 CPM**, with **$25 CPM** as a simple modeling midpoint:

- 10,000 impressions ≈ $250 media value at $25 CPM.
- 40,000 ≈ $1,000.
- 100,000 ≈ $2,500.

Direct sponsorship/takeover value can exceed commodity CPM value because it includes relevance, repetition, exclusivity, title/presenting association, and community access.

### Five-club goal

A **$25,000 annual stretch goal** at approximately five clubs is ambitious but plausible if driven by direct sponsorship packages rather than expecting programmatic banner ads alone to generate the revenue.

Illustrative mix:

- club partners
- tournament/weekend takeovers
- one broader regional/platform founding partner

Aim to manage a small number of meaningful sponsor relationships rather than manually selling every game.

---

## 8. Advertising accounting/reporting

WPI should track enough commercial telemetry to produce a sponsor report without collecting unnecessary viewer PII.

Recommended fields:

- advertiser
- campaign
- creative
- placement
- game/team/organization/tournament scope
- timestamp
- impression/click
- contract value
- commercial model
- payment status

Initially avoid storing user ID, email, IP address, or other personal identifiers in ad-impression telemetry unless there is a compelling future need and a reviewed privacy basis.

Advertising telemetry must be secondary/asynchronous. If the ad system is unavailable, scoring and public score delivery must continue.

---

## 9. Privacy and security architecture

Absolute zero-risk guarantees do not exist for internet systems. WPI's strategy should therefore be to minimize what is collected, isolate what must exist, and put multiple controls around it.

### Payment data

WPI should never store:

- full card number
- CVV
- bank credentials

Use a hosted payment provider such as Stripe Checkout later so WPI stores only safe references/status fields such as customer ID, subscription ID, entitlement, and payment/subscription state.

### Home addresses

Do not collect home addresses unless a legitimate future product requirement appears. If a payment provider requires billing information, keep it with the payment provider where possible.

### Email/account PII

Email is needed for authentication/invitations/recovery, but it should exist in as few application tables as practical.

Long-term target:

**public scoring/statistical data and private account identity data should have no unnecessary shared read path.**

### Required controls

- RLS on exposed tables.
- Deny-by-default private data policies.
- Least-privilege RPCs.
- No Supabase service-role secret in browser JavaScript.
- No private API keys in source control.
- MFA for Platform Owner/staff/admin access.
- Leaked-password protection/session controls where appropriate.
- Production/staging separation as commercial scale increases.
- Automated RLS regression tests: cross-team, supporter→analytics, anonymous→private, and public→PII.
- Backups and point-in-time recovery before meaningful commercial risk.
- Documented retention/deletion procedures.
- Security/privacy review before broad commercialization.
- No sale/sharing of youth PII for targeted advertising.

---

## 10. Current/future infrastructure implications

### GitHub

**Keep GitHub for source control.**

Do not use the repository as the permanent home for millions of live event records. That is already avoided because canonical Live data resides in Supabase.

Large historical static JSON should eventually migrate to structured database/object/CDN delivery when repository/deployment growth makes that worthwhile.

### GitHub Pages

GitHub Pages should not be WPI's permanent commercial production host. GitHub documents a 1 GB published-site limit, a soft 100 GB/month bandwidth limit, and restrictions/limitations that make it inappropriate as the long-term free host for a commercial SaaS/business.

Migration requirement:

GitHub remains the repository → production moves to a proper WPI domain and commercial static/CDN host.

The current frontend is mostly static HTML/CSS/JS, so this should be a hosting migration rather than a product rewrite.

### Supabase

Keep Supabase/Postgres as the backend.

As of this planning date, Supabase lists Pro from $25/month with 100,000 MAUs, 8 GB database disk per project, 250 GB egress, seven-day daily backups, and usage-based expansion. It also offers higher compute tiers and storage well beyond WPI's projected event-row needs.

Point-in-time recovery is an optional additional cost; current published pricing is roughly $100/month for seven-day PITR, $200/month for 14 days, and $400/month for 28 days.

Supabase Team is substantially more expensive (currently listed from $599/month) and adds organization/security/compliance features. Do not buy it prematurely; upgrade when commercial risk, staff access, audit/compliance needs, or revenue justify it.

### Realtime/public score delivery

The 7.62.6 public individual-game page polls Supabase approximately every eight seconds. That is acceptable at pilot scale but not the final architecture for 10,000 spectators.

At 10,000 viewers, eight-second polling can imply roughly 1,250 score requests/second.

Future direction:

canonical scoring write → lightweight server/broadcast score update → spectators receive change

Do not simply attach 10,000 viewers naively to per-user database change authorization if a Broadcast/fan-out architecture is more efficient.

### Public scoreboard/search

The 7.62.6 global public scoreboard returns at most 250 games and filters in the browser. A 6,000-game mega-event requires server-side filtering and pagination.

Expected future query pattern:

- tournament
- team
- status
- date/day
- division/group
- page/cursor
- limit

Return only the requested slice rather than repeatedly downloading the full event universe.

---

## 11. Annual cost planning

These are budgeting allowances, not guarantees or vendor quotes.

| Stage | Planning allowance |
|---|---:|
| Five-club technical infrastructure | ~$2K–$5K/year |
| Five clubs + privacy/legal/security review | ~$7K–$15K total annual planning budget |
| 50+ clubs | ~$10K–$25K/year |
| Near full platform scale | ~$25K–$60K+/year |

These ranges can include combinations of:

- Supabase plan/compute/egress/storage
- PITR/backups
- commercial frontend/CDN hosting
- email/SMTP
- monitoring/logging
- security testing/review
- privacy/legal work
- business/security insurance
- payment processing

At scale, the goal is for infrastructure/security/compliance to remain a manageable percentage of revenue rather than the business model itself.

### Payment fees

As of this planning date, Stripe lists standard U.S. online domestic card payments at 2.9% + $0.30 per successful transaction. Stripe Billing pricing pages also list ACH Direct Debit at 0.8% with a $5 cap. Large sponsorship invoices may therefore be more economical through ACH than card, subject to the payment setup chosen later.

---

## 12. Staffing economics

For planning, a **$175,000 salary should be treated as roughly a $220,000–$235,000 fully loaded employee** after employer payroll taxes, health insurance, equipment/software and other benefits/overhead.

Do not hire simply because annual revenue equals annual salary. A working planning threshold discussed is to seek roughly **$350K+ of dependable incremental annual revenue/gross-profit capacity** before adding a ~$225K-loaded role, depending on runway and margins.

Stay lean initially. Hire when operational load, sales/support requirements, and dependable revenue justify it.

---

## 13. Mega-Event Readiness Gate

Before WPI claims readiness for a JO-scale event, create a formal load/stress gate that simulates approximately:

- 6,000 scheduled games.
- 100+ simultaneous active games.
- Large bursts of finalizations.
- Thousands of simultaneous spectators.
- Score updates across many games.
- Recap openings.
- Ad-impression traffic.
- Analytics generation.
- Tournament search/filter/pagination.

Measure at minimum:

- p50 / p95 / p99 response latency
- DB CPU/memory/I/O
- active DB/realtime connections
- slow queries
- error rate
- score-write success/durability
- broadcast latency
- analytics generation latency
- queue/backpressure behavior

WPI should prove this level through staging/load testing rather than assume it.

---

## 14. Non-negotiable reliability principle

**Canonical scoring wins.**

Advertising, sponsor reporting, analytics aggregation, GroupMe delivery, recaps, notifications, and other secondary features must never prevent a legitimate scoring action from being durably saved.

If a secondary system is unavailable, WPI continues scoring and reconciles that secondary system later.

---

## 15. Build roadmap from 7.62.6

### WPI 7.63.0 — Analytics, Entitlements & Monetization Foundation

Build now:

- trusted server-derived finalized-game analytics
- invalidation/regeneration lifecycle
- Team/Organization analytics entitlement model
- follower/private-analytics boundary hardening
- youth-safe advertiser/creative approval data model
- campaign scope/priority/exclusivity/commercial/payment metadata
- private ad telemetry/reporting foundation
- scale-supporting indexes
- regression coverage

Do **not** turn on billing or render third-party ads yet.

### 7.63.1 — Team Insights Experience

- detailed game analytics UI
- weekend/tournament aggregation
- season aggregation
- entitled Team Insights experience
- clear free-vs-entitled recap behavior

### 7.63.2 — Organization Insights

- organization-wide dashboard
- cross-team filters/reporting
- club/high-school leadership access

### 7.63.3 — WPI Live Sponsorship & Free-Tier Advertising

- quarter/period banner serving
- 3–5 second free recap interstitial
- takeover/share-of-voice logic
- frequency caps
- house ads
- advertiser reporting UI

### Later — Billing & subscription operations

- hosted checkout/payment provider
- Team Insights subscription grants
- Organization Insights contracts/subscriptions
- renewals/cancellations
- invoices/receipts
- no WPI card storage

### Near-term infrastructure release

Before meaningful commercial scale:

- move production frontend off GitHub Pages
- keep GitHub as source control
- use proper WPI domain/commercial CDN host

### Before major public scale

- replace public eight-second polling with scalable push/Broadcast delivery
- add server-side public game filtering/pagination

### Before JO-scale use

- execute and pass Mega-Event Readiness Gate
- tune/upgrade Supabase compute based on measured results

---

## 16. Current vendor-price references used for planning

These were checked on 2026-08-16 and can change. Re-verify before a purchasing decision.

- Supabase pricing: Pro starts at $25/month; Team starts at $599/month; Pro includes 8 GB DB disk, 100K MAUs, 250 GB egress and seven-day daily backups; usage and compute scale separately.
- Supabase PITR: approximately $100/month for seven days, $200/month for 14 days, $400/month for 28 days.
- GitHub Pages: 1 GB published-site limit and soft 100 GB/month bandwidth limit; not appropriate as WPI's permanent commercial SaaS host.
- Stripe: U.S. online domestic cards 2.9% + $0.30; ACH Direct Debit pricing shown as 0.8% with a $5 cap on Stripe Billing pricing.

---

## 17. Decision summary

WPI does **not** need a platform rewrite to pursue this scale.

Keep:

- canonical WPI Live scoring model
- stable team/organization IDs
- Supabase/Postgres
- GitHub source control

Evolve:

- analytics access/aggregation
- privacy boundaries
- youth-safe commercial infrastructure
- production hosting
- public score fan-out
- public search/pagination
- load testing

The goal is a lean five-club product whose core architecture can mature into a 1,000+ team / 6,000-game mega-event platform without replacing the scoring foundation.
