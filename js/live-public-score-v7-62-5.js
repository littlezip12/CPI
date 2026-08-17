/* WPI 7.62.5 — Public score-only game viewer with two-sided matchup identity. */
(async()=>{
  "use strict";
  const $=id=>document.getElementById(id); const gameId=new URLSearchParams(location.search).get("game")||""; let backend=null,directory={organizations:[],teams:[]},refreshing=false;
  function dateLabel(v){if(!v)return"Time TBD";const d=new Date(v);return Number.isNaN(d.getTime())?"Time TBD":d.toLocaleString([],{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});}
  function clock(seconds){const s=Math.max(0,Number(seconds)||0);return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;}
  function period(g){const q=Number(g.currentQuarter)||1;if(g.status!=="live")return g.status==="final"?"Final":"Scheduled";if(q<=4)return`Q${q}`;if(q===5)return"OT1";if(q===6)return"OT2";return`Period ${q}`;}
  function status(g){if(g.status==="live")return"LIVE";if(g.status==="final")return"FINAL";return"UPCOMING";}
  function safeLogo(value,fallback){return value||fallback;}
  function setLogo(id,value,fallback,alt){const img=$(id);if(!img)return;img.src=safeLogo(value,fallback);img.alt=alt||"";img.onerror=()=>{img.onerror=null;img.src=fallback;};}
  function clearOutcome(){["publicScoreHomeSide","publicScoreOpponentSide"].forEach(id=>$(id)?.classList.remove("is-winner","is-leading"));$("publicScoreHomeResult").textContent="";$("publicScoreOpponentResult").textContent="";}
  function renderUnavailable(){document.title="Game unavailable | Water Polo Index";$("publicScoreTeam").textContent="Game unavailable";$("publicScoreMeta").textContent="This game is not public or is no longer available.";$("publicScoreStatus").textContent="NOT PUBLIC";$("publicScoreCard").classList.add("is-unavailable");$("publicScoreHome").textContent="WPI Live";$("publicScoreOpponent").textContent="—";$("publicScorePeriod").textContent="—";$("publicScoreClock").textContent="—";setLogo("publicScoreHomeLogo",null,"assets/logos/cpi-logo-fallback.svg","WPI logo");setLogo("publicScoreOpponentLogo",null,"assets/branding/wpi-logo-mark.png","");clearOutcome();}
  function render(g){
    const org=(directory.organizations||[]).find(o=>String(o.organizationId)===String(g.organizationId));const team=(directory.teams||[]).find(t=>String(t.familyKey)===String(g.teamFamilyKey||""));
    document.title=`${g.teamDisplayLabel||g.teamName} vs ${g.opponentName} | WPI Live`;
    $("publicScoreHero").style.setProperty("--score-primary",org?.primaryColor||"#0b4d8f");$("publicScoreHero").style.setProperty("--score-secondary",org?.secondaryColor||"#2bd7f3");
    const ownName=g.teamDisplayLabel||g.teamName||"Team",opponentName=g.opponentName||"Opponent";
    const ownLogo=g.teamLogoUrl||org?.logo||"assets/logos/cpi-logo-fallback.svg",opponentLogo=g.opponentLogoUrl||"assets/branding/wpi-logo-mark.png";
    setLogo("publicScoreLogo",ownLogo,"assets/logos/cpi-logo-fallback.svg",`${g.organizationName||"WPI"} logo`);
    setLogo("publicScoreHomeLogo",ownLogo,"assets/logos/cpi-logo-fallback.svg",`${ownName} logo`);
    setLogo("publicScoreOpponentLogo",opponentLogo,"assets/branding/wpi-logo-mark.png",g.opponentLogoUrl?`${opponentName} logo`:"");
    $("publicScoreOrganization").textContent=g.organizationName||"WPI Live";$("publicScoreTeam").textContent=`${ownName} vs ${opponentName}`;$("publicScoreMeta").textContent=[g.ageGroup==="HS"?"High School":g.ageGroup,g.gender,g.squadLabel].filter(Boolean).join(" · ")||"WPI Live";
    $("publicScoreHome").textContent=ownName;$("publicScoreOpponent").textContent=opponentName;$("publicScoreHomeValue").textContent=g.teamScore??0;$("publicScoreOpponentValue").textContent=g.opponentScore??0;
    clearOutcome();const ownScore=Number(g.teamScore??0),oppScore=Number(g.opponentScore??0);
    if(g.status==="final"&&ownScore!==oppScore){const ownWins=ownScore>oppScore;$(ownWins?"publicScoreHomeSide":"publicScoreOpponentSide").classList.add("is-winner");$(ownWins?"publicScoreHomeResult":"publicScoreOpponentResult").textContent="Winner";}
    else if(g.status==="live"&&ownScore!==oppScore){$(ownScore>oppScore?"publicScoreHomeSide":"publicScoreOpponentSide").classList.add("is-leading");}
    $("publicScoreStatus").textContent=status(g);$("publicScoreStatus").className=`public-live-status ${g.status==="live"?"live":g.status==="final"?"final":"upcoming"}`;$("publicScorePeriod").textContent=period(g);$("publicScoreClock").textContent=g.status==="live"?clock(g.currentTimeRemainingSeconds):dateLabel(g.scheduledAt);
    const serverUpdated=g.updatedAt?new Date(g.updatedAt):null;const freshness=serverUpdated&&!Number.isNaN(serverUpdated.getTime())?serverUpdated.toLocaleTimeString([],{hour:"numeric",minute:"2-digit",second:"2-digit"}):new Date().toLocaleTimeString([],{hour:"numeric",minute:"2-digit",second:"2-digit"});
    $("publicScoreUpdated").textContent=`Score updated ${freshness} · auto-refresh 8s`;$("publicScoreDetails").textContent=[dateLabel(g.scheduledAt),g.venue,g.tournamentName].filter(Boolean).join(" · ");
    $("publicScoreTeamHub").href=team?.profileHref||team?.teamHubHref||`organization.html?organization=${encodeURIComponent(g.organizationId||"")}`;
  }
  async function refresh(){if(refreshing||!backend||!gameId)return;refreshing=true;try{const {data,error}=await backend.client.rpc("live_public_game_score_v1",{target_game_id:gameId});if(error)throw error;if(!data?.visible||!data.game){renderUnavailable();return;}render(data.game);}catch(e){console.warn(e);renderUnavailable();}finally{refreshing=false;}}
  try{if(!gameId)throw new Error("Missing game id");directory=await fetch("data/live/organization-directory-v7-62-1.json?v=7.62.1",{cache:"no-store"}).then(r=>r.ok?r.json():{organizations:[],teams:[]}).catch(()=>({organizations:[],teams:[]}));const Backend=window.WPILiveBackend,config=window.WPI_LIVE_SANDBOX_CONFIG||{};backend=Backend?.connect?await Backend.connect(config):null;if(!backend)throw new Error("WPI Live is not configured");await refresh();}catch(e){console.warn(e);renderUnavailable();}
  setInterval(()=>{if(!document.hidden)refresh();},8000);
})();
