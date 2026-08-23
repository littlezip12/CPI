-- WPI 7.64.3 — Mega-Event Load Test & Capacity Gate
--
-- Production-safe capacity-gate ledger + server-side gate evaluation.
-- This migration DOES NOT generate synthetic games, open load-test traffic,
-- alter scorer authority, change WPI Live scoring behavior, or purchase/enable
-- any infrastructure tier. Full mega-event certification must be performed
-- against an intentionally isolated/staging target.

create table if not exists public.live_capacity_test_runs (
  id uuid primary key default gen_random_uuid(),
  run_label text not null check (char_length(trim(run_label)) between 1 and 120),
  target_environment text not null check (target_environment in ('production_smoke','staging','isolated')),
  target_project_host text,
  run_mode text not null check (run_mode in ('smoke','isolated_load','mega_event')),
  harness_release text not null default '7.64.3',
  started_at timestamptz,
  completed_at timestamptz not null,
  configuration jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  gate_status text not null check (gate_status in ('pass','watch','fail','not_certified')),
  notes text check (notes is null or char_length(notes) <= 2000),
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists live_capacity_test_runs_completed_idx
  on public.live_capacity_test_runs(completed_at desc,created_at desc);

alter table public.live_capacity_test_runs enable row level security;

drop policy if exists live_capacity_test_runs_platform_owner_select on public.live_capacity_test_runs;
create policy live_capacity_test_runs_platform_owner_select
  on public.live_capacity_test_runs for select
  to authenticated
  using (public.live_is_platform_owner());

drop policy if exists live_capacity_test_runs_platform_owner_insert on public.live_capacity_test_runs;
create policy live_capacity_test_runs_platform_owner_insert
  on public.live_capacity_test_runs for insert
  to authenticated
  with check (public.live_is_platform_owner() and created_by=auth.uid());

drop policy if exists live_capacity_test_runs_platform_owner_update on public.live_capacity_test_runs;
create policy live_capacity_test_runs_platform_owner_update
  on public.live_capacity_test_runs for update
  to authenticated
  using (public.live_is_platform_owner())
  with check (public.live_is_platform_owner());

drop policy if exists live_capacity_test_runs_platform_owner_delete on public.live_capacity_test_runs;
create policy live_capacity_test_runs_platform_owner_delete
  on public.live_capacity_test_runs for delete
  to authenticated
  using (public.live_is_platform_owner());

comment on table public.live_capacity_test_runs is
  'Platform Owner capacity-test evidence ledger. Stores sanitized metrics/configuration only; never credentials, tokens, service-role keys, or synthetic game data.';

-- WPI-owned operational thresholds. These are release gates, not vendor claims.
create or replace function public.live_capacity_gate_thresholds_v1()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'release','7.64.3',
    'targets',jsonb_build_object(
      'eventGames',6000,
      'activeGames',100,
      'simultaneousViewers',10000
    ),
    'pass',jsonb_build_object(
      'publicReadP95Ms',750,
      'publicReadP99Ms',1500,
      'publicReadErrorRatePct',0.5,
      'realtimeDeliveryP95Ms',1000,
      'realtimeDropRatePct',0.5,
      'finalizeBurstP95Ms',1500,
      'finalizeErrorRatePct',0.5,
      'adTelemetryP95DeltaPct',10,
      'dbCpuP95Pct',70,
      'dbConnectionsPeakPct',70,
      'scoreIntegrityPct',100
    ),
    'watch',jsonb_build_object(
      'publicReadP95Ms',1500,
      'publicReadP99Ms',2500,
      'publicReadErrorRatePct',2.0,
      'realtimeDeliveryP95Ms',2500,
      'realtimeDropRatePct',2.0,
      'finalizeBurstP95Ms',3000,
      'finalizeErrorRatePct',2.0,
      'adTelemetryP95DeltaPct',25,
      'dbCpuP95Pct',85,
      'dbConnectionsPeakPct',85,
      'scoreIntegrityPct',100
    ),
    'minimumEvidence',jsonb_build_object(
      'publicReadSamples',10000,
      'realtimeViewerSessions',10000,
      'realtimeMessageSamples',10000,
      'scoreIntegrityCheckedGames',100,
      'finalizeBurstGames',100
    ),
    'note','WPI operational release thresholds. PASS is only available to a full isolated mega-event run with all required evidence.'
  );
$$;

revoke all on function public.live_capacity_gate_thresholds_v1() from public,anon;
grant execute on function public.live_capacity_gate_thresholds_v1() to authenticated;

