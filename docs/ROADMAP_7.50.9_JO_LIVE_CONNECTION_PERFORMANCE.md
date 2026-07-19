# CPI 7.50.9 — JO Live-Connection Performance & Resilience

## Problem

The JO pages correctly displayed a verified or cached schedule while checking Google, but the status could remain yellow for seconds or minutes. The browser attempted multiple Google CSV and JSONP variants sequentially. A single slow browser request could delay every fallback behind it, CSV requests had no explicit timeout, and a failed attempt waited for the normal two-minute polling cycle before trying again.

## Resolution

- Apply one live-source strategy to all 11 Girls/Coed divisions and all 12 Boys divisions.
- Keep verified schedules available independently from the live connection.
- Start the Girls live request while the repository snapshot loads, but merge live results only after verified route metadata is available.
- Prioritize stable worksheet names, then primary and legacy GIDs, export URLs, CSV, and JSONP alternatives.
- Race an initial group of three candidates and launch the remaining candidates after a 650 ms hedge delay.
- End hanging CSV requests after 5.5 seconds and JSONP attempts after 6.5 seconds.
- Save the winning endpoint per division in browser storage and promote it on the next refresh.
- Retry failed live checks after 15 seconds, 30 seconds, and 60 seconds rather than waiting immediately for the two-minute interval.
- Suppress duplicate refreshes for the same division and retain the existing two-minute steady-state polling cadence.
- Describe the yellow state as “Schedule ready · checking live updates” so it is clear that the schedule is usable before Google turns the indicator green.

## Safeguards

- A live response must still pass the existing minimum game/team validation before it can replace the displayed score data.
- Verified bracket-routing metadata remains merged into every successful live response.
- A failed or timed-out Google request cannot blank the page.
- Rankings and normalized tournament records are not written by the browser application.

## Regression coverage

- The hedged request helper is dynamically tested to confirm a fast fallback can beat a slow preferred endpoint.
- Both apps are checked for request timeouts, preferred-endpoint storage, progressive retries, and overlap protection.
- Girls are checked to ensure the live request starts in parallel while the verified snapshot is still applied first.
- Existing all-division journey and route-resolution tests remain active.
