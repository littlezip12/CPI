# CPI 7.51.0 — JO Live Data Relay & Cache

CPI now has a server-side Junior Olympics relay built on GitHub Actions.

- All 23 Girls, Coed, and Boys divisions are checked approximately every five minutes.
- Google responses are parsed and validated before publication.
- The latest valid CSV for every division is preserved on the isolated `cpi-live-relay` branch.
- Tournament browsers read the CPI relay first and use direct Google access only as a secondary freshness path.
- A failed Google check cannot erase a previously valid relay bank.
- The relay branch is force-refreshed as a single generated snapshot, so it does not add continuous generated commits to `main`.
- Rankings, ranking evidence, logos, and historical tournament data are not changed by the relay.

After this release is pushed to `main`, the `Sync JO live relay` workflow runs automatically and creates or refreshes the relay branch.
