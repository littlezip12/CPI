# CPI 7.44.1 — 14U Boys Classic source hotfix

The official 14U Boys Classic tab moved from GID `1855118263` to `732732301`.

This patch:
- makes `732732301` the authoritative live GID;
- retains the former GID as a non-authoritative fallback candidate;
- adds the stable sheet-name fallback `14U_M_Classic`;
- updates both public and central source registries;
- updates JO release validation;
- includes the user-provided 192-game schedule as a regression fixture.

Install from the CPI repository root:

```bash
PATCH="$(find "$HOME/Downloads" -maxdepth 1 -type f -name 'CPI-7.44.1-14U-BOYS-CLASSIC-SOURCE-HOTFIX*.zip' -print -quit)"
ditto -x -k "$PATCH" "/Users/tylerdeshazer/Documents/GitHub/CPI"
./release-check
```
