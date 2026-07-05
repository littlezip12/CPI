#!/usr/bin/env python3
from pathlib import Path
import json,re,math
from collections import Counter,defaultdict
ROOT=Path(__file__).resolve().parents[1]; DATA=ROOT/"data"; QA=ROOT/"qa"
def read_json(p,d=None):
    p=Path(p)
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else (d if d is not None else {})
def first(*ps):
    for p in ps:
        if Path(p).exists(): return Path(p)
    return None
def exp(ra,rb): return 1/(1+10**((rb-ra)/400))
def mm(diff,cap=10): return 1+math.log(max(1,min(abs(diff),cap)))/7
def tw(t,c): return float(c["game_context"]["tier_weights"].get(str(int(t or 2)),0.65))
def sw(r):
    s=str(r or "").lower()
    if "final" in s or "championship" in s: return 1.0
    if "semi" in s: return .88
    if "quarter" in s: return .78
    if "cross" in s: return .70
    if "place" in s or "placement" in s: return .62
    if "consol" in s: return .52
    if "pool" in s or "bracket" in s: return .45
    return .50
def persp(g,tid):
    if g["team_1_id"]==tid: opp,gf,ga=g["team_2_id"],g["team_1_score"],g["team_2_score"]
    else: opp,gf,ga=g["team_1_id"],g["team_2_score"],g["team_1_score"]
    return opp,gf,ga,("W" if gf>ga else "L" if ga>gf else "T")
def val(res,margin,opp_rating,stage,tier):
    opp=(opp_rating-1500)/18; m=max(-10,min(10,margin))
    if res=="W": return 8+opp+min(10,m*1.1)+(stage-.5)*8+(tier-.65)*8
    if res=="L":
        close=max(0,3-abs(m))*3 if opp_rating>=1650 else 0
        return -7+opp+close+m*.9+(stage-.5)*4+(tier-.65)*4
    return opp
