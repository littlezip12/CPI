# WPHQ 7.64.45 — Coach Report Contrast Cache-Bust Hotfix

## Root cause
The 7.64.44 patch changed CSS bytes but did not change the stylesheet URL in `live-team-insights.html`. The page still requested `css/live-team-insights-v7-64-43.css?v=7.64.43`, so a browser or Capacitor WebView could continue using the cached 7.64.43 asset. The screenshot symptom matched that exactly: the sticky player-name column was white because it had an explicit background in 7.64.43, while the remaining cells showed the dark global `table` background.

## Fix
- new physical stylesheet: `css/live-team-insights-v7-64-45.css`
- page now loads it as `?v=7.64.45`
- Coach Report body cells explicitly use light backgrounds/readable text
- zebra and hover states remain light
- full 7.64.43 Coach Report logic remains unchanged
- 7.64.42 ECC Google behavior and 7.64.41 Supabase hardening remain preserved

No Supabase work is required.
