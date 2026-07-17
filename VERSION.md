# CPI 7.45.2

Boys JO browser parser alignment hotfix.

- Selects the authoritative rightmost tournament GMID rather than stage labels such as `RR9-11`.
- Supports lettered GMIDs such as `10B-140A`.
- Derives a missing visible game number from the GMID.
- Requires browser-parsed game IDs to match the normalized pipeline across all 12 Boys divisions.
- Adds explicit regression coverage for 10U Games 91, 94, 97, and 140A.
- Leaves published rankings and normalized tournament results unchanged.
