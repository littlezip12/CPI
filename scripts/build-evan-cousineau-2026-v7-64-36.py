#!/usr/bin/env python3
"""Build the 2026 Evan Cousineau Memorial Cup schedule from supplied official workbook exports.

The uploaded CSV exports are the seed/provenance source. This builder intentionally preserves
scheduled games and bracket references without inventing results. A future official live source
can replace or reconcile rows by stable source game ID without changing the public tournament URL.
"""
from __future__ import annotations

import csv
import importlib.util
import json
import re
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from tournament_pipeline import IdentityResolver, normalize_csv

ROOT = Path(__file__).resolve().parents[1]
EVENT_ID = "2026-evan-cousineau-memorial-cup"
RELEASE = "7.64.36"
GENERATED_AT = datetime.now(ZoneInfo("America/Los_Angeles")).replace(microsecond=0).isoformat()
SOURCE_DIR = ROOT / "data/tournaments/source" / EVENT_ID
RAW_DIR = ROOT / "data/tournaments/raw" / EVENT_ID
NORMALIZED_DIR = ROOT / "data/tournaments/normalized" / EVENT_ID
QA_DIR = ROOT / "data/tournaments/qa" / EVENT_ID
BUNDLE_PATH = ROOT / "data/tournaments/platform/events" / f"{EVENT_ID}.json"
PLATFORM_REGISTRY_PATH = ROOT / "data/tournaments/platform/registry.json"
PLATFORM_RUNTIME_PATH = ROOT / "data/tournaments/platform/runtime.js"
PUBLIC_HUB_PATH = ROOT / "data/tournaments/public-hub.json"
LIVE_INDEX_PATH = ROOT / "data/live/tournament-schedule-index.json"
MANIFEST_PATH = ROOT / "data/tournaments/normalized/manifest.json"
EMPTY_PLACEMENTS_PATH = ROOT / "data/tournaments/archive" / f"{EVENT_ID}.json"
OFFICIAL_SOURCE_URL = "https://onedrive.live.com/:x:/g/personal/6f253ef3afcfe1c8/IQAeP081w5icT5v2gE07WQKbAbleQbur9GlpZuXPbLHVMGY?rtime=qdrLY-sd30g&redeem=aHR0cHM6Ly8xZHJ2Lm1zL3gvYy82ZjI1M2VmM2FmY2ZlMWM4L0lRQWVQMDgxdzVpY1Q1djJnRTA3V1FLYkFibGVRYnVyOUdscFp1WFBiTEhWTUdZP2U9SGhGeHI2"

