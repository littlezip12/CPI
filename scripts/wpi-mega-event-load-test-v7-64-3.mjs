#!/usr/bin/env node
/* WPI 7.64.3 — Mega-Event Load Test Harness
 *
 * Safe defaults:
 * - production project: smoke mode only, <=25 HTTP workers, <=60 seconds,
 *   <=25 Realtime sockets, <=2,500 requests.
 * - isolated/mega-event modes refuse the known WPI production Supabase host
 *   and require WPI_LOADTEST_ISOLATED_CONFIRM=YES_I_AM_USING_STAGING.
 * - keys are read from environment variables and are NEVER written to output.
 *
 * Required env:
 *   WPI_LOADTEST_SUPABASE_URL
 *   WPI_LOADTEST_PUBLISHABLE_KEY
 *
 * Optional staging-only env:
 *   WPI_LOADTEST_ISOLATED_CONFIRM=YES_I_AM_USING_STAGING
 *
 * This harness exercises public read RPCs and public Realtime Broadcast joins.
 * A full PASS still requires scoring/finalization, ad-impact and database metrics
 * assembled by scripts/wpi-capacity-gate-v7-64-3.py.
 */

import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

const RELEASE = "7.64.3";
const PRODUCTION_HOST = "jmdamtxspyshjxgmunda.supabase.co";
const CONFIRM = "YES_I_AM_USING_STAGING";

function fail(message) {
  console.error(`WPI load test refused: ${message}`);
  process.exit(2);
}
function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) out[key] = true;
    else { out[key] = next; i++; }
  }
  return out;
}
function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function pct(sorted, q) {
  if (!sorted.length) return null;
  const i = Math.max(0, Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1));
  return Number(sorted[i].toFixed(2));
}
function summarize(values) {
  const sorted = values.filter(Number.isFinite).slice().sort((a,b)=>a-b);
  return { samples: sorted.length, p50Ms: pct(sorted,.50), p95Ms: pct(sorted,.95), p99Ms: pct(sorted,.99), maxMs: sorted.length ? Number(sorted.at(-1).toFixed(2)) : null };
}
function rate(n, d) { return d > 0 ? Number((100*n/d).toFixed(3)) : 0; }
function jsonBytes(value) { return Buffer.byteLength(typeof value === "string" ? value : JSON.stringify(value)); }
function isoNow() { return new Date().toISOString(); }

const args = parseArgs(process.argv);
const supabaseUrl = String(process.env.WPI_LOADTEST_SUPABASE_URL || "").replace(/\/$/, "");
const publishableKey = String(process.env.WPI_LOADTEST_PUBLISHABLE_KEY || "");
if (!supabaseUrl || !publishableKey) fail("set WPI_LOADTEST_SUPABASE_URL and WPI_LOADTEST_PUBLISHABLE_KEY in this Terminal session");
let parsedUrl;
try { parsedUrl = new URL(supabaseUrl); } catch { fail("WPI_LOADTEST_SUPABASE_URL is not a valid URL"); }
const host = parsedUrl.host.toLowerCase();
const mode = String(args.mode || "smoke").toLowerCase();
if (!["smoke","isolated_load","mega_event"].includes(mode)) fail("--mode must be smoke, isolated_load, or mega_event");
const production = host === PRODUCTION_HOST;
if (production && mode !== "smoke") fail("full load/certification is blocked against the current WPI production Supabase project");
if (mode !== "smoke" && process.env.WPI_LOADTEST_ISOLATED_CONFIRM !== CONFIRM) fail(`isolated modes require WPI_LOADTEST_ISOLATED_CONFIRM=${CONFIRM}`);

