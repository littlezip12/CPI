# WPI 7.55.0 — Competitive Season Validator Fix

Apply this patch on top of the already-installed WPI 7.55.0 competitive-season release.

## Purpose

The 7.55.0 season data and public archive changes built correctly, but `scripts/validate-tournament-data.py` still used a hardcoded list of historical registry releases ending at 7.54.11.

This fix replaces that brittle allow-list with two durable checks:

- the registry release must be a semantic `x.y.z` version at least 7.45.1; and
- it must exactly match `tournamentRegistryRelease` in `config/site-release.json`.

No tournament data, rankings, scores, placements, identities, logos, or public presentation files are changed.
