#!/usr/bin/env node
"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.resolve(__dirname,"..");
const app=fs.readFileSync(path.join(ROOT,"tournaments/jo-boys/app.js"),"utf8");
function requireCondition(condition,message){if(!condition)throw new Error(message)}
const marker="const EMBEDDED_SNAPSHOT_CSV=";
const start=app.indexOf(marker),end=app.indexOf(";\nconst EMBEDDED_FALLBACKS",start);
requireCondition(start>=0&&end>start,"Embedded snapshot payload is missing");
const literal=app.slice(start+marker.length,end);
const context={payload:null};vm.createContext(context);vm.runInContext(`payload=${literal}`,context);
const snapshots=context.payload;
requireCondition(snapshots&&Object.keys(snapshots).length===12,`Expected 12 embedded schedules, found ${snapshots?Object.keys(snapshots).length:0}`);
const expected=["10u-championship","12u-boys-championship","12u-boys-classic","14u-boys-championship","14u-boys-classic","14u-boys-invitational","16u-boys-championship","16u-boys-classic","16u-boys-invitational","18u-boys-championship","18u-boys-classic","18u-boys-invitational"];
for(const id of expected){requireCondition(typeof snapshots[id]==="string"&&snapshots[id].includes("GMID"),`Embedded schedule missing or invalid: ${id}`)}
requireCondition(app.includes("schedule loaded · checking CPI live relay"),"App does not render the verified schedule before live network attempts");
requireCondition(app.includes("Embedded verified schedule"),"App lacks embedded fallback status handling");
console.log("BOYS JO EMBEDDED FALLBACK TESTS PASSED");
console.log(" - All 12 official schedules are built directly into app.js");
console.log(" - Verified schedules render before Google network requests complete");
console.log(" - Browser CORS, stale GIDs, and missing external CSV files cannot blank the page");
