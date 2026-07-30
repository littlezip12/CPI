(() => {
  "use strict";
  const RELEASE = "7.54.7";
  const FALLBACK_LOGO = "assets/logos/cpi-logo-fallback.svg";
  const $ = id => document.getElementById(id);
  const state = { registry: null, bundle: null, view: "games", filters: { age: "", gender: "", division: "", team: "", date: "", venue: "", status: "", search: "" } };

  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const ordinal = n => { const num=Number(n); if(!num) return "—"; const mod100=num%100; if(mod100>=11&&mod100<=13)return `${num}th`; return `${num}${({1:"st",2:"nd",3:"rd"})[num%10]||"th"}`; };
  const prettyDate = value => { if(!value) return "Date not listed"; const d=new Date(`${value}T12:00:00`); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); };
  const teamMap = () => new Map((state.bundle?.teams||[]).map(team => [team.participantId, team]));
  const teamFor = participant => participant ? teamMap().get(participant.participantId) || participant : null;
  const logoFor = team => team?.logo || FALLBACK_LOGO;
  const profileFor = team => team?.teamPage || team?.clubPage || null;
  const safeLogo = (src, alt) => `<img src="${esc(src||FALLBACK_LOGO)}" alt="${esc(alt||"")}" loading="lazy" data-fallback-logo>`;

  async function loadJson(path) {
    const response = await fetch(`${path}${path.includes("?")?"&":"?"}v=${RELEASE}`, {cache:"no-store"});
    if(!response.ok) throw new Error(`Unable to load ${path} (${response.status})`);
    return response.json();
  }

  function eventIdFromLocation(){ return new URLSearchParams(location.search).get("event") || document.body.dataset.event || "2026-quiksilver-cup"; }

  function setText(id, value){ const node=$(id); if(node) node.textContent=value; }
  function unique(values){ return [...new Set(values.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true})); }
  function fillSelect(id, values, label, mapper=value=>({value,label:value})){
    const node=$(id); if(!node) return;
    node.innerHTML=`<option value="">${esc(label)}</option>`+values.map(value=>{const item=mapper(value);return `<option value="${esc(item.value)}">${esc(item.label)}</option>`}).join("");
  }

  function populateEventSelect(){
    const select=$("tpEventSelect"); if(!select) return;
    select.innerHTML=(state.registry.events||[]).map(event=>`<option value="${esc(event.id)}" ${event.id===state.bundle.event.id?"selected":""}>${esc(event.name)}${event.migrationStatus!=="platform_live"?" · legacy viewer":""}</option>`).join("");
    select.addEventListener("change",()=>{
      const event=state.registry.events.find(item=>item.id===select.value); if(!event) return;
      if(event.migrationStatus==="platform_live") location.href=`tournament.html?event=${encodeURIComponent(event.id)}`;
      else location.href=event.publicPath;
    });
  }

  function populateFilters(){
    const bundle=state.bundle;
    fillSelect("tpAge", unique(bundle.divisions.map(d=>d.ageGroup)), "All age groups");
    fillSelect("tpGender", unique(bundle.divisions.map(d=>d.gender)), "All genders");
    fillSelect("tpDivision", bundle.divisions, "All divisions", d=>({value:d.id,label:d.label}));
    fillSelect("tpTeam", bundle.teams, "All teams", t=>({value:t.participantId,label:`${t.name} · ${t.divisionLabel}`}));
    fillSelect("tpDate", bundle.dates.map(d=>d.dateIso), "All dates", d=>({value:d,label:prettyDate(d)}));
    fillSelect("tpVenue", bundle.venues.map(v=>v.label), "All venues");
    fillSelect("tpStatus", ["final","scheduled"], "All game states", s=>({value:s,label:s==="final"?"Final":"Scheduled"}));
    const params=new URLSearchParams(location.search);
    const requestedTeam=params.get("team");
    if(requestedTeam && bundle.teams.some(t=>t.participantId===requestedTeam)) state.filters.team=requestedTeam;
    const bindings={tpAge:"age",tpGender:"gender",tpDivision:"division",tpTeam:"team",tpDate:"date",tpVenue:"venue",tpStatus:"status",tpSearch:"search"};
    Object.entries(bindings).forEach(([id,key])=>{
      const node=$(id); if(!node)return;
      node.value=state.filters[key]||"";
      node.addEventListener(id==="tpSearch"?"input":"change",()=>{state.filters[key]=node.value; render();});
    });
    $("tpClear")?.addEventListener("click",()=>{
      Object.keys(state.filters).forEach(key=>state.filters[key]="");
      Object.entries(bindings).forEach(([id])=>{if($(id))$(id).value="";});
      render();
    });
  }

  function renderHero(){
    const {event,summary}=state.bundle;
    document.title=`${event.name} | Water Polo Index`;
    setText("tpKicker",`${event.season} tournament archive`);
    setText("tpTitle",event.name);
    setText("tpDescription","Search every verified game, filter by division, team, date, venue, or result, and open a complete team journey from one reusable WPI tournament viewer.");
    setText("tpEventStatus",event.status);
    setText("tpDates",`${prettyDate(event.startDate)} – ${prettyDate(event.endDate)}`);
    setText("tpPolicy",event.sourcePolicy);
    const logo=$("tpEventLogo"); if(logo){logo.src=event.logo||FALLBACK_LOGO;logo.alt=`${event.shortName||event.name} logo`;}
    const source=$("tpOfficialSource"); if(source){source.href=event.officialSourceUrl||"#";source.hidden=!event.officialSourceUrl;}
    const metrics={tpDivisions:summary.divisionCount,tpGames:summary.gameCount,tpTeams:summary.teamCount,tpPlacements:summary.placementCount,tpVenues:summary.venueCount};
    Object.entries(metrics).forEach(([id,value])=>setText(id,Number(value).toLocaleString()));
  }

  function filteredGames(){
    const f=state.filters; const query=f.search.trim().toLowerCase();
    return state.bundle.games.filter(game=>{
      if(f.age&&game.ageGroup!==f.age)return false;
      if(f.gender&&game.gender!==f.gender)return false;
      if(f.division&&game.divisionId!==f.division)return false;
      if(f.team&&game.white?.participantId!==f.team&&game.dark?.participantId!==f.team)return false;
      if(f.date&&game.dateIso!==f.date)return false;
      if(f.venue&&game.venue!==f.venue)return false;
      if(f.status&&game.status!==f.status)return false;
      if(query){
        const hay=[game.divisionLabel,game.dateLabel,game.timeLabel,game.venue,game.gameNumber,game.stage,game.white?.name,game.dark?.name,game.scores?.white,game.scores?.dark].join(" ").toLowerCase();
        if(!hay.includes(query))return false;
      }
      return true;
    });
  }

  function resultFor(game, participantId){
    if(game.status!=="final")return "pending";
    if(game.outcome?.winnerParticipantId===participantId)return "win";
    if(game.outcome?.loserParticipantId===participantId)return "loss";
    return "tie";
  }

  function scoreLabel(game){
    if(game.status!=="final")return "Scheduled";
    const w=game.scores?.white, d=game.scores?.dark;
    let score=`${w ?? "—"}–${d ?? "—"}`;
    if(game.shootout?.white!=null&&game.shootout?.dark!=null)score+=` (SO ${game.shootout.white}–${game.shootout.dark})`;
    return score;
  }

  function sideHtml(participant, game, side){
    const team=teamFor(participant); if(!team)return `<div class="tp-side"><span>Team TBD</span></div>`;
    const winner=game.outcome?.winnerParticipantId===team.participantId?" winner":"";
    const score=game.status==="final"?(game.scores?.[side]??"—"):"—";
    return `<div class="tp-side${winner}">${safeLogo(logoFor(team),team.name)}<button class="tp-team-button" type="button" data-team="${esc(team.participantId)}">${esc(team.name)}</button><span class="tp-score">${esc(score)}</span></div>`;
  }

  function renderGames(games){
    if(!games.length)return `<div class="tp-empty">No games match the current filters.</div>`;
    return `<div class="tp-games">${games.map(game=>`<article class="tp-game"><div class="tp-game-head"><strong>${esc(game.divisionLabel)} · ${esc(game.gameNumber||"Game")}</strong><span>${esc(prettyDate(game.dateIso))} · ${esc(game.timeLabel||"Time TBD")}</span></div><div class="tp-matchup"><div>${sideHtml(game.white,game,"white")}${sideHtml(game.dark,game,"dark")}</div></div><div class="tp-game-footer"><strong>${esc(scoreLabel(game))}</strong><span>${esc(game.stage||"Tournament game")} · ${esc(game.venue||"Venue TBD")}</span></div></article>`).join("")}</div>`;
  }

  function teamsForGames(games){
    const ids=new Set(); games.forEach(game=>{if(game.white?.participantId)ids.add(game.white.participantId);if(game.dark?.participantId)ids.add(game.dark.participantId);});
    const query=state.filters.search.trim().toLowerCase();
    return state.bundle.teams.filter(team=>ids.has(team.participantId)&&(!query||[team.name,team.clubName,team.divisionLabel].join(" ").toLowerCase().includes(query)));
  }

  function renderTeams(games){
    const teams=teamsForGames(games); if(!teams.length)return `<div class="tp-empty">No teams match the current filters.</div>`;
    return `<div class="tp-teams">${teams.map(team=>`<article class="tp-team-card" style="--team-primary:${esc(team.primaryColor)};--team-secondary:${esc(team.secondaryColor)}"><div class="tp-team-card-head">${safeLogo(logoFor(team),team.name)}<div><h3>${esc(team.name)}</h3><p>${esc(team.divisionLabel)}${team.clubName?` · ${esc(team.clubName)}`:""}</p></div></div><div class="tp-team-stats"><div class="tp-team-stat"><span>Record</span><strong>${esc(team.record.display)}</strong></div><div class="tp-team-stat"><span>Finish</span><strong>${esc(team.finishLabel||"Record only")}</strong></div><div class="tp-team-stat"><span>WPI rank</span><strong>${team.rank?`#${esc(team.rank)}`:"—"}</strong></div></div><div class="tp-team-actions"><button type="button" data-team="${esc(team.participantId)}">View journey →</button>${profileFor(team)?`<a href="${esc(profileFor(team))}">Profile →</a>`:""}</div></article>`).join("")}</div>`;
  }

  function renderPlacements(){
    const query=state.filters.search.trim().toLowerCase(); const map=teamMap();
    const divisions=state.bundle.divisions.filter(d=>(!state.filters.age||d.ageGroup===state.filters.age)&&(!state.filters.gender||d.gender===state.filters.gender)&&(!state.filters.division||d.id===state.filters.division));
    const groups=divisions.map(division=>{
      let rows=(state.bundle.placements[division.id]||[]).filter(row=>!state.filters.team||row.participantId===state.filters.team);
      if(query)rows=rows.filter(row=>[row.name,row.clubName,division.label].join(" ").toLowerCase().includes(query));
      if(!rows.length)return "";
      return `<section class="tp-placement-group"><h3>${esc(division.label)}</h3>${rows.map(row=>{const team=map.get(row.participantId)||row;const link=profileFor(team);return `<div class="tp-placement-row"><span class="tp-place">${esc(row.placeLabel||ordinal(row.place))}</span>${safeLogo(logoFor(team),row.name)}<span class="tp-placement-name">${esc(row.name)}</span>${link?`<a href="${esc(link)}">Profile →</a>`:""}</div>`;}).join("")}</section>`;
    }).filter(Boolean);
    return groups.length?`<div class="tp-placement-groups">${groups.join("")}</div>`:`<div class="tp-empty">No placements match the current filters.</div>`;
  }

  function renderJourney(){
    const mount=$("tpJourney"); const id=state.filters.team; if(!mount)return;
    if(!id){mount.hidden=true;mount.innerHTML="";return;}
    const team=teamMap().get(id); if(!team){mount.hidden=true;return;}
    const games=state.bundle.games.filter(game=>game.white?.participantId===id||game.dark?.participantId===id).sort((a,b)=>(a.dateIso||"").localeCompare(b.dateIso||"")||(a.timeLabel||"").localeCompare(b.timeLabel||""));
    const links=[team.teamPage?`<a href="${esc(team.teamPage)}">Team profile →</a>`:"",team.clubPage?`<a href="${esc(team.clubPage)}">Club profile →</a>`:""].filter(Boolean).join("");
    mount.hidden=false;
    mount.innerHTML=`<div class="tp-journey-head"><div class="tp-journey-id">${safeLogo(logoFor(team),team.name).replace('<img ','<img class="tp-journey-logo" ')}<div><p class="tp-kicker">Team journey</p><h2>${esc(team.name)}</h2><p class="tp-journey-meta">${esc(team.divisionLabel)}${team.finishLabel?` · ${esc(team.finishLabel)}`:""}${team.clubName?` · ${esc(team.clubName)}`:""}</p></div></div><div class="tp-record"><span>Tournament record</span><strong>${esc(team.record.display)}</strong></div></div><div class="tp-journey-links">${links}</div><div class="tp-timeline">${games.map(game=>{const result=resultFor(game,id);const opponent=game.white?.participantId===id?teamFor(game.dark):teamFor(game.white);return `<div class="tp-timeline-game ${result}"><div><span class="result">${result}</span><small>${esc(prettyDate(game.dateIso))} · ${esc(game.timeLabel||"Time TBD")}</small></div><div><strong>vs. ${esc(opponent?.name||"Opponent TBD")}</strong><small>${esc(game.stage||"Tournament game")} · ${esc(game.venue||"Venue TBD")}</small></div><span class="score">${esc(scoreLabel(game))}</span></div>`;}).join("")}</div>`;
  }

  function bindDynamic(){
    document.querySelectorAll("[data-team]").forEach(node=>node.addEventListener("click",()=>{
      state.filters.team=node.dataset.team||""; if($("tpTeam"))$("tpTeam").value=state.filters.team; render(); document.getElementById("tpJourney")?.scrollIntoView({behavior:"smooth",block:"start"});
    }));
    document.querySelectorAll("img[data-fallback-logo]").forEach(img=>img.addEventListener("error",()=>{if(!img.src.endsWith(FALLBACK_LOGO))img.src=FALLBACK_LOGO;},{once:true}));
  }

  function render(){
    const games=filteredGames(); renderJourney();
    let html="";
    if(state.view==="teams")html=renderTeams(games);
    else if(state.view==="placements")html=renderPlacements();
    else html=renderGames(games);
    $("tpContent").innerHTML=html;
    const label=state.view==="teams"?`${teamsForGames(games).length} teams`:state.view==="placements"?"Final placements":`${games.length} games`;
    setText("tpResultCount",label);
    document.querySelectorAll(".tp-tab").forEach(button=>button.classList.toggle("active",button.dataset.view===state.view));
    const journeyTab=document.querySelector('[data-view="journey"]'); if(journeyTab)journeyTab.disabled=!state.filters.team;
    bindDynamic();
  }

  function bindTabs(){
    document.querySelectorAll(".tp-tab").forEach(button=>button.addEventListener("click",()=>{
      if(button.dataset.view==="journey") { if(state.filters.team) $("tpJourney")?.scrollIntoView({behavior:"smooth",block:"start"}); return; }
      state.view=button.dataset.view||"games"; render();
    }));
  }

  async function init(){
    try{
      const eventId=eventIdFromLocation();
      state.registry=window.WPI_TOURNAMENT_PLATFORM_REGISTRY||await loadJson("data/tournaments/platform/registry.json");
      const event=state.registry.events.find(item=>item.id===eventId);
      if(!event)throw new Error("This tournament is not registered in the WPI platform.");
      if(event.migrationStatus!=="platform_live"){location.replace(event.publicPath);return;}
      state.bundle=await loadJson(event.dataPath);
      renderHero(); populateEventSelect(); populateFilters(); bindTabs(); render();
      $("tpLoading")?.remove();
    }catch(error){
      console.error(error);
      const content=$("tpContent"); if(content)content.innerHTML=`<div class="tp-empty"><strong>Tournament data could not be loaded.</strong><br>${esc(error.message)}</div>`;
      setText("tpEventStatus","Data unavailable");
    }
  }
  document.addEventListener("DOMContentLoaded",init);
})();
