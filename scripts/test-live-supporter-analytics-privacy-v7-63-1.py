#!/usr/bin/env python3
from pathlib import Path
import hashlib, json

ROOT = Path(__file__).resolve().parents[1]
MIG = ROOT / 'supabase/migrations/202608170002_supporter_analytics_privacy_correction.sql'

EXPECTED_PROTECTED = {
    'js/live-backend-v7-56-8.js': 'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
    'js/live-game-v7-58-6.js': '5cb97ca79e8794e9d34cb5f958462d3e86121ec152afed6f64516a2941368b76',
    'js/live-game-storage-v7-58-6.js': 'ded90608e0ef38249382e692774f59b41ab59712fb80bf96fe4a66ad05567353',
    'supabase/functions/groupme-post/index.ts': '1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
    'supabase/functions/roster-extract/index.ts': '26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb',
}

def req(condition, message):
    if not condition:
        raise AssertionError(message)

def read(path):
    req(path.exists(), f'Missing file: {path.relative_to(ROOT)}')
    return path.read_text(encoding='utf-8')

version = read(ROOT/'VERSION.md')
site = json.loads(read(ROOT/'config/site-release.json'))
sql = read(MIG)

req(any(v in version for v in ('WPI 7.63.1','WPI 7.63.2','WPI 7.63.3','WPI 7.63.4','WPI 7.63.5','WPI 7.63.6','WPI 7.63.7')), 'VERSION must preserve 7.63.1')
req(site.get('version') in {'7.63.1','7.63.2','7.63.3','7.63.4','7.63.5','7.63.6','7.63.7'}, 'site release must preserve 7.63.1')

for needle in [
    "live_has_team_role(game_team_id,array['owner','admin','scorer']::public.live_team_role[])",
    "can_view_detail := member_role in ('owner','admin','scorer') or entitlement_level in ('team_insights','organization_insights')",
    "is_follower := member_role='viewer' or (member_role is null and public.live_is_team_follower(game_row.team_id))",
    "when member_role in ('owner','admin','scorer') then 'team_role'",
    'create policy live_events_operational_read',
    'create policy live_lineups_operational_read',
    'create policy live_game_recaps_operational_read',
]:
    req(needle in sql, f'Missing 7.63.1 privacy correction: {needle}')

for forbidden in [
    "can_view_detail := member_role is not null",
    "if not public.live_is_team_member(game_team_id) and access_level='none' then",
    'create policy live_events_member_read',
    'create policy live_lineups_member_read',
    'create policy live_game_recaps_member_read',
]:
    req(forbidden not in sql, f'7.63.1 reintroduced viewer access path: {forbidden}')

# Paid entitlement remains independent from operational role.
req("entitlement_level in ('team_insights','organization_insights')" in sql,
    'Explicit paid analytics entitlements must still unlock detail')

for rel, expected in EXPECTED_PROTECTED.items():
    p = ROOT/rel
    req(p.exists(), f'Protected file missing: {rel}')
    req(hashlib.sha256(p.read_bytes()).hexdigest() == expected, f'Protected file changed: {rel}')

print('WPI 7.63.1 Supporter analytics privacy correction regression passed.')
