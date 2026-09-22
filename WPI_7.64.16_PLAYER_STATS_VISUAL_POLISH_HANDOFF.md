# WPI 7.64.16 — Player Stats Visual Polish Handoff

Built from pushed baseline `CPI-main - 2026-09-21T190412.414.zip`.

The desktop Player Stats comparison was inheriting WPI's legacy global `table`, `th`, and `td` theme. That global theme uses a dark translucent table background and dark navy header cells, which produced the heavy slate/navy comparison shown in the laptop screenshot even though the Player Stats module intended a light experience.

7.64.16 fixes the conflict at the Player Stats stylesheet boundary rather than changing the global table system. The comparison table now explicitly sets a white table surface, light stat labels, white/very-light zebra value rows, dark readable values, soft section bands, and slightly larger spacing/type. Mobile Player Stats remain unchanged.

No Supabase migration or Edge Function deployment is required.
