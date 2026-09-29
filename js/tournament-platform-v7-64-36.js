(() => {
  "use strict";
  const RELEASE = "7.64.36";
  const FALLBACK_LOGO = "assets/logos/cpi-logo-fallback.svg";
  const PIN_PREFIX = "wphq-tournament-pinned-team:";
  const $ = id => document.getElementById(id);
  const state = {
    registry: null, bundle: null, view: "games", refreshTimer: null,
    filters: { age: "", gender: "", division: "", team: "", date: "", venue: "", status: "", search: "" },
    gameMap: new Map(), routeMemo: new Map(), groupMemo: new Map()
  };

  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const ordinal = n => { const v=Number(n); if(!v)return "—"; const m=v%100; if(m>=11&&m<=13)return `${v}th`; return `${v}${({1:"st",2:"nd",3:"rd"})[v%10]||"th"}`; };
  const prettyDate = value => { if(!value)return "Date not listed"; const d=new Date(`${value}T12:00:00`); return Number.isNaN(d.getTime())?value:d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); };
  const timeValue = value => { const m=String(value||"").match(/^(\d+):(\d+)\s*(AM|PM)$/i); if(!m)return 9999; let h=Number(m[1])%12; if(m[3].toUpperCase()==="PM")h+=12; return h*60+Number(m[2]); };
  const gameSort = (a,b) => String(a.dateIso||"").localeCompare(String(b.dateIso||"")) || timeValue(a.timeLabel)-timeValue(b.timeLabel) || String(a.routeNumber||a.gameNumber||"").localeCompare(String(b.routeNumber||b.gameNumber||""),undefined,{numeric:true});
  const teamMap = () => new Map((state.bundle?.teams||[]).map(t=>[t.participantId,t]));
  const teamById = id => id ? teamMap().get(id) || null : null;
  const logoFor = team => team?.logo || FALLBACK_LOGO;
  const profileFor = team => team?.teamPage || team?.clubPage || null;
  const safeLogo = (src,alt) => `<img src="${esc(src||FALLBACK_LOGO)}" alt="${esc(alt||"")}" loading="lazy" data-fallback-logo>`;

  async function loadJson(path){ const r=await fetch(`${path}${path.includes("?")?"&":"?"}v=${RELEASE}&t=${Date.now()}`,{cache:"no-store"}); if(!r.ok)throw new Error(`Unable to load ${path} (${r.status})`); return r.json(); }
  function eventIdFromLocation(){ return new URLSearchParams(location.search).get("event") || document.body.dataset.event || "2026-quiksilver-cup"; }
  function setText(id,value){ const n=$(id); if(n)n.textContent=value; }
  function unique(values){ return [...new Set(values.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true})); }
  function fillSelect(id,values,label,mapper=v=>({value:v,label:v})){ const n=$(id); if(!n)return; n.innerHTML=`<option value="">${esc(label)}</option>`+values.map(v=>{const x=mapper(v);return `<option value="${esc(x.value)}">${esc(x.label)}</option>`}).join(""); }
  function pinStorageKey(){ return `${PIN_PREFIX}${state.bundle?.event?.id||eventIdFromLocation()}`; }
  function readPinnedTeam(){ try{return window.localStorage?.getItem(pinStorageKey())||"";}catch(_){return "";} }
  function writePinnedTeam(id){ try{if(id)window.localStorage?.setItem(pinStorageKey(),String(id));else window.localStorage?.removeItem(pinStorageKey());}catch(_){} }
  function isPinnedTeam(id){ return Boolean(id)&&readPinnedTeam()===String(id); }
  function resetDerived(){ state.gameMap=new Map((state.bundle?.games||[]).map(g=>[g.id,g])); state.routeMemo.clear(); state.groupMemo.clear(); }

  function populateEventSelect(){
    const select=$("tpEventSelect"); if(!select)return;
    select.innerHTML=(state.registry.events||[]).map(e=>`<option value="${esc(e.id)}" ${e.id===state.bundle.event.id?"selected":""}>${esc(e.name)}${e.migrationStatus!=="platform_live"?" · legacy viewer":""}</option>`).join("");
    select.addEventListener("change",()=>{ const e=state.registry.events.find(x=>x.id===select.value); if(!e)return; location.href=e.migrationStatus==="platform_live"?`tournament.html?event=${encodeURIComponent(e.id)}`:e.publicPath; });
  }

  function contextualFilterOptions(filters=state.filters){
    const b=state.bundle||{divisions:[],teams:[],games:[]};
    const divisions=(b.divisions||[]).filter(d=>(!filters.age||d.ageGroup===filters.age)&&(!filters.gender||d.gender===filters.gender));
    const divisionIds=new Set(divisions.map(d=>d.id));
    const teams=(b.teams||[]).filter(t=>(!filters.age||t.ageGroup===filters.age)&&(!filters.gender||t.gender===filters.gender)&&(!filters.division||t.divisionId===filters.division)&&(!filters.division||divisionIds.has(t.divisionId)));
    const games=(b.games||[]).filter(g=>(!filters.age||g.ageGroup===filters.age)&&(!filters.gender||g.gender===filters.gender)&&(!filters.division||g.divisionId===filters.division)&&(!filters.team||gameHasResolvedTeam(g,filters.team)));
    return {
      ages:unique((b.divisions||[]).map(d=>d.ageGroup)),
      genders:unique((b.divisions||[]).filter(d=>!filters.age||d.ageGroup===filters.age).map(d=>d.gender)),
      divisions,teams,
      dates:unique(games.map(g=>g.dateIso)),
      venues:unique(games.map(g=>g.venue)),
      statuses:unique(games.map(g=>g.status))
    };
  }

  function syncFilterOptions(){
    const b=state.bundle;if(!b)return;
    let options=contextualFilterOptions();
    const validGender=!state.filters.gender||options.genders.includes(state.filters.gender);if(!validGender)state.filters.gender="";
    options=contextualFilterOptions();
    const validDivision=!state.filters.division||options.divisions.some(d=>d.id===state.filters.division);if(!validDivision)state.filters.division="";
    options=contextualFilterOptions();
    const validTeam=!state.filters.team||options.teams.some(t=>t.participantId===state.filters.team);if(!validTeam)state.filters.team="";
    options=contextualFilterOptions();
    if(state.filters.date&&!options.dates.includes(state.filters.date))state.filters.date="";
    if(state.filters.venue&&!options.venues.includes(state.filters.venue))state.filters.venue="";
    if(state.filters.status&&!options.statuses.includes(state.filters.status))state.filters.status="";
    options=contextualFilterOptions();
    fillSelect("tpAge",options.ages,"All age groups");
    fillSelect("tpGender",options.genders,"All genders");
    fillSelect("tpDivision",options.divisions,"All divisions",d=>({value:d.id,label:d.label}));
    fillSelect("tpTeam",options.teams,"All teams",t=>({value:t.participantId,label:`${t.name} · ${t.divisionLabel}`}));
    fillSelect("tpDate",options.dates,"All dates",d=>({value:d,label:prettyDate(d)}));
    fillSelect("tpVenue",options.venues,"All venues");
    fillSelect("tpStatus",options.statuses.length?options.statuses:["final","scheduled"],"All game states",s=>({value:s,label:s==="final"?"Final":"Scheduled"}));
    const values={tpAge:"age",tpGender:"gender",tpDivision:"division",tpTeam:"team",tpDate:"date",tpVenue:"venue",tpStatus:"status"};
    Object.entries(values).forEach(([id,key])=>{const n=$(id);if(n)n.value=state.filters[key]||"";});
  }

  function populateFilters(){
    const b=state.bundle;
    const params=new URLSearchParams(location.search),requestedTeam=params.get("team"),pinnedTeam=readPinnedTeam();
    const initialTeam=requestedTeam&&b.teams.some(t=>t.participantId===requestedTeam)?requestedTeam:(!requestedTeam&&b.teams.some(t=>t.participantId===pinnedTeam)?pinnedTeam:"");
    if(initialTeam){
      state.filters.team=initialTeam;const t=b.teams.find(x=>x.participantId===initialTeam);
      if(t){state.filters.age=t.ageGroup||"";state.filters.gender=t.gender||"";state.filters.division=t.divisionId||"";}
    }
    syncFilterOptions();
    const bindings={tpAge:"age",tpGender:"gender",tpDivision:"division",tpTeam:"team",tpDate:"date",tpVenue:"venue",tpStatus:"status",tpSearch:"search"};
    Object.entries(bindings).forEach(([id,key])=>{ const n=$(id); if(!n)return; n.value=state.filters[key]||""; n.addEventListener(id==="tpSearch"?"input":"change",()=>{state.filters[key]=n.value;syncFilterOptions();render();}); });
    $("tpClear")?.addEventListener("click",()=>{Object.keys(state.filters).forEach(k=>state.filters[k]="");if($("tpSearch"))$("tpSearch").value="";syncFilterOptions();render();});
  }

  function renderHero(){
    const {event,summary,capabilities}=state.bundle;
    const active=event.operationsMode==="live_schedule"||event.status==="schedule_published"||event.status==="in_progress";
    document.title=`${event.name} | Water Polo HQ`;
    setText("tpKicker",active?`${event.season} tournament schedule`:`${event.season} tournament archive`);
    setText("tpTitle",event.name);
    setText("tpDescription",active?"Official-source schedule with JO-style team paths. Bracket codes are translated into actual candidate teams and resolve automatically when official results are available.":"Search verified games, teams and results from the Water Polo HQ tournament archive.");
    const scorePending=capabilities?.scoreSourceStatus==="pending_official_result_source";
    setText("tpEventStatus",active?(scorePending?"Schedule published · official score source pending":"Schedule published"):event.status);
    setText("tpDates",`${prettyDate(event.startDate)} – ${prettyDate(event.endDate)}`);
    setText("tpPolicy",event.sourcePolicy);
    const logo=$("tpEventLogo"); if(logo){logo.src=event.logo||FALLBACK_LOGO;logo.alt=`${event.shortName||event.name} logo`;}
    const source=$("tpOfficialSource"); if(source){source.href=event.officialSourceUrl||"#";source.hidden=!event.officialSourceUrl;source.textContent="Official schedule source →";}
    const metrics={tpDivisions:summary.divisionCount,tpGames:summary.gameCount,tpTeams:summary.teamCount,tpPlacements:summary.placementCount,tpVenues:summary.venueCount};
    Object.entries(metrics).forEach(([id,v])=>setText(id,Number(v).toLocaleString()));
    const placementsTab=document.querySelector('[data-view="placements"]'),placementsCard=$("tpPlacements")?.closest(".tp-summary-card"),hide=active&&Number(summary.placementCount||0)===0;
    if(placementsTab)placementsTab.hidden=hide;if(placementsCard)placementsCard.hidden=hide;if(hide&&state.view==="placements")state.view="games";
  }

  function routeMeta(game,side){ return game?.routing?.[side]||{}; }
  function routeCandidates(game,side){ const exact=resolvedParticipantId(game,side); if(exact)return [exact]; return [...new Set(routeMeta(game,side).candidateParticipantIds||[])]; }
  function participantFor(game,side){ const id=resolvedParticipantId(game,side); return id?teamById(id):null; }

  function outcomeParticipantId(game,kind,stack){
    if(!game||game.status!=="final")return null;
    const existing=kind==="winner"?game.outcome?.winnerParticipantId:game.outcome?.loserParticipantId;
    if(existing&&teamById(existing))return existing;
    const w=resolvedParticipantId(game,"white",stack),d=resolvedParticipantId(game,"dark",stack),ws=Number(game.scores?.white),ds=Number(game.scores?.dark);
    if(!w||!d||!Number.isFinite(ws)||!Number.isFinite(ds)||ws===ds)return null;
    const whiteWon=ws>ds; return kind==="winner"?(whiteWon?w:d):(whiteWon?d:w);
  }

  function groupRanking(divisionId,group,stack=new Set()){
    const key=`${divisionId}|${group}`; if(state.groupMemo.has(key))return state.groupMemo.get(key);
    if(stack.has(`group:${key}`))return null;
    const next=new Set(stack);next.add(`group:${key}`);
    const games=(state.bundle.games||[]).filter(g=>g.divisionId===divisionId&&routeMeta(g,"white").slotGroup===group&&routeMeta(g,"dark").slotGroup===group);
    if(!games.length||!games.every(g=>g.status==="final")){state.groupMemo.set(key,null);return null;}
    const table=new Map(),seed=new Map();
    for(const g of games){
      const w=resolvedParticipantId(g,"white",next),d=resolvedParticipantId(g,"dark",next),ws=Number(g.scores?.white),ds=Number(g.scores?.dark);
      if(!w||!d||!Number.isFinite(ws)||!Number.isFinite(ds)){state.groupMemo.set(key,null);return null;}
      for(const [pid,side] of [[w,"white"],[d,"dark"]]){if(!table.has(pid))table.set(pid,{pid,wins:0,gd:0,gf:0});const s=routeMeta(g,side).slotSeed;if(Number.isFinite(Number(s)))seed.set(pid,Math.min(seed.get(pid)??999,Number(s)));}
      table.get(w).gf+=ws;table.get(w).gd+=ws-ds;table.get(d).gf+=ds;table.get(d).gd+=ds-ws;if(ws>ds)table.get(w).wins++;else if(ds>ws)table.get(d).wins++;
    }
    const ranked=[...table.values()].sort((a,b)=>b.wins-a.wins||b.gd-a.gd||b.gf-a.gf||(seed.get(a.pid)??999)-(seed.get(b.pid)??999)||(teamById(a.pid)?.name||"").localeCompare(teamById(b.pid)?.name||"")).map(x=>x.pid);
    state.groupMemo.set(key,ranked);return ranked;
  }

  function resolvedParticipantId(game,side,stack=new Set()){
    if(!game)return null;
    const direct=game?.[side]?.participantId;if(direct)return direct;
    const memoKey=`${game.id}|${side}`;if(state.routeMemo.has(memoKey))return state.routeMemo.get(memoKey);
    if(stack.has(memoKey))return null;
    const next=new Set(stack);next.add(memoKey);const meta=routeMeta(game,side);let id=meta.resolvedParticipantId||null;
    if(!id&&(meta.kind==="game_result"||meta.kind==="matchup_result")){
      for(const sourceId of meta.sourceGameIds||[]){id=outcomeParticipantId(state.gameMap.get(sourceId),meta.outcome,next);if(id)break;}
    } else if(!id&&(meta.kind==="group_placement"||meta.kind==="slot_group_placement")){
      const ranked=groupRanking(game.divisionId,meta.sourceGroup,next);if(ranked&&meta.rank>0)id=ranked[meta.rank-1]||null;
    }
    state.routeMemo.set(memoKey,id||null);return id||null;
  }

  function routeLabel(game,side){ const meta=routeMeta(game,side); if(meta.publicLabel)return meta.publicLabel; return "Team TBD"; }
  function candidateNames(game,side,excludeId=null){ return routeCandidates(game,side).filter(id=>id!==excludeId).map(id=>teamById(id)?.name).filter(Boolean); }
  function publicGameNumber(game){ return game.routeNumber||String(game.gameNumber||"").replace(/^.*?(\d+)$/,"$1")||game.gameNumber||"Game"; }
  function gameIncludesTeam(game,id){
    if(!id)return true;
    for(const side of ["white","dark"]){const exact=resolvedParticipantId(game,side);if(exact){if(exact===id)return true;}else if((routeMeta(game,side).candidateParticipantIds||[]).includes(id))return true;}
    return false;
  }
  function gameHasResolvedTeam(game,id){
    if(!id)return true;
    return ["white","dark"].some(side=>resolvedParticipantId(game,side)===id);
  }

  function filteredGames(){
    const f=state.filters,q=f.search.trim().toLowerCase();
    return state.bundle.games.filter(g=>{
      if(f.age&&g.ageGroup!==f.age)return false;if(f.gender&&g.gender!==f.gender)return false;if(f.division&&g.divisionId!==f.division)return false;if(f.team&&(!gameHasResolvedTeam(g,f.team)||g.status==="final"))return false;if(f.date&&g.dateIso!==f.date)return false;if(f.venue&&g.venue!==f.venue)return false;if(f.status&&g.status!==f.status)return false;
      if(q){const names=[...candidateNames(g,"white"),...candidateNames(g,"dark")];const hay=[g.divisionLabel,g.dateLabel,g.timeLabel,g.venue,g.gameNumber,g.routeNumber,g.stage,...names,g.scores?.white,g.scores?.dark].join(" ").toLowerCase();if(!hay.includes(q))return false;}
      return true;
    }).sort(gameSort);
  }

  function resultFor(game,id){ if(game.status!=="final")return "pending";const winner=outcomeParticipantId(game,"winner",new Set()),loser=outcomeParticipantId(game,"loser",new Set());if(winner===id)return "win";if(loser===id)return "loss";return "tie"; }
  function scoreLabel(game){ if(game.status!=="final")return "Scheduled";const w=game.scores?.white,d=game.scores?.dark;let s=`${w??"—"}–${d??"—"}`;if(game.shootout?.white!=null&&game.shootout?.dark!=null)s+=` (SO ${game.shootout.white}–${game.shootout.dark})`;return s; }

  function routeCandidateHtml(game,side){
    const names=candidateNames(game,side),label=routeLabel(game,side);
    const visible=names.slice(0,6),more=Math.max(0,names.length-visible.length);
    return `<div class="tp-route-team"><span class="tp-route-label">${esc(label)}</span>${visible.length?`<span class="tp-route-candidates">${visible.map(esc).join(" <em>or</em> ")}${more?` <small>+${more} more</small>`:""}</span>`:"<span class=\"tp-route-candidates\">Team TBD</span>"}</div>`;
  }

  function sideHtml(game,side){
    const team=participantFor(game,side);const score=game.status==="final"?(game.scores?.[side]??"—"):"—";
    if(!team)return `<div class="tp-side tp-side--route">${routeCandidateHtml(game,side)}<span class="tp-score">${esc(score)}</span></div>`;
    const winner=outcomeParticipantId(game,"winner",new Set())===team.participantId?" winner":"";
    return `<div class="tp-side${winner}">${safeLogo(logoFor(team),team.name)}<button class="tp-team-button" type="button" data-team="${esc(team.participantId)}">${esc(team.name)}</button><span class="tp-score">${esc(score)}</span></div>`;
  }

  const VENUE_MAP_QUERIES={
    "ALISO NIGUEL HS":"Aliso Niguel High School, Aliso Viejo, CA",
    "BECKMAN HS":"Arnold O. Beckman High School, Irvine, CA",
    "EL MODENA HS":"El Modena High School, Orange, CA",
    "EL TORO HS 1":"El Toro High School, Lake Forest, CA",
    "EL TORO HS 2":"El Toro High School, Lake Forest, CA",
    "ESTANCIA HS 1":"Estancia High School, Costa Mesa, CA",
    "ESTANCIA HS 2":"Estancia High School, Costa Mesa, CA",
    "FOOTHILL HS":"Foothill High School, Tustin, CA",
    "LOS ALAMITOS HS":"Los Alamitos High School, Los Alamitos, CA",
    "SAN JUAN HILLS HS":"San Juan Hills High School, San Juan Capistrano, CA",
    "SERVITE HS":"Servite High School, Anaheim, CA",
    "TUSTIN HS 1":"Tustin High School, Tustin, CA",
    "TUSTIN HS 2":"Tustin High School, Tustin, CA",
    "WESTMINSTER HS":"Westminster High School, Westminster, CA",
    "WOOLLETT FAR LEFT":"William Woollett Jr. Aquatics Center, Irvine, CA",
    "WOOLLETT FAR RIGHT":"William Woollett Jr. Aquatics Center, Irvine, CA",
    "WOOLLETT NEAR LEFT":"William Woollett Jr. Aquatics Center, Irvine, CA",
    "WOOLLETT NEAR RIGHT":"William Woollett Jr. Aquatics Center, Irvine, CA"
  };
  function venueSearchQuery(venue){const label=String(venue||"").trim();return VENUE_MAP_QUERIES[label]||`${label.replace(/\s+[12]$/,'')}, Orange County, CA`;}
  function venueLinksHtml(venue){const label=String(venue||"").trim();if(!label)return "Venue TBD";const q=encodeURIComponent(venueSearchQuery(label));const google=`https://www.google.com/maps/dir/?api=1&destination=${q}&travelmode=driving`;const apple=`https://maps.apple.com/?daddr=${q}&dirflg=d`;const waze=`https://waze.com/ul?q=${q}&navigate=yes&utm_source=water_polo_hq`;return `<span class="tp-venue-row"><span class="tp-venue-name">${esc(label)}</span><span class="tp-map-links"><a href="${google}" target="_blank" rel="noopener">Google</a><a href="${apple}" target="_blank" rel="noopener">Apple</a><a href="${waze}" target="_blank" rel="noopener">Waze</a></span></span>`;}

  function renderGames(games){
    if(!games.length)return `<div class="tp-empty">No games match the current filters.</div>`;
    return `<div class="tp-games">${games.map(g=>`<article class="tp-game"><div class="tp-game-head"><strong>${esc(g.divisionLabel)} · Game ${esc(publicGameNumber(g))}</strong><span>${esc(prettyDate(g.dateIso))} · ${esc(g.timeLabel||"Time TBD")}</span></div><div class="tp-matchup"><div>${sideHtml(g,"white")}${sideHtml(g,"dark")}</div></div><div class="tp-game-footer"><strong>${esc(scoreLabel(g))}</strong><span>${esc(g.stage||"Tournament game")} · ${venueLinksHtml(g.venue)}</span></div></article>`).join("")}</div>`;
  }

  function teamsForGames(games){
    const ids=new Set();games.forEach(g=>{for(const side of ["white","dark"]){const exact=resolvedParticipantId(g,side);if(exact)ids.add(exact);else(routeMeta(g,side).candidateParticipantIds||[]).forEach(id=>ids.add(id));}});
    const q=state.filters.search.trim().toLowerCase();return state.bundle.teams.filter(t=>ids.has(t.participantId)&&(!q||[t.name,t.clubName,t.divisionLabel].join(" ").toLowerCase().includes(q)));
  }

  function renderTeams(games){ const teams=teamsForGames(games);if(!teams.length)return `<div class="tp-empty">No teams match the current filters.</div>`;return `<div class="tp-teams">${teams.map(t=>`<article class="tp-team-card" style="--team-primary:${esc(t.primaryColor)};--team-secondary:${esc(t.secondaryColor)}"><div class="tp-team-card-head">${safeLogo(logoFor(t),t.name)}<div><h3>${esc(t.name)}</h3><p>${esc(t.divisionLabel)}${t.clubName?` · ${esc(t.clubName)}`:""}</p></div></div><div class="tp-team-stats"><div class="tp-team-stat"><span>Record</span><strong>${esc(t.record.display)}</strong></div><div class="tp-team-stat"><span>Finish</span><strong>${esc(t.finishLabel||"Pending")}</strong></div><div class="tp-team-stat"><span>WPI rank</span><strong>${t.rank?`#${esc(t.rank)}`:"—"}</strong></div></div><div class="tp-team-actions"><button type="button" data-team="${esc(t.participantId)}">View journey →</button>${profileFor(t)?`<a href="${esc(profileFor(t))}">Profile →</a>`:""}</div></article>`).join("")}</div>`; }

  function renderPlacements(){
    const q=state.filters.search.trim().toLowerCase(),map=teamMap(),divisions=state.bundle.divisions.filter(d=>(!state.filters.age||d.ageGroup===state.filters.age)&&(!state.filters.gender||d.gender===state.filters.gender)&&(!state.filters.division||d.id===state.filters.division));
    const groups=divisions.map(d=>{let rows=(state.bundle.placements[d.id]||[]).filter(r=>!state.filters.team||r.participantId===state.filters.team);if(q)rows=rows.filter(r=>[r.name,r.clubName,d.label].join(" ").toLowerCase().includes(q));if(!rows.length)return "";return `<section class="tp-placement-group"><h3>${esc(d.label)}</h3>${rows.map(r=>{const t=map.get(r.participantId)||r,l=profileFor(t);return `<div class="tp-placement-row"><span class="tp-place">${esc(r.placeLabel||ordinal(r.place))}</span>${safeLogo(logoFor(t),r.name)}<span class="tp-placement-name">${esc(r.name)}</span>${l?`<a href="${esc(l)}">Profile →</a>`:""}</div>`;}).join("")}</section>`;}).filter(Boolean);
    return groups.length?`<div class="tp-placement-groups">${groups.join("")}</div>`:`<div class="tp-empty">Placements are not official yet.</div>`;
  }

  function sideForTeam(game,id){ for(const side of ["white","dark"]){const exact=resolvedParticipantId(game,side);if(exact===id)return {side,confirmed:true};if(!exact&&(routeMeta(game,side).candidateParticipantIds||[]).includes(id))return {side,confirmed:false};}return null; }
  function opponentText(game,teamId,side){ const other=side==="white"?"dark":"white",exact=participantFor(game,other);if(exact)return exact.name;const names=candidateNames(game,other,teamId);return names.length?names.join(" / "):routeLabel(game,other); }
  function routeCondition(game,side,confirmed){ const meta=routeMeta(game,side);if(meta.kind==="slot"&&game?.[side]?.participantId)return "Scheduled";const label=meta.publicLabel||"Bracket path";return confirmed?`Advanced via ${label}`:`Possible if ${label.toLowerCase()}`; }

  function immediateRouteTargets(game,teamId){
    if(!game)return {win:null,loss:null};
    const targets={win:[],loss:[]};
    for(const target of state.bundle.games||[]){
      if(target.divisionId!==game.divisionId)continue;
      for(const side of ["white","dark"]){
        const meta=routeMeta(target,side),sources=meta.sourceGameIds||[];
        if(!sources.includes(game.id)||!(meta.outcome==="winner"||meta.outcome==="loser"))continue;
        const candidates=meta.candidateParticipantIds||[];if(teamId&&!candidates.includes(teamId))continue;
        targets[meta.outcome==="winner"?"win":"loss"].push({game:target,side,meta});
      }
    }
    const first=list=>list.sort((a,b)=>gameSort(a.game,b.game))[0]||null;return {win:first(targets.win),loss:first(targets.loss)};
  }
  function routeScenarioCard(kind,item,teamId){if(!item)return "";const g=item.game,opp=opponentText(g,teamId,item.side),title=kind==="win"?"If they win":"If they lose";return `<article class="tp-scenario-card ${kind}"><span>${title}</span><strong>Game ${esc(publicGameNumber(g))} · ${esc(prettyDate(g.dateIso))} · ${esc(g.timeLabel||"Time TBD")}</strong><small>vs. ${esc(opp)} · ${venueLinksHtml(g.venue)}</small></article>`;}

  function renderJourney(){
    const mount=$("tpJourney"),id=state.filters.team;if(!mount)return;if(!id){mount.hidden=true;mount.innerHTML="";return;}const team=teamById(id);if(!team){mount.hidden=true;return;}
    const confirmed=state.bundle.games.map(g=>({game:g,match:sideForTeam(g,id)})).filter(x=>x.match?.confirmed).map(x=>({game:x.game,side:x.match.side})).sort((a,b)=>gameSort(a.game,b.game));
    const played=confirmed.filter(x=>x.game.status==="final"),wins=played.filter(x=>resultFor(x.game,id)==="win").length,losses=played.filter(x=>resultFor(x.game,id)==="loss").length;
    const upcoming=confirmed.filter(x=>x.game.status!=="final").slice(0,2);
    const routeAnchor=upcoming.length?upcoming[upcoming.length-1]:null;
    const scenarios=routeAnchor?immediateRouteTargets(routeAnchor.game,id):{win:null,loss:null};
    const scenarioHtml=[routeScenarioCard("win",scenarios.win,id),routeScenarioCard("loss",scenarios.loss,id)].filter(Boolean).join("");
    const links=[team.teamPage?`<a href="${esc(team.teamPage)}">Team profile →</a>`:"",team.clubPage?`<a href="${esc(team.clubPage)}">Club profile →</a>`:""].filter(Boolean).join("");
    const pinLabel=isPinnedTeam(id)?"★ Pinned for this tournament":"☆ Pin this team";
    const nextCards=upcoming.map(x=>{const g=x.game;return `<article class="tp-next-game-card"><div><span>Next scheduled game</span><strong>Game ${esc(publicGameNumber(g))} · ${esc(prettyDate(g.dateIso))} · ${esc(g.timeLabel||"Time TBD")}</strong><small>vs. ${esc(opponentText(g,id,x.side))}</small></div><small>${venueLinksHtml(g.venue)}</small></article>`;}).join("");
    mount.hidden=false;
    mount.innerHTML=`<div class="tp-journey-head"><div class="tp-journey-id">${safeLogo(logoFor(team),team.name).replace('<img ','<img class="tp-journey-logo" ')}<div><p class="tp-kicker">Team journey</p><h2>${esc(team.name)}</h2><p class="tp-journey-meta">${esc(team.divisionLabel)}${team.clubName?` · ${esc(team.clubName)}`:""}</p></div></div><div class="tp-record"><span>Tournament record</span><strong>${played.length?`${wins}-${losses}`:"0-0"}</strong></div></div><div class="tp-journey-links">${links}<button type="button" class="tp-pin-team" data-pin-team="${esc(id)}" aria-pressed="${isPinnedTeam(id)?"true":"false"}">${pinLabel}</button></div>${nextCards?`<div class="tp-next-games">${nextCards}</div>`:`<div class="tp-empty">No next game is confirmed yet. This will update automatically when the official schedule/results resolve the next matchup.</div>`}${scenarioHtml?`<h3 class="tp-path-heading">After the next game</h3><div class="tp-scenarios">${scenarioHtml}</div>`:""}`;
  }

  function bindDynamic(){document.querySelectorAll("[data-team]").forEach(n=>n.addEventListener("click",()=>{state.filters.team=n.dataset.team||"";const t=teamById(state.filters.team);if(t){state.filters.age=t.ageGroup||"";state.filters.gender=t.gender||"";state.filters.division=t.divisionId||"";}syncFilterOptions();render();$("tpJourney")?.scrollIntoView({behavior:"smooth",block:"start"});}));document.querySelectorAll("[data-pin-team]").forEach(n=>n.addEventListener("click",()=>{const id=n.dataset.pinTeam||"";writePinnedTeam(isPinnedTeam(id)?"":id);render();}));document.querySelectorAll("img[data-fallback-logo]").forEach(img=>img.addEventListener("error",()=>{if(!img.src.endsWith(FALLBACK_LOGO))img.src=FALLBACK_LOGO;},{once:true}));}
  function render(){resetDerived();syncFilterOptions();const games=filteredGames();renderJourney();let html="";if(state.view==="teams")html=renderTeams(games);else if(state.view==="placements")html=renderPlacements();else html=renderGames(games);$("tpContent").innerHTML=html;const label=state.view==="teams"?`${teamsForGames(games).length} teams`:state.view==="placements"?"Final placements":`${games.length} games`;setText("tpResultCount",label);document.querySelectorAll(".tp-tab").forEach(b=>b.classList.toggle("active",b.dataset.view===state.view));const jt=document.querySelector('[data-view="journey"]');if(jt)jt.disabled=!state.filters.team;bindDynamic();}
  function bindTabs(){document.querySelectorAll(".tp-tab").forEach(b=>b.addEventListener("click",()=>{if(b.dataset.view==="journey"){if(state.filters.team)$("tpJourney")?.scrollIntoView({behavior:"smooth",block:"start"});return;}state.view=b.dataset.view||"games";render();}));}

  async function init(){
    try{
      const eventId=eventIdFromLocation();state.registry=window.WPI_TOURNAMENT_PLATFORM_REGISTRY||await loadJson("data/tournaments/platform/registry.json");const event=state.registry.events.find(x=>x.id===eventId);if(!event)throw new Error("This tournament is not registered in the Water Polo HQ platform.");if(event.migrationStatus!=="platform_live"){location.replace(event.publicPath);return;}
      state.bundle=await loadJson(event.dataPath);resetDerived();renderHero();populateEventSelect();populateFilters();bindTabs();render();
      if(state.bundle?.capabilities?.liveRefresh){clearInterval(state.refreshTimer);state.refreshTimer=setInterval(async()=>{try{const updated=await loadJson(event.dataPath);if(updated?.event?.id===state.bundle?.event?.id){state.bundle=updated;resetDerived();renderHero();render();}}catch(error){console.warn("WPHQ tournament refresh",error);}},Math.max(60000,(Number(state.bundle.capabilities.refreshSeconds)||60)*1000));}
      $("tpLoading")?.remove();
    }catch(error){console.error(error);const c=$("tpContent");if(c)c.innerHTML=`<div class="tp-empty"><strong>Tournament data could not be loaded.</strong><br>${esc(error.message)}</div>`;setText("tpEventStatus","Data unavailable");}
  }
  document.addEventListener("DOMContentLoaded",init);
})();
