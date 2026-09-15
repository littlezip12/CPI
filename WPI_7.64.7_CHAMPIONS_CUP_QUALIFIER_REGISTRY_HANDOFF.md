# WPI 7.64.7 — Champions Cup Qualifier Registry Handoff

Baseline: pushed WPI 7.64.6 repository ZIP `CPI-main - 2026-09-14T224456.941(1).zip`.

## Scope
- Add a national 2026 Champions Cup qualifier registry covering the 12 current USA Water Polo zones.
- Publish only confirmed qualifier information; leave unconfirmed zones explicitly awaiting official confirmation.
- Confirm Pacific Zone Champions Cup Quals (14u) on September 27, 2026 from the official Pacific Zone calendar.
- Track Lamorinda A 14U Boys against its existing WPI Live qualifier series.
- Derive W-L-T, GF and GA only from final games. WPI-tracked teams can auto-enrich from finalized `public_team` WPI Live tournament games through the existing public tournament RPC; follower/private games remain excluded.
- Make the Pacific qualifier the first verified event of the 2026–2027 WPI competitive season; Evan Cousineau remains October 3–4.

## Current authoritative facts
- USA Water Polo Champions Cup: November 6–8, 2026, Pavilion Center Pool, Las Vegas.
- USAWP qualifier window: September 10–October 18, 2026, if needed.
- 2026 national schedule/results: coming soon.
- 2026 updated allocations: not yet populated on the official event page.
- Pacific Zone qualifier date: September 27, 2026.
- Pacific venue, opponents, times and bracket: not published in WPI.

## Lamorinda production connection
- Team: `Lamorinda A 14U Boys`
- WPI Live team UUID: `ef1b5ca5-0841-4626-9491-ea44bea1dc6f`
- Live series: `2026 Champions Cup Pacific Zone Qualifier`
- Live series UUID: `cd2016ce-d691-408e-aa10-3e7f1472e250`
- Current games in series at build time: `0`

## Sources encoded in the registry
- USAWP Champions Cup: `https://usawaterpolo.org/sports/2019/1/22/champions-cup.aspx`
- USAWP Zones: `https://usawaterpolo.org/sports/2018/12/18/zones.aspx`
- Pacific Zone calendar: `https://www.pacificzonewaterpolo.com/calendar`

## Data safety
Do not fabricate qualifier events for the other zones. Do not enter opponents, schedules, venues, brackets, standings or scores without authoritative source data. Historical or club-posted dates that conflict with current USAWP information should not be promoted into the tracker without zone/USAWP confirmation.

No Supabase migration. Protected scoring/backend files unchanged.
