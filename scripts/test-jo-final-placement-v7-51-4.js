#!/usr/bin/env node
"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.resolve(__dirname,"..");
function requireCondition(condition,message){if(!condition)throw new Error(message)}
function loadContext(side){
  const app=fs.readFileSync(path.join(ROOT,`tournaments/${side}/app.js`),"utf8");
  const start=app.indexOf("function titleTeam"),end=app.indexOf("const initialParams");
  requireCondition(start>=0&&end>start,`Could not isolate ${side} placement functions`);
  const scoreOutcome=g=>{const w=Number(g?.whiteScore),d=Number(g?.darkScore);if(!Number.isFinite(w)||!Number.isFinite(d)||w===d)return null;return w>d?"white":"dark"};
  const context={console,Set,Map,Number,String,Array,Object,Math,Date,JSON,
    ACRONYMS:new Set(["SD","UC","LB","CC","CDM","CHAWP","SHAQ","OCWPC"]),
    DATA:{teams:[],games:[]},RESOLVED:{games:[],map:new Map(),slots:new Map(),placements:new Map(),seedLookup:new Map()},
    scoreOutcome,gameScoreParts:g=>({white:{regulation:Number(g.whiteScore)},dark:{regulation:Number(g.darkScore)}}),
    normalizeDestination:value=>String(value||"").trim().replace(/^[WL]-?(\d+[A-Z]?)$/i,"$1").replace(/-$/,""),
    currentConfig:()=>({division:"Girls Championship (D1)"}),esc:x=>String(x),identityAttributes:()=>"",statusText:()=>"Tournament complete"
  };
  context.normalizeGameNumber=value=>{const raw=String(value||"").trim().toUpperCase();return /^\d+$/.test(raw)?Number(raw):raw};
  context.validGameNumber=value=>/^\d+[A-Z]?$/.test(String(value||""));
  vm.createContext(context);vm.runInContext(app.slice(start,end),context,{filename:`${side}/app.js#placement`});return context;
}
function seeded(seed,name){return`${seed}-${name.toUpperCase()}`}
for(const side of ["jo-girls","jo-boys"]){
  const ctx=loadContext(side),teams=["Lamorinda B","Gold Opponent","Platinum 17","Platinum 18","Gold 25","Gold 26"];
  while(teams.length<44)teams.push(`Team ${teams.length+1}`);
  const games=[
    {date:"21-Jul",time:"7:00 AM",type:"17th",stageDetail:"pt_17th",location:"Pool",game:201,whiteRaw:seeded(17,"Platinum 17"),whiteScore:"8",darkRaw:seeded(18,"Platinum 18"),darkScore:"7",winnerTo:"",loserTo:"",gmid:"TEST-201"},
    {date:"21-Jul",time:"8:00 AM",type:"5th",stageDetail:"au_5th",location:"Pool",game:202,whiteRaw:seeded(23,"Lamorinda B"),whiteScore:"10",darkRaw:seeded(24,"Gold Opponent"),darkScore:"6",winnerTo:"",loserTo:"",gmid:"TEST-202"},
    {date:"21-Jul",time:"9:00 AM",type:"25th",stageDetail:"au_25th",location:"Pool",game:203,whiteRaw:seeded(43,"Gold 25"),whiteScore:"9",darkRaw:seeded(44,"Gold 26"),darkScore:"8",winnerTo:"",loserTo:"",gmid:"TEST-203"}
  ];
  ctx.DATA={teams,games};ctx.RESOLVED=ctx.resolveTournament();
  const teamGames=ctx.gamesForTeam("Lamorinda B"),placement=ctx.finalPlacementForTeam("Lamorinda B",teamGames,null);
  requireCondition(placement?.divisionLabel==="Gold",`${side} should identify the Gold subdivision`);
  requireCondition(placement?.subdivisionPlace===5,`${side} should calculate 5th in Gold`);
  requireCondition(placement?.overallPlace===23,`${side} should add the 18-team Platinum bracket and calculate 23rd overall`);
  requireCondition(placement?.totalTeams===44,`${side} should retain the 44-team division total`);
  const html=ctx.finalPlacementHtml(placement);
  requireCondition(html.includes("5th in Gold"),`${side} should render the subdivision finish`);
  requireCondition(html.includes("23rd of 44 teams overall"),`${side} should render the overall finish`);
  requireCondition(ctx.finalPlacementForTeam("Lamorinda B",teamGames,{game:204})===null,`${side} must not show a final placement while an upcoming game remains`);
  requireCondition(ctx.placementOrdinal(21)==="21st"&&ctx.placementOrdinal(23)==="23rd",`${side} should format compound ordinals correctly`);
}
console.log("JO FINAL PLACEMENT 7.51.4 TESTS PASSED");
console.log(" - Completed teams show subdivision placement and total-field placement");
console.log(" - Subdivision offsets are derived from each bracket's actual placement capacity");
console.log(" - Final placement remains hidden while a team still has an upcoming game");
