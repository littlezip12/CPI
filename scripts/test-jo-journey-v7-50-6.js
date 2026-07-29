#!/usr/bin/env node
"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.resolve(__dirname,"..");
function requireCondition(condition,message){if(!condition)throw new Error(message)}
function loadJourneyContext(side){
  const file=path.join(ROOT,`tournaments/${side}/app.js`),app=fs.readFileSync(file,"utf8");
  requireCondition(app.includes("APP_VERSION='7.50.6'"),`${side} does not advertise APP_VERSION 7.50.6`);
  const start=app.indexOf("function titleTeam"),end=app.indexOf("const initialParams");
  requireCondition(start>=0&&end>start,`Could not isolate ${side} journey functions`);
  const scoreOutcome=g=>{if(!g)return null;const ws=String(g.whiteScore??""),ds=String(g.darkScore??"");if(ws===""||ds==="")return null;const w=Number(ws),d=Number(ds);if(!Number.isFinite(w)||!Number.isFinite(d)||w===d)return null;return w>d?"white":"dark"};
  const context={console,Set,Map,Number,String,Array,Object,Math,Date,JSON,
    ACRONYMS:new Set(["SD","UC","LB","CC","CDM","CHAWP","SHAQ"]),
    DATA:{teams:[],games:[]},RESOLVED:{games:[],map:new Map(),slots:new Map(),placements:new Map(),seedLookup:new Map()},
    scoreOutcome,gameScoreParts:g=>({white:{regulation:Number(g.whiteScore)},dark:{regulation:Number(g.darkScore)}}),
    normalizeDestination:value=>{let v=String(value||'').trim();let m=v.match(/^[WL]-?(\d+)$/i);if(m)return m[1];m=v.match(/^[WL]-?([a-z]{2}_[A-Z]\d)$/i);if(m)return m[1];return v.replace(/-$/,'')},
    currentConfig:()=>({division:"Girls Championship (D1)"}),esc:x=>String(x),identityAttributes:()=>""
  };
  if(side==='jo-boys'){
    context.normalizeGameNumber=value=>{const m=String(value||'').trim().match(/^(\d+)([A-Z]?)$/i);return m?`${Number(m[1])}${m[2].toUpperCase()}`:String(value||'').trim()};
    context.validGameNumber=value=>/^\d+[A-Z]?$/.test(String(value||''));
  }
  vm.createContext(context);vm.runInContext(app.slice(start,end),context,{filename:`${side}/app.js#journey`});return context;
}
const girls=loadJourneyContext('jo-girls'),boys=loadJourneyContext('jo-boys');
requireCondition(girls.parseWL('W10-LAMORINDA A')?.game===10,'Girls app must parse labeled winner references');
requireCondition(girls.parseWL('L13-LAMORINDA B')?.kind==='L','Girls app must parse labeled loser references');
requireCondition(boys.parseWL('W140A-TEAM')?.game==='140A','Boys app must preserve lettered game references');
const games=[
 {date:'18-Jul',time:'8:40 AM',type:'Group',location:'UC IRVINE 2',game:10,whiteRaw:'5-LAMORINDA A',whiteScore:'21',darkRaw:'44-CENTRAL COAST',darkScore:'1',winnerTo:'34',loserTo:'38',gmid:'14G-010'},
 {date:'18-Jul',time:'9:30 AM',type:'Group',location:'UC IRVINE 2',game:14,whiteRaw:'20-SD DONS',whiteScore:'5',darkRaw:'29-SD SHORES GOLD',darkScore:'10',winnerTo:'34',loserTo:'38',gmid:'14G-014'},
 {date:'18-Jul',time:'1:40 PM',type:'Group',location:'UC IRVINE 2',game:34,whiteRaw:'W10-LAMORINDA A',whiteScore:'',darkRaw:'W14-SD SHORES GOLD',darkScore:'',winnerTo:'pt_P2',loserTo:'58',gmid:'14G-034'},
 {date:'18-Jul',time:'4:10 PM',type:'Group',location:'UC IRVINE 2',game:46,whiteRaw:'W18-STANFORD A',whiteScore:'',darkRaw:'W22-MAVERICKS',darkScore:'',winnerTo:'58',loserTo:'au_S2',gmid:'14G-046'},
 {date:'18-Jul',time:'7:30 PM',type:'2-3 cross',location:'UC IRVINE 2',game:58,whiteRaw:'L34',whiteScore:'',darkRaw:'W46',darkScore:'',winnerTo:'pt_R2',loserTo:'au_O2',gmid:'14G-058'},
 {date:'19-Jul',time:'7:50 AM',type:'Group',location:'UC IRVINE 2',game:66,whiteRaw:'pt_P2',whiteScore:'',darkRaw:'pt_P3',darkScore:'',winnerTo:'',loserTo:'',gmid:'14G-066'},
 {date:'19-Jul',time:'2:30 PM',type:'Group',location:'UC IRVINE 2',game:98,whiteRaw:'pt_P1',whiteScore:'',darkRaw:'pt_P2',darkScore:'',winnerTo:'',loserTo:'',gmid:'14G-098'}
];
girls.DATA={teams:['Lamorinda A','Central Coast','SD Dons','SD Shores Gold','Stanford A','Mavericks'],games};girls.RESOLVED=girls.resolveTournament();
const teamGames=girls.gamesForTeam('Lamorinda A'),upcoming=teamGames.find(g=>!girls.isFinal(g));
requireCondition(teamGames.map(g=>g.game).join(',')==='10,34',`Lamorinda A journey should contain Games 10 and 34, found ${teamGames.map(g=>g.game).join(',')}`);
requireCondition(upcoming?.game===34,'Lamorinda A next game should resolve to Game 34');
requireCondition(girls.otherTeam(upcoming,'Lamorinda A')==='SD Shores Gold','Game 34 opponent should resolve to SD Shores Gold');
const paths=girls.projectedOpponentPaths('Lamorinda A',upcoming,3);
requireCondition(paths.some(x=>x.game.game===58&&/Winner of Game 46/i.test(x.label)),'Loser path should carry to Game 58 versus Winner of Game 46');
requireCondition(paths.some(x=>x.game.game===66&&/Pool P Seed 3/i.test(x.label)),'Winner path should carry into the next Platinum pool game');

