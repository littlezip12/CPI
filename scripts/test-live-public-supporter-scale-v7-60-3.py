#!/usr/bin/env python3
from pathlib import Path
import hashlib,json,re
ROOT=Path(__file__).resolve().parents[1]
def read(p): return (ROOT/p).read_text(encoding="utf-8")
def sha(p): return hashlib.sha256((ROOT/p).read_bytes()).hexdigest()
def req(c,m):
    if not c: raise AssertionError(m)
site=json.loads(read("config/site-release.json")); directory=json.loads(read("data/live/team-identity-directory-v7-60-2.json")); index=json.loads(read("data/live/tournament-schedule-index.json"))
sql=read("supabase/migrations/202608140005_public_supporter_experience_scale.sql")
html=read("live-following.html"); js=read("js/live-following-v7-60-3.js"); backend=read("js/live-team-following-v7-60-3.js"); login=read("js/live-login-v7-60-3.js"); dash=read("live-dashboard.html"); dashjs=read("js/live-dashboard-v7-61-1.js" if (ROOT/"js/live-dashboard-v7-61-1.js").exists() else "js/live-dashboard-v7-60-3.js"); recap=read("js/live-game-recap-v7-60-3.js"); gamehtml=read("live-game.html")
req(any(v in read("VERSION.md") for v in ("7.60.3","7.61.0","7.61.1","7.62.0","7.62.1","7.62.2","7.62.3","7.62.4", "7.62.5", "7.62.6","7.63.0","7.63.1","7.63.2","7.63.3",'7.63.4','7.63.5','7.63.6')),"VERSION mismatch")
req(site.get("version") in {"7.60.3","7.61.0","7.61.1","7.62.0","7.62.1","7.62.2","7.62.3","7.62.4", "7.62.5", "7.62.6","7.63.0","7.63.1","7.63.2","7.63.3",'7.63.4','7.63.5','7.63.6'},"release metadata mismatch")
for k in ("liveScoringPublicSupporterScaleRelease","liveScoringCrossClubFollowingRelease","liveScoringTeamFamilyFollowingRelease","liveScoringSupporterHubRelease","liveScoringPersonalizedGameFeedRelease"): req(site.get(k)=="7.60.3",f"missing marker {k}")
req(directory.get("counts")=={"clubs":182,"teams":724,"families":724},"canonical WPI directory counts changed")
req(directory.get("release")=="7.60.2","7.60.3 must consume, not rewrite, canonical identity directory")
for token in ("create table if not exists public.live_public_team_follows","live_set_team_follow_v2","live_set_public_team_follow_v1","live_following_overview_v2","canonical_wpi_team_family_key"):
    req(token in sql,f"supporter SQL contract missing: {token}")
req("target.canonical_wpi_team_family_key" in sql and "live_public_team_follows family_follow" in sql,"family follow must bridge to explicitly linked Live teams")
req("not exists (" in sql and "live_team_members own" in sql,"membership must supersede Following")
for fn in ("live_set_team_follow_v2","live_set_public_team_follow_v1"):
    section=sql.split(f"create or replace function public.{fn}",1)[1].split("create or replace function",1)[0]
    req("insert into public.live_team_members" not in section and "update public.live_team_members" not in section,"Following must never create/update membership")
req("live_game_scorer_sessions" not in sql and "live_groupme_destinations" not in sql,"supporter migration must not broaden scorer or GroupMe authority")
for token in ("My Teams","Find a WPI team","Game feed","Tournaments &amp; weekends","live-login.html?follow=1"):
    req(token in html,f"Supporter Hub contract missing: {token}")
for token in ("team-identity-directory-v7-60-2.json","familyFollowSet","setPublicTeamFamilyFollow","Recent finals","View recap + stats"):
    req(token in js,f"Supporter Hub workflow missing: {token}")
