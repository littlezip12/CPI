(function(){
  const EVENTS = {
    "quicksilver": {
      title: "Quiksilver Cup Results",
      eyebrow: "Tournament results",
      subtitle: "Search teams, age groups, divisions, and game scores from the Quiksilver Cup. Live Google Sheets are attempted first; CPI fallback evidence is used if the live source is unavailable.",
      logo: "../../assets/logos/usa-water-polo.webp",
      statusLabel: "Live/cached results",
      fallbackJson: "../../data/tournaments/quiksilver-cup-2026.json",
      tabs: [
        {label:"12U Boys", age:"12U", gender:"Boys", division:"Championship", spreadsheetId:"18yVkTqV4amoIyESXsB1RzZSs1TI0_EKQ", gid:"925524067"},
        {label:"14U Girls", age:"14U", gender:"Girls", division:"Championship", spreadsheetId:"18yVkTqV4amoIyESXsB1RzZSs1TI0_EKQ", gid:"701942663"},
        {label:"14U Boys", age:"14U", gender:"Boys", division:"Championship", spreadsheetId:"18yVkTqV4amoIyESXsB1RzZSs1TI0_EKQ", gid:"1501136177"},
        {label:"16U Girls", age:"16U", gender:"Girls", division:"Championship", spreadsheetId:"18yVkTqV4amoIyESXsB1RzZSs1TI0_EKQ", gid:"471397786"},
        {label:"16U Boys", age:"16U", gender:"Boys", division:"Championship", spreadsheetId:"18yVkTqV4amoIyESXsB1RzZSs1TI0_EKQ", gid:"472292980"},
        {label:"18U Girls", age:"18U", gender:"Girls", division:"Championship", spreadsheetId:"18yVkTqV4amoIyESXsB1RzZSs1TI0_EKQ", gid:"387537840"},
        {label:"18U Boys", age:"18U", gender:"Boys", division:"Championship", spreadsheetId:"18yVkTqV4amoIyESXsB1RzZSs1TI0_EKQ", gid:"1111531430"}
      ]
    },
    "boys-superfinals": {
      title: "Boys Futures Super Finals",
      eyebrow: "Tournament results",
      subtitle: "This results tool is staged and ready for the Boys Super Finals source sheets. Send the sheet links/gids and CPI can show scores, team journeys, and searchable age-group results here.",
      logo: "../../assets/cpi-logo-fallback.svg",
      statusLabel: "Source sheet needed",
      tabs: []
    },
    "girls-club-championships": {
      title: "Girls US Club Championships",
      eyebrow: "Tournament results",
      subtitle: "This results tool is staged and ready for the Girls US Club Championships source sheets. Send the sheet links/gids and CPI can show scores, team journeys, and searchable age-group results here.",
      logo: "../../assets/cpi-logo-fallback.svg",
      statusLabel: "Source sheet needed",
      tabs: []
    }
  };

  const state = { event: null, games: [], placements: [] };
  const $ = id => document.getElementById(id);
  function esc(s){return String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
  function norm(s){return String(s||"").trim().replace(/\s+/g," ");}
  function lower(s){return norm(s).toLowerCase();}
  function parseCsv(text){
    const rows=[]; let row=[], cell="", q=false;
    for(let i=0;i<text.length;i++){
      const ch=text[i], nx=text[i+1];
      if(q){ if(ch==='"' && nx==='"'){cell+='"'; i++;} else if(ch==='"'){q=false;} else cell+=ch; }
      else { if(ch==='"') q=true; else if(ch===','){row.push(cell); cell="";} else if(ch==='\n'){row.push(cell); rows.push(row); row=[]; cell="";} else if(ch==='\r'){} else cell+=ch; }
    }
    row.push(cell); rows.push(row);
    return rows.map(r=>r.map(c=>norm(c))).filter(r=>r.some(Boolean));
  }
  function csvUrl(tab){ return `https://docs.google.com/spreadsheets/d/${tab.spreadsheetId}/gviz/tq?tqx=out:csv&gid=${tab.gid}&cachebust=${Date.now()}`; }
  async function fetchText(url){ const res = await fetch(url, {cache:"no-store"}); if(!res.ok) throw new Error(`HTTP ${res.status}`); return await res.text(); }
  function cleanTeam(s){ s=norm(s).replace(/^\d+\s*[-–]\s*/,"").replace(/\s*\([^)]*\)\s*$/,"").trim(); return s; }
  function isHeaderRow(row){ const joined=row.map(lower).join("|"); return /(white|dark|team|home|away)/.test(joined) && /(time|date|location|venue|site|pool|gm|game|gmid|score)/.test(joined); }
  function findIndex(headers, patterns){ for(const pat of patterns){ const idx=headers.findIndex(h=>pat.test(h)); if(idx>=0) return idx; } return -1; }
  function asScore(v){ const m=norm(v).match(/^\d+$/); return m ? Number(m[0]) : null; }
  function maybeDate(v){ return /\b\d{1,2}[-/]\d{1,2}\b|\bJul\b|\bJuly\b|\b2026\b/i.test(norm(v)); }
  function maybeTime(v){ return /\b\d{1,2}:\d{2}\s*(AM|PM)?\b/i.test(norm(v)); }
  function maybeGameId(v){ return /\b\d{2}[A-Z]?-?\d{2,3}[A-Z]?\b|\bGm\s*#?\s*\d+\b/i.test(norm(v)); }
  function parseRows(rows, tab){
    const out=[]; let map=null;
    rows.forEach(row=>{
      if(isHeaderRow(row)){
        const header=row.map(lower);
        map={date:findIndex(header,[/^date$/,/\bdate\b/]),time:findIndex(header,[/^time$/,/\btime\b/]),venue:findIndex(header,[/location|venue|site|pool/]),gameNo:findIndex(header,[/^gm$/,/^gm #$/,/^game$/,/^game #$/, /\bgm\b/,/\bgame\b/]),gmid:findIndex(header,[/gmid|game id|gameid|id/]),white:findIndex(header,[/^white$/,/white team/,/^home$/,/^team 1$/,/^team a$/]),dark:findIndex(header,[/^dark$/,/dark team/,/^away$/,/^team 2$/,/^team b$/]),whiteScore:findIndex(header,[/white score|home score|team 1 score|score white/]),darkScore:findIndex(header,[/dark score|away score|team 2 score|score dark/])};
        return;
      }
      if(!map) return;
      const get=i=>i>=0?norm(row[i]||""):"";
      const white=cleanTeam(get(map.white)), dark=cleanTeam(get(map.dark));
      const date=get(map.date), time=get(map.time), venue=get(map.venue), gameNo=get(map.gameNo), gmid=get(map.gmid)||gameNo;
      if(!white && !dark) return;
      if(!date && !time && !gameNo && !gmid) return;
      let ws=map.whiteScore>=0?asScore(get(map.whiteScore)):null, ds=map.darkScore>=0?asScore(get(map.darkScore)):null;
      if(ws===null || ds===null){ const nums=row.map(asScore).filter(v=>v!==null); if(nums.length>=2){ws=nums[nums.length-2]; ds=nums[nums.length-1];} }
      out.push({event:state.event.title,group:tab.label,age:tab.age,gender:tab.gender,division:tab.division,date,time,venue,gameNo,gmid,white,dark,whiteScore:ws,darkScore:ds,status:(ws!==null&&ds!==null)?"Final":"Scheduled",source:"live sheet"});
    });
    if(!out.length){
      rows.forEach(row=>{
        const hasDate=row.some(maybeDate), hasTime=row.some(maybeTime), hasGame=row.some(maybeGameId);
        if(!(hasDate||hasTime||hasGame)) return;
        const non=row.filter(Boolean);
        const teamCandidates=non.filter(x=>!maybeDate(x)&&!maybeTime(x)&&!maybeGameId(x)&&!/^(group|bracket|final|semi|quarter|championship|place|seed|score)$/i.test(x)&&!/^^\d+$/.test(x));
        if(teamCandidates.length>=2){
          const nums=row.map(asScore).filter(v=>v!==null);
          out.push({event:state.event.title,group:tab.label,age:tab.age,gender:tab.gender,division:tab.division,date:non.find(maybeDate)||"",time:non.find(maybeTime)||"",venue:"",gameNo:non.find(maybeGameId)||"",gmid:non.find(maybeGameId)||"",white:cleanTeam(teamCandidates[0]),dark:cleanTeam(teamCandidates[1]),whiteScore:nums.length>=2?nums[nums.length-2]:null,darkScore:nums.length>=2?nums[nums.length-1]:null,status:nums.length>=2?"Final":"Scheduled",source:"live sheet"});
        }
      });
    }
    return out;
  }
  async function loadLive(){
    const tabs=state.event.tabs||[]; if(!tabs.length) return [];
    const chunks=[]; const errors=[];
    for(const tab of tabs){ try{ const txt=await fetchText(csvUrl(tab)); chunks.push(...parseRows(parseCsv(txt), tab)); }catch(e){ errors.push(`${tab.label}: ${e.message}`); } }
    if(errors.length) console.warn("Tournament source errors", errors);
    return chunks;
  }
  async function loadFallback(){
    const url=state.event.fallbackJson; if(!url) return {games:[],placements:[]};
    try{ const j=await (await fetch(url,{cache:"no-store"})).json(); const placements=[]; (j.groups||[]).forEach(g=>{ const group=g.group||g.label||""; (g.placements||[]).forEach(p=>placements.push({...p,group,event:j.displayName||j.name||state.event.title,source:"CPI fallback"})); }); const keyGames=(j.keyGames||[]).map(k=>({...k,event:j.displayName||j.name||state.event.title,source:"CPI fallback"})); return {games:keyGames,placements}; }catch(e){ return {games:[],placements:[]}; }
  }
  function setup(){
    const key=document.body.dataset.event||"quicksilver"; state.event=EVENTS[key]||EVENTS.quicksilver;
    document.title=`${state.event.title} | CPI`; $("eyebrow").textContent=state.event.eyebrow; $("pageTitle").textContent=state.event.title; $("subtitle").textContent=state.event.subtitle; $("eventLogo").src=state.event.logo; $("eventLogo").alt=state.event.title; $("status").textContent=state.event.statusLabel;
  }
  function populateFilters(){
    const groupSel=$("groupFilter"), teamSel=$("teamFilter");
    const groups=[...new Set([...state.games.map(g=>g.group||g.age||""),...state.placements.map(p=>p.group||"")].filter(Boolean))].sort();
    groupSel.innerHTML=`<option value="">All age/divisions</option>`+groups.map(g=>`<option>${esc(g)}</option>`).join("");
    const teams=[...new Set([...state.games.flatMap(g=>[g.white,g.dark,g.team,g.winner,g.loser]),...state.placements.map(p=>p.team)].filter(Boolean).map(cleanTeam))].sort();
    teamSel.innerHTML=`<option value="">All teams</option>`+teams.map(t=>`<option>${esc(t)}</option>`).join("");
  }
  function filtered(){
    const q=lower($("search").value), group=$("groupFilter").value, team=$("teamFilter").value;
    const matchObj=obj=>{ const text=lower(Object.values(obj).join(" ")); if(q&&!text.includes(q)) return false; if(group&&(obj.group||"")!==group) return false; if(team){ const names=[obj.white,obj.dark,obj.team,obj.winner,obj.loser].filter(Boolean).map(cleanTeam); if(!names.includes(team)) return false;} return true; };
    return {games:state.games.filter(matchObj),placements:state.placements.filter(matchObj)};
  }
  function score(g){ if(g.whiteScore!==undefined&&g.whiteScore!==null&&g.darkScore!==undefined&&g.darkScore!==null) return `${g.whiteScore}–${g.darkScore}`; if(g.score) return g.score; return "—"; }
  function renderSummary(){ const teams=[...new Set([...state.games.flatMap(g=>[g.white,g.dark]),...state.placements.map(p=>p.team)].filter(Boolean))]; const finals=state.games.filter(g=>g.status==="Final" || (g.whiteScore!==null&&g.darkScore!==null)); $("summary").innerHTML=`<div class="tr-mini-stat-grid"><div class="tr-mini-stat"><span>Games loaded</span><strong>${state.games.length}</strong></div><div class="tr-mini-stat"><span>Teams found</span><strong>${teams.length}</strong></div><div class="tr-mini-stat"><span>Final scores</span><strong>${finals.length}</strong></div><div class="tr-mini-stat"><span>Placements</span><strong>${state.placements.length}</strong></div></div>`; }
  function renderGames(){
    const {games,placements}=filtered(); $("count").textContent=`${games.length} games / ${placements.length} placements shown`;
    if(state.event.tabs&&state.event.tabs.length===0){ $("games").innerHTML=`<div class="tr-empty tr-source-needed"><strong>Source sheets needed.</strong><br>Send the public Google Sheet URL(s), tab names, and gids for this tournament and this page will use the same results/search layout.</div>`; $("placements").innerHTML=""; return; }
    $("games").innerHTML=games.length?games.map(g=>`<article class="tr-card"><div class="tr-game-head"><div><div class="tr-game-title">${esc(g.white||g.team||g.winner||"Team")} ${g.dark?`vs ${esc(g.dark)}`:""}</div><div class="tr-game-meta">${esc(g.group||"")} · ${esc(g.date||"")} ${esc(g.time||"")} · ${esc(g.venue||"")}</div></div><span class="tr-result-pill ${(g.status||"").toLowerCase()==="final"?"win":"pending"}">${esc(g.status||"Result")}</span></div><div class="tr-score-row"><div class="tr-team-name">${esc(g.white||g.team||g.winner||"")}</div><div class="tr-score">${esc(score(g))}</div><div class="tr-team-name">${esc(g.dark||g.loser||"")}</div></div><div class="tr-game-meta">${esc(g.gameNo||g.gmid||"")} ${g.source?` · ${esc(g.source)}`:""}</div></article>`).join(""):`<div class="tr-empty">No game rows match the current filters yet.</div>`;
    $("placements").innerHTML=placements.length?`<table class="tr-table"><thead><tr><th>Group</th><th>Place</th><th>Team</th><th>Note</th></tr></thead><tbody>${placements.map(p=>`<tr><td>${esc(p.group||"")}</td><td>${esc(p.place||"")}</td><td><strong>${esc(p.team||"")}</strong></td><td>${esc(p.note||p.rankingReviewAction||"")}</td></tr>`).join("")}</tbody></table>`:`<div class="tr-empty">No placement rows match the current filters.</div>`;
  }
  async function load(){
    $("status").textContent="Loading…"; $("status").className="tr-live-pill"; let games=[]; try{ games=await loadLive(); }catch(e){ console.warn(e); }
    const fallback=await loadFallback();
    if(games.length){ state.games=games; state.placements=fallback.placements||[]; $("status").textContent=`Live results loaded · ${games.length} games`; $("status").className="tr-live-pill live"; }
    else { state.games=fallback.games||[]; state.placements=fallback.placements||[]; if(state.games.length||state.placements.length){ $("status").textContent="Using CPI fallback evidence"; $("status").className="tr-live-pill warn"; } else { $("status").textContent=state.event.tabs&&state.event.tabs.length?"No game data loaded":"Source sheet needed"; $("status").className="tr-live-pill error"; } }
    populateFilters(); renderSummary(); renderGames();
  }
  async function init(){ setup(); $("refresh").addEventListener("click",load); ["search","groupFilter","teamFilter"].forEach(id=>$(id).addEventListener("input",renderGames)); await load(); }
  document.addEventListener("DOMContentLoaded",init);
})();
