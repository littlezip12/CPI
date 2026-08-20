/* WPI 7.63.9 — Supporter Home & Unified Team Experience. */
(() => {
  "use strict";
  const RELEASE="7.63.9";
  const config=window.WPI_LIVE_SANDBOX_CONFIG||{};
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[ch]);
  const normalize=value=>String(value||"").trim().toLowerCase().replace(/\s+/g," ");
  let backend=null,session=null,directory={clubs:[],teams:[]},overview={teams:[],familyFollows:[],games:[],events:[]},feedFilter="all";

  const familyFollowSet=()=>new Set((overview.familyFollows||[]).map(row=>String(row.canonicalWpiTeamFamilyKey)));
  const memberFamilySet=()=>new Set((overview.teams||[]).filter(row=>row.isMember&&row.canonicalWpiTeamFamilyKey).map(row=>String(row.canonicalWpiTeamFamilyKey)));
  const liveByFamily=()=>new Map((overview.teams||[]).filter(row=>row.canonicalWpiTeamFamilyKey).map(row=>[String(row.canonicalWpiTeamFamilyKey),row]));
  const directoryByFamily=()=>new Map((directory.teams||[]).map(row=>[String(row.familyKey),row]));
  const clubById=()=>new Map((directory.clubs||[]).map(row=>[String(row.clubId),row]));
  const gameTime=g=>{const x=Date.parse(g?.scheduledAt||g?.startedAt||g?.endedAt||g?.updatedAt||0);return Number.isFinite(x)?x:0;};
  const scheduledTime=g=>{const x=Date.parse(g?.scheduledAt||0);return Number.isFinite(x)?x:0;};
  const gameStatus=g=>g?.status==="live"?"live":g?.status==="final"?"final":"upcoming";

  function dateLabel(value){if(!value)return"Time TBD";const d=new Date(value);return Number.isNaN(d.getTime())?"Time TBD":d.toLocaleString([],{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});}
  function shortDate(value){if(!value)return"TBD";const d=new Date(value);return Number.isNaN(d.getTime())?"TBD":d.toLocaleDateString([],{month:"short",day:"numeric"});}
  function teamDisplay(row){return [row.clubName,row.ageGroup,row.gender,row.squadDescriptor||row.level].filter(Boolean).join(" · ");}
  function logoFor(row){return row?.logo||row?.logoUrl||"assets/branding/wpi-logo-mark.png";}
  function directoryForFamily(key){return directoryByFamily().get(String(key||""))||null;}
  function teamHubHrefForGame(g){const live=(overview.teams||[]).find(t=>String(t.teamId)===String(g.teamId));const d=live?.canonicalWpiTeamFamilyKey?directoryForFamily(live.canonicalWpiTeamFamilyKey):null;return d?.teamHubHref||"";}

  async function loadDirectory(){
    const res=await fetch("data/live/organization-directory-v7-62-1.json?v=7.62.1",{cache:"no-store"});
    if(!res.ok)throw new Error("WPI organization directory could not load");
    const d=await res.json();
    directory={clubs:(d.organizations||[]).map(o=>({clubId:o.organizationId,name:o.name,logo:o.logo,organizationType:o.organizationType})),teams:(d.teams||[]).map(t=>({...t,clubId:t.organizationId,clubName:t.organizationName}))};
    renderDiscoveryFilters();
  }
  async function loadOverview(){
    const [{data,error},{data:eventData,error:eventError}]=await Promise.all([
      backend.client.rpc("live_following_overview_v2"),
      backend.client.rpc("live_following_event_summaries_v1")
    ]);
    if(error)throw error;if(eventError)throw eventError;
    overview={teams:Array.isArray(data?.teams)?data.teams:[],familyFollows:Array.isArray(data?.familyFollows)?data.familyFollows:[],games:Array.isArray(data?.games)?data.games:[],events:Array.isArray(eventData?.events)?eventData.events:[]};
    renderAll();
  }

  function renderDiscoveryFilters(){
    const clubs=[...(directory.clubs||[])].sort((a,b)=>String(a.name).localeCompare(String(b.name)));
    $("clubFilter").innerHTML='<option value="all">All organizations</option>'+clubs.map(c=>`<option value="${esc(c.clubId)}">${esc(c.name)}</option>`).join("");
    const ages=[...new Set((directory.teams||[]).map(t=>t.ageGroup).filter(Boolean))].sort((a,b)=>Number(String(a).replace(/\D/g,""))-Number(String(b).replace(/\D/g,"")));
    $("ageFilter").innerHTML='<option value="all">All ages</option>'+ages.map(a=>`<option>${esc(a)}</option>`).join("");
    $("directoryCount").textContent=`${(directory.teams||[]).length} teams`;
  }

  function myTeamRows(){
    const familyMap=directoryByFamily(),clubMap=clubById(),liveMap=liveByFamily(),rows=new Map();
    for(const t of (overview.teams||[]).filter(t=>t.isMember)){
      const key=t.canonicalWpiTeamFamilyKey?`family:${t.canonicalWpiTeamFamilyKey}`:`team:${t.teamId}`;
      const d=t.canonicalWpiTeamFamilyKey?familyMap.get(String(t.canonicalWpiTeamFamilyKey)):null;
      rows.set(key,{key,relationship:"member",familyKey:t.canonicalWpiTeamFamilyKey||"",label:`${t.clubDisplayName} · ${t.teamDisplayLabel}`,meta:[t.ageGroup,t.gender,t.squadLabel].filter(Boolean).join(" · "),logo:t.logoUrl,live:true,teamId:t.teamId,directoryTeam:d,season:t.competitiveSeason});
    }
    for(const f of (overview.familyFollows||[])){
      const key=`family:${f.canonicalWpiTeamFamilyKey}`;if(rows.has(key))continue;
      const d=familyMap.get(String(f.canonicalWpiTeamFamilyKey)),club=d?clubMap.get(String(d.clubId)):null,live=liveMap.get(String(f.canonicalWpiTeamFamilyKey));
      rows.set(key,{key,relationship:"following",familyKey:f.canonicalWpiTeamFamilyKey,label:d?`${d.clubName} · ${d.teamName}`:f.canonicalDisplayName,meta:d?[d.ageGroup,d.gender,d.squadDescriptor].filter(Boolean).join(" · "):[f.ageGroup,f.gender,f.squadLabel].filter(Boolean).join(" · "),logo:d?.logo||club?.logo,live:Boolean(live||f.liveAvailable),teamId:live?.teamId||f.liveTeamId||"",directoryTeam:d,season:live?.competitiveSeason||d?.season||""});
    }
    for(const t of (overview.teams||[]).filter(t=>t.isFollowing&&!t.canonicalWpiTeamFamilyKey)){
      const key=`team:${t.teamId}`;if(rows.has(key))continue;
      rows.set(key,{key,relationship:"following",familyKey:"",label:`${t.clubDisplayName} · ${t.teamDisplayLabel}`,meta:[t.ageGroup,t.gender,t.squadLabel].filter(Boolean).join(" · "),logo:t.logoUrl,live:true,teamId:t.teamId,direct:true,season:t.competitiveSeason});
    }
    return [...rows.values()];
  }
  function gamesFor(row){return row.teamId?(overview.games||[]).filter(g=>String(g.teamId)===String(row.teamId)):[];}
  function teamSnapshot(row){
    const games=gamesFor(row),now=Date.now();
    const live=games.filter(g=>g.status==="live").sort((a,b)=>gameTime(a)-gameTime(b))[0]||null;
    const upcoming=games.filter(g=>["setup","scheduled"].includes(g.status)).sort((a,b)=>gameTime(a)-gameTime(b))[0]||null;
    const finals=games.filter(g=>g.status==="final").sort((a,b)=>gameTime(b)-gameTime(a));
    const latest=finals[0]||null;
    const wins=finals.filter(g=>Number(g.teamScore)>Number(g.opponentScore)).length;
    const losses=finals.filter(g=>Number(g.teamScore)<Number(g.opponentScore)).length;
    const ties=finals.filter(g=>Number(g.teamScore)===Number(g.opponentScore)).length;
    const soon=upcoming&&gameTime(upcoming)>=now&&gameTime(upcoming)<=now+7*86400000;
    return {games,live,upcoming,latest,finals,wins,losses,ties,soon};
  }
  function gameHref(g){if(!g)return"";if(g.status==="live")return `live-game.html?game=${encodeURIComponent(g.id)}&team=${encodeURIComponent(g.teamId)}&follow=1`;if(g.status==="final")return `live-game-recap.html?game=${encodeURIComponent(g.id)}&team=${encodeURIComponent(g.teamId)}&follow=1`;return"";}
  function gameMini(g,label){
    if(!g)return `<div class="my-team-game is-empty"><small>${esc(label)}</small><strong>Nothing scheduled</strong><span>Check back when a game is added.</span></div>`;
    const status=gameStatus(g),score=status==="upcoming"?"vs":`${g.teamScore??0}–${g.opponentScore??0}`;
    return `<div class="my-team-game" data-state="${status}"><small>${esc(label)}</small><strong>${esc(status==="live"?`${score} · ${g.opponentName||"Opponent"}`:status==="final"?`${score} vs ${g.opponentName||"Opponent"}`:`${shortDate(g.scheduledAt)} · ${g.opponentName||"Opponent"}`)}</strong><span>${esc(status==="live"?"Live now":dateLabel(g.scheduledAt))}</span>${gameHref(g)?`<a href="${gameHref(g)}">${status==="live"?"Follow live":"View recap"} →</a>`:""}</div>`;
  }

  function renderHomeSummary(rows){
    const ids=new Set(rows.map(r=>String(r.teamId||"")).filter(Boolean)),games=(overview.games||[]).filter(g=>ids.has(String(g.teamId))),now=Date.now();
    const live=games.filter(g=>g.status==="live").length;
    const upcoming=games.filter(g=>["setup","scheduled"].includes(g.status)&&scheduledTime(g)>=now&&scheduledTime(g)<=now+7*86400000).length;
    const finals=games.filter(g=>g.status==="final").length;
    $("supporterTeamStat").textContent=rows.length;
    $("supporterLiveStat").textContent=live;
    $("supporterUpcomingStat").textContent=upcoming;
    $("supporterFinalStat").textContent=finals;
    $("supporterLiveStatCard").dataset.active=live?"true":"false";
  }

  function renderMyTeams(){
    const rows=myTeamRows();renderHomeSummary(rows);
    $("myTeamsCount").textContent=`${rows.length} team${rows.length===1?"":"s"}`;
    $("myTeams").innerHTML=rows.length?rows.map(r=>{
      const s=teamSnapshot(r),hub=r.directoryTeam?.teamHubHref||"",record=s.finals.length?`${s.wins}-${s.losses}${s.ties?`-${s.ties}`:""}`:"—",primary=s.live||s.upcoming||s.latest;
      return `<article class="my-team my-team--dashboard${s.live?" is-live":""}">
        <header><img src="${esc(logoFor(r))}" alt=""><div><strong>${esc(r.label)}</strong><small>${esc(r.meta||"WPI team")}</small></div><span class="follow-pill" data-state="${esc(r.relationship)}">${r.relationship==="member"?"Member":"Following"}</span></header>
        <div class="my-team-snapshot">
          <div><small>Recent record</small><strong>${esc(record)}</strong><span>${s.finals.length?`${s.finals.length} visible final${s.finals.length===1?"":"s"}`:"No finals yet"}</span></div>
          ${gameMini(s.live||s.upcoming,s.live?"Live now":"Next game")}
          ${gameMini(s.latest,"Latest result")}
        </div>
        <footer><span class="follow-card-actions">${hub?`<a class="follow-team-open" href="${esc(hub)}">Team page</a>`:""}${r.teamId?`<a class="follow-team-open follow-team-insights" href="live-team-insights.html?team=${encodeURIComponent(r.teamId)}">Team Insights</a>`:""}${r.relationship==="following"?`<button type="button" data-unfollow-family="${esc(r.familyKey||"")}" data-unfollow-team="${esc(r.direct?r.teamId:"")}">Unfollow</button>`:""}</span>${primary&&!gameHref(primary)&&hub?`<a class="my-team-next-link" href="${esc(hub)}">View team →</a>`:""}</footer>
      </article>`;
    }).join(""):'<div class="follow-empty follow-empty--action"><strong>No teams followed yet.</strong><span>Find your club, school, age group and team to build your WPI home.</span><a href="#findWpiTeam">Find a team</a></div>';
  }

  function renderDirectory(){
    const q=normalize($("teamSearch")?.value),club=$("clubFilter")?.value||"all",age=$("ageFilter")?.value||"all",gender=$("genderFilter")?.value||"all",orgType=$("organizationTypeFilter")?.value||"all";
    const followed=familyFollowSet(),members=memberFamilySet(),liveMap=liveByFamily();
    const filtered=(directory.teams||[]).filter(t=>{const text=normalize([t.clubName,t.teamName,t.ageGroup,t.gender,t.squadDescriptor,...(t.aliases||[])].join(" "));return (!q||text.includes(q))&&(club==="all"||t.clubId===club)&&(age==="all"||t.ageGroup===age)&&(gender==="all"||t.gender===gender)&&(orgType==="all"||t.organizationType===orgType);});
    const hasFilter=Boolean(q||club!=="all"||age!=="all"||gender!=="all"||orgType!=="all"),rows=filtered.slice(0,hasFilter?60:18);
    $("directoryResults").innerHTML=rows.length?rows.map(t=>{const isFollowed=followed.has(String(t.familyKey)),live=liveMap.get(String(t.familyKey)),isMember=members.has(String(t.familyKey));return `<article class="directory-team"><header><img src="${esc(logoFor(t))}" alt=""><div><strong>${esc(t.clubName)} · ${esc(t.teamName)}</strong><small>${esc([t.ageGroup,t.gender,t.squadDescriptor].filter(Boolean).join(" · "))}</small></div></header><footer><span class="follow-pill" data-state="${live?"member":"waiting"}">${live?"WPI Live":"Directory team"}</span><span class="follow-card-actions"><a class="follow-team-open" href="${esc(t.teamHubHref)}">Team page</a>${isMember?`<button type="button" disabled>Member</button>`:`<button type="button" data-family-follow="${esc(t.familyKey)}" data-following="${isFollowed}" aria-pressed="${isFollowed}">${isFollowed?"Following":"Follow"}</button>`}</span></footer></article>`;}).join(""):'<p class="follow-empty">No WPI teams match those filters.</p>';
    $("directoryResultNote").textContent=!hasFilter&&filtered.length>rows.length?`Showing ${rows.length} of ${filtered.length}. Search or filter to narrow the directory.`:`${filtered.length} match${filtered.length===1?"":"es"}`;
  }

  function relationshipTeams(){const rows=[];for(const t of overview.teams||[])if(t.isMember||t.isFollowing)rows.push({id:String(t.teamId),label:`${t.clubDisplayName} · ${t.teamDisplayLabel}`});return [...new Map(rows.map(r=>[r.id,r])).values()];}
  function renderFeedFilters(){const teams=relationshipTeams(),el=$("feedTeamFilters");el.hidden=teams.length<2;if(el.hidden){feedFilter="all";return;}if(feedFilter!=="all"&&!teams.some(t=>t.id===feedFilter))feedFilter="all";el.innerHTML=`<button type="button" data-feed-team="all" aria-pressed="${feedFilter==="all"}">All teams</button>`+teams.map(t=>`<button type="button" data-feed-team="${esc(t.id)}" aria-pressed="${feedFilter===t.id}">${esc(t.label)}</button>`).join("");}
  function feedCard(g){
    const live=g.status==="live",final=g.status==="final",score=(live||final)?`<strong class="feed-score">${esc(g.teamScore??0)}–${esc(g.opponentScore??0)}</strong>`:'<strong class="feed-score">vs</strong>',hub=teamHubHrefForGame(g);
    const action=live?`<a href="live-game.html?game=${encodeURIComponent(g.id)}&team=${encodeURIComponent(g.teamId)}&follow=1">Follow live →</a>`:final?`<a href="live-game-recap.html?game=${encodeURIComponent(g.id)}&team=${encodeURIComponent(g.teamId)}&follow=1">View recap + stats →</a>`:hub?`<a href="${esc(hub)}">Open team →</a>`:'<span></span>';
    return `<article class="feed-card"><div class="feed-context"><strong>${esc(g.clubDisplayName)} · ${esc(g.teamDisplayLabel)}</strong><span class="feed-status" data-state="${esc(g.status)}">${esc(live?"Live":final?"Final":"Upcoming")}</span></div><div class="feed-matchup"><div class="feed-team">${esc(g.teamDisplayLabel||g.teamName)}</div>${score}<div class="feed-team">${esc(g.opponentName||"Opponent")}</div></div><div class="feed-meta"><span>${esc(dateLabel(g.scheduledAt))}</span>${g.venue?`<span>${esc(g.venue)}</span>`:""}${g.seriesName||g.tournamentName?`<span>${esc(g.seriesName||g.tournamentName)}</span>`:""}</div><div class="feed-actions">${action}</div></article>`;
  }
  function renderFeed(){renderFeedFilters();const all=(overview.games||[]).filter(g=>g.status!=="cancelled"&&(feedFilter==="all"||String(g.teamId)===feedFilter));const groups=[{title:"Live now",rows:all.filter(g=>g.status==="live").sort((a,b)=>gameTime(a)-gameTime(b))},{title:"Upcoming",rows:all.filter(g=>["setup","scheduled"].includes(g.status)).sort((a,b)=>gameTime(a)-gameTime(b))},{title:"Recent finals",rows:all.filter(g=>g.status==="final").sort((a,b)=>gameTime(b)-gameTime(a)).slice(0,30)}].filter(g=>g.rows.length);$("gameFeed").innerHTML=groups.length?groups.map(g=>`<section class="feed-group"><div class="feed-group-heading"><strong>${esc(g.title)}</strong><span>${g.rows.length}</span></div><div class="feed-list">${g.rows.map(feedCard).join("")}</div></section>`).join(""):'<div class="follow-empty follow-empty--action"><strong>No Live games yet for My Teams.</strong><span>Your follows are saved. Upcoming and completed games will appear here as teams use WPI Live.</span><a href="#findWpiTeam">Find another team</a></div>';}
  function renderEvents(){const rows=(overview.events||[]).slice(0,18);$("eventSummary").innerHTML=rows.length?rows.map(r=>{const record=`${r.wins||0}-${r.losses||0}${r.ties?`-${r.ties}`:""}`,diff=Number(r.goalsFor||0)-Number(r.goalsAgainst||0);return `<article class="event-card"><strong>${esc(r.seriesName||"Tournament / Weekend")}</strong><small>${esc(r.organizationName||"")} · ${esc(r.teamDisplayLabel||r.teamName||"")} · ${esc(r.games||0)} final${Number(r.games||0)===1?"":"s"}</small><div class="event-record">${record}</div><small>${esc(r.goalsFor||0)} GF · ${esc(r.goalsAgainst||0)} GA · ${diff>0?"+":""}${esc(diff)}</small><div class="event-card-actions"><a class="event-details-link" href="live-event-recap.html?team=${encodeURIComponent(r.teamId)}&series=${encodeURIComponent(r.seriesId)}">Event results</a><a class="event-details-link" href="live-team-insights.html?team=${encodeURIComponent(r.teamId)}">Team Insights</a></div></article>`;}).join(""):'<p class="follow-empty">Tournament and weekend results will appear after My Teams complete grouped WPI Live games.</p>';}
  function renderAll(){renderMyTeams();renderFeed();renderEvents();renderDirectory();}

  async function toggleFamily(familyKey,next){const team=(directory.teams||[]).find(t=>String(t.familyKey)===String(familyKey));if(!team)return;$("followingMessage").textContent=next?"Following team…":"Removing follow…";try{await backend.setPublicTeamFamilyFollow({...team,displayName:teamDisplay(team)},next);await loadOverview();$("followingMessage").textContent=next?"Team followed. It is now part of My Teams and your read-only game feed.":"Team removed from My Teams.";}catch(e){$("followingMessage").textContent=e.message||"Following could not be updated.";}}
  async function unfollow(familyKey,teamId){try{if(familyKey){const row=(directory.teams||[]).find(t=>String(t.familyKey)===String(familyKey))||{familyKey,clubId:String(familyKey).split("|")[0],displayName:"WPI team"};await backend.setPublicTeamFamilyFollow(row,false);}else if(teamId){await backend.setTeamFollow(teamId,false);}await loadOverview();}catch(e){$("followingMessage").textContent=e.message||"Following could not be updated.";}}
  async function signOut(){if(backend)await backend.signOut();window.location.assign("live-login.html?follow=1");}
  function resetFilters(){for(const id of ["organizationTypeFilter","clubFilter","ageFilter","genderFilter"])if($(id))$(id).value="all";if($("teamSearch"))$("teamSearch").value="";renderDirectory();$("teamSearch")?.focus();}

  async function init(){document.body.dataset.liveSupporterHubRelease=RELEASE;try{await loadDirectory();if(!window.WPILiveBackend?.isConfigured(config))throw new Error("WPI Live is not configured on this deployment.");backend=await window.WPILiveBackend.connect(config);session=await backend.session();if(!session||backend.isAnonymousUser(session.user)){if(session)await backend.signOut();$("followSignedOut").hidden=false;return;}$("followConnected").hidden=false;await loadOverview();}catch(e){$("followSignedOut").hidden=false;$("followSignedOut").querySelector("h2").textContent="Supporter Hub could not connect";$("followSignedOut").querySelector("p").textContent=e.message||"Connection failed.";}}
  ["teamSearch","organizationTypeFilter","clubFilter","ageFilter","genderFilter"].forEach(id=>$(id)?.addEventListener(id==="teamSearch"?"input":"change",renderDirectory));
  $("directoryResults")?.addEventListener("click",e=>{const b=e.target.closest("[data-family-follow]");if(b)toggleFamily(b.dataset.familyFollow,b.dataset.following!=="true");});
  $("myTeams")?.addEventListener("click",e=>{const b=e.target.closest("[data-unfollow-family],[data-unfollow-team]");if(b)unfollow(b.dataset.unfollowFamily,b.dataset.unfollowTeam);});
  $("feedTeamFilters")?.addEventListener("click",e=>{const b=e.target.closest("[data-feed-team]");if(b){feedFilter=b.dataset.feedTeam;renderFeed();}});
  $("refreshFollowing")?.addEventListener("click",()=>loadOverview().catch(e=>{$("followingMessage").textContent=e.message;}));
  $("resetTeamFilters")?.addEventListener("click",resetFilters);
  $("followSignOut")?.addEventListener("click",signOut);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
