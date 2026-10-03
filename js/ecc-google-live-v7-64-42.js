(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.WPHQ_ECC_GOOGLE_LIVE=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';

  const RELEASE='7.64.42';
  const EVENT_ID='2026-evan-cousineau-memorial-cup';
  const SHEET_ID='1MnXWw7DZ6SCosPD4wy1SY5g4gNMT8h1fa7zYTuO-BoU';
  const SHEET_NAME='MASTER BY DIVISION';
  const OFFICIAL_URL=`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;
  const REFRESH_MS=60000;
  const CACHE_KEY='wphq:ecc:google-live:v7-64-42';
  const JSONP_TIMEOUT_MS=7000;
  const FETCH_TIMEOUT_MS=6000;
  const EXPECTED_GAMES=335;
  const EXPECTED_DIVISIONS=13;

  const DIVISION_MAP={
    '10U_BOYS':'10u-boys',
    '10U_COED_PLATINUM_&_SILVER':'10u-coed-platinum',
    '10U_GIRLS_&_COED_GOLD':'10u-girls-coed-gold',
    '12U_BOYS_GOLD':'12u-boys-gold',
    '12U_BOYS_PLATINUM':'12u-boys-platinum',
    '12U_COED_&_BOYS_SILVER':'12u-coed-boys-silver',
    '12U_GIRLS':'12u-girls',
    '14U_BOYS_GOLD':'14u-boys-gold',
    '14U_BOYS_PLATINUM':'14u-boys-platinum',
    '14U_COED_&_BOYS_SILVER':'14u-coed-boys-silver',
    '14U_GIRLS_GOLD':'14u-girls-gold',
    '14U_GIRLS_PLATINUM':'14u-girls-platinum',
    'HS_GIRLS':'hs-girls'
  };

  // Official Google source names changed after the original 7.64.36 CSV snapshot.
  // Preserve stable WPHQ participant IDs for straightforward renames; truly new
  // teams (for example MID VALLEY replacing SD ECA in HS Girls) are synthesized.
  const TEAM_ALIASES={
    '12u-boys-gold':{
      '680BLUE':'680B',
      'CCUNITEDBLUE':'CCUNITEDB',
      'SOUTHCOASTRED':'SOUTHCOAST',
      'STANFORDBLACK':'STANFORDB'
    },
    '12u-boys-platinum':{
      'NORTHIRVINEBLACK':'NORTHIRVINEA',
      'STANFORDRED':'STANFORDA'
    },
    '12u-girls':{
      'ORANGECOUNTYWPC':'OCWPC'
    }
  };

  const clone=value=>JSON.parse(JSON.stringify(value));
  const clean=value=>String(value??'').replace(/^\uFEFF/,'').trim();
  const headerKey=value=>clean(value).toUpperCase().replace(/\s+/g,' ');
  const teamKey=value=>clean(value).toUpperCase().replace(/[^A-Z0-9]+/g,'');
  const slug=value=>clean(value).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'team';
  function normalizeGameNumber(value){
    let key=clean(value).toUpperCase().replace(/[^A-Z0-9]+/g,'');
    if(key.startsWith('10CPTAG'))key=`10CPT${key.slice('10CPTAG'.length)}`;
    return key;
  }
  function sourceTeamName(raw){
    const text=clean(raw);if(!text||!text.includes('-'))return null;
    const name=clean(text.slice(text.indexOf('-')+1));
    return name||null;
  }
  function scoreParts(value){
    const raw=clean(value);if(!raw)return null;
    const m=raw.match(/^(\d+)(?:\.(\d+))?$/);if(!m)return null;
    return {raw,regulation:Number(m[1]),shootout:m[2]==null?null:Number(m[2])};
  }
  function resultFromScores(white,dark){
    const w=scoreParts(white),d=scoreParts(dark);if(!w||!d)return null;
    if(w.regulation!==d.regulation)return {winner:w.regulation>d.regulation?'white':'dark',white:w,dark:d};
    if(w.shootout!=null&&d.shootout!=null&&w.shootout!==d.shootout)return {winner:w.shootout>d.shootout?'white':'dark',white:w,dark:d};
    return null;
  }
  function parseCSV(text){
    const rows=[];let row=[],cell='',quoted=false;
    const source=String(text||'').replace(/^\uFEFF/,'');
    for(let i=0;i<source.length;i++){
      const c=source[i],n=source[i+1];
      if(quoted){if(c==='"'&&n==='"'){cell+='"';i++;}else if(c==='"')quoted=false;else cell+=c;}
      else if(c==='"')quoted=true;
      else if(c===','){row.push(cell);cell='';}
      else if(c==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';}
      else cell+=c;
    }
    if(cell||row.length){row.push(cell);rows.push(row);}
    return rows;
  }
  function cellValue(cell){
    if(!cell)return'';
    if(cell.f!=null)return clean(cell.f);
    if(cell.v==null)return'';
    return clean(cell.v);
  }
  function rowsFromGviz(payload){
    const table=payload?.table;if(!table||!Array.isArray(table.rows))return[];
    const header=(table.cols||[]).map(col=>clean(col?.label||col?.id||''));
    const rows=table.rows.map(row=>(row.c||[]).map(cellValue));
    return [header,...rows];
  }
  function findHeader(rows){
    for(let i=0;i<Math.min(rows.length,30);i++){
      const keys=(rows[i]||[]).map(headerKey);
      if(keys.includes('GAME ID')&&keys.includes('WHITE TEAM')&&keys.includes('DARK TEAM')&&keys.includes('DIVISION'))return i;
    }
    return -1;
  }
  function parseRows(rows){
    const headerIndex=findHeader(rows);if(headerIndex<0)throw new Error('Google source header row was not found');
    const header=(rows[headerIndex]||[]).map(headerKey);
    const idx=name=>header.indexOf(name);
    const date=idx('DATE'),time=idx('TIME'),location=idx('LOCATION'),gameId=idx('GAME ID'),white=idx('WHITE TEAM'),dark=idx('DARK TEAM'),comments=idx('COMMENTS'),division=idx('DIVISION');
    const scoreIndexes=header.map((h,i)=>h==='S'?i:-1).filter(i=>i>=0);
    if([date,time,location,gameId,white,dark,division].some(i=>i<0)||scoreIndexes.length<2)throw new Error('Google source columns do not match the ECC master schema');
    const out=[];
    for(const row of rows.slice(headerIndex+1)){
      const rawGame=clean(row[gameId]);if(!rawGame)continue;
      out.push({
        date:clean(row[date]),time:clean(row[time]),location:clean(row[location]),gameId:rawGame,gameKey:normalizeGameNumber(rawGame),
        whiteRaw:clean(row[white]),whiteScore:clean(row[scoreIndexes[0]]),darkRaw:clean(row[dark]),darkScore:clean(row[scoreIndexes[1]]),
        comments:comments>=0?clean(row[comments]):'',divisionCode:clean(row[division])
      });
    }
    return out;
  }
  function expectedDivisionFor(bundle,sourceCode){return DIVISION_MAP[sourceCode]||null;}
  function validateSource(rows,bundle){
    if(!bundle?.event||bundle.event.id!==EVENT_ID)throw new Error('ECC live source was applied to the wrong event');
    const baselineGames=new Map((bundle.games||[]).map(g=>[normalizeGameNumber(g.gameNumber),g]));
    const seen=new Map(),divisions=new Set();
    for(const row of rows){
      if(seen.has(row.gameKey))throw new Error(`Duplicate Google game ID ${row.gameId}`);
      seen.set(row.gameKey,row);
      const baseline=baselineGames.get(row.gameKey);if(!baseline)throw new Error(`Unknown Google game ID ${row.gameId}`);
      const expected=expectedDivisionFor(bundle,row.divisionCode);if(!expected)throw new Error(`Unknown Google division ${row.divisionCode}`);
      if(expected!==baseline.divisionId)throw new Error(`Division mismatch for ${row.gameId}: ${row.divisionCode} != ${baseline.divisionId}`);
      divisions.add(row.divisionCode);
    }
    const missing=[...baselineGames.keys()].filter(key=>!seen.has(key));
    if(rows.length!==EXPECTED_GAMES||seen.size!==EXPECTED_GAMES||missing.length)throw new Error(`Expected ${EXPECTED_GAMES} ECC games; received ${seen.size}; missing ${missing.slice(0,8).join(', ')||'none'}`);
    if(divisions.size!==EXPECTED_DIVISIONS)throw new Error(`Expected ${EXPECTED_DIVISIONS} ECC divisions; received ${divisions.size}`);
    return {gameCount:seen.size,divisionCount:divisions.size,finalGameCount:rows.filter(r=>Boolean(resultFromScores(r.whiteScore,r.darkScore))).length};
  }
  function participantObject(team){
    return {participantId:team.participantId,name:team.name,teamId:team.teamId??null,clubId:team.clubId??null,identityStatus:team.identityStatus||'live_source',identityMatchType:team.identityMatchType||'official_google_source'};
  }
  function buildTeamResolver(bundle,rows){
    let teams=(bundle.teams||[]).map(clone);
    const divisionById=new Map((bundle.divisions||[]).map(d=>[d.id,d]));
    const byDivision=new Map();
    for(const team of teams){
      if(!byDivision.has(team.divisionId))byDivision.set(team.divisionId,new Map());
      byDivision.get(team.divisionId).set(teamKey(team.name),team);
    }
    const resolvedBySource=new Map(),activeIds=new Set();
    function resolve(divisionId,name){
      const sourceKey=teamKey(name),cacheKey=`${divisionId}|${sourceKey}`;if(resolvedBySource.has(cacheKey))return resolvedBySource.get(cacheKey);
      const map=byDivision.get(divisionId)||new Map();
      let team=map.get(sourceKey)||null;
      if(!team){const aliasTarget=TEAM_ALIASES[divisionId]?.[sourceKey];if(aliasTarget)team=map.get(aliasTarget)||null;}
      if(team){
        if(clean(team.name)!==clean(name))team.name=clean(name);
      }else{
        const division=divisionById.get(divisionId)||{};
        team={
          participantId:`live-source-team-${slug(divisionId)}-${slug(name)}`,name:clean(name),teamId:null,clubId:null,identityStatus:'live_source',identityMatchType:'official_google_source',
          divisionId,divisionLabel:division.label||divisionId,ageGroup:division.ageGroup||'',gender:division.gender||'',division:division.division||'',divisionTier:division.divisionTier||'',
          gameIds:[],wins:0,losses:0,ties:0,clubName:null,clubSlug:null,teamPage:null,clubPage:null,logo:null,primaryColor:'#0f172a',secondaryColor:'#e2e8f0',rank:null,rating:null,finish:null,finishLabel:null,
          record:{wins:0,losses:0,ties:0,display:'Scheduled'}
        };
        teams.push(team);if(!byDivision.has(divisionId))byDivision.set(divisionId,new Map());byDivision.get(divisionId).set(sourceKey,team);
      }
      resolvedBySource.set(cacheKey,team);activeIds.add(team.participantId);return team;
    }
    for(const row of rows){
      const divisionId=DIVISION_MAP[row.divisionCode];
      for(const raw of [row.whiteRaw,row.darkRaw]){const name=sourceTeamName(raw);if(name)resolve(divisionId,name);}
    }
    teams=teams.filter(team=>activeIds.has(team.participantId));
    return {teams,resolve,activeIds};
  }
  function dateIso(value,year=2026){
    const text=clean(value);if(!text)return null;
    if(/^\d{4}-\d{2}-\d{2}$/.test(text))return text;
    let m=text.match(/^(\d{1,2})-([A-Za-z]{3})$/);if(!m)m=text.match(/^([A-Za-z]{3})\s+(\d{1,2})$/)?.reverse?.();
    if(m){
      const months={JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12};
      const day=Number(m[1]),month=months[String(m[2]).toUpperCase()];if(month)return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    }
    const slash=text.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);if(slash){let y=slash[3]?Number(slash[3]):year;if(y<100)y+=2000;return `${y}-${String(Number(slash[1])).padStart(2,'0')}-${String(Number(slash[2])).padStart(2,'0')}`;}
    return null;
  }
  function mergeBundle(baseBundle,rows,meta={}){
    const validation=validateSource(rows,baseBundle),bundle=clone(baseBundle),sourceByGame=new Map(rows.map(row=>[row.gameKey,row]));
    const resolver=buildTeamResolver(bundle,rows);bundle.teams=resolver.teams;
    const year=Number(bundle.event?.eventYear||bundle.event?.season||2026)||2026;
    let finalCount=0;
    bundle.games=(bundle.games||[]).map(original=>{
      const game=clone(original),row=sourceByGame.get(normalizeGameNumber(game.gameNumber));if(!row)return game;
      const divisionId=game.divisionId;
      const liveWhiteName=sourceTeamName(row.whiteRaw),liveDarkName=sourceTeamName(row.darkRaw);
      const liveWhite=liveWhiteName?resolver.resolve(divisionId,liveWhiteName):null,liveDark=liveDarkName?resolver.resolve(divisionId,liveDarkName):null;
      if(liveWhite){game.white=participantObject(liveWhite);game.routing=game.routing||{};game.routing.white={...(game.routing.white||{}),resolvedParticipantId:liveWhite.participantId,candidateParticipantIds:[liveWhite.participantId],candidateNames:[liveWhite.name]};}
      if(liveDark){game.dark=participantObject(liveDark);game.routing=game.routing||{};game.routing.dark={...(game.routing.dark||{}),resolvedParticipantId:liveDark.participantId,candidateParticipantIds:[liveDark.participantId],candidateNames:[liveDark.name]};}
      const iso=dateIso(row.date,year);if(iso){game.dateIso=iso;game.dateLabel=row.date||game.dateLabel;}if(row.time)game.timeLabel=row.time;if(row.location)game.venue=row.location;if(row.comments)game.stage=row.comments;
      const result=resultFromScores(row.whiteScore,row.darkScore);
      if(result&&liveWhite&&liveDark){
        finalCount+=1;game.status='final';game.scoreState='official_google_result';
        game.scores={white:result.white.regulation,dark:result.dark.regulation,whiteRaw:result.white.raw,darkRaw:result.dark.raw,whiteRegulation:result.white.regulation,darkRegulation:result.dark.regulation,whiteShootout:result.white.shootout,darkShootout:result.dark.shootout};
        game.shootout=(result.white.shootout!=null&&result.dark.shootout!=null)?{white:result.white.shootout,dark:result.dark.shootout}:null;
        const winner=result.winner==='white'?liveWhite:liveDark,loser=result.winner==='white'?liveDark:liveWhite;
        game.outcome={kind:'decided',winnerTeamId:winner.teamId??null,loserTeamId:loser.teamId??null,winnerParticipantId:winner.participantId,winnerName:winner.name,loserParticipantId:loser.participantId,loserName:loser.name};
      }else{
        game.status='scheduled';game.scoreState='empty';
        game.scores={...(game.scores||{}),white:null,dark:null,whiteRaw:null,darkRaw:null,whiteRegulation:null,darkRegulation:null,whiteShootout:null,darkShootout:null};
        game.shootout=null;game.outcome={kind:'pending',winnerTeamId:null,loserTeamId:null,winnerParticipantId:null,winnerName:null,loserParticipantId:null,loserName:null};
      }
      return game;
    });
    const teamMap=new Map(bundle.teams.map(t=>[t.participantId,t]));
    for(const team of bundle.teams){team.gameIds=[];team.wins=0;team.losses=0;team.ties=0;team.record={wins:0,losses:0,ties:0,display:'Scheduled'};}
    for(const game of bundle.games){
      const w=game.white?.participantId,d=game.dark?.participantId;if(w&&teamMap.has(w))teamMap.get(w).gameIds.push(game.id);if(d&&teamMap.has(d))teamMap.get(d).gameIds.push(game.id);
      if(game.status!=='final'||!w||!d||!teamMap.has(w)||!teamMap.has(d))continue;
      if(game.outcome?.winnerParticipantId===w){teamMap.get(w).wins++;teamMap.get(d).losses++;}
      else if(game.outcome?.winnerParticipantId===d){teamMap.get(d).wins++;teamMap.get(w).losses++;}
      else{teamMap.get(w).ties++;teamMap.get(d).ties++;}
    }
    for(const team of bundle.teams){
      const played=team.wins+team.losses+team.ties;team.record={wins:team.wins,losses:team.losses,ties:team.ties,display:played?(team.ties?`${team.wins}-${team.losses}-${team.ties}`:`${team.wins}-${team.losses}`):'Scheduled'};
    }
    for(const division of bundle.divisions||[]){
      const games=bundle.games.filter(g=>g.divisionId===division.id),teams=bundle.teams.filter(t=>t.divisionId===division.id);division.gameCount=games.length;division.finalGameCount=games.filter(g=>g.status==='final').length;division.scheduledGameCount=games.length-division.finalGameCount;division.teamCount=teams.length;division.status=division.finalGameCount?'in_progress':'schedule_published';
    }
    bundle.summary={...(bundle.summary||{}),gameCount:bundle.games.length,finalGameCount:finalCount,scheduledGameCount:bundle.games.length-finalCount,teamCount:bundle.teams.length,divisionCount:(bundle.divisions||[]).length};
    bundle.event={...(bundle.event||{}),status:finalCount?'in_progress':'schedule_published',officialSourceUrl:OFFICIAL_URL,sourcePolicy:'Official 2026 EC Cup Google Sheet · MASTER BY DIVISION is the live result source. Water Polo HQ reconciles the sheet to the verified 335-game schedule by stable game ID; official posted scores and resolved team assignments overlay the verified bracket-routing baseline. No results are inferred.'};
    bundle.capabilities={...(bundle.capabilities||{}),liveRefresh:true,refreshSeconds:60,refreshMode:'google_gviz_direct',scoreSourceStatus:'official_google_live_results',liveSourceProvider:'google_sheets',liveSourceSheetName:SHEET_NAME};
    bundle.liveSource={provider:'google_sheets',spreadsheetId:SHEET_ID,sheetName:SHEET_NAME,officialUrl:OFFICIAL_URL,release:RELEASE,fetchedAt:meta.fetchedAt||new Date().toISOString(),method:meta.method||'google_gviz',gameCount:validation.gameCount,divisionCount:validation.divisionCount,finalGameCount:validation.finalGameCount};
    return bundle;
  }
  function progress(bundle){return Number(bundle?.summary?.finalGameCount||0);}
  function csvUrl(){return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;}
  function jsonpUrl(callback){return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json;responseHandler:${callback}&headers=1&sheet=${encodeURIComponent(SHEET_NAME)}`;}
  function fetchJsonp(){
    if(typeof document==='undefined')return Promise.reject(new Error('JSONP requires a browser'));
    return new Promise((resolve,reject)=>{
      const callback=`wphqEccGviz_${Date.now()}_${Math.random().toString(36).slice(2)}`,script=document.createElement('script');let timer,done=false;
      const cleanup=()=>{clearTimeout(timer);try{delete globalThis[callback];}catch(_){globalThis[callback]=undefined;}script.remove();};
      globalThis[callback]=payload=>{if(done)return;done=true;cleanup();try{if(payload?.status==='error')throw new Error('Google returned a query error');resolve({rows:parseRows(rowsFromGviz(payload)),method:'google_gviz_jsonp'});}catch(error){reject(error);}};
      timer=setTimeout(()=>{if(done)return;done=true;cleanup();reject(new Error('Google JSONP timeout'));},JSONP_TIMEOUT_MS);
      script.onerror=()=>{if(done)return;done=true;cleanup();reject(new Error('Google JSONP failed'));};
      script.src=`${jsonpUrl(callback)}&_=${Date.now()}`;document.head.appendChild(script);
    });
  }
  async function fetchCsv(){
    if(typeof fetch!=='function')throw new Error('fetch unavailable');
    const controller=typeof AbortController==='function'?new AbortController():null,timer=setTimeout(()=>controller?.abort(),FETCH_TIMEOUT_MS);
    try{const response=await fetch(`${csvUrl()}&_=${Date.now()}`,{cache:'no-store',redirect:'follow',signal:controller?.signal});if(!response.ok)throw new Error(`Google CSV HTTP ${response.status}`);const text=await response.text();const start=text.trimStart().slice(0,600).toLowerCase();if(start.startsWith('<!doctype')||start.startsWith('<html')||start.includes('accounts.google.com'))throw new Error('Google returned HTML instead of CSV');return {rows:parseRows(parseCSV(text)),method:'google_gviz_csv'};}catch(error){if(error?.name==='AbortError')throw new Error('Google CSV timeout');throw error;}finally{clearTimeout(timer);}
  }
  function firstSuccess(loaders){
    return new Promise((resolve,reject)=>{let pending=loaders.length,settled=false;const errors=[];for(const loader of loaders)Promise.resolve().then(loader).then(value=>{if(settled)return;settled=true;resolve(value);}).catch(error=>{errors.push(error?.message||String(error));pending-=1;if(!pending&&!settled)reject(new Error(errors.join(' | ')));});});
  }
  async function fetchLive(){return firstSuccess([fetchJsonp,fetchCsv]);}
  function writeCache(source){try{localStorage.setItem(CACHE_KEY,JSON.stringify({release:RELEASE,savedAt:new Date().toISOString(),source}));}catch(_){}}
  function readCache(){try{const cached=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');return cached?.source?.rows?cached:null;}catch{return null;}}
  function supports(bundle){return bundle?.event?.id===EVENT_ID;}
  async function refresh(baseBundle,currentBundle=null){
    const live=await fetchLive();validateSource(live.rows,baseBundle);const merged=mergeBundle(baseBundle,live.rows,{method:live.method,fetchedAt:new Date().toISOString()});
    if(currentBundle&&progress(merged)<progress(currentBundle))throw new Error(`Google source appears older (${progress(merged)} finals vs ${progress(currentBundle)})`);
    writeCache(live);return merged;
  }
  function cached(baseBundle,currentBundle=null){
    const cache=readCache();if(!cache)return null;
    try{validateSource(cache.source.rows,baseBundle);const merged=mergeBundle(baseBundle,cache.source.rows,{method:`${cache.source.method||'google'}_cache`,fetchedAt:cache.savedAt});if(currentBundle&&progress(merged)<progress(currentBundle))return null;return merged;}catch{return null;}
  }

  return {RELEASE,EVENT_ID,SHEET_ID,SHEET_NAME,OFFICIAL_URL,REFRESH_MS,DIVISION_MAP,TEAM_ALIASES,normalizeGameNumber,sourceTeamName,scoreParts,resultFromScores,parseCSV,rowsFromGviz,parseRows,validateSource,mergeBundle,progress,csvUrl,jsonpUrl,supports,refresh,cached};
});
