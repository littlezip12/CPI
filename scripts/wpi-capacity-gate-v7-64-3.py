#!/usr/bin/env python3
"""WPI 7.64.3 — aggregate load-test shards into a capacity-gate report.

The output JSON is deliberately credential-free and can be imported into the
Platform Owner Mega-Event Readiness page. The server re-evaluates the gate.
"""
from __future__ import annotations
import argparse, json, math, statistics
from pathlib import Path
from datetime import datetime, timezone

RELEASE="7.64.3"
PRODUCTION_HOST="jmdamtxspyshjxgmunda.supabase.co"
PASS={
    "publicReadP95Ms":750,"publicReadP99Ms":1500,"publicReadErrorRatePct":0.5,
    "realtimeDeliveryP95Ms":1000,"realtimeDropRatePct":0.5,
    "finalizeBurstP95Ms":1500,"finalizeErrorRatePct":0.5,
    "adTelemetryP95DeltaPct":10,"dbCpuP95Pct":70,"dbConnectionsPeakPct":70,
}
WATCH={
    "publicReadP95Ms":1500,"publicReadP99Ms":2500,"publicReadErrorRatePct":2.0,
    "realtimeDeliveryP95Ms":2500,"realtimeDropRatePct":2.0,
    "finalizeBurstP95Ms":3000,"finalizeErrorRatePct":2.0,
    "adTelemetryP95DeltaPct":25,"dbCpuP95Pct":85,"dbConnectionsPeakPct":85,
}
MIN={"publicReadSamples":10000,"realtimeViewerSessions":10000,"realtimeMessageSamples":10000,"scoreIntegrityCheckedGames":100,"finalizeBurstGames":100}

def percentile(values, p):
    vals=sorted(float(v) for v in values if isinstance(v,(int,float)) and math.isfinite(float(v)))
    if not vals: return None
    idx=max(0,min(len(vals)-1,math.ceil(p*len(vals))-1))
    return round(vals[idx],2)

def load_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))

def get(d,*keys,default=None):
    cur=d
    for k in keys:
        if not isinstance(cur,dict) or k not in cur: return default
        cur=cur[k]
    return cur

def finite(v):
    return isinstance(v,(int,float)) and math.isfinite(float(v))

