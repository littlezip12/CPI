#!/usr/bin/env python3
"""Build the public 2026 Junior Olympics three-weekend recap."""
from __future__ import annotations
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
JO_PATH=ROOT/"data/tournaments/jo-results-2026.json"
S3_PATH=ROOT/"data/tournaments/platform/events/2026-jo-session-3.json"
RECAP_PATH=ROOT/"data/tournaments/jo-recap-2026.json"
RELEASE="7.54.17"
def load(p): return json.loads(p.read_text(encoding="utf-8"))
def dump(p,v): p.write_text(json.dumps(v,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
def legacy_champions(groups):
    rows=[]
    for group in groups:
        for division in group.get("divisions",[]):
            subs=division.get("subdivisions",[])
            if not subs or not subs[0].get("teams"): continue
            team=next((x for x in subs[0]["teams"] if x.get("place")==1),subs[0]["teams"][0])
            rows.append({"ageGroup":group["ageGroup"],"category":group["category"],"division":division["label"],"team":team["team"]})
    return rows
def session3_champions(bundle):
    teams={t["participantId"]:t for t in bundle.get("teams",[])}; rows=[]
    for division in bundle.get("divisions",[]):
        placements=bundle.get("placements",{}).get(division["id"],[])
        first=next((x for x in placements if x.get("place")==1 and x.get("subdivision")=="Platinum"),None)
        if not first:
            first=next((x for x in placements if x.get("place")==1),None)
        if not first: continue
        team=teams.get(first.get("participantId"),first)
        rows.append({
            "ageGroup":division["ageGroup"],
            "category":division["gender"],
            "division":first.get("subdivision") or "Championship",
            "team":first.get("name") or team.get("name")
        })
    return rows
def main():
    jo=load(JO_PATH); s3=load(S3_PATH)
    w1=[g for g in jo["groups"] if g.get("weekend")=="Weekend 1"]
    w2=[g for g in jo["groups"] if g.get("weekend")=="Weekend 2"]
    recap={
      "schemaVersion":1,"release":RELEASE,"season":2026,"event":"USA Water Polo National Junior Olympics",
      "status":"complete_with_score_gap","generatedAt":"2026-08-02T23:17:00-07:00",
      "summary":{"weekends":3,"divisions":31,"verifiedPlacements":1114,"completeDivisions":31,"scoreCompleteDivisions":30,"sourceIncompleteDivisions":1,"weekend3FinalGames":464,"weekend3ScheduledWithoutScores":81},
      "sourceNotice":"Weekend 3 12U Coed final Platinum and Gold placements are now published from the post-event ranking confirmation. The official bracket still has no game scores, so WPI does not show records or infer game outcomes for that division.",
      "weekends":[
       {"id":"weekend-1","label":"Weekend 1","subtitle":"Girls & Coed · Southern California","dates":"July 18–21, 2026","location":"Orange County, California","divisionCount":11,"verifiedPlacements":445,"status":"complete","publicPath":"tournaments/jo-girls/","champions":legacy_champions(w1)},
       {"id":"weekend-2","label":"Weekend 2","subtitle":"Boys · Southern California","dates":"July 23–26, 2026","location":"Orange County, California","divisionCount":12,"verifiedPlacements":531,"status":"complete","publicPath":"tournaments/jo-boys/","champions":legacy_champions(w2)},
       {"id":"weekend-3","label":"Weekend 3","subtitle":"Boys, Girls & Coed · North Texas","dates":"July 30–August 2, 2026","location":"North Texas","divisionCount":8,"verifiedPlacements":138,"status":"complete_with_score_gap","publicPath":"tournament.html?event=2026-jo-session-3","champions":session3_champions(s3),"sourceGap":"12U Coed: final placements published; 81 game scores remain unavailable"}
      ]
    }
    dump(RECAP_PATH,recap)
    print("2026 JO RECAP BUILD COMPLETE")
    print(" - 3 weekends, 31 divisions, 1,114 verified placements")
    print(" - Weekend 3: 138 placements and 464 finals across eight placement-complete divisions")
    print(" - Weekend 3 12U Coed has final placements but 81 unavailable game scores")
    return 0
if __name__=="__main__": raise SystemExit(main())