DIVISIONS = [
    {"id":"10u-boys","label":"10U Boys","ageGroup":"10U","gender":"Boys","division":"Open","divisionTier":"Open","source":"10u-boys.csv"},
    {"id":"10u-girls-coed-gold","label":"10U Girls & Coed Gold","ageGroup":"10U","gender":"Girls & Coed","division":"Gold","divisionTier":"D2","source":"10u-girls-coed-gold.csv"},
    {"id":"10u-coed-platinum","label":"10U Coed Platinum","ageGroup":"10U","gender":"Coed","division":"Platinum","divisionTier":"D1","source":"10u-coed-platinum.csv"},
    {"id":"12u-coed-boys-silver","label":"12U Coed & Boys Silver","ageGroup":"12U","gender":"Coed & Boys","division":"Silver","divisionTier":"D3","source":"12u-coed-boys-silver.csv"},
    {"id":"12u-boys-gold","label":"12U Boys Gold","ageGroup":"12U","gender":"Boys","division":"Gold","divisionTier":"D2","source":"12u-boys-gold.csv"},
    {"id":"12u-boys-platinum","label":"12U Boys Platinum","ageGroup":"12U","gender":"Boys","division":"Platinum","divisionTier":"D1","source":"12u-boys-platinum.csv"},
    {"id":"12u-girls","label":"12U Girls","ageGroup":"12U","gender":"Girls","division":"Open","divisionTier":"Open","source":"12u-girls.csv"},
    {"id":"14u-coed-boys-silver","label":"14U Coed & Boys Silver","ageGroup":"14U","gender":"Coed & Boys","division":"Silver","divisionTier":"D3","source":"14u-coed-boys-silver.csv"},
    {"id":"14u-boys-gold","label":"14U Boys Gold","ageGroup":"14U","gender":"Boys","division":"Gold","divisionTier":"D2","source":"14u-boys-gold.csv"},
    {"id":"14u-boys-platinum","label":"14U Boys Platinum","ageGroup":"14U","gender":"Boys","division":"Platinum","divisionTier":"D1","source":"14u-boys-platinum.csv"},
    {"id":"14u-girls-gold","label":"14U Girls Gold","ageGroup":"14U","gender":"Girls","division":"Gold","divisionTier":"D2","source":"14u-girls-gold.csv"},
    {"id":"14u-girls-platinum","label":"14U Girls Platinum","ageGroup":"14U","gender":"Girls","division":"Platinum","divisionTier":"D1","source":"14u-girls-platinum.csv"},
    {"id":"hs-girls","label":"HS Girls","ageGroup":"HS","gender":"Girls","division":"Open","divisionTier":"HS","source":"hs-girls.csv"},
]


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def clean_schedule_csv(source_path: Path) -> str:
    rows = list(csv.reader(source_path.open(encoding="utf-8-sig", errors="replace", newline="")))
    header_index = next((i for i,row in enumerate(rows) if len(row) >= 10 and row[0].strip().upper()=="DATE" and row[3].strip().upper()=="GAME ID"), None)
    if header_index is None:
        raise RuntimeError(f"No DATE/GAME ID schedule header found in {source_path.name}")
    output = [["DATE","TIME","LOCATION","GAME ID","WHITE TEAM","S","DARK TEAM","S","COMMENTS","DIVISION"]]
    for row in rows[header_index+1:]:
        row = row + [""] * max(0, 10-len(row))
        if re.match(r"^\d{1,2}-[A-Za-z]{3}$", row[0].strip()) and row[3].strip():
            output.append([str(value).strip() for value in row[:10]])
    from io import StringIO
    buf=StringIO(); writer=csv.writer(buf,lineterminator="\n"); writer.writerows(output)
    return buf.getvalue()


def normalized_division_config(meta: dict) -> dict:
    return {
        "id": meta["id"], "label": meta["label"], "season": "2026",
        "ageGroup": meta["ageGroup"], "gender": meta["gender"],
        "division": meta["division"], "divisionTier": meta["divisionTier"],
        "parser": "results_table_v1", "sourceType": "uploaded_csv",
        "spreadsheetId": "official-onedrive-2026-ec-cup",
        "gid": meta["id"],
        "sourceUrl": f"data/tournaments/raw/{EVENT_ID}/{meta['id']}.csv",
    }


def load_platform_builder():
    path = ROOT / "scripts/build-tournament-platform-v7-54-1.py"
    spec = importlib.util.spec_from_file_location("wphq_platform_builder_7541", path)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


def time_key(game: dict):
    raw = str(game.get("timeLabel") or "").strip().upper()
    try:
        tm = datetime.strptime(raw, "%I:%M %p").time()
        minute = tm.hour*60 + tm.minute
    except Exception:
        minute = 9999
    return (game.get("dateIso") or "", minute, game.get("divisionLabel") or "", str(game.get("gameNumber") or ""))


def bracket_side(raw: dict | None):
    if not raw or raw.get("kind") != "bracket_reference":
        return None
    return {
        "participantId": None,
        "name": None,
        "teamId": None,
        "clubId": None,
        "kind": "bracket_reference",
        "sourceReference": raw.get("sourceReference"),
        "raw": raw.get("raw"),
        "identityStatus": "not_applicable",
    }



def route_number(value: str | None) -> str | None:
    match = re.search(r"(\d+)([A-Za-z]?)$", str(value or "").strip())
    if not match:
        return None
    number = str(int(match.group(1)))
    return number + (match.group(2).upper() if match.group(2) else "")


