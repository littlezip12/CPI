# CPI 7.45.1

Tournament identity cleanup and source verification reliability.

- Removes bracket slots, pool placements, and winner/loser destinations from the participant identity bank.
- Strips pool/seed prefixes such as `A1(1)-` and `L1(12)-` before canonical team resolution while preserving the reference and seed as metadata.
- Fixes Girls JO sheets whose Date, Time, Game #, W To, and L To headers are intentionally blank but positionally stable.
- Preserves lettered games such as `5A`, `53B`, and `152A` by deriving their game number from GMID.
- Records a fresh verification timestamp when a live source succeeds even if its CSV content is unchanged.
- Removes tracked macOS metadata/TextClipping artifacts.
- Keeps tournament-only teams outside published CPI rankings and retains manual ranking review.
