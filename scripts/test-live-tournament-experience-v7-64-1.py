#!/usr/bin/env python3
from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[1]
def req(c,m):
    if not c: raise AssertionError(m)
def read(rel):
    p=ROOT/rel; req(p.exists(),f"Missing file: {rel}"); return p.read_text(encoding="utf-8")
site=json.loads(read("config/site-release.json")); version=read("VERSION.md")
req(any(v in version for v in ("WPI 7.64.1","WPI 7.64.2")),"VERSION missing 7.64.1+")
req(site.get("version") in {"7.64.1","7.64.2"},"site release mismatch")
for key in ("liveTournamentExperienceRelease","liveTournamentCenterRelease","liveTournamentDiscoveryRelease","liveTournamentTeamRecordsRelease","liveTournamentNavigationRelease"):
    req(site.get(key)=="7.64.1",f"missing marker {key}")

page=read("live-tournament.html"); css=read("css/live-tournament-v7-64-1.css"); js=read("js/live-tournament-v7-64-2.js" if site.get("version")=="7.64.2" else "js/live-tournament-v7-64-1.js")
for token in ("ltTitle","ltLiveCount","ltUpcomingCount","ltFinalCount","ltTeamCount","ltSearch","ltDivision","ltTeam","ltStatus","ltGameSections","ltTeamRecords","ltRecordPolicy","ltSchedulePolicy"):
    req(token in page,f"tournament page missing {token}")
req(("live-tournament-v7-64-1.css?v=7.64.1" in page and "live-tournament-v7-64-1.js?v=7.64.1" in page) or ("live-tournament-v7-64-2.css?v=7.64.2" in page and "live-tournament-v7-64-2.js?v=7.64.2" in page),"tournament assets not cache-busted")
for token in ("Live now","Upcoming","Recent finals","Tournament records","not official tournament standings","live-score.html?game=","Team page"):
    req(token.lower() in (page+js).lower(),f"tournament experience missing {token}")
req("standings" not in page.lower() or "not official tournament standings" in page.lower(),"page must not claim unsupported official standings")
req("bracket" not in page.lower(),"page must not fabricate brackets")

migration=read("supabase/migrations/202608220001_public_tournament_experience.sql")
low=migration.lower()
for fn in ("live_public_tournament_catalog_v1","live_public_tournament_v1","live_public_scoreboard_v2","live_public_game_score_v2"):
    req(fn in low,f"missing RPC {fn}")
req("g.visibility='public_team'" in low,"public tournament RPCs must require public_team visibility")
req("g.game_kind='tournament'" in low,"tournament RPCs must require tournament games")
req("not official tournament standings" in low,"server record policy must disclaim official standings")
req("may not represent the complete official tournament schedule" in low,"server schedule policy must avoid claiming completeness")
for forbidden in ("public.live_players","public.live_events","public.live_lineups","public.live_team_members","public.live_game_scorer_sessions","public.live_deliveries"):
    req(forbidden not in low,f"public tournament migration must not read private detail surface {forbidden}")
for dangerous in ("insert into public.live_","update public.live_","delete from public.live_"):
    req(dangerous not in low,f"public tournament RPC migration must remain read-only: {dangerous}")
req("grant execute on function public.live_public_tournament_catalog_v1() to anon,authenticated" in low,"catalog must be public-callable")
req("grant execute on function public.live_public_tournament_v1(text,text,text) to anon,authenticated" in low,"tournament center must be public-callable")

live=read("live.html"); discovery=read("js/live-tournament-discovery-v7-64-1.js"); center=read("js/live-public-center-v7-64-2.js" if site.get("version")=="7.64.2" else "js/live-public-center-v7-64-1.js")
req('id="tournamentCenters"' in live and 'id="publicTournamentCenters"' in live,"public Live tournament discovery section missing")
req("live-tournament-discovery-v7-64-1.js?v=7.64.1" in live,"tournament discovery script not loaded")
req(("live-public-center-v7-64-1.js?v=7.64.1" in live) or ("live-public-center-v7-64-2.js?v=7.64.2" in live),"public center not loaded")
req("live_public_tournament_catalog_v1" in discovery,"discovery must use catalog RPC")
req(("live_public_scoreboard_v2" in center or "live_public_scoreboard_v3" in center) and "Tournament center" in center,"public game cards must link to tournament center")

score_page=read("live-score.html"); score_js=read("js/live-public-score-v7-64-2.js" if site.get("version")=="7.64.2" else "js/live-public-score-v7-64-1.js")
req('id="publicScoreTournament"' in score_page,"public score tournament action missing")
req(("live-public-score-v7-64-1.js?v=7.64.1" in score_page) or ("live-public-score-v7-64-2.js?v=7.64.2" in score_page),"public score script not loaded")
req("live_public_game_score_v2" in score_js and "Tournament center" in score_js,"public score tournament navigation missing")

fan_page=read("live-game.html"); fan_js=read("js/live-fan-experience-v7-64-1.js")
req("live-fan-experience-v7-64-1.js?v=7.64.1" in fan_page,"7.64.1 fan layer not loaded")
req('const isLaunchFlow=params.get("launch")==="1"' in fan_js and 'if(isLaunchFlow)return;' in fan_js,"7.64.0 scorer launch-stability bypass must remain")
req("live-tournament.html" in fan_js and 's.seriesType==="tournament"' in fan_js,"Supporter Game Info tournament navigation missing")

req("WPILiveAds.renderWeekendBanner" in js,"tournament sponsor placement must reuse safe event banner delivery")
req("navigator.share" in js and "navigator.clipboard" in js,"tournament sharing missing")
# Anonymous tournament/page logic must never render player detail.
for forbidden in ("playerName","playerStats","lineup","groupme"):
    req(forbidden.lower() not in js.lower(),f"public tournament controller leaked private concept {forbidden}")

expected={
'js/live-backend-v7-56-8.js':'fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328',
'js/live-game-v7-58-6.js':'5cb97ca79e8794e9d34cb5f958462d3e86121ec152afed6f64516a2941368b76',
'js/live-game-storage-v7-58-6.js':'ded90608e0ef38249382e692774f59b41ab59712fb80bf96fe4a66ad05567353',
'supabase/functions/groupme-post/index.ts':'1397eb595b21682cf00aa07dbe0870b9b29db58d134a5e8f06157906bd6dd6f6',
'supabase/functions/roster-extract/index.ts':'26d8caf221d74eda5bb8670c1200e601ae76359ef4bc37037baf27bc7c8dbbbb'}
for rel,h in expected.items(): req(hashlib.sha256((ROOT/rel).read_bytes()).hexdigest()==h,f"Protected file changed: {rel}")
print("WPI 7.64.1 Tournament Experience regression passed.")
