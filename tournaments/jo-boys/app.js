/* CPI Boys Junior Olympics schedule tool — Release 7.38.2 */
const SHEET_ID='1ycEOkayVwo_h37vL98PTXbzEnBpRU_-3S9l6NeiwCc4';
const APP_VERSION='7.38.2';
const DATASETS=[{"id":"10u-championship","age":"10U","division":"Championship (D1)","gid":"1659399499","gidAliases":["1659399499"]},{"id":"12u-boys-championship","age":"12U","division":"Boys Championship (D1)","gid":"1775879786","gidAliases":["1775879786"]},{"id":"12u-boys-classic","age":"12U","division":"Boys Classic (D2)","gid":"1808416221","gidAliases":["1808416221"]},{"id":"14u-boys-championship","age":"14U","division":"Boys Championship (D1)","gid":"345265555","gidAliases":["345265555"]},{"id":"14u-boys-classic","age":"14U","division":"Boys Classic (D2)","gid":"1855118263","gidAliases":["1855118263"]},{"id":"14u-boys-invitational","age":"14U","division":"Boys Invitational (D3)","gid":"1975322406","gidAliases":["1975322406"]},{"id":"16u-boys-championship","age":"16U","division":"Boys Championship (D1)","gid":"2012475287","gidAliases":["2012475287"]},{"id":"16u-boys-classic","age":"16U","division":"Boys Classic (D2)","gid":"1142418841","gidAliases":["1142418841"]},{"id":"16u-boys-invitational","age":"16U","division":"Boys Invitational (D3)","gid":"1686454973","gidAliases":["1686454973"]},{"id":"18u-boys-championship","age":"18U","division":"Boys Championship (D1)","gid":"38488572","gidAliases":["38488572"]},{"id":"18u-boys-classic","age":"18U","division":"Boys Classic (D2)","gid":"333261986","gidAliases":["333261986"]},{"id":"18u-boys-invitational","age":"18U","division":"Boys Invitational (D3)","gid":"289749610","gidAliases":["289749610"]}];
const EMBEDDED_FALLBACKS={};
const REFRESH_MS=120000;
const ACTIVE_REFRESH_MIN_MS=30000;
const CACHE_PREFIX='joBoysScheduleV1:';
const ACRONYMS=new Set(['SD','CDM','LB','CC','WPC','CHAWP','LOWPO','SHAQ','OCWPC','ECA','ASA','CMAC','TPC','WCAC','SET','LA','OC','USA','CIU']);
const age=$('age'),division=$('division'),team=$('team'),summary=$('summary'),next=$('next'),journey=$('journey'),paths=$('paths'),potential=$('potential'),schedule=$('schedule'),search=$('search'),day=$('day'),share=$('share');
let DATA={teams:[],games:[]},RESOLVED={games:[],map:new Map(),slots:new Map(),placements:new Map(),seedLookup:new Map()},loadVersion=0,refreshTimer=null,lastLoadAttemptAt=0;

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
function datasetUrls(config){
  const root=`https://docs.google.com/spreadsheets/d/${SHEET_ID}`;
  const gids=unique([config.gid,...(config.gidAliases||[])]);
  const urls=[];
  for(const gid of gids){
    urls.push(`${root}/gviz/tq?tqx=out:csv&gid=${encodeURIComponent(gid)}`);
    urls.push(`${root}/gviz/tq?gid=${encodeURIComponent(gid)}&tqx=out:csv`);
    urls.push(`${root}/export?format=csv&gid=${encodeURIComponent(gid)}`);
  }
  if(config.sheetName){
    const sheet=encodeURIComponent(config.sheetName);
    urls.push(`${root}/gviz/tq?tqx=out:csv&sheet=${sheet}`);
  }
  return unique(urls);
}
function jsonpUrls(config,callbackName){
  const root=`https://docs.google.com/spreadsheets/d/${SHEET_ID}`;
  const gids=unique([config.gid,...(config.gidAliases||[])]);
  const urls=[];
  for(const gid of gids){urls.push(`${root}/gviz/tq?tqx=out:json;responseHandler:${callbackName}&gid=${encodeURIComponent(gid)}`)}
  if(config.sheetName){urls.push(`${root}/gviz/tq?tqx=out:json;responseHandler:${callbackName}&sheet=${encodeURIComponent(config.sheetName)}`)}
  return unique(urls);
}
function exportUrl(config){return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${config.gid}#gid=${config.gid}`}

function normalizeHeader(value){return String(value||'').replace(/^\uFEFF/,'').trim().toLowerCase().replace(/\s+/g,' ')}
function parseCSV(text){let rows=[],row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(quoted){if(c==='"'&&n==='"'){cell+='"';i++}else if(c==='"')quoted=false;else cell+=c}else if(c==='"')quoted=true;else if(c===','){row.push(cell);cell=''}else if(c==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell=''}else cell+=c}if(cell||row.length){row.push(cell);rows.push(row)}return rows}
function headerIndex(row,names){const normalized=row.map(normalizeHeader);for(const name of names){const i=normalized.indexOf(name);if(i>=0)return i}return-1}
function headerMap(row){
  const date=headerIndex(row,['date']),time=headerIndex(row,['time']),type=headerIndex(row,['type','stage']),location=headerIndex(row,['location','venue']);
  const game=headerIndex(row,['gm #','gm#','game #','game','gm']),white=headerIndex(row,['white','team 1']),dark=headerIndex(row,['dark','team 2']);
  const winnerTo=headerIndex(row,['w to #','w to','winner to','win to']),loserTo=headerIndex(row,['l to #','l to','loser to','loss to']),gmid=headerIndex(row,['gmid','gm id','game id']);
  if([date,time,game,white,dark,gmid].some(i=>i<0))return null;
  const normalized=row.map(normalizeHeader);
  const whiteScore=normalized.findIndex((v,i)=>i>white&&i<dark&&(v==='s'||v==='score'));
  const darkScore=normalized.findIndex((v,i)=>i>dark&&(winnerTo<0||i<winnerTo)&&(v==='s'||v==='score'));
  return{date,time,type,location,game,white,whiteScore,dark,darkScore,winnerTo,loserTo,gmid};
}
function mappedGame(row,map){
  const get=i=>i>=0?String(row[i]||'').trim():'';
  const gameRaw=get(map.game),gmid=get(map.gmid),date=get(map.date),time=get(map.time);
  if(!/^\d+$/.test(gameRaw)||!/[A-Za-z0-9_-]+-\d{2,4}$/.test(gmid)||!date||!time)return null;
  return{date,time,type:get(map.type),location:get(map.location),game:Number(gameRaw),whiteRaw:get(map.white),whiteScore:get(map.whiteScore),darkRaw:get(map.dark),darkScore:get(map.darkScore),winnerTo:normalizeDestination(get(map.winnerTo)),loserTo:normalizeDestination(get(map.loserTo)),gmid};
}
function inferredGame(row){
  const cells=row.map(v=>String(v??'').trim());
  const gmidIndex=cells.findIndex(v=>/^[A-Za-z0-9_-]+-\d{2,4}$/.test(v));
  if(gmidIndex<0)return null;
  const dateIndex=cells.findIndex((v,i)=>i<gmidIndex&&(/^\d{1,2}-[A-Za-z]{3}$/.test(v)||/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(v)));
  if(dateIndex<0)return null;
  const timeIndex=cells.findIndex((v,i)=>i>dateIndex&&i<gmidIndex&&/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(v));
  if(timeIndex<0)return null;
  const gameIndex=cells.findIndex((v,i)=>i>timeIndex&&i<gmidIndex&&/^\d+$/.test(v));
  if(gameIndex<0)return null;
  const destinationStart=gmidIndex-2;
  if(destinationStart<=gameIndex+1)return null;
  const participantIndices=[];
  for(let i=gameIndex+1;i<destinationStart;i++){
    const v=cells[i];
    if(v&&!/^\d+$/.test(v))participantIndices.push(i);
  }
  if(participantIndices.length<2){
    for(let i=gameIndex+1;i<destinationStart&&participantIndices.length<2;i++)if(cells[i]&&!participantIndices.includes(i))participantIndices.push(i);
  }
  if(participantIndices.length<2)return null;
  const white=participantIndices[0],dark=participantIndices[1];
  const scoreBetween=cells.slice(white+1,dark).find(v=>/^\d+$/.test(v))||'';
  const scoreAfter=cells.slice(dark+1,destinationStart).find(v=>/^\d+$/.test(v))||'';
  return{
    date:cells[dateIndex],time:cells[timeIndex],type:cells[timeIndex+1]||'',location:cells[gameIndex-1]||'',game:Number(cells[gameIndex]),
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
function fetchJsonp(url,timeoutMs=12000){
  return new Promise((resolve,reject)=>{
    const callback=`joJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script=document.createElement('script');
    let timer;
    window[callback]=(payload)=>{cleanup();resolve(payload)};
    function cleanup(){clearTimeout(timer);delete window[callback];script.remove()}
    timer=setTimeout(()=>{cleanup();reject(new Error('Google JSONP timeout'))},timeoutMs);
    script.onerror=()=>{cleanup();reject(new Error('Google JSONP failed'))};
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
async function fetchDataset(config){
  const errors=[];
  for(const url of datasetUrls(config)){
    try{
      const response=await fetch(`${url}${url.includes('?')?'&':'?'}_=${Date.now()}`,{cache:'no-store',redirect:'follow'});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const text=await response.text();
      if(looksLikeHtml(text))throw new Error('Google returned HTML instead of CSV');
      const result=validateGames(parseLive(text));
      result.url=url;result.method='csv';return result;
    }catch(error){errors.push(`CSV ${error?.message||String(error)}`)}
  }
  for(const urlTemplate of jsonpUrls(config,'__CALLBACK__')){
    try{
      const payload=await fetchJsonp(urlTemplate);
      if(payload&&payload.status==='error')throw new Error(payload.errors?.map(e=>e.detailed_message||e.message).join('; ')||'Google returned query error');
      const rows=rowsFromGviz(payload);
      const result=validateGames(parseRows(rows));
      result.url=urlTemplate;result.method='jsonp';return result;
    }catch(error){errors.push(`JSONP ${error?.message||String(error)}`)}
  }
  throw new Error(errors.slice(-5).join(' | '));
}
function normalizeDestination(value){let v=String(value||'').trim();let m=v.match(/^[WL]-?(\d+)$/i);if(m)return m[1];m=v.match(/^[WL]-?([a-z]{2}_[A-Z]\d)$/i);if(m)return m[1];return v.replace(/-$/,'')}
function titleTeam(name){return String(name||'').trim().replace(/\(Seed-Team Name\)$/i,'').trim().split(/\s+/).map(word=>{const upper=word.toUpperCase();if(ACRONYMS.has(upper))return upper;if(/^\d+$/.test(word))return word;return word.charAt(0).toUpperCase()+word.slice(1).toLowerCase()}).join(' ')}
function seedInfo(raw){
  const value=String(raw||'').trim(),dash=value.indexOf('-');if(dash<1)return null;
  const prefix=value.slice(0,dash).replace(/\s+/g,''),name=value.slice(dash+1).trim();
  if(!name||!(/^[A-Z]\d?\(\d+\)$/i.test(prefix)||/^[A-Z]\(\d+\)$/i.test(prefix)||/^\d+$/.test(prefix)))return null;
  const group=/^[A-Z]/i.test(prefix)?prefix[0].toUpperCase():null;
  const seedMatch=prefix.match(/\((\d+)\)$/)||prefix.match(/^(\d+)$/);return{team:titleTeam(name),group,seed:seedMatch?Number(seedMatch[1]):999};
}
function smartTeam(raw){return seedInfo(raw)?.team||null}
function parseWL(raw){const m=String(raw||'').trim().match(/^([WL])(\d+)$/i);return m?{kind:m[1].toUpperCase(),game:Number(m[2])}:null}
function parsePoolSlot(raw){const m=String(raw||'').trim().match(/^([A-Za-z]{2})_([A-Z])(\d)$/);return m?{track:m[1].toLowerCase(),pool:m[2],seed:Number(m[3]),key:`${m[1].toLowerCase()}_${m[2]}${m[3]}`} : null}
function parsePoolPlacement(raw){const m=String(raw||'').trim().replace(/-$/,'').match(/^(1st|2nd|3rd)\s+([A-Za-z]{2})_([A-Z])$/i);return m?{rank:Number(m[1][0]),track:m[2].toLowerCase(),pool:m[3].toUpperCase(),key:`${m[2].toLowerCase()}_${m[3].toUpperCase()}`} : null}
function parseGroupPlacement(raw){const v=String(raw||'').trim().replace(/-$/,'').replace(/_/g,' ');const m=v.match(/^(1st|2nd|3rd)\s+([A-Z])$/i);return m?{rank:Number(m[1][0]),group:m[2].toUpperCase(),key:m[2].toUpperCase()}:null}
function trackLabel(track){return track==='pt'?'Platinum':track==='au'?'Gold':track.toUpperCase()}
function slotLabel(raw){const team=smartTeam(raw);if(team)return team;const wl=parseWL(raw);if(wl)return`${wl.kind==='W'?'Winner':'Loser'} of Game ${wl.game}`;const slot=parsePoolSlot(raw);if(slot)return`${trackLabel(slot.track)} Pool ${slot.pool} Seed ${slot.seed}`;const pp=parsePoolPlacement(raw);if(pp)return`${['','1st','2nd','3rd'][pp.rank]} in ${trackLabel(pp.track)} Pool ${pp.pool}`;const gp=parseGroupPlacement(raw);if(gp)return`${['','1st','2nd','3rd'][gp.rank]} in Group ${gp.group}`;return String(raw||'').replace(/_/g,' ')||'TBD'}
function teamsFromGames(games){return[...new Set(games.flatMap(g=>[smartTeam(g.whiteRaw),smartTeam(g.darkRaw)]).filter(Boolean))].sort((a,b)=>a.localeCompare(b))}
function isFinal(g){return g&&g.whiteScore!==''&&g.darkScore!==''&&Number.isFinite(Number(g.whiteScore))&&Number.isFinite(Number(g.darkScore))&&Number(g.whiteScore)!==Number(g.darkScore)}
function outcome(g){if(!isFinal(g)||!g.whiteTeam||!g.darkTeam)return null;return Number(g.whiteScore)>Number(g.darkScore)?{winner:g.whiteTeam,loser:g.darkTeam}:{winner:g.darkTeam,loser:g.whiteTeam}}
function rankTable(teamNames,games,seedLookup){
  const table=new Map(teamNames.map(t=>[t,{team:t,wins:0,gd:0,gf:0,seed:seedLookup.get(t)??999}]));
  for(const g of games){if(!isFinal(g)||!g.whiteTeam||!g.darkTeam)continue;for(const t of [g.whiteTeam,g.darkTeam])if(!table.has(t))table.set(t,{team:t,wins:0,gd:0,gf:0,seed:seedLookup.get(t)??999});const ws=Number(g.whiteScore),ds=Number(g.darkScore),w=table.get(g.whiteTeam),d=table.get(g.darkTeam);w.gf+=ws;w.gd+=ws-ds;d.gf+=ds;d.gd+=ds-ws;(ws>ds?w:d).wins++}
  return[...table.values()].sort((a,b)=>b.wins-a.wins||b.gd-a.gd||b.gf-a.gf||a.seed-b.seed||a.team.localeCompare(b.team)).map(x=>x.team)
}
function resolveTournament(){
  const games=DATA.games.map(g=>({...g,whiteTeam:smartTeam(g.whiteRaw),darkTeam:smartTeam(g.darkRaw)})),map=new Map(games.map(g=>[g.game,g])),slots=new Map(),groupPlacements=new Map(),poolPlacements=new Map();
  const seedLookup=new Map();for(const g of games){for(const raw of [g.whiteRaw,g.darkRaw]){const info=seedInfo(raw);if(info)seedLookup.set(info.team,info.seed)}}
  let changed=true,guard=0;
  while(changed&&guard++<50){changed=false;
    for(const g of games){for(const side of ['white','dark']){const key=`${side}Team`,raw=g[`${side}Raw`];if(g[key])continue;const wl=parseWL(raw);if(wl){const src=map.get(wl.game),o=outcome(src);if(o){g[key]=wl.kind==='W'?o.winner:o.loser;changed=true;continue}}const slot=parsePoolSlot(raw);if(slot&&slots.has(slot.key)){g[key]=slots.get(slot.key);changed=true;continue}const pp=parsePoolPlacement(raw);if(pp&&poolPlacements.has(`${pp.key}:${pp.rank}`)){g[key]=poolPlacements.get(`${pp.key}:${pp.rank}`);changed=true;continue}const gp=parseGroupPlacement(raw);if(gp&&groupPlacements.has(`${gp.key}:${gp.rank}`)){g[key]=groupPlacements.get(`${gp.key}:${gp.rank}`);changed=true}}}
    for(const g of games){const o=outcome(g);if(!o)continue;for(const [dest,teamName] of [[g.winnerTo,o.winner],[g.loserTo,o.loser]]){const slot=parsePoolSlot(dest);if(slot&&!slots.has(slot.key)){slots.set(slot.key,teamName);changed=true}}}
    const groups=new Map();for(const g of games){const wi=seedInfo(g.whiteRaw),di=seedInfo(g.darkRaw);if(!wi||!di||!wi.group||wi.group!==di.group)continue;const key=wi.group;if(!groups.has(key))groups.set(key,{games:[],teams:new Set()});groups.get(key).games.push(g);groups.get(key).teams.add(wi.team);groups.get(key).teams.add(di.team)}
    for(const [group,bucket] of groups){if(!bucket.games.length||!bucket.games.every(isFinal))continue;const ranked=rankTable([...bucket.teams],bucket.games,seedLookup);ranked.slice(0,3).forEach((teamName,i)=>{const key=`${group}:${i+1}`;if(!groupPlacements.has(key)){groupPlacements.set(key,teamName);changed=true}})}
    const pools=new Map();for(const g of games){const w=parsePoolSlot(g.whiteRaw),d=parsePoolSlot(g.darkRaw);if(!w||!d||w.track!==d.track||w.pool!==d.pool)continue;const key=`${w.track}_${w.pool}`;if(!pools.has(key))pools.set(key,{games:[],teams:new Set()});pools.get(key).games.push(g);if(g.whiteTeam)pools.get(key).teams.add(g.whiteTeam);if(g.darkTeam)pools.get(key).teams.add(g.darkTeam)}
    for(const [key,bucket] of pools){if(!bucket.games.length||!bucket.games.every(isFinal))continue;const ranked=rankTable([...bucket.teams],bucket.games,seedLookup);ranked.slice(0,3).forEach((teamName,i)=>{const placementKey=`${key}:${i+1}`;if(!poolPlacements.has(placementKey)){poolPlacements.set(placementKey,teamName);changed=true}})}
  }
  return{games,map,slots,placements:new Map([...groupPlacements,...poolPlacements]),seedLookup}
}
function display(g,side){return g?.[`${side}Team`]||slotLabel(g?.[`${side}Raw`])}
function seedForTeam(name){const seed=RESOLVED?.seedLookup?.get(name);return Number.isInteger(seed)&&seed>0&&seed<999?seed:null}
function seedBadgeHtml(name,context=''){const seed=seedForTeam(name);return seed?`<span class="jo-seed-badge${context==='dark'?' on-dark':''}" aria-label="JO division seed ${seed}" title="JO division seed ${seed}">#${seed}</span>`:''}
function teamLabelHtml(name,context=''){const label=String(name||'TBD');return`<span class="jo-team-label"${identityAttributes(label)}>${seedBadgeHtml(label,context)}<span class="jo-team-name">${esc(label)}</span></span>`}
function participantHtml(g,side,context=''){const known=g?.[`${side}Team`];return known?teamLabelHtml(known,context):`<span class="jo-team-label unresolved"><span class="jo-team-name">${esc(slotLabel(g?.[`${side}Raw`]))}</span></span>`}
function matchupHtml(g,context=''){const final=isFinal(g);return`<div class="jo-matchup${final?' is-final':''}${context==='dark'?' on-dark':''}"><div class="jo-match-participant">${participantHtml(g,'white',context)}</div><div class="jo-match-center">${final?`<span class="score">${esc(g.whiteScore)}–${esc(g.darkScore)}</span>`:'<span class="jo-versus">vs</span>'}</div><div class="jo-match-participant">${participantHtml(g,'dark',context)}</div></div>`}
function candidateLabelsHtml(names,context=''){const uniqueNames=[...new Set((names||[]).filter(Boolean))];if(!uniqueNames.length)return'<span class="jo-team-label unresolved"><span class="jo-team-name">TBD</span></span>';return`<span class="jo-candidate-list">${uniqueNames.map(name=>teamLabelHtml(name,context)).join('<span class="jo-or">or</span>')}</span>`}
function namedMatchupHtml(name,opponent,candidates=[],context='dark'){const right=opponent?teamLabelHtml(opponent,context):candidateLabelsHtml(candidates,context);return`<div class="jo-next-matchup">${teamLabelHtml(name,context)}<span class="jo-match-separator">vs</span>${right}</div>`}
function teamOptionLabel(name){const seed=seedForTeam(name);return seed?`${name} — JO seed #${seed}`:name}

function friendlyDate(raw){const labels={'18-Jul':'Saturday, July 18','19-Jul':'Sunday, July 19','20-Jul':'Monday, July 20','21-Jul':'Tuesday, July 21'};return labels[raw]||raw}
function timeValue(value){const m=String(value||'').match(/^(\d+):(\d+)\s*(AM|PM)$/i);if(!m)return 9999;let h=Number(m[1])%12;if(m[3].toUpperCase()==='PM')h+=12;return h*60+Number(m[2])}
function dateValue(raw){const m=String(raw||'').match(/^(\d{1,2})-([A-Za-z]{3})$/);if(!m)return 999;const months={Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};return(months[m[2]]||99)*100+Number(m[1])}
function gameSort(a,b){return dateValue(a.date)-dateValue(b.date)||timeValue(a.time)-timeValue(b.time)||a.game-b.game}
function gamesForTeam(name){return RESOLVED.games.filter(g=>g.whiteTeam===name||g.darkTeam===name).sort(gameSort)}
function resultFor(g,name){const o=outcome(g);return o?(o.winner===name?'win':'loss'):null}
function otherTeam(g,name){return g.whiteTeam===name?g.darkTeam:g.darkTeam===name?g.whiteTeam:null}
function targetGame(destination){return /^\d+$/.test(String(destination||''))?RESOLVED.map.get(Number(destination)):null}
function sourceCandidates(raw){const ref=parseWL(raw);if(!ref)return[];const source=RESOLVED.map.get(ref.game);return source?[source.whiteTeam,source.darkTeam].filter(Boolean):[]}
function gameCandidates(g,name){if(!g)return[];const candidates=[];for(const side of ['white','dark']){const known=g[`${side}Team`],raw=g[`${side}Raw`];if(known){if(known!==name)candidates.push(known);continue}const ref=parseWL(raw),source=ref&&RESOLVED.map.get(ref.game);if(source&&(source.whiteTeam===name||source.darkTeam===name))continue;candidates.push(...sourceCandidates(raw).filter(x=>x!==name))}return[...new Set(candidates)]}
function destinationDescription(value){if(/^\d+$/.test(String(value||''))){const g=targetGame(value);return g?{title:`Game ${g.game}`,detail:`${friendlyDate(g.date)} · ${g.time} · ${g.location}`}:{title:`Game ${value}`,detail:'Schedule details unavailable'}}const slot=parsePoolSlot(value);if(slot)return{title:slotLabel(value),detail:'Pool games will appear automatically after this result is posted.'};return value&&!['RR','bracket'].includes(String(value).toLowerCase())?{title:slotLabel(value),detail:'The next scheduled game will appear when the bracket resolves.'}:null}

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
  fullSchedule.innerHTML=list.length?list.map(g=>`<article class="game glass ${isFinal(g)?'completed':''}"><div class="top"><span>Game ${g.game}${isFinal(g)?' · FINAL':''}</span><span>${esc(friendlyDate(g.date))} · ${esc(g.time)}</span></div><div class="match">${matchupHtml(g)}</div><div class="journey-meta">${esc(g.location)} · ${esc(g.type)} · ${esc(g.gmid)}</div></article>`).join(''):'<div class="empty glass">No games match the current full-schedule filters.</div>';
}

function setEmptyState(){const empty=$('emptyState');if(empty)empty.classList.toggle('hidden',!!team.value)}
function populateAges(){const selected=pendingAge||localStorage.getItem('joBoysAgeV1')||'14U',ages=[...new Set(DATASETS.map(d=>d.age))];age.innerHTML=ages.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');age.value=ages.includes(selected)?selected:ages[0];populateDivisions();applyInitialSelection()}
function populateDivisions(preferred){const choices=DATASETS.filter(d=>d.age===age.value),saved=preferred||localStorage.getItem(`joBoysDivisionV1:${age.value}`);division.innerHTML=choices.map(d=>`<option value="${esc(d.id)}">${esc(d.division)}</option>`).join('');division.value=choices.some(d=>d.id===saved)?saved:choices[0]?.id||''}
function populateTeamAndDay(){const config=currentConfig(),saved=config?localStorage.getItem(`joBoysSelectedTeam:${config.id}`)||'':'';team.innerHTML='<option value="">Choose your team</option>'+DATA.teams.map(t=>`<option value="${esc(t)}">${esc(teamOptionLabel(t))}</option>`).join('');const target=pendingTeam||saved;if(DATA.teams.includes(target))team.value=target;pendingTeam='';const previous=day.value;day.innerHTML='<option value="">All days</option>'+[...new Set(DATA.games.map(g=>g.date))].sort((a,b)=>dateValue(a)-dateValue(b)).map(d=>`<option value="${esc(d)}">${esc(friendlyDate(d))}</option>`).join('');if([...day.options].some(o=>o.value===previous))day.value=previous;populateFullDay();}

function renderPaths(upcoming){const win=destinationDescription(upcoming.winnerTo),loss=destinationDescription(upcoming.loserTo);$('pathSection').classList.toggle('hidden',!win&&!loss);paths.innerHTML=[['win','If they win',win],['loss','If they lose',loss]].filter(x=>x[2]).map(([cls,label,d])=>`<article class="path-card ${cls} glass"><h3>${label}</h3><div class="path-destination">${esc(d.title)}</div><div class="path-detail">${esc(d.detail)}</div></article>`).join('')}
function statusText(games,upcoming){if(!games.length)return'No games found';if(!games.some(isFinal))return'Tournament not started';if(upcoming&&/5th/i.test(upcoming.type))return'Playing for 5th/6th';if(upcoming&&/3rd/i.test(upcoming.type))return'Playing for 3rd/4th';if(upcoming&&/1st|champ/i.test(upcoming.type))return'Playing for the championship';if(upcoming)return'Still alive';return'Tournament complete'}
function renderTeam(){const name=team.value,config=currentConfig();if(!name){$('teamView').classList.add('hidden');setEmptyState();updateShareUrl();return}$('teamView').classList.remove('hidden');setEmptyState();updateShareUrl();if(config)localStorage.setItem(`joBoysSelectedTeam:${config.id}`,name);const games=gamesForTeam(name),completed=games.filter(isFinal),upcoming=games.find(g=>!isFinal(g));const wins=completed.filter(g=>resultFor(g,name)==='win').length,losses=completed.length-wins,seed=seedForTeam(name);summary.innerHTML=`<div class="eyebrow">Selected team</div><div class="jo-summary-title"><h2>${esc(name)}</h2>${seed?`<span class="jo-seed-summary">JO seed #${seed}</span>`:''}</div><div class="stats"><div class="stat"><small>Record</small>${wins}-${losses}</div><div class="stat"><small>Games played</small>${completed.length}</div><div class="stat"><small>Status</small>${esc(statusText(games,upcoming))}</div></div>`;if(upcoming){const opp=otherTeam(upcoming,name),candidates=gameCandidates(upcoming,name);next.innerHTML=`<div class="next-label">Next game</div>${namedMatchupHtml(name,opp,candidates,'dark')}<div>${esc(friendlyDate(upcoming.date))} · ${esc(upcoming.time)}</div><div class="journey-meta">${esc(upcoming.location)} · Game ${upcoming.game} · ${esc(upcoming.type)}</div>`;renderPaths(upcoming)}else{next.innerHTML='<div class="next-label">Tournament status</div><div class="next-match">No upcoming game</div>';renderPaths({winnerTo:'',loserTo:''})}const grouped={};games.forEach(g=>(grouped[g.date]??=[]).push(g));journey.innerHTML=games.length?'<div class="journey">'+Object.entries(grouped).map(([date,list])=>`<section class="day"><h3>${esc(friendlyDate(date))}</h3>${list.map(g=>{const r=resultFor(g,name)||'upcoming';return`<article class="journey-card glass ${r}"><div class="journey-time">Game ${g.game}<br>${esc(g.time)}</div><div><div class="journey-score">${matchupHtml(g)}</div><div class="journey-meta">${esc(g.location)} · ${esc(g.type)}</div></div><span class="pill ${r}">${r==='win'?'Win':r==='loss'?'Loss':'Upcoming'}</span></article>`}).join('')}</section>`).join('')+'</div>':'<div class="empty glass">No resolved games are currently available for this team.</div>';renderRelevant();renderPotential(name,upcoming)}

function relevantIds(name,upcoming){const ids=new Set(gamesForTeam(name).map(g=>g.game));if(!upcoming)return ids;for(const raw of [upcoming.whiteRaw,upcoming.darkRaw]){const ref=parseWL(raw);if(ref)ids.add(ref.game)}for(const dest of [upcoming.winnerTo,upcoming.loserTo]){const target=targetGame(dest);if(!target)continue;ids.add(target.game);for(const raw of [target.whiteRaw,target.darkRaw]){const ref=parseWL(raw);if(ref)ids.add(ref.game)}}return ids}
function renderRelevant(){const name=team.value,q=String(search.value||'').trim().toLowerCase(),selectedDay=day.value,games=gamesForTeam(name),upcoming=games.find(g=>!isFinal(g)),ids=relevantIds(name,upcoming);let list=RESOLVED.games.filter(g=>g.whiteTeam||g.darkTeam);if(!q)list=list.filter(g=>ids.has(g.game));list=list.filter(g=>(!selectedDay||g.date===selectedDay)&&(!q||[display(g,'white'),display(g,'dark'),g.location,g.type,g.gmid,g.game].join(' ').toLowerCase().includes(q))).sort(gameSort);schedule.innerHTML=list.length?list.map(g=>`<article class="game glass ${isFinal(g)?'completed':''}"><div class="top"><span>Game ${g.game}${isFinal(g)?' · FINAL':''}</span><span>${esc(friendlyDate(g.date))} · ${esc(g.time)}</span></div><div class="match">${matchupHtml(g)}</div><div class="journey-meta">${esc(g.location)} · ${esc(g.type)}</div></article>`).join(''):'<div class="empty glass">No games match the current filters.</div>'}

function renderPotential(name,upcoming){const candidates=new Set(gameCandidates(upcoming,name));if(upcoming){for(const dest of [upcoming.winnerTo,upcoming.loserTo]){const g=targetGame(dest);gameCandidates(g,name).forEach(x=>candidates.add(x))}}candidates.delete(name);potential.innerHTML=candidates.size?[...candidates].filter(x=>DATA.teams.includes(x)).map(x=>`<button data-team="${esc(x)}"><div class="jo-potential-team">${teamLabelHtml(x)}</div><div class="journey-meta">View tournament journey</div></button>`).join(''):'<div class="empty glass">No additional future opponents are currently identifiable.</div>';potential.querySelectorAll('[data-team]').forEach(button=>button.addEventListener('click',()=>{team.value=button.dataset.team;renderTeam();window.scrollTo({top:0,behavior:'smooth'})}))}

function rebuild(){RESOLVED=resolveTournament();populateTeamAndDay();renderFullSchedule();if(team.value)renderTeam();else{$('teamView').classList.add('hidden');setEmptyState();updateShareUrl();}}
function readCache(config){try{const raw=localStorage.getItem(`${CACHE_PREFIX}${config.id}`);if(!raw)return null;const cached=JSON.parse(raw);return cached&&Array.isArray(cached.games)?cached:null}catch{return null}}
function writeCache(config,data){try{localStorage.setItem(`${CACHE_PREFIX}${config.id}`,JSON.stringify({...data,cachedAt:new Date().toISOString()}))}catch{}}
async function loadCurrent(manual=false){const config=currentConfig();if(!config)return;lastLoadAttemptAt=Date.now();const version=++loadVersion,status=$('statusText'),dot=$('liveDot'),button=$('refresh');button.disabled=true;team.disabled=true;status.textContent=manual?`Refreshing ${config.division}…`:`Loading ${config.age} ${config.division}…`;try{const loaded=await fetchDataset(config);if(version!==loadVersion)return;DATA={age:config.age,division:config.division,teams:loaded.teams,games:loaded.games};writeCache(config,DATA);dot.classList.remove('fallback');status.textContent=`Live from Google Sheets · ${config.age} ${config.division} · ${loaded.games.length} games · ${loaded.method||'live'} · refreshed ${new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}`}catch(error){if(version!==loadVersion)return;const cached=readCache(config),embedded=EMBEDDED_FALLBACKS[config.id];if(cached){DATA={age:config.age,division:config.division,teams:cached.teams||teamsFromGames(cached.games),games:cached.games};dot.classList.add('fallback');status.textContent=`Using last successful ${config.age} ${config.division} update · live sheet unavailable (${error.message})`}else if(embedded){DATA=structuredClone(embedded);dot.classList.add('fallback');status.textContent=`Using embedded ${config.age} ${config.division} schedule · live sheet unavailable (${error.message})`}else{DATA={age:config.age,division:config.division,teams:[],games:[]};dot.classList.add('fallback');status.textContent=`Could not load ${config.age} ${config.division} (${error.message})`}}finally{if(version===loadVersion){rebuild();button.disabled=false;team.disabled=false}}}
function selectDataset(){const config=currentConfig();if(!config)return;updateSheetLink();localStorage.setItem('joBoysAgeV1',config.age);localStorage.setItem(`joBoysDivisionV1:${config.age}`,config.id);search.value='';day.value='';loadCurrent(false)}
age.addEventListener('change',()=>{localStorage.setItem('joBoysAgeV1',age.value);populateDivisions();selectDataset()});division.addEventListener('change',selectDataset);team.addEventListener('change',renderTeam);search.addEventListener('input',renderRelevant);day.addEventListener('change',renderRelevant);$('journeyTab').addEventListener('click',()=>{$('journeyTab').classList.add('active');$('relevantTab').classList.remove('active');journey.classList.remove('hidden');$('relevant').classList.add('hidden')});$('relevantTab').addEventListener('click',()=>{$('relevantTab').classList.add('active');$('journeyTab').classList.remove('active');journey.classList.add('hidden');$('relevant').classList.remove('hidden')});$('refresh').addEventListener('click',()=>loadCurrent(true));
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