let durationSeconds = Math.round(num(args.duration, mode === "smoke" ? 30 : 120));
let concurrency = Math.round(num(args.concurrency, mode === "smoke" ? 10 : 100));
let maxRequests = Math.round(num(args["max-requests"], mode === "smoke" ? 2500 : 100000));
let realtimeViewers = Math.round(num(args["realtime-viewers"], mode === "smoke" ? 5 : 100));
if (mode === "smoke") {
  durationSeconds = clamp(durationSeconds, 1, 60);
  concurrency = clamp(concurrency, 1, 25);
  maxRequests = clamp(maxRequests, 1, 2500);
  realtimeViewers = clamp(realtimeViewers, 0, 25);
} else {
  durationSeconds = clamp(durationSeconds, 5, 900);
  concurrency = clamp(concurrency, 1, 500);
  maxRequests = clamp(maxRequests, 1, 500000);
  realtimeViewers = clamp(realtimeViewers, 0, 1000); // shard locally; aggregate multiple shards for 10K.
}
const targetEventGames = Math.round(num(args["event-games"], mode === "mega_event" ? 6000 : 0));
const targetActiveGames = Math.round(num(args["active-games"], mode === "mega_event" ? 100 : 0));
const targetViewers = Math.round(num(args["simultaneous-viewers"], mode === "mega_event" ? 10000 : realtimeViewers));
const shardId = String(args["shard-id"] || "shard-1");
const runLabel = String(args.label || `WPI ${RELEASE} ${mode} ${shardId}`);
const output = path.resolve(String(args.output || `wpi-load-test-${RELEASE}-${Date.now()}.json`));
const timeoutMs = clamp(Math.round(num(args["request-timeout-ms"], 10000)), 1000, 30000);
const startedAt = isoNow();

const headers = {
  "apikey": publishableKey,
  "Authorization": `Bearer ${publishableKey}`,
  "Content-Type": "application/json",
  "x-wpi-load-test-release": RELEASE
};

async function rpc(name, body = {}) {
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), timeoutMs);
  const start = performance.now();
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, { method:"POST", headers, body:JSON.stringify(body), signal:controller.signal });
    const text = await response.text();
    const ms = performance.now() - start;
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!response.ok) throw Object.assign(new Error(`${name} HTTP ${response.status}: ${String(text).slice(0,180)}`), { ms, bytes:jsonBytes(text), endpoint:name });
    return { data, ms, bytes:jsonBytes(text), endpoint:name };
  } finally { clearTimeout(timer); }
}

console.log(`WPI ${RELEASE} load harness`);
console.log(`Target: ${host}`);
console.log(`Mode: ${mode}${production ? " (production smoke guard active)" : ""}`);
console.log(`HTTP workers: ${concurrency} · duration: ${durationSeconds}s · max requests: ${maxRequests}`);
console.log(`Realtime sockets in this shard: ${realtimeViewers}`);

let discovery;
try {
  const [board,catalog] = await Promise.all([
    rpc("live_public_scoreboard_v3", { requested_limit:100, requested_offset:0, requested_status:"all" }),
    rpc("live_public_tournament_catalog_v1", {})
  ]);
  discovery = { board:board.data, catalog:catalog.data };
} catch (error) {
  fail(`public discovery failed before load began: ${error.message}`);
}
const discoveredGames = Array.isArray(discovery?.board?.games) ? discovery.board.games.map(x=>x?.id).filter(Boolean) : [];
const discoveredTournaments = Array.isArray(discovery?.catalog?.tournaments) ? discovery.catalog.tournaments : [];
const suppliedGames = String(args["game-ids"] || "").split(",").map(x=>x.trim()).filter(Boolean);
const gameIds = suppliedGames.length ? suppliedGames : discoveredGames;
const suppliedTournament = String(args["tournament-id"] || "").trim();
const tournament = suppliedTournament ? { tournamentPublicId:suppliedTournament } : discoveredTournaments.find(x=>x?.tournamentPublicId) || discoveredTournaments[0] || null;

