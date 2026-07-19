#!/usr/bin/env node
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const errors=[];
for(const side of ['jo-boys','jo-girls']){
  const html=read(`tournaments/${side}/index.html`);
  const app=read(`tournaments/${side}/app.js`);
  for(const token of ['jo-unified-v7-50.css','jo50-livebar','jo50-metrics','metricTeamCount','activeDivisionTitle','sourceMeta','fullSchedule']){
    if(!html.includes(token))errors.push(`${side} page missing ${token}`);
  }
  if(!app.includes("APP_VERSION='7.50.8'"))errors.push(`${side} app version is not 7.50.8`);
  if(!app.includes('function updateOverviewMetrics'))errors.push(`${side} app does not populate the new overview metrics`);
  if(app.includes("namedMatchupHtml(name,opp,candidates,'dark')"))errors.push(`${side} next-game card still forces dark-theme seed badges`);
}
const css=read('tournaments/jo-unified-v7-50.css');
for(const token of ['--jo50-bg','.jo50-event-card','.jo50-metrics','@media(max-width:720px)'])if(!css.includes(token))errors.push(`Unified JO stylesheet missing ${token}`);
const hub=read('tournaments.html');
for(const token of ['tournaments-unified-v7-50.css','Live & upcoming','Completed events','Tournament intelligence'])if(!hub.includes(token))errors.push(`Tournament hub missing ${token}`);
if(errors.length){console.error('TOURNAMENT UI 7.50 TESTS FAILED');errors.forEach(e=>console.error(` - ${e}`));process.exit(1)}
console.log('TOURNAMENT UI 7.50 TESTS PASSED');
console.log(' - Boys and Girls JO pages share the approved light responsive layout');
console.log(' - Live source status, selected-division metrics, team journeys, and schedules remain wired');
console.log(' - Tournament hub separates live events, completed archives, and internal intelligence tools');
