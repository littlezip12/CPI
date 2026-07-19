#!/usr/bin/env node
"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.resolve(__dirname,"..");
function requireCondition(condition,message){if(!condition)throw new Error(message)}
function loadJourneyContext(side){
  const file=path.join(ROOT,`tournaments/${side}/app.js`),app=fs.readFileSync(file,"utf8");
  requireCondition(app.includes("APP_VERSION='7.50.8'"),`${side} does not advertise APP_VERSION 7.50.8`);
  const start=app.indexOf("function titleTeam"),end=app.indexOf("const initialParams");
  requireCondition(start>=0&&end>start,`Could not isolate ${side} journey functions`);
  const scoreOutcome=g=>{if(!g)return null;const ws=String(g.whiteScore??""),ds=String(g.darkScore??"");if(ws===""||ds==="")return null;const w=Number(ws),d=Number(ds);if(!Number.isFinite(w)||!Number.isFinite(d)||w===d)return null;return w>d?"white":"dark"};
  const context={console,Set,Map,Number,String,Array,Object,Math,Date,JSON,
    ACRONYMS:new Set(["SD","UC","LB","CC","CDM","CHAWP","SHAQ","OCWPC"]),
    DATA:{teams:[],games:[]},RESOLVED:{games:[],map:new Map(),slots:new Map(),placements:new Map(),seedLookup:new Map()},
    scoreOutcome,gameScoreParts:g=>({white:{regulation:Number(g.whiteScore)},dark:{regulation:Number(g.darkScore)}}),
    normalizeDestination:value=>{let v=String(value||'').trim();let m=v.match(/^[WL]-?(\d+)$/i);if(m)return m[1];m=v.match(/^[WL]-?([a-z]{2}_[A-Z]\d)$/i);if(m)return m[1];return v.replace(/-$/,'')},
    currentConfig:()=>({division:"Girls Championship (D1)"}),esc:x=>String(x),identityAttributes:()=>""
  };
  context.normalizeGameNumber=value=>{const raw=String(value||'').trim().toUpperCase();return /^\d+$/.test(raw)?Number(raw):raw};
  context.validGameNumber=value=>/^\d+[A-Z]?$/.test(String(value||''));
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
  ctx.DATA={teams:['Diablo Alliance A','Southside','CDM','Clovis A'],games:poolRouteGames.map(g=>({...g}))};ctx.RESOLVED=ctx.resolveTournament();
  const routed=ctx.gamesForTeam('Diablo Alliance A'),ids=routed.map(g=>g.game).join(',');
  requireCondition(ids==='2,26,82,98',`${label} app must carry Diablo Alliance A into both scheduled pool games; found ${ids}`);
  requireCondition(routed[2].whiteTeam==='Diablo Alliance A'&&routed[3].whiteTeam==='Diablo Alliance A',`${label} app must attach the selected team to unresolved pool slots`);
  requireCondition(ctx.parsePoolSlot('pt_P1-')?.key==='pt_P1',`${label} app must normalize trailing pool-slot markers`);
}



const labeledPoolRouteGames=poolRouteGames.map(g=>{
  if(g.game===26)return{...g,winnerTo:''};
  if(g.game===82)return{...g,whiteRaw:'pt_P1-DIABLO ALLIANCE A',darkRaw:'pt_P3-PLATINUM POOL P SEED 3'};
  if(g.game===98)return{...g,whiteRaw:'pt_P1-DIABLO ALLIANCE A',darkRaw:'pt_P2-LAMORINDA A'};
  return{...g};
});
for(const [label,ctx] of [['Girls',girls],['Boys',boys]]){
  const live=labeledPoolRouteGames.map(g=>({...g}));
  const reference=poolRouteGames.map(g=>({...g,whiteScore:'',darkScore:''}));
  const merged=ctx.mergeVerifiedSchedule(live,reference);
  ctx.DATA={teams:['Diablo Alliance A','Southside','CDM','Clovis A','Lamorinda A'],games:merged};ctx.RESOLVED=ctx.resolveTournament();
  const routed=ctx.gamesForTeam('Diablo Alliance A'),ids=routed.map(g=>g.game).join(','),upcoming=routed.find(g=>!ctx.isFinal(g));
  requireCondition(ids==='2,26,82,98',`${label} app must include labeled pool-slot Games 82 and 98 in the selected-team journey; found ${ids}`);
  requireCondition(upcoming?.game==82,`${label} app must show labeled pool-slot Game 82 as Diablo Alliance A's next game`);
  requireCondition(routed[2].whiteTeam==='Diablo Alliance A'&&routed[3].whiteTeam==='Diablo Alliance A',`${label} app must resolve route-token labels to the clean selected-team identity`);
  requireCondition(ctx.parsePoolSlot('pt_P1-DIABLO ALLIANCE A')?.key==='pt_P1',`${label} app must parse a pool slot followed by the live team label`);
  requireCondition(ctx.parsePoolPlacement('1st pt_P-DIABLO ALLIANCE A')?.key==='pt_P',`${label} app must parse a pool placement followed by the live team label`);
  requireCondition(ctx.parseGroupPlacement('1st A-DIABLO ALLIANCE A')?.key==='A',`${label} app must parse a group placement followed by the live team label`);
}

