/* WPI 7.62.6 — Homepage public WPI Live pulse. Public score summaries only. */
(async()=>{
  "use strict";
  const root=document.getElementById("wpiHomeLivePulse");
  if(!root)return;
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  let backend=null,directory={organizations:[]};
  const orgById=()=>new Map((directory.organizations||[]).map(o=>[String(o.organizationId),o]));
  function statusKey(g){return g.status==="live"?"live":g.status==="final"?"final":"upcoming";}
  function dateLabel(v){if(!v)return"Time TBD";const d=new Date(v);return Number.isNaN(d.getTime())?"Time TBD":d.toLocaleString([],{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});}
  function clockLabel(seconds){const s=Math.max(0,Number(seconds)||0);return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;}
  function liveState(g){if(g.status!=="live")return"";const q=Number(g.currentQuarter)||1;const p=q<=4?`Q${q}`:q===5?"OT1":q===6?"OT2":`P${q}`;return `${p} · ${clockLabel(g.currentTimeRemainingSeconds)}`;}
  function card(g){
    const status=statusKey(g),org=orgById().get(String(g.organizationId));
    const primary=org?.primaryColor||"#0b4d8f",secondary=org?.secondaryColor||"#2bd7f3";
    const ownName=g.teamDisplayLabel||g.teamName||"WPI team",oppName=g.opponentName||"Opponent";
    const ownLogo=g.teamLogoUrl||g.organizationLogoUrl||org?.logo||"assets/logos/cpi-logo-fallback.svg";
    const oppLogo=g.opponentLogoUrl||"assets/branding/wpi-logo-mark.png";
    const score=status==="upcoming"?"vs":`${g.teamScore??0}–${g.opponentScore??0}`;
    const statusText=status==="live"?"LIVE":status==="final"?"FINAL":"UPCOMING";
    const detail=status==="live"?liveState(g):dateLabel(g.scheduledAt);
    return `<a class="wpi-home-live-card" href="live-score.html?game=${encodeURIComponent(g.id)}" style="--pulse-primary:${esc(primary)};--pulse-secondary:${esc(secondary)}" aria-label="Open ${esc(ownName)} versus ${esc(oppName)} public score">
      <header><span class="wpi-home-live-org">${esc(g.organizationName||ownName)}</span><span class="wpi-home-live-status ${status}">${statusText}</span></header>
      <div class="wpi-home-live-matchup">
        <div class="wpi-home-live-side"><img src="${esc(ownLogo)}" alt="" onerror="this.onerror=null;this.src='assets/logos/cpi-logo-fallback.svg'"><span>${esc(ownName)}</span></div>
        <b class="wpi-home-live-score">${esc(score)}</b>
        <div class="wpi-home-live-side"><img src="${esc(oppLogo)}" alt="" onerror="this.onerror=null;this.src='assets/branding/wpi-logo-mark.png'"><span>${esc(oppName)}</span></div>
      </div>
      <footer><span>${esc(g.venue||g.gameKind?.replaceAll("_"," ")||"WPI Live")}</span><strong>${esc(detail)}</strong></footer>
    </a>`;
  }
  function choose(games){
    const live=games.filter(g=>statusKey(g)==="live");
    const upcoming=games.filter(g=>statusKey(g)==="upcoming").sort((a,b)=>new Date(a.scheduledAt||0)-new Date(b.scheduledAt||0));
    const finals=games.filter(g=>statusKey(g)==="final").sort((a,b)=>new Date(b.endedAt||b.updatedAt||0)-new Date(a.endedAt||a.updatedAt||0));
    const chosen=[];
    for(const pool of [live,upcoming,finals])for(const g of pool){if(chosen.length>=3)break;chosen.push(g);}    
    return {live,upcoming,finals,chosen};
  }
  function render(games,generatedAt){
    const {live,upcoming,finals,chosen}=choose(games);
    $("wpiHomeLiveNowCount").textContent=live.length;
    $("wpiHomeUpcomingCount").textContent=upcoming.length;
    $("wpiHomeFinalCount").textContent=finals.length;
    const stamp=generatedAt?new Date(generatedAt):new Date();
    $("wpiHomeLiveUpdated").textContent=Number.isNaN(stamp.getTime())?"Public scores":"Updated "+stamp.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
    $("wpiHomeLiveCards").innerHTML=chosen.length?chosen.map(card).join(""):`<div class="wpi-home-live-empty"><strong>No public games are available right now.</strong><br><a href="live.html">Open WPI Live</a> for the full public scoreboard.</div>`;
  }
  async function refresh(){
    if(!backend)return;
    try{
      const {data,error}=await backend.client.rpc("live_public_scoreboard_v1");
      if(error)throw error;
      render(Array.isArray(data?.games)?data.games:[],data?.generatedAt);
    }catch(e){
      console.warn("WPI homepage Live pulse unavailable",e);
      $("wpiHomeLiveUpdated").textContent="Live feed unavailable";
      $("wpiHomeLiveCards").innerHTML='<div class="wpi-home-live-empty">Public scores could not load. <a href="live.html">Open WPI Live</a>.</div>';
    }
  }
  try{
    directory=await fetch("data/live/organization-directory-v7-62-1.json?v=7.62.1",{cache:"no-store"}).then(r=>r.ok?r.json():{organizations:[]}).catch(()=>({organizations:[]}));
    const Backend=window.WPILiveBackend,config=window.WPI_LIVE_SANDBOX_CONFIG||{};
    backend=Backend?.connect?await Backend.connect(config):null;
    if(!backend)throw new Error("WPI Live is not configured");
    await refresh();
    setInterval(()=>{if(!document.hidden)refresh();},30000);
  }catch(e){
    console.warn("WPI homepage Live pulse unavailable",e);
    $("wpiHomeLiveUpdated").textContent="Live feed unavailable";
    $("wpiHomeLiveCards").innerHTML='<div class="wpi-home-live-empty">Public scores are temporarily unavailable. <a href="live.html">Open WPI Live</a>.</div>';
  }
})();
