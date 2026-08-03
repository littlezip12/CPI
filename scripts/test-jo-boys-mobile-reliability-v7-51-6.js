#!/usr/bin/env node
"use strict";
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..');
function requireCondition(condition,message){if(!condition)throw new Error(message)}
const app=fs.readFileSync(path.join(ROOT,'tournaments','jo-boys','app.js'),'utf8');
for(const token of [
  'RELAY_FRESH_MAX_AGE_MS=7*60*1000',
  'function datasetProgress(games)',
  'function datasetIsOlder(candidateGames,currentGames)',
  'if(datasetIsOlder(relayData.games,DATA.games))',
  'if(datasetIsOlder(liveData.games,DATA.games))',
  "window.addEventListener('pageshow'",
  'event.persisted',
  'WPI relay is still catching up',
  'Google returned an older result set'
])requireCondition(app.includes(token),`Boys app is missing reliability safeguard: ${token}`);

const start=app.indexOf('function datasetProgress');
const end=app.indexOf('async function fetchVerifiedSnapshot',start);
requireCondition(start>=0&&end>start,'Could not isolate dataset freshness helpers');
const scoreOutcome=g=>{
  const w=Number(g?.whiteScore),d=Number(g?.darkScore);
  return Number.isFinite(w)&&Number.isFinite(d)&&w!==d?(w>d?'white':'dark'):null;
};
const context={api:null,progress:null,Array,String,Number,scoreOutcome};
vm.createContext(context);
vm.runInContext(`${app.slice(start,end)}\napi=datasetIsOlder;progress=datasetProgress;`,context,{filename:'jo-boys-reliability'});
const oneFinal=[{whiteScore:'8',darkScore:'6'},{whiteScore:'',darkScore:''}];
const twoFinal=[{whiteScore:'8',darkScore:'6'},{whiteScore:'9',darkScore:'7'}];
requireCondition(context.api(oneFinal,twoFinal)===true,'A dataset with fewer completed games should be rejected as older');
requireCondition(context.api(twoFinal,oneFinal)===false,'A dataset with more completed games should be accepted');
requireCondition(context.api(twoFinal,twoFinal)===false,'An equal-progress dataset should not be rejected');
requireCondition(context.progress(twoFinal).finalGames===2,'Completed-game progress is counted incorrectly');

const workflow=fs.readFileSync(path.join(ROOT,'.github','workflows','sync-jo-live-relay.yml'),'utf8');
for(const token of [
  'Refresh archived JO Session 3 relay bank on demand',
  '--event 2026-jo-session-3',
  '--workers 3',
  '--timeout 8',
  '--max-candidates 2'
])requireCondition(workflow.includes(token),`Relay workflow is missing active-Boys safeguard: ${token}`);
requireCondition(!workflow.includes('cron:'),'Completed JO events must not retain a scheduled relay poll');

const sync=fs.readFileSync(path.join(ROOT,'scripts','sync-jo-live-relay.py'),'utf8');
requireCondition(sync.includes('for candidate_index, url in enumerate(urls):'),'Relay retries are not indexed');
requireCondition(sync.includes('time.sleep(1.25)'),'Relay retries do not pause between Google endpoints');

const registry=JSON.parse(fs.readFileSync(path.join(ROOT,'tournaments','jo-boys','source-registry.json'),'utf8'));
const policy=registry.liveRelayPolicy||{};
requireCondition(policy.freshMaxAgeMinutes===7,'Boys relay freshness should be seven minutes');
requireCondition(policy.scheduledEventScope==='2026-jo-weekend-2','Historical Boys event scope must remain available');
requireCondition(policy.scheduledWorkers===3&&policy.scheduledMaxCandidates===2,'Boys relay request limits are missing');

const site=JSON.parse(fs.readFileSync(path.join(ROOT,'config','site-release.json'),'utf8'));
const semverAtLeast=(value,target)=>{const a=String(value).split('.').map(Number),b=String(target).split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false;}return true};
requireCondition(semverAtLeast(site.version,'7.51.6')&&['7.51.6','7.52.7','7.52.8','7.52.9','7.53.4','7.54.5','7.54.6','7.54.7','7.54.8','7.54.9','7.54.10','7.54.11','7.54.12','7.54.13'].includes(site.joApplicationRelease),'Site metadata predates the current JO application');
requireCondition(site.joMobileReliabilityRelease==='7.51.6','Mobile reliability release metadata is missing');
for(const side of ['jo-boys','jo-girls']){
  const html=fs.readFileSync(path.join(ROOT,'tournaments',side,'index.html'),'utf8');
  requireCondition(html.includes('src="app.js?v=7.53.4"'),`${side} must retain its proven JO app cache key`);
}
const texasHtml=fs.readFileSync(path.join(ROOT,'tournaments','jo-texas','index.html'),'utf8');
requireCondition(texasHtml.includes(`src="app.js?v=${site.joSession3ApplicationRelease}"`),'jo-texas does not load the current cache-busted JO app');
console.log('JO BOYS MOBILE RELIABILITY 7.51.6 TESTS PASSED');
console.log(' - The completed Session 3 relay is manual-only; no scheduled GitHub polling remains');
console.log(' - Older relay or Google datasets cannot replace a browser copy with more completed results');
console.log(' - Mobile back-forward-cache restoration triggers a fresh data check');
console.log(' - Boys relay freshness is explicit at seven minutes while last-known-good data remains available');