def ordinal_word(rank: int) -> str:
    if rank == 1: return "1st"
    if rank == 2: return "2nd"
    if rank == 3: return "3rd"
    return f"{rank}th"


def parse_route_reference(reference: str | None) -> dict:
    raw = str(reference or "").strip().replace("–", "-").replace("—", "-")
    meta = {"raw": raw or None, "kind": "unknown"}
    if not raw:
        return meta
    match = re.fullmatch(r"([WL])#?(\d+[A-Za-z]?)", raw, re.I)
    if match:
        meta.update({"kind": "game_result", "outcome": "winner" if match.group(1).upper()=="W" else "loser", "sourceRouteNumber": str(int(re.match(r"\d+", match.group(2)).group())) + re.sub(r"^\d+", "", match.group(2)).upper()})
        return meta
    match = re.fullmatch(r"([WL])#?([A-Z]{1,2}\d+)/([A-Z]{1,2}\d+)", raw, re.I)
    if match:
        meta.update({"kind": "matchup_result", "outcome": "winner" if match.group(1).upper()=="W" else "loser", "matchupSlots": sorted([match.group(2).upper(), match.group(3).upper()])})
        return meta
    match = re.fullmatch(r"([A-Z]{1,2})(\d+)\((1st|2nd|3rd|4th|5th)\s*([A-Z]{1,2})\)", raw, re.I)
    if match:
        meta.update({"kind": "slot_group_placement", "slot": f"{match.group(1).upper()}{int(match.group(2))}", "slotGroup": match.group(1).upper(), "slotSeed": int(match.group(2)), "rank": int(match.group(3)[0]), "sourceGroup": match.group(4).upper()})
        return meta
    match = re.fullmatch(r"(1st|2nd|3rd|4th|5th)\s*([A-Z]{1,2})", raw, re.I)
    if match:
        meta.update({"kind": "group_placement", "rank": int(match.group(1)[0]), "sourceGroup": match.group(2).upper()})
        return meta
    match = re.match(r"^([A-Z]{1,2})(\d+)(?:\([^)]*\))?$", raw, re.I)
    if match:
        meta.update({"kind": "slot", "slot": f"{match.group(1).upper()}{int(match.group(2))}", "slotGroup": match.group(1).upper(), "slotSeed": int(match.group(2))})
        return meta
    return meta


