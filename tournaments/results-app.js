(function(){
  const EVENTS = {
    "quicksilver": {
      title: "Quiksilver Cup Results",
      eyebrow: "Tournament results",
      subtitle: "Search complete game results by team, age/division, score, venue, or game number. Team selectors use cleaned team names, so pool labels like B1-, C2-, and seed prefixes are removed.",
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
      subtitle: "Search Boys Futures Super Finals game results by team, age/division, score, venue, or game number. Currently connected to the public sheet tab you provided; send additional age/division tab gids if the workbook has more tabs.",
      logo: "../../assets/cpi-logo-fallback.svg",
      statusLabel: "Live/cached results",
      tabs: [
        {label:"Boys Super Finals", age:"Boys", gender:"Boys", division:"Provided Tab", spreadsheetId:"1zawp4l5ElRiVjjkZwT2WFRnTXKLm7wVZA_cO0dxLAX4", gid:"326721462"}
      ]
    },
    "girls-club-championships": {
      title: "Girls US Club Championships",
      eyebrow: "Tournament results",
      subtitle: "Search Girls US Club Championship results by team, age/division, score, venue, or game number across the public sheets provided.",
      logo: "../../assets/cpi-logo-fallback.svg",
      statusLabel: "Live/cached results",
      tabs: [
        {label:"10U Coed", age:"10U", gender:"Coed", division:"Championship", spreadsheetId:"1TInyhZ3SQQ1bzSx5pxTzgzuTTtfrGrCjehzBJfmESXY", gid:"0"},
        {label:"12U Girls", age:"12U", gender:"Girls", division:"Championship", spreadsheetId:"179y3JxNFgyWh3g66g2n1kyM6g-fIAO-WpMWuVIhVHgY", gid:"0"},
        {label:"14U Girls", age:"14U", gender:"Girls", division:"Championship", spreadsheetId:"1G8qhNPbWSreO5MB4_DuX5J878rR_NYnpOfL6BYjGqpQ", gid:"0"},
        {label:"16U Girls", age:"16U", gender:"Girls", division:"Championship", spreadsheetId:"1VDtD_ofCmPwJenYQGDIHMXkfdO55EU7kcj8XsImh1XY", gid:"0"},
        {label:"18U Girls", age:"18U", gender:"Girls", division:"Championship", spreadsheetId:"1ok3A1J89hZqvufIFlzCkmmq5d46Yd5pog36JsDta_cI", gid:"0"}
      ]
    }
  };

  const state = { event: null, games: [], placements: [] };
  const $ = id => document.getElementById(id);

  function esc(s){return String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
  function norm(s){return String(s||"").replace(/\u00a0/g," ").trim().replace(/\s+/g," ");}
  function lower(s){return norm(s).toLowerCase();}

  function smartName(s){
    s = norm(s);
    if(!s) return "";
    const upperKeep = new Set(["CC","CDM","CIU","LB","LA","NSD","ORWP","OVAC","PAC","PV","SBWPC","SD","SJ","SHAQ","SET","TSM","USA","WPC"]);
    const titleForce = new Set(["SAN","SANTA"]);
    return s.split(/\s+/).map(part=>{
      const clean = part.replace(/[^A-Za-z0-9]/g,"").toUpperCase();
      if(titleForce.has(clean)) return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      if(upperKeep.has(clean)) return part.toUpperCase();
      if(part.length <= 3 && /^[A-Z0-9]+$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    }).join(" ");
  }

  function stripTeamPrefix(raw){
    let s = norm(raw).replace(/[–—]/g,"-").trim();

    // Many tournament sheets store resolved advancement rows as labels plus the actual team,
    // e.g. "W#31 - Norcal", "L#2a/1b - Route 66", "M1(1stf) - SBWPC".
    // For team filters and result cards, keep the actual team and drop the bracket label.
    const prefixPatterns = [
      // Parenthesized placement / seed labels, e.g. "(1st J) - Newport" or "(W#31) - Norcal".
      /^\(\s*(?:[WL]\s*#?\s*[A-Z0-9\/]+|\d+(?:st|nd|rd|th)\s*[A-Z]?|[A-Z]{1,3}\d{1,2})\s*\)\s*[-:]\s*/i,
      // Winner/loser references with # and optional pool pair, e.g. "W#1a/2b - Norcal", "L#30 - Rancho Tsunami".
      /^[WL]\s*#\s*[A-Z0-9]+(?:\/[A-Z0-9]+)?\s*[-:]\s*/i,
      // Winner/loser references without #, e.g. "W31 - Norcal", "L4c/3d - SD Dons".
      /^[WL]\s*[A-Z0-9]+(?:\/[A-Z0-9]+)?\s*[-:]\s*/i,
      // Pool/placement slot labels, e.g. "M1(1stf) - SBWPC", "N2(2ndf) - Thunder".
      /^[A-Z]{1,3}\d{1,2}\s*\([^)]*\)\s*[-:]\s*/i,
      // Placement/pool/seed prefixes, e.g. "1st A-", "1sta -", "B1-", "C2 -", "3-".
      /^\d+(?:st|nd|rd|th)\s*[A-Z]?\s*[-:]\s*/i,
      /^\d+(?:st|nd|rd|th)[A-Z]\s*[-:]\s*/i,
      /^[A-Z]{1,3}\d{1,2}\s*[-:]\s*/i,
      /^\d+\s*[-:]\s*/i,
      /^pt[_\s-]*[A-Z]?\d+\s*[-:]\s*/i,
      /^(?:seed|pool|group)\s*[A-Z]?\d*\s*[-:]\s*/i
    ];

    let changed = true;
    while(changed){
      changed = false;
      for(const pat of prefixPatterns){
        const next = s.replace(pat, "").trim();
        if(next !== s){ s = next; changed = true; }
      }
    }
    return s;
  }

  function cleanTeam(raw){
    let s = stripTeamPrefix(raw);
    if(!s) return "";

    // Remove non-team helper notes but preserve real team names.
    s = s.replace(/\s*\([^)]*\)\s*$/,"").trim();
    s = s.replace(/\s+/g," ");

    // Normalize a few common sheet aliases for display only.
    const aliases = {
      "SD SHORES": "San Diego Shores",
      "SD SHORES BLACK": "San Diego Shores Black",
      "SD SHORES GOLD": "San Diego Shores Gold",
      "SJ EXPRESS": "SJ Express",
      "LB SHORE": "Long Beach Shore",
      "LB VIKING": "LB Viking",
      "PV WPC": "PV WPC",
      "CC UNITED": "CC United",
      "LA JOLLA": "La Jolla",
      "LA JOLLA GOLD": "La Jolla Gold",
      "LA PREMIER": "LA Premier",
      "MID VALLEY": "Mid Valley",
      "SAN CLEMENTE": "San Clemente",
      "SANTA CRUZ": "Santa Cruz",
      "SANTA BARBARA": "Santa Barbara"
    };
    const key = s.toUpperCase().replace(/\s+/g," ");
    return aliases[key] || smartName(s);
  }

  function sortTeamName(s){ return cleanTeam(s).toLowerCase().replace(/[^a-z0-9]+/g," "); }

  function isPlaceholderTeam(s){
    const t = norm(s);
    if(!t) return true;
    return /^\d+$/.test(t)
      || /^[A-Z]?\d+$/.test(t)
      || /^\(?\s*\d+(?:st|nd|rd|th)\s*[A-Z]?\s*\)?$/i.test(t)
      || /^(W|L)\d+[A-Z]?$/i.test(t)
      || /^(Winner|Loser)\b/i.test(t)
      || /^(?:\d+(?:st|nd|rd|th)\s+)?(?:pt|platinum|gold|silver|bronze|classic|championship|pool|group)[_\s-]?[A-Z]?\d*$/i.test(t)
      || /^(?:date|time|score|white|dark|location|venue|site|game|gm|gmid)$/i.test(t)
      || /^TBD$/i.test(t)
      || /^bye$/i.test(t);
  }

  function canonicalTeamValue(s){
    if(isPlaceholderTeam(s)) return "";
    const cleaned = cleanTeam(s);
    if(isPlaceholderTeam(cleaned)) return "";
    return cleaned;
  }

  function displayTeamValue(s){
    return canonicalTeamValue(s) || cleanTeam(s) || norm(s);
  }

  function parseCsv(text){
    const rows=[]; let row=[], cell="", q=false;
    for(let i=0;i<text.length;i++){
      const ch=text[i], nx=text[i+1];
      if(q){
        if(ch==='"' && nx==='"'){cell+='"'; i++;}
        else if(ch==='"'){q=false;}
        else cell+=ch;
      } else {
        if(ch==='"') q=true;
        else if(ch===','){row.push(cell); cell="";}
        else if(ch==='\n'){row.push(cell); rows.push(row); row=[]; cell="";}
        else if(ch==='\r'){}
        else cell+=ch;
      }
    }
    row.push(cell); rows.push(row);
    return rows.map(r=>r.map(c=>norm(c))).filter(r=>r.some(Boolean));
  }

  function csvUrls(tab){
    const id = tab.spreadsheetId, gid = tab.gid;
    const cache = Date.now();
    return [
      `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${gid}&cachebust=${cache}`,
      `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}&cachebust=${cache}`
    ];
  }

  async function fetchText(url){
    const res = await fetch(url, {cache:"no-store"});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  }

  function isHeaderRow(row){
    const joined=row.map(lower).join("|");
    return /(white|dark|team|home|away|visitor|opponent)/.test(joined) && /(time|date|location|venue|site|pool|gm|game|gmid|score|result)/.test(joined);
  }

  function findIndex(headers, patterns){
    for(const pat of patterns){
      const idx=headers.findIndex(h=>pat.test(h));
      if(idx>=0) return idx;
    }
    return -1;
  }

  function asScore(v){
    const m=norm(v).match(/^\d+$/);
    return m ? Number(m[0]) : null;
  }
  function maybeDate(v){ return /\b\d{1,2}[-/]\d{1,2}\b|\bJul\b|\bJuly\b|\b2026\b/i.test(norm(v)); }
  function maybeTime(v){ return /\b\d{1,2}:\d{2}\s*(AM|PM)?\b/i.test(norm(v)); }
  function maybeGameId(v){ return /\b(?:10|12|14|16|18)[BGCU]?-?\d{2,3}[A-Z]?\b|\bGm\s*#?\s*\d+\b|\bGame\s*#?\s*\d+\b/i.test(norm(v)); }

  function isLikelyGameRow(row, map){
    const rowText = row.map(norm).filter(Boolean).join(" | ");
    if(maybeGameId(rowText)) return true;
    if(map){
      const date = map.date>=0 ? row[map.date] : "";
      const time = map.time>=0 ? row[map.time] : "";
      const gameNo = map.gameNo>=0 ? row[map.gameNo] : "";
      const gmid = map.gmid>=0 ? row[map.gmid] : "";
      const venue = map.venue>=0 ? row[map.venue] : "";
      if((gameNo || gmid) && (time || date || venue)) return true;
      if(date && time && venue) return true;
    }
    return false;
  }

  function scorePairFromRow(row, map){
    let ws=map && map.whiteScore>=0 ? asScore(row[map.whiteScore]) : null;
    let ds=map && map.darkScore>=0 ? asScore(row[map.darkScore]) : null;
    if(ws===null || ds===null){
      const nums=row.map(asScore).filter(v=>v!==null);
      if(nums.length>=2){ ws=nums[nums.length-2]; ds=nums[nums.length-1]; }
    }
    return [ws,ds];
  }

  function winnerFor(g){
    if(g.whiteScore === null || g.darkScore === null || g.whiteScore === undefined || g.darkScore === undefined) return "";
    if(g.whiteScore === g.darkScore) return "";
    return g.whiteScore > g.darkScore ? g.white : g.dark;
  }

  function resultForTeam(g, team){
    if(!team) return "";
    const isWhite = sortTeamName(g.white) === sortTeamName(team);
    const isDark = sortTeamName(g.dark) === sortTeamName(team);
    if(!isWhite && !isDark) return "";
    if(g.whiteScore === null || g.darkScore === null || g.whiteScore === undefined || g.darkScore === undefined) return "Scheduled";
    if(g.whiteScore === g.darkScore) return "Tie";
    const won = (isWhite && g.whiteScore > g.darkScore) || (isDark && g.darkScore > g.whiteScore);
    return won ? "Win" : "Loss";
  }

  function parseRows(rows, tab){
    const out=[]; let map=null;
    rows.forEach(row=>{
      if(isHeaderRow(row)){
        const header=row.map(lower);
        map={
          date:findIndex(header,[/^date$/,/\bdate\b/]),
          time:findIndex(header,[/^time$/,/\btime\b/]),
          venue:findIndex(header,[/location|venue|site|pool/]),
          gameNo:findIndex(header,[/^gm$/,/^gm #$/,/^game$/,/^game #$/, /\bgm\b/,/\bgame\b/]),
          gmid:findIndex(header,[/gmid|game id|gameid|id/]),
          white:findIndex(header,[/^white$/,/white team/,/^home$/,/^team 1$/,/^team a$/,/^visitor$/]),
          dark:findIndex(header,[/^dark$/,/dark team/,/^away$/,/^team 2$/,/^team b$/,/^opponent$/]),
          whiteScore:findIndex(header,[/white score|home score|team 1 score|score white|^w score$|^score 1$|^score$/]),
          darkScore:findIndex(header,[/dark score|away score|team 2 score|score dark|^d score$|^score 2$/])
        };
        return;
      }
      if(!map) return;
      const get=i=>i>=0?norm(row[i]||""):"";
      const rawWhite=get(map.white), rawDark=get(map.dark);
      const white=canonicalTeamValue(rawWhite), dark=canonicalTeamValue(rawDark);
      const date=get(map.date), time=get(map.time), venue=get(map.venue), gameNo=get(map.gameNo), gmid=get(map.gmid)||gameNo;
      if(!white && !dark) return;
      if(!isLikelyGameRow(row, map)) return;
      const [ws, ds] = scorePairFromRow(row, map);
      out.push({event:state.event.title,group:tab.label,age:tab.age,gender:tab.gender,division:tab.division,date,time,venue,gameNo,gmid,white,dark,whiteScore:ws,darkScore:ds,status:(ws!==null&&ds!==null)?"Final":"Scheduled",source:"live sheet"});
    });

    if(!out.length){
      rows.forEach(row=>{
        const rowText = row.map(norm).filter(Boolean).join(" | ");
        if(!isLikelyGameRow(row, null)) return;
        const non=row.filter(Boolean);
        const teamCandidates=non
          .filter(x=>!maybeDate(x)&&!maybeTime(x)&&!maybeGameId(x))
          .filter(x=>!/^(group|bracket|final|semi|quarter|championship|classic|place|seed|score|white|dark|date|time|location|venue|site|pool|gm|game|gmid)$/i.test(x))
          .map(canonicalTeamValue)
          .filter(Boolean);
        const uniqueTeams=[...new Map(teamCandidates.map(t=>[sortTeamName(t),t])).values()];
        if(uniqueTeams.length>=2){
          const nums=row.map(asScore).filter(v=>v!==null);
          out.push({event:state.event.title,group:tab.label,age:tab.age,gender:tab.gender,division:tab.division,date:non.find(maybeDate)||"",time:non.find(maybeTime)||"",venue:"",gameNo:non.find(maybeGameId)||"",gmid:non.find(maybeGameId)||"",white:uniqueTeams[0],dark:uniqueTeams[1],whiteScore:nums.length>=2?nums[nums.length-2]:null,darkScore:nums.length>=2?nums[nums.length-1]:null,status:nums.length>=2?"Final":"Scheduled",source:"live sheet"});
        }
      });
    }

    // Dedupe by event group + game id + teams.
    const seen = new Set();
    return out.filter(g=>{
      const key=[g.group, g.gmid||g.gameNo||"", sortTeamName(g.white), sortTeamName(g.dark), g.time||"", g.date||""].join("|");
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async function fetchTab(tab){
    let lastErr = null;
    for(const url of csvUrls(tab)){
      try{
        const txt=await fetchText(url);
        const rows=parseCsv(txt);
        const games=parseRows(rows, tab);
        if(games.length) return games;
      }catch(e){ lastErr = e; }
    }
    throw lastErr || new Error("No usable rows");
  }

  async function loadLive(){
    const tabs=state.event.tabs||[];
    if(!tabs.length) return [];
    const chunks=[]; const errors=[];
    for(const tab of tabs){
      try{ chunks.push(...await fetchTab(tab)); }
      catch(e){ errors.push(`${tab.label}: ${e.message}`); }
    }
    if(errors.length) console.warn("Tournament source errors", errors);
    return chunks;
  }

  async function loadFallback(){
    const url=state.event.fallbackJson; if(!url) return {games:[],placements:[]};
    try{
      const j=await (await fetch(url,{cache:"no-store"})).json();
      const placements=[];
      (j.groups||[]).forEach(g=>{
        const group=g.group||g.label||"";
        (g.placements||[]).forEach(p=>placements.push({...p,group,event:j.displayName||j.name||state.event.title,source:"CPI fallback"}));
      });
      const keyGames=(j.keyGames||[]).map(k=>({
        ...k,
        white: canonicalTeamValue(k.white || k.team || k.winner || ""),
        dark: canonicalTeamValue(k.dark || k.opponent || k.loser || ""),
        event:j.displayName||j.name||state.event.title,
        source:"CPI fallback"
      }));
      return {games:keyGames,placements};
    }catch(e){ return {games:[],placements:[]}; }
  }

  function setup(){
    const key=document.body.dataset.event||"quicksilver";
    state.event=EVENTS[key]||EVENTS.quicksilver;
    document.title=`${state.event.title} | CPI`;
    $("eyebrow").textContent=state.event.eyebrow;
    $("pageTitle").textContent=state.event.title;
    $("subtitle").textContent=state.event.subtitle;
    $("eventLogo").src=state.event.logo;
    $("eventLogo").alt=state.event.title;
    $("status").textContent=state.event.statusLabel;
  }

  function belongsToGroup(obj, group){
    if(!group) return true;
    return (obj.group||obj.age||"") === group;
  }

  function allTeams(group){
    const map = new Map();
    state.games.filter(g=>belongsToGroup(g, group)).forEach(g=>{
      [g.white,g.dark,g.team,g.winner,g.loser].forEach(t=>{
        const c=canonicalTeamValue(t);
        if(c) map.set(sortTeamName(c), c);
      });
    });
    state.placements.filter(p=>belongsToGroup(p, group)).forEach(p=>{
      const c=canonicalTeamValue(p.team);
      if(c) map.set(sortTeamName(c), c);
    });
    return [...map.values()].sort((a,b)=>a.localeCompare(b));
  }

  function populateTeamOptions(){
    const teamSel=$("teamFilter");
    const group=$("groupFilter").value;
    const prevTeam=teamSel.value;
    const teams=allTeams(group);
    teamSel.innerHTML=`<option value="">All teams</option>`+teams.map(t=>`<option>${esc(t)}</option>`).join("");
    if(teams.includes(prevTeam)) teamSel.value=prevTeam;
    else teamSel.value="";
  }

  function populateFilters(){
    const groupSel=$("groupFilter");
    const groups=[...new Set([...state.games.map(g=>g.group||g.age||""),...state.placements.map(p=>p.group||"")].filter(Boolean))].sort();
    const prevGroup=groupSel.value;
    groupSel.innerHTML=`<option value="">All age/divisions</option>`+groups.map(g=>`<option>${esc(g)}</option>`).join("");
    if(groups.includes(prevGroup)) groupSel.value=prevGroup;
    populateTeamOptions();
  }

  function filtered(){
    const q=lower($("search").value), group=$("groupFilter").value, team=$("teamFilter").value;
    const teamKey = sortTeamName(team);
    const matchObj=obj=>{
      const text=lower(Object.values(obj).join(" "));
      if(q&&!text.includes(q)) return false;
      if(group&&(obj.group||"")!==group) return false;
      if(team){
        const names=[obj.white,obj.dark,obj.team,obj.winner,obj.loser].map(canonicalTeamValue).filter(Boolean).map(sortTeamName);
        if(!names.includes(teamKey)) return false;
      }
      return true;
    };
    return {games:state.games.filter(matchObj),placements:state.placements.filter(matchObj)};
  }

  function score(g){
    if(g.whiteScore!==undefined&&g.whiteScore!==null&&g.darkScore!==undefined&&g.darkScore!==null) return `${g.whiteScore}–${g.darkScore}`;
    if(g.score) return g.score;
    return "—";
  }

  function renderSummary(){
    const teams=allTeams("");
    const finals=state.games.filter(g=>g.status==="Final" || (g.whiteScore!==null&&g.darkScore!==null));
    $("summary").innerHTML=`<div class="tr-mini-stat-grid"><div class="tr-mini-stat"><span>Games loaded</span><strong>${state.games.length}</strong></div><div class="tr-mini-stat"><span>Teams found</span><strong>${teams.length}</strong></div><div class="tr-mini-stat"><span>Final scores</span><strong>${finals.length}</strong></div><div class="tr-mini-stat"><span>Placements</span><strong>${state.placements.length}</strong></div></div>`;
  }

  function teamGames(team){
    const key=sortTeamName(team);
    return state.games.filter(g=>sortTeamName(g.white)===key || sortTeamName(g.dark)===key);
  }

  function renderTeamJourney(){
    let panel=$("teamJourney");
    if(!panel){
      const controls=document.querySelector(".tr-controls");
      panel=document.createElement("section");
      panel.id="teamJourney";
      panel.className="tr-team-journey-panel";
      controls.insertAdjacentElement("afterend", panel);
    }
    const team=$("teamFilter").value;
    if(!team){
      panel.innerHTML=`<div class="tr-empty tr-team-empty"><strong>Select a team</strong><br>Choose a team to see its tournament record, game-by-game results, and age/division-specific path.</div>`;
      return;
    }
    const games=teamGames(team).sort((a,b)=>`${a.date||""} ${a.time||""} ${a.gameNo||a.gmid||""}`.localeCompare(`${b.date||""} ${b.time||""} ${b.gameNo||b.gmid||""}`));
    const finals=games.filter(g=>g.whiteScore!==null&&g.darkScore!==null);
    const wins=finals.filter(g=>resultForTeam(g,team)==="Win").length;
    const losses=finals.filter(g=>resultForTeam(g,team)==="Loss").length;
    const scheduled=games.find(g=>!(g.whiteScore!==null&&g.darkScore!==null));
    const groups=[...new Set(games.map(g=>g.group).filter(Boolean))].join(", ");
    const rows=games.map(g=>{
      const result=resultForTeam(g,team);
      const opp=sortTeamName(g.white)===sortTeamName(team)?displayTeamValue(g.dark):displayTeamValue(g.white);
      const cls=result==="Win"?"win":result==="Loss"?"loss":"pending";
      return `<article class="tr-journey-game ${cls}"><div><strong>${esc(result)}</strong><span>${esc(g.gameNo||g.gmid||"Game")} · ${esc(g.date||"")} ${esc(g.time||"")} · ${esc(g.venue||"")}</span></div><div><b>${esc(team)}</b> vs ${esc(opp||"TBD")}</div><div class="tr-journey-score">${esc(score(g))}</div></article>`;
    }).join("");
    panel.innerHTML=`<div class="tr-journey-head"><div><p class="tr-eyebrow">Team results</p><h2>${esc(team)}</h2><p>${esc(groups || "All loaded divisions")}</p></div><div class="tr-record-badge"><span>Record</span><strong>${wins}-${losses}</strong></div></div>${scheduled?`<div class="tr-next-card"><span>Next scheduled game</span><strong>${esc(scheduled.gameNo||scheduled.gmid||"Game")} · ${esc(scheduled.date||"")} ${esc(scheduled.time||"")}</strong><em>${esc(scheduled.venue||"")}</em></div>`:""}<div class="tr-journey-list">${rows || `<div class="tr-empty">No game rows found for this team in the loaded tournament data.</div>`}</div>`;
  }

  function renderGames(){
    const {games,placements}=filtered();
    $("count").textContent=`${games.length} games / ${placements.length} placements shown`;
    renderTeamJourney();

    $("games").innerHTML=games.length?games.map(g=>{
      const left = displayTeamValue(g.white||g.team||g.winner||"");
      const right = displayTeamValue(g.dark||g.loser||"");
      const title = `${left || "Team"}${right ? ` vs ${right}` : ""}`;
      return `<article class="tr-card"><div class="tr-game-head"><div><div class="tr-game-title">${esc(title)}</div><div class="tr-game-meta">${esc(g.group||"")} · ${esc(g.date||"")} ${esc(g.time||"")} · ${esc(g.venue||"")}</div></div><span class="tr-result-pill ${(g.status||"").toLowerCase()==="final"?"win":"pending"}">${esc(g.status||"Result")}</span></div><div class="tr-score-row"><div class="tr-team-name">${esc(left)}</div><div class="tr-score">${esc(score(g))}</div><div class="tr-team-name">${esc(right)}</div></div><div class="tr-game-meta">${esc(g.gameNo||g.gmid||"")} ${g.source?` · ${esc(g.source)}`:""}</div></article>`;
    }).join(""):`<div class="tr-empty">No game rows match the current filters yet.</div>`;

    $("placements").innerHTML=placements.length?`<table class="tr-table"><thead><tr><th>Group</th><th>Place</th><th>Team</th><th>Note</th></tr></thead><tbody>${placements.map(p=>`<tr><td>${esc(p.group||"")}</td><td>${esc(p.place||"")}</td><td><strong>${esc(cleanTeam(p.team)||"")}</strong></td><td>${esc(p.note||p.rankingReviewAction||"")}</td></tr>`).join("")}</tbody></table>`:`<div class="tr-empty">No placement rows match the current filters.</div>`;
  }

  async function load(){
    $("status").textContent="Loading…";
    $("status").className="tr-live-pill";
    let games=[];
    try{ games=await loadLive(); }catch(e){ console.warn(e); }
    const fallback=await loadFallback();

    if(games.length){
      state.games=games;
      state.placements=fallback.placements||[];
      $("status").textContent=`Live results loaded · ${games.length} games`;
      $("status").className="tr-live-pill live";
    } else {
      state.games=fallback.games||[];
      state.placements=fallback.placements||[];
      if(state.games.length||state.placements.length){
        $("status").textContent="Using CPI fallback evidence";
        $("status").className="tr-live-pill warn";
      } else {
        $("status").textContent=state.event.tabs&&state.event.tabs.length?"No game data loaded":"Source sheet needed";
        $("status").className="tr-live-pill error";
      }
    }
    populateFilters();
    renderSummary();
    renderGames();
  }

  async function init(){
    setup();
    $("refresh").addEventListener("click",load);
    $("groupFilter").addEventListener("input",()=>{ populateTeamOptions(); renderGames(); });
    $("teamFilter").addEventListener("input",renderGames);
    $("search").addEventListener("input",renderGames);
    await load();
  }

  document.addEventListener("DOMContentLoaded",init);
})();
