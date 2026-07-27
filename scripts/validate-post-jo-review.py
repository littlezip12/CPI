#!/usr/bin/env python3
import hashlib
import json
import subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
errors=[]
def fail(x): errors.append(x)
def load(rel):
 p=ROOT/rel
 if not p.exists(): fail(f'Missing {rel}'); return {}
 try:return json.loads(p.read_text(encoding='utf-8'))
 except Exception as exc: fail(f'Invalid JSON in {rel}: {exc}'); return {}

snapshot=load('data/rankings/snapshots/2026-pre-jo-7.45.2.json')
packet=load('data/tournaments/post-jo-review/index.json')
policy=load('config/ranking-review-policy.json')
rankings=load('rankings.json')
evidence=load('data/tournaments/evidence/index.json')

teams=snapshot.get('teams',[])
payload=json.dumps(teams,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode('utf-8')
actual_hash=hashlib.sha256(payload).hexdigest()
if snapshot.get('teamsHash')!=actual_hash: fail('Pre-JO snapshot team hash does not match its immutable contents')
if snapshot.get('counts',{}).get('teams')!=len(teams): fail('Snapshot team count mismatch')
ids=[r.get('canonicalTeamId') for r in teams]
if len(ids)!=len(set(ids)): fail('Pre-JO snapshot contains duplicate canonical team IDs')
if policy.get('rules',{}).get('automaticPublication') is not False: fail('Review policy must block automatic publication')
if packet.get('policy',{}).get('mode')!='manual_review_only': fail('Post-JO packet is not manual-review-only')
if packet.get('snapshot',{}).get('teamsHash')!=snapshot.get('teamsHash'): fail('Review packet does not reference the immutable snapshot hash')

expected=set()
snapshot_ids={r.get('canonicalTeamId') for r in teams if r.get('canonicalTeamId')}
current_ids={r.get('canonicalTeamId') for r in rankings if r.get('canonicalTeamId')}
for item in evidence.get('teams',{}).values():
 team_id=item.get('canonicalTeamId')
 if not item.get('rankingEligible') or not team_id or team_id not in snapshot_ids or team_id not in current_ids: continue
 for app in item.get('appearances',[]): expected.add((team_id,app.get('eventId'),app.get('divisionId')))
packets=packet.get('packets',[])
actual={(p.get('canonicalTeamId'),p.get('eventId'),p.get('divisionId')) for p in packets}
if actual!=expected:
 fail(f'Packet identity set differs from ranked JO appearance set: expected {len(expected)}, found {len(actual)}')
if packet.get('counts',{}).get('packets')!=len(packets): fail('Packet count mismatch')
for p in packets:
 if p.get('policy')!='manual_decision_only': fail(f"Packet is not manual-only: {p.get('packetId')}")
 if p.get('expectedFinishMethod') not in {'official_jo_seed',None}: fail(f"Unsupported expected-finish method: {p.get('packetId')}")
 if p.get('actualFinish') is None and p.get('reviewState')=='ready': fail(f"Packet is ready without verified placement: {p.get('packetId')}")
 if p.get('reviewState')=='ready' and not isinstance(p.get('performanceDelta'),int): fail(f"Ready packet lacks seed delta: {p.get('packetId')}")

for rel in ['post-jo-review.html','js/post-jo-review-v7-46.js','css/post-jo-review-v7-46.css','data/tournaments/post-jo-review/runtime.js','data/tournaments/post-jo-review/change-set-schema.json']:
 if not (ROOT/rel).exists(): fail(f'Missing {rel}')
for script in ['scripts/build-post-jo-review.py','scripts/test-post-jo-review-engine.py','scripts/validate-post-jo-review.py','scripts/validate-ranking-change-set.py']:
 proc=subprocess.run(['python3','-m','py_compile',str(ROOT/script)],capture_output=True,text=True)
 if proc.returncode: fail(f'Python syntax error in {script}: {proc.stderr.strip()}')
if errors:
 print('POST-JO REVIEW VALIDATION FAILED'); [print(' - '+x) for x in errors]; raise SystemExit(1)
print('POST-JO REVIEW VALIDATION PASSED')
print(f" - Immutable pre-JO snapshot contains {len(teams)} ranked teams")
print(f" - {len(packets)} ranked JO entries have controlled review packets")
print(f" - {packet.get('counts',{}).get('readyForReview',0)} packets are currently ready for manual decisions")
print(' - Official seed expectations remain division-local and rankings cannot publish automatically')