const poolRouteGames=[
 {date:'18-Jul',time:'7:00 AM',type:'Group',location:'UC IRVINE 2',game:2,whiteRaw:'4-DIABLO ALLIANCE A',whiteScore:'19',darkRaw:'45-SOUTHSIDE',darkScore:'1',winnerTo:'26',loserTo:'30',gmid:'14G-002'},
 {date:'18-Jul',time:'7:50 AM',type:'Group',location:'UC IRVINE 2',game:6,whiteRaw:'21-CDM',whiteScore:'3',darkRaw:'28-CLOVIS A',darkScore:'14',winnerTo:'26',loserTo:'30',gmid:'14G-006'},
 {date:'18-Jul',time:'12:00 PM',type:'Group',location:'UC IRVINE 2',game:26,whiteRaw:'W2',whiteScore:'14',darkRaw:'W6',darkScore:'3',winnerTo:'pt_P1-',loserTo:'49',gmid:'14G-026'},
 {date:'19-Jul',time:'11:10 AM',type:'Group',location:'UC IRVINE 2',game:82,whiteRaw:'pt_P1-',whiteScore:'',darkRaw:'pt_P3-',darkScore:'',winnerTo:'',loserTo:'',gmid:'14G-082'},
 {date:'19-Jul',time:'2:30 PM',type:'Group',location:'UC IRVINE 2',game:98,whiteRaw:'pt_P1',whiteScore:'',darkRaw:'pt_P2',darkScore:'',winnerTo:'',loserTo:'',gmid:'14G-098'}
];
for(const [label,ctx] of [['Girls',girls],['Boys',boys]]){
  ctx.DATA={teams:['Diablo Alliance A','Southside','CDM','Clovis A'],games:poolRouteGames.map(g=>({...g,game:label==='Boys'?String(g.game):g.game}))};ctx.RESOLVED=ctx.resolveTournament();
  const routed=ctx.gamesForTeam('Diablo Alliance A'),ids=routed.map(g=>g.game).join(',');
  requireCondition(ids==='2,26,82,98',`${label} app must carry Diablo Alliance A into both scheduled pool games; found ${ids}`);
  requireCondition(routed[2].whiteTeam==='Diablo Alliance A'&&routed[3].whiteTeam==='Diablo Alliance A',`${label} app must attach the selected team to unresolved pool slots`);
  requireCondition(ctx.parsePoolSlot('pt_P1-')?.key==='pt_P1',`${label} app must normalize trailing pool-slot markers`);
}

