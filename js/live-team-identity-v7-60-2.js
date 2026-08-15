/* WPI 7.60.2 — Team Directory & Identity Management
 * Explicit stable team-family links + club-scoped aliases + unlisted-opponent reconciliation.
 * Public WPI team IDs remain season-specific; no prior-season exact team identity is inferred.
 */
(() => {
  "use strict";
  const RELEASE="7.60.2";
  const config=window.WPI_LIVE_SANDBOX_CONFIG||{};
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[ch]);
  const norm=value=>String(value||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  let backend=null,session=null;
  let clubs=[];
  let directory={clubs:[],teams:[],counts:{clubs:0,teams:0,families:0}};
  let context=null;
  let selectedClubId="";
  let linkTeamId="";
  let aliasTarget=null;
  let resolveTarget=null;
  let resolveRaw="";

  function safeLogo(value){return value||"assets/branding/wpi-logo-mark.png";}
  function clubDirectoryRow(clubId){return (directory.clubs||[]).find(row=>String(row.clubId)===String(clubId))||null;}
  function teamDirectoryRow(teamId){return (directory.teams||[]).find(row=>String(row.canonicalTeamId)===String(teamId))||null;}
  function familyDirectoryRow(key){return (directory.teams||[]).find(row=>String(row.familyKey)===String(key))||null;}
  function message(id,text,state=""){const el=$(id);if(!el)return;el.textContent=text||"";el.dataset.state=state;}

  function renderClubSelect(){
    const select=$("identityClubSelect");
    const usable=clubs.filter(row=>["owner","admin"].includes(String(row.role||"").toLowerCase()));
    select.innerHTML='<option value="">Choose club…</option>'+usable.map(row=>`<option value="${esc(row.clubId)}">${esc(row.clubDisplayName||row.clubName||"Club")}</option>`).join("");
    if(selectedClubId&&usable.some(row=>String(row.clubId)===String(selectedClubId))) select.value=selectedClubId;
  }

  async function loadContext(){
    if(!selectedClubId){context=null;$("identityWorkspace").hidden=true;return;}
    const {data,error}=await backend.client.rpc("live_club_identity_context_v1",{target_club_id:selectedClubId});
    if(error) throw error;
    context=data||{};
    $("identityWorkspace").hidden=false;
    const club=context.club||{};
    $("identityClubTitle").textContent=club.clubDisplayName||club.clubName||"Club identity";
    $("identityClubDetail").textContent=[club.canonicalWpiClubId||"Unlisted WPI club",club.region].filter(Boolean).join(" · ");
    renderTeams();renderAliases();renderUnresolved();renderDirectory();
  }

  function squadKey(value){
    const v=String(value||"").trim().toUpperCase();
    if(!v||v==="PRIMARY") return "A";
    return v;
  }
  function familyCandidates(team){
    const clubId=context?.club?.canonicalWpiClubId;
    if(!clubId) return [];
    const desiredSquad=squadKey(team.squadLabel);
    return (directory.teams||[]).filter(row=>row.clubId===clubId&&row.ageGroup===team.ageGroup&&row.gender===team.gender)
      .map(row=>({...row,_score:(squadKey(row.level)===desiredSquad?100:0)+(norm(row.teamName).includes(norm(team.squadLabel||""))?10:0)}))
      .sort((a,b)=>b._score-a._score||String(a.teamName).localeCompare(String(b.teamName)));
  }

  function renderTeams(){
    const rows=Array.isArray(context?.teams)?context.teams:[];
    const linked=rows.filter(row=>row.canonicalWpiTeamFamilyKey).length;
    $("identityLinkSummary").textContent=`${linked}/${rows.length} linked`;
    $("liveTeamIdentityList").innerHTML=rows.length?rows.map(team=>{
      const family=familyDirectoryRow(team.canonicalWpiTeamFamilyKey);
      const status=team.canonicalWpiTeamFamilyKey?"linked":"unlinked";
      const linkCopy=family?`${family.clubName} · ${family.ageGroup} ${family.gender} · ${family.level||family.squadDescriptor||"Team"}`:(team.identityDisplayName||"No WPI team family linked");
      return `<article class="identity-team-row"><div><h3>${esc(team.teamDisplayLabel||team.teamName)}</h3><span class="identity-team-meta">${esc([team.ageGroup,team.gender,team.squadLabel,team.competitiveSeason].filter(Boolean).join(" · "))}</span><span class="identity-team-link" data-state="${status}">${status==="linked"?"✓":"○"} ${esc(linkCopy)}</span>${team.canonicalWpiTeamId?`<span class="identity-team-meta">Exact public ID: ${esc(team.canonicalWpiTeamId)}</span>`:""}</div><div class="identity-row-actions"><button class="primary" type="button" data-link-team="${esc(team.teamId)}">${status==="linked"?"Change family":"Link family"}</button>${status==="linked"?`<button type="button" data-clear-team="${esc(team.teamId)}">Clear link</button>`:""}<a href="live-dashboard.html?team=${encodeURIComponent(team.teamId)}">Open team</a></div></article>`;
    }).join(""):'<p class="identity-empty">No active teams in this club.</p>';
  }

  function renderAliases(){
    const rows=Array.isArray(context?.aliases)?context.aliases:[];
    $("identityAliasList").innerHTML=rows.length?rows.map(row=>{
      const target=teamDirectoryRow(row.canonicalWpiTeamId)||familyDirectoryRow(row.canonicalWpiTeamFamilyKey)||clubDirectoryRow(row.canonicalWpiClubId);
      const meta=[row.source,target?.ageGroup,target?.gender,target?.level].filter(Boolean).join(" · ");
      return `<article class="identity-alias-row"><div><strong>${esc(row.rawAlias)}</strong><span>→ ${esc(row.canonicalDisplayName||target?.teamName||target?.name||row.canonicalWpiClubId)}</span><span>${esc(meta||"Explicit WPI identity alias")}</span></div><div class="identity-row-actions"><button type="button" data-remove-alias="${esc(row.aliasId)}">Remove alias</button></div></article>`;
    }).join(""):'<p class="identity-empty">No saved aliases yet. Existing manual-opponent mappings will begin saving aliases in 7.60.2.</p>';
  }

  function renderUnresolved(){
    const rows=Array.isArray(context?.unresolvedOpponents)?context.unresolvedOpponents:[];
    $("unresolvedIdentityCount").textContent=`${rows.length} unresolved`;
    $("unresolvedIdentityList").innerHTML=rows.length?rows.map(row=>`<article class="identity-unresolved-row"><div><strong>${esc(row.opponentName||"Unlisted opponent")}</strong><span>${Number(row.gameCount||0)} game${Number(row.gameCount||0)===1?"":"s"} · ${esc((row.teamLabels||[]).join(" · "))}</span><span>Raw labels stay preserved after mapping.</span></div><div class="identity-row-actions"><button class="primary" type="button" data-resolve-raw="${esc(row.normalizedName||row.opponentName||"")}">Resolve</button>${row.lastGameId?`<a href="live-game-recap.html?game=${encodeURIComponent(row.lastGameId)}&team=${encodeURIComponent(row.lastGameTeamId||"")}">Latest game</a>`:""}</div></article>`).join(""):'<p class="identity-empty">No unresolved manual opponents need review.</p>';
  }

  function filteredDirectory(){
    const q=norm($("identityDirectorySearch")?.value||"");
    const age=$("identityAgeFilter")?.value||"all";
    const gender=$("identityGenderFilter")?.value||"all";
    return (directory.teams||[]).filter(row=>{
      if(age!=="all"&&row.ageGroup!==age)return false;
      if(gender!=="all"&&row.gender!==gender)return false;
      if(q&&!norm(`${row.teamName} ${row.clubName} ${(row.aliases||[]).join(" ")}`).includes(q))return false;
      return true;
    });
  }
  function renderDirectory(){
    const rows=filteredDirectory();
    $("identityDirectoryCount").textContent=`${rows.length.toLocaleString()} team${rows.length===1?"":"s"}`;
    $("identityDirectoryResults").innerHTML=rows.slice(0,60).map(row=>`<article class="identity-directory-card"><img src="${esc(safeLogo(row.logo))}" alt=""><div><strong>${esc(row.teamName)}</strong><small>${esc(row.clubName)} · ${esc(row.ageGroup)} ${esc(row.gender)} · ${esc(row.level||row.squadDescriptor||"")}</small><code>${esc(row.familyKey)}</code></div></article>`).join("")+(rows.length>60?`<p class="identity-empty">Showing the first 60 matches. Refine the search to narrow ${rows.length.toLocaleString()} results.</p>`:"");
  }

  function candidateButton(row,selected,type="team"){
    const club=type==="club"?row:clubDirectoryRow(row.clubId);
    const label=type==="club"?(row.name||row.shortName):(row.teamName||"Team");
    const meta=type==="club"?"WPI club":`${row.clubName} · ${row.ageGroup} ${row.gender} · ${row.level||row.squadDescriptor||"Team"}`;
    const key=type==="club"?`club:${row.clubId}`:`team:${row.canonicalTeamId}`;
    return `<button class="identity-candidate" type="button" data-target-key="${esc(key)}" aria-pressed="${selected===key}"><img src="${esc(safeLogo(club?.logo||row.logo))}" alt=""><span><strong>${esc(label)}</strong><small>${esc(meta)}</small></span><em>${type==="club"?"Club":"Team"}</em></button>`;
  }

  function openFamilyDialog(teamId){
    linkTeamId=teamId;
    const team=(context?.teams||[]).find(row=>String(row.teamId)===String(teamId));
    if(!team)return;
    $("teamFamilyDialogTitle").textContent=`Link ${team.teamDisplayLabel||team.teamName}`;
    $("teamFamilyDialogContext").textContent=`WPI will link this ${team.ageGroup} ${team.gender}${team.squadLabel?` ${team.squadLabel}`:""} workspace to a stable team family. This does not assign a prior-season exact public team ID.`;
    const candidates=familyCandidates(team);
    $("teamFamilyCandidates").innerHTML=candidates.length?candidates.map(row=>`<button class="identity-candidate" type="button" data-family-key="${esc(row.familyKey)}"><img src="${esc(safeLogo(row.logo))}" alt=""><span><strong>${esc(row.teamName)}</strong><small>${esc(row.clubName)} · public ${esc(row.season)} reference · ${esc(row.ageGroup)} ${esc(row.gender)}</small></span><em>${esc(row.level||"Team")}</em></button>`).join(""):'<p class="identity-empty">No same-club WPI team-family candidates match this age/group. Leave it unlinked rather than guessing.</p>';
    message("teamFamilyMessage","");
    $("teamFamilyDialog").showModal();
  }

  async function linkFamily(familyKey){
    const row=familyDirectoryRow(familyKey);if(!row||!linkTeamId)return;
    message("teamFamilyMessage","Saving explicit team-family link…");
    const {error}=await backend.client.rpc("live_set_team_identity_family_v1",{target_team_id:linkTeamId,requested_family_key:row.familyKey,requested_wpi_club_id:row.clubId,requested_display_name:`${row.clubName} · ${row.ageGroup} ${row.gender} ${row.level||""}`.trim()});
    if(error){message("teamFamilyMessage",error.message,"error");return;}
    message("teamFamilyMessage","Team family linked. No roster, game or season-specific public ID changed.","success");
    await loadContext();setTimeout(()=>$("teamFamilyDialog").close(),450);
  }

  async function clearFamily(teamId){
    if(!confirm("Clear this Live team's WPI family link? Team data and any exact verified public ID remain untouched."))return;
    const {error}=await backend.client.rpc("live_clear_team_identity_family_v1",{target_team_id:teamId});
    if(error){alert(error.message);return;}await loadContext();
  }

  function identitySearchRows(query){
    const q=norm(query); const tokens=q.split(" ").filter(Boolean); const rows=[];
    for(const team of directory.teams||[]){const hay=norm(`${team.teamName} ${team.clubName} ${(team.aliases||[]).join(" ")}`);let score=0;if(q&&norm(team.teamName)===q)score+=100;if(q&&hay.startsWith(q))score+=30;score+=tokens.filter(t=>hay.includes(t)).length*8;if(!q||score>0)rows.push({type:"team",row:team,score:score+2});}
    for(const club of directory.clubs||[]){const hay=norm(`${club.name} ${club.shortName} ${club.slug}`);let score=0;if(q&&norm(club.name)===q)score+=100;if(q&&hay.startsWith(q))score+=30;score+=tokens.filter(t=>hay.includes(t)).length*8;if(!q||score>0)rows.push({type:"club",row:club,score});}
    return rows.sort((a,b)=>b.score-a.score||String(a.row.teamName||a.row.name).localeCompare(String(b.row.teamName||b.row.name))).slice(0,30);
  }
  function targetFromKey(key){
    if(String(key).startsWith("team:")){const row=teamDirectoryRow(String(key).slice(5));return row?{key,type:"team",row}:null;}
    if(String(key).startsWith("club:")){const row=clubDirectoryRow(String(key).slice(5));return row?{key,type:"club",row}:null;}
    return null;
  }
  function renderTargetCandidates(mode){
    const searchId=mode==="alias"?"identityAliasSearch":"resolveOpponentSearch";
    const targetId=mode==="alias"?"identityAliasCandidates":"resolveOpponentCandidates";
    const selected=mode==="alias"?aliasTarget:resolveTarget;
    const rows=identitySearchRows($(searchId)?.value||"");
    $(targetId).innerHTML=rows.length?rows.map(item=>candidateButton(item.row,selected?.key,item.type)).join(""):'<p class="identity-empty">No WPI identity matches. Leave it unlisted rather than guessing.</p>';
  }
  function renderSelectedTarget(mode){
    const target=mode==="alias"?aliasTarget:resolveTarget;
    const box=$(mode==="alias"?"identityAliasSelected":"resolveOpponentSelected");
    const button=$(mode==="alias"?"saveIdentityAliasButton":"confirmResolveOpponentButton");
    if(!target){box.innerHTML='<strong>No WPI identity selected</strong><span>Nothing changes until you confirm.</span>';button.disabled=true;return;}
    const row=target.row;const label=target.type==="club"?(row.name||row.shortName):row.teamName;const meta=target.type==="club"?"Club identity":`${row.clubName} · ${row.ageGroup} ${row.gender} · ${row.level||"Team"}`;
    box.innerHTML=`<strong>Selected: ${esc(label)}</strong><span>${esc(meta)}</span>`;button.disabled=false;
  }

  function openAliasDialog(){aliasTarget=null;$("identityAliasRaw").value="";$("identityAliasSearch").value="";message("identityAliasMessage","");renderTargetCandidates("alias");renderSelectedTarget("alias");$("identityAliasDialog").showModal();}
  async function saveAlias(event){event.preventDefault();if(!aliasTarget||!context?.club?.clubId)return;const raw=$("identityAliasRaw").value.trim();if(!raw){message("identityAliasMessage","Enter the raw alias.","error");return;}const row=aliasTarget.row;const isTeam=aliasTarget.type==="team";const clubId=isTeam?row.clubId:row.clubId;const label=isTeam?`${row.clubName} ${row.teamName}`:(row.name||row.shortName);message("identityAliasMessage","Saving explicit alias…");const {error}=await backend.client.rpc("live_upsert_identity_alias_v1",{target_club_id:context.club.clubId,requested_raw_alias:raw,requested_wpi_club_id:clubId,requested_family_key:isTeam?row.familyKey:null,requested_wpi_team_id:isTeam?row.canonicalTeamId:null,requested_display_name:label});if(error){message("identityAliasMessage",error.message,"error");return;}message("identityAliasMessage","Alias saved for future game setup.","success");await loadContext();setTimeout(()=>$("identityAliasDialog").close(),400);}
  async function removeAlias(id){if(!confirm("Remove this saved alias? Past game labels and mappings will not change."))return;const {error}=await backend.client.rpc("live_remove_identity_alias_v1",{target_alias_id:id});if(error){alert(error.message);return;}await loadContext();}

  function openResolve(raw){const row=(context?.unresolvedOpponents||[]).find(x=>String(x.normalizedName||x.opponentName)===String(raw))||(context?.unresolvedOpponents||[]).find(x=>norm(x.opponentName)===norm(raw));if(!row)return;resolveRaw=row.opponentName||raw;resolveTarget=null;$("resolveOpponentRaw").textContent=resolveRaw;$("resolveOpponentImpact").textContent=`${Number(row.gameCount||0)} unresolved game${Number(row.gameCount||0)===1?"":"s"} will receive the explicit canonical link. Raw opponent_name stays unchanged.`;$("resolveOpponentSearch").value=resolveRaw;message("resolveOpponentMessage","");renderTargetCandidates("resolve");renderSelectedTarget("resolve");$("resolveOpponentDialog").showModal();}
  async function confirmResolve(){if(!resolveTarget||!resolveRaw||!context?.club?.clubId)return;const row=resolveTarget.row;const isTeam=resolveTarget.type==="team";const clubId=isTeam?row.clubId:row.clubId;const teamId=isTeam?row.canonicalTeamId:null;const label=isTeam?`${row.clubName} ${row.teamName}`:(row.name||row.shortName);message("resolveOpponentMessage","Saving mapping + reusable alias…");const {data,error}=await backend.client.rpc("live_resolve_manual_opponent_v1",{target_club_id:context.club.clubId,requested_raw_name:resolveRaw,requested_wpi_team_id:teamId,requested_wpi_club_id:clubId,requested_display_name:label});if(error){message("resolveOpponentMessage",error.message,"error");return;}message("resolveOpponentMessage",`${Number(data?.updatedGames||0)} game${Number(data?.updatedGames||0)===1?"":"s"} mapped; alias saved for future setup.`,"success");await loadContext();setTimeout(()=>$("resolveOpponentDialog").close(),450);}

  async function signOut(){if(backend)await backend.signOut();location.assign("live-login.html");}
  async function init(){
    document.body.dataset.liveTeamIdentityRelease=RELEASE;
    try{const res=await fetch("data/live/team-identity-directory-v7-60-2.json",{cache:"no-store"});if(!res.ok)throw new Error("Canonical WPI team directory could not load");directory=await res.json();}
    catch(error){$("identitySignedOut").hidden=false;$("identitySignedOut").innerHTML=`<h2>Identity directory unavailable</h2><p>${esc(error.message)}</p>`;return;}
    if(!window.WPILiveBackend?.isConfigured(config)){$("identitySignedOut").hidden=false;return;}
    try{backend=await window.WPILiveBackend.connect(config);session=await backend.session();if(!session||backend.isAnonymousUser(session.user)){if(session&&backend.isAnonymousUser(session.user))await backend.signOut();$("identitySignedOut").hidden=false;return;}const {data,error}=await backend.client.rpc("live_list_user_clubs_v1");if(error)throw error;clubs=Array.isArray(data)?data:[];$("identityConnected").hidden=false;renderClubSelect();const requested=new URLSearchParams(location.search).get("club");const usable=clubs.filter(row=>["owner","admin"].includes(String(row.role||"").toLowerCase()));selectedClubId=(requested&&usable.some(row=>String(row.clubId)===requested)?requested:usable[0]?.clubId)||"";$("identityClubSelect").value=selectedClubId;if(selectedClubId)await loadContext();else{$("identityClubTitle").textContent="No manageable clubs";$("identityClubDetail").textContent="Team identity management requires Club Owner/Admin access.";}}
    catch(error){$("identitySignedOut").hidden=false;$("identitySignedOut").querySelector("h2").textContent="Identity management could not connect";$("identitySignedOut").querySelector("p").textContent=error.message||"Connection failed.";}
  }

  $("identityClubSelect")?.addEventListener("change",async e=>{selectedClubId=e.target.value;try{await loadContext();}catch(error){alert(error.message);}});
  $("liveTeamIdentityList")?.addEventListener("click",e=>{const link=e.target.closest("[data-link-team]");if(link)openFamilyDialog(link.dataset.linkTeam);const clear=e.target.closest("[data-clear-team]");if(clear)clearFamily(clear.dataset.clearTeam);});
  $("teamFamilyCandidates")?.addEventListener("click",e=>{const b=e.target.closest("[data-family-key]");if(b)linkFamily(b.dataset.familyKey);});
  $("addIdentityAliasButton")?.addEventListener("click",openAliasDialog);
  $("identityAliasSearch")?.addEventListener("input",()=>renderTargetCandidates("alias"));
  $("identityAliasCandidates")?.addEventListener("click",e=>{const b=e.target.closest("[data-target-key]");if(!b)return;aliasTarget=targetFromKey(b.dataset.targetKey);renderTargetCandidates("alias");renderSelectedTarget("alias");});
  $("identityAliasForm")?.addEventListener("submit",saveAlias);
  $("identityAliasList")?.addEventListener("click",e=>{const b=e.target.closest("[data-remove-alias]");if(b)removeAlias(b.dataset.removeAlias);});
  $("unresolvedIdentityList")?.addEventListener("click",e=>{const b=e.target.closest("[data-resolve-raw]");if(b)openResolve(b.dataset.resolveRaw);});
  $("resolveOpponentSearch")?.addEventListener("input",()=>renderTargetCandidates("resolve"));
  $("resolveOpponentCandidates")?.addEventListener("click",e=>{const b=e.target.closest("[data-target-key]");if(!b)return;resolveTarget=targetFromKey(b.dataset.targetKey);renderTargetCandidates("resolve");renderSelectedTarget("resolve");});
  $("confirmResolveOpponentButton")?.addEventListener("click",confirmResolve);
  ["identityDirectorySearch","identityAgeFilter","identityGenderFilter"].forEach(id=>$(id)?.addEventListener(id.includes("Search")?"input":"change",renderDirectory));
  $("identitySignOutButton")?.addEventListener("click",signOut);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
