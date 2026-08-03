(() => {
  "use strict";
  const RELEASE = "7.54.16";
  const FALLBACK = "assets/logos/cpi-logo-fallback.svg?v=7.53.4";
  const state = { config:null, year:2026, event:null, bundleCache:new Map(), requestedGroup:"", requestedTeam:"" };
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const normalize = value => String(value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/&/g," and ").replace(/[^a-z0-9]+/g," ").trim();
  const rankings = Array.isArray(window.CPI_RANKINGS) ? window.CPI_RANKINGS : [];
  const clubs = Array.isArray(window.CPI_CLUBS) ? window.CPI_CLUBS : [];
  const joProfiles = window.WPI_JO_PROFILES || {teams:{},lookup:{}};

  async function loadJson(path){
    const response = await fetch(`${path}${path.includes("?")?"&":"?"}v=${RELEASE}`, {cache:"no-store"});
    if(!response.ok) throw new Error(`Unable to load ${path}`);
    return response.json();
  }

  function renderHero(){
    const link = $("latestTournamentResults");
    if(!link) return;
    const next = state.config.nextTournament || {};
    if(next.publicPath && ["schedule_available","live"].includes(next.status)){
      link.textContent = next.status === "live" ? `Follow ${next.name} live` : `Open ${next.name}`;
      link.href = next.publicPath;
      return;
    }
    const featured = state.config.events.find(event => event.id === state.config.featuredEventId);
    if(!featured) return;
    link.textContent = featured.featuredLabel || `View ${featured.name} results`;
    if(featured.publicPath && !featured.publicPath.startsWith("#")){ link.href=featured.publicPath; return; }
    link.href = "#tournament-archive";
    link.addEventListener("click", event => { event.preventDefault(); selectEvent(featured.id, true); });
  }

  function renderNext(){
    const next = state.config.nextTournament || {};
    $("nextTournamentStatus").textContent = next.status === "live" ? "Live now" : next.eyebrow || "Next tournament";
    $("nextTournamentName").textContent = next.name || "Tournament announcement coming soon";
    $("nextTournamentDescription").textContent = next.description || "Schedule details will be published when verified.";
    $("nextTournamentDate").textContent = next.dateLabel || "Date coming soon";
    $("nextTournamentLocation").textContent = next.locationLabel || "Location coming soon";
    const action = $("nextTournamentAction");
    action.textContent = next.ctaLabel || "Schedule coming soon";
    if(next.publicPath){
      action.href = next.publicPath;
      action.removeAttribute("aria-disabled");
    }else{
      action.removeAttribute("href");
      action.setAttribute("aria-disabled","true");
    }
  }

  function renderYears(){
    const mount = $("tournamentYearTabs");
    mount.innerHTML = state.config.years.map(year => `<button class="tournament-year-tab${year===state.year?" active":""}" type="button" data-year="${year}">${year}</button>`).join("");
    mount.querySelectorAll("[data-year]").forEach(button => button.addEventListener("click", () => {
      state.year = Number(button.dataset.year);
      state.event = null;
      renderYears();
      renderEvents();
      $("archiveBrowser").hidden = true;
    }));
  }

  function eventsForYear(){ return state.config.events.filter(event => event.year === state.year).sort((a,b)=>a.seasonOrder-b.seasonOrder); }

  function renderEvents(){
    const mount = $("tournamentEventList");
    const events = eventsForYear();
    if(!events.length){
      mount.innerHTML = `<div class="archive-empty"><strong>${state.year} results are ready to be added.</strong><br>WPI will place each tournament in water polo season order, with Junior Olympics last.</div>`;
      return;
    }
    mount.innerHTML = events.map(event => `<button class="tournament-event-row${state.event?.id===event.id?" active":""}" type="button" data-event="${esc(event.id)}">
      <div><h3>${esc(event.name)}</h3><p>${esc(event.dateLabel)} · ${esc(event.audience)}</p></div>
      <div class="tournament-event-row-meta"><span>${esc(event.resultLabel)}</span><b>View results →</b></div>
    </button>`).join("");
    mount.querySelectorAll("[data-event]").forEach(button => button.addEventListener("click",()=>selectEvent(button.dataset.event,true)));
  }

  async function selectEvent(eventId, scroll){
    const event = state.config.events.find(item => item.id === eventId);
    if(!event) return;
    state.year = event.year;
    state.event = event;
    renderYears();
    renderEvents();
    const browser = $("archiveBrowser");
    browser.hidden = false;
    $("archiveEventName").textContent = event.name;
    $("archiveEventMeta").textContent = `${event.dateLabel} · ${event.audience}`;
    const full = $("archiveFullLink");
    if(event.mode === "platform") { full.href = event.publicPath; full.hidden = false; full.textContent = "Open full tournament →"; }
    else if(event.publicPath && !event.publicPath.startsWith("#")){ full.href=event.publicPath; full.hidden=false; full.textContent="Open JO recap →"; }
    else { full.href = "#"; full.hidden = true; }
    $("archiveGroupSelect").innerHTML = `<option value="">Loading age groups…</option>`;
    $("archiveResults").innerHTML = `<div class="archive-results-prompt">Loading tournament results…</div>`;
    try{
      const data = await getBundle(event);
      populateGroups(event,data);
    }catch(error){
      console.error(error);
      $("archiveResults").innerHTML = `<div class="archive-error">Tournament results could not be loaded. Please refresh and try again.</div>`;
    }
    if(scroll) browser.scrollIntoView({behavior:"smooth",block:"start"});
  }

  async function getBundle(event){
    if(state.bundleCache.has(event.id)) return state.bundleCache.get(event.id);
    const data = await loadJson(event.dataPath);
    state.bundleCache.set(event.id,data);
    return data;
  }

  function populateGroups(event,data){
    const select = $("archiveGroupSelect");
    const options = event.mode === "jo"
      ? data.groups.map(group => ({value:group.id,label:`${group.label} — ${group.teamCount} teams`}))
      : data.divisions.map(division => ({value:division.id,label:division.label}));
    select.innerHTML = `<option value="">Choose an age / gender</option>` + options.map(item=>`<option value="${esc(item.value)}">${esc(item.label)}</option>`).join("");
    select.onchange = () => renderSelectedResults(event,data,select.value);
    $("archiveResults").innerHTML = `<div class="archive-results-prompt">Select an age and gender to open the final results.</div>`;
    if(event.mode === "jo" && state.requestedGroup && options.some(item => item.value === state.requestedGroup)){
      select.value = state.requestedGroup;
      renderSelectedResults(event,data,state.requestedGroup);
      state.requestedGroup = "";
    }
  }

  function candidateNames(name){
    const clean = window.CPIIdentity?.cleanSourceName?.(name) || String(name||"").trim();
    const values=[clean]; let stripped=clean;
    for(let i=0;i<3;i+=1){ const next=stripped.replace(/\s+(?:A|B|C|D|Black|Blue|Red|White|Gold|Silver|Orange|Green|Teal|Yellow|Navy|Gray|Grey|Premier|13A)\s*$/i,"").trim(); if(next===stripped)break; values.push(next); stripped=next; }
    return [...new Set(values.filter(Boolean))];
  }

  function joAsset(name,group){
    const target=normalize(name); const groupLabel=normalize(group.label);
    const ranked=rankings.find(team=>normalize(team.team)===target&&normalize(team.group)===groupLabel)||rankings.find(team=>normalize(team.team)===target);
    const slug=joProfiles.lookup?.[`${group.id}|${target}`]; const profile=slug?joProfiles.teams?.[slug]:null;
    const identity=window.CPIIdentity?.resolveTeam?.(name,{season:"2026",ageGroup:group.ageGroup,gender:group.category});
    let club=identity?.club||null;
    if(!club&&window.CPIIdentity?.resolveClub){ for(const candidate of candidateNames(name)){ club=window.CPIIdentity.resolveClub(candidate); if(club)break; } }
    if(!club){ const candidates=candidateNames(name).map(normalize); club=clubs.find(item=>candidates.includes(normalize(item.displayName||item.club||item.slug)))||null; }
    const logo=[ranked?.logo,profile?.logo,club?.logo].find(value=>value&&!String(value).includes("cpi-logo-fallback"))||FALLBACK;
    return {logo};
  }

  function joDivisionId(id){ if(id==="10u-boys-championship")return "10u-championship"; if(id==="10u-coed-classic")return "10u-girls-classic"; return id; }
  function joJourney(group,division,team){ if(group.weekend==="Weekend 3"){ const params=new URLSearchParams({event:"2026-jo-session-3",team:team.participantId||""}); return `tournament.html?${params.toString()}#tpJourney`; } const app=group.category==="Boys"?"jo-boys":"jo-girls"; const params=new URLSearchParams({division:joDivisionId(division.id),team:team.team,focus:"journey"}); return `tournaments/${app}/?${params.toString()}#team-explorer`; }

  function renderSelectedResults(event,data,value){
    const mount=$("archiveResults");
    if(!value){ mount.innerHTML=`<div class="archive-results-prompt">Select an age and gender to open the final results.</div>`; return; }
    if(event.mode==="jo") renderJoResults(data,value,mount);
    else renderPlatformResults(event,data,value,mount);
  }

  function renderJoResults(data,groupId,mount){
    const group=data.groups.find(item=>item.id===groupId); if(!group)return;
    mount.innerHTML=group.divisions.map((division,index)=>`<details class="archive-result-group" ${index===0?"open":""}>
      <summary><strong>${esc(division.label)}</strong><span>${division.teamCount} teams</span></summary>
      ${division.subdivisions.length?division.subdivisions.map(subdivision=>`<section class="archive-subdivision"><h4>${esc(subdivision.label)}</h4><ol class="archive-team-list">${subdivision.teams.map(team=>{
        const asset=joAsset(team.team,group); const href=joJourney(group,division,team); const placement=team.overallPlaceLabel||team.placeLabel||"—";
        const detail=[team.record?`Record ${team.record}`:"",`${subdivision.label} ${team.placeLabel||""}`.trim()].filter(Boolean).join(" · ");
        const highlight = state.requestedTeam && normalize(team.team) === normalize(state.requestedTeam) ? " archive-team-highlight" : "";
        const logo=group.weekend==="Weekend 3"?"":`<img class="archive-team-logo" src="${esc(asset.logo)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK}'">`;
        return `<li><a class="archive-team-link${highlight}" href="${esc(href)}"><span class="archive-place">${esc(placement)}</span>${logo}<span class="archive-team-name"><strong>${esc(team.team)}</strong><small>${esc(detail)}</small></span><span class="archive-journey-label">View games →</span></a></li>`;
      }).join("")}</ol></section>`).join(""):`<p class="archive-results-note">${esc(division.source||group.sourceNote||"Results are not available from the official source.")}</p>`}
    </details>`).join("");
  }

  function renderPlatformResults(event,data,divisionId,mount){
    const division=data.divisions.find(item=>item.id===divisionId); const teams=new Map(data.teams.map(team=>[team.participantId,team])); const rows=data.placements?.[divisionId]||[];
    if(!division){ mount.innerHTML=`<div class="archive-results-prompt">This division could not be loaded.</div>`; return; }
    const placedIds=new Set(rows.map(row=>row.participantId));
    const unplaced=data.teams.filter(team=>team.divisionId===divisionId&&!placedIds.has(team.participantId)).sort((a,b)=>a.name.localeCompare(b.name));
    const linkRow=(team,label)=>{const logo=team.logo||FALLBACK; const record=team.record?.display||"Record unavailable"; const href=`tournament.html?event=${encodeURIComponent(event.id)}&team=${encodeURIComponent(team.participantId)}#tpJourney`; return `<li><a class="archive-team-link" href="${esc(href)}"><span class="archive-place">${esc(label)}</span><img class="archive-team-logo" src="${esc(logo)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK}'"><span class="archive-team-name"><strong>${esc(team.name)}</strong><small>${esc(record)} · ${esc(division.label)}</small></span><span class="archive-journey-label">View games →</span></a></li>`;};
    const placedHtml=rows.length?`<section class="archive-subdivision"><h4>Verified placements</h4><ol class="archive-team-list">${rows.map(row=>linkRow(teams.get(row.participantId)||row,row.placeLabel||String(row.place||"—"))).join("")}</ol></section>`:"";
    const recordHtml=unplaced.length?`<section class="archive-subdivision"><h4>Records only</h4><p class="archive-results-note">No official placement game was played for these teams.</p><ol class="archive-team-list">${unplaced.map(team=>linkRow(team,"—")).join("")}</ol></section>`:"";
    mount.innerHTML=`<details class="archive-result-group" open><summary><strong>${esc(division.label)}</strong><span>${rows.length} verified placements · ${unplaced.length} records only</span></summary>${placedHtml}${recordHtml}</details>`;
  }

  async function init(){
    try{
      state.config=await loadJson("data/tournaments/public-hub.json");
      state.year=state.config.years[0];
      const params = new URLSearchParams(location.search);
      state.requestedGroup = params.get("results") || "";
      state.requestedTeam = params.get("team") || "";
      renderHero(); renderNext(); renderYears(); renderEvents();
      if(state.requestedGroup) await selectEvent("2026-junior-olympics", false);
    }catch(error){ console.error(error); $("tournamentEventList").innerHTML=`<div class="archive-error">Tournament archive could not be loaded.</div>`; }
  }
  document.addEventListener("DOMContentLoaded",init);
})();
