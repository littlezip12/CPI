# WPI Sponsor Framework — 7.53.2

WPI sponsorship is configured centrally in `data/sponsors/index.json`. The browser runtime is generated as `data/sponsors/runtime.js` so the static GitHub Pages site does not depend on a network fetch.

## Operating rules

- Empty placements render nothing and consume no page space.
- Every active placement is visibly labeled.
- Sponsorship never changes rankings, results, placements, or editorial decisions.
- Sponsor links use `rel="sponsored noopener noreferrer"`.
- WPI does not use sponsor cookies, local storage, personal identifiers, or client-side click collection.
- Outbound links can include UTM attribution so a sponsor can measure traffic on its own website.

## Campaign fields

An active campaign supports:

- `id`, `name`, and `slug`
- `status`: `active`, `paused`, or `draft`
- `placements`: one or more placement IDs
- `startDate` and `endDate` in `YYYY-MM-DD`
- `logo`, `website`, `message`, and `cta`
- `priority`
- targeting arrays for `pageTypes`, `clubs`, `teams`, `regions`, `groups`, and `tournaments`

Targeting arrays are optional. An omitted or empty array means the campaign is eligible for all values in that dimension.

## Example draft

The example below is documentation only. It is not present in the active campaign list.

```json
{
  "id": "example-regional-partner",
  "name": "Example Partner",
  "slug": "example-regional-partner",
  "status": "draft",
  "placements": ["club.region", "regions.directory"],
  "startDate": "2026-08-01",
  "endDate": "2026-10-31",
  "logo": "assets/sponsors/example-partner.webp",
  "website": "https://example.com/",
  "message": "Supporting youth water polo across Northern California.",
  "cta": "Learn more",
  "priority": 50,
  "targeting": {
    "regions": ["Bay Area", "Sacramento"]
  }
}
```

After editing `index.json`, run `python3 scripts/build-sponsor-runtime-v7-53-2.py`, then run `./release-check`.