def enrich_ecc_routing(bundle: dict, originals: dict[str, dict]) -> None:
    games = bundle.get("games", [])
    teams = {team.get("participantId"): team for team in bundle.get("teams", []) if team.get("participantId")}
    by_route_number: dict[tuple[str, str], list[str]] = defaultdict(list)
    by_slot_pair: dict[tuple[str, tuple[str, str]], list[str]] = defaultdict(list)
    by_id = {game.get("id"): game for game in games}

    for game in games:
        original = originals.get(game.get("id")) or {}
        number = route_number(original.get("sourceGameId") or game.get("gameNumber"))
        game["routeNumber"] = number
        if number:
            by_route_number[(game.get("divisionId"), number)].append(game.get("id"))
        game["routing"] = {}
        slots = []
        for side in ("white", "dark"):
            source_participant = ((original.get("participants") or {}).get(side) or {})
            ref = source_participant.get("sourceReference") or source_participant.get("raw")
            meta = parse_route_reference(ref)
            known = game.get(side) or {}
            if known.get("participantId"):
                meta["resolvedParticipantId"] = known.get("participantId")
            game["routing"][side] = meta
            if meta.get("slot"):
                slots.append(meta["slot"])
        if len(slots) == 2:
            by_slot_pair[(game.get("divisionId"), tuple(sorted(slots)))].append(game.get("id"))

    for game in games:
        for side in ("white", "dark"):
            meta = game["routing"][side]
            source_ids = []
            if meta.get("kind") == "game_result":
                source_ids = by_route_number.get((game.get("divisionId"), meta.get("sourceRouteNumber")), [])
            elif meta.get("kind") == "matchup_result":
                source_ids = by_slot_pair.get((game.get("divisionId"), tuple(meta.get("matchupSlots") or [])), [])
            if source_ids:
                meta["sourceGameIds"] = source_ids
                if len(source_ids) == 1:
                    src = by_id.get(source_ids[0]) or {}
                    meta["sourceRouteNumber"] = src.get("routeNumber") or meta.get("sourceRouteNumber")

    candidates: dict[tuple[str, str], set[str]] = {}
    groups: dict[tuple[str, str], set[str]] = defaultdict(set)
    for game in games:
        for side in ("white", "dark"):
            key = (game.get("id"), side)
            meta = game["routing"][side]
            values = set()
            if meta.get("resolvedParticipantId"):
                values.add(meta["resolvedParticipantId"])
            candidates[key] = values

    for _ in range(80):
        changed = False
        next_groups: dict[tuple[str, str], set[str]] = defaultdict(set)
        for game in games:
            for side in ("white", "dark"):
                meta = game["routing"][side]
                if meta.get("slotGroup"):
                    next_groups[(game.get("divisionId"), meta["slotGroup"])].update(candidates[(game.get("id"), side)])
        for k, values in next_groups.items():
            before = len(groups[k]); groups[k].update(values); changed |= len(groups[k]) != before

        for game in games:
            for side in ("white", "dark"):
                key = (game.get("id"), side)
                meta = game["routing"][side]
                proposed = set(candidates[key])
                if meta.get("kind") in {"group_placement", "slot_group_placement"}:
                    proposed.update(groups.get((game.get("divisionId"), meta.get("sourceGroup")), set()))
                elif meta.get("kind") in {"game_result", "matchup_result"}:
                    for source_id in meta.get("sourceGameIds") or []:
                        proposed.update(candidates.get((source_id, "white"), set()))
                        proposed.update(candidates.get((source_id, "dark"), set()))
                if proposed != candidates[key]:
                    candidates[key] = proposed; changed = True
        if not changed:
            break

    downstream: dict[str, dict[str, list[str]]] = defaultdict(lambda: {"winner": [], "loser": []})
    unresolved = 0
    for game in games:
        possible = set()
        for side in ("white", "dark"):
            meta = game["routing"][side]
            ids = sorted(candidates[(game.get("id"), side)], key=lambda pid: (teams.get(pid) or {}).get("name", pid))
            meta["candidateParticipantIds"] = ids
            meta["candidateNames"] = [(teams.get(pid) or {}).get("name", pid) for pid in ids]
            possible.update(ids)
            kind = meta.get("kind")
            if kind in {"game_result", "matchup_result"}:
                label = ("Winner" if meta.get("outcome") == "winner" else "Loser")
                if meta.get("sourceRouteNumber"):
                    meta["publicLabel"] = f"{label} of Game {meta['sourceRouteNumber']}"
                else:
                    meta["publicLabel"] = f"{label} of earlier matchup"
                for source_id in meta.get("sourceGameIds") or []:
                    if game.get("id") not in downstream[source_id][meta.get("outcome")]:
                        downstream[source_id][meta.get("outcome")].append(game.get("id"))
            elif kind in {"group_placement", "slot_group_placement"}:
                meta["publicLabel"] = f"{ordinal_word(meta.get('rank'))} from Group {meta.get('sourceGroup')}"
            elif kind == "slot" and meta.get("slotGroup"):
                meta["publicLabel"] = f"Group {meta['slotGroup']} seed {meta.get('slotSeed')}"
            elif meta.get("candidateNames"):
                meta["publicLabel"] = meta["candidateNames"][0]
            else:
                meta["publicLabel"] = "Team TBD"
            if not ids and kind != "unknown": unresolved += 1
        game["possibleParticipantIds"] = sorted(possible)
        game["routeDownstream"] = downstream.get(game.get("id"), {"winner": [], "loser": []})

    # downstream was populated while target games were visited, so apply it after the full pass.
    for game in games:
        game["routeDownstream"] = downstream.get(game.get("id"), {"winner": [], "loser": []})

    bundle["routing"] = {
        "schemaVersion": 1,
        "model": "jo_style_candidate_and_resolution",
        "internalCodesHiddenFromPublicUi": True,
        "groupCandidateCount": len(groups),
        "bracketSideCount": sum(1 for game in games for side in ("white", "dark") if game["routing"][side].get("kind") not in {"slot", "unknown"}),
        "unresolvedCandidateSideCount": unresolved,
        "sourceOfTruth": "official_schedule_then_result_overlay",
    }

