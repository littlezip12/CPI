/* WPI 7.64.5 — opponent type-ahead search for Game-Day Hub. */
(() => {
  "use strict";
  const input=document.getElementById("gameOpponentName");
  if(!input) return;
  let teams=[];
  let active=-1;
  let box=null;
  const norm=value=>String(value||"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
  const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const tokens=value=>norm(value).split(/\s+/).filter(Boolean);
  function editDistance(a,b){
    a=norm(a);b=norm(b);if(a===b)return 0;if(!a)return b.length;if(!b)return a.length;
    const prev=Array.from({length:b.length+1},(_,i)=>i),cur=new Array(b.length+1);
    for(let i=1;i<=a.length;i++){cur[0]=i;for(let j=1;j<=b.length;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));for(let j=0;j<=b.length;j++)prev[j]=cur[j];}
    return prev[b.length];
  }
  function context(){
    const text=document.getElementById("gameTeamLockContext")?.textContent||document.body.textContent||"";
    const age=text.match(/\b(10U|12U|14U|16U|18U)\b/i)?.[1]?.toUpperCase()||"";
    const gender=/\bBoys\b/i.test(text)?"boys":/\bGirls\b/i.test(text)?"girls":"";
    return {age,gender};
  }
  function searchable(team){return norm([team.team,team.club,team.displayClubName,team.group,team.ageGroup,team.gender,team.locationLabel].filter(Boolean).join(" "));}
  function score(team,query){
    const q=norm(query),hay=searchable(team); if(!q)return -Infinity;
    let s=-Infinity;
    if(norm(team.team).startsWith(q)) s=120;
    else if(norm(team.club).startsWith(q)||norm(team.displayClubName).startsWith(q)) s=110;
    else if(hay.includes(q)) s=90;
    else if(q.length>=4){
      const qTokens=tokens(q),hTokens=tokens(hay);let best=99;
      qTokens.forEach(qt=>hTokens.forEach(ht=>{ if(Math.abs(qt.length-ht.length)<=2) best=Math.min(best,editDistance(qt,ht)); }));
      if(best<=1)s=76; else if(q.length>=6&&best<=2)s=64;
    }
    if(!Number.isFinite(s))return s;
    const ctx=context();
    if(ctx.age&&String(team.ageGroup||"").toUpperCase()===ctx.age)s+=18;
    if(ctx.gender&&String(team.group||team.gender||"").toLowerCase().includes(ctx.gender))s+=12;
    if(String(team.team||"").toLowerCase().includes(" a"))s+=2;
    return s;
  }
  function label(team){return [team.displayClubName||team.club,team.group||team.ageGroup,team.team].filter(Boolean).join(" · ");}
  function results(query){
    const seen=new Set();
    return teams.map(team=>({team,score:score(team,query)})).filter(row=>Number.isFinite(row.score)).sort((a,b)=>b.score-a.score||label(a.team).localeCompare(label(b.team))).filter(row=>{const key=`${row.team.canonicalTeamId||row.team.slug||row.team.team}|${row.team.group||""}`;if(seen.has(key))return false;seen.add(key);return true;}).slice(0,8);
  }
  function close(){if(box){box.dataset.open="false";box.innerHTML="";}active=-1;input.setAttribute("aria-expanded","false");}
  function choose(team){
    input.value=team.team||team.club||"";
    input.dispatchEvent(new Event("input",{bubbles:true}));
    input.dispatchEvent(new Event("change",{bubbles:true}));
    close();input.focus();
  }
  function setActive(index){
    const buttons=[...box.querySelectorAll(".live-opponent-suggestion")];if(!buttons.length)return;
    active=Math.max(0,Math.min(index,buttons.length-1));
    buttons.forEach((button,i)=>button.dataset.active=String(i===active));buttons[active]?.scrollIntoView?.({block:"nearest"});
  }
  function render(){
    if(!box)return;const query=input.value.trim();if(query.length<2){close();return;}
    const rows=results(query);
    if(!rows.length){box.innerHTML='<div class="live-opponent-typeahead-empty">No WPI team match yet. Keep typing or leave the team name exactly as you want it saved.</div>';box.dataset.open="true";input.setAttribute("aria-expanded","true");return;}
    box.innerHTML=rows.map((row,i)=>{const team=row.team;const meta=[team.displayClubName||team.club,team.group||team.ageGroup].filter(Boolean).join(" · ");return `<button class="live-opponent-suggestion" type="button" role="option" data-index="${i}" aria-selected="false"><img src="${esc(team.logo||"assets/branding/wpi-logo-mark.png")}" alt=""><span><strong>${esc(team.team||team.club)}</strong><small>${esc(meta)}</small></span><em>${row.score>=100?"Best match":"Match"}</em></button>`;}).join("");
    [...box.querySelectorAll(".live-opponent-suggestion")].forEach((button,i)=>button.addEventListener("pointerdown",event=>{event.preventDefault();choose(rows[i].team);}));
    box.dataset.open="true";input.setAttribute("aria-expanded","true");active=-1;
  }
  function install(){
    const labelEl=input.closest("label");if(!labelEl||box)return;
    input.removeAttribute("list");
    input.setAttribute("role","combobox");input.setAttribute("aria-autocomplete","list");input.setAttribute("aria-expanded","false");
    const wrap=document.createElement("span");wrap.className="live-opponent-typeahead-wrap";
    input.parentNode.insertBefore(wrap,input);wrap.appendChild(input);
    box=document.createElement("div");box.className="live-opponent-typeahead";box.id="gameOpponentTypeahead";box.setAttribute("role","listbox");box.dataset.open="false";wrap.appendChild(box);input.setAttribute("aria-controls",box.id);
    input.addEventListener("input",render);input.addEventListener("focus",render);
    input.addEventListener("keydown",event=>{
      if(box.dataset.open!=="true")return;
      const buttons=[...box.querySelectorAll(".live-opponent-suggestion")];
      if(event.key==="ArrowDown"&&buttons.length){event.preventDefault();setActive(active+1);}
      else if(event.key==="ArrowUp"&&buttons.length){event.preventDefault();setActive(active<=0?buttons.length-1:active-1);}
      else if(event.key==="Enter"&&active>=0&&buttons[active]){event.preventDefault();buttons[active].dispatchEvent(new PointerEvent("pointerdown",{bubbles:true}));}
      else if(event.key==="Escape")close();
    });
    document.addEventListener("pointerdown",event=>{if(!wrap.contains(event.target))close();});
  }
  fetch("clubs.json",{cache:"no-store"}).then(r=>r.ok?r.json():[]).then(clubs=>{
    teams=(Array.isArray(clubs)?clubs:[]).flatMap(club=>(club.teams||[]).map(team=>({...team,club:team.club||club.club,displayClubName:team.displayClubName||club.displayName||club.club,logo:team.logo||club.logo||null})));
    install();
  }).catch(()=>{});
})();
