# CPI 7.48.1

Historical archive source-hash consistency hotfix.

- Canonicalizes Google CSV line endings before parsing, hashing, comparing, and storing source snapshots.
- Prevents CRLF responses from producing raw/normalized/QA hash mismatches.
- Repairs stale stored hash metadata when the canonical source content is otherwise unchanged.
- Adds regression coverage proving LF and CRLF versions of the same tournament source produce identical hashes.
- Does not change tournament results, rankings, identity logic, or archive evidence policy.
