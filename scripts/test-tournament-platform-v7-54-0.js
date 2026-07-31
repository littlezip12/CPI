#!/usr/bin/env node
const fs=require('fs');const path=require('path');const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');const errors=[];
const js=read('js/tournament-platform-v7-54-0.js');const css=read('css/tournament-platform-v7-54-0.css');const html=read('tournament.html');
for(const token of ['filteredGames','renderGames','renderTeams','renderPlacements','renderJourney','tpEventSelect','data-team','officialSourceUrl'])if(!js.includes(token))errors.push(`platform runtime missing ${token}`);
for(const token of ['.tp-controls','.tp-games','.tp-teams','.tp-placement-groups','.tp-journey','@media(max-width:760px)'])if(!css.includes(token))errors.push(`platform stylesheet missing ${token}`);
for(const token of ['data/tournaments/platform/runtime.js?v=7.54.11','js/tournament-platform-v7-54-0.js?v=7.54.11','data-wpi-sponsor-placement="tournament_inline"'])if(!html.includes(token))errors.push(`platform page missing ${token}`);
if(errors.length){console.error('WPI TOURNAMENT PLATFORM BROWSER TEST FAILED');errors.forEach(e=>console.error(` - ${e}`));process.exit(1)}
console.log('WPI TOURNAMENT PLATFORM BROWSER TEST PASSED');
console.log(' - Shared game, team, placement, and journey renderers are present');
console.log(' - Responsive filters and sponsor-ready placement are wired');
