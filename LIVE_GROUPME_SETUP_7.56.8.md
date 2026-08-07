# WPI Live GroupMe Setup — 7.56.8

WPI 7.56.8 supports two GroupMe transports behind the same persisted delivery, retry, and audit pipeline.

## Preferred: Topic delivery

Topic delivery uses a GroupMe access token stored only as a Supabase Edge Function secret. The token is never stored in GitHub, browser JavaScript, localStorage, or `live_destinations`.

For the pilot, use the secret name:

`GROUPME_ACCESS_TOKEN_WPI_LIVE`

Set the secret from Terminal without sharing the token in chat. Then deploy:

`npx supabase functions deploy groupme-post`

In WPI Live Dashboard:

1. Choose **Topic**.
2. Enter the Supabase secret name if you are the Owner.
3. Load GroupMe groups.
4. Choose the tournament/group.
5. Choose the score-update topic.
6. Enable delivery.
7. Save connection.
8. Send a test message.

The Team Owner is the only role allowed to browse the connected GroupMe account's full group list. A Team Admin can refresh and change the topic only inside the Owner-approved GroupMe, and cannot see or replace the secret-name mapping.

## Fallback: Bot · main chat

The existing Bot API path remains supported. The bot ID stays in a Supabase secret such as:

`GROUPME_BOT_ID_LAMORINDA_A_14U_BOYS`

The bot posts to its configured main GroupMe chat.

## Reliability

- WPI stores each play before attempting delivery.
- Exactly-once claims prevent duplicate sends across scorer devices.
- Automatic retry runs while an authorized WPI Live page remains open.
- Failed events remain available for manual retry.
- Every attempt is retained in delivery audit history.
- Final Whistle is persisted before the active scorer session closes.
