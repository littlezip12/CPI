# CPI 7.38.1

Junior Olympics schedule reliability update.

- Restores the Girls & Coed application JavaScript in the deployment patch.
- Adds explicit app-load diagnostics instead of leaving the page on “Loading schedule…”.
- Keeps Boys and Girls connected directly to their public Google Sheets.
- Polls the active division every 120 seconds while the page is open.
- Refreshes when the browser tab regains focus, becomes visible, or reconnects to the internet.
- Adds a Girls & Coed source registry covering all 11 configured divisions.