const requestLatencies = [];
const responseBytes = [];
const endpointStats = new Map();
let requests = 0, errors = 0;
function track(name, ok, ms, bytes=0) {
  requests++;
  if (!ok) errors++;
  if (Number.isFinite(ms)) requestLatencies.push(ms);
  if (Number.isFinite(bytes)) responseBytes.push(bytes);
  const stat = endpointStats.get(name) || { requests:0, errors:0, latencies:[], bytes:[] };
  stat.requests++; if (!ok) stat.errors++; if (Number.isFinite(ms)) stat.latencies.push(ms); if (Number.isFinite(bytes)) stat.bytes.push(bytes);
  endpointStats.set(name, stat);
}
function chooseWork(i) {
  const roll = i % 20;
  if (gameIds.length && roll < 9) return { name:"live_public_game_score_v2", body:{ target_game_id:gameIds[i % gameIds.length] } };
  if (tournament && roll < 14) return { name:"live_public_tournament_v2", body:{ requested_tournament_public_id:tournament.tournamentPublicId||null, requested_tournament_name:tournament.tournamentPublicId?null:tournament.name||null, requested_competitive_season:tournament.competitiveSeason||null, requested_limit:60, requested_offset:(i%5)*60, requested_status:"all" } };
  return { name:"live_public_scoreboard_v3", body:{ requested_limit:60, requested_offset:(i%5)*60, requested_status:i%4===0?"live":"all", requested_search:i%7===0?"a":null } };
}
async function httpWorker(workerId, deadline) {
  let local = workerId;
  while (performance.now() < deadline && requests < maxRequests) {
    const work = chooseWork(local++);
    const before = performance.now();
    try { const result = await rpc(work.name, work.body); track(work.name,true,result.ms,result.bytes); }
    catch (error) { track(work.name,false,Number.isFinite(error.ms)?error.ms:performance.now()-before,Number(error.bytes)||0); }
  }
}

function realtimeWsUrl() {
  const u = new URL(supabaseUrl);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  u.pathname = "/realtime/v1/websocket";
  u.search = `?apikey=${encodeURIComponent(publishableKey)}&vsn=1.0.0`;
  return u.toString();
}
async function realtimeViewer(gameId, index, deadlineEpoch) {
  const out = { joined:false, joinMs:null, messages:0, deliveryLatencies:[], errors:0 };
  if (!gameId) { out.errors++; return out; }
  const topic = `realtime:wpi-public-game:${gameId}`;
  const start = performance.now();
  return await new Promise(resolve=>{
    let ws, heartbeat, done=false, ref=1;
    const finish=()=>{ if(done)return;done=true;clearInterval(heartbeat);try{ws?.close();}catch{} resolve(out); };
    const timeout=setTimeout(finish, Math.max(1000,deadlineEpoch-Date.now()+500));
    try { ws = new WebSocket(realtimeWsUrl()); }
    catch { clearTimeout(timeout); out.errors++; return resolve(out); }
    ws.addEventListener("open",()=>{
      const joinRef=String(ref++);
      ws.send(JSON.stringify({ topic, event:"phx_join", payload:{ config:{ broadcast:{ack:false,self:false}, presence:{enabled:false}, postgres_changes:[], private:false } }, ref:joinRef, join_ref:joinRef }));
      heartbeat=setInterval(()=>{ try{ws.send(JSON.stringify({topic:"phoenix",event:"heartbeat",payload:{},ref:String(ref++),join_ref:null}));}catch{} },20000);
    });
    ws.addEventListener("message",event=>{
      let msg; try { msg=JSON.parse(String(event.data)); } catch { return; }
      if (msg?.event==="phx_reply" && msg?.payload?.status==="ok" && !out.joined) { out.joined=true; out.joinMs=performance.now()-start; }
      if (msg?.event==="broadcast" && msg?.payload?.event==="score") {
        out.messages++;
        const updatedAt=msg?.payload?.payload?.updatedAt;
        if (updatedAt) { const lag=Date.now()-new Date(updatedAt).getTime(); if (Number.isFinite(lag) && lag>=0 && lag<60000) out.deliveryLatencies.push(lag); }
      }
      if (msg?.event==="phx_error") out.errors++;
    });
    ws.addEventListener("error",()=>{out.errors++;});
    ws.addEventListener("close",()=>{if(Date.now()<deadlineEpoch-500&&!done)out.errors++; if(Date.now()>=deadlineEpoch-500)finish();});
    const poll=setInterval(()=>{if(done){clearInterval(poll);return;}if(Date.now()>=deadlineEpoch){clearInterval(poll);clearTimeout(timeout);finish();}},250);
  });
}

const loadStart = performance.now();
const deadline = loadStart + durationSeconds*1000;
const realtimeDeadlineEpoch = Date.now() + durationSeconds*1000;
const realtimePromises = [];
if (realtimeViewers && gameIds.length) {
  for (let i=0;i<realtimeViewers;i++) realtimePromises.push(realtimeViewer(gameIds[i%gameIds.length],i,realtimeDeadlineEpoch));
} else if (realtimeViewers && !gameIds.length) {
  console.warn("Realtime viewer shard skipped: no public game IDs were discovered/provided.");
}
const httpPromises = Array.from({length:concurrency},(_,i)=>httpWorker(i,deadline));
await Promise.all(httpPromises);
const realtimeResults = await Promise.all(realtimePromises);
const completedAt = isoNow();

