#!/usr/bin/env node
"use strict";
const fs=require("fs");
const path=require("path");
const assert=require("assert");
const root=path.resolve(__dirname,"..");
const adapter=require(path.join(root,"js/ecc-google-live-v7-64-42.js"));
const base=JSON.parse(fs.readFileSync(path.join(root,"data/tournaments/platform/events/2026-evan-cousineau-memorial-cup.json"),"utf8"));
const csv=fs.readFileSync(path.join(root,"data/tournaments/source/2026-evan-cousineau-memorial-cup/google-master-by-division-2026-10-03.csv"),"utf8");
const rows=adapter.parseRows(adapter.parseCSV(csv));
const live=adapter.mergeBundle(base,rows,{method:"offline_fixture",fetchedAt:"2026-10-03T18:00:00Z"});
let code=fs.readFileSync(path.join(root,"js/tournament-platform-v7-64-42.js"),"utf8");
code=code.replace('document.addEventListener("DOMContentLoaded",init);','globalThis.__eccLiveRouteTest={state,resetDerived,resolvedParticipantId,groupRanking,contextualFilterOptions,immediateRouteTargets,venueSearchQuery,gameHasResolvedTeam,routeCandidates,resultFor,completedJourneyGames,teamResultScore};');
global.document={getElementById:()=>null,querySelectorAll:()=>[],addEventListener:()=>{},hidden:false};
const storage=new Map();
global.window={WPHQ_ECC_GOOGLE_LIVE:adapter,localStorage:{getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},addEventListener:()=>{}};
global.location={search:""};
eval(code);
const api=global.__eccLiveRouteTest;
api.state.baseBundle=base;api.state.bundle=live;api.resetDerived();
const gameNum=n=>live.games.find(g=>adapter.normalizeGameNumber(g.gameNumber)===adapter.normalizeGameNumber(n));
const team=(d,n)=>live.teams.find(t=>t.divisionId===d&&t.name.toUpperCase()===n.toUpperCase());

const hsg03=gameNum("HSG03"),hsg08=gameNum("HSG08");
assert(hsg03&&hsg03.status==="final");
assert.strictEqual(hsg03.white.name,"MID VALLEY");
assert.strictEqual(api.resultFor(hsg03,hsg03.white.participantId),"win");
assert.strictEqual(api.resolvedParticipantId(hsg08,"white"),team("hs-girls","MID VALLEY").participantId);
assert.strictEqual(api.resolvedParticipantId(hsg08,"dark"),team("hs-girls","HONOLULU").participantId);
assert(!live.teams.some(t=>t.divisionId==="hs-girls"&&t.name==="SD ECA"));

const lamo=team("14u-boys-platinum","LAMORINDA A"),g1=gameNum("14Bpt01"),g7=gameNum("14Bpt07");
assert(lamo&&g1&&g7);
assert.strictEqual(g1.status,"final");
assert.strictEqual(api.resultFor(g1,lamo.participantId),"win");
const lamoPlayed=api.completedJourneyGames(lamo.participantId);
assert.strictEqual(lamoPlayed.length,1,"Lamorinda journey should show its completed game");
assert.strictEqual(adapter.normalizeGameNumber(lamoPlayed[0].game.gameNumber),"14BPT01");
assert.strictEqual(api.teamResultScore(lamoPlayed[0].game,lamo.participantId,lamoPlayed[0].side),"13–11");
assert.strictEqual(api.gameHasResolvedTeam(g7,lamo.participantId),true);
const lamoOpts=api.contextualFilterOptions({age:"14U",gender:"Boys",division:"14u-boys-platinum",team:lamo.participantId,date:"",venue:"",status:"",search:""});
assert(lamoOpts.dates.length>=1,"live Lamorinda team filter lost scheduled games");

// Dynamic candidates must come from current live participants, not stale 7.64.36 seed candidates.
const hsg07=gameNum("HSG07");
assert.strictEqual(api.routeCandidates(hsg07,"white")[0],team("hs-girls","PV OVAC").participantId);
assert.strictEqual(api.routeCandidates(hsg07,"dark")[0],team("hs-girls","NORTH IRVINE").participantId);

assert(api.venueSearchQuery("WOOLLETT FAR LEFT").includes("William Woollett"));
console.log("WPHQ 7.64.42 ECC GOOGLE LIVE ROUTE RUNTIME TEST PASSED");
console.log(" - official Google participant changes replace stale 7.64.36 seed assignments");
console.log(" - MID VALLEY/PV OVAC/HONOLULU route correctly through HS Girls results");
console.log(" - Lamorinda 14U A completed-game history shows 13–11 and next scheduled game remains connected");
console.log(" - route candidates are derived from live source participants instead of stale candidate lists");
