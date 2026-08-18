/* WPI 7.63.6 — Supporter Hub event-result bridge + weekend sponsorship inventory. */
(() => {
  "use strict";
  const RELEASE="7.63.6";
  const config=window.WPI_LIVE_SANDBOX_CONFIG||{};
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[ch]);
  const normalize=value=>String(value||"").trim().toLowerCase().replace(/\s+/g," ");
  let backend=null,session=null,directory={clubs:[],teams:[]},overview={teams:[],familyFollows:[],games:[],events:[]},feedFilter="all";

  const familyFollowSet=()=>new Set((overview.familyFollows||[]).map(row=>String(row.canonicalWpiTeamFamilyKey)));
  const directFollowTeamIds=()=>new Set((overview.teams||[]).filter(row=>row.isFollowing).map(row=>String(row.teamId)));
  const memberTeamIds=()=>new Set((overview.teams||[]).filter(row=>row.isMember).map(row=>String(row.teamId)));
  const memberFamilySet=()=>new Set((overview.teams||[]).filter(row=>row.isMember&&row.canonicalWpiTeamFamilyKey).map(row=>String(row.canonicalWpiTeamFamilyKey)));
  const liveByFamily=()=>new Map((overview.teams||[]).filter(row=>row.canonicalWpiTeamFamilyKey).map(row=>[String(row.canonicalWpiTeamFamilyKey),row]));
  const directoryByFamily=()=>new Map((directory.teams||[]).map(row=>[String(row.familyKey),row]));
  const clubById=()=>new Map((directory.clubs||[]).map(row=>[String(row.clubId),row]));

  function dateLabel(value){if(!value)return"Time TBD";const d=new Date(value);return Number.isNaN(d.getTime())?"Time TBD":d.toLocaleString([],{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});}
  function teamDisplay(row){return [row.clubName,row.ageGroup,row.gender,row.squadDescriptor||row.level].filter(Boolean).join(" · ");}
  function logoFor(row){return row?.logo||"assets/branding/wpi-logo-mark.png";}

  async function loadDirectory(){const res=await fetch("data/live/organization-directory-v7-62-1.json?v=7.62.1",{cache:"no-store"});if(!res.ok)throw new Error("WPI organization directory could not load");const d=await res.json();directory={clubs:(d.organizations||[]).map(o=>({clubId:o.organizationId,name:o.name,logo:o.logo,organizationType:o.organizationType})),teams:(d.teams||[]).map(t=>({...t,clubId:t.organizationId,clubName:t.organizationName}))};renderDiscoveryFilters();}
  async function loadOverview(){const [{data,error},{data:eventData,error:eventError}]=await Promise.all([backend.client.rpc("live_following_overview_v2"),backend.client.rpc("live_following_event_summaries_v1")]);if(error)throw error;if(eventError)throw eventError;overview={teams:Array.isArray(data?.teams)?data.teams:[],familyFollows:Array.isArray(data?.familyFollows)?data.familyFollows:[],games:Array.isArray(data?.games)?data.games:[],events:Array.isArray(eventData?.events)?eventData.events:[]};renderAll();}

  function renderDiscoveryFilters(){
    const clubs=[...(directory.clubs||[])].sort((a,b)=>String(a.name).localeCompare(String(b.name)));
    $("clubFilter").innerHTML='<option value="all">All organizations</option>'+clubs.map(c=>`<option value="${esc(c.clubId)}">${esc(c.name)}</option>`).join("");
    const ages=[...new Set((directory.teams||[]).map(t=>t.ageGroup).filter(Boolean))].sort((a,b)=>Number(String(a).replace(/\D/g,""))-Number(String(b).replace(/\D/g,"")));
    $("ageFilter").innerHTML='<option value="all">All ages</option>'+ages.map(a=>`<option>${esc(a)}</option>`).join("");
    $("directoryCount").textContent=`${(directory.teams||[]).length} teams`;
  }

  function renderMyTeams(){
    const familyMap=directoryByFamily(), clubMap=clubById(), liveMap=liveByFamily();
    const rows=[];
    for(const t of (overview.teams||[]).filter(t=>t.isMember)) rows.push({key:`member:${t.teamId}`,relationship:"member",familyKey:t.canonicalWpiTeamFamilyKey||"",label:`${t.clubDisplayName} · ${t.teamDisplayLabel}`,meta:[t.ageGroup,t.gender,t.squadLabel].filter(Boolean).join(" · "),logo:t.logoUrl,live:true,teamId:t.teamId});
    for(const f of (overview.familyFollows||[])){
      const d=familyMap.get(String(f.canonicalWpiTeamFamilyKey)); const club=d?clubMap.get(String(d.clubId)):null; const live=liveMap.get(String(f.canonicalWpiTeamFamilyKey));
      rows.push({key:`follow:${f.canonicalWpiTeamFamilyKey}`,relationship:"following",familyKey:f.canonicalWpiTeamFamilyKey,label:d?`${d.clubName} · ${d.teamName}`:f.canonicalDisplayName,meta:d?[d.ageGroup,d.gender,d.squadDescriptor].filter(Boolean).join(" · "):[f.ageGroup,f.gender,f.squadLabel].filter(Boolean).join(" · "),logo:d?.logo||club?.logo,live:Boolean(live||f.liveAvailable),teamId:live?.teamId,family:d||f});
    }
    // Include legacy direct follows that are not yet family-linked.
    for(const t of (overview.teams||[]).filter(t=>t.isFollowing && !t.canonicalWpiTeamFamilyKey)) rows.push({key:`direct:${t.teamId}`,relationship:"following",label:`${t.clubDisplayName} · ${t.teamDisplayLabel}`,meta:[t.ageGroup,t.gender,t.squadLabel].filter(Boolean).join(" · "),logo:t.logoUrl,live:true,teamId:t.teamId,direct:true});
    const uniq=[...new Map(rows.map(r=>[r.key,r])).values()];
    $("myTeamsCount").textContent=`${uniq.length} team${uniq.length===1?"":"s"}`;
    $("myTeams").innerHTML=uniq.length?uniq.map(r=>{const d=r.familyKey?familyMap.get(String(r.familyKey)):null;const open=d?.teamHubHref?`<a class="follow-team-open" href="${esc(d.teamHubHref)}">Open</a>`:"";return `<article class="my-team"><header><img src="${esc(logoFor(r))}" alt=""><div><strong>${esc(r.label)}</strong><small>${esc(r.meta||"WPI team")}</small></div></header><footer><span class="follow-pill" data-state="${esc(r.relationship)}">${r.relationship==="member"?"Member":r.live?"Following · Live":"Following · No Live feed yet"}</span><span class="follow-card-actions">${open}${r.relationship==="following"?`<button type="button" data-unfollow-family="${esc(r.familyKey||"")}" data-unfollow-team="${esc(r.direct?r.teamId:"")}">Unfollow</button>`:""}</span></footer></article>`;}).join(""):'<p class="follow-empty">No teams yet. Use Find a WPI team below.</p>';
  }

  function renderDirectory(){
    const q=normalize($("teamSearch")?.value),club=$("clubFilter")?.value||"all",age=$("ageFilter")?.value||"all",gender=$("genderFilter")?.value||"all",orgType=$("organizationTypeFilter")?.value||"all";
    const followed=familyFollowSet(),members=memberFamilySet(),liveMap=liveByFamily();
    const rows=(directory.teams||[]).filter(t=>{
      const text=normalize([t.clubName,t.teamName,t.ageGroup,t.gender,t.squadDescriptor,...(t.aliases||[])].join(" "));
      return (!q||text.includes(q))&&(club==="all"||t.clubId===club)&&(age==="all"||t.ageGroup===age)&&(gender==="all"||t.gender===gender)&&(orgType==="all"||t.organizationType===orgType);
    }).slice(0,q||club!=="all"||age!=="all"||gender!=="all"||orgType!=="all"?80:30);
    $("directoryResults").innerHTML=rows.length?rows.map(t=>{const isFollowed=followed.has(String(t.familyKey)),live=liveMap.get(String(t.familyKey));const isMember=members.has(String(t.familyKey));return `<article class="directory-team"><header><img src="${esc(logoFor(t))}" alt=""><div><strong>${esc(t.clubName)} · ${esc(t.teamName)}</strong><small>${esc([t.ageGroup,t.gender,t.squadDescriptor].filter(Boolean).join(" · "))}</small></div></header><footer><span class="follow-pill" data-state="${live?"member":"waiting"}">${live?"WPI Live":"Directory team"}</span><span class="follow-card-actions"><a class="follow-team-open" href="${esc(t.teamHubHref)}">Open</a>${isMember?`<button type="button" disabled>Member</button>`:`<button type="button" data-family-follow="${esc(t.familyKey)}" data-following="${isFollowed}" aria-pressed="${isFollowed}">${isFollowed?"Following":"Follow"}</button>`}</span></footer></article>`;}).join(""):'<p class="follow-empty">No WPI teams match those filters.</p>';
  }

  function relationshipTeams(){
    const rows=[];for(const t of overview.teams||[])if(t.isMember||t.isFollowing)rows.push({id:String(t.teamId),label:`${t.clubDisplayName} · ${t.teamDisplayLabel}`});
    return [...new Map(rows.map(r=>[r.id,r])).values()];
  }
  function renderFeedFilters(){const teams=relationshipTeams();const el=$("feedTeamFilters");el.hidden=teams.length<2;if(el.hidden){feedFilter="all";return;}if(feedFilter!=="all"&&!teams.some(t=>t.id===feedFilter))feedFilter="all";el.innerHTML=`<button type="button" data-feed-team="all" aria-pressed="${feedFilter==="all"}">All teams</button>`+teams.map(t=>`<button type="button" data-feed-team="${esc(t.id)}" aria-pressed="${feedFilter===t.id}">${esc(t.label)}</button>`).join("");}
  function gameTime(g){const x=Date.parse(g.scheduledAt||g.startedAt||g.endedAt||g.updatedAt||0);return Number.isFinite(x)?x:0;}
  function feedCard(g){const live=g.status==="live",final=g.status==="final",score=(live||final)?`<strong class="feed-score">${esc(g.teamScore??0)}–${esc(g.opponentScore??0)}</strong>`:'<strong class="feed-score">vs</strong>';const action=live?`<a href="live-game.html?game=${encodeURIComponent(g.id)}&team=${encodeURIComponent(g.teamId)}&follow=1">Follow live →</a>`:final?`<a href="live-game-recap.html?game=${encodeURIComponent(g.id)}&team=${encodeURIComponent(g.teamId)}&follow=1">View recap + stats →</a>`:'<span></span>';return `<article class="feed-card"><div class="feed-context"><strong>${esc(g.clubDisplayName)} · ${esc(g.teamDisplayLabel)}</strong><span class="feed-status" data-state="${esc(g.status)}">${esc(live?"Live":final?"Final":"Upcoming")}</span></div><div class="feed-matchup"><div class="feed-team">${esc(g.teamDisplayLabel||g.teamName)}</div>${score}<div class="feed-team">${esc(g.opponentName||"Opponent")}</div></div><div class="feed-meta"><span>${esc(dateLabel(g.scheduledAt))}</span>${g.venue?`<span>${esc(g.venue)}</span>`:""}${g.seriesName||g.tournamentName?`<span>${esc(g.seriesName||g.tournamentName)}</span>`:""}</div><div class="feed-actions">${action}</div></article>`;}
  function renderFeed(){renderFeedFilters();const all=(overview.games||[]).filter(g=>g.status!=="cancelled"&&(feedFilter==="all"||String(g.teamId)===feedFilter));const groups=[{title:"Live now",rows:all.filter(g=>g.status==="live").sort((a,b)=>gameTime(a)-gameTime(b))},{title:"Upcoming",rows:all.filter(g=>["setup","scheduled"].includes(g.status)).sort((a,b)=>gameTime(a)-gameTime(b))},{title:"Recent finals",rows:all.filter(g=>g.status==="final").sort((a,b)=>gameTime(b)-gameTime(a)).slice(0,30)}].filter(g=>g.rows.length);$("gameFeed").innerHTML=groups.length?groups.map(g=>`<section class="feed-group"><div class="feed-group-heading"><strong>${esc(g.title)}</strong><span>${g.rows.length}</span></div><div class="feed-list">${g.rows.map(feedCard).join("")}</div></section>`).join(""):'<p class="follow-empty">No Live games yet for My Teams. Directory follows stay saved and will begin showing games when that team is connected to WPI Live.</p>';}
  function renderEvents(){const rows=(overview.events||[]).slice(0,18);$("eventSummary").innerHTML=rows.length?rows.map(r=>{const record=`${r.wins||0}-${r.losses||0}${r.ties?`-${r.ties}`:""}`;const diff=Number(r.goalsFor||0)-Number(r.goalsAgainst||0);return `<article class="event-card"><strong>${esc(r.seriesName||"Tournament / Weekend")}</strong><small>${esc(r.organizationName||"")} · ${esc(r.teamDisplayLabel||r.teamName||"")} · ${esc(r.games||0)} final${Number(r.games||0)===1?"":"s"}</small><div class="event-record">${record}</div><small>${esc(r.goalsFor||0)} GF · ${esc(r.goalsAgainst||0)} GA · ${diff>0?"+":""}${esc(diff)}</small><a class="event-details-link" href="live-event-recap.html?team=${encodeURIComponent(r.teamId)}&series=${encodeURIComponent(r.seriesId)}">View event results →</a></article>`;}).join(""):'<p class="follow-empty">Event history will appear when followed Live teams complete tournament or weekend games.</p>';}

  function renderAll(){renderMyTeams();renderDirectory();renderFeed();renderEvents();}

  async function toggleFamily(familyKey,next){const team=(directory.teams||[]).find(t=>String(t.familyKey)===String(familyKey));if(!team)return;$("followingMessage").textContent=next?"Following team…":"Removing follow…";try{await backend.setPublicTeamFamilyFollow({...team,displayName:teamDisplay(team)},next);await loadOverview();$("followingMessage").textContent=next?"Team followed. Read only—no membership or scoring access was added.":"Team removed from My Teams.";}catch(e){$("followingMessage").textContent=e.message||"Following could not be updated.";}}
  async function unfollow(familyKey,teamId){try{if(familyKey){const row=(directory.teams||[]).find(t=>String(t.familyKey)===String(familyKey))||{familyKey,clubId:String(familyKey).split("|")[0],displayName:"WPI team"};await backend.setPublicTeamFamilyFollow(row,false);}else if(teamId){await backend.setTeamFollow(teamId,false);}await loadOverview();}catch(e){$("followingMessage").textContent=e.message||"Following could not be updated.";}}
  async function signOut(){if(backend)await backend.signOut();window.location.assign("live-login.html?follow=1");}

  async function init(){document.body.dataset.liveSupporterHubRelease=RELEASE;try{await loadDirectory();if(!window.WPILiveBackend?.isConfigured(config)){throw new Error("WPI Live is not configured on this deployment.");}backend=await window.WPILiveBackend.connect(config);session=await backend.session();if(!session||backend.isAnonymousUser(session.user)){if(session)await backend.signOut();$("followSignedOut").hidden=false;return;}$("followConnected").hidden=false;await loadOverview();}catch(e){$("followSignedOut").hidden=false;$("followSignedOut").querySelector("h2").textContent="Supporter Hub could not connect";$("followSignedOut").querySelector("p").textContent=e.message||"Connection failed.";}}
  ["teamSearch","organizationTypeFilter","clubFilter","ageFilter","genderFilter"].forEach(id=>$(id)?.addEventListener(id==="teamSearch"?"input":"change",renderDirectory));
  $("directoryResults")?.addEventListener("click",e=>{const b=e.target.closest("[data-family-follow]");if(b)toggleFamily(b.dataset.familyFollow,b.dataset.following!=="true");});
  $("myTeams")?.addEventListener("click",e=>{const b=e.target.closest("[data-unfollow-family],[data-unfollow-team]");if(b)unfollow(b.dataset.unfollowFamily,b.dataset.unfollowTeam);});
  $("feedTeamFilters")?.addEventListener("click",e=>{const b=e.target.closest("[data-feed-team]");if(b){feedFilter=b.dataset.feedTeam;renderFeed();}});
  $("refreshFollowing")?.addEventListener("click",()=>loadOverview().catch(e=>{$("followingMessage").textContent=e.message;}));
  $("followSignOut")?.addEventListener("click",signOut);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
