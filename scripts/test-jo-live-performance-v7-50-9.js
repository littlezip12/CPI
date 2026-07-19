#!/usr/bin/env node
"use strict";
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..');
function requireCondition(condition,message){if(!condition)throw new Error(message)}
const apps={};
for(const side of ['jo-girls','jo-boys']){
  const app=fs.readFileSync(path.join(ROOT,'tournaments',side,'app.js'),'utf8');
  apps[side]=app;
  requireCondition(app.includes("APP_VERSION='7.50.9'"),`${side} does not advertise APP_VERSION 7.50.9`);
  for(const token of [
    'LIVE_FETCH_TIMEOUT_MS=5500',
    'LIVE_JSONP_TIMEOUT_MS=6500',
    'LIVE_HEDGE_DELAY_MS=650',
    'LIVE_RETRY_DELAYS_MS=[15000,30000,60000]',
    'function liveEndpointCandidates',
    'function hedgedFirstSuccess',
    'writePreferredLiveEndpoint(config,candidate)',
    'const activeLoads=new Map()',
    'const existing=activeLoads.get(config.id)',
    'markLiveFailure(config)',
    'signal:controller?.signal'
  ])requireCondition(app.includes(token),`${side} is missing performance safeguard: ${token}`);
  requireCondition(!app.includes('for(const url of datasetUrls(config))'),`${side} still checks CSV endpoints sequentially`);
  requireCondition(!app.includes("for(const urlTemplate of jsonpUrls(config,'__CALLBACK__'))"),`${side} still checks JSONP endpoints sequentially`);
  const registry=JSON.parse(fs.readFileSync(path.join(ROOT,'tournaments',side,'source-registry.json'),'utf8'));
  requireCondition(registry.version==='7.50.9',`${side} source registry is not 7.50.9`);
  const policy=registry.liveConnectionPolicy||{};
  requireCondition(policy.requestTimeoutMs===6500&&policy.hedgeDelayMs===650,`${side} source registry lacks timeout/hedge policy`);
  requireCondition(JSON.stringify(policy.retryDelaysMs)==='[15000,30000,60000]',`${side} source registry lacks progressive retry policy`);
  requireCondition(policy.preferredEndpointCache===true&&policy.overlapProtection===true,`${side} source registry lacks cache/overlap safeguards`);
}
const girlsLoad=apps['jo-girls'].slice(apps['jo-girls'].indexOf('async function loadCurrentInternal'),apps['jo-girls'].indexOf('function selectDataset'));
requireCondition(girlsLoad.indexOf('const livePromise=fetchDataset(config)')<girlsLoad.indexOf('await fetchVerifiedSnapshot(config)'), 'Girls live request should begin while the same-origin verified snapshot loads');
requireCondition(girlsLoad.indexOf('await fetchVerifiedSnapshot(config)')<girlsLoad.indexOf('await livePromise'), 'Girls verified snapshot must still render before a live response is applied');

const app=apps['jo-girls'];
const start=app.indexOf('function hedgedFirstSuccess'),end=app.indexOf('async function fetchDataset',start);
requireCondition(start>=0&&end>start,'Could not isolate hedged request helper');
const context={api:null,Promise,setTimeout,clearTimeout,Error};
vm.createContext(context);
vm.runInContext(`${app.slice(start,end)}\napi=hedgedFirstSuccess;`,context,{filename:'jo-live-performance-helper'});
(async()=>{
  const started=[];
  const loader=candidate=>new Promise((resolve,reject)=>{
    started.push(candidate.id);
    if(candidate.id==='slow')setTimeout(()=>resolve('slow-result'),120);
    else if(candidate.id==='fast')setTimeout(()=>resolve('fast-result'),5);
    else setTimeout(()=>reject(new Error('blocked')),8);
  });
  const candidates=[
    {id:'slow',method:'slow preferred'},
    {id:'fast',method:'fast fallback'},
    {id:'blocked',method:'blocked fallback'}
  ];
  const began=Date.now();
  const winner=await context.api(candidates,loader,10,1);
  const elapsed=Date.now()-began;
  requireCondition(winner.candidate.id==='fast'&&winner.result==='fast-result','Hedged request did not select the fastest successful fallback');
  requireCondition(started.includes('slow')&&started.includes('fast'),'Hedged request did not launch the fallback wave');
  requireCondition(elapsed<80,`Hedged request waited too long (${elapsed} ms)`);
  let rejected=false;
  try{await context.api([{id:'a',method:'A'},{id:'b',method:'B'}],()=>Promise.reject(new Error('no')),1,1)}catch(error){rejected=/A: no|B: no/.test(error.message)}
  requireCondition(rejected,'Hedged request did not report all-endpoint failure');
  console.log('JO LIVE PERFORMANCE 7.50.9 TESTS PASSED');
  console.log(' - Girls and Boys race preferred, sheet-name, GID, export, CSV, and JSONP sources instead of waiting sequentially');
  console.log(' - Slow requests are capped, fallback sources are hedged after 650 ms, and the fastest valid response wins');
  console.log(' - Successful endpoints are remembered per division; failed live checks retry after 15, 30, then 60 seconds');
  console.log(' - Duplicate refreshes for the same division are suppressed while verified schedules remain immediately usable');
})().catch(error=>{console.error(error.stack||error);process.exit(1)});
