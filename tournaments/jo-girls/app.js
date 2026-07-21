
const SHEET_ID='1TyGB8m-dH1Q56v8Lpwdvw-S7kjxgP8MWsirsAeCYVNw';
const APP_VERSION='7.51.0';
const DATASETS=[{"id":"10u-girls-championship","age":"10U","division":"Girls Championship (D1)","gid":"1690842489","sheetName":"10U_F_Champ-18 teams","gidAliases":["1690842489"]},{"id":"10u-coed-championship","age":"10U","division":"Coed Championship (D1)","gid":"995024268","sheetName":"10U_Coed_Champ_36","gidAliases":["995024268","2041957360"]},{"id":"10u-girls-classic","age":"10U","division":"Girls Classic (D2)","gid":"1824277279","sheetName":"10U_Coed_Classic 22 from 23","gidAliases":["1824277279","597397535"]},{"id":"12u-coed-championship","age":"12U","division":"Coed Championship (D1)","gid":"1233368070","sheetName":"12U_Coed_Champ-45","gidAliases":["1233368070","2012252190"]},{"id":"12u-girls-championship","age":"12U","division":"Girls Championship (D1)","gid":"1025107975","sheetName":"12U_F_Champ-52","gidAliases":["1025107975","1128927098"]},{"id":"14u-girls-championship","age":"14U","division":"Girls Championship (D1)","gid":"490739644","sheetName":"14U_F_Champ","gidAliases":["490739644","1268677491"]},{"id":"14u-girls-classic","age":"14U","division":"Girls Classic (D2)","gid":"1034305520","sheetName":"14U_F_Classic-39 from 40","gidAliases":["1034305520","252316141"]},{"id":"16u-girls-championship","age":"16U","division":"Girls Championship (D1)","gid":"1614332560","sheetName":"16U_F_Champ","gidAliases":["1614332560","61950596"]},{"id":"16u-girls-classic","age":"16U","division":"Girls Classic (D2)","gid":"1031667515","sheetName":"16U_F_Classic-45","gidAliases":["1031667515","901188675"]},{"id":"18u-girls-championship","age":"18U","division":"Girls Championship (D1)","gid":"69636405","sheetName":"18U_F_Champ","gidAliases":["69636405","934738630"]},{"id":"18u-girls-classic","age":"18U","division":"Girls Classic (D2)","gid":"1267400335","sheetName":"18U_F_Classic-44","gidAliases":["1267400335","265773689"]}];
const EMBEDDED_SNAPSHOT_CSV={};
const EMBEDDED_FALLBACKS={};
const RELAY_EVENT_ID='2026-jo-weekend-1';
const RELAY_BASE_URL='https://raw.githubusercontent.com/littlezip12/CPI/cpi-live-relay/data/tournaments/live-relay';
const RELAY_FETCH_TIMEOUT_MS=4500;
const RELAY_FRESH_MAX_AGE_MS=20*60*1000;
const REFRESH_MS=120000;
const ACTIVE_REFRESH_MIN_MS=30000;
const LIVE_FETCH_TIMEOUT_MS=5500;
const LIVE_JSONP_TIMEOUT_MS=6500;
const LIVE_HEDGE_DELAY_MS=650;
const LIVE_INITIAL_CANDIDATES=3;
const LIVE_RETRY_DELAYS_MS=[15000,30000,60000];
const PREFERRED_SOURCE_PREFIX='joGirlsPreferredLiveV1:';
const CACHE_PREFIX='joGirlsScheduleV5:';
const ACRONYMS=new Set(['SD','CDM','LB','CC','WPC','CHAWP','LOWPO','SHAQ','OCWPC','ECA','ASA','CMAC','TPC','WCAC','SET','LA','OC','USA','CIU']);
const age=$('age'),division=$('division'),team=$('team'),summary=$('summary'),next=$('next'),journey=$('journey'),paths=$('paths'),potential=$('potential'),schedule=$('schedule'),search=$('search'),day=$('day'),share=$('share');
let DATA={teams:[],games:[]},RESOLVED={games:[],map:new Map(),slots:new Map(),placements:new Map(),seedLookup:new Map()},loadVersion=0,refreshTimer=null,retryTimer=null,lastLoadAttemptAt=0;
const activeLoads=new Map(),liveFailureCounts=new Map();

function $(id){return document.getElementById(id)}
function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function currentConfig(){return DATASETS.find(d=>d.id===division.value)||null}
function identityContext(){const config=currentConfig();const label=String(config?.division||'');const gender=/girls/i.test(label)?'Girls':/boys/i.test(label)?'Boys':/coed/i.test(label)?'Coed':'';return{season:'2026',ageGroup:config?.age||'',gender}}
function canonicalIdentity(name){return window.CPIIdentity?.resolveTeam?.(name,identityContext())||null}
function identityAttributes(name){const identity=canonicalIdentity(name);return identity?` data-cpi-team-id="${esc(identity.id)}" data-cpi-club-id="${esc(identity.clubId)}"`:''}
function updateSheetLink(){
  const config=currentConfig(),link=$('sheetLink');
  if(!link)return;
  if(!config){
    link.href='#';
    link.setAttribute('aria-disabled','true');
    return;
  }
  link.href=`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${config.gid}#gid=${config.gid}`;
  link.setAttribute('aria-label',`View ${config.age} ${config.division} full division schedule in Google Sheets`);
  link.removeAttribute('aria-disabled');
}

function unique(values){return [...new Set(values.filter(Boolean).map(String))]}
function configuredSheetNames(config){return unique([config.sheetName,...(config.sheetNameAliases||[])])}
function datasetUrls(config){
  const root=`https://docs.google.com/spreadsheets/d/${SHEET_ID}`,urls=[];
  for(const name of configuredSheetNames(config))urls.push(`${root}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`);
  for(const gid of unique([config.gid,...(config.gidAliases||[])])){
    urls.push(`${root}/gviz/tq?tqx=out:csv&gid=${encodeURIComponent(gid)}`);
    urls.push(`${root}/export?format=csv&gid=${encodeURIComponent(gid)}`);
  }
  return unique(urls);
}
function jsonpUrls(config,callbackName){
  const root=`https://docs.google.com/spreadsheets/d/${SHEET_ID}`,urls=[];
  for(const name of configuredSheetNames(config))urls.push(`${root}/gviz/tq?tqx=out:json;responseHandler:${callbackName}&sheet=${encodeURIComponent(name)}`);
  for(const gid of unique([config.gid,...(config.gidAliases||[])]))urls.push(`${root}/gviz/tq?tqx=out:json;responseHandler:${callbackName}&gid=${encodeURIComponent(gid)}`);
  return unique(urls);
}
function exportUrl(config){return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${config.gid}#gid=${config.gid}`}
function snapshotUrl(config){return config.snapshotPath||`../../data/tournaments/raw/2026-jo-weekend-1/${encodeURIComponent(config.id)}.csv`}

function normalizeHeader(value){return String(value||'').replace(/^\uFEFF/,'').trim().toLowerCase().replace(/\s+/g,' ')}
function parseCSV(text){let rows=[],row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(quoted){if(c==='"'&&n==='"'){cell+='"';i++}else if(c==='"')quoted=false;else cell+=c}else if(c==='"')quoted=true;else if(c===','){row.push(cell);cell=''}else if(c==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell=''}else cell+=c}if(cell||row.length){row.push(cell);rows.push(row)}return rows}
function scoreParts(value){const raw=String(value??'').trim();const m=raw.match(/^(\d+)(?:\.(\d+))?$/);return m?{raw,regulation:Number(m[1]),shootout:m[2]==null?null:Number(m[2])}:null}
function isScoreCell(value){return scoreParts(value)!==null}
function gameScoreParts(g){return{white:scoreParts(g?.whiteScore),dark:scoreParts(g?.darkScore)}}
function scoreOutcome(g){const p=gameScoreParts(g);if(!p.white||!p.dark)return null;if(p.white.regulation!==p.dark.regulation)return p.white.regulation>p.dark.regulation?'white':'dark';if(p.white.shootout!=null&&p.dark.shootout!=null&&p.white.shootout!==p.dark.shootout)return p.white.shootout>p.dark.shootout?'white':'dark';return null}
function scoreDisplay(g){const p=gameScoreParts(g);if(!p.white||!p.dark)return'';if(p.white.shootout!=null||p.dark.shootout!=null)return`${p.white.regulation}–${p.dark.regulation} (SO ${p.white.shootout??0}–${p.dark.shootout??0})`;return`${p.white.regulation}–${p.dark.regulation}`}
function headerIndex(row,names){const normalized=row.map(normalizeHeader);for(const name of names){const i=normalized.indexOf(name);if(i>=0)return i}return-1}
function headerMap(row){
  const date=headerIndex(row,['date']),time=headerIndex(row,['time']),type=headerIndex(row,['type','stage']),location=headerIndex(row,['location','venue']);
  const game=headerIndex(row,['gm #','gm#','game #','game','gm']),white=headerIndex(row,['white','team 1']),dark=headerIndex(row,['dark','team 2']);
  const winnerTo=headerIndex(row,['w to #','w to','winner to','win to']),loserTo=headerIndex(row,['l to #','l to','loser to','loss to']),gmid=headerIndex(row,['gmid','gm id','game id']);
  if([date,time,game,white,dark,gmid].some(i=>i<0))return null;
  const normalized=row.map(normalizeHeader);
  const whiteScore=normalized.findIndex((v,i)=>i>white&&i<dark&&(v==='s'||v==='score'));
  const darkScore=normalized.findIndex((v,i)=>i>dark&&(winnerTo<0||i<winnerTo)&&(v==='s'||v==='score'));
  const stageDetail=gmid>=0?gmid+2:-1;
  return{date,time,type,stageDetail,location,game,white,whiteScore,dark,darkScore,winnerTo,loserTo,gmid};
}
function normalizeGameNumber(value){const raw=String(value||'').trim().toUpperCase();return /^\d+$/.test(raw)?Number(raw):raw}
function validGameNumber(value){return /^\d+[A-Z]?$/.test(String(value||'').trim())}
function validGameId(value){return /^\d{2}[A-Z]+-\d+[A-Z]?$/i.test(String(value||'').trim())}
function gameNumberFromId(value){const match=String(value||'').trim().toUpperCase().match(/^\d{2}[A-Z]+-(\d+[A-Z]?)$/);return match?match[1]:''}
function mappedGame(row,map){
  const get=i=>i>=0?String(row[i]||'').trim():'';
  const gmid=get(map.gmid),date=get(map.date),time=get(map.time),gameRaw=get(map.game)||gameNumberFromId(gmid);
  if(!validGameNumber(gameRaw)||!validGameId(gmid)||!date||!time)return null;
  return{date,time,type:get(map.type),stageDetail:get(map.stageDetail),location:get(map.location),game:normalizeGameNumber(gameRaw),whiteRaw:get(map.white),whiteScore:get(map.whiteScore),darkRaw:get(map.dark),darkScore:get(map.darkScore),winnerTo:normalizeDestination(get(map.winnerTo)),loserTo:normalizeDestination(get(map.loserTo)),gmid};
}
function inferredGame(row){
  const cells=row.map(v=>String(v??'').trim());
  let gmidIndex=-1;for(let i=cells.length-1;i>=0;i--){if(validGameId(cells[i])){gmidIndex=i;break}}
  if(gmidIndex<0)return null;
  const gmid=cells[gmidIndex],derivedGame=gameNumberFromId(gmid);if(!derivedGame)return null;
  const dateIndex=cells.findIndex((v,i)=>i<gmidIndex&&(/^\d{1,2}-[A-Za-z]{3}$/.test(v)||/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(v)));
  if(dateIndex<0)return null;
  const timeIndex=cells.findIndex((v,i)=>i>dateIndex&&i<gmidIndex&&/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(v));
  if(timeIndex<0)return null;
  const structuralGameIndex=gmidIndex-7;let gameIndex=structuralGameIndex>timeIndex?structuralGameIndex:-1;if(gameIndex<0||(!validGameNumber(cells[gameIndex])&&cells[gameIndex]))gameIndex=cells.findIndex((v,i)=>i>timeIndex&&i<gmidIndex&&validGameNumber(v));if(gameIndex<0)return null;
  const gameRaw=validGameNumber(cells[gameIndex])?cells[gameIndex]:derivedGame;
  const destinationStart=gmidIndex-2;
  if(destinationStart<=gameIndex+1)return null;
  const participantIndices=[];
  for(let i=gameIndex+1;i<destinationStart;i++){
    const v=cells[i];
    if(v&&!isScoreCell(v))participantIndices.push(i);
  }
  if(participantIndices.length<2){
    for(let i=gameIndex+1;i<destinationStart&&participantIndices.length<2;i++)if(cells[i]&&!participantIndices.includes(i))participantIndices.push(i);
  }
  if(participantIndices.length<2)return null;
  const white=participantIndices[0],dark=participantIndices[1];
  const scoreBetween=cells.slice(white+1,dark).find(isScoreCell)||'';
  const scoreAfter=cells.slice(dark+1,destinationStart).find(isScoreCell)||'';
  return{
    date:cells[dateIndex],time:cells[timeIndex],type:cells[timeIndex+1]||'',stageDetail:cells[gmidIndex+2]||'',location:cells[gameIndex-1]||'',game:normalizeGameNumber(gameRaw),
    whiteRaw:cells[white],whiteScore:scoreBetween,darkRaw:cells[dark],darkScore:scoreAfter,
    winnerTo:normalizeDestination(cells[gmidIndex-2]),loserTo:normalizeDestination(cells[gmidIndex-1]),gmid:cells[gmidIndex]
  };
}

