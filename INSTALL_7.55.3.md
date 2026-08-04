# Install WPI 7.55.3

Apply this cumulative patch over the pushed WPI 7.55.2 repository.

```bash
cd "/Users/tylerdeshazer/Documents/GitHub/CPI"
PATCH="$(find "$HOME/Downloads" -maxdepth 1 -iname "CPI-7.55.3-LIVE-SCORING-AUTH-MOBILE-WORKFLOW*.zip" -print | head -1)"
ditto -x -k "$PATCH" .
find . -name ".DS_Store" -delete
chmod +x release-check
./release-check
```

Commit only after the exact final line:

```text
CPI release check passed.
```

After GitHub Pages publishes, open:

```text
https://littlezip12.github.io/CPI/live-login.html
```

In demo mode, choose **Continue to local sandbox**. Secure account creation and sign-in become active after the team-owned Supabase project URL and publishable key are added to `config/live-sandbox.js`.
