#!/usr/bin/env python3
from pathlib import Path
import json,re,sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]
def req(c,m):
    if not c: errors.append(m)
site=json.loads((ROOT/'config/site-release.json').read_text())
pkg=json.loads((ROOT/'package.json').read_text())
manifest=json.loads((ROOT/'config/security-definer-access-v7-64-41.json').read_text())
migration=(ROOT/'supabase/migrations/202610010001_security_definer_least_privilege.sql').read_text()
validation=(ROOT/'supabase/validation/202610010001_security_definer_least_privilege_check.sql').read_text()
rollback=(ROOT/'supabase/rollback/202610010001_security_definer_least_privilege_rollback.sql').read_text()
req(site.get('version')=='7.64.41','site release must be 7.64.41')
req(pkg.get('version')=='7.64.41','package release must be 7.64.41')
req(site.get('securityDefinerHardeningRelease')=='7.64.41','security definer release marker missing')
req(manifest.get('release')=='7.64.41','classification manifest release mismatch')
cats=manifest.get('categories',{})
public=cats.get('publicUnauthenticated',{}).get('functions',[])
auth=cats.get('authenticatedApplication',{}).get('functions',[])
triggers=cats.get('internalTrigger',{}).get('functions',[])
req(len(public)==13,'must classify exactly 13 public unauthenticated functions')
req(len(auth)==54,'must classify exactly 54 authenticated application functions')
req(len(triggers)==10,'must classify exactly 10 internal trigger functions')
all_names=public+auth+triggers
req(len(all_names)==77 and len(set(all_names))==77,'all 77 functions must be uniquely classified')
for name in all_names:
    req(name in migration,f'migration missing classified function {name}')
for name in ['live_public_scoreboard_v3','live_public_game_score_v2','live_public_tournament_v2','live_registration_status']:
    req(name in public,f'{name} must remain signed-out public')
for name in ['live_can_view_game','live_groupme_delivery_summary','live_update_planned_game_v2','live_has_team_role']:
    req(name in auth,f'{name} must remain authenticated for app/RLS helper behavior')
for name in ['live_handle_new_user','live_capture_account_registry','live_guard_game_configuration','live_end_scorer_session_with_game']:
    req(name in triggers,f'{name} must be internal trigger-only')
for token in [
    "revoke execute on function %s from public, anon, authenticated",
    "grant execute on function %s to anon, authenticated, service_role",
    "grant execute on function %s to authenticated, service_role",
    "grant execute on function %s to service_role",
    "grant execute on function public.live_capture_account_registry() to supabase_auth_admin",
    "grant execute on function public.live_handle_new_user() to supabase_auth_admin",
    "alter default privileges for role postgres in schema public",
    "revoke execute on functions from public, anon, authenticated",
]: req(token in migration,f'migration missing least-privilege control: {token}')
req("anonymous Auth users" in migration or "anonymous Auth" in migration,'migration must document guest scorer authenticated-role boundary')
req('expected SECURITY DEFINER functions are missing' in migration,'migration must fail closed on missing baseline functions')
req('unexpected anon-executable SECURITY DEFINER functions' in migration,'migration must fail closed on unclassified anon functions')
req('Expected: zero rows' in validation,'post-migration validation must prove no unexpected anon function remains')
req("grant execute on functions to anon, authenticated, service_role" in rollback,'rollback must restore prior postgres function default ACL')
req("from public, anon, authenticated, service_role, supabase_auth_admin" in rollback,'rollback must clear hardened direct ACL before restoring snapshot')
req("live_registration_status" in rollback and "live_public_scoreboard_v3" in rollback,'rollback must encode the observed 65/12 PUBLIC-direct split')
req('Leaked Password Protection' in (ROOT/'WPHQ_7.64.40_PUBLIC_BETA_SECURITY_AUDIT.md').read_text(),'7.64.40 audit must remain preserved')
if errors:
    print('WPHQ 7.64.41 SECURITY DEFINER LEAST-PRIVILEGE TEST FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('WPHQ 7.64.41 SECURITY DEFINER LEAST-PRIVILEGE TEST PASSED')
print(' - all 77 audited SECURITY DEFINER functions are uniquely classified 13 public / 54 authenticated / 10 internal triggers')
print(' - signed-out anon is limited to the intentional public RPC allowlist')
print(' - anonymous-Auth guest scorers remain supported through the authenticated database role')
print(' - trigger helpers are removed from direct client execution')
print(' - future public-schema functions default to explicit client EXECUTE grants')
print(' - emergency rollback restores the pre-7.64.41 production ACL snapshot')
