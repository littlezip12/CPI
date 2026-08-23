/* WPI 7.64.1 — Live Game UX & Fan Experience + Tournament navigation.
   Read-only additive Supporter layer. Does not write game state or modify scorer authority. */
(()=>{
  "use strict";
  const $=id=>document.getElementById(id);
  const params=new URLSearchParams(location.search);
  const gameId=params.get("game")||"";
  const isLaunchFlow=params.get("launch")==="1";
  const config=window.WPI_LIVE_SANDBOX_CONFIG||{};
  let backend=null,detail=null,activeTab="game",playFilter="all",detailLoading=null,viewerObserver=null,sourceObserver=null,refreshTimer=null;
  const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));
  const text=id=>$(id)?.textContent?.trim()||"";
  const isViewer=()=>document.body.classList.contains("is-live-viewer");
  const statusState=()=>{const s=text("gameStatus").toLowerCase();return s.includes("final")?"final":s.includes("between")?"between":s.includes("live")||s.includes("overtime")||s.includes("shootout")?"live":"between";};
  const fmtDate=value=>{if(!value)return"Not listed";const d=new Date(value);return Number.isNaN(d.getTime())?String(value):d.toLocaleString([],{weekday:"short",month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"});};
  const fmtScore=value=>{const n=Number(value||0);return Number.isInteger(n)?String(n):n.toFixed(1).replace(/\.0$/,"");};
  const playerLabel=e=>[e?.playerCap?`#${e.playerCap}`:"",e?.playerName||e?.shooterLabel||""].filter(Boolean).join(" ")||"Team event";
  const eventWhen=e=>e?.phase==="shootout"||String(e?.eventType||"").startsWith("shootout_")?`SO · R${e?.metrics?.shootoutRound||e?.shootoutRound||1}`:`${e?.periodLabel||(`Q${e?.quarter||1}`)} · ${Math.floor(Number(e?.timeRemainingSeconds||0)/60)}:${String(Number(e?.timeRemainingSeconds||0)%60).padStart(2,"0")}`;
  function activate(){
    const fan=$("liveFanExperience"),viewer=isViewer(),body=document.body;
    if(!fan||!viewer){
      if(body.classList.contains("is-live-fan-ready"))body.classList.remove("is-live-fan-ready");
      if(fan&&!fan.hidden)fan.hidden=true;
      return;
    }
    if(fan.hidden)fan.hidden=false;
    if(!body.classList.contains("is-live-fan-ready"))body.classList.add("is-live-fan-ready");
    syncScore();syncLastPlay();void ensureDetail("initial");
  }
  function syncScore(){
    if(!$("liveFanExperience"))return;
    $("fanTeamName").textContent=text("scoreTeamName")||"Team";$("fanOpponentName").textContent=text("scoreOpponentName")||"Opponent";
    $("fanTeamScore").textContent=text("teamScore")||"0";$("fanOpponentScore").textContent=text("opponentScore")||"0";
    $("fanPeriod").textContent=text("scorePeriodLabel")||"—";$("fanClock").textContent=text("scoreClockLabel")||"—";$("fanGameState").textContent=text("gameStatus")||"Live";
    const state=statusState(),pill=$("fanLivePill");pill.dataset.state=state;pill.textContent=state==="final"?"FINAL":state==="between"?"GAME":"LIVE";
    $("fanPrimaryAction").textContent=state==="final"?"View final recap":"Team Insights";$("fanPrimaryAction").href=state==="final"?`live-game-recap.html?game=${encodeURIComponent(gameId)}`:(detail?.game?.teamId?`live-team-insights.html?team=${encodeURIComponent(detail.game.teamId)}`:"live-following.html");
    highlightCurrentPeriod();
  }
  function syncLastPlay(){
    const item=$("timelineList")?.querySelector(".live-timeline-item");const box=$("fanLastPlay");if(!box)return;
    if(!item){box.innerHTML='<p class="wpi-fan-empty">No recorded plays yet. The latest play will appear here automatically.</p>';return;}
    const title=item.querySelector("header strong")?.textContent?.trim()||"Recorded play",when=item.querySelector("header time")?.textContent?.trim()||"",desc=item.querySelector("p")?.textContent?.trim()||"",score=item.querySelector("small")?.textContent?.trim()||"";
    box.innerHTML=`<div class="wpi-fan-last-play"><span class="wpi-fan-kicker">Latest play</span><strong>${esc(title)}</strong><p>${esc(desc)}</p><small>${esc([when,score].filter(Boolean).join(" · "))}</small></div>`;
  }
  function highlightCurrentPeriod(){const current=text("scorePeriodLabel");document.querySelectorAll(".wpi-fan-period").forEach(el=>el.classList.toggle("is-current",el.dataset.period===current));}
  async function getBackend(){if(backend)return backend;const Backend=window.WPILiveBackend;if(!Backend?.connect)return null;backend=await Backend.connect(config);return backend;}
  async function ensureDetail(reason="view"){
    if(!gameId||!isViewer())return null;if(detailLoading)return detailLoading;
    detailLoading=(async()=>{try{const b=await getBackend();if(!b)return null;const session=await b.waitForHealthySession();if(!session)return null;const {data,error}=await b.client.rpc("live_game_recap_detail_v1",{target_game_id:gameId});if(error)throw error;detail=data||null;renderDetail();$("fanDataStatus").textContent="Live fan view";return detail;}catch(error){console.warn("WPI fan detail",reason,error);$("fanDataStatus").textContent="Score view connected";return null;}finally{detailLoading=null;}})();return detailLoading;
  }
  function renderDetail(){if(!detail)return;renderPeriods();renderPlays();renderStats();renderInfo();syncScore();}
  function renderPeriods(){const target=$("fanPeriods");if(!target)return;const rows=detail.periods||[];if(!rows.length){target.innerHTML='<p class="wpi-fan-empty">Period-by-period scoring will appear as the game develops.</p>';return;}target.innerHTML=rows.map(r=>`<div class="wpi-fan-period" data-period="${esc(r.periodLabel||`Q${r.quarter}`)}"><span>${esc(r.periodLabel||`Q${r.quarter}`)}</span><strong>${esc(fmtScore(r.teamScore))}–${esc(fmtScore(r.opponentScore))}</strong></div>`).join("");highlightCurrentPeriod();}
  function isScoring(e){return ["goal","opponent_goal","shootout_goal","shootout_miss","score_correction"].includes(e.eventType)}
  function isDefense(e){return ["save","field_block","steal","exclusion_drawn","exclusion_committed","five_meter_drawn","five_meter_committed"].includes(e.eventType)}
  function renderPlays(){const target=$("fanPlayList");if(!target||!detail)return;let rows=(detail.events||[]).slice().reverse().filter(e=>!["game_summary"].includes(e.eventType));if(playFilter==="scoring")rows=rows.filter(isScoring);if(playFilter==="defense")rows=rows.filter(isDefense);if(!rows.length){target.innerHTML='<p class="wpi-fan-empty">No recorded plays in this view yet.</p>';return;}target.innerHTML=rows.map(e=>{let desc=playerLabel(e);if(e.eventType==="goal"&&e.secondaryPlayerName)desc+=` · Assist ${[e.secondaryPlayerCap?`#${e.secondaryPlayerCap}`:"",e.secondaryPlayerName].filter(Boolean).join(" ")}`;else if(e.eventType==="goal"&&!e.secondaryPlayerName)desc+=" · Unassisted";if(e.note)desc+=` · ${e.note}`;return `<article class="wpi-fan-play"><span class="wpi-fan-play-time">${esc(eventWhen(e))}</span><div class="wpi-fan-play-main"><strong>${esc(e.eventLabel||e.eventType||"Play")}</strong><span>${esc(desc)}</span></div><strong class="wpi-fan-play-score">${esc(fmtScore(e.teamScoreAfter))}–${esc(fmtScore(e.opponentScoreAfter))}</strong></article>`}).join("");}
  function metrics(){const events=detail?.events||[];let teamShots=0,oppShots=0,teamSaves=0,oppSaves=0,teamBlocks=0,oppBlocks=0,teamGoals=0,oppGoals=0;for(const e of events){const m=e.metrics||{};teamShots+=Number(m.teamShotDelta||0);oppShots+=Number(m.opponentShotDelta||0);teamSaves+=Number(m.saveDelta||0);oppSaves+=Number(m.opponentSaveDelta||0);teamBlocks+=Number(m.fieldBlockDelta||0);oppBlocks+=Number(m.opponentFieldBlockDelta||0);if(e.eventType==="goal")teamGoals++;if(e.eventType==="opponent_goal")oppGoals++;}return{teamShots,oppShots,teamSaves,oppSaves,teamBlocks,oppBlocks,teamGoals,oppGoals};}
  function statRow(label,a,b){const max=Math.max(Number(a)||0,Number(b)||0,1),ap=Math.round((Number(a)||0)/max*100),bp=Math.round((Number(b)||0)/max*100);return `<div class="wpi-fan-stat-row"><strong>${esc(a)}</strong><div class="wpi-fan-stat-mid"><span>${esc(label)}</span><div class="wpi-fan-bars"><i><b style="width:${ap}%"></b></i><i><b style="width:${bp}%"></b></i></div></div><strong>${esc(b)}</strong></div>`;}
  function renderStats(){if(!detail)return;const target=$("fanTeamStats"),leaders=$("fanPlayerLeaders");if(!target||!leaders)return;const m=metrics(),game=detail.game||{};const shootingA=m.teamShots?`${Math.round(m.teamGoals/m.teamShots*100)}%`:"—",shootingB=m.oppShots?`${Math.round(m.oppGoals/m.oppShots*100)}%`:"—";target.innerHTML=statRow("Score",fmtScore(game.teamScore),fmtScore(game.opponentScore))+statRow("Shots",m.teamShots,m.oppShots)+statRow("Saves",m.teamSaves,m.oppSaves)+statRow("Field blocks",m.teamBlocks,m.oppBlocks)+statRow("Shooting",shootingA,shootingB);
    const rows=(detail.playerStats||[]).slice().map(p=>({...p,impact:Number(p.goals||0)*4+Number(p.assists||0)*2+Number(p.saves||0)+Number(p.steals||0)})).filter(p=>p.impact>0).sort((a,b)=>b.impact-a.impact).slice(0,5);leaders.innerHTML=rows.length?rows.map(p=>{const bits=[];if(p.goals)bits.push(`${p.goals}G`);if(p.assists)bits.push(`${p.assists}A`);if(p.saves)bits.push(`${p.saves} saves`);if(p.steals)bits.push(`${p.steals} steals`);return `<div class="wpi-fan-leader"><strong>${esc([p.cap?`#${p.cap}`:"",p.name].filter(Boolean).join(" "))}</strong><span>${esc(bits.join(" · "))}</span></div>`}).join(""):'<p class="wpi-fan-empty">Player leaders will appear as recorded actions accumulate.</p>';}
  function renderInfo(){if(!detail)return;const g=detail.game||{},s=detail.series||{},target=$("fanGameInfo");if(!target)return;const rows=[["Matchup",`${g.teamName||text("scoreTeamName")||"Team"} vs ${g.opponentName||text("scoreOpponentName")||"Opponent"}`],["Event",s.name||"WPI Live game"],["Date",fmtDate(g.scheduledAt||g.startedAt)],["Venue",g.venue||"Not listed"],["Season",g.competitiveSeason||s.competitiveSeason||"Not listed"],["Division",g.officialDivisionLabel||"Not listed"],["Game #",g.officialGameNumber||"Not listed"],["Status",g.status||text("gameStatus")||"Live"]];target.innerHTML=rows.map(([a,b])=>{if(a==="Event"&&s.seriesType==="tournament"&&s.name){const u=new URL("live-tournament.html",location.href);u.search="";u.hash="";if(s.tournamentPublicId)u.searchParams.set("id",s.tournamentPublicId);else{u.searchParams.set("name",s.name);if(s.competitiveSeason||g.competitiveSeason)u.searchParams.set("season",s.competitiveSeason||g.competitiveSeason);}return `<div class="wpi-fan-info-row"><span>${esc(a)}</span><strong><a class="wpi-fan-info-link" href="${esc(u.pathname.split("/").pop()+u.search)}">${esc(b)} →</a></strong></div>`;}return `<div class="wpi-fan-info-row"><span>${esc(a)}</span><strong>${esc(b)}</strong></div>`;}).join("");if(g.teamId&&statusState()!=="final")$("fanPrimaryAction").href=`live-team-insights.html?team=${encodeURIComponent(g.teamId)}`;}
  function setTab(name){activeTab=name;document.querySelectorAll("[data-fan-tab]").forEach(a=>a.classList.toggle("is-active",a.dataset.fanTab===name));document.querySelectorAll("[data-fan-panel]").forEach(p=>p.hidden=p.dataset.fanPanel!==name);if(name!=="game")void ensureDetail(`tab:${name}`);}
  async function shareGame(event){event?.preventDefault();const url=location.href,title=`${text("scoreTeamName")||"WPI Live"} vs ${text("scoreOpponentName")||"Opponent"}`,share={title,text:`${title} · ${text("teamScore")||0}–${text("opponentScore")||0} · ${text("scorePeriodLabel")} ${text("scoreClockLabel")}`,url};try{if(navigator.share){await navigator.share(share);return;}await navigator.clipboard.writeText(url);$("fanShareLink").textContent="Link copied";setTimeout(()=>{$("fanShareLink").textContent="Share";},1500);}catch(_){}}
  function bind(){document.querySelectorAll("[data-fan-tab]").forEach(a=>a.addEventListener("click",e=>{e.preventDefault();setTab(a.dataset.fanTab);}));document.querySelectorAll("[data-fan-filter]").forEach(a=>a.addEventListener("click",e=>{e.preventDefault();playFilter=a.dataset.fanFilter;document.querySelectorAll("[data-fan-filter]").forEach(x=>x.classList.toggle("is-active",x===a));renderPlays();}));$("fanShareLink")?.addEventListener("click",shareGame);}
  function observe(){
    if(viewerObserver||sourceObserver)return;
    let lastViewer=isViewer();
    viewerObserver=new MutationObserver(()=>{
      const nextViewer=isViewer();
      if(nextViewer===lastViewer)return;
      lastViewer=nextViewer;
      activate();
    });
    viewerObserver.observe(document.body,{attributes:true,attributeFilter:["class"]});

    const scoreIds=new Set(["scoreTeamName","scoreOpponentName","teamScore","opponentScore","scorePeriodLabel","scoreClockLabel","gameStatus"]);
    sourceObserver=new MutationObserver(mutations=>{
      if(!isViewer())return;
      const scoreChanged=mutations.some(m=>scoreIds.has(m.target?.id)||scoreIds.has(m.target?.parentElement?.id));
      const eventChanged=mutations.some(m=>m.target?.id==="timelineList"||m.target?.closest?.("#timelineList"));
      if(scoreChanged)syncScore();
      if(eventChanged){syncLastPlay();if(activeTab!=="game"){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>void ensureDetail("timeline-change"),900);}}
    });
    scoreIds.forEach(id=>{const node=$(id);if(node)sourceObserver.observe(node,{childList:true,subtree:true,characterData:true});});
    const timeline=$("timelineList");if(timeline)sourceObserver.observe(timeline,{childList:true,subtree:true,characterData:true});
  }
  function init(){
    if(isLaunchFlow)return;
    bind();observe();activate();
    document.addEventListener("visibilitychange",()=>{if(!document.hidden&&isViewer()){syncScore();syncLastPlay();if(activeTab!=="game")void ensureDetail("visible");}});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