def update_manifest(rows: list[dict]):
    manifest = load(MANIFEST_PATH)
    datasets = [row for row in manifest.get("datasets",[]) if row.get("eventId") != EVENT_ID] + rows
    counts=defaultdict(int)
    for row in datasets:
        counts["datasets"] += 1
        for key in ("games","finalGames","scheduledGames","zeroZeroPlaceholders","partialScores","blockers","reviewItems"):
            counts[key] += int((row.get("counts") or {}).get(key) or 0)
    manifest.update({"release":RELEASE,"generatedAt":GENERATED_AT,"counts":dict(counts),"datasets":sorted(datasets,key=lambda x:(x.get("eventId") or "",x.get("divisionId") or ""))})
    dump(MANIFEST_PATH, manifest)


def update_public_hub(bundle: dict):
    hub=load(PUBLIC_HUB_PATH)
    hub["release"] = RELEASE
    hub["featuredEventId"] = EVENT_ID
    hub["nextTournament"] = {
        "status":"schedule_published",
        "eyebrow":"Next tournament · schedule published",
        "name":"2026 Evan Cousineau Memorial Cup",
        "dateLabel":"October 3–4, 2026",
        "locationLabel":"Orange County, California · 18 pools/venues listed",
        "description":"The 2026 Evan Cousineau schedule is published from the official workbook exports. All 13 supplied divisions and 335 games are listed, with JO-style possible paths that translate bracket codes into actual candidate team names. Official scores/results will overlay the same stable games when the best live result source is identified.",
        "publicPath":f"tournament.html?event={EVENT_ID}",
        "ctaLabel":"View ECC schedule",
        "competitiveSeason":"2026-2027",
        "seasonLabel":"2026–2027"
    }
    event_row={
        "id":EVENT_ID,"seasonOrder":20,"name":"2026 Evan Cousineau Memorial Cup","dateLabel":"October 3–4, 2026",
        "audience":"10U–14U, HS Girls · Boys, Girls & Coed","status":"schedule_published","mode":"platform",
        "dataPath":f"data/tournaments/platform/events/{EVENT_ID}.json","publicPath":f"tournament.html?event={EVENT_ID}",
        "resultLabel":f"{bundle['summary']['divisionCount']} divisions · {bundle['summary']['gameCount']} scheduled games",
        "eventYear":2026,"competitiveSeason":"2026-2027","seasonLabel":"2026–2027"
    }
    hub["events"]=[row for row in hub.get("events",[]) if row.get("id")!=EVENT_ID]
    hub["events"].insert(0,event_row)
    for season in hub.get("seasons",[]):
        if season.get("id")=="2026-2027":
            season["summary"]="Active season · ECC schedule published"
            season["emptyTitle"]="2026 Evan Cousineau Memorial Cup schedule published."
            season["emptyDescription"]="Water Polo HQ currently lists 13 supplied ECC divisions and 335 scheduled games for October 3–4, 2026. Results remain pending."
    dump(PUBLIC_HUB_PATH,hub)


