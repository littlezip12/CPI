/* WPI 7.62.5 — Public Live Center matchup identity polish. Score summaries only; no roster/player/scorer data. */
(async()=>{
  "use strict";
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  let backend=null,games=[],directory={organizations:[],teams:[]},refreshing=false;
  const filters={search:"",type:"all",group:"all",status:"all"};
  const orgById=()=>new Map((directory.organizations||[]).map(o=>[String(o.organizationId),o]));
  const teamByFamily=()=>new Map((directory.teams||[]).map(t=>[String(t.familyKey),t]));
  function statusKey(g){return g.status==="live"?"live":g.status==="final"?"final":"upcoming";}
  function dateLabel(v){if(!v)return"Time TBD";const d=new Date(v);return Number.isNaN(d.getTime())?"Time TBD":d.toLocaleString([],{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});}
  function clockLabel(seconds){const s=Math.max(0,Number(seconds)||0);return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;}
  function periodLabel(g){if(g.status!=="live")return"";const q=Number(g.currentQuarter)||1;if(q<=4)return`Q${q} · ${clockLabel(g.currentTimeRemainingSeconds)}`;if(q===5)return`OT1 · ${clockLabel(g.currentTimeRemainingSeconds)}`;if(q===6)return`OT2 · ${clockLabel(g.currentTimeRemainingSeconds)}`;return`Period ${q} · ${clockLabel(g.currentTimeRemainingSeconds)}`;}
  function meta(g){return [g.organizationName,g.ageGroup==="HS"?null:g.ageGroup,g.gender,g.squadLabel].filter(Boolean).join(" · ");}
  function matches(g){
    const q=filters.search.trim().toLowerCase();
    if(q&&!`${g.organizationName||""} ${g.teamName||""} ${g.teamDisplayLabel||""} ${g.opponentName||""} ${g.ageGroup||""} ${g.gender||""} ${g.squadLabel||""}`.toLowerCase().includes(q))return false;
    if(filters.type!=="all"&&g.organizationType!==filters.type)return false;
    if(filters.group!=="all"&&g.gender!==filters.group)return false;
    if(filters.status!=="all"&&statusKey(g)!==filters.status)return false;
    return true;
  }
  function card(g){
    const status=statusKey(g), score=status==="upcoming"?"vs":`${g.teamScore??0}–${g.opponentScore??0}`;
    const org=orgById().get(String(g.organizationId)); const team=teamByFamily().get(String(g.teamFamilyKey||""));
    const primary=org?.primaryColor||"#0b4d8f",secondary=org?.secondaryColor||"#2bd7f3";
    const logo=g.teamLogoUrl||org?.logo||"assets/logos/cpi-logo-fallback.svg";
    const opponentLogo=g.opponentLogoUrl||"assets/branding/wpi-logo-mark.png";
    const teamHref=team?.profileHref||team?.teamHubHref||`organization.html?organization=${encodeURIComponent(g.organizationId||"")}`;
    const statusText=status==="live"?"LIVE":status==="final"?"FINAL":"UPCOMING";
    const ownName=g.teamDisplayLabel||g.teamName||"WPI team";
    const opponentName=g.opponentName||"Opponent";
    const ownScore=Number(g.teamScore??0),opponentScore=Number(g.opponentScore??0);
    const ownWinner=status==="final"&&ownScore>opponentScore;
    const opponentWinner=status==="final"&&opponentScore>ownScore;
    return `<article class="public-live-game" style="--game-primary:${esc(primary)};--game-secondary:${esc(secondary)}">
      <a class="public-live-game-link" href="live-score.html?game=${encodeURIComponent(g.id)}" aria-label="Open ${esc(ownName)} versus ${esc(opponentName)}">
        <header><div class="public-live-game-team"><img src="${esc(logo)}" alt="${esc(ownName)} logo" onerror="this.onerror=null;this.src='assets/logos/cpi-logo-fallback.svg'"><div><small>${esc(meta(g))}</small><strong>${esc(g.organizationName||ownName)}</strong></div></div><span class="public-live-status ${status}">${statusText}</span></header>
        <div class="public-live-matchup public-live-matchup--identity">
          <div class="public-live-matchup-side ${ownWinner?'is-winner':''}"><img src="${esc(logo)}" alt="" onerror="this.onerror=null;this.src='assets/logos/cpi-logo-fallback.svg'"><span>${esc(ownName)}</span>${ownWinner?'<small>Winner</small>':''}</div>
          <b>${esc(score)}</b>
          <div class="public-live-matchup-side public-live-matchup-side--opponent ${opponentWinner?'is-winner':''}"><img src="${esc(opponentLogo)}" alt="" onerror="this.onerror=null;this.src='assets/branding/wpi-logo-mark.png'"><span>${esc(opponentName)}</span>${opponentWinner?'<small>Winner</small>':''}</div>
        </div>
        <footer><span>${esc(dateLabel(g.scheduledAt))}${g.venue?` · ${esc(g.venue)}`:""}</span>${status==="live"?`<strong>${esc(periodLabel(g))}</strong>`:""}</footer>
      </a>
      <div class="public-live-game-actions"><a href="${esc(teamHref)}">Team hub</a>${g.gameKind?`<span>${esc(g.gameKind.replaceAll("_"," "))}</span>`:""}</div>
    </article>`;
  }
  function section(title,key,rows,empty){return `<section class="public-live-group"><div class="public-live-group-heading"><h3>${esc(title)}</h3><span>${rows.length}</span></div><div class="public-live-grid">${rows.length?rows.map(card).join(""):`<div class="public-live-empty">${esc(empty)}</div>`}</div></section>`;}
  function render(){
    const visible=games.filter(matches),liveRows=visible.filter(g=>statusKey(g)==="live"),upcoming=visible.filter(g=>statusKey(g)==="upcoming").sort((a,b)=>new Date(a.scheduledAt||0)-new Date(b.scheduledAt||0)),finals=visible.filter(g=>statusKey(g)==="final").sort((a,b)=>new Date(b.endedAt||b.updatedAt||0)-new Date(a.endedAt||a.updatedAt||0));
    $("publicLiveCount").textContent=games.filter(g=>statusKey(g)==="live").length;$("publicUpcomingCount").textContent=games.filter(g=>statusKey(g)==="upcoming").length;$("publicFinalCount").textContent=games.filter(g=>statusKey(g)==="final").length;
    const wanted=filters.status;
    const chunks=[];
    if(wanted==="all"||wanted==="live")chunks.push(section("Live now","live",liveRows,"No public games are live right now."));
    if(wanted==="all"||wanted==="upcoming")chunks.push(section("Upcoming","upcoming",upcoming,"No matching public games are scheduled in the next 14 days."));
    if(wanted==="all"||wanted==="final")chunks.push(section("Recent finals","final",finals,"No matching public finals from the last 30 days."));
    $("publicLiveResults").innerHTML=chunks.join("");
  }
  async function refresh(){
    if(refreshing||!backend)return;refreshing=true;$("publicRefresh").disabled=true;
    try{const {data,error}=await backend.client.rpc("live_public_scoreboard_v1");if(error)throw error;games=Array.isArray(data?.games)?data.games:[];$("publicLastUpdated").textContent=new Date().toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});render();}
    catch(e){console.warn(e);$("publicLiveResults").innerHTML=`<div class="public-live-empty"><strong>Public scores are unavailable.</strong><br>${esc(e.message||"Try again in a moment.")}</div>`;}
    finally{refreshing=false;$("publicRefresh").disabled=false;}
  }
  try{const [dir,Backend]=await Promise.all([fetch("data/live/organization-directory-v7-62-1.json?v=7.62.1",{cache:"no-store"}).then(r=>r.ok?r.json():{organizations:[],teams:[]}).catch(()=>({organizations:[],teams:[]})),Promise.resolve(window.WPILiveBackend)]);directory=dir;const config=window.WPI_LIVE_SANDBOX_CONFIG||{};backend=Backend?.connect?await Backend.connect(config):null;if(!backend)throw new Error("WPI Live is not configured.");await refresh();}
  catch(e){$("publicLiveResults").innerHTML=`<div class="public-live-empty"><strong>Public scores are unavailable.</strong><br>${esc(e.message||"Try again in a moment.")}</div>`;}
  $("publicLiveSearch")?.addEventListener("input",e=>{filters.search=e.target.value;render();});
  $("publicLiveType")?.addEventListener("change",e=>{filters.type=e.target.value;render();});
  $("publicLiveGroup")?.addEventListener("change",e=>{filters.group=e.target.value;render();});
  $("publicLiveStatus")?.addEventListener("change",e=>{filters.status=e.target.value;render();});
  $("publicRefresh")?.addEventListener("click",refresh);
  setInterval(()=>{if(!document.hidden)refresh();},20000);
})();