const livePoolRouteGames=poolRouteGames.map(g=>({...g,winnerTo:g.game===26?'':g.winnerTo}));
for(const [label,ctx] of [['Girls',girls],['Boys',boys]]){
  const live=livePoolRouteGames.map(g=>({...g}));
  const reference=poolRouteGames.map(g=>({...g,whiteScore:'',darkScore:''}));
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


// 7.50.8: an explicit route assignment must be authoritative even when the
// completed source game has no winner/loser destination metadata.
const allDivisionRouteGames=[
 {date:'18-Jul',time:'10:00 AM',type:'Group',location:'CHAPMAN UNIVERSITY',game:16,whiteRaw:'4-LAMORINDA A',whiteScore:'12',darkRaw:'45-OAHU',darkScore:'2',winnerTo:'26',loserTo:'45',gmid:'18G-016'},
 {date:'18-Jul',time:'12:00 PM',type:'Group',location:'CHAPMAN UNIVERSITY',game:26,whiteRaw:'W16-LAMORINDA A',whiteScore:'13',darkRaw:'W2-OTHER TEAM',darkScore:'3',winnerTo:'',loserTo:'50',gmid:'18G-026'},
 {date:'19-Jul',time:'10:00 AM',type:'Group',location:'WOOLLETT NEAR LEFT',game:80,whiteRaw:'pt_P1-LAMORINDA A',whiteScore:'',darkRaw:'pt_P3-THIRD TEAM',darkScore:'',winnerTo:'',loserTo:'',gmid:'18G-080'},
 {date:'19-Jul',time:'1:00 PM',type:'Group',location:'WOOLLETT NEAR LEFT',game:95,whiteRaw:'pt_P1',whiteScore:'',darkRaw:'pt_P2-SECOND TEAM',darkScore:'',winnerTo:'',loserTo:'',gmid:'18G-095'}
];
for(const [label,ctx] of [['Girls',girls],['Boys',boys]]){
  const live=allDivisionRouteGames.map(g=>({...g}));
  ctx.DATA={teams:['Lamorinda A','Oahu','Other Team','Third Team','Second Team'],games:live};ctx.RESOLVED=ctx.resolveTournament();
  const routed=ctx.gamesForTeam('Lamorinda A'),ids=routed.map(g=>String(g.game)).join(','),upcoming=routed.find(g=>!ctx.isFinal(g));
  requireCondition(ids==='16,26,80,95',`${label} app must use explicit assigned route labels across all divisions; found ${ids}`);
  requireCondition(String(upcoming?.game)==='80',`${label} app must show Game 80 as Lamorinda A's next game when source routing is blank`);
  requireCondition(routed.find(g=>String(g.game)==='95')?.whiteTeam==='Lamorinda A',`${label} app must propagate one explicit pt_P1 assignment to every bare pt_P1 game`);
  requireCondition(ctx.assignedRouteTeam('pt_P1-LAMORINDA A',ctx.DATA.teams)==='Lamorinda A',`${label} app must extract the clean team from a labeled pool slot`);
  requireCondition(ctx.assignedRouteTeam('W26-LAMORINDA A',ctx.DATA.teams)==='Lamorinda A',`${label} app must extract the clean team from a labeled W/L reference`);
  requireCondition(ctx.assignedRouteTeam('1st pt_P-LAMORINDA A',ctx.DATA.teams)==='Lamorinda A',`${label} app must extract the clean team from a labeled pool placement`);
  requireCondition(ctx.assignedRouteTeam('1stB-LAMORINDA A',ctx.DATA.teams)==='Lamorinda A',`${label} app must extract the clean team from a compact group placement`);
  requireCondition(ctx.parsePoolSlot('ni_A1-LAMORINDA A')?.key==='ni_A1',`${label} app must support Boys Invitational route tracks`);
  requireCondition(ctx.parsePoolSlot('cu_D3-LAMORINDA A')?.key==='cu_D3',`${label} app must support Copper route tracks`);
  requireCondition(ctx.parsePoolPlacement('1stag_M-LAMORINDA A')?.key==='ag_M',`${label} app must support compact Classic placement routes`);
  requireCondition(ctx.parseGroupPlacement('2ndB-LAMORINDA A')?.key==='B',`${label} app must support compact initial-group placement routes`);
}
requireCondition(girls.parseWL('W135A-LAMORINDA A')?.game==='135A','Girls app must preserve lettered game references used by 12U schedules');
requireCondition(girls.validGameNumber('147A'),'Girls app must accept lettered 12U game numbers');

// 7.50.8 full-format coverage: current JO sheets also use fourth/fifth-place
// routes, multi-letter pools, provenance annotations, and pool-matchup labels.
for(const [label,ctx] of [['Girls',girls],['Boys',boys]]){
  const known=['Lamorinda A','OCWPC Red','Other Team','Third Team','Fourth Team'];
  requireCondition(ctx.assignedRouteTeam('W#U1/U4-LAMORINDA A',known)==='Lamorinda A',`${label} app must resolve a team appended to a pool-matchup route`);
  requireCondition(ctx.assignedRouteTeam('bz_AA1(3rd_bz_V)-LAMORINDA A',known)==='Lamorinda A',`${label} app must resolve a team appended to a decorated multi-letter pool slot`);
  requireCondition(ctx.parsePoolSlot('bz_AA1(3rd_bz_V)')?.key==='bz_AA1',`${label} app must parse multi-letter pool slots with provenance annotations`);
  requireCondition(ctx.parsePoolSlot('bz(Y3(1st_bz_X)')?.key==='bz_Y3',`${label} app must tolerate the current bracket sheet's parenthesis-form pool slot`);
  requireCondition(ctx.parsePoolPlacement('4th au_W-')?.rank===4,`${label} app must parse fourth-place pool routes`);
  requireCondition(ctx.parsePoolPlacement('5th bz_A')?.rank===5,`${label} app must parse fifth-place pool routes`);
  requireCondition(ctx.parsePoolMatchup('W#U1/U4')?.kind==='W',`${label} app must parse winner-of-pool-matchup routes`);
  requireCondition(ctx.seedInfo('M4-OCWPC RED')?.team==='OCWPC Red',`${label} app must preserve group/seed labels that omit parentheses`);

  const matchupGames=[
    {date:'19-Jul',time:'7:00 AM',type:'U Group of 4',stageDetail:'au_U Group of 4',location:'POOL',game:70,whiteRaw:'au_U1-LAMORINDA A',whiteScore:'10',darkRaw:'au_U4-OTHER TEAM',darkScore:'2',winnerTo:'90',loserTo:'90A',gmid:'12X-070'},
    {date:'19-Jul',time:'7:50 AM',type:'U Group of 4',stageDetail:'au_U Group of 4',location:'POOL',game:106,whiteRaw:'au_U2-THIRD TEAM',whiteScore:'7',darkRaw:'au_U3-FOURTH TEAM',darkScore:'5',winnerTo:'90',loserTo:'90A',gmid:'12X-106'},
    {date:'19-Jul',time:'12:50 PM',type:'1st/2ndU',stageDetail:'au_1st/2ndU',location:'POOL',game:90,whiteRaw:'W#U1/U4',whiteScore:'',darkRaw:'W#U2/U3',darkScore:'',winnerTo:'115',loserTo:'125',gmid:'12X-090'}
  ];
  ctx.DATA={teams:known,games:matchupGames};ctx.RESOLVED=ctx.resolveTournament();
  const next=ctx.gamesForTeam('Lamorinda A').find(game=>!ctx.isFinal(game));
  requireCondition(String(next?.game)==='90',`${label} app must advance a pool-game winner into a W#U1/U4 matchup without waiting for Google to rewrite the participant cell`);
  requireCondition(next?.whiteTeam==='Lamorinda A'&&next?.darkTeam==='Third Team',`${label} app must resolve both sides of the pool-matchup game from completed source games`);
}

for(const side of ['jo-boys','jo-girls']){
  const app=fs.readFileSync(path.join(ROOT,`tournaments/${side}/app.js`),'utf8');
  requireCondition(app.includes('A verified schedule is available immediately while CPI checks for newer Google Sheet data.')||app.includes('CPI loaded the repository schedule first so every division retains bracket-routing metadata while the live sheet refreshes.'),`${side} must render verified data before live refresh finishes`);
  requireCondition(app.includes('teamGames=new Map()'),`${side} must build a team-to-games index`);
}
console.log('JO JOURNEY 7.50.8 TESTS PASSED');
console.log(' - Labeled W/L references resolve into selected-team journeys');
console.log(' - Lamorinda A advances from final Game 10 into scheduled Game 34');
console.log(' - Conditional winner, loser, and pool paths project beyond the next game');
console.log(' - Verified or cached schedules render before live refresh completes');
console.log(' - Pool-slot routes keep future game times and venues visible before opponents are known');
console.log(' - Live scores retain verified winner/loser routing when Google leaves destination cells blank');
console.log(' - Pool and placement route tokens remain resolvable when Google appends the assigned team name');
console.log(' - Explicit route assignments drive journeys even when source winner/loser metadata is blank');
console.log(' - One labeled slot assignment propagates to every matching future pool game');
console.log(' - Girls 12U lettered games, fourth/fifth-place routes, decorated multi-letter pools, and pool-matchup paths are supported');