def update_platform_registry(bundle: dict):
    registry=load(PLATFORM_REGISTRY_PATH)
    registry["release"]=RELEASE; registry["generatedAt"]=GENERATED_AT
    row={
        "id":EVENT_ID,"name":"2026 Evan Cousineau Memorial Cup","shortName":"Evan Cousineau Memorial Cup","season":"2026",
        "kind":"tournament_schedule","status":"schedule_published","operationsMode":"live_schedule",
        "divisionCount":bundle["summary"]["divisionCount"],"publicPath":f"tournament.html?event={EVENT_ID}","legacyPath":None,
        "migrationStatus":"platform_live","dataPath":f"data/tournaments/platform/events/{EVENT_ID}.json","rankingEvidenceEnabled":False,
        "filterCapabilities":bundle["capabilities"]["filters"],"sourceAdapters":bundle["sourceAdapters"],
        "eventYear":2026,"competitiveSeason":"2026-2027","seasonLabel":"2026–2027"
    }
    registry["events"]=[x for x in registry.get("events",[]) if x.get("id")!=EVENT_ID]
    registry["events"].insert(0,row)
    dump(PLATFORM_REGISTRY_PATH,registry)
    PLATFORM_RUNTIME_PATH.write_text("window.WPI_TOURNAMENT_PLATFORM_REGISTRY = "+json.dumps(registry,separators=(",",":"),ensure_ascii=False)+";\n",encoding="utf-8")


def update_live_index():
    # Rebuild from the public hub using the proven 7.60.3 builder, then stamp the current release/time.
    path = ROOT / "scripts/build-live-tournament-schedule-index.py"
    spec = importlib.util.spec_from_file_location("wphq_schedule_index", path)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module); module.main()
    index=load(LIVE_INDEX_PATH); index["release"]=RELEASE; index["generatedAt"]=GENERATED_AT
    dump(LIVE_INDEX_PATH,index)


