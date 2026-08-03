# WPI 7.54.18 Club Location Source Review

## Authoritative source

The user-reviewed workbook `WPI-7.54.17-Club-Location-Audit(1).xlsx` is authoritative for Current Region, Current City, and Current State.

## Applied coverage

- 182 canonical clubs reviewed
- All 182 clubs have a city-level location
- Back Bay: Irvine, California — Orange County region
- 119 California clubs remain assigned to one of nine WPI California regions
- 62 additional U.S. clubs are assigned to Hawaii or a directional national region
- Barcelona Lions is assigned to Barcelona, Spain / International

## National region policy

- Hawaii: HI
- Northwest: WA, OR, ID, AK
- Southwest: AZ, NM, NV, TX, OK
- Mountain West: CO, UT, MT, WY
- Midwest: IL, IN, IA, KS, MI, MN, MO, NE, ND, OH, SD, WI
- Northeast: CT, DC, DE, MD, ME, MA, NH, NJ, NY, PA, RI, VT
- Southeast: AL, AR, FL, GA, KY, LA, MS, NC, SC, TN, VA, WV
- International: non-U.S. clubs

## Normalization

- Leading/trailing whitespace was removed.
- The obvious city typo `Berkely` was normalized to `Berkeley`.
- User-entered operating-area labels such as Central Valley, Marin, and San Fernando Valley were preserved rather than replaced with guessed municipalities.

## Map source

The state-boundary SVG is derived from Wikimedia Commons `Blank US Map (states only)`, which is dedicated to the public domain under CC0. The local asset contains the attribution and source URL in SVG metadata.
