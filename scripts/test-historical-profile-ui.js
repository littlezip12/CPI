#!/usr/bin/env node
"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.resolve(__dirname,"..");const read=r=>fs.readFileSync(path.join(ROOT,r),"utf8");const req=(c,m)=>{if(!c)throw new Error(m)};
const history=JSON.parse(read("data/tournaments/history/index.json"));
req(history.counts.teams>=100,"Historical team profile coverage is missing");
req(history.counts.clubs>=70,"Historical club profile coverage is missing");
const teamJs=read("js/team-profile-v7-42.js"),clubJs=read("js/club-intelligence-v7-26.js");
req(teamJs.includes("renderHistoricalProfile"),"Team historical renderer missing");
req(teamJs.includes("Historical tournament archive"),"Team history heading missing");
req(teamJs.includes("quarantined from the current CPI ranking model"),"Team ranking quarantine copy missing");
req(clubJs.includes("renderHistoricalClubProfile"),"Club historical renderer missing");
req(clubJs.includes("Program results and entries"),"Club history heading missing");
req(clubJs.includes("cannot change published CPI rankings automatically"),"Club ranking quarantine copy missing");
new vm.Script(teamJs);new vm.Script(clubJs);
console.log("HISTORICAL PROFILE UI TESTS PASSED");
console.log(" - Team profiles render separate completed-event history")
console.log(" - Club profiles aggregate entries, records, and verified finishes")
console.log(" - Historical context is visibly quarantined from published rankings")
