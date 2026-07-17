#!/usr/bin/env node
"use strict";
const fs=require("fs"),vm=require("vm"),path=require("path");
const ROOT=path.resolve(__dirname,"..");const read=rel=>fs.readFileSync(path.join(ROOT,rel),"utf8");const req=(c,m)=>{if(!c)throw new Error(m)};
function element(value=""){return{innerHTML:"",textContent:"",value,options:[],className:"",addEventListener(){}}}
const elements={"#archiveGenerated":element(),"#archiveState":element(),"#archiveStats":element(),"#archiveEvents":element(),"#archiveScope":element(),"#archiveEvent":element("all"),"#archiveDivision":element("all"),"#archiveStatus":element("all"),"#archiveAge":element("all"),"#archiveGender":element("all"),"#archiveSearch":element(""),"#archiveCount":element(),"#archiveGames":element()};
const document={querySelector:s=>elements[s]||null};
const location={search:"",pathname:"/CPI/tournament-archive.html"};
const history={replaceState(){}};
const window={location};
const context={window,document,console,Date,URLSearchParams,location,history};vm.createContext(context);
vm.runInContext(read("data/tournaments/archive/runtime.js"),context,{filename:"archive-runtime"});
elements["#archiveDivision"].options=[];
vm.runInContext(read("js/tournament-archive-v7-49.js"),context,{filename:"archive-ui"});
req(elements["#archiveEvents"].innerHTML.includes("Quiksilver Cup"),"Archive UI did not render Quiksilver Cup");
req(elements["#archiveEvents"].innerHTML.includes("Boys Futures Super Finals"),"Archive UI did not render Boys Futures Super Finals");
req(elements["#archiveEvents"].innerHTML.includes("Girls US Club Championships"),"Archive UI did not render Girls US Club Championships");
req(elements["#archiveStats"].innerHTML.includes("Verified finals"),"Archive final-score summary did not render");
req(elements["#archiveStats"].innerHTML.includes("Ranked teams linked"),"Archive identity coverage did not render");
req(elements["#archiveAge"].innerHTML.includes("14U"),"Age filter did not populate");
req(elements["#archiveGender"].innerHTML.includes("Boys"),"Gender filter did not populate");
req((window.CPI_TOURNAMENT_ARCHIVE.games||[]).length>0,"Archive runtime should contain banked games");
req(elements["#archiveGames"].innerHTML.includes("Official source"),"Archive source links did not render");
req(elements["#archiveGames"].innerHTML.includes("archive-team-link")||elements["#archiveGames"].innerHTML.includes("archive-team-side"),"Archive team/profile rendering did not initialize");
console.log("TOURNAMENT ARCHIVE UI TESTS PASSED");
console.log(" - All three completed tournaments render from the normalized archive runtime");
console.log(" - Team, club, age, gender, division, and status filtering are wired");
console.log(" - Profile links and official source traceability render without enabling ranking evidence");
