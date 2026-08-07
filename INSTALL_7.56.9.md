# Install WPI 7.56.9 — Live UX Refresh

This release is installed over the current pushed WPI 7.56.8 repository.

## 1. Make sure the current repo is clean

```bash
cd /PATH/TO/CPI-main
git status --short
```

If that command prints unexpected local changes, stop before installing.

Optional safety pointer:

```bash
git branch wpi-7.56.8-before-7.56.9
```

## 2. Extract the release into a temporary directory

```bash
rm -rf /tmp/WPI-7.56.9
mkdir -p /tmp/WPI-7.56.9
unzip -q "$HOME/Downloads/WPI-release-7.56.9-live-ux-refresh.zip" -d /tmp/WPI-7.56.9
```

## 3. Copy the release over the current repository

Run this while still inside your current `CPI-main` repository:

```bash
rsync -av --exclude '.git/' /tmp/WPI-7.56.9/CPI-main/ ./
```

## 4. Run the WPI Live 7.56.9 protected regression gate

```bash
./release-check-live-7.56.9
```

Expected final line:

```text
WPI Live 7.56.9 focused release check passed.
```

This check protects the 7.56.8 backend/GroupMe/Topic assets with byte-for-byte hashes and validates the 7.56.9 UX, analytics schema, scorer-control paths, and frozen rankings/clubs.

## 5. Run the complete WPI release gate

```bash
./release-check
```

This is the slow check because it rebuilds and audits the deterministic tournament/season datasets before running the full regression suite.

Expected final line:

```text
CPI release check passed.
```

## 6. Review the repository before pushing

```bash
git status --short
git diff --stat
git diff -- config/site-release.json VERSION.md
```

Do not push if either release check failed.

## 7. Push only after both checks pass

Recommended commit message:

```text
WPI 7.56.9 — Live UX Refresh
```

After the hosted site updates, run the live smoke test before treating 7.56.9 as authoritative:

1. Sign into WPI Live.
2. Confirm GroupMe setup still loads the tournament GroupMe and Score Updates topic.
3. Send a test GroupMe message.
4. Create/open a fresh game on a phone.
5. Record a normal event and verify the event is stored and GroupMe receives it.
6. Transfer scoring and accept on the second device.
7. Record another event and verify delivery.
8. Admin takeover, then record another event.
9. End a quarter and confirm the next-period workflow.
10. End the game and confirm Final Whistle delivery.
11. Review the game/timeline/delivery audit so structured analytics records are present.

No Supabase migration, secret update, or Edge Function redeploy is required for this release.
