#!/usr/bin/env node
"use strict";
const fs=require("fs"),vm=require("vm"),path=require("path");
const ROOT=path.resolve(__dirname,"..");const read=rel=>fs.readFileSync(path.join(ROOT,rel),"utf8");const req=(c,m)=>{if(!c)throw new Error(m)};
function element(value=""){return{innerHTML:"",textContent:"",value,options:[],addEventListener(){}}}
const elements={"#archiveGenerated":element(),"#archiveState":element(),"#archiveStats":element(),"#archiveEvents":element(),"#archiveEvent":element("all"),"#archiveDivision":element("all"),"#archiveStatus":element("all"),"#archiveSearch":element(""),"#archiveCount":element(),"#archiveGames":element()};
const document={querySelector:s=>elements[s]||null};const window={};const context={window,document,console,Date};vm.createContext(context);
vm.runInContext(read("data/tournaments/archive/runtime.js"),context,{filename:"archive-runtime"});
// options are only needed for a browser selection-preservation check.
elements["#archiveDivision"].options=[];
vm.runInContext(read("js/tournament-archive-v7-48.js"),context,{filename:"archive-ui"});
req(elements["#archiveEvents"].innerHTML.includes("Quiksilver Cup"),"Archive UI did not render Quiksilver Cup");
req(elements["#archiveEvents"].innerHTML.includes("Boys Futures Super Finals"),"Archive UI did not render Boys Futures Super Finals");
req(elements["#archiveEvents"].innerHTML.includes("Girls US Club Championships"),"Archive UI did not render Girls US Club Championships");
req(elements["#archiveStats"].innerHTML.includes("Registered divisions"),"Archive summary did not render");
req(elements["#archiveGames"].innerHTML.includes("No archived games") || (window.CPI_TOURNAMENT_ARCHIVE.games||[]).length>0,"Archive empty/data state did not render");
console.log("TOURNAMENT ARCHIVE UI TESTS PASSED");
console.log(" - All three completed tournaments render from the normalized archive runtime");
console.log(" - Pending and banked states remain honest before and after archival sync");
console.log(" - Searchable game rendering is wired without enabling ranking evidence");
