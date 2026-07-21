#!/usr/bin/env node
"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.resolve(__dirname,"..");
function requireCondition(condition,message){if(!condition)throw new Error(message)}
function loadContext(side){
  const app=fs.readFileSync(path.join(ROOT,`tournaments/${side}/app.js`),"utf8");
  const start=app.indexOf("function titleTeam"),end=app.indexOf("const initialParams");
  requireCondition(start>=0&&end>start,`Could not isolate ${side} stage functions`);
  const scoreOutcome=g=>{const w=Number(g?.whiteScore),d=Number(g?.darkScore);if(!Number.isFinite(w)||!Number.isFinite(d)||w===d)return null;return w>d?"white":"dark"};
  const context={console,Set,Map,Number,String,Array,Object,Math,Date,JSON,
    ACRONYMS:new Set(["SD","UC","LB","CC","CDM","CHAWP","SHAQ","OCWPC"]),
    DATA:{teams:[],games:[]},RESOLVED:{games:[],map:new Map(),slots:new Map(),placements:new Map(),seedLookup:new Map()},
    scoreOutcome,gameScoreParts:g=>({white:{regulation:Number(g.whiteScore)},dark:{regulation:Number(g.darkScore)}}),
    normalizeDestination:value=>String(value||"").trim().replace(/^[WL]-?(\d+[A-Z]?)$/i,"$1").replace(/-$/,""),
    currentConfig:()=>({division:"Girls Championship (D1)"}),esc:x=>String(x),identityAttributes:()=>"",statusText:()=>"Still alive"
  };
  context.normalizeGameNumber=value=>{const raw=String(value||"").trim().toUpperCase();return /^\d+$/.test(raw)?Number(raw):raw};
  context.validGameNumber=value=>/^\d+[A-Z]?$/.test(String(value||""));
  vm.createContext(context);vm.runInContext(app.slice(start,end),context,{filename:`${side}/app.js#stage`});return context;
}

for(const side of ["jo-girls","jo-boys"]){
  const ctx=loadContext(side);
  const opening=[
    {date:"18-Jul",time:"8:40 AM",type:"Group",stageDetail:"",location:"Pool",game:9,whiteRaw:"1-NEWPORT BEACH BLUE",whiteScore:"19",darkRaw:"48-TOPAZ TSUNAMI",darkScore:"1",winnerTo:"33",loserTo:"37",gmid:"14G-009"},
    {date:"18-Jul",time:"9:30 AM",type:"Group",stageDetail:"",location:"Pool",game:13,whiteRaw:"24-LAMORINDA B",whiteScore:"11",darkRaw:"25-SAN CLEMENTE BLACK",darkScore:"15",winnerTo:"33",loserTo:"37",gmid:"14G-013"},
    {date:"18-Jul",time:"1:40 PM",type:"Group",stageDetail:"",location:"Pool",game:33,whiteRaw:"W9-NEWPORT BEACH BLUE",whiteScore:"17",darkRaw:"W13-SAN CLEMENTE BLACK",darkScore:"3",winnerTo:"",loserTo:"57",gmid:"14G-033"},
    {date:"18-Jul",time:"2:30 PM",type:"Group",stageDetail:"",location:"Pool",game:37,whiteRaw:"L9-TOPAZ TSUNAMI",whiteScore:"2",darkRaw:"L13-LAMORINDA B",darkScore:"16",winnerTo:"53",loserTo:"",gmid:"14G-037"}
  ];
  ctx.DATA={teams:["Newport Beach Blue","Topaz Tsunami","Lamorinda B","San Clemente Black"],games:opening};ctx.RESOLVED=ctx.resolveTournament();
  let games=ctx.gamesForTeam("Lamorinda B"),context=ctx.stageContextForTeam("Lamorinda B",games,null);
  requireCondition(context.stage==="Group A",`${side} opening group should be Group A, found ${context.stage}`);
  requireCondition(context.members.length===4&&context.members.includes("Lamorinda B"),`${side} opening group roster should contain four teams`);

  const subdivision=[
    {date:"19-Jul",time:"7:50 AM",type:"Group",stageDetail:"pt_Group",location:"Pool",game:66,whiteRaw:"pt_P2-LAMORINDA A",whiteScore:"7",darkRaw:"pt_P3-PATRIOT NAVY",darkScore:"8",winnerTo:"",loserTo:"",gmid:"14G-066"},
    {date:"19-Jul",time:"11:10 AM",type:"Group",stageDetail:"pt_Group",location:"Pool",game:82,whiteRaw:"pt_P1-DIABLO ALLIANCE A",whiteScore:"14",darkRaw:"pt_P3-PATRIOT NAVY",darkScore:"11",winnerTo:"",loserTo:"",gmid:"14G-082"},
    {date:"19-Jul",time:"2:30 PM",type:"Group",stageDetail:"pt_Group",location:"Pool",game:98,whiteRaw:"pt_P1-DIABLO ALLIANCE A",whiteScore:"12",darkRaw:"pt_P2-LAMORINDA A",darkScore:"6",winnerTo:"",loserTo:"",gmid:"14G-098"},
    {date:"20-Jul",time:"5:00 PM",type:"9-12 semi",stageDetail:"pt_9-12 semi",location:"Pool",game:153,whiteRaw:"L129-GREENWICH",whiteScore:"",darkRaw:"L125-LAMORINDA A",darkScore:"",winnerTo:"182",loserTo:"181",gmid:"14G-153"}
  ];
  ctx.DATA={teams:["Lamorinda A","Patriot Navy","Diablo Alliance A","Greenwich"],games:subdivision};ctx.RESOLVED=ctx.resolveTournament();
  games=ctx.gamesForTeam("Lamorinda A");const upcoming=games.find(g=>!ctx.isFinal(g));context=ctx.stageContextForTeam("Lamorinda A",games,upcoming);
  requireCondition(context.stage==="Platinum · 9-12 Semifinal",`${side} should distinguish the Platinum 9-12 semifinal, found ${context.stage}`);
  requireCondition(context.groupTitle==="Platinum Group P",`${side} should retain Platinum Group P context`);
  requireCondition(context.members.join("|")==="Diablo Alliance A|Lamorinda A|Patriot Navy",`${side} should list the three Platinum Group P teams in slot order`);
  requireCondition(ctx.friendlyStage({type:"9-12 semi",stageDetail:"au_9-12 semi"})==="Gold · 9-12 Semifinal",`${side} should distinguish Gold placement games`);
  requireCondition(ctx.friendlyStage({type:"Group",stageDetail:"ag_Group"})==="Silver · Group play",`${side} should label Silver group play`);
  requireCondition(ctx.friendlyStage({type:"Group",stageDetail:"bz_Group"})==="Bronze · Group play",`${side} should label Bronze group play`);
}
console.log("JO STAGE CONTEXT 7.51.3 TESTS PASSED");
console.log(" - Opening groups show the group letter and complete roster");
console.log(" - Later pool assignments replace the opening group automatically");
console.log(" - Platinum, Gold, Silver, and Bronze stay visible during placement rounds");