function parseRows(rows){
  const games=[];let map=null;
  for(const row of rows){
    const candidate=headerMap(row);if(candidate){map=candidate;continue}
    const game=(map&&mappedGame(row,map))||inferredGame(row);
    if(game)games.push(game);
  }
  return dedupeGames(games);
}
function parseLive(text){return parseRows(parseCSV(String(text||'').replace(/^\uFEFF/,'')))}
function cellValue(cell){if(!cell)return'';if(cell.f!=null)return String(cell.f).trim();if(cell.v==null)return'';if(typeof cell.v==='string')return cell.v.trim();return String(cell.v).trim()}
function rowsFromGviz(payload){
  const table=payload&&payload.table;if(!table||!Array.isArray(table.rows))return[];
  return table.rows.map(row=>(row.c||[]).map(cellValue));
}
function fetchJsonp(url,timeoutMs=LIVE_JSONP_TIMEOUT_MS){
  return new Promise((resolve,reject)=>{
    const callback=`joJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script=document.createElement('script');
    let timer,settled=false;
    function cleanup(){clearTimeout(timer);delete window[callback];script.remove()}
    window[callback]=(payload)=>{if(settled)return;settled=true;cleanup();resolve(payload)};
    timer=setTimeout(()=>{if(settled)return;settled=true;cleanup();reject(new Error('Google JSONP timeout'))},timeoutMs);
    script.onerror=()=>{if(settled)return;settled=true;cleanup();reject(new Error('Google JSONP failed'))};
    script.src=url.replace(/responseHandler:[^&]+/,`responseHandler:${callback}`);
    document.head.appendChild(script);
  });
}

function dedupeGames(games){const seen=new Map();for(const g of games)seen.set(`${g.gmid}|${g.game}`,g);return[...seen.values()]}
function looksLikeHtml(text){const start=String(text||'').trimStart().slice(0,160).toLowerCase();return start.startsWith('<!doctype')||start.startsWith('<html')||start.includes('<body')||start.includes('accounts.google.com')}

function validateGames(games){
  const teams=teamsFromGames(games);
  if(games.length<5||teams.length<2)throw new Error(`Only ${games.length} games and ${teams.length} teams returned`);
  return{games,teams};
}
async function fetchVerifiedSnapshot(config){
  const url=snapshotUrl(config),controller=typeof AbortController==='function'?new AbortController():null;
  const timer=setTimeout(()=>controller?.abort(),LIVE_FETCH_TIMEOUT_MS);
  try{
    const response=await fetch(`${url}${url.includes('?')?'&':'?'}_=${Date.now()}`,{cache:'no-store',signal:controller?.signal});
    if(!response.ok)throw new Error(`Snapshot HTTP ${response.status}`);
    const text=await response.text();if(looksLikeHtml(text))throw new Error('Snapshot returned HTML instead of CSV');
    const result=validateGames(parseLive(text));result.url=url;result.method='verified snapshot';result.isFallback=true;result.updatedAt=response.headers?.get?.('last-modified')||config.snapshotUpdatedAt||null;return result;
  }catch(error){if(error?.name==='AbortError')throw new Error('Verified snapshot timeout');throw error}
  finally{clearTimeout(timer)}
}

function relayFileUrl(config,kind){
  const suffix=kind==='status'?`status/${RELAY_EVENT_ID}/${encodeURIComponent(config.id)}.json`:`${RELAY_EVENT_ID}/${encodeURIComponent(config.id)}.csv`;
  return `${RELAY_BASE_URL}/${suffix}`;
}
function relayStatusFresh(status){
  const checked=Date.parse(status?.checkedAt||status?.lastSuccessAt||'');
  return status?.state==='live'&&Number.isFinite(checked)&&(Date.now()-checked)<=RELAY_FRESH_MAX_AGE_MS;
}
async function fetchRelayDataset(config){
  const controller=typeof AbortController==='function'?new AbortController():null;
  const timer=setTimeout(()=>controller?.abort(),RELAY_FETCH_TIMEOUT_MS),nonce=Date.now();
  try{
    const options={cache:'no-store',signal:controller?.signal,headers:{Accept:'application/json,text/csv,text/plain,*/*'}};
    const [statusResponse,csvResponse]=await Promise.all([
      fetch(`${relayFileUrl(config,'status')}?_=${nonce}`,options),
      fetch(`${relayFileUrl(config,'csv')}?_=${nonce}`,options)
    ]);
    if(!statusResponse.ok)throw new Error(`Relay status HTTP ${statusResponse.status}`);
    if(!csvResponse.ok)throw new Error(`Relay CSV HTTP ${csvResponse.status}`);
    const [status,text]=await Promise.all([statusResponse.json(),csvResponse.text()]);
    if(status?.eventId!==RELAY_EVENT_ID||status?.divisionId!==config.id)throw new Error('Relay metadata does not match the selected division');
    if(looksLikeHtml(text))throw new Error('Relay returned HTML instead of CSV');
    const result=validateGames(parseLive(text));
    result.url=relayFileUrl(config,'csv');
    result.method='CPI live relay';
    result.sourceLabel='CPI live relay';
    result.updatedAt=status.lastSuccessAt||status.contentUpdatedAt||status.checkedAt||null;
    result.checkedAt=status.checkedAt||null;
    result.isRelay=true;
    result.isFallback=!relayStatusFresh(status);
    result.relayStatus=status;
    return result;
  }catch(error){
    if(error?.name==='AbortError')throw new Error('CPI live relay timeout');
    throw error;
  }finally{clearTimeout(timer)}
}
function endpointMethod(kind,url){const route=url.includes('sheet=')?'sheet-name':url.includes('/export?')?'export':'GID';return`${route} ${kind.toUpperCase()}`}
function preferredEndpointKey(config){return`${PREFERRED_SOURCE_PREFIX}${config.id}`}
function readPreferredLiveEndpoint(config){try{const value=JSON.parse(localStorage.getItem(preferredEndpointKey(config))||'null');return value&&value.kind&&value.url?value:null}catch{return null}}
function writePreferredLiveEndpoint(config,candidate){try{localStorage.setItem(preferredEndpointKey(config),JSON.stringify({kind:candidate.kind,url:candidate.url,method:candidate.method,verifiedAt:new Date().toISOString()}))}catch{}}
function liveEndpointCandidates(config){
  const csv=datasetUrls(config).map(url=>({kind:'csv',url,method:endpointMethod('csv',url)}));
  const jsonp=jsonpUrls(config,'__CALLBACK__').map(url=>({kind:'jsonp',url,method:endpointMethod('jsonp',url)}));
  const all=[...csv.filter(c=>c.url.includes('sheet=')),...jsonp.filter(c=>c.url.includes('sheet=')),...csv.filter(c=>!c.url.includes('sheet=')&&!c.url.includes('/export?')),...jsonp.filter(c=>!c.url.includes('sheet=')),...csv.filter(c=>c.url.includes('/export?'))];
  const preferred=readPreferredLiveEndpoint(config),ordered=preferred?[preferred,...all]:all,seen=new Set();
  return ordered.filter(candidate=>{const key=`${candidate.kind}|${candidate.url}`;if(seen.has(key))return false;seen.add(key);return true});
}
async function fetchCsvCandidate(candidate){
  const controller=typeof AbortController==='function'?new AbortController():null;
  const timer=setTimeout(()=>controller?.abort(),LIVE_FETCH_TIMEOUT_MS);
  try{
    const url=`${candidate.url}${candidate.url.includes('?')?'&':'?'}_=${Date.now()}`;
    const response=await fetch(url,{cache:'no-store',redirect:'follow',signal:controller?.signal});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const text=await response.text();if(looksLikeHtml(text))throw new Error('Google returned HTML instead of CSV');
    return validateGames(parseLive(text));
  }catch(error){if(error?.name==='AbortError')throw new Error('Google CSV timeout');throw error}
  finally{clearTimeout(timer)}
}
async function loadLiveCandidate(candidate){
  if(candidate.kind==='csv')return fetchCsvCandidate(candidate);
  const payload=await fetchJsonp(candidate.url);
  if(payload&&payload.status==='error')throw new Error(payload.errors?.map(e=>e.detailed_message||e.message).join('; ')||'Google returned query error');
  return validateGames(parseRows(rowsFromGviz(payload)));
}
function hedgedFirstSuccess(candidates,loader,hedgeDelayMs=LIVE_HEDGE_DELAY_MS,initialCount=LIVE_INITIAL_CANDIDATES){
  return new Promise((resolve,reject)=>{
    const queue=[...candidates],errors=[];let pending=0,settled=false,waveTwoStarted=false,hedgeTimer=null;
    const first=queue.splice(0,Math.max(1,initialCount));
    function finishFailure(){if(settled||pending)return;if(!waveTwoStarted&&queue.length){startWaveTwo();return}settled=true;clearTimeout(hedgeTimer);reject(new Error(errors.slice(-8).join(' | ')||'No live Google endpoint succeeded'))}
    function start(candidate){pending+=1;Promise.resolve().then(()=>loader(candidate)).then(result=>{if(settled)return;settled=true;clearTimeout(hedgeTimer);resolve({candidate,result})}).catch(error=>{errors.push(`${candidate.method}: ${error?.message||String(error)}`);pending-=1;finishFailure()})}
    function startWaveTwo(){if(waveTwoStarted||settled)return;waveTwoStarted=true;clearTimeout(hedgeTimer);while(queue.length)start(queue.shift());finishFailure()}
    first.forEach(start);
    if(queue.length)hedgeTimer=setTimeout(startWaveTwo,hedgeDelayMs);else waveTwoStarted=true;
    finishFailure();
  });
}
async function fetchDataset(config){
  const started=Date.now(),candidates=liveEndpointCandidates(config);
  if(!candidates.length)throw new Error('No live Google endpoints are configured');
  const {candidate,result}=await hedgedFirstSuccess(candidates,loadLiveCandidate);
  result.url=candidate.url;result.method=candidate.method;result.updatedAt=new Date().toISOString();result.latencyMs=Date.now()-started;
  writePreferredLiveEndpoint(config,candidate);
  return result;
}
function normalizeDestination(value){let v=String(value||'').trim();let m=v.match(/^[WL]-?(\d+[A-Z]?)$/i);if(m)return m[1].toUpperCase();m=v.match(/^[WL]-?([a-z]{2}_[A-Z]\d)$/i);if(m)return m[1];return v.replace(/-$/,'')}
function titleTeam(name){return String(name||'').trim().replace(/\(Seed-Team Name\)$/i,'').trim().split(/\s+/).map(word=>{const upper=word.toUpperCase();if(ACRONYMS.has(upper))return upper;if(/^\d+$/.test(word))return word;return word.charAt(0).toUpperCase()+word.slice(1).toLowerCase()}).join(' ')}
function seedInfo(raw){
  const value=String(raw||'').trim(),dash=value.indexOf('-');if(dash<1)return null;
  const prefix=value.slice(0,dash).replace(/\s+/g,''),name=value.slice(dash+1).trim();
  if(/^[WL]#?\d+[A-Z]?$/i.test(prefix))return null;
  if(!name||!(/^[A-Z]\d?\(\d+\)$/i.test(prefix)||/^[A-Z]\(\d+\)$/i.test(prefix)||/^[A-Z]\d+$/i.test(prefix)||/^\d+$/.test(prefix)))return null;
  const group=/^[A-Z]/i.test(prefix)?prefix[0].toUpperCase():null;
  const seedMatch=prefix.match(/\((\d+)\)$/)||prefix.match(/^[A-Z](\d+)$/i)||prefix.match(/^(\d+)$/);return{team:titleTeam(name),group,seed:seedMatch?Number(seedMatch[1]):999};
}
function smartTeam(raw){return seedInfo(raw)?.team||null}
function teamIdentityKey(value){return titleTeam(value).toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9]+/g,' ').trim()}
function structuredParticipantPrefix(raw){
  const value=String(raw||'').trim().replace(/\s+/g,' ');
  return /^(?:\d+|[A-Z]\d+(?:\(\d+\))?|[A-Z]\(\d+\)|[WL]#?\d+[A-Z]?|[WL]#?[A-Z]{1,2}\d+\/[A-Z]{1,2}\d+|[A-Za-z]{2,3}[_\s(]?[A-Z]{1,2}\d+(?:\([^)]*\))*|(?:1st|2nd|3rd|4th|5th)\s*(?:[A-Za-z]{2,3}[_\s-]?)?[A-Z]{1,2}(?:\([^)]*\))*)$/i.test(value)
}
function routeAssignmentCandidate(raw){
  const value=String(raw||'').trim(),patterns=[
    /^([WL]#?(?:\d+[A-Z]?|[A-Z]{1,2}\d+\/[A-Z]{1,2}\d+))\s*[-–—:]\s*(.+)$/i,
    /^([A-Za-z]{2,3}[_\s(]?[A-Z]{1,2}\d+(?:\([^)]*\))*)\s*[-–—:]\s*(.+)$/i,
    /^((?:1st|2nd|3rd|4th|5th)\s*(?:[A-Za-z]{2,3}[_\s-]?)?[A-Z]{1,2}(?:\([^)]*\))*)\s*[-–—:]\s*(.+)$/i,
    /^([A-Z]\d+(?:\(\d+\))?|\d+)\s*[-–—:]\s*(.+)$/i
  ];
  for(const pattern of patterns){const match=value.match(pattern);if(match&&match[2]?.trim())return titleTeam(match[2])}
  return null
}
function assignedRouteTeam(raw,knownTeams=DATA?.teams||[]){
  const value=String(raw||'').trim(),teams=[...(knownTeams||[])].filter(Boolean).sort((a,b)=>String(b).length-String(a).length);
  for(const separator of ['-','–','—',':']){let index=value.indexOf(separator);while(index>=0){const prefix=value.slice(0,index).trim(),suffix=value.slice(index+separator.length).trim(),key=teamIdentityKey(suffix);if(prefix&&key&&structuredParticipantPrefix(prefix)){const found=teams.find(name=>teamIdentityKey(name)===key);if(found)return found}index=value.indexOf(separator,index+separator.length)}}
  const candidate=routeAssignmentCandidate(value);if(!candidate)return null;
  const key=teamIdentityKey(candidate);if(!key)return null;
  return teams.find(name=>teamIdentityKey(name)===key)||null
}
function parseWL(raw){const m=String(raw||'').trim().match(/^([WL])#?(\d+[A-Z]?)(?:\s*[-–—:]\s*.*)?$/i);return m?{kind:m[1].toUpperCase(),game:normalizeGameNumber(m[2])}:null}
function normalizeRouteToken(raw){return String(raw||'').trim().replace(/\s+/g,'').replace(/^([A-Za-z]{2,3})\(/,'$1_').replace(/[-–—:]+$/,'')}
function parsePoolSlot(raw){const value=normalizeRouteToken(raw),m=value.match(/^([A-Za-z]{2,3})_?([A-Z]{1,2})(\d+)(?:\([^)]*\))*(?:[-–—:].*)?$/i);return m?{track:m[1].toLowerCase(),pool:m[2].toUpperCase(),seed:Number(m[3]),key:`${m[1].toLowerCase()}_${m[2].toUpperCase()}${m[3]}`} : null}
function parsePoolPlacement(raw){const value=String(raw||'').trim().replace(/_/g,' '),m=value.match(/^(1st|2nd|3rd|4th|5th)\s*([A-Za-z]{2,3})\s*([A-Z]{1,2})(?:\s*\([^)]*\))*(?:\s*[-–—:]\s*.*)?$/i);return m?{rank:Number(m[1][0]),track:m[2].toLowerCase(),pool:m[3].toUpperCase(),key:`${m[2].toLowerCase()}_${m[3].toUpperCase()}`} : null}
function parseGroupPlacement(raw){const value=String(raw||'').trim().replace(/_/g,' '),m=value.match(/^(1st|2nd|3rd|4th|5th)\s*([A-Z]{1,2})(?:\s*\([^)]*\))*(?:\s*[-–—:]\s*.*)?$/i);return m?{rank:Number(m[1][0]),group:m[2].toUpperCase(),key:m[2].toUpperCase()}:null}
function parsePoolMatchup(raw){const value=normalizeRouteToken(raw),m=value.match(/^([WL])#?([A-Z]{1,2}\d+)\/([A-Z]{1,2}\d+)(?:[-–—:].*)?$/i);return m?{kind:m[1].toUpperCase(),refs:[m[2].toUpperCase(),m[3].toUpperCase()].sort()}:null}
function poolSlotRef(raw){const slot=parsePoolSlot(raw);return slot?`${slot.pool}${slot.seed}`:null}
function poolMatchupMatchesGame(game,matchup){if(!game||!matchup)return false;const refs=[poolSlotRef(game.whiteRaw),poolSlotRef(game.darkRaw)].filter(Boolean).sort();return refs.length===2&&refs[0]===matchup.refs[0]&&refs[1]===matchup.refs[1]}
function routeTrackForGame(game){const match=String(game?.stageDetail||game?.type||'').trim().match(/^([a-z]{2,3})[_-]/i);return match?match[1].toLowerCase():null}
function sourceGamesForPoolMatchup(games,matchup,targetGame=null){const matches=(games||[]).filter(game=>poolMatchupMatchesGame(game,matchup));const track=routeTrackForGame(targetGame);return track?[...matches].sort((a,b)=>{const aTrack=parsePoolSlot(a.whiteRaw)?.track===track?0:1,bTrack=parsePoolSlot(b.whiteRaw)?.track===track?0:1;return aTrack-bTrack||gameSort(a,b)}):matches.sort(gameSort)}
function ordinalLabel(rank){return rank===1?'1st':rank===2?'2nd':rank===3?'3rd':`${rank}th`}
function trackLabel(track){return TRACK_LABELS[String(track||'').toLowerCase()]||String(track||'').toUpperCase()}
function slotLabel(raw){const team=smartTeam(raw)||assignedRouteTeam(raw);if(team)return team;const wl=parseWL(raw);if(wl)return`${wl.kind==='W'?'Winner':'Loser'} of Game ${wl.game}`;const matchup=parsePoolMatchup(raw);if(matchup)return`${matchup.kind==='W'?'Winner':'Loser'} of ${matchup.refs.join(' vs ')} matchup`;const slot=parsePoolSlot(raw);if(slot)return`${trackLabel(slot.track)} Pool ${slot.pool} Seed ${slot.seed}`;const pp=parsePoolPlacement(raw);if(pp)return`${ordinalLabel(pp.rank)} in ${trackLabel(pp.track)} Pool ${pp.pool}`;const gp=parseGroupPlacement(raw);if(gp)return`${ordinalLabel(gp.rank)} in Group ${gp.group}`;return String(raw||'').replace(/_/g,' ')||'TBD'}
function teamsFromGames(games){return[...new Set(games.flatMap(g=>[smartTeam(g.whiteRaw),smartTeam(g.darkRaw)]).filter(Boolean))].sort((a,b)=>a.localeCompare(b))}
function embeddedFallback(config){if(!config)return null;if(!EMBEDDED_FALLBACKS[config.id]){const csv=EMBEDDED_SNAPSHOT_CSV[config.id];if(!csv)return null;try{const games=parseLive(csv);EMBEDDED_FALLBACKS[config.id]={age:config.age,division:config.division,teams:teamsFromGames(games),games}}catch(error){console.error(`Could not initialize embedded Girls JO snapshot ${config.id}`,error);return null}}return structuredClone(EMBEDDED_FALLBACKS[config.id])}
function isFinal(g){return scoreOutcome(g)!==null}
function outcome(g){if(!g)return null;const side=scoreOutcome(g);if(!side||!g.whiteTeam||!g.darkTeam)return null;return side==='white'?{winner:g.whiteTeam,loser:g.darkTeam}:{winner:g.darkTeam,loser:g.whiteTeam}}
function rankTable(teamNames,games,seedLookup){
  const table=new Map(teamNames.map(t=>[t,{team:t,wins:0,gd:0,gf:0,seed:seedLookup.get(t)??999}]));
  for(const g of games){if(!isFinal(g)||!g.whiteTeam||!g.darkTeam)continue;for(const t of [g.whiteTeam,g.darkTeam])if(!table.has(t))table.set(t,{team:t,wins:0,gd:0,gf:0,seed:seedLookup.get(t)??999});const parts=gameScoreParts(g),ws=parts.white.regulation,ds=parts.dark.regulation,w=table.get(g.whiteTeam),d=table.get(g.darkTeam);w.gf+=ws;w.gd+=ws-ds;d.gf+=ds;d.gd+=ds-ws;(scoreOutcome(g)==='white'?w:d).wins++}
  return[...table.values()].sort((a,b)=>b.wins-a.wins||b.gd-a.gd||b.gf-a.gf||a.seed-b.seed||a.team.localeCompare(b.team)).map(x=>x.team)
}
function resolveTournament(){
  const knownTeams=Array.isArray(DATA.teams)?DATA.teams:teamsFromGames(DATA.games);
  const games=DATA.games.map(g=>({...g,whiteTeam:smartTeam(g.whiteRaw)||assignedRouteTeam(g.whiteRaw,knownTeams),darkTeam:smartTeam(g.darkRaw)||assignedRouteTeam(g.darkRaw,knownTeams)})),map=new Map(games.map(g=>[g.game,g])),slots=new Map(),groupPlacements=new Map(),poolPlacements=new Map();
  const seedLookup=new Map();for(const g of games){for(const raw of [g.whiteRaw,g.darkRaw]){const info=seedInfo(raw);if(info)seedLookup.set(info.team,info.seed)}}
  for(const g of games){for(const side of ['white','dark']){const raw=g[`${side}Raw`],teamName=g[`${side}Team`]||assignedRouteTeam(raw,knownTeams);if(!teamName)continue;const slot=parsePoolSlot(raw),pp=parsePoolPlacement(raw),gp=parseGroupPlacement(raw);if(slot&&!slots.has(slot.key))slots.set(slot.key,teamName);if(pp&&!poolPlacements.has(`${pp.key}:${pp.rank}`))poolPlacements.set(`${pp.key}:${pp.rank}`,teamName);if(gp&&!groupPlacements.has(`${gp.key}:${gp.rank}`))groupPlacements.set(`${gp.key}:${gp.rank}`,teamName)}}
  let changed=true,guard=0;
  while(changed&&guard++<50){changed=false;
    for(const g of games){for(const side of ['white','dark']){const key=`${side}Team`,raw=g[`${side}Raw`];if(g[key])continue;const assigned=assignedRouteTeam(raw,knownTeams);if(assigned){g[key]=assigned;const slot=parsePoolSlot(raw),pp=parsePoolPlacement(raw),gp=parseGroupPlacement(raw);if(slot&&!slots.has(slot.key))slots.set(slot.key,assigned);if(pp&&!poolPlacements.has(`${pp.key}:${pp.rank}`))poolPlacements.set(`${pp.key}:${pp.rank}`,assigned);if(gp&&!groupPlacements.has(`${gp.key}:${gp.rank}`))groupPlacements.set(`${gp.key}:${gp.rank}`,assigned);changed=true;continue}const wl=parseWL(raw);if(wl){const src=map.get(wl.game),o=outcome(src);if(o){g[key]=wl.kind==='W'?o.winner:o.loser;changed=true;continue}}const matchup=parsePoolMatchup(raw);if(matchup){const src=sourceGamesForPoolMatchup(games,matchup,g).find(isFinal),o=outcome(src);if(o){g[key]=matchup.kind==='W'?o.winner:o.loser;changed=true;continue}}const slot=parsePoolSlot(raw);if(slot&&slots.has(slot.key)){g[key]=slots.get(slot.key);changed=true;continue}const pp=parsePoolPlacement(raw);if(pp&&poolPlacements.has(`${pp.key}:${pp.rank}`)){g[key]=poolPlacements.get(`${pp.key}:${pp.rank}`);changed=true;continue}const gp=parseGroupPlacement(raw);if(gp&&groupPlacements.has(`${gp.key}:${gp.rank}`)){g[key]=groupPlacements.get(`${gp.key}:${gp.rank}`);changed=true}}}
    for(const g of games){const o=outcome(g);if(!o)continue;for(const [dest,teamName] of [[g.winnerTo,o.winner],[g.loserTo,o.loser]]){const slot=parsePoolSlot(dest);if(slot&&!slots.has(slot.key)){slots.set(slot.key,teamName);changed=true}}}
    const groups=new Map();for(const g of games){const wi=seedInfo(g.whiteRaw),di=seedInfo(g.darkRaw);if(!wi||!di||!wi.group||wi.group!==di.group)continue;const key=wi.group;if(!groups.has(key))groups.set(key,{games:[],teams:new Set()});groups.get(key).games.push(g);groups.get(key).teams.add(wi.team);groups.get(key).teams.add(di.team)}
    for(const [group,bucket] of groups){if(!bucket.games.length||!bucket.games.every(isFinal))continue;const ranked=rankTable([...bucket.teams],bucket.games,seedLookup);ranked.slice(0,5).forEach((teamName,i)=>{const key=`${group}:${i+1}`;if(!groupPlacements.has(key)){groupPlacements.set(key,teamName);changed=true}})}
    const pools=new Map();for(const g of games){const w=parsePoolSlot(g.whiteRaw),d=parsePoolSlot(g.darkRaw);if(!w||!d||w.track!==d.track||w.pool!==d.pool)continue;const key=`${w.track}_${w.pool}`;if(!pools.has(key))pools.set(key,{games:[],teams:new Set()});pools.get(key).games.push(g);if(g.whiteTeam)pools.get(key).teams.add(g.whiteTeam);if(g.darkTeam)pools.get(key).teams.add(g.darkTeam)}
    for(const [key,bucket] of pools){if(!bucket.games.length||!bucket.games.every(isFinal))continue;const ranked=rankTable([...bucket.teams],bucket.games,seedLookup);ranked.slice(0,5).forEach((teamName,i)=>{const placementKey=`${key}:${i+1}`;if(!poolPlacements.has(placementKey)){poolPlacements.set(placementKey,teamName);changed=true}})}
  }
  const teamGames=new Map();for(const g of games){for(const teamName of [g.whiteTeam,g.darkTeam]){if(!teamName)continue;if(!teamGames.has(teamName))teamGames.set(teamName,[]);teamGames.get(teamName).push(g)}}for(const list of teamGames.values())list.sort(gameSort);return{games,map,slots,placements:new Map([...groupPlacements,...poolPlacements]),seedLookup,teamGames,journeyCache:new Map()}
}
function display(g,side){return g?.[`${side}Team`]||slotLabel(g?.[`${side}Raw`])}
function seedForTeam(name){const seed=RESOLVED?.seedLookup?.get(name);return Number.isInteger(seed)&&seed>0&&seed<999?seed:null}
function seedBadgeHtml(name,context=''){const seed=seedForTeam(name);return seed?`<span class="jo-seed-badge${context==='dark'?' on-dark':''}" aria-label="JO division seed ${seed}" title="JO division seed ${seed}">#${seed}</span>`:''}
function teamLabelHtml(name,context=''){const label=String(name||'TBD');return`<span class="jo-team-label"${identityAttributes(label)}>${seedBadgeHtml(label,context)}<span class="jo-team-name">${esc(label)}</span></span>`}
function participantHtml(g,side,context=''){const known=g?.[`${side}Team`];return known?teamLabelHtml(known,context):`<span class="jo-team-label unresolved"><span class="jo-team-name">${esc(slotLabel(g?.[`${side}Raw`]))}</span></span>`}
function matchupHtml(g,context=''){const final=isFinal(g);return`<div class="jo-matchup${final?' is-final':''}${context==='dark'?' on-dark':''}"><div class="jo-match-participant">${participantHtml(g,'white',context)}</div><div class="jo-match-center">${final?`<span class="score">${esc(scoreDisplay(g))}</span>`:'<span class="jo-versus">vs</span>'}</div><div class="jo-match-participant">${participantHtml(g,'dark',context)}</div></div>`}
function candidateLabelsHtml(names,context=''){const uniqueNames=[...new Set((names||[]).filter(Boolean))];if(!uniqueNames.length)return'<span class="jo-team-label unresolved"><span class="jo-team-name">TBD</span></span>';return`<span class="jo-candidate-list">${uniqueNames.map(name=>teamLabelHtml(name,context)).join('<span class="jo-or">or</span>')}</span>`}
function namedMatchupHtml(name,opponent,candidates=[],context='dark'){const right=opponent?teamLabelHtml(opponent,context):candidateLabelsHtml(candidates,context);return`<div class="jo-next-matchup">${teamLabelHtml(name,context)}<span class="jo-match-separator">vs</span>${right}</div>`}
function teamOptionLabel(name){const seed=seedForTeam(name);return seed?`${name} — JO seed #${seed}`:name}

function friendlyStage(game){
  const detail=String(game?.stageDetail||'').trim();
  const match=detail.match(/^([a-z]{2,3})[_-](.+)$/i);
  const code=match?match[1].toLowerCase():'';
  const round=roundOnlyLabel(game);
  const bracket=code?trackLabel(code):'';
  return[bracket,round].filter(Boolean).join(' · ')||String(game?.type||'').trim()||detail;
}
function friendlyDate(raw){const labels={'18-Jul':'Saturday, July 18','19-Jul':'Sunday, July 19','20-Jul':'Monday, July 20','21-Jul':'Tuesday, July 21'};return labels[raw]||raw}
function timeValue(value){const m=String(value||'').match(/^(\d+):(\d+)\s*(AM|PM)$/i);if(!m)return 9999;let h=Number(m[1])%12;if(m[3].toUpperCase()==='PM')h+=12;return h*60+Number(m[2])}
function dateValue(raw){const m=String(raw||'').match(/^(\d{1,2})-([A-Za-z]{3})$/);if(!m)return 999;const months={Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};return(months[m[2]]||99)*100+Number(m[1])}
function gameSort(a,b){return dateValue(a.date)-dateValue(b.date)||timeValue(a.time)-timeValue(b.time)||String(a.game).localeCompare(String(b.game),undefined,{numeric:true,sensitivity:'base'})}
function routedGamesForTeam(name){
  if(!name||!RESOLVED)return[];
  if(RESOLVED.journeyCache?.has(name))return RESOLVED.journeyCache.get(name);
  const clones=new Map(RESOLVED.games.map(g=>[String(g.game),{...g}])),included=new Set();
  for(const g of clones.values())if(g.whiteTeam===name||g.darkTeam===name)included.add(String(g.game));
  let changed=true,guard=0;
  while(changed&&guard++<60){changed=false;
    for(const gameKey of [...included]){
      const source=clones.get(gameKey);if(!source||!isFinal(source))continue;
      const result=resultFor(source,name);if(!result)continue;
      const routeKind=result==='win'?'W':'L',destination=result==='win'?source.winnerTo:source.loserTo;
      if(!destination)continue;
      for(const targetBase of destinationTargets(destination)){
        const target=clones.get(String(targetBase.game));if(!target)continue;
        let ownSide=['white','dark'].find(side=>target[`${side}Team`]===name)||null;
        if(!ownSide){for(const side of ['white','dark'])if(pathSideMatches(target[`${side}Raw`],destination,source,routeKind)){ownSide=side;break}}
        if(!ownSide)continue;
        if(!target[`${ownSide}Team`]){target[`${ownSide}Team`]=name;changed=true}
        if(!included.has(String(target.game))){included.add(String(target.game));changed=true}
      }
    }
  }
  const list=[...included].map(key=>clones.get(key)).filter(Boolean).sort(gameSort);
  RESOLVED.journeyCache?.set(name,list);return list
}
function gamesForTeam(name){return routedGamesForTeam(name)}
function resultFor(g,name){const o=outcome(g);return o?(o.winner===name?'win':'loss'):null}
function otherTeam(g,name){return g.whiteTeam===name?g.darkTeam:g.darkTeam===name?g.whiteTeam:null}
function targetGame(destination){return validGameNumber(destination)?RESOLVED.map.get(normalizeGameNumber(destination)):null}
function sourceCandidates(raw){const ref=parseWL(raw);if(ref){const source=RESOLVED.map.get(ref.game);return source?[source.whiteTeam,source.darkTeam].filter(Boolean):[]}const matchup=parsePoolMatchup(raw);if(!matchup)return[];return[...new Set(sourceGamesForPoolMatchup(RESOLVED.games,matchup).flatMap(source=>[source.whiteTeam,source.darkTeam]).filter(Boolean))]}
function gameCandidates(g,name){if(!g)return[];const candidates=[];for(const side of ['white','dark']){const known=g[`${side}Team`],raw=g[`${side}Raw`];if(known){if(known!==name)candidates.push(known);continue}const ref=parseWL(raw),source=ref&&RESOLVED.map.get(ref.game);if(source&&(source.whiteTeam===name||source.darkTeam===name))continue;candidates.push(...sourceCandidates(raw).filter(x=>x!==name))}return[...new Set(candidates)]}
function destinationTargets(destination){
  const direct=targetGame(destination);if(direct)return[direct];
  const slot=parsePoolSlot(destination),pp=parsePoolPlacement(destination),gp=parseGroupPlacement(destination),value=String(destination||'').trim().replace(/-$/,'');
  return RESOLVED.games.filter(g=>[g.whiteRaw,g.darkRaw].some(raw=>{
    if(slot){const parsed=parsePoolSlot(raw);return parsed&&parsed.key===slot.key}
    if(pp){const parsed=parsePoolPlacement(raw);return parsed&&parsed.key===pp.key&&parsed.rank===pp.rank}
    if(gp){const parsed=parseGroupPlacement(raw);return parsed&&parsed.key===gp.key&&parsed.rank===gp.rank}
    return String(raw||'').trim().replace(/-$/,'')===value;
  })).sort(gameSort)
}
function pathSideMatches(raw,destination,sourceGame,routeKind){
  const ref=parseWL(raw);if(ref&&sourceGame&&String(ref.game)===String(sourceGame.game)&&(!routeKind||ref.kind===routeKind))return true;
  const matchup=parsePoolMatchup(raw);if(matchup&&sourceGame&&(!routeKind||matchup.kind===routeKind)&&poolMatchupMatchesGame(sourceGame,matchup))return true;
  const slot=parsePoolSlot(destination),rawSlot=parsePoolSlot(raw);if(slot&&rawSlot&&slot.key===rawSlot.key)return true;
  const pp=parsePoolPlacement(destination),rawPP=parsePoolPlacement(raw);if(pp&&rawPP&&pp.key===rawPP.key&&pp.rank===rawPP.rank)return true;
  const gp=parseGroupPlacement(destination),rawGP=parseGroupPlacement(raw);if(gp&&rawGP&&gp.key===rawGP.key&&gp.rank===rawGP.rank)return true;
  return false
}
function pathOpponentInfo(target,destination,sourceGame,routeKind,name){
  let pathSide=null;for(const side of ['white','dark'])if(pathSideMatches(target[`${side}Raw`],destination,sourceGame,routeKind)){pathSide=side;break}
  if(!pathSide){for(const side of ['white','dark'])if(target[`${side}Team`]===name){pathSide=side;break}}
  const opponentSide=pathSide==='white'?'dark':pathSide==='dark'?'white':null;
  if(!opponentSide)return{label:'Opponent TBD',candidates:[]};
  const known=target[`${opponentSide}Team`],raw=target[`${opponentSide}Raw`];
  const candidates=known?[known]:sourceCandidates(raw);
  return{label:known||slotLabel(raw)||'Opponent TBD',candidates:[...new Set(candidates.filter(x=>x&&x!==name))]}
}
function projectedOpponentPaths(name,upcoming,maxDepth=3){
  if(!upcoming)return[];const rows=[],seen=new Set();
  const add=(game,route,label,candidates)=>{const list=candidates.length?candidates:[null];for(const candidate of list){const key=[game.game,route,candidate||label].join('|');if(seen.has(key))continue;seen.add(key);rows.push({game,route,label,candidate})}}
  const immediateKnown=otherTeam(upcoming,name),immediateCandidates=immediateKnown?[immediateKnown]:gameCandidates(upcoming,name);
  let immediateLabel=immediateKnown||'Opponent TBD';if(!immediateKnown){for(const side of ['white','dark']){if(upcoming[`${side}Team`]===name){const other=side==='white'?'dark':'white';immediateLabel=slotLabel(upcoming[`${other}Raw`]);break}}}
  add(upcoming,'Next game',immediateLabel,immediateCandidates);
  const walk=(sourceGame,route,depth)=>{if(depth>=maxDepth||rows.length>=18)return;for(const [kind,destination] of [['W',sourceGame.winnerTo],['L',sourceGame.loserTo]]){if(!destination)continue;const condition=`${route} → ${kind==='W'?'win':'lose'} Game ${sourceGame.game}`;for(const target of destinationTargets(destination)){const info=pathOpponentInfo(target,destination,sourceGame,kind,name);add(target,condition,info.label,info.candidates);walk(target,condition,depth+1);if(rows.length>=18)return}}};
  walk(upcoming,'Path',0);return rows
}
function destinationDescription(value){if(validGameNumber(value)){const g=targetGame(value);return g?{title:`Game ${g.game}`,detail:`${friendlyDate(g.date)} · ${g.time} · ${g.location}`}:{title:`Game ${value}`,detail:'Schedule details unavailable'}}const slot=parsePoolSlot(value);if(slot)return{title:slotLabel(value),detail:'Pool games will appear automatically after this result is posted.'};return value&&!['RR','bracket'].includes(String(value).toLowerCase())?{title:slotLabel(value),detail:'The next scheduled game will appear when the bracket resolves.'}:null}


function mergeVerifiedSchedule(primaryGames,referenceGames=[]){
  const refsByGmid=new Map(),refsByGame=new Map();
  for(const ref of referenceGames||[]){if(ref?.gmid)refsByGmid.set(String(ref.gmid),ref);if(ref?.game!=null)refsByGame.set(String(ref.game),ref)}
  const merged=(primaryGames||[]).map(game=>{const reference=refsByGmid.get(String(game?.gmid||''))||refsByGame.get(String(game?.game??''));if(!reference)return{...game};const next={...game};for(const field of ['winnerTo','loserTo','whiteRaw','darkRaw','date','time','type','stageDetail','location','gmid']){if(String(next[field]??'').trim()===''&&String(reference[field]??'').trim()!=='')next[field]=field==='winnerTo'||field==='loserTo'?normalizeDestination(reference[field]):reference[field]}return next});
  const byGame=new Map(merged.map(game=>[String(game.game),game]));
  for(const target of merged){for(const raw of [target.whiteRaw,target.darkRaw]){const ref=parseWL(raw);if(!ref)continue;const source=byGame.get(String(ref.game));if(!source)continue;const field=ref.kind==='W'?'winnerTo':'loserTo';if(String(source[field]??'').trim()==='')source[field]=String(target.game)}}
  return merged
}
function datasetWithVerifiedRoutes(config,games,teams,referenceDataset){const merged=mergeVerifiedSchedule(games,referenceDataset?.games||[]);return{age:config.age,division:config.division,teams:Array.isArray(teams)&&teams.length?teams:teamsFromGames(merged),games:merged}}


const TRACK_LABELS={pt:'Platinum',au:'Gold',ag:'Silver',bz:'Bronze',cu:'Copper',ni:'Nickel'};
function alphaGroupLabel(index){let value=Number(index)+1,label='';while(value>0){value-=1;label=String.fromCharCode(65+(value%26))+label;value=Math.floor(value/26)}return label}
function directSeededTeamInfo(raw){const info=seedInfo(raw);return info&&info.team&&Number.isFinite(info.seed)&&info.seed<999?info:null}
function initialGroupBuckets(){
  const explicit=new Map(),routed=new Map();
  for(const game of RESOLVED.games||[]){
    if(!/group/i.test(String(game.type||''))||routeTrackForGame(game))continue;
    const white=directSeededTeamInfo(game.whiteRaw),dark=directSeededTeamInfo(game.darkRaw);
    for(const info of [white,dark])if(info?.group){if(!explicit.has(info.group))explicit.set(info.group,{label:info.group,members:new Map(),games:[]});explicit.get(info.group).members.set(info.team,info.seed);explicit.get(info.group).games.push(game)}
    if(!white||!dark||white.group||dark.group)continue;
    const winner=String(game.winnerTo||'').trim(),loser=String(game.loserTo||'').trim();
    if(!winner&&!loser)continue;
    const key=[winner,loser].sort().join('|');
    if(!routed.has(key))routed.set(key,{label:'',members:new Map(),games:[]});
    const bucket=routed.get(key);bucket.members.set(white.team,white.seed);bucket.members.set(dark.team,dark.seed);bucket.games.push(game);
  }
  const routedGroups=[...routed.values()].filter(bucket=>bucket.members.size>=3).sort((a,b)=>Math.min(...a.members.values())-Math.min(...b.members.values()));
  routedGroups.forEach((bucket,index)=>bucket.label=alphaGroupLabel(index));
  return[...explicit.values(),...routedGroups].map(bucket=>({label:bucket.label,members:[...bucket.members.entries()].sort((a,b)=>a[1]-b[1]||a[0].localeCompare(b[0])).map(([team])=>team),games:bucket.games}));
}
function initialGroupForTeam(name){return initialGroupBuckets().find(bucket=>bucket.members.includes(name))||null}
function routeGroupInfo(game,name){
  if(!game)return null;
  for(const side of ['white','dark']){
    const raw=game[`${side}Raw`],known=game[`${side}Team`]||assignedRouteTeam(raw,DATA?.teams||[]);
    if(known!==name)continue;
    const slot=parsePoolSlot(raw);if(slot)return{track:slot.track,group:slot.pool,seed:slot.seed};
    const placement=parsePoolPlacement(raw);if(placement)return{track:placement.track,group:placement.pool,seed:placement.rank};
  }
  return null;
}
function routeGroupRoster(track,group){
  const members=new Map();
  for(const game of RESOLVED.games||[]){
    for(const side of ['white','dark']){
      const raw=game[`${side}Raw`],slot=parsePoolSlot(raw);if(!slot||slot.track!==track||slot.pool!==group)continue;
      const member=game[`${side}Team`]||assignedRouteTeam(raw,DATA?.teams||[])||smartTeam(raw);if(member)members.set(member,Math.min(members.get(member)??999,slot.seed));
    }
  }
  return[...members.entries()].sort((a,b)=>a[1]-b[1]||a[0].localeCompare(b[0])).map(([team])=>team);
}
function roundOnlyLabel(game){
  const detail=String(game?.stageDetail||'').trim(),raw=String(game?.type||'').trim(),match=detail.match(/^([a-z]{2,3})[_-](.+)$/i);
  let round=(match?match[2]:raw||detail).replace(/_/g,' ').trim();
  round=round.replace(/\bsemi(?:finals?)?\b/ig,'Semifinal').replace(/\bqtr\b|\bquarter(?:finals?)?\b/ig,'Quarterfinal').replace(/\bplay[- ]?in\b/ig,'Play-in').replace(/^group$/i,'Group play').replace(/\bRR\b/g,'round robin');
  if(/^1st$/i.test(round))round='Championship game';else if(/^(\d+)(st|nd|rd|th)$/i.test(round))round=`${round} place game`;
  return round||raw||detail||'Tournament stage';
}
function stageContextForTeam(name,games,upcoming){
  const ordered=[...(games||[])].sort(gameSort),focus=upcoming||ordered[ordered.length-1]||null;
  let route=routeGroupInfo(focus,name),track=routeTrackForGame(focus)||route?.track||null;
  if(!route){for(let i=ordered.length-1;i>=0;i--){const candidate=routeGroupInfo(ordered[i],name);if(candidate&&(!track||candidate.track===track)){route=candidate;track=track||candidate.track;break}}}
  if(track){
    const division=trackLabel(track),group=route?.group||'',members=group?routeGroupRoster(track,group):[];
    const groupPhase=/group/i.test(String(focus?.type||''))||/[_-]group/i.test(String(focus?.stageDetail||''));
    return{stage:groupPhase&&group?`${division} · Group ${group}`:[division,roundOnlyLabel(focus)].filter(Boolean).join(' · '),groupTitle:group?`${division} Group ${group}`:division,members,kind:'subdivision',track,group};
  }
  const initial=initialGroupForTeam(name);
  if(initial)return{stage:`Group ${initial.label}`,groupTitle:`Group ${initial.label}`,members:initial.members,kind:'initial',track:null,group:initial.label};
  return{stage:statusText(games,upcoming),groupTitle:'',members:[],kind:'status',track:null,group:''};
}
function stageContextHtml(context,name){
  if(!context?.members?.length)return'';
  return`<div class="jo-stage-context"><div class="jo-stage-context-heading"><span>${context.kind==='initial'?'Opening group':'Subdivision group'}</span><strong>${esc(context.groupTitle)}</strong></div><div class="jo-stage-members">${context.members.map(member=>`<span class="jo-stage-member${member===name?' selected':''}">${teamLabelHtml(member)}</span>`).join('')}</div></div>`;
}

const TRACK_ORDER=['pt','au','ag','bz','cu','ni'];
function placementOrdinal(place){
  const value=Number(place);if(!Number.isFinite(value))return'';
  const mod100=value%100,suffix=mod100>=11&&mod100<=13?'th':value%10===1?'st':value%10===2?'nd':value%10===3?'rd':'th';return`${value}${suffix}`;
}
function exactPlacementSpec(game){
  for(const value of [game?.type,String(game?.stageDetail||'').replace(/^[a-z]{2,3}[_-]/i,'')]){
    const match=String(value||'').trim().match(/^(\d+)(?:st|nd|rd|th)(?:\s*[/&-]\s*(\d+)(?:st|nd|rd|th))?\s*(?:place(?:ment)?\s*(?:game)?)?$/i);
    if(match){const winnerPlace=Number(match[1]),loserPlace=match[2]?Number(match[2]):winnerPlace+1;return{winnerPlace,loserPlace}}
  }
  return null;
}
function roundRobinPlacementSpec(game){
  for(const value of [game?.type,String(game?.stageDetail||'').replace(/^[a-z]{2,3}[_-]/i,'')]){
    const text=String(value||'').trim(),match=text.match(/^(\d+)\s*[-–—]\s*(\d+)\s*(?:RR|round\s*robin|final\s*pool)$/i);
    if(match)return{start:Number(match[1]),end:Number(match[2])};
  }
  return null;
}
function placementTrackForTeam(name,games=[]){
  const ordered=[...(games||[])].sort(gameSort).reverse();
  for(const game of ordered){const track=routeTrackForGame(game)||routeGroupInfo(game,name)?.track;if(track)return track}
  return null;
}
function terminalPlacementForTeam(name,games=[]){
  const ordered=[...(games||[])].filter(isFinal).sort(gameSort).reverse();
  for(const game of ordered){
    const spec=exactPlacementSpec(game),result=spec&&resultFor(game,name);if(!spec||!result)continue;
    return{track:routeTrackForGame(game)||placementTrackForTeam(name,games),subdivisionPlace:result==='win'?spec.winnerPlace:spec.loserPlace,source:'placement-game',game};
  }
  const seen=new Set();
  for(const game of ordered){
    const spec=roundRobinPlacementSpec(game),track=routeTrackForGame(game)||placementTrackForTeam(name,games);if(!spec||!track)continue;
    const key=`${track}:${spec.start}-${spec.end}`;if(seen.has(key))continue;seen.add(key);
    const bucket=(RESOLVED.games||[]).filter(candidate=>{const other=roundRobinPlacementSpec(candidate);return other&&other.start===spec.start&&other.end===spec.end&&routeTrackForGame(candidate)===track});
    if(!bucket.length||!bucket.every(isFinal))continue;
    const teams=[...new Set(bucket.flatMap(candidate=>[candidate.whiteTeam,candidate.darkTeam]).filter(Boolean))];if(!teams.includes(name))continue;
    const ranked=rankTable(teams,bucket,RESOLVED.seedLookup||new Map()),index=ranked.indexOf(name);if(index<0)continue;
    return{track,subdivisionPlace:spec.start+index,source:'round-robin',game};
  }
  return null;
}
function subdivisionCapacity(track){
  let capacity=0;
  for(const game of RESOLVED.games||[]){if(routeTrackForGame(game)!==track)continue;const exact=exactPlacementSpec(game),roundRobin=roundRobinPlacementSpec(game);if(exact)capacity=Math.max(capacity,exact.winnerPlace,exact.loserPlace);if(roundRobin)capacity=Math.max(capacity,roundRobin.end)}
  if(capacity)return capacity;
  const members=new Set();
  for(const teamName of DATA.teams||[]){const teamGames=(RESOLVED.teamGames?.get(teamName)||[]).filter(game=>routeTrackForGame(game));const finalTrack=placementTrackForTeam(teamName,teamGames);if(finalTrack===track)members.add(teamName)}
  return members.size;
}
function finalPlacementForTeam(name,games=[],upcoming=null){
  if(!name||upcoming)return null;const placement=terminalPlacementForTeam(name,games);if(!placement)return null;
  const totalTeams=(DATA.teams||[]).length,track=placement.track,place=placement.subdivisionPlace;if(!Number.isFinite(place)||place<1)return null;
  let overallPlace=place;
  if(track){const trackIndex=TRACK_ORDER.indexOf(track);if(trackIndex<0)return{...placement,totalTeams,overallPlace:null,divisionLabel:trackLabel(track)};for(const earlier of TRACK_ORDER.slice(0,trackIndex))overallPlace+=subdivisionCapacity(earlier)}
  if(totalTeams&&overallPlace>totalTeams)overallPlace=null;
  return{...placement,totalTeams,overallPlace,divisionLabel:track?trackLabel(track):''};
}
function finalPlacementHtml(placement){
  if(!placement)return'';const subdivision=`${placementOrdinal(placement.subdivisionPlace)}${placement.divisionLabel?` in ${placement.divisionLabel}`:''}`;
  const overall=placement.overallPlace&&placement.totalTeams?`${placementOrdinal(placement.overallPlace)} of ${placement.totalTeams} teams overall`:placement.totalTeams?`${placement.totalTeams} teams in the division`:'';
  return`<div class="next-label">Final placement</div><div class="jo-final-placement"><strong>${esc(subdivision)}</strong>${overall?`<span>${esc(overall)}</span>`:''}</div>`;
}

const initialParams=new URLSearchParams(window.location.search);
let pendingTeam=initialParams.get('team')||'';
let pendingDivision=initialParams.get('division')||'';
let pendingAge=initialParams.get('age')||'';
function applyInitialSelection(){
  if(pendingDivision){const cfg=DATASETS.find(d=>d.id===pendingDivision);if(cfg){age.value=cfg.age;populateDivisions(cfg.id)}}
  else if(pendingAge&&[...age.options].some(o=>o.value===pendingAge)){age.value=pendingAge;populateDivisions()}
}
function updateShareUrl(){
  const config=currentConfig();if(!config)return;
  const params=new URLSearchParams();params.set('division',config.id);if(team.value)params.set('team',team.value);
  history.replaceState(null,'',`${window.location.pathname}?${params.toString()}`);
}
async function copyShareLink(){
  updateShareUrl();const absolute=window.location.href;
  try{await navigator.clipboard.writeText(absolute);share.textContent='Copied link'}catch{window.prompt('Copy this link',absolute)}
  setTimeout(()=>share.textContent=team.value?'Share team link':'Share division link',1600)
}
function populateFullDay(){
  const fullDay=$('fullDay');if(!fullDay)return;
  const previous=fullDay.value;
  fullDay.innerHTML='<option value="">All days</option>'+[...new Set(DATA.games.map(g=>g.date))].sort((a,b)=>dateValue(a)-dateValue(b)).map(d=>`<option value="${esc(d)}">${esc(friendlyDate(d))}</option>`).join('');
  if([...fullDay.options].some(o=>o.value===previous))fullDay.value=previous;
}
function renderFullSchedule(){
  const fullSchedule=$('fullSchedule'),fullCount=$('fullCount'),fullSearch=$('fullSearch'),fullDay=$('fullDay');if(!fullSchedule)return;
  const q=String(fullSearch?.value||'').trim().toLowerCase(),selectedDay=fullDay?.value||'';
  let list=RESOLVED.games.filter(g=>display(g,'white')||display(g,'dark'));
  list=list.filter(g=>(!selectedDay||g.date===selectedDay)&&(!q||[display(g,'white'),display(g,'dark'),g.location,g.type,g.gmid,g.game].join(' ').toLowerCase().includes(q))).sort(gameSort);
  if(fullCount)fullCount.textContent=`${list.length} games shown`;
  fullSchedule.innerHTML=list.length?list.map(g=>`<article class="game glass ${isFinal(g)?'completed':''}"><div class="top"><span>Game ${g.game}${isFinal(g)?' · FINAL':''}</span><span>${esc(friendlyDate(g.date))} · ${esc(g.time)}</span></div><div class="match">${matchupHtml(g)}</div><div class="journey-meta">${esc(g.location)} · ${esc(friendlyStage(g))} · ${esc(g.gmid)}</div></article>`).join(''):'<div class="empty glass">No games match the current full-schedule filters.</div>';
}

function setEmptyState(){const empty=$('emptyState');if(empty)empty.classList.toggle('hidden',!!team.value)}
function populateAges(){const selected=pendingAge||localStorage.getItem('joAgeV5')||'14U',ages=[...new Set(DATASETS.map(d=>d.age))];age.innerHTML=ages.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');age.value=ages.includes(selected)?selected:ages[0];populateDivisions();applyInitialSelection()}
function populateDivisions(preferred){const choices=DATASETS.filter(d=>d.age===age.value),saved=preferred||localStorage.getItem(`joDivisionV5:${age.value}`);division.innerHTML=choices.map(d=>`<option value="${esc(d.id)}">${esc(d.division)}</option>`).join('');division.value=choices.some(d=>d.id===saved)?saved:choices[0]?.id||''}
function populateTeamAndDay(){const config=currentConfig(),saved=config?localStorage.getItem(`joSelectedTeam:${config.id}`)||'':'';team.innerHTML='<option value="">Choose your team</option>'+DATA.teams.map(t=>`<option value="${esc(t)}">${esc(teamOptionLabel(t))}</option>`).join('');const target=pendingTeam||saved;if(DATA.teams.includes(target))team.value=target;pendingTeam='';const previous=day.value;day.innerHTML='<option value="">All days</option>'+[...new Set(DATA.games.map(g=>g.date))].sort((a,b)=>dateValue(a)-dateValue(b)).map(d=>`<option value="${esc(d)}">${esc(friendlyDate(d))}</option>`).join('');if([...day.options].some(o=>o.value===previous))day.value=previous;populateFullDay();}

function renderPaths(upcoming){const win=destinationDescription(upcoming.winnerTo),loss=destinationDescription(upcoming.loserTo);$('pathSection').classList.toggle('hidden',!win&&!loss);paths.innerHTML=[['win','If they win',win],['loss','If they lose',loss]].filter(x=>x[2]).map(([cls,label,d])=>`<article class="path-card ${cls} glass"><h3>${label}</h3><div class="path-destination">${esc(d.title)}</div><div class="path-detail">${esc(d.detail)}</div></article>`).join('')}
function statusText(games,upcoming){if(!games.length)return'No games found';if(!games.some(isFinal))return'Tournament not started';if(upcoming&&/5th/i.test(upcoming.type))return'Playing for 5th/6th';if(upcoming&&/3rd/i.test(upcoming.type))return'Playing for 3rd/4th';if(upcoming&&/1st|champ/i.test(upcoming.type))return'Playing for the championship';if(upcoming)return'Still alive';return'Tournament complete'}
function renderTeam(){
  const name=team.value,config=currentConfig();if(!name){$('teamView').classList.add('hidden');setEmptyState();updateShareUrl();return}
  $('teamView').classList.remove('hidden');setEmptyState();updateShareUrl();if(config)localStorage.setItem(`joSelectedTeam:${config.id}`,name);
  const games=gamesForTeam(name),completed=games.filter(isFinal),upcoming=games.find(g=>!isFinal(g));
  const wins=completed.filter(g=>resultFor(g,name)==='win').length,losses=completed.length-wins,seed=seedForTeam(name),stage=stageContextForTeam(name,games,upcoming),finalPlacement=finalPlacementForTeam(name,games,upcoming);
  summary.innerHTML=`<div class="eyebrow">Selected team</div><div class="jo-summary-title"><h2>${esc(name)}</h2>${seed?`<span class="jo-seed-summary">JO seed #${seed}</span>`:''}</div><div class="stats"><div class="stat"><small>Record</small>${completed.length?`${wins}-${losses}`:'—'}</div><div class="stat"><small>Games played</small>${completed.length}</div><div class="stat stage-stat"><small>Stage</small>${esc(stage.stage)}</div></div>${stageContextHtml(stage,name)}`;
  if(upcoming){const opp=otherTeam(upcoming,name),candidates=gameCandidates(upcoming,name);next.innerHTML=`<div class="next-label">Next game</div>${namedMatchupHtml(name,opp,candidates,'light')}<div>${esc(friendlyDate(upcoming.date))} · ${esc(upcoming.time)}</div><div class="journey-meta">${esc(upcoming.location)} · Game ${upcoming.game} · ${esc(friendlyStage(upcoming))}</div>`;renderPaths(upcoming)}else{next.innerHTML=finalPlacement?finalPlacementHtml(finalPlacement):'<div class="next-label">Tournament status</div><div class="next-match">No upcoming game</div>';renderPaths({winnerTo:'',loserTo:''})}
  const grouped={};games.forEach(g=>(grouped[g.date]??=[]).push(g));journey.innerHTML=games.length?'<div class="journey">'+Object.entries(grouped).map(([date,list])=>`<section class="day"><h3>${esc(friendlyDate(date))}</h3>${list.map(g=>{const r=resultFor(g,name)||'upcoming';return`<article class="journey-card glass ${r}"><div class="journey-time">Game ${g.game}<br>${esc(g.time)}</div><div><div class="journey-score">${matchupHtml(g)}</div><div class="journey-meta">${esc(g.location)} · ${esc(friendlyStage(g))}</div></div><span class="pill ${r}">${r==='win'?'Win':r==='loss'?'Loss':'Upcoming'}</span></article>`}).join('')}</section>`).join('')+'</div>':'<div class="empty glass">No resolved games are currently available for this team.</div>';renderRelevant();renderPotential(name,upcoming)
}

function relevantIds(name,upcoming){const ids=new Set(gamesForTeam(name).map(g=>g.game));if(!upcoming)return ids;for(const raw of [upcoming.whiteRaw,upcoming.darkRaw]){const ref=parseWL(raw);if(ref)ids.add(ref.game)}for(const dest of [upcoming.winnerTo,upcoming.loserTo]){const target=targetGame(dest);if(!target)continue;ids.add(target.game);for(const raw of [target.whiteRaw,target.darkRaw]){const ref=parseWL(raw);if(ref)ids.add(ref.game)}}return ids}
function renderRelevant(){const name=team.value,q=String(search.value||'').trim().toLowerCase(),selectedDay=day.value,games=gamesForTeam(name),upcoming=games.find(g=>!isFinal(g)),ids=relevantIds(name,upcoming);let list=RESOLVED.games.filter(g=>g.whiteTeam||g.darkTeam);if(!q)list=list.filter(g=>ids.has(g.game));list=list.filter(g=>(!selectedDay||g.date===selectedDay)&&(!q||[display(g,'white'),display(g,'dark'),g.location,g.type,g.gmid,g.game].join(' ').toLowerCase().includes(q))).sort(gameSort);schedule.innerHTML=list.length?list.map(g=>`<article class="game glass ${isFinal(g)?'completed':''}"><div class="top"><span>Game ${g.game}${isFinal(g)?' · FINAL':''}</span><span>${esc(friendlyDate(g.date))} · ${esc(g.time)}</span></div><div class="match">${matchupHtml(g)}</div><div class="journey-meta">${esc(g.location)} · ${esc(friendlyStage(g))}</div></article>`).join(''):'<div class="empty glass">No games match the current filters.</div>'}

function renderPotential(name,upcoming){const paths=projectedOpponentPaths(name,upcoming);potential.innerHTML=paths.length?paths.slice(0,12).map(item=>{const meta=`${item.route} · Game ${item.game.game} · ${friendlyDate(item.game.date)} ${item.game.time}`;return item.candidate&&DATA.teams.includes(item.candidate)?`<button data-team="${esc(item.candidate)}"><div class="jo-potential-team">${teamLabelHtml(item.candidate)}</div><div class="journey-meta">${esc(meta)}</div></button>`:`<div class="jo-potential-placeholder"><div class="jo-potential-team">${esc(item.label)}</div><div class="journey-meta">${esc(meta)}</div></div>`}).join(''):'<div class="empty glass">No additional future opponents are currently identifiable.</div>';potential.querySelectorAll('[data-team]').forEach(button=>button.addEventListener('click',()=>{team.value=button.dataset.team;renderTeam();window.scrollTo({top:0,behavior:'smooth'})}))}

function rebuild(){RESOLVED=resolveTournament();populateTeamAndDay();renderFullSchedule();const config=currentConfig();setText('metricTeamCount',DATA.teams.length||'—');if(config){setText('activeDivisionTitle',`${config.age} ${config.division}`);setText('activeDivisionMeta',`${DATA.teams.length} teams · ${DATA.games.length} published games`);}if(team.value)renderTeam();else{$('teamView').classList.add('hidden');setEmptyState();updateShareUrl();}}
function readCache(config){try{const raw=localStorage.getItem(`${CACHE_PREFIX}${config.id}`);if(!raw)return null;const cached=JSON.parse(raw);return cached&&Array.isArray(cached.games)?cached:null}catch{return null}}
function writeCache(config,data){try{localStorage.setItem(`${CACHE_PREFIX}${config.id}`,JSON.stringify({...data,cachedAt:new Date().toISOString()}))}catch{}}
function sourceTimestamp(value){if(!value)return'Not yet verified';const d=new Date(value);return Number.isNaN(d.getTime())?String(value):d.toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}
function setText(id,value){const node=$(id);if(node)node.textContent=String(value)}
function updateOverviewMetrics(config,games,updatedAt,mode=''){
  const list=games||[],completed=list.filter(isFinal).length,scheduled=Math.max(0,list.length-completed),teams=teamsFromGames(list).length;
  setText('metricDivisionCount',DATASETS.length);setText('metricTeamCount',teams||'—');setText('metricScheduledCount',scheduled);setText('metricCompletedCount',completed);
  setText('metricUpdatedAt',sourceTimestamp(updatedAt));setText('liveScheduledCount',scheduled);setText('liveCompletedCount',completed);setText('liveUpdatedAt',sourceTimestamp(updatedAt));
  if(config){setText('activeDivisionTitle',`${config.age} ${config.division}`);setText('activeDivisionMeta',`${teams||0} teams · ${list.length} published games${mode?` · ${mode}`:''}`);}
}
function renderSourceMeta(config,mode,games,updatedAt,detail='',sourceLabel='Official Google Sheet'){const root=$('sourceMeta');const completed=(games||[]).filter(isFinal).length,scheduled=Math.max(0,(games||[]).length-completed);updateOverviewMetrics(config,games,updatedAt,mode);if(!root)return;root.innerHTML=`<div><span>Source</span><strong>${esc(sourceLabel)}</strong></div><div><span>Last successful update</span><strong>${esc(sourceTimestamp(updatedAt))}</strong></div><div><span>Schedule</span><strong>${scheduled} scheduled · ${completed} completed</strong></div><div><span>Mode</span><strong>${esc(mode)}</strong></div>${detail?`<p>${esc(detail)}</p>`:''}`;}
function clearLiveRetry(){if(retryTimer){clearTimeout(retryTimer);retryTimer=null}}
function markLiveSuccess(config){liveFailureCounts.set(config.id,0);clearLiveRetry()}
function markLiveFailure(config){
  const failures=(liveFailureCounts.get(config.id)||0)+1;liveFailureCounts.set(config.id,failures);
  const delay=LIVE_RETRY_DELAYS_MS[Math.min(failures-1,LIVE_RETRY_DELAYS_MS.length-1)];
  clearLiveRetry();
  if(!document.hidden)retryTimer=setTimeout(()=>{retryTimer=null;if(currentConfig()?.id===config.id)loadCurrent(false)},delay);
  return delay;
}
function loadCurrent(manual=false){
  const config=currentConfig();if(!config)return Promise.resolve();
  const existing=activeLoads.get(config.id);if(existing)return existing;
  const task=loadCurrentInternal(config,manual).finally(()=>{if(activeLoads.get(config.id)===task)activeLoads.delete(config.id)});
  activeLoads.set(config.id,task);return task;
}
async function loadCurrentInternal(config,manual=false){
  lastLoadAttemptAt=Date.now();
  const version=++loadVersion,status=$('statusText'),dot=$('liveDot'),button=$('refresh');
  const cached=readCache(config),embedded=embeddedFallback(config);
  let verified=embedded,immediate=cached?datasetWithVerifiedRoutes(config,cached.games,cached.teams,embedded):embedded;
  button.disabled=true;
  if(immediate){
    DATA=immediate;
    dot.classList.add('fallback');
    status.textContent=`${cached?'Last verified':'Verified'} ${config.age} ${config.division} schedule loaded · checking CPI live relay…`;
    renderSourceMeta(config,'Schedule ready · checking live relay',immediate.games,cached?.cachedAt||null,'A verified schedule is available immediately while CPI checks its server-side relay and the official Google Sheet.');
    rebuild();team.disabled=false;
  }else{
    team.disabled=true;
    status.textContent=manual?`Refreshing ${config.division}…`:`Loading verified ${config.age} ${config.division} schedule…`;
    renderSourceMeta(config,'Loading verified CPI snapshot',[],null);
  }
  const relayPromise=fetchRelayDataset(config).then(loaded=>({loaded}),error=>({error}));
  const livePromise=fetchDataset(config).then(loaded=>({loaded}),error=>({error}));
  try{
    const snapshot=await fetchVerifiedSnapshot(config);if(version!==loadVersion)return;
    verified=datasetWithVerifiedRoutes(config,snapshot.games,snapshot.teams,embedded);
    DATA=cached?datasetWithVerifiedRoutes(config,cached.games,cached.teams,verified):verified;
    dot.classList.add('fallback');
    status.textContent=`Verified ${config.age} ${config.division} schedule loaded · checking CPI live relay…`;
    renderSourceMeta(config,cached?'Schedule ready · checking live relay':'Verified CPI snapshot',DATA.games,cached?.cachedAt||snapshot.updatedAt,'CPI loaded the repository schedule first so every division retains bracket-routing metadata while the relay refreshes.');
    rebuild();team.disabled=false;
  }catch(snapshotError){
    if(version!==loadVersion)return;
    if(!immediate)status.textContent=`Checking CPI relay for ${config.age} ${config.division}…`;
  }

  let relayApplied=false,relayFresh=false;
  try{
    const relayResult=await relayPromise;if(relayResult.error)throw relayResult.error;
    const loaded=relayResult.loaded;if(version!==loadVersion)return;
    relayApplied=true;relayFresh=!loaded.isFallback;
    if(relayFresh)markLiveSuccess(config);
    DATA=datasetWithVerifiedRoutes(config,loaded.games,loaded.teams,verified||embedded);
    writeCache(config,DATA);
    const refreshedAt=loaded.updatedAt||loaded.checkedAt||new Date().toISOString();
    if(relayFresh){
      dot.classList.remove('fallback');
      status.textContent=`Live through CPI relay · ${config.age} ${config.division} · ${DATA.games.length} games · refreshed ${new Date(refreshedAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}`;
      renderSourceMeta(config,'CPI live relay',DATA.games,refreshedAt,'CPI fetched and validated the official Google Sheet from its server-side relay, so this browser does not depend on a direct Google connection.','CPI live relay');
    }else{
      dot.classList.add('fallback');
      status.textContent=`Using CPI relay bank · ${config.age} ${config.division} · Google refresh pending`;
      renderSourceMeta(config,'Last-known-good CPI relay',DATA.games,refreshedAt,'The relay preserved its last validated schedule because its latest Google check was unsuccessful.','CPI live relay');
    }
    rebuild();team.disabled=false;
  }catch(relayError){
    if(version!==loadVersion)return;
  }

  try{
    const liveResult=await livePromise;if(liveResult.error)throw liveResult.error;
    const loaded=liveResult.loaded;if(version!==loadVersion)return;
    markLiveSuccess(config);
    const refreshedAt=loaded.updatedAt||new Date().toISOString();
    DATA=datasetWithVerifiedRoutes(config,loaded.games,loaded.teams,verified||embedded);
    writeCache(config,DATA);
    dot.classList.remove('fallback');
    status.textContent=`Live from Google Sheets · ${config.age} ${config.division} · ${DATA.games.length} games · ${loaded.method||'live'} · refreshed ${new Date(refreshedAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}`;
    renderSourceMeta(config,'Live browser refresh',DATA.games,refreshedAt,'The browser reached Google directly. Live results remain merged with verified bracket-routing metadata.');
  }catch(error){
    if(version!==loadVersion)return;
    if(relayApplied&&relayFresh)return;
    const retryDelay=markLiveFailure(config);
    const retryNote=` CPI will retry live updates in about ${Math.round(retryDelay/1000)} seconds.`;
    if(relayApplied){
      dot.classList.add('fallback');
      status.textContent=`Using last-known-good CPI relay · direct Google connection unavailable`;
      renderSourceMeta(config,'Last-known-good CPI relay',DATA.games,null,'CPI preserved the relay schedule while both the relay and this browser wait for Google to recover.'+retryNote,'CPI live relay');
    }else{
      const fallbackCache=readCache(config);
      if(fallbackCache){
        DATA=datasetWithVerifiedRoutes(config,fallbackCache.games,fallbackCache.teams,verified||embedded);
        dot.classList.add('fallback');
        status.textContent=`Using last successful ${config.age} ${config.division} update · live sources unavailable`;
        renderSourceMeta(config,'Last verified browser cache',DATA.games,fallbackCache.cachedAt,'The relay and live sheet could not be read, so CPI preserved the last successful browser schedule.'+retryNote);
      }else if(verified){
        DATA=verified;
        dot.classList.add('fallback');
        status.textContent=`Using verified ${config.age} ${config.division} schedule · live sources unavailable`;
        renderSourceMeta(config,'Verified CPI snapshot',DATA.games,null,'The repository schedule remains available even when the relay and Google are temporarily unavailable.'+retryNote);
      }else if(embedded){
        DATA=embedded;
        dot.classList.add('fallback');
        status.textContent=`Using verified ${config.age} ${config.division} schedule · live sources unavailable`;
        renderSourceMeta(config,'Embedded verified schedule',DATA.games,null,'The schedule is built directly into this release, so it remains available during an upstream outage.'+retryNote);
      }else{
        DATA={age:config.age,division:config.division,teams:[],games:[]};
        dot.classList.add('fallback');
        status.textContent=`Could not load ${config.age} ${config.division} (${error.message})`;
        renderSourceMeta(config,'Unavailable',[],null,'No verified schedule is currently available in this browser.'+retryNote);
      }
    }
  }finally{
    if(version===loadVersion){rebuild();button.disabled=false;team.disabled=false}
  }
}

function selectDataset(){const config=currentConfig();if(!config)return;clearLiveRetry();activeLoads.clear();updateSheetLink();localStorage.setItem('joAgeV5',config.age);localStorage.setItem(`joDivisionV5:${config.age}`,config.id);search.value='';day.value='';loadCurrent(false)}
age.addEventListener('change',()=>{localStorage.setItem('joAgeV5',age.value);populateDivisions();selectDataset()});division.addEventListener('change',selectDataset);team.addEventListener('change',renderTeam);search.addEventListener('input',renderRelevant);day.addEventListener('change',renderRelevant);$('journeyTab').addEventListener('click',()=>{$('journeyTab').classList.add('active');$('relevantTab').classList.remove('active');journey.classList.remove('hidden');$('relevant').classList.add('hidden')});$('relevantTab').addEventListener('click',()=>{$('relevantTab').classList.add('active');$('journeyTab').classList.remove('active');journey.classList.add('hidden');$('relevant').classList.remove('hidden')});$('refresh').addEventListener('click',()=>loadCurrent(true));
$('share')?.addEventListener('click',copyShareLink);
$('fullSearch')?.addEventListener('input',renderFullSchedule);
$('fullDay')?.addEventListener('change',renderFullSchedule);
function refreshWhenActive(){
  if(document.hidden)return;
  if(Date.now()-lastLoadAttemptAt<ACTIVE_REFRESH_MIN_MS)return;
  loadCurrent(false);
}
window.CPI_JO_APP_READY=true;
window.CPI_JO_REFRESH_INTERVAL_MS=REFRESH_MS;
populateAges();
selectDataset();
refreshTimer=setInterval(()=>loadCurrent(false),REFRESH_MS);
window.addEventListener('focus',refreshWhenActive);
window.addEventListener('online',refreshWhenActive);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshWhenActive()});

