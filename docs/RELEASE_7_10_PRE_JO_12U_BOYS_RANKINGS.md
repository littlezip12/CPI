# Release 7.10 — Pre-JO 12U Boys Rankings Pilot v8

## Objective

Apply division-tier guardrails before publishing the 12U Boys Pre-JO rankings pilot.

## Model guardrails added

1. **Platinum / D1:** D1 teams anchor the top ranking bands. Unless a D1 team is consistently in the bottom group, it should generally rank above Gold/D2 teams.
2. **Gold / D2:** The top 2–5 Gold teams may pass the bottom 2–5 D1 teams, but only with strong supporting evidence.
3. **Silver / D3:** The top 5–7 Silver teams may pass the lower Gold teams only when the data supports it. Silver success alone does not create a D1 ranking.

## Changes from v7

- Moved San Mateo down from the top-15 band because it profiles as a strong Gold/D2 team rather than a top D1 team.
- Moved Foothill Red down from the top-20 band for the same reason.
- Kept Back Bay and OCWPC Blue in the high-review band, but below the D1 core.
- Preserved the one-age/gender rankings page behavior from v7.
- Preserved the homepage ranking selector from v7.

## Current 12U Boys Top 10

1. Mission A — CPI 2160.0 — Latest: Futures Super Finals 4-1 — Best win: Stanford Red (18–4)
2. Stanford Red — CPI 2025.5 — Latest: Futures Super Finals 4-1 — Best win: Mission A (11–10)
3. Greenwich — CPI 1974.7 — Latest: San Diego County Cup 6-0 — Best win: Mission A (5–3)
4. SD Dons A — CPI 1899.2 — Latest: Futures Super Finals 5-0 — Best win: Stanford Red (12–8)
5. Vanguard — CPI 1894.0 — Latest: Futures Super Finals 3-2 — Best win: San Clemente A (16–4)
6. CC United — CPI 1879.9 — Latest: Futures Super Finals 3-3 — Best win: North Irvine Black (11–6)
7. San Jose Express Blue — CPI 1865.8 — Latest: Futures Super Finals 4-2 — Best win: Stanford Red (14–8)
8. North Irvine Black — CPI 1856.5 — Latest: Futures Super Finals 3-3 — Best win: San Jose Express Blue (19–13)
9. San Clemente — CPI 1770.7 — Latest: Futures Super Finals 5-2 — Best win: Tsunami (9–7)
10. Rose Bowl — CPI 1764.0 — Latest: Futures Super Finals 4-2 — Best win: Temple City (10–5)

## Top 30 check

1. Mission A — D1 — 33 games — Futures Super Finals 4-1
2. Stanford Red — D1 — 26 games — Futures Super Finals 4-1
3. Greenwich — Open — 6 games — San Diego County Cup 6-0
4. SD Dons A — D1 — 5 games — Futures Super Finals 5-0
5. Vanguard — D1 — 11 games — Futures Super Finals 3-2
6. CC United — D1 — 24 games — Futures Super Finals 3-3
7. San Jose Express Blue — D1 — 22 games — Futures Super Finals 4-2
8. North Irvine Black — D1 — 27 games — Futures Super Finals 3-3
9. San Clemente — D1 — 32 games — Futures Super Finals 5-2
10. Rose Bowl — D1 — 18 games — Futures Super Finals 4-2
11. Tsunami — D1 — 30 games — Futures Super Finals 2-4
12. SoCal — D1 — 23 games — Futures Super Finals 2-4
13. Temple City — D1 — 13 games — Futures Super Finals 2-3
14. CDM — D1 — 22 games — Futures Super Finals 4-1
15. Patriot Navy — D1 — 21 games — Futures Super Finals 0-5
16. Los Alamitos — Open — 11 games — Futures Super Finals 4-2
17. La Jolla United — D1 — 10 games — Futures Super Finals 2-3
18. 680 A — D1 — 5 games — Futures Super Finals 3-2
19. San Diego Shores — D1 — 18 games — Futures Super Finals 3-2
20. Lamorinda A — D1 — 19 games — Futures Super Finals 1-4
21. ORWP A — D1 — 13 games — KAP7 International 2-3
22. Carlsbad — D1 — 6 games — Futures Super Finals 3-1
23. NSD Stars — D1 — 7 games — San Diego County Cup 0-2
24. Trojan Cardinal — D1 — 9 games — CCA JO Qualifier 3-2
25. LA Premier — D1 — 21 games — Futures Super Finals 2-3
26. Back Bay — D2 — 13 games — SOPAC JO Qualifier 3-2
27. Newport Beach A — D1 — 5 games — Futures Super Finals 1-4
28. Santa Cruz — Open — 8 games — Pacific Zone JO Qualifier 6-1
29. OCWPC Blue — D2 — 30 games — SOPAC JO Qualifier 3-3
30. San Mateo — D2 — 13 games — Futures Super Finals 3-1

## QA checklist

- `/rankings.html?group=12u-boys` shows 12U Boys only.
- `/rankings.html?group=14u-boys` shows 14U Boys only.
- San Mateo and Foothill Red are no longer ranked in the top-20 band.
- Lamorinda A remains in the top-25 band.
- Homepage, rankings, clubs, and team pages still load.
