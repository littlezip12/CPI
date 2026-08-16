/* WPI 7.62.0 — Homepage unified team/club/high-school search overlay. */
(() => {
  "use strict";
  const form=document.getElementById("wpiHomeSearch"),input=document.getElementById("wpiSearchInput"),type=document.getElementById("wpiSearchType"),results=document.getElementById("wpiSearchResults");if(!form||!input||!type||!results)return;
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const norm=v=>String(v??"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
  let directory=null;
  const fallback="assets/logos/cpi-logo-fallback.svg";
  function allowedOrg(o,mode){return mode==="all"||mode==="organizations"||(mode==="clubs"&&o.organizationType==="club")||(mode==="high_schools"&&o.organizationType==="high_school");}
  function items(){if(!directory)return[];const q=norm(input.value);if(!q)return[];const mode=type.value,rows=[];
    if(mode==="all"||mode==="teams")for(const t of directory.teams||[]){const hay=norm([t.organizationName,t.teamName,t.ageGroup,t.gender,t.squadDescriptor,...(t.aliases||[])].join(" "));if(hay.includes(q))rows.push({kind:"Team",name:`${t.organizationName} · ${t.teamName}`,meta:[t.ageGroup==="HS"?"High School":t.ageGroup,t.gender,t.squadDescriptor].filter(Boolean).join(" · "),logo:t.logo,url:t.profileHref,score:hay.startsWith(q)?0:3});}
    if(mode!=="teams")for(const o of directory.organizations||[]){if(!allowedOrg(o,mode))continue;const hay=norm([o.name,o.shortName,o.city,o.state,o.region].join(" "));if(hay.includes(q))rows.push({kind:o.organizationType==="high_school"?"High School":"Club",name:o.name,meta:o.locationLabel||o.region||"WPI organization",logo:o.logo,url:o.profileHref,score:hay.startsWith(q)?1:4});}
    return rows.sort((a,b)=>a.score-b.score||a.name.localeCompare(b.name)).slice(0,10);
  }
  function render(e){if(e){e.stopImmediatePropagation();}const q=input.value.trim();if(!q){results.hidden=true;results.innerHTML="";return;}const rows=items();results.hidden=false;results.innerHTML=rows.length?rows.map(x=>`<a class="wpi-search-result" href="${esc(x.url)}"><img src="${esc(x.logo||fallback)}" alt=""><span><strong>${esc(x.name)}</strong><small>${esc(x.kind)} · ${esc(x.meta)}</small></span><em>Open →</em></a>`).join(""):`<div class="wpi-search-empty">No WPI organizations or teams match “${esc(q)}”.</div>`;}
  input.addEventListener("input",render,true);type.addEventListener("change",render,true);form.addEventListener("submit",e=>{e.preventDefault();e.stopImmediatePropagation();const row=items()[0];if(row)location.href=row.url;else location.href=`organizations.html?search=${encodeURIComponent(input.value.trim())}&type=${encodeURIComponent(type.value)}`;},true);
  fetch("data/live/organization-directory-v7-62-0.json?v=7.62.0",{cache:"no-store"}).then(r=>r.ok?r.json():Promise.reject(new Error(`HTTP ${r.status}`))).then(d=>{directory=d;const stat=document.getElementById("wpiClubCount");if(stat)stat.textContent=String(d.counts?.organizations||185);if(input.value.trim())render();}).catch(e=>console.warn("Unified organization search unavailable",e));
})();
