# CPI 7.50.9

JO live-connection performance and resilience.

- Applies the performance release to every Girls, Coed, and Boys JO age and division.
- Loads the verified schedule immediately and treats the live Google request as a background freshness check.
- Starts the Girls live request while the same-origin verified snapshot loads, without allowing live data to replace the verified schedule before route metadata is available.
- Races the strongest worksheet-name, GID, CSV, export, and JSONP endpoints instead of waiting for each endpoint sequentially.
- Launches fallback endpoints after a 650 ms hedge delay so a slow preferred source cannot hold up the page.
- Caps live CSV requests at 5.5 seconds and JSONP requests at 6.5 seconds.
- Remembers the fastest successful endpoint separately for each division and tries it first on future refreshes.
- Retries unsuccessful live checks after 15 seconds, then 30 seconds, then 60 seconds while keeping the verified schedule usable.
- Prevents duplicate refreshes for the same selected division.
- Continues the normal two-minute live polling cadence after a successful connection.
- Leaves rankings, tournament datasets, logos, route resolution, workflows, and generated operational outputs unchanged.
