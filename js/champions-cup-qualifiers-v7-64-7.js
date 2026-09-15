/* WPI 7.64.7 — verified Champions Cup qualifier registry and record tracker. */
(()=>{
  "use strict";
  const DATA_PATH="data/tournaments/2026-champions-cup-qualifiers.json";
  const state={data:null,filter:"all",liveRecords:new Map()};
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??"").replace(/[&<>'"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]));
  const isFinal=game=>String(game?.status||"").toLowerCase()==="final"&&Number.isFinite(Number(game?.homeScore))&&Number.isFinite(Number(game?.awayScore));
  function recordFor(zone,team){
    const live=state.liveRecords.get(team.wpiTeamId);
    if(live)return {w:Number(live.wins||0),l:Number(live.losses||0),t:Number(live.ties||0),gf:Number(live.goalsFor||0),ga:Number(live.goalsAgainst||0),games:Number(live.games||0),source:"wpi_live"};
    const record={w:0,l:0,t:0,gf:0,ga:0,games:0,source:"registry"};
    (zone.games||[]).filter(isFinal).forEach(game=>{
      const home=game.homeTeamId===team.wpiTeamId||game.homeTeamKey===team.teamKey;
      const away=game.awayTeamId===team.wpiTeamId||game.awayTeamKey===team.teamKey;
      if(!home&&!away) return;
      const own=Number(home?game.homeScore:game.awayScore), opp=Number(home?game.awayScore:game.homeScore);
      record.games+=1;record.gf+=own;record.ga+=opp;
      if(own>opp) record.w+=1; else if(own<opp) record.l+=1; else record.t+=1;
    });
    return record;
  }
  function statusLabel(zone){return zone.qualifier?.status==="confirmed_date"?"Confirmed":"Awaiting confirmation";}
  function renderSummary(){
    const zones=state.data.zones||[];
    const confirmed=zones.filter(z=>z.qualifier?.status==="confirmed_date").length;
    const tracked=zones.reduce((n,z)=>n+(z.trackedTeams||[]).length,0);
    $("confirmedCount").textContent=String(confirmed);$("awaitingCount").textContent=String(zones.length-confirmed);$("trackedTeamCount").textContent=String(tracked);
    const event=state.data.event||{};
    $("championshipDates").textContent=event.championshipDates?.label||"Dates pending";
    $("championshipLocation").textContent=[event.championshipLocation?.venue,event.championshipLocation?.city,event.championshipLocation?.state].filter(Boolean).join(" · ");
    if(event.officialSource) $("officialEventSource").href=event.officialSource;
  }
  function zoneVisible(zone){if(state.filter==="all")return true;const confirmed=zone.qualifier?.status==="confirmed_date";return state.filter==="confirmed"?confirmed:!confirmed;}
  function renderZones(){
    const zones=(state.data.zones||[]).filter(zoneVisible);
    $("zoneGrid").innerHTML=zones.map(zone=>{
      const confirmed=zone.qualifier?.status==="confirmed_date";
      const tracked=(zone.trackedTeams||[])[0];
      const date=zone.qualifier?.dateLabel||"No 2026 qualifier date confirmed";
      const detail=confirmed?(zone.qualifier?.scheduleStatus==="not_published"?"Date confirmed · schedule and venue not yet published":"Qualifier information confirmed"):"USAWP may not require a qualifier in every zone. WPI is waiting for an official zone or USAWP confirmation.";
      const source=zone.qualifier?.source?`<a class="ccq-source-link" href="${esc(zone.qualifier.source)}" target="_blank" rel="noopener">Official zone source ↗</a>`:"";
      return `<article class="ccq-zone-card ${confirmed?"confirmed":"awaiting"}" id="${esc(zone.id)}">
        <div class="ccq-zone-head"><h3>${esc(zone.name)}</h3><span class="ccq-status ${confirmed?"confirmed":"awaiting"}">${statusLabel(zone)}</span></div>
        <div class="ccq-date">${esc(date)}</div><p>${esc(detail)}</p>
        ${tracked?`<div class="ccq-team-tag"><span>WPI tracking</span><strong>${esc(tracked.name)}</strong></div>`:""}
        ${source}
      </article>`;
    }).join("")||`<div class="ccq-error">No zones match this filter.</div>`;
  }
  function renderRecords(){
    const rows=[];
    (state.data.zones||[]).forEach(zone=>(zone.trackedTeams||[]).forEach(team=>rows.push({zone,team,record:recordFor(zone,team)})));
    $("recordGrid").innerHTML=rows.length?rows.map(({zone,team,record})=>`<article class="ccq-record-card">
      <header><div><h3>${esc(team.name)}</h3><span>${esc(zone.name)} Zone · ${esc(team.ageGroup)} ${esc(team.gender)}</span></div><span>${record.games?`${record.games} final game${record.games===1?"":"s"}`:"Schedule pending"}</span></header>
      <div class="ccq-record-stats"><div><strong>${record.w}</strong><span>W</span></div><div><strong>${record.l}</strong><span>L</span></div><div><strong>${record.t}</strong><span>T</span></div><div><strong>${record.gf}</strong><span>GF</span></div><div><strong>${record.ga}</strong><span>GA</span></div></div>
      <p class="ccq-record-note">${record.source==="wpi_live"?"Auto-updated from finalized public WPI Live qualifier games.":record.games?"Calculated from final qualifier games in the verified registry.":"0–0–0 until the official Pacific Zone schedule is published and games are recorded."}</p>
    </article>`).join(""):`<div class="ccq-error">No WPI teams are currently attached to a confirmed qualifier.</div>`;
  }
  function bindFilters(){document.querySelectorAll("[data-filter]").forEach(button=>button.addEventListener("click",()=>{state.filter=button.dataset.filter;document.querySelectorAll("[data-filter]").forEach(b=>b.classList.toggle("active",b===button));renderZones();}));}
  async function enrichFromPublicWpiLive(){
    const Backend=window.WPILiveBackend,config=window.WPI_LIVE_SANDBOX_CONFIG||{};
    if(!Backend?.connect)return;
    try{
      const backend=await Backend.connect(config);
      if(!backend?.client)return;
      const requests=[];
      (state.data.zones||[]).forEach(zone=>(zone.trackedTeams||[]).forEach(team=>{if(team.liveSeriesName&&team.wpiTeamId)requests.push({zone,team});}));
      for(const {team} of requests){
        const {data,error}=await backend.client.rpc("live_public_tournament_v2",{requested_tournament_public_id:null,requested_tournament_name:team.liveSeriesName,requested_competitive_season:"2026-2027",requested_search:null,requested_division:null,requested_team_id:null,requested_status:"all",requested_limit:1,requested_offset:0});
        if(error||!data?.found)continue;
        const row=(data.teams||[]).find(item=>String(item.teamId||"")===String(team.wpiTeamId));
        if(row)state.liveRecords.set(team.wpiTeamId,row);
      }
      if(state.liveRecords.size)renderRecords();
    }catch(error){console.warn("Champions Cup WPI Live enrichment unavailable",error);}
  }
  async function init(){
    try{const response=await fetch(DATA_PATH,{cache:"no-store"});if(!response.ok)throw new Error(`HTTP ${response.status}`);state.data=await response.json();renderSummary();renderZones();renderRecords();bindFilters();void enrichFromPublicWpiLive();}
    catch(error){console.error("Champions Cup qualifier tracker failed",error);$("zoneGrid").innerHTML=`<div class="ccq-error">Qualifier data could not be loaded. Please refresh and try again.</div>`;}
  }
  init();
})();
