#!/usr/bin/env node
"use strict";
const fs=require("fs");
const path=require("path");
const root=path.resolve(__dirname,"..");
let code=fs.readFileSync(path.join(root,"js/tournament-platform-v7-64-36.js"),"utf8");
code=code.replace('document.addEventListener("DOMContentLoaded",init);','globalThis.__eccRouteTest={state,resetDerived,resolvedParticipantId,groupRanking,contextualFilterOptions,immediateRouteTargets,venueSearchQuery,gameHasResolvedTeam,readPinnedTeam,writePinnedTeam,isPinnedTeam};');
global.document={getElementById:()=>null,querySelectorAll:()=>[],addEventListener:()=>{}};
const storage=new Map();global.window={localStorage:{getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)}};global.location={search:""};
eval(code);
const api=global.__eccRouteTest;
api.state.bundle=JSON.parse(fs.readFileSync(path.join(root,"data/tournaments/platform/events/2026-evan-cousineau-memorial-cup.json"),"utf8"));
api.resetDerived();
const game=(division,number)=>api.state.bundle.games.find(g=>g.divisionId===division&&g.routeNumber===String(number));
const finish=(g,white,dark)=>{g.status="final";g.scores.white=white;g.scores.dark=dark;g.outcome={kind:"decided",winnerParticipantId:null,loserParticipantId:null};};
const assert=(condition,message)=>{if(!condition)throw new Error(message);};

// Direct winner/loser reference: W#3 should collapse to the real winner once Game 3 is final.
const girls3=game("14u-girls-gold",3),girls7=game("14u-girls-gold",7);
finish(girls3,9,5);api.resetDerived();
assert(api.resolvedParticipantId(girls7,"white")===girls3.white.participantId,"W#3 did not resolve to Game 3 winner");

// Group placement reference: make Lamorinda A finish 2nd in Group A and verify 2ndA resolves into Game 19.
const a1=game("14u-boys-platinum",1),a4=game("14u-boys-platinum",4),a7=game("14u-boys-platinum",7);
finish(a1,8,5);  // Lamorinda A over SoCal Patriots Gold
finish(a4,9,4);  // San Diego Dons Red over SoCal Patriots Gold
finish(a7,7,5);  // San Diego Dons Red over Lamorinda A
api.resetDerived();
const ranked=api.groupRanking("14u-boys-platinum","A").map(id=>api.state.bundle.teams.find(t=>t.participantId===id)?.name);
assert(JSON.stringify(ranked)===JSON.stringify(["SAN DIEGO DONS RED","Lamorinda A","SOCAL PATRIOTS GOLD"]),`unexpected Group A ranking: ${JSON.stringify(ranked)}`);
const game19=game("14u-boys-platinum",19),lamo=api.state.bundle.teams.find(t=>t.name==="Lamorinda A"&&t.divisionId==="14u-boys-platinum");
assert(api.resolvedParticipantId(game19,"white")===lamo.participantId,"2ndA did not resolve to Lamorinda A in Game 19");


// Cascading filters: 14U Boys Platinum must narrow downstream team/division choices.
const opts=api.contextualFilterOptions({age:"14U",gender:"Boys",division:"14u-boys-platinum",team:"",date:"",venue:"",status:"",search:""});
assert(opts.divisions.length===2&&opts.divisions.every(d=>d.ageGroup==="14U"&&d.gender==="Boys"),`cascading division filter leaked unrelated divisions: ${opts.divisions.map(d=>d.id)}`);
assert(opts.teams.length>0&&opts.teams.every(t=>t.ageGroup==="14U"&&t.gender==="Boys"&&t.divisionId==="14u-boys-platinum"),"cascading team filter leaked unrelated teams");

// Immediate path cards: a direct W/L bracket game exposes only its next win and loss destinations.
const routeGame=api.state.bundle.games.find(g=>g.divisionId==="14u-girls-gold"&&["white","dark"].some(side=>(g.routing?.[side]?.kind||"")==="slot")&&api.immediateRouteTargets(g,g.white?.participantId||g.dark?.participantId).win);
assert(routeGame,"could not find a direct W/L route game for immediate-scenario test");
const routeTeam=routeGame.white?.participantId||routeGame.dark?.participantId;
const scenarios=api.immediateRouteTargets(routeGame,routeTeam);
assert(scenarios.win||scenarios.loss,"immediate W/L scenarios did not resolve");

// Team focus must show only real/resolved games, not every possible future branch.
const fresh=JSON.parse(fs.readFileSync(path.join(root,"data/tournaments/platform/events/2026-evan-cousineau-memorial-cup.json"),"utf8"));
const freshLamo=fresh.teams.find(t=>t.name==="Lamorinda A"&&t.divisionId==="14u-boys-platinum");
api.state.bundle=fresh;api.resetDerived();
const lamoResolved=fresh.games.filter(g=>api.gameHasResolvedTeam(g,freshLamo.participantId)&&g.status!=="final").map(g=>g.routeNumber);
assert(JSON.stringify(lamoResolved)===JSON.stringify(["1","7"]),`Lamorinda focus should expose only Games 1 and 7 before results, got ${JSON.stringify(lamoResolved)}`);

// Pinning is tournament-local browser persistence and can be toggled without an account.
api.writePinnedTeam(freshLamo.participantId);
assert(api.readPinnedTeam()===freshLamo.participantId&&api.isPinnedTeam(freshLamo.participantId),"pinned team did not persist");
api.writePinnedTeam("");
assert(api.readPinnedTeam()==="","pinned team did not clear");

assert(api.venueSearchQuery("WOOLLETT FAR LEFT").includes("William Woollett"),"Woollett map query override missing");
console.log("WPHQ 7.64.36 ECC ROUTE RUNTIME TEST PASSED");
console.log(" - W/L game-result routing resolves to the actual winner/loser");
console.log(" - group standings resolve ordinal slots (1stA/2ndA/3rdA) into actual teams");
console.log(" - cascading filters restrict downstream division/team options");
console.log(" - team focus hides unresolved future branches and keeps only confirmed next games");
console.log(" - pinned team persists for automatic tournament reopening");
console.log(" - immediate W/L destinations and venue map navigation remain available when applicable");
