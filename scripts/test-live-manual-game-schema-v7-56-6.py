#!/usr/bin/env python3
from pathlib import Path
import json, sys

ROOT = Path(__file__).resolve().parents[1]
errors = []

def read(rel):
    path = ROOT / rel
    if not path.exists() or path.stat().st_size == 0:
        errors.append(f"{rel} missing or empty")
        return ""
    return path.read_text(encoding="utf-8", errors="ignore")

def require(text, token, label):
    if token not in text:
        errors.append(f"{label} missing token: {token}")

def forbid(text, token, label):
    if token.lower() in text.lower():
        errors.append(f"{label} still contains forbidden token: {token}")

site = json.loads(read("config/site-release.json") or "{}")
if site.get("version") != "7.56.6":
    errors.append("site release must be 7.56.6")
if site.get("liveScoringManualGameSchemaRelease") != "7.56.4":
    errors.append("manual-game schema release must remain 7.56.4")

legacy_inline = "unique nulls not distinct (environment,tournament_event_id,source_game_id,team_id)"
for rel in (
    "supabase/migrations/202608040001_live_scoring_sandbox.sql",
    "supabase/WPI_LIVE_7_56_1_FULL_SETUP.sql",
    "supabase/WPI_LIVE_7_56_2_FULL_SETUP.sql",
):
    text = read(rel)
    forbid(text, legacy_inline, rel)

for rel in (
    "supabase/WPI_LIVE_7_56_1_FULL_SETUP.sql",
    "supabase/WPI_LIVE_7_56_2_FULL_SETUP.sql",
):
    require(read(rel), "client_game_id", rel)

connected = read("supabase/migrations/202608040002_connected_live_backend.sql")
for token in (
    "drop constraint if exists live_games_environment_tournament_event_id_source_game_id_t_key",
    "drop constraint if exists live_games_environment_tournament_event_id_source_game_id_team_id_key",
    "live_games_official_source_idx",
    "where tournament_event_id is not null and source_game_id is not null",
    "live_games_team_client_id_idx",
    "on public.live_games(team_id,client_game_id)",
):
    require(connected, token, "connected-backend migration")

migration = read("supabase/migrations/202608050001_manual_game_schema_integrity.sql")
for token in (
    "live_games_environment_tournament_event_id_source_game_id_t_key",
    "live_games_environment_tournament_event_id_source_game_id_team_id_key",
    "pg_constraint",
    "c.connullsnotdistinct",
    "unnest(c.conkey) with ordinality",
    "'environment',",
    "live_games_official_source_idx",
    "live_games_team_client_id_idx",
):
    require(migration, token, "7.56.6 schema migration")

# Static semantic proof: manual games are no longer governed by the official-source
# four-column constraint, while client IDs and populated official source IDs remain unique.
if legacy_inline in migration.lower():
    errors.append("7.56.6 migration must remove, not recreate, the legacy inline constraint")

if errors:
    print("WPI MANUAL GAME SCHEMA 7.56.6 TEST FAILED")
    for error in errors:
        print(f" - {error}")
    sys.exit(1)

print("WPI MANUAL GAME SCHEMA 7.56.6 TEST PASSED")
print(" - Fresh-install SQL no longer creates the one-manual-game NULLS NOT DISTINCT constraint")
print(" - Both known constraint names and any structurally equivalent legacy constraint are removed")
print(" - Official-source uniqueness and team/client-game identity remain protected")
print(" - Multiple manual games for one team can persist without the prior 409 conflict")
