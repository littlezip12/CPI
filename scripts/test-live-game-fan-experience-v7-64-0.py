#!/usr/bin/env python3
from pathlib import Path
import json,hashlib,re
ROOT=Path(__file__).resolve().parents[1]
def req(c,m):
    if not c: raise AssertionError(m)
def read(rel):
    p=ROOT/rel;req(p.exists(),f"Missing file: {rel}");return p.read_text(encoding="utf-8")
site=json.loads(read("config/site-release.json"));version=read("VERSION.md");html=read("live-game.html");active_js="js/live-fan-experience-v7-64-1.js" if site.get("version") in {"7.64.1","7.64.2","7.64.3"} else "js/live-fan-experience-v7-64-0.js";js=read(active_js);active_css="css/live-fan-experience-v7-64-1.css" if site.get("version") in {"7.64.1","7.64.2","7.64.3"} else "css/live-fan-experience-v7-64-0.css";css=read(active_css)
req(any(v in version for v in ("WPI 7.64.0","WPI 7.64.1","WPI 7.64.2","WPI 7.64.3")),"VERSION missing 7.64.0+ fan baseline")
req(site.get("version") in {"7.64.0","7.64.1","7.64.2","7.64.3"},"site release mismatch")
for key in ("liveScoringFanExperienceRelease","liveScoringFanGameCenterRelease","liveScoringFanPlayByPlayRelease","liveScoringFanStatsRelease"):req(site.get(key)=="7.64.0",f"missing marker {key}")
for token in ("liveFanExperience","fanTeamScore","fanOpponentScore","fanPeriod","fanClock","fanLastPlay","fanPeriods","fanPlayList","fanTeamStats","fanPlayerLeaders","fanGameInfo","fanPrimaryAction"):
    req(token in html,f"fan surface missing {token}")
req(("live-fan-experience-v7-64-0.css?v=7.64.0" in html) or ("live-fan-experience-v7-64-1.css?v=7.64.1" in html),"fan CSS not loaded")
req(("live-fan-experience-v7-64-0.js?v=7.64.0-launch-stability-1" in html) or ("live-fan-experience-v7-64-1.js?v=7.64.1" in html),"fan JS launch-stability layer not loaded")
fan_src="js/live-fan-experience-v7-64-1.js?v=7.64.1" if "js/live-fan-experience-v7-64-1.js?v=7.64.1" in html else "js/live-fan-experience-v7-64-0.js?v=7.64.0-launch-stability-1";req(html.index(fan_src)>html.index("js/live-game-v7-58-6.js?v=7.58.6"),"fan layer must load after protected scorer engine")
for token in ('is-live-viewer','is-live-fan-ready','live_game_recap_detail_v1','data-fan-tab','data-fan-filter','navigator.share','navigator.clipboard','View final recap','live-game-recap.html?game=','live-team-insights.html?team='):
    req(token in js,f"fan behavior missing {token}")
# Launch stability: the additive fan layer must stay completely dormant during scorer/new-game launch.
req('const isLaunchFlow=params.get("launch")==="1"' in js,'launch flow bypass missing')
req('if(isLaunchFlow)return;' in js,'fan layer must not initialize during launch=1 scorer flow')
# Observer safety: never watch the entire page subtree while also mutating fan/body UI.
req('sourceObserver.observe(document.body' not in js,'fan source observer must not watch the entire body subtree')
req('observer.observe(document.body,{attributes:true,attributeFilter:["class"],childList:true,subtree:true,characterData:true})' not in js,'legacy whole-body observer loop risk returned')
req('if(nextViewer===lastViewer)return;' in js,'viewer class observer must ignore self-generated body-class mutations')
req('if(!body.classList.contains("is-live-fan-ready"))body.classList.add("is-live-fan-ready")' in js,'fan-ready class mutation must be state guarded')
# No write calls or commercial activation in fan controller.
for bad in ('.from("live_games").update','.from("live_events").insert','.from("live_events").update','recordEvent','saveScoreCorrection','stripe','Notification.requestPermission','PushManager','serviceWorker.register'):
    req(bad not in js,f"fan controller must remain read-only / no new permissions: {bad}")
for token in ('.is-live-viewer.is-live-fan-ready','#liveActionPanel','#messageDetails','#timelineDetails','#summaryPanel'):
    req(token in css,f"viewer-only visual boundary missing {token}")
req('supporterGameSponsorBanner' in html,'existing Supporter sponsor placement removed')
req('$5/month' not in html and 'Upgrade to Team Insights' not in html,'free-launch paywall copy regressed in game surface')
# Public score-only privacy remains unchanged by this release.
public=read('live-score.html');req('Public score only' in public and 'without exposing rosters, player events' in public,'anonymous public score privacy boundary regressed')
# No 7.64.0 backend migration.
req(not list((ROOT/'supabase/migrations').glob('*7640*')),'7.64.0 should not introduce a Supabase migration')
# Protected foundation byte-stable.
expected={
'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
'js/live-game-v7-58-6.js':'5cb97ca79e8794e9d34cb5f958462d3e86121ec152afed6f64516a2941368b76',
'js/live-game-storage-v7-58-6.js':'ded90608e0ef38249382e692774f59b41ab59712fb80bf96fe4a66ad05567353',
'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
'supabase/functions/roster-extract/index.ts':'26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb'}
for rel,h in expected.items():req(hashlib.sha256((ROOT/rel).read_bytes()).hexdigest()==h,f"Protected file changed: {rel}")
print('WPI 7.64.0 Live Game UX + Fan Experience regression passed.')
