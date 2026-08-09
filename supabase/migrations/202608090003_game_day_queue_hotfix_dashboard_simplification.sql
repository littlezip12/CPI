-- WPI 7.57.11 — Game-Day Queue Hotfix & Dashboard Simplification.
--
-- PostgreSQL functions accept at most 100 arguments. The 7.57.9 queue used one
-- jsonb_build_object call with more than 50 key/value pairs (>100 arguments), so
-- the queue could fail at runtime after a game had already saved successfully.
-- This migration keeps the exact public RPC name and response keys, but builds
-- the JSON row in smaller chunks and concatenates them safely.

create or replace function public.live_game_day_queue_v4(target_team_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  member_role public.live_team_role;
  queue jsonb := '[]'::jsonb;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  select role into member_role from public.live_team_members where team_id=target_team_id and user_id=caller;
  if member_role is null then raise exception 'Team membership required'; end if;

  select coalesce(jsonb_agg(row_data order by sort_rank,sort_mine,sort_time asc nulls last,sort_updated desc),'[]'::jsonb)
  into queue
  from (
    select
      case g.status when 'live' then 0 when 'scheduled' then 1 when 'setup' then 2 when 'final' then 3 else 4 end as sort_rank,
      case when g.assigned_scorer_user_id=caller then 0 when g.assigned_scorer_user_id is null then 1 else 2 end as sort_mine,
      g.scheduled_at as sort_time,
      g.updated_at as sort_updated,
      (
        jsonb_build_object(
          'id',g.id,
          'clientGameId',g.client_game_id,
          'teamId',g.team_id,
          'teamName',g.team_name_snapshot,
          'opponentName',g.opponent_name,
          'opponentSourceName',coalesce(g.opponent_source_name,g.opponent_name),
          'scheduledAt',g.scheduled_at,
          'venue',g.venue,
          'ageGroup',g.age_group,
          'quarterLengthSeconds',g.quarter_length_seconds,
          'status',g.status,
          'teamScore',g.team_score,
          'opponentScore',g.opponent_score,
          'startedAt',g.started_at,
          'endedAt',g.ended_at,
          'updatedAt',g.updated_at,
          'gameKind',g.game_kind,
          'creationSource',g.creation_source
        )
        || jsonb_build_object(
          'tournamentName',g.tournament_name,
          'scheduledTimezone',g.scheduled_timezone,
          'tournamentPublicId',g.tournament_public_id,
          'officialTournamentEventId',g.tournament_event_id,
          'officialSourceGameId',g.source_game_id,
          'opponentWpiTeamId',g.opponent_wpi_team_id,
          'opponentWpiClubId',g.opponent_wpi_club_id,
          'teamLogoUrl',g.team_logo_url,
          'opponentLogoUrl',g.opponent_logo_url,
          'reconciliationStatus',g.reconciliation_status,
          'reconciliationConfidence',g.reconciliation_confidence,
          'reconciliationCandidateEventId',g.reconciliation_candidate_event_id,
          'reconciliationCandidateGameId',g.reconciliation_candidate_game_id,
          'reconciliationCandidateSnapshot',g.reconciliation_candidate_snapshot,
          'officialScheduledAt',g.official_scheduled_at,
          'officialVenue',g.official_venue,
          'officialOpponentName',g.official_opponent_name,
          'officialDivisionId',g.official_division_id
        )
        || jsonb_build_object(
          'officialDivisionLabel',g.official_division_label,
          'officialGameNumber',g.official_game_number,
          'officialStage',g.official_stage,
          'officialStatus',g.official_status,
          'officialTeamScore',g.official_team_score,
          'officialOpponentScore',g.official_opponent_score,
          'officialLastSeenAt',g.official_last_seen_at,
          'assignedScorerUserId',g.assigned_scorer_user_id,
          'assignedScorerDisplayName',g.assigned_scorer_display_name,
          'assignedAt',g.assigned_at,
          'assignedBy',g.assigned_by,
          'isAssignedToMe',g.assigned_scorer_user_id=caller,
          'canStart',case
            when g.status='live' then true
            when g.status not in ('setup','scheduled') or g.started_at is not null then false
            when member_role in ('owner','admin') then true
            when member_role='scorer' and (g.assigned_scorer_user_id is null or g.assigned_scorer_user_id=caller) then true
            else false
          end,
          'cancelledReason',g.cancelled_reason,
          'canManage',member_role in ('owner','admin')
        )
      ) as row_data
    from public.live_games g
    where g.team_id=target_team_id and g.status <> 'cancelled'
  ) rows;

  return jsonb_build_object('role',member_role,'games',queue);
end;
$$;

grant execute on function public.live_game_day_queue_v4(uuid) to authenticated;

comment on function public.live_game_day_queue_v4(uuid)
is 'Returns the Game-Day queue using chunked JSON construction to stay below PostgreSQL function argument limits.';