-- Evaluate a sanitized report on the server so PASS/WATCH/FAIL is not trusted
-- solely from a client-generated label.
create or replace function public.live_evaluate_capacity_gate_v1(
  run_mode_value text,
  configuration_value jsonb,
  metrics_value jsonb
)
returns text
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  mode_name text := lower(trim(coalesce(run_mode_value,'')));
  isolated boolean := coalesce((configuration_value->>'confirmedIsolatedTarget')::boolean,false);
  target_games integer := coalesce((configuration_value->>'eventGames')::integer,0);
  target_active integer := coalesce((configuration_value->>'activeGames')::integer,0);
  target_viewers integer := coalesce((configuration_value->>'simultaneousViewers')::integer,0);

  read_samples bigint := coalesce((metrics_value#>>'{publicRead,samples}')::bigint,0);
  read_p95 numeric := nullif(metrics_value#>>'{publicRead,p95Ms}','')::numeric;
  read_p99 numeric := nullif(metrics_value#>>'{publicRead,p99Ms}','')::numeric;
  read_error numeric := nullif(metrics_value#>>'{publicRead,errorRatePct}','')::numeric;

  realtime_viewers bigint := coalesce((metrics_value#>>'{realtime,viewerSessions}')::bigint,0);
  realtime_samples bigint := coalesce((metrics_value#>>'{realtime,messageSamples}')::bigint,0);
  realtime_p95 numeric := nullif(metrics_value#>>'{realtime,deliveryP95Ms}','')::numeric;
  realtime_drop numeric := nullif(metrics_value#>>'{realtime,dropRatePct}','')::numeric;

  integrity_games bigint := coalesce((metrics_value#>>'{scoring,scoreIntegrityCheckedGames}')::bigint,0);
  integrity_pct numeric := nullif(metrics_value#>>'{scoring,scoreIntegrityPct}','')::numeric;
  finalize_games bigint := coalesce((metrics_value#>>'{scoring,finalizeBurstGames}')::bigint,0);
  finalize_p95 numeric := nullif(metrics_value#>>'{scoring,finalizeBurstP95Ms}','')::numeric;
  finalize_error numeric := nullif(metrics_value#>>'{scoring,finalizeErrorRatePct}','')::numeric;

  ad_delta numeric := nullif(metrics_value#>>'{ads,telemetryP95DeltaPct}','')::numeric;
  cpu_p95 numeric := nullif(metrics_value#>>'{database,cpuP95Pct}','')::numeric;
  connections_peak numeric := nullif(metrics_value#>>'{database,connectionsPeakPct}','')::numeric;
  result text := 'pass';
begin
  -- Smoke/read-only runs can be useful evidence, but never certification.
  if mode_name <> 'mega_event' then return 'not_certified'; end if;
  if not isolated then return 'not_certified'; end if;
  if target_games < 6000 or target_active < 100 or target_viewers < 10000 then return 'not_certified'; end if;

  -- Missing minimum evidence must never silently pass.
  if read_samples < 10000
     or realtime_viewers < 10000
     or realtime_samples < 10000
     or integrity_games < 100
     or finalize_games < 100
     or read_p95 is null or read_p99 is null or read_error is null
     or realtime_p95 is null or realtime_drop is null
     or integrity_pct is null or finalize_p95 is null or finalize_error is null
     or ad_delta is null or cpu_p95 is null or connections_peak is null then
    return 'not_certified';
  end if;

  -- Integrity is absolute: any confirmed score mismatch is a FAIL.
  if integrity_pct < 100 then return 'fail'; end if;

  -- Hard FAIL thresholds.
  if read_p95 > 1500 or read_p99 > 2500 or read_error > 2.0
     or realtime_p95 > 2500 or realtime_drop > 2.0
     or finalize_p95 > 3000 or finalize_error > 2.0
     or ad_delta > 25 or cpu_p95 > 85 or connections_peak > 85 then
    return 'fail';
  end if;

  -- WATCH band: safe enough to inspect, not a clean scale PASS.
  if read_p95 > 750 or read_p99 > 1500 or read_error > 0.5
     or realtime_p95 > 1000 or realtime_drop > 0.5
     or finalize_p95 > 1500 or finalize_error > 0.5
     or ad_delta > 10 or cpu_p95 > 70 or connections_peak > 70 then
    result := 'watch';
  end if;

  return result;
end;
$$;

revoke all on function public.live_evaluate_capacity_gate_v1(text,jsonb,jsonb) from public,anon;
grant execute on function public.live_evaluate_capacity_gate_v1(text,jsonb,jsonb) to authenticated;

create or replace function public.live_record_capacity_test_v1(run_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
  payload_text text := lower(coalesce(run_payload::text,''));
  label_value text := nullif(trim(coalesce(run_payload->>'runLabel','')),'');
  env_value text := lower(trim(coalesce(run_payload->>'targetEnvironment','production_smoke')));
  host_value text := nullif(lower(trim(coalesce(run_payload->>'targetProjectHost',''))),'');
  mode_value text := lower(trim(coalesce(run_payload->>'runMode','smoke')));
  config_value jsonb := coalesce(run_payload->'configuration','{}'::jsonb);
  metric_value jsonb := coalesce(run_payload->'metrics','{}'::jsonb);
  notes_value text := nullif(trim(coalesce(run_payload->>'notes','')),'');
  started_value timestamptz := nullif(run_payload->>'startedAt','')::timestamptz;
  completed_value timestamptz := coalesce(nullif(run_payload->>'completedAt','')::timestamptz,now());
  evaluated text;
  new_id uuid;
begin
  if caller is null or not public.live_is_platform_owner() then
    raise exception 'Platform Owner access required';
  end if;
  if label_value is null then raise exception 'Run label is required'; end if;
  if mode_value not in ('smoke','isolated_load','mega_event') then raise exception 'Unsupported run mode'; end if;
  if env_value not in ('production_smoke','staging','isolated') then raise exception 'Unsupported target environment'; end if;

  -- Reports must never become a place where credentials are stored.
  if payload_text ~ '(service[_-]?role|bearer[[:space:]]|authorization|access[_-]?token|refresh[_-]?token|secret[_-]?key|api[_-]?key|anon[_-]?key|publishable[_-]?key)' then
    raise exception 'Capacity reports may not contain credentials, tokens, or API keys';
  end if;

  if mode_value='mega_event' then
    if not coalesce((config_value->>'confirmedIsolatedTarget')::boolean,false) then
      raise exception 'Mega-event reports require confirmedIsolatedTarget=true';
    end if;
    if host_value='jmdamtxspyshjxgmunda.supabase.co' then
      raise exception 'Mega-event certification may not target the current WPI production Supabase project';
    end if;
  end if;

  evaluated := public.live_evaluate_capacity_gate_v1(mode_value,config_value,metric_value);

  insert into public.live_capacity_test_runs(
    run_label,target_environment,target_project_host,run_mode,harness_release,
    started_at,completed_at,configuration,metrics,gate_status,notes,created_by
  ) values (
    label_value,env_value,host_value,mode_value,'7.64.3',
    started_value,completed_value,config_value,metric_value,evaluated,notes_value,caller
  ) returning id into new_id;

  return jsonb_build_object('id',new_id,'gateStatus',evaluated,'recordedAt',now());
end;
$$;

revoke all on function public.live_record_capacity_test_v1(jsonb) from public,anon;
grant execute on function public.live_record_capacity_test_v1(jsonb) to authenticated;

create or replace function public.live_capacity_gate_status_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  latest public.live_capacity_test_runs%rowtype;
  clean_pass public.live_capacity_test_runs%rowtype;
begin
  if auth.uid() is null or not public.live_is_platform_owner() then
    raise exception 'Platform Owner access required';
  end if;

  select * into latest
  from public.live_capacity_test_runs
  order by completed_at desc,created_at desc
  limit 1;

  select * into clean_pass
  from public.live_capacity_test_runs
  where run_mode='mega_event' and gate_status='pass'
  order by completed_at desc,created_at desc
  limit 1;

  return jsonb_build_object(
    'release','7.64.3',
    'thresholds',public.live_capacity_gate_thresholds_v1(),
    'latestRun',case when latest.id is null then null else jsonb_build_object(
      'id',latest.id,
      'runLabel',latest.run_label,
      'targetEnvironment',latest.target_environment,
      'targetProjectHost',latest.target_project_host,
      'runMode',latest.run_mode,
      'harnessRelease',latest.harness_release,
      'startedAt',latest.started_at,
      'completedAt',latest.completed_at,
      'configuration',latest.configuration,
      'metrics',latest.metrics,
      'gateStatus',latest.gate_status,
      'notes',latest.notes
    ) end,
    'certification',jsonb_build_object(
      'passed',clean_pass.id is not null,
      'runId',clean_pass.id,
      'completedAt',clean_pass.completed_at,
      'stale',case when clean_pass.id is null then false else clean_pass.completed_at < now()-interval '90 days' end,
      'note',case
        when clean_pass.id is null then 'No full isolated mega-event PASS has been recorded.'
        when clean_pass.completed_at < now()-interval '90 days' then 'The most recent PASS is older than 90 days and should be rerun before a major event.'
        else 'A full isolated mega-event PASS is recorded. Revalidate after material architecture/infrastructure changes.'
      end
    ),
    'generatedAt',now()
  );
end;
$$;

revoke all on function public.live_capacity_gate_status_v1() from public,anon;
grant execute on function public.live_capacity_gate_status_v1() to authenticated;

comment on function public.live_capacity_gate_status_v1() is
  'Platform Owner capacity gate status. PASS requires a full isolated 6K-game / 100-active-game / 10K-viewer evidence set; smoke probes can never certify.';
