# CPI Release 7.37 — JO Girls Tournament Journey Integration

## Purpose
Integrates the JO Girls Tournament Journey tool into the CPI repository and public site instead of maintaining it only as a separate `jo-girls` repo.

## Public paths
- `tournaments/jo-girls/` — primary embedded tool path inside CPI
- `jo-girls.html` — root-level redirect/short link to the tool

## Included tool files
- `tournaments/jo-girls/index.html`
- `tournaments/jo-girls/app.js`
- `tournaments/jo-girls/2026_NJO_Public_Sched_S1 - 14U_F_Champ.csv`
- `tournaments/jo-girls/README.md`

## CPI site changes
- Adds a JO Girls Tournament Journey card to `tournaments.html`
- Adds `css/jo-integration-v7-37.css`
- Preserves rankings, CPI scores, stories, regions, logos, methodology, and existing pages

## Notes
The tool still has only one offline CSV fallback in the package: 14U Girls Championship. Other age/division tabs load from Google Sheets unless future fallback CSVs are added.