const endpointSummary = {};
for (const [name,stat] of endpointStats) {
  const s=summarize(stat.latencies), b=summarize(stat.bytes);
  endpointSummary[name] = { requests:stat.requests, errors:stat.errors, errorRatePct:rate(stat.errors,stat.requests), ...s, responseBytesP95:b.p95Ms };
}
const readSummary = summarize(requestLatencies);
const byteSummary = summarize(responseBytes);
const joinedRealtime = realtimeResults.filter(x=>x.joined);
const joinSummary = summarize(joinedRealtime.map(x=>x.joinMs));
const realtimeDelivery = realtimeResults.flatMap(x=>x.deliveryLatencies);
const deliverySummary = summarize(realtimeDelivery);
const realtimeErrors = realtimeResults.reduce((n,x)=>n+x.errors,0);
const realtimeMessages = realtimeResults.reduce((n,x)=>n+x.messages,0);

const report = {
  schemaVersion:1,
  harnessRelease:RELEASE,
  runLabel,
  targetEnvironment:production ? "production_smoke" : (mode==="mega_event" ? "staging" : "isolated"),
  targetProjectHost:host,
  runMode:mode,
  startedAt,
  completedAt,
  configuration:{
    confirmedIsolatedTarget:!production && mode!=="smoke" && process.env.WPI_LOADTEST_ISOLATED_CONFIRM===CONFIRM,
    eventGames:targetEventGames,
    activeGames:targetActiveGames,
    simultaneousViewers:targetViewers,
    httpConcurrency:concurrency,
    durationSeconds,
    maxRequests,
    realtimeViewerShardRequested:realtimeViewers,
    shardId,
    discoveredPublicGames:gameIds.length,
    discoveredTournaments:discoveredTournaments.length
  },
  metrics:{
    publicRead:{ ...readSummary, errorRatePct:rate(errors,requests), totalRequests:requests, responseBytesP95:byteSummary.p95Ms, endpointSummary },
    realtime:{ viewerSessions:joinedRealtime.length, viewerSessionsRequested:realtimeResults.length, joinP95Ms:joinSummary.p95Ms, messageSamples:realtimeMessages, deliveryP50Ms:deliverySummary.p50Ms, deliveryP95Ms:deliverySummary.p95Ms, deliveryP99Ms:deliverySummary.p99Ms, dropRatePct:null, socketErrors:realtimeErrors },
    scoring:{ scoreIntegrityCheckedGames:0, scoreIntegrityPct:null, finalizeBurstGames:0, finalizeBurstP95Ms:null, finalizeErrorRatePct:null },
    ads:{ telemetryP95DeltaPct:null },
    database:{ cpuP95Pct:null, connectionsPeakPct:null, ioWaitP95Ms:null }
  },
  raw:{
    publicReadLatenciesMs:requestLatencies.map(x=>Math.round(x*100)/100),
    realtimeDeliveryLatenciesMs:realtimeDelivery.map(x=>Math.round(x*100)/100)
  },
  preliminaryGateStatus:"not_certified",
  notes: mode==="smoke" ? "Production smoke only. This run cannot certify mega-event capacity." : "Isolated load shard. Aggregate shards and required scoring/ad/database evidence with wpi-capacity-gate-v7-64-3.py."
};
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify(report,null,2)+"\n");
console.log(`\nRequests: ${requests.toLocaleString()} · errors: ${errors.toLocaleString()} (${rate(errors,requests)}%)`);
console.log(`Public read p50/p95/p99: ${readSummary.p50Ms ?? "—"} / ${readSummary.p95Ms ?? "—"} / ${readSummary.p99Ms ?? "—"} ms`);
console.log(`Realtime joined: ${joinedRealtime.length}/${realtimeResults.length} · score messages observed: ${realtimeMessages}`);
console.log(`Report: ${output}`);
console.log("Gate: NOT CERTIFIED until a full isolated evidence set is aggregated and recorded.");