req("live_following_overview_v2" in backend and "live_set_team_follow_v2" in backend,"dashboard following backend must use scalable RPCs")
req('params.get("follow") === "1"' in login and 'signupAllowed = Boolean(onboarding || following || invite || registration.bootstrapAvailable)' in login,"read-only supporter signup entry missing")
req('following ? "live-following.html"' in login,"supporter auth must return to My Teams")
req("Following WPI teams" in dash and "live-following.html" in dash and any(x in dash for x in ("js/live-dashboard-v7-60-3.js?v=7.60.3","js/live-dashboard-v7-61-0.js","js/live-dashboard-v7-61-1.js?v=7.61.1","js/live-dashboard-v7-62-0.js?v=7.62.0")),"dashboard cross-club Following bridge missing")
req("team.clubDisplayName" in dashjs,"dashboard discovery must distinguish clubs")
req("Back to My Teams" in recap and "followReturn" in recap,"followed recaps must return to My Teams")
req("live-game-supporter-return-v7-60-3.js?v=7.60.3" in gamehtml,"followed live games must have My Teams return bridge")
req("public.live_team_role" in sql and "t.logo_url" not in sql,"supporter SQL must use existing schema types/columns")
protected={
  "js/live-backend-v7-56-8.js": "fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328",
  "js/live-sandbox-v7-56-15.js": "f32236d8e704c113ba9b868b18ae2b97e7bb366e9adbefd37000117aea0fc6da",
  "js/live-game-v7-58-6.js": "5cb97ca79e8794e9d34cb5f958462d3e86121ec152afed6f64516a2941368b76",
  "js/live-game-storage-v7-58-6.js": "ded90608e0ef38249382e692774f59b41ab59712fb80bf96fe4a66ad05567353",
  "supabase/functions/groupme-post/index.ts": "1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6",
  "supabase/functions/roster-extract/index.ts": "26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb",
  "config/live-club-theme-overrides.json": "815ea307a1deb43a33145eb5c07f6e64b013db22f35f13d95f8e49bbe0862580",
  "js/live-club-theme-v7-60-0.js": "3c2189a44ca38a82945c7c4cad581fd040ed14fd55b8bc23d6487eebf9eeb1c8",
  "js/live-club-theme-registry-v7-60-0.js": "7c24c4d65731c05918e24a46dee8afc58ef070ec336197a5d6814f89a2b3268a",
  "js/live-club-onboarding-v7-60-1.js": "2a60cfee1b4231ec221ce089a13fb3da0f2726fac2d1021e311c72e4dbdd2cff",
  "js/live-team-identity-v7-60-2.js": "6bf15ea3792c7197bc54a1033fe45a96809b984ea658ea980be267c0a0c55934",
  "data/live/team-identity-directory-v7-60-2.json": "a3b54c9ec76918ff1555bdcd76f4c188f3b0475260239c01602dd47e7dcfa0e6"
}
for path,digest in protected.items(): req(sha(path)==digest,f"protected foundation changed: {path}")
req(index.get("release") in {"7.60.3","7.61.0","7.61.1","7.62.0","7.62.1","7.62.2","7.62.3","7.62.4", "7.62.5", "7.62.6","7.63.0","7.63.1","7.63.2","7.63.3",'7.63.4','7.63.5','7.63.6'},"schedule index release marker mismatch")
req(index.get("counts")=={"events":0,"games":0},"supporter release must not fabricate tournament schedule data")
print("WPI LIVE 7.60.3 PUBLIC / SUPPORTER EXPERIENCE AT SCALE PASSED")
print(" - stable team-family follows span clubs without membership or scorer authority")
print(" - 182 clubs / 724 team identities remain the discovery source")
print(" - directory-only follows persist before a Live workspace exists")
print(" - linked Live teams feed read-only Live/Upcoming/Finals, recaps and event summaries")
print(" - protected scoring, GroupMe, recovery, branding, onboarding and identity foundations remain byte-stable")