const livePoolRouteGames=poolRouteGames.map(g=>({...g,winnerTo:g.game===26?'':g.winnerTo}));
for(const [label,ctx] of [['Girls',girls],['Boys',boys]]){
  const live=livePoolRouteGames.map(g=>({...g,game:label==='Boys'?String(g.game):g.game}));
  const reference=poolRouteGames.map(g=>({...g,game:label==='Boys'?String(g.game):g.game,whiteScore:'',darkScore:''}));
  const merged=ctx.mergeVerifiedSchedule(live,reference);
  const routeGame=merged.find(g=>String(g.game)==='26');
  requireCondition(routeGame?.winnerTo==='pt_P1',`${label} app must restore missing live winner routing from verified schedule metadata`);
  requireCondition(routeGame?.whiteScore==='14'&&routeGame?.darkScore==='3',`${label} app must preserve live scores while restoring routing metadata`);
  ctx.DATA={teams:['Diablo Alliance A','Southside','CDM','Clovis A'],games:merged};ctx.RESOLVED=ctx.resolveTournament();
  const ids=ctx.gamesForTeam('Diablo Alliance A').map(g=>g.game).join(',');
  requireCondition(ids==='2,26,82,98',`${label} merged live data must keep Diablo Alliance A in Games 82 and 98; found ${ids}`);
}
const directLive=[
 {date:'18-Jul',time:'7:00 AM',type:'Group',location:'Pool',game:7,whiteRaw:'16-DAVIS',whiteScore:'8',darkRaw:'33-BROOKLYN HUSTLE',darkScore:'9',winnerTo:'',loserTo:'',gmid:'14G-007'},
 {date:'18-Jul',time:'5:50 PM',type:'2-3 cross',location:'BUENA PARK HS',game:52,whiteRaw:'L27',whiteScore:'',darkRaw:'L7',darkScore:'',winnerTo:'',loserTo:'',gmid:'14G-052'}
];
const directMerged=girls.mergeVerifiedSchedule(directLive,[]);
requireCondition(directMerged[0].loserTo==='52','Direct W/L references must infer a missing source destination when no verified reference is available');

for(const side of ['jo-boys','jo-girls']){
  const app=fs.readFileSync(path.join(ROOT,`tournaments/${side}/app.js`),'utf8');
  requireCondition(app.includes('A verified schedule is available immediately while WPI checks for newer Google Sheet data.'),`${side} must render verified data before live refresh finishes`);
  requireCondition(app.includes('teamGames=new Map()'),`${side} must build a team-to-games index`);
}
console.log('JO JOURNEY 7.50.6 TESTS PASSED');
console.log(' - Labeled W/L references resolve into selected-team journeys');
console.log(' - Lamorinda A advances from final Game 10 into scheduled Game 34');
console.log(' - Conditional winner, loser, and pool paths project beyond the next game');
console.log(' - Verified or cached schedules render before live refresh completes');
console.log(' - Pool-slot routes keep future game times and venues visible before opponents are known');
console.log(' - Live scores retain verified winner/loser routing when Google leaves destination cells blank');
