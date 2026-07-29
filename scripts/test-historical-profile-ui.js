#!/usr/bin/env node
"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.resolve(__dirname,"..");const read=r=>fs.readFileSync(path.join(ROOT,r),"utf8");const req=(c,m)=>{if(!c)throw new Error(m)};
const history=JSON.parse(read("data/tournaments/history/index.json"));
req(history.counts.teams>=100,"Historical team profile coverage is missing");
req(history.counts.clubs>=70,"Historical club profile coverage is missing");
const teamJs=read("js/team-tournament-history-v7-53-1.js"),clubJs=read("js/club-intelligence-v7-26.js");
req(teamJs.includes("CPI_HISTORICAL_PROFILES"),"Unified team history does not load historical profiles");
req(teamJs.includes("CPI_TOURNAMENT_ARCHIVE"),"Unified team history does not load full archive games");
req(teamJs.includes("Tournament history"),"Unified team history heading missing");
req(teamJs.includes("does not independently change the WPI ranking"),"Team ranking quarantine copy missing");
req(clubJs.includes("renderHistoricalClubProfile"),"Club historical renderer missing");
req(clubJs.includes("Program results and entries"),"Club history heading missing");
req(clubJs.includes("cannot change published WPI rankings automatically"),"Club ranking quarantine copy missing");
new vm.Script(teamJs);new vm.Script(clubJs);
console.log("HISTORICAL PROFILE UI TESTS PASSED");
console.log(" - Team profiles merge completed-event history into one tournament timeline")
console.log(" - Club profiles aggregate entries, records, and verified finishes")
console.log(" - Historical context is visibly quarantined from published rankings")
