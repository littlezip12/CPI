#!/usr/bin/env node
const fs=require('fs'); const vm=require('vm'); const path=require('path');
const ROOT=path.resolve(__dirname,'..');
function requireCondition(c,m){if(!c)throw new Error(m)}
function read(r){return fs.readFileSync(path.join(ROOT,r),'utf8')}
function loadJson(r){return JSON.parse(read(r))}
function loadRuntime(targetWindow){global.window=targetWindow;vm.runInThisContext(read('data/tournaments/jo-profile-runtime.js'))}

function renderTeam(){
  const root={innerHTML:''}; const style={setProperty(){}};
  const targetWindow={
    location:{search:'?team=kern-premier-12u-boys',href:'http://wpi/team.html?team=kern-premier-12u-boys'},
    CPI_RANKINGS:loadJson('rankings.json'), CPI_CLUBS:loadJson('clubs.json'),
    CPI_TOURNAMENT_EVIDENCE:{teams:{}}, CPI_HISTORICAL_PROFILES:{teams:{}},
  };
  global.document={querySelector(s){if(s==='#teamProfile')return root;if(s==='.team-profile-page')return{style};return null},documentElement:{style}};
  loadRuntime(targetWindow); vm.runInThisContext(read('js/team-profile-v7-42.js'));
  for(const token of ['Kern Premier','#41','3-4','Championship','View complete JO game journey']) requireCondition(root.innerHTML.includes(token),`team render missing ${token}`);
  requireCondition(!root.innerHTML.includes('Team not found'),'ranked Kern Premier rendered as missing');
}
function renderClub(){
  const root={innerHTML:''}; const style={setProperty(){}};
  const targetWindow={location:{search:'?club=kern-premier',href:'http://wpi/club.html?club=kern-premier'},CPI_RANKINGS:loadJson('rankings.json'),CPI_CLUBS:loadJson('clubs.json'),CPI_HISTORICAL_PROFILES:{clubs:{}}};
  global.document={querySelector(s){if(s==='#clubProfileApp')return root;if(s==='.club-profile-page')return{style};return null},documentElement:{style,dataset:{}},title:''};
  loadRuntime(targetWindow); vm.runInThisContext(read('js/club-intelligence-v7-26.js'));
  for(const token of ['Kern Premier','4 ranked teams','5 JO teams','Best ranked team','#36','12U Boys','14U Boys','16U Boys','18U Boys','18U Girls']) requireCondition(root.innerHTML.includes(token),`club render missing ${token}`);
  const ageGrid=root.innerHTML.indexOf('club-age-group-grid'); const link=root.innerHTML.indexOf('team.html?team=kern-premier-12u-boys',ageGrid); const joHistory=root.innerHTML.indexOf('id="club-jo-history"');
  requireCondition(ageGrid>=0&&link>ageGrid&&link<joHistory,'Kern ranked/JO teams are not integrated into age groups');
}
renderTeam(); renderClub();
console.log('JO PROFILE RENDER 7.52.13 TESTS PASSED');
console.log(' - Kern Premier 12U Boys renders with rank and JO result');
console.log(' - Kern Premier club renders four ranked teams plus five JO entries');