def evaluate(config, metrics, mode):
    if mode!="mega_event": return "not_certified", ["Run mode is not mega_event."]
    reasons=[]
    if not config.get("confirmedIsolatedTarget"): reasons.append("Isolated target confirmation is missing.")
    if int(config.get("eventGames") or 0)<6000: reasons.append("Event-game envelope is below 6,000.")
    if int(config.get("activeGames") or 0)<100: reasons.append("Active-game envelope is below 100.")
    if int(config.get("simultaneousViewers") or 0)<10000: reasons.append("Viewer envelope is below 10,000.")
    public=metrics.get("publicRead",{}); rt=metrics.get("realtime",{}); scoring=metrics.get("scoring",{}); ads=metrics.get("ads",{}); db=metrics.get("database",{})
    required=[
        (int(public.get("samples") or 0)>=MIN["publicReadSamples"],f"Public-read samples < {MIN['publicReadSamples']:,}."),
        (int(rt.get("viewerSessions") or 0)>=MIN["realtimeViewerSessions"],f"Realtime viewer sessions < {MIN['realtimeViewerSessions']:,}."),
        (int(rt.get("messageSamples") or 0)>=MIN["realtimeMessageSamples"],f"Realtime message samples < {MIN['realtimeMessageSamples']:,}."),
        (int(scoring.get("scoreIntegrityCheckedGames") or 0)>=MIN["scoreIntegrityCheckedGames"],f"Score-integrity checked games < {MIN['scoreIntegrityCheckedGames']}.") ,
        (int(scoring.get("finalizeBurstGames") or 0)>=MIN["finalizeBurstGames"],f"Finalize-burst games < {MIN['finalizeBurstGames']}.") ,
    ]
    for ok,msg in required:
        if not ok: reasons.append(msg)
    needed=[
        (public,"p95Ms","Public read p95"),(public,"p99Ms","Public read p99"),(public,"errorRatePct","Public read error rate"),
        (rt,"deliveryP95Ms","Realtime delivery p95"),(rt,"dropRatePct","Realtime drop rate"),
        (scoring,"scoreIntegrityPct","Score integrity"),(scoring,"finalizeBurstP95Ms","Finalize burst p95"),(scoring,"finalizeErrorRatePct","Finalize error rate"),
        (ads,"telemetryP95DeltaPct","Ad telemetry impact"),(db,"cpuP95Pct","DB CPU p95"),(db,"connectionsPeakPct","DB peak connections")
    ]
    for obj,key,label in needed:
        if not finite(obj.get(key)): reasons.append(f"{label} evidence is missing.")
    if reasons: return "not_certified", reasons
    if float(scoring["scoreIntegrityPct"])<100: return "fail", ["Score integrity is below 100%."]
    values={
        "publicReadP95Ms":float(public["p95Ms"]),"publicReadP99Ms":float(public["p99Ms"]),"publicReadErrorRatePct":float(public["errorRatePct"]),
        "realtimeDeliveryP95Ms":float(rt["deliveryP95Ms"]),"realtimeDropRatePct":float(rt["dropRatePct"]),
        "finalizeBurstP95Ms":float(scoring["finalizeBurstP95Ms"]),"finalizeErrorRatePct":float(scoring["finalizeErrorRatePct"]),
        "adTelemetryP95DeltaPct":float(ads["telemetryP95DeltaPct"]),"dbCpuP95Pct":float(db["cpuP95Pct"]),"dbConnectionsPeakPct":float(db["connectionsPeakPct"]),
    }
    fail=[k for k,v in values.items() if v>WATCH[k]]
    if fail: return "fail", [f"{k} exceeded FAIL threshold ({values[k]} > {WATCH[k]})." for k in fail]
    watch=[k for k,v in values.items() if v>PASS[k]]
    if watch: return "watch", [f"{k} entered WATCH band ({values[k]} > {PASS[k]})." for k in watch]
    return "pass", ["All required evidence meets WPI 7.64.3 PASS thresholds."]

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--input",action="append",default=[],help="Harness shard JSON; repeat for each shard")
    ap.add_argument("--evidence",help="Manual/automated scoring, ad and database evidence JSON")
    ap.add_argument("--output-dir",default="capacity-results")
    ap.add_argument("--label",default=f"WPI {RELEASE} Mega-Event Capacity Gate")
    ap.add_argument("--target-host",default="")
    ap.add_argument("--target-environment",default="staging",choices=["production_smoke","staging","isolated"])
    ap.add_argument("--mode",default="mega_event",choices=["smoke","isolated_load","mega_event"])
    ap.add_argument("--event-games",type=int,default=6000)
    ap.add_argument("--active-games",type=int,default=100)
    ap.add_argument("--simultaneous-viewers",type=int,default=10000)
    ap.add_argument("--confirmed-isolated-target",action="store_true")
    args=ap.parse_args()
    if not args.input: ap.error("at least one --input harness JSON is required")
    shards=[load_json(p) for p in args.input]
    for s in shards:
        if s.get("harnessRelease")!=RELEASE: raise SystemExit(f"Refusing non-{RELEASE} harness report")
    hosts={str(s.get("targetProjectHost") or "") for s in shards}
    host=args.target_host or (next(iter(hosts)) if len(hosts)==1 else "")
    if args.mode=="mega_event" and host.lower()==PRODUCTION_HOST:
        raise SystemExit("Refusing mega_event certification against the current WPI production Supabase project")
    lat=[]; rtlat=[]; total_requests=0; total_errors=0; viewer_sessions=0; message_samples=0; socket_errors=0
    starts=[]; ends=[]
    for s in shards:
        lat.extend(get(s,"raw","publicReadLatenciesMs",default=[]) or [])
        rtlat.extend(get(s,"raw","realtimeDeliveryLatenciesMs",default=[]) or [])
        pr=get(s,"metrics","publicRead",default={}) or {}
        tr=int(pr.get("totalRequests") or pr.get("samples") or 0); total_requests+=tr
        total_errors+=round(tr*float(pr.get("errorRatePct") or 0)/100)
        r=get(s,"metrics","realtime",default={}) or {}
        viewer_sessions+=int(r.get("viewerSessions") or 0); message_samples+=int(r.get("messageSamples") or 0); socket_errors+=int(r.get("socketErrors") or 0)
        if s.get("startedAt"): starts.append(s["startedAt"])
        if s.get("completedAt"): ends.append(s["completedAt"])
    metrics={
        "publicRead":{"samples":len(lat),"totalRequests":total_requests,"p50Ms":percentile(lat,.50),"p95Ms":percentile(lat,.95),"p99Ms":percentile(lat,.99),"errorRatePct":round(100*total_errors/total_requests,3) if total_requests else None},
        "realtime":{"viewerSessions":viewer_sessions,"messageSamples":message_samples,"deliveryP50Ms":percentile(rtlat,.50),"deliveryP95Ms":percentile(rtlat,.95),"deliveryP99Ms":percentile(rtlat,.99),"dropRatePct":None,"socketErrors":socket_errors},
        "scoring":{"scoreIntegrityCheckedGames":0,"scoreIntegrityPct":None,"finalizeBurstGames":0,"finalizeBurstP95Ms":None,"finalizeErrorRatePct":None},
        "ads":{"telemetryP95DeltaPct":None},
        "database":{"cpuP95Pct":None,"connectionsPeakPct":None,"ioWaitP95Ms":None},
    }
    evidence=load_json(args.evidence) if args.evidence else {}
    partial=evidence.get("metrics",evidence) if isinstance(evidence,dict) else {}
    for section in ("realtime","scoring","ads","database"):
        if isinstance(partial.get(section),dict): metrics[section].update(partial[section])
    config={"confirmedIsolatedTarget":bool(args.confirmed_isolated_target),"eventGames":args.event_games,"activeGames":args.active_games,"simultaneousViewers":args.simultaneous_viewers,"shardCount":len(shards)}
    status,reasons=evaluate(config,metrics,args.mode)
    payload={
        "schemaVersion":1,"harnessRelease":RELEASE,"runLabel":args.label,"targetEnvironment":args.target_environment,
        "targetProjectHost":host or None,"runMode":args.mode,"startedAt":min(starts) if starts else None,"completedAt":max(ends) if ends else datetime.now(timezone.utc).isoformat(),
        "configuration":config,"metrics":metrics,"preliminaryGateStatus":status,"notes":" ".join(reasons)
    }
    outdir=Path(args.output_dir);outdir.mkdir(parents=True,exist_ok=True);stamp=datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    json_path=outdir/f"WPI_7.64.3_CAPACITY_GATE_{stamp}.json"; md_path=outdir/f"WPI_7.64.3_CAPACITY_GATE_{stamp}.md"
    json_path.write_text(json.dumps(payload,indent=2)+"\n",encoding="utf-8")
    md=[f"# WPI 7.64.3 Mega-Event Capacity Gate", "", f"**Status:** {status.upper()}", f"**Target:** {host or 'unspecified'}", f"**Shards:** {len(shards)}", "", "## Target envelope", f"- Event games: {args.event_games:,}", f"- Active games: {args.active_games:,}", f"- Simultaneous viewers: {args.simultaneous_viewers:,}", "", "## Measured public read", f"- Samples: {metrics['publicRead']['samples']:,}", f"- p50 / p95 / p99: {metrics['publicRead']['p50Ms']} / {metrics['publicRead']['p95Ms']} / {metrics['publicRead']['p99Ms']} ms", f"- Error rate: {metrics['publicRead']['errorRatePct']}%", "", "## Realtime", f"- Viewer sessions joined: {metrics['realtime']['viewerSessions']:,}", f"- Score messages sampled: {metrics['realtime']['messageSamples']:,}", f"- Delivery p95: {metrics['realtime']['deliveryP95Ms']} ms", f"- Drop rate: {metrics['realtime']['dropRatePct']}%", "", "## Gate notes"]
    md += [f"- {r}" for r in reasons]
    md += ["", "The Platform Owner page/server recalculates the gate when this JSON is recorded. No key/token is included in this report."]
    md_path.write_text("\n".join(md)+"\n",encoding="utf-8")
    print(f"Gate: {status.upper()}")
    for r in reasons: print(f" - {r}")
    print(f"JSON: {json_path}")
    print(f"Markdown: {md_path}")

if __name__=="__main__": main()
