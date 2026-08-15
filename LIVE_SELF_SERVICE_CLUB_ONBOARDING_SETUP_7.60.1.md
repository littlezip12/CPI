# WPI Live — Self-Service Club Onboarding Setup 7.60.1

## Goal

Turn the manually established Lamorinda pilot setup into a safe, repeatable onboarding path for the next real WPI Live club.

## Operating model

The workflow is intentionally **request → Platform Owner review → provisioning**.

1. Organizer signs in or creates an onboarding-only WPI Live account.
2. Organizer searches the canonical 182-club WPI directory.
3. If the club exists, they select it and preview the canonical logo/colors.
4. If it truly does not exist, they may submit a new/unlisted club name for review.
5. Organizer defines the first team: age, Boys/Girls/Coed, optional squad label, season, and editable team name.
6. Submission creates only a pending onboarding request. It grants no team or club authority.
7. The existing WPI Live Platform Owner reviews the requester + identity + first-team proposal.
8. Approval occurs transactionally and creates:
   - one `live_clubs` workspace;
   - requester Club Owner membership;
   - one first `live_teams` record;
   - requester Team Owner membership with GroupMe-management capability;
   - one empty active roster for that team.
9. Branding remains neutral until a separate reviewed Live-theme activation is performed.

## Identity and permission safeguards

- A canonical WPI club with an existing active Live workspace cannot be claimed again.
- Only one pending request may exist for a canonical club identity.
- New/unlisted names are checked against pending requests and active Live club names.
- Onboarding account creation alone does not create memberships, scorer authority, roster access, GroupMe access, or branding authority.
- Review RPC requires `live_is_platform_owner()`.
- Direct authenticated table access to onboarding requests is not opened; browser operations use narrow security-definer RPCs.
- Team signup outside the dedicated onboarding path remains invite/bootstrap-only.

## Branding behavior

7.60.1 reuses the 7.60.0 canonical club-theme registry but does not alter theme activation. Lamorinda remains the only enabled production Live theme. Approval returns `brandingState = reviewed_activation_required`.

## Database change

Apply `202608140003_self_service_club_onboarding.sql` once in Supabase SQL Editor.

No Edge Function deploy and no new secret are required.

## External dependency preserved

The production 2026–2027 tournament schedule index remains at zero official current-season games until an actual source is published. Do not fabricate schedule data to validate onboarding.
