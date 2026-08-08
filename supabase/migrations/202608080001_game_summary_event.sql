-- WPI 7.56.13 — allow one auditable post-game summary event.
-- This keeps GroupMe Summary delivery on the same persisted-event,
-- exactly-once delivery/retry/audit pipeline as normal scoring messages.

begin;

alter table public.live_events drop constraint if exists live_events_event_type_check;
alter table public.live_events add constraint live_events_event_type_check check (event_type in (
  'goal','opponent_goal','shot_missed','shot_post','shot_blocked','shot_saved',
  'save','field_block','steal','turnover','exclusion_drawn','exclusion_committed',
  'five_meter_drawn','five_meter_committed','quarter_start','quarter_end',
  'overtime_start','shootout_start','shootout_goal','shootout_miss','score_correction',
  'game_summary'
));

commit;
