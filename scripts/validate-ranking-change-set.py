#!/usr/bin/env python3
"""Validate an exported CPI approved ranking change set. Never applies changes."""
import json
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
POLICY=json.loads((ROOT/'config/ranking-review-policy.json').read_text())
PACKETS=json.loads((ROOT/'data/tournaments/post-jo-review/index.json').read_text())
PACKET_BY_ID={p['packetId']:p for p in PACKETS.get('packets',[])}

def validate(data):
 errors=[]
 if data.get('schemaVersion')!=1: errors.append('schemaVersion must be 1')
 if data.get('snapshotId')!=PACKETS.get('snapshot',{}).get('id'): errors.append('snapshotId does not match the active pre-JO snapshot')
 decisions=data.get('decisions')
 if not isinstance(decisions,list): return ['decisions must be an array']
 seen=set()
 for i,d in enumerate(decisions,1):
  prefix=f'decision {i}'
  pid=d.get('packetId')
  if not pid or pid not in PACKET_BY_ID: errors.append(f'{prefix}: unknown packetId'); continue
  if pid in seen: errors.append(f'{prefix}: duplicate packetId')
  seen.add(pid)
  p=PACKET_BY_ID[pid]
  if d.get('canonicalTeamId')!=p.get('canonicalTeamId'): errors.append(f'{prefix}: canonicalTeamId mismatch')
  if d.get('status')!='approved': errors.append(f'{prefix}: status must be approved')
  if d.get('action') not in POLICY.get('allowedActions',[]): errors.append(f'{prefix}: invalid action')
  rationale=str(d.get('rationale') or '').strip()
  if not rationale: errors.append(f'{prefix}: rationale is required')
  current=d.get('currentRank'); proposed=d.get('proposedRank')
  if current!=p.get('currentRank'): errors.append(f'{prefix}: currentRank differs from active packet')
  if d.get('action')=='hold' and proposed!=current: errors.append(f'{prefix}: hold must preserve current rank')
  if d.get('action')=='move_up' and (not isinstance(proposed,int) or proposed>=current): errors.append(f'{prefix}: move_up requires a lower proposed rank')
  if d.get('action')=='move_down' and (not isinstance(proposed,int) or proposed<=current): errors.append(f'{prefix}: move_down requires a higher proposed rank')
 return errors

def main():
 if len(sys.argv)<2:
  print('Usage: python3 scripts/validate-ranking-change-set.py <change-set.json>'); return 2
 path=Path(sys.argv[1]); data=json.loads(path.read_text(encoding='utf-8')); errors=validate(data)
 if errors:
  print('RANKING CHANGE SET VALIDATION FAILED'); [print(' - '+x) for x in errors]; return 1
 print('RANKING CHANGE SET VALIDATION PASSED')
 print(f" - {len(data.get('decisions',[]))} approved decision(s) are snapshot-linked and structurally valid")
 print(' - Validation does not apply or publish ranking changes')
 return 0
if __name__=='__main__': raise SystemExit(main())
