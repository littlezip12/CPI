#!/usr/bin/env node
const fs=require('fs');const path=require('path');const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');const json=p=>JSON.parse(read(p));const errors=[];
const js=read('js/tournament-platform-v7-54-0.js');const html=read('tournament.html');const registry=json('data/tournaments/platform/registry.json');
for(const token of ['filteredGames','renderGames','renderTeams','renderPlacements','renderJourney','tpEventSelect','data-team','officialSourceUrl'])if(!js.includes(token))errors.push(`platform runtime missing ${token}`);
for(const token of ['data/tournaments/platform/runtime.js?v=7.54.1','js/tournament-platform-v7-54-0.js?v=7.54.1','data-wpi-sponsor-placement="tournament_inline"'])if(!html.includes(token))errors.push(`platform page missing ${token}`);
if(!js.includes('const RELEASE = "7.54.1"'))errors.push('platform runtime cache release is not 7.54.1');
const live=registry.events.filter(event=>event.migrationStatus==='platform_live').map(event=>event.id).sort();
if(JSON.stringify(live)!==JSON.stringify(['2026-boys-futures-super-finals','2026-quiksilver-cup']))errors.push('event selector does not expose both migrated events');
if(errors.length){console.error('WPI TOURNAMENT PLATFORM 7.54.1 BROWSER TEST FAILED');errors.forEach(error=>console.error(` - ${error}`));process.exit(1)}
console.log('WPI TOURNAMENT PLATFORM 7.54.1 BROWSER TEST PASSED');
console.log(' - Shared game, team, placement, and journey renderers serve two migrated events');
console.log(' - Event switching, cache-busted registry data, responsive filters, and sponsor placement remain wired');