def main():
    c=read_json(DATA/"cpi_evidence_engine_config.json")
    games=read_json(first(DATA/"games_relationship_v1.json",DATA/"games_dictionary_v1.json",DATA/"games_engine_v2.json",DATA/"games_identity_v1.json"),{})
    teams=read_json(first(DATA/"teams_relationship_v1.json",DATA/"teams_dictionary_v1.json",DATA/"teams_engine_v2.json",DATA/"teams_identity_v1.json"),{})
    tournaments=read_json(DATA/"tournament_registry.json",{})
    paths=read_json(DATA/"tournament_path_scores_v1.json",{})
    ratings={tid:1500.0 for tid in teams}; logs=defaultdict(list)
    ordered=sorted(games.values(),key=lambda g:(tournaments.get(g.get("tournament_id"),{}).get("event_order",99),g.get("source_file",""),g.get("source_row",0)))
    for g in ordered:
        a,b=g["team_1_id"],g["team_2_id"]
        if a not in ratings or b not in ratings: continue
        s1,s2=g["team_1_score"],g["team_2_score"]; aa=1 if s1>s2 else 0 if s2>s1 else .5
        ea=exp(ratings[a],ratings[b]); stage=sw(g.get("round","")); tier=tw(g.get("tier_num"),c)
        k=c["game_context"]["k_base"]*float(tournaments.get(g["tournament_id"],{}).get("weight",.8))*tier*(.85+stage*.30)*mm(s1-s2,c["game_context"]["margin_cap"])
        pre_a,pre_b=ratings[a],ratings[b]
        ratings[a]+=k*(aa-ea); ratings[b]+=k*((1-aa)-(1-ea))
        for tid in [a,b]:
            opp,gf,ga,res=persp(g,tid)
            logs[tid].append({"opp":opp,"gf":gf,"ga":ga,"margin":gf-ga,"res":res,"tournament_id":g.get("tournament_id"),"tier":g.get("tier_num"),"round":g.get("round",""),"stage":stage,"tierw":tier,"opp_pre":pre_b if tid==a else pre_a})
    evidence={}
    for tid,t in teams.items():
        ls=logs.get(tid,[])
        if not ls: continue
        n=len(ls); wins=sum(x["res"]=="W" for x in ls); losses=sum(x["res"]=="L" for x in ls); ties=sum(x["res"]=="T" for x in ls)
        opps=sorted(set(x["opp"] for x in ls)); tours=sorted(set(x["tournament_id"] for x in ls))
        avg_opp=sum(ratings.get(x["opp"],1500) for x in ls)/n; avg_margin=sum(x["margin"] for x in ls)/n
        vals=[]; high=[]; neg=[]
        for x in ls:
            vv=val(x["res"],x["margin"],ratings.get(x["opp"],1500),x["stage"],x["tierw"]); vals.append(vv)
            item={"opponent":x["opp"],"result":x["res"],"score":f"{x['gf']}-{x['ga']}","tournament_id":x["tournament_id"],"value":round(vv,1)}
            if vv>=18: high.append(item)
            if vv<=-14: neg.append(item)
        ev=sum(vals)/n; recent=sum(vals[-min(8,n):])/min(8,n); sched=(avg_opp-1500)/10; path=float(paths.get(tid,{}).get("tournament_path_score",0))
        conf_c=c["confidence"]; connected=len([o for o in opps if o in ratings and abs(ratings[o]-ratings[tid])<180])
        conf=round((min(1,n/conf_c["games_full_confidence"])*.35+min(1,len(tours)/conf_c["tournaments_full_confidence"])*.25+min(1,len(opps)/conf_c["opponents_full_confidence"])*.25+min(1,connected/conf_c["connectedness_full_confidence"])*.15)*100)
        w=c["components"]
        cpi=ratings[tid]*w["network_rating"]["weight"]+(1500+ev*7)*w["evidence_value"]["weight"]+(1500+sched*5)*w["schedule_context"]["weight"]+(1500+path*8)*w["tournament_path"]["weight"]+(1500+recent*6)*w["recent_form"]["weight"]
        evidence[tid]={"team_id":tid,"team":t.get("name",tid),"club_id":t.get("club_id"),"team_level":t.get("team_level"),"cpi":round(cpi,1),"network_rating":round(ratings[tid],1),"evidence_value":round(ev,1),"schedule_context":round(sched,1),"tournament_path_score":round(path,1),"recent_form":round(recent,1),"confidence":conf,"record":f"{wins}-{losses}"+(f"-{ties}" if ties else ""),"wins":wins,"losses":losses,"ties":ties,"games":n,"tournaments_played":len(tours),"unique_opponents":len(opps),"avg_opponent_rating":round(avg_opp,1),"avg_margin":round(avg_margin,2),"high_value_results":sorted(high,key=lambda x:-x["value"])[:8],"negative_results":sorted(neg,key=lambda x:x["value"])[:8],"data_confidence_label":"High" if conf>=85 else "Medium" if conf>=65 else "Limited"}
    rows=[v for v in evidence.values() if v["games"]>=c["qualification"]["rank_min_games"]]
    rows.sort(key=lambda r:(-r["cpi"],-r["confidence"],-r["games"],r["team"]))
    rows=rows[:c["qualification"]["max_ranked_teams"]]
    for i,r in enumerate(rows,1): r["rank"]=i
    (DATA/"cpi_team_evidence_v1.json").write_text(json.dumps(evidence,indent=2),encoding="utf-8")
    (DATA/"cpi_evidence_rankings_v1.json").write_text(json.dumps(rows,indent=2),encoding="utf-8")
    report={"summary":{"teams_with_evidence":len(evidence),"ranked_teams":len(rows),"games_used":len(games),"high_confidence_ranked":sum(r["confidence"]>=85 for r in rows),"medium_confidence_ranked":sum(65<=r["confidence"]<85 for r in rows),"limited_confidence_ranked":sum(r["confidence"]<65 for r in rows)},"top_50":rows[:50],"method":c}
    (QA/"cpi_evidence_report.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
    table="\n".join(f"<tr><td>#{r['rank']}</td><td>{r['team']}</td><td>{r['cpi']}</td><td>{r['record']}</td><td>{r['confidence']}%</td><td>{r['network_rating']}</td><td>{r['evidence_value']}</td><td>{r['schedule_context']}</td><td>{r['tournament_path_score']}</td></tr>" for r in rows[:100])
    html=f"""<!doctype html><html><head><meta charset='utf-8'><title>CPI Evidence Engine v1</title><style>body{{font-family:system-ui;margin:30px;background:#f6f8fb;color:#071832}}.card{{background:#fff;border:1px solid #dce6f2;border-radius:14px;padding:18px;margin:18px 0;box-shadow:0 10px 30px #0001}}.metric{{display:inline-block;background:#08264f;color:white;border-radius:12px;padding:16px;margin:0 10px 10px 0;min-width:150px}}.metric strong{{display:block;font-size:32px}}.metric span{{font-size:11px;text-transform:uppercase;color:#dbe7f5;font-weight:900}}table{{width:100%;border-collapse:collapse}}td,th{{border-bottom:1px solid #dce6f2;padding:10px;text-align:left}}th{{font-size:12px;text-transform:uppercase;color:#607086}}</style></head><body><h1>CPI Evidence Engine v1</h1><p><strong>Philosophy:</strong> CPI estimates team strength. Every game is evidence; evidence value depends on opponent strength, context, margin, tournament strength, and connectedness.</p><div class='metric'><strong>{len(evidence)}</strong><span>Teams With Evidence</span></div><div class='metric'><strong>{len(rows)}</strong><span>Ranked Teams</span></div><div class='metric'><strong>{len(games)}</strong><span>Games Used</span></div><div class='metric'><strong>{sum(r['confidence']>=85 for r in rows)}</strong><span>High Confidence</span></div><div class='card'><h2>Rankings</h2><table><thead><tr><th>Rank</th><th>Team</th><th>CPI</th><th>Record</th><th>Confidence</th><th>Network</th><th>Evidence</th><th>Schedule</th><th>Path</th></tr></thead><tbody>{table}</tbody></table></div></body></html>"""
    (QA/"cpi-evidence-report.html").write_text(html,encoding="utf-8")
    print(json.dumps(report["summary"],indent=2))
if __name__=="__main__": main()
