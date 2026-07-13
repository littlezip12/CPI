# CPI Team Alias + Data QA Guide — Release 7.31

## Main review file

Start with:

`data/qa/team-alias-fixes-template-7-31.csv`

This is the working file to edit before 7.32. The most important columns to update are:

- `decision` — merge, rename, keep separate, re-club, logo only, defer
- `canonical_team_name`
- `canonical_team_slug`
- `canonical_club`
- `canonical_club_slug`
- `merge_into_existing_slug`
- `keep_separate`
- `notes`

## Issue type definitions

- `possible_duplicate_team_name` — team names normalize to the same base inside the same age/gender group.
- `same_club_multiple_teams_in_group` — one club has multiple teams in the same age/gender group; usually valid, but needs A/B/color confirmation.
- `same_club_depth_collision` — multiple same-club teams have the same depth value.
- `lower_depth_above_primary_same_club` — a lower-depth team is ranked above a primary team from the same club.
- `team_name_suggests_b_but_depth_primary` — name looks like B/White/Silver but is marked as primary.
- `team_name_suggests_primary_color_but_low_depth` — name looks primary/color but is marked lower-depth.
- `official_logo_needed` — logo file exists, but the registry still treats it as a generated/placeholder-type logo.
- `low_games_high_rank_review` — top 25 team has fewer than five tracked games.
- `quiksilver_evidence_review` — Quiksilver evidence affected metadata/rank movement and should be reviewed after alias cleanup.
- `manual_review_note_present` / `provisional_or_identity_review` — previous release carried a manual/provisional identity note.

## Recommended 7.32 input

For 7.32, send back the edited `team-alias-fixes-template-7-31.csv` with only the rows you want changed, or the full file with decisions filled in.
