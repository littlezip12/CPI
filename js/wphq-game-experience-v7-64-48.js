(() => {
  "use strict";
  const $=id=>document.getElementById(id), config=window.WPI_LIVE_SANDBOX_CONFIG||{};
  const fallbackLogo="assets/branding/wpi-logo-mark.png";
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const number=v=>Number.isFinite(Number(v))?Number(v):0;
  const pretty=v=>Number.isFinite(Number(v))?String(Number(v)):"—";
  const safeLogo=v=>typeof v==="string" && (/^(?:https:\/\/|assets\/|club\/)/i).test(v)?v:fallbackLogo;
  const clock=v=>v==null?"—":`${Math.floor(Math.max(0,number(v))/60)}:${String(Math.floor(Math.max(0,number(v))%60)).padStart(2,"0")}`;
  const empty=msg=>`<p class="gx-empty">${esc(msg)}</p>`;
  const labels={goal:"Goal",opponent_goal:"Opponent goal",shot_missed:"Shot missed",shot_post:"Shot off post",shot_blocked:"Shot blocked",shot_saved:"Shot saved",save:"Goalie save",field_block:"Field block",steal:"Steal",turnover:"Turnover",exclusion_drawn:"Exclusion drawn",exclusion_committed:"Exclusion committed",five_meter_drawn:"5m drawn",five_meter_committed:"5m committed",shootout_goal:"Shootout goal",shootout_miss:"Shootout miss",quarter_start:"Quarter started",quarter_end:"Quarter ended"};
  function phase(e){if(e.phase==="shootout")return "SO";if(e.phase==="overtime")return `OT${Math.max(1,number(e.quarter)-4)}`;return `Q${number(e.quarter)||1}`;}
  function identity(e){
    if(e.playerName)return `${e.playerCap!=null?"#"+e.playerCap+" ":""}${e.playerName}`;
    if(e.eventType==="opponent_goal")return e.opponentCap!=null?`Opponent #${e.opponentCap}`:"Opponent (player not identified)";
    return "";
  }
  function play(e){const goal=e.eventType==="goal"||e.eventType==="opponent_goal"||e.eventType==="shootout_goal";
    // Goal type is intentionally not inferred from an exclusion or 5m event nearby.
    const detail=[identity(e),e.secondaryPlayerName?`Assist: ${e.secondaryPlayerCap!=null?"#"+e.secondaryPlayerCap+" ":""}${e.secondaryPlayerName}`:"",e.note||""].filter(Boolean).join(" · ");
    return `<article class="gx-play"><time>${esc(phase(e))} · ${esc(clock(e.timeRemainingSeconds))}</time><div><strong>${esc(labels[e.eventType]||e.eventLabel||"Event")}</strong>${detail?`<small>${esc(detail)}</small>`:""}${goal?`<small>Goal context: not classified</small>`:""}</div><span class="gx-play-score">${esc(pretty(e.teamScoreAfter))}–${esc(pretty(e.opponentScoreAfter))}</span></article>`;
  }
  function render(data){
    const g=data.game||{}, s=data.series||{}, detailed=data.viewer?.hasDetailedAnalytics===true;
    const events=detailed&&Array.isArray(data.events)?data.events:[];
    const stats=detailed&&Array.isArray(data.playerStats)?data.playerStats:[];
    const lineups=detailed&&Array.isArray(data.lineups)?data.lineups:[];
    const periods=Array.isArray(data.periods)?data.periods:[];
    $("gxHomeName").textContent=g.teamName||"Team";$("gxAwayName").textContent=g.opponentName||"Opponent";
    $("gxHomeLogo").src=safeLogo(g.teamLogoUrl);$("gxAwayLogo").src=safeLogo(g.opponentLogoUrl);
    $("gxStatus").textContent=String(g.status||"Final").toUpperCase();
    $("gxScore").textContent=`${pretty(g.teamScore)} : ${pretty(g.opponentScore)}`;
    $("gxDetail").textContent=[g.officialGameNumber?`Game ${g.officialGameNumber}`:"",g.venue||""].filter(Boolean).join(" · ")||"Recorded game";
    $("gxEventName").textContent=s.name||g.tournamentName||"Water Polo HQ";
    $("gxPeriods").innerHTML=periods.length?periods.map(p=>`<div class="gx-period"><span>${esc(p.periodLabel||`Q${p.quarter}`)}</span><strong>${esc(pretty(p.teamScore))}–${esc(pretty(p.opponentScore))}</strong></div>`).join(""):empty("No saved period score checkpoints.");
    const goals=events.filter(e=>["goal","opponent_goal","shootout_goal"].includes(e.eventType));
    $("gxHighlights").innerHTML=!detailed?empty("Detailed plays require Team Insights access."):goals.length?goals.slice(-8).map(play).join(""):empty("No scoring events recorded.");
    const rows=stats.map(p=>`<tr><td>${esc([p.cap!=null?"#"+p.cap:"",p.name||"Unnamed"].filter(Boolean).join(" "))}</td>${["goals","assists","shots","saves","steals","turnovers","exclusionsDrawn","exclusionsCommitted"].map(k=>`<td>${esc(pretty(p[k]))}</td>`).join("")}</tr>`).join("");
    $("gxBoxContent").innerHTML=!detailed?empty("Full player box scores require Team Insights access."):stats.length?`<div class="gx-scroll"><table class="gx-table"><thead><tr>${["Player","G","A","SH","SV","STL","TO","EXD","EXC"].map(v=>`<th scope="col">${v}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>`:empty("No player totals recorded.");
    $("gxTeamContent").innerHTML=!detailed?empty("Detailed team totals require Team Insights access."):`<p class="gx-empty">Team totals and opponent comparisons will use verified analytics in the next cycle. No unrecorded opponent events are assumed.</p>`;
    $("gxLineupContent").innerHTML=!detailed?empty("Lineups require Team Insights access."):lineups.length?lineups.map(l=>{const goalie=l.goalieName?`${l.goalieCap!=null?"#"+l.goalieCap+" ":""}${l.goalieName}`:l.goalieCap!=null?`#${l.goalieCap}`:"Not recorded";return `<div class="gx-lineup"><strong>${esc(l.periodLabel||`Q${l.quarter||1}`)}</strong><span>Goalie: ${esc(goalie)} · Field: ${esc((l.players||[]).map(p=>[p.cap!=null?"#"+p.cap:"",p.name||""].filter(Boolean).join(" ")).join(", ")||"Not recorded")}</span></div>`;}).join(""):empty("No lineup snapshots recorded.");
    const periodsAvailable=[...new Set(events.map(phase))];let selected="All";
    const applyFilter=()=>{$("gxQuarterFilters").innerHTML=["All",...periodsAvailable].map(k=>`<button type="button" data-quarter="${esc(k)}" aria-pressed="${String(k===selected)}">${esc(k)}</button>`).join("");$("gxFeed").innerHTML=!detailed?empty("Play-by-play requires Team Insights access."):events.length?events.filter(e=>selected==="All"||phase(e)===selected).map(play).join(""):empty("No game events recorded.");};
    $("gxQuarterFilters").addEventListener("click",e=>{const b=e.target.closest("button[data-quarter]");if(b){selected=b.dataset.quarter;applyFilter();}});applyFilter();
    const params=new URLSearchParams(location.search);const gameId=params.get("game");
    $("gxBack").href=`live-game-recap.html?game=${encodeURIComponent(gameId||"")}${params.get("follow")==="1"?"&follow=1":""}`;
    $("gxLoading").hidden=true;$("gxApp").hidden=false;
  }
  function initTabs(){const buttons=[...document.querySelectorAll("[data-tab]")];for(const button of buttons){button.addEventListener("click",()=>{for(const b of buttons){const on=b===button;b.setAttribute("aria-selected",String(on));$("gx"+b.dataset.tab).hidden=!on;}});}}
  async function init(){initTabs();try{const gameId=new URLSearchParams(location.search).get("game");if(!gameId||!/^[\da-f-]{36}$/i.test(gameId))throw Error("Open this view from a game recap to select a game.");if(!window.WPILiveBackend?.isConfigured(config))throw Error("The connected scoring service is not configured.");const backend=await window.WPILiveBackend.connect(config);const session=await backend.waitForHealthySession();if(!session){location.replace(`live-login.html?return=${encodeURIComponent(location.href)}`);return;}
    // Access policy is enforced by the SAME existing protected RPC as Game Recap.
    const {data,error}=await backend.client.rpc("live_game_recap_detail_v1",{target_game_id:gameId});if(error)throw error;
    if(data?.viewer?.hasDetailedAnalytics){try{const {data:ctx,error:ce}=await backend.client.rpc("live_game_player_cap_context_v1",{target_game_id:gameId});if(!ce&&Array.isArray(ctx?.players)){const caps=new Map(ctx.players.map(p=>[String(p.playerId),p.effectiveCap]));(data.playerStats||[]).forEach(p=>{if(caps.has(String(p.playerId)))p.cap=caps.get(String(p.playerId));});(data.events||[]).forEach(e=>{if(caps.has(String(e.playerId)))e.playerCap=caps.get(String(e.playerId));if(caps.has(String(e.secondaryPlayerId)))e.secondaryPlayerCap=caps.get(String(e.secondaryPlayerId));});}}catch(_){}}
    render(data||{});
  }catch(e){$("gxLoading").hidden=true;$("gxError").hidden=false;$("gxError").textContent=String(e?.message||"Could not load game.");}}
  init();
})();
