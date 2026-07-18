#!/usr/bin/env node
"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.resolve(__dirname,"..");
function req(value,message){if(!value)throw new Error(message)}
function load(rel){
  const source=fs.readFileSync(path.join(ROOT,rel),"utf8");
  const start=source.indexOf("function unique(values)");
  const end=source.indexOf("function friendlyStage");
  req(start>=0&&end>start,`Could not isolate parser in ${rel}`);
  const context={console,EMBEDDED_SNAPSHOT_CSV:{},DATASETS:[],EMBEDDED_FALLBACKS:{}};vm.createContext(context);vm.runInContext(source.slice(start,end),context,{filename:rel});return context;
}
const csv=[
  "DATE,TIME,TYPE,LOCATION,GM #,WHITE,S,DARK,S,W TO #,L TO #,GMID,,STAGE DETAIL",
  "18-Jul,8:00 AM,Final,Pool 1,1,Team A,7.5,Team B,7.4,,,14B-001,,ag_1st"
].join("\n");
for(const rel of ["tournaments/jo-boys/app.js","tournaments/jo-girls/app.js"]){
  const app=load(rel),games=app.parseLive(csv);
  req(games.length===1,`${rel} should parse the shootout row`);
  const game=games[0];
  req(game.whiteScore==="7.5"&&game.darkScore==="7.4",`${rel} should preserve decimal shootout scores`);
  req(app.isFinal(game),`${rel} should treat 7.5-7.4 as final`);
  req(app.scoreDisplay(game)==="7–7 (SO 5–4)",`${rel} should display regulation and shootout tallies`);
}
console.log("JO SHOOTOUT & STAGE TESTS PASSED");
console.log(" - Boys and Girls viewers parse decimal shootout notation without mistaking scores for teams");
console.log(" - 7.5-7.4 displays as 7-7 (SO 5-4) and resolves as a verified final");
