/* WPI 7.62.0 — Unified Organization Discovery & Scale */
(() => {
  "use strict";
  const $=id=>document.getElementById(id); const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const norm=v=>String(v??"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
  let data={organizations:[],teams:[],counts:{}}, visible=48;
  const teamsByOrg=()=>{const m=new Map();for(const t of data.teams||[]){if(!m.has(t.organizationId))m.set(t.organizationId,[]);m.get(t.organizationId).push(t);}return m;};
  function labelType(type){return type==="high_school"?"High School":"Club";}
  function loadFilters(){
    const locations=[...new Set((data.organizations||[]).map(o=>o.state||o.region).filter(Boolean))].sort();
    $("orgLocation").innerHTML='<option value="all">All locations</option>'+locations.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");
    const groups=[...new Set((data.teams||[]).map(t=>t.ageGroup==="HS"?(t.squadDescriptor||"High School"):t.ageGroup).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true}));
    $("orgTeamGroup").innerHTML='<option value="all">All groups</option>'+groups.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");
    $("orgCount").textContent=data.counts.organizations||0;$("clubCount").textContent=data.counts.clubs||0;$("schoolCount").textContent=data.counts.highSchools||0;$("teamCount").textContent=data.counts.teams||0;
  }
  function filtered(){
    const q=norm($("orgSearch").value), type=$("orgType").value, location=$("orgLocation").value, group=$("orgTeamGroup").value, byOrg=teamsByOrg();
    return (data.organizations||[]).filter(o=>{
      if(type!=="all"&&o.organizationType!==type)return false;
      if(location!=="all"&&o.state!==location&&o.region!==location)return false;
      const teams=byOrg.get(o.organizationId)||[];
      if(group!=="all"&&!teams.some(t=>(t.ageGroup==="HS"?(t.squadDescriptor||"High School"):t.ageGroup)===group))return false;
      if(!q)return true;
      return norm([o.name,o.shortName,o.city,o.state,o.region,...teams.flatMap(t=>[t.teamName,t.ageGroup,t.gender,t.squadDescriptor,...(t.aliases||[])])].join(" ")).includes(q);
    });
  }
  function card(o,teamMap){const teams=teamMap.get(o.organizationId)||[];const groups=[...new Set(teams.map(t=>t.ageGroup==="HS"?(t.squadDescriptor||"HS"):t.ageGroup).filter(Boolean))];return `<a class="org-card" href="${esc(o.profileHref)}" style="--card-primary:${esc(o.primaryColor)}"><img class="org-logo" src="${esc(o.logo||'assets/logos/cpi-logo-fallback.svg')}" alt="${esc(o.name)} logo"><div><h3>${esc(o.name)}</h3><p>${esc(o.locationLabel||o.region||"")}</p><div class="org-meta"><span class="org-badge ${o.organizationType==='high_school'?'school':''}">${labelType(o.organizationType)}</span><span class="org-badge">${teams.length} team${teams.length===1?'':'s'}</span>${groups.slice(0,3).map(g=>`<span class="org-badge">${esc(g)}</span>`).join('')}</div></div></a>`;}
  function render(reset=false){if(reset)visible=48;const rows=filtered(),map=teamsByOrg();$("orgResultCount").textContent=`${rows.length} organization${rows.length===1?'':'s'}`;$("orgGrid").innerHTML=rows.length?rows.slice(0,visible).map(o=>card(o,map)).join(""):'<div class="org-empty">No organizations match those filters.</div>';$("orgLoadMore").hidden=visible>=rows.length;}
  ["orgType","orgLocation","orgTeamGroup"].forEach(id=>$(id).addEventListener("change",()=>render(true)));$("orgSearch").addEventListener("input",()=>render(true));$("orgLoadMore").addEventListener("click",()=>{visible+=48;render();});
  fetch("data/live/organization-directory-v7-62-0.json?v=7.62.0",{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();}).then(d=>{data=d;loadFilters();const params=new URLSearchParams(location.search);if(params.get("search")) $("orgSearch").value=params.get("search");const requestedType=params.get("type");if(["club","high_school"].includes(requestedType)) $("orgType").value=requestedType;render(true);}).catch(e=>{$("orgGrid").innerHTML=`<div class="org-empty">Organization directory could not load. ${esc(e.message)}</div>`;});
})();