def main():
    EVENT={
        "id":EVENT_ID,"name":"2026 Evan Cousineau Memorial Cup","shortName":"Evan Cousineau Memorial Cup",
        "kind":"tournament_schedule","eventStatus":"schedule_published","operationsMode":"live_schedule",
        "publicPath":f"tournament.html?event={EVENT_ID}","officialSourceUrl":OFFICIAL_SOURCE_URL,
        "rankingEvidenceEnabled":False,
        "sourcePolicy":"Official OneDrive workbook schedule exports supplied September 28, 2026 seed the schedule. Water Polo HQ preserves stable game IDs and JO-style bracket routing; official scores/results will overlay the same games when the best live result source is identified. No results are inferred.",
        "divisions":[normalized_division_config(meta) for meta in DIVISIONS],
    }
    resolver=IdentityResolver(); manifest_rows=[]
    for meta, division in zip(DIVISIONS, EVENT["divisions"]):
        src=SOURCE_DIR/meta["source"]
        if not src.exists(): raise FileNotFoundError(src)
        cleaned=clean_schedule_csv(src)
        raw=RAW_DIR/f"{meta['id']}.csv"; raw.parent.mkdir(parents=True,exist_ok=True); raw.write_text(cleaned,encoding="utf-8")
        normalized,qa=normalize_csv(cleaned,event=EVENT,division=division,resolver=resolver,fetched_at=GENERATED_AT,source_mode="official_workbook_export")
        # ECC exports do not contain W-To/L-To columns. The generic results parser's
        # positional fallback is JO-specific and would misread TIME/LOCATION as routing.
        # ECC routing is instead derived from the authoritative participant references.
        for game in normalized.get("games", []):
            game["advancement"] = {"winnerTo": None, "loserTo": None}
        dump(NORMALIZED_DIR/f"{meta['id']}.json",normalized); dump(QA_DIR/f"{meta['id']}.json",qa)
        manifest_rows.append({"eventId":EVENT_ID,"divisionId":meta["id"],"path":f"data/tournaments/normalized/{EVENT_ID}/{meta['id']}.json","sourceSha256":normalized["source"]["contentSha256"],"fetchedAt":normalized["source"]["fetchedAt"],"sourceMode":normalized["source"]["mode"],"counts":normalized["counts"]})
    update_manifest(manifest_rows)
    dump(EMPTY_PLACEMENTS_PATH,{"schemaVersion":1,"release":RELEASE,"eventId":EVENT_ID,"eventName":EVENT["name"],"policy":{"publishOnlyVerifiedPlacements":True,"note":"No placements are published before results are official."},"groups":[]})

    platform=load_platform_builder(); platform.PLACEMENT_PATHS[EVENT_ID]=EMPTY_PLACEMENTS_PATH
    clubs=load(ROOT/"clubs.json"); rankings=load(ROOT/"rankings.json"); aliases=platform.build_alias_index()
    bundle=platform.build_event_bundle(EVENT,clubs,rankings,aliases)
    bundle["release"]=RELEASE; bundle["generatedAt"]=GENERATED_AT
    bundle["event"].update({
        "name":EVENT["name"],"shortName":EVENT["shortName"],"season":"2026","kind":"tournament_schedule",
        "status":"schedule_published","operationsMode":"live_schedule","sourceGap":None,"clubLogosEnabled":True,
        "publicPath":f"tournament.html?event={EVENT_ID}","legacyPath":None,"officialSourceUrl":OFFICIAL_SOURCE_URL,
        "rankingEvidenceEnabled":False,"sourcePolicy":EVENT["sourcePolicy"],"eventYear":2026,"competitiveSeason":"2026-2027","seasonLabel":"2026–2027"
    })
    bundle["capabilities"]["liveRefresh"]=True
    bundle["capabilities"]["refreshSeconds"]=60
    bundle["capabilities"]["refreshMode"]="repository_poll"
    bundle["capabilities"]["scoreSourceStatus"]="pending_official_result_source"
    bundle["capabilities"]["joStyleJourneyRouting"]=True
    bundle["summary"]["placementCount"]=0
    bundle["placements"]={}
    for div in bundle["divisions"]:
        div["status"]="schedule_published" if div.get("gameCount") else "awaiting_schedule"
        div["source"]["adapter"]="uploaded_csv"
    for team in bundle["teams"]:
        team["finish"]=None; team["finishLabel"]=None
        if not any((g.get("status")=="final" and ((g.get("white") or {}).get("participantId")==team.get("participantId") or (g.get("dark") or {}).get("participantId")==team.get("participantId"))) for g in bundle["games"]):
            team["record"]={"wins":0,"losses":0,"ties":0,"display":"Scheduled"}
    # Preserve official bracket routing references that the archive platform historically omitted.
    originals={}
    for meta in DIVISIONS:
        doc=load(NORMALIZED_DIR/f"{meta['id']}.json")
        originals.update({g["id"]:g for g in doc.get("games",[])})
    for game in bundle["games"]:
        original=originals.get(game.get("id")) or {}
        for side in ("white","dark"):
            if game.get(side) is None:
                game[side]=bracket_side((original.get("participants") or {}).get(side))
    bundle["games"].sort(key=time_key)
    enrich_ecc_routing(bundle, originals)
    bundle["sourceAdapters"]=[
        {"id":"2026-ecc-normalized-bank","type":"normalized_json","role":"application_schedule_bank","pathTemplate":f"data/tournaments/normalized/{EVENT_ID}/{{divisionId}}.json","readMode":"repository"},
        {"id":"2026-ecc-onedrive-workbook","type":"onedrive_workbook","role":"official_schedule_source","readMode":"linked_source","officialSourceUrl":OFFICIAL_SOURCE_URL,"status":"schedule_authority"},
        {"id":"2026-ecc-result-overlay","type":"replaceable_result_adapter","role":"official_scores_and_results","readMode":"pending","status":"awaiting_best_live_result_source"},
    ]
    dump(BUNDLE_PATH,bundle)
    update_platform_registry(bundle); update_public_hub(bundle); update_live_index()
    print(f"WPHQ 7.64.36 ECC: {bundle['summary']['divisionCount']} divisions, {bundle['summary']['gameCount']} scheduled games, {bundle['summary']['venueCount']} venues")

if __name__=="__main__": main()
