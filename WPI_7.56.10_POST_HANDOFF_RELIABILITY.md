# WPI 7.56.10 — Post-Handoff Delivery Reliability

Built from the hosted 7.56.9 Live UX Refresh after live smoke testing.

## Live issue reproduced from validation
- Goal delivery worked after scorer transfer.
- Save and Field Block did not appear in GroupMe.
- End Game / Final Whistle did not complete reliably after the transfer.

## Root causes addressed
1. Fresh games still defaulted to `messageFrequency: "major"`.
   Goal is a major event, while Save and Field Block are `all` events.
   7.56.10 changes fresh games to `messageFrequency: "all"`.

2. End Game used a scheduled background sync after changing the game to ended.
   7.56.10 makes End Game explicitly await the final server sync and delivery path.

## Backend protection
- No Supabase migration.
- No GroupMe secret changes.
- 7.56.8 connected backend / Topic delivery / Bot fallback remain unchanged.

## Added regression check
Run:

```bash
python3 scripts/test-live-post-handoff-delivery-v7-56-10.py
node --check js/live-sandbox-v7-56-10.js
```

Expected:

```text
WPI POST-HANDOFF DELIVERY 7.56.10 TEST PASSED
```

## Hosted smoke test after push
1. Start a brand-new game.
2. Goal -> confirm WPI + GroupMe.
3. Save -> confirm WPI + GroupMe.
4. Field Block -> confirm WPI + GroupMe.
5. Transfer scoring.
6. Repeat Goal / Save / Field Block on receiving device.
7. End game from receiving device.
8. Wait for `Final saved`.
9. Confirm Final Whistle in GroupMe.
10. Confirm final game and events are present in WPI game history.
