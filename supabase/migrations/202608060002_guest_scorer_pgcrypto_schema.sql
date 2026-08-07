-- WPI 7.56.6 hotfix — expose pgcrypto functions to the scorer-handoff RPCs.
-- Supabase installs pgcrypto under the extensions schema. The original SECURITY
-- DEFINER functions pinned search_path to public, so unqualified gen_random_bytes
-- and digest calls could not resolve at runtime.

create extension if not exists pgcrypto with schema extensions;

alter function public.live_create_scorer_handoff_pass(uuid)
  set search_path = public, extensions;

alter function public.live_resolve_scorer_pass(text,text,uuid,boolean)
  set search_path = public, extensions;

comment on function public.live_create_scorer_handoff_pass(uuid) is
  'Creates a five-minute single-use scorer handoff pass; pgcrypto resolves from the extensions schema.';
