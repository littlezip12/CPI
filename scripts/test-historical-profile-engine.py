#!/usr/bin/env python3
"""Regression tests for WPI 7.49 historical profile summaries."""
from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]
load=lambda rel: json.loads((ROOT/rel).read_text(encoding='utf-8'))
profiles=load('data/tournaments/history/index.json')
archive=load('data/tournaments/archive/index.json')
rankings=load('rankings.json')

def require(value,message):
    if not value: raise AssertionError(message)

require(profiles.get('release')=='7.49.1','Historical profiles must use release 7.49.1')
require(profiles.get('policy',{}).get('rankingEvidenceEnabled') is False,'Historical profiles must remain ranking-quarantined')
require(profiles.get('counts',{}).get('finalGames')==archive.get('counts',{}).get('finalGames'),'Historical profile final count must match archive')
require(profiles.get('counts',{}).get('teams',0)>=100,'Expected at least 100 canonical teams with linked history')
require(profiles.get('counts',{}).get('clubs',0)>=70,'Expected at least 70 canonical clubs with linked history')
lamo=profiles.get('clubs',{}).get('club-lamorinda')
require(lamo and lamo.get('summary',{}).get('finalGames',0)>0,'Lamorinda club history should contain verified finals')
require(len(lamo.get('appearances',[]))>=2,'Lamorinda should have multiple historical appearances')
arroyo=profiles.get('teams',{}).get('team-2026-14u-girls-arroyo-grande-14u-girls')
require(arroyo and arroyo.get('summary',{}).get('bestFinish')==1,'Explicit Quiksilver first place should connect to Arroyo Grande')
require(any(item.get('source')=='explicit_source_placement' for item in arroyo.get('placements',[])),'Placement provenance should remain explicit')
require(all(item.get('canonicalTeamId') in {row.get('canonicalTeamId') for row in rankings} for item in profiles.get('teams',{}).values()),'Team histories must only attach to canonical ranked team IDs')
print('HISTORICAL PROFILE ENGINE TESTS PASSED')
print(' - Archived finals aggregate into canonical team and club histories')
print(' - Explicit finishes retain provenance and profile links')
print(' - Historical profile display remains isolated from ranking evidence')
