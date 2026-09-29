# Install WPHQ 7.64.36

From the CPI repo root:

```bash
unzip -o ~/Downloads/WPI_7.64.36_ECC_JO_STYLE_JOURNEY_ROUTING_PATCH.zip -d .
./release-check-live-7.64.36
```

Do not commit/push unless the final gate says:

```text
Water Polo HQ 7.64.36 ECC schedule publication check passed.
```

Then validate the public ECC page in the browser. Recommended first check: select **14U Boys Platinum → Lamorinda A** and confirm the page shows the two known Saturday games plus named-team possible Sunday paths rather than raw bracket codes.

After browser validation, commit/push in GitHub Desktop and send a fresh GitHub ZIP. That pushed ZIP becomes the next authoritative baseline.

`npm run mobile:sync` is optional for this browser-first tournament validation; run it before testing the updated tournament surface inside the locally installed native shell.

No Supabase migration or Edge Function deployment is required.
