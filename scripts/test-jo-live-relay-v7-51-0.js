#!/usr/bin/env node
"use strict";
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..');
function requireCondition(condition,message){if(!condition)throw new Error(message)}

const expected={
  'jo-girls':'2026-jo-weekend-1',
  'jo-boys':'2026-jo-weekend-2',
  'jo-texas':'2026-jo-session-3'
};
for(const [side,eventId] of Object.entries(expected)){
  const app=fs.readFileSync(path.join(ROOT,'tournaments',side,'app.js'),'utf8');
  const expectedVersion=side==='jo-texas'?'7.54.5':'7.51.0';
  requireCondition(app.includes(`APP_VERSION='${expectedVersion}'`),`${side} does not advertise APP_VERSION ${expectedVersion}`);
  for(const token of [
    `RELAY_EVENT_ID='${eventId}'`,
    "RELAY_BASE_URL='https://raw.githubusercontent.com/littlezip12/CPI/cpi-live-relay/data/tournaments/live-relay'",
    'RELAY_FETCH_TIMEOUT_MS=4500',
    `RELAY_FRESH_MAX_AGE_MS=${side==='jo-girls'?'20':'7'}*60*1000`,
    'function fetchRelayDataset(config)',
    "result.method='WPI live relay'",
    'result.isFallback=!relayStatusFresh(status)',
    "const relayPromise=fetchRelayDataset(config)",
    "sourceLabel='Official Google Sheet'",
    "'WPI live relay'"
  ])requireCondition(app.includes(token),`${side} is missing relay safeguard: ${token}`);
  const load=app.slice(app.indexOf('async function loadCurrentInternal'),app.indexOf('function selectDataset'));
  requireCondition(load.indexOf('await relayPromise')>=0,`${side} never waits for the WPI relay`);
  requireCondition(load.indexOf('await relayPromise')<load.indexOf('await livePromise'),`${side} must apply the WPI relay before a direct Google result`);
  requireCondition(load.includes('if(relayApplied&&relayFresh)return;'),`${side} should retain a fresh relay when direct Google fails`);

  const registry=JSON.parse(fs.readFileSync(path.join(ROOT,'tournaments',side,'source-registry.json'),'utf8'));
  requireCondition(registry.version===expectedVersion,`${side} source registry is not ${expectedVersion}`);
  const policy=registry.liveRelayPolicy||{};
  requireCondition(policy.enabled===true&&policy.eventId===eventId,`${side} relay policy is not enabled for ${eventId}`);
  requireCondition(policy.branch==='cpi-live-relay'&&policy.isolatedBranch===true,`${side} relay is not isolated from main`);
  const expectedFreshMinutes=side==='jo-girls'?20:7;
  requireCondition(policy.refreshTargetMinutes===5&&policy.freshMaxAgeMinutes===expectedFreshMinutes,`${side} relay cadence/freshness policy is incorrect`);
  requireCondition(policy.directGoogleFallback===true&&policy.lastKnownGoodPreservation===true,`${side} relay lacks required fallbacks`);
}

const girls=fs.readFileSync(path.join(ROOT,'tournaments','jo-girls','app.js'),'utf8');
const freshnessStart=girls.indexOf('function relayStatusFresh');
const freshnessEnd=girls.indexOf('async function fetchRelayDataset',freshnessStart);
requireCondition(freshnessStart>=0&&freshnessEnd>freshnessStart,'Could not isolate relay freshness helper');
const context={api:null,Date,Number,RELAY_FRESH_MAX_AGE_MS:20*60*1000};
vm.createContext(context);
vm.runInContext(`${girls.slice(freshnessStart,freshnessEnd)}\napi=relayStatusFresh;`,context,{filename:'jo-relay-freshness'});
const now=new Date();
requireCondition(context.api({state:'live',checkedAt:new Date(now-5*60*1000).toISOString()})===true,'A recently checked live relay should be fresh');
requireCondition(context.api({state:'stale',checkedAt:now.toISOString()})===false,'A failed relay check must not be marked fresh');
requireCondition(context.api({state:'live',checkedAt:new Date(now-25*60*1000).toISOString()})===false,'An old relay check must not be marked fresh');

const workflow=fs.readFileSync(path.join(ROOT,'.github','workflows','sync-jo-live-relay.yml'),'utf8');
for(const token of [
  'cron: "*/5 * * * *"',
  'workflow_dispatch:',
  'cpi-jo-live-relay',
  'scripts/sync-jo-live-relay.py',
  'git fetch origin cpi-live-relay',
  'git switch --orphan cpi-live-relay-publish',
  'git push --force origin HEAD:cpi-live-relay',
  '--event 2026-jo-session-3',
  '--workers 3',
  '--timeout 8',
  '--max-candidates 2'
])requireCondition(workflow.includes(token),`Relay workflow is missing: ${token}`);

const relayScript=fs.readFileSync(path.join(ROOT,'scripts','sync-jo-live-relay.py'),'utf8');
for(const token of [
  'JO_EVENT_IDS = ("2026-jo-weekend-1", "2026-jo-weekend-2", "2026-jo-session-3")',
  'candidate_rejection_reason',
  'state": "live"',
  'state": "stale"',
  'last-known-good',
  'RAW_ROOT / event_id',
  'build_manifest'
])requireCondition(relayScript.includes(token),`Relay builder is missing: ${token}`);

console.log('JO LIVE RELAY 7.51.0 TESTS PASSED');
console.log(' - All three JO sessions remain configured for the isolated WPI relay branch; scheduled refreshes prioritize Session 3');
console.log(' - Browsers apply the relay before direct Google and preserve a fresh relay if Google fails');
console.log(' - Relay checks are bounded, freshness is explicit, and stale banks remain available');
console.log(' - GitHub Actions refreshes the relay every five minutes without committing generated relay data to main');
