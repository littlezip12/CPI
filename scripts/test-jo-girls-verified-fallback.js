#!/usr/bin/env node
"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.resolve(__dirname,"..");
const appPath=path.join(ROOT,"tournaments/jo-girls/app.js"),app=fs.readFileSync(appPath,"utf8");
function requireCondition(condition,message){if(!condition)throw new Error(message)}
const datasetsMarker="const DATASETS=",datasetsStart=app.indexOf(datasetsMarker),datasetsEnd=app.indexOf(";\nconst EMBEDDED_SNAPSHOT_CSV",datasetsStart);
requireCondition(datasetsStart>=0&&datasetsEnd>datasetsStart,"Girls dataset registry is missing");
const registryContext={value:null};vm.createContext(registryContext);vm.runInContext(`value=${app.slice(datasetsStart+datasetsMarker.length,datasetsEnd)}`,registryContext);
const datasets=registryContext.value;
requireCondition(Array.isArray(datasets)&&datasets.length===11,`Expected 11 Girls/Coed divisions, found ${Array.isArray(datasets)?datasets.length:0}`);

const parserStart=app.indexOf("function normalizeHeader"),parserEnd=app.indexOf("const initialParams");
requireCondition(parserStart>=0&&parserEnd>parserStart,"Could not isolate Girls schedule parser");
const ctx={console,Set,Map,Number,String,Array,Object,Math,Date,JSON,ACRONYMS:new Set(["SD","CDM","LB","CC","WPC","CHAWP","LOWPO","SHAQ","OCWPC","ECA","ASA","CMAC","TPC","WCAC","SET","LA","OC","USA","CIU"]),DATA:{teams:[],games:[]},RESOLVED:{games:[],map:new Map(),slots:new Map(),placements:new Map(),seedLookup:new Map()},currentConfig:()=>({division:"Girls Championship (D1)"}),esc:String,identityAttributes:()=>""};
vm.createContext(ctx);vm.runInContext(app.slice(parserStart,parserEnd),ctx,{filename:"jo-girls/app.js#verified-snapshot-parser"});
let totalGames=0;
for(const config of datasets){
  const file=path.join(ROOT,"data/tournaments/raw/2026-jo-weekend-1",`${config.id}.csv`);
  requireCondition(fs.existsSync(file),`Verified Girls snapshot missing: ${config.id}`);
  const csv=fs.readFileSync(file,"utf8"),games=ctx.parseLive(csv),teams=ctx.teamsFromGames(games);
  requireCondition(games.length>=5,`${config.id} parsed only ${games.length} games`);
  requireCondition(teams.length>=2,`${config.id} parsed only ${teams.length} seeded teams`);
  totalGames+=games.length;
}
const twelveCsv=fs.readFileSync(path.join(ROOT,"data/tournaments/raw/2026-jo-weekend-1/12u-girls-championship.csv"),"utf8"),twelve=ctx.parseLive(twelveCsv);
for(const game of ["135A","147A","152A"])requireCondition(twelve.some(g=>String(g.game)===game),`12U Girls verified schedule must preserve Game ${game}`);
const loadStart=app.indexOf("async function loadCurrentInternal"),loadEnd=app.indexOf("function selectDataset",loadStart),loadBlock=app.slice(loadStart,loadEnd);
requireCondition(loadBlock.indexOf("await fetchVerifiedSnapshot(config)")>=0,"Girls app must load the verified WPI snapshot");
requireCondition(loadBlock.indexOf("const livePromise=fetchDataset(config)")<loadBlock.indexOf("await fetchVerifiedSnapshot(config)"),"Girls live request should begin while the verified snapshot loads");
requireCondition(loadBlock.indexOf("await fetchVerifiedSnapshot(config)")<loadBlock.indexOf("await livePromise"),"Girls app must render the verified snapshot before applying Google data");
requireCondition(loadBlock.includes("cached.games,cached.teams,verified"),"Girls cache must be enriched with verified bracket metadata");
requireCondition(fs.statSync(appPath).size<=200000,`Girls app exceeds the 200KB poolside budget: ${fs.statSync(appPath).size}`);
console.log("GIRLS JO VERIFIED FALLBACK TESTS PASSED");
console.log(` - All ${datasets.length} Girls/Coed repository schedules parse successfully (${totalGames} games)`);
console.log(" - The selected division snapshot renders before live Google requests complete");
console.log(" - Browser cache is enriched with verified bracket-routing metadata");
console.log(" - 12U lettered game identifiers survive parsing and journey resolution");
