# WPI 7.64.4 — Mobile Game Setup & Scoring Polish

WPI 7.64.4 tightens the poolside Owner/Admin experience before ECC. On phones, Add game is now a guided four-step flow: game type, opponent/event, game details, and review/start. Desktop keeps the existing all-at-once workflow.

The live scoring clock now includes an explicit **Set time ✓** control and `enterkeyhint="done"`, so a scorer can type `645` or `6:45`, confirm it intentionally, and dismiss the mobile keypad before recording the play. The release also adds narrow-screen containment rules for dialogs, inputs, scoreboard rows, action areas, and the active scoring shell to prevent horizontal overflow.

No Supabase migration is required. Protected scoring/backend files are unchanged. No Edge Function redeploy, secret, Stripe activation, hosting migration, or infrastructure change is required.
