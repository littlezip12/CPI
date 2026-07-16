#!/usr/bin/env python3
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; errors=[]
p=ROOT/'data/tournaments/ranking-review-engine/index.json'
if not p.exists(): errors.append('Missing ranking-review engine output')
else:
 d=json.loads(p.read_text())
 if d.get('policy','').lower().find('never change automatically')<0: errors.append('Manual-only ranking policy missing')
 if d.get('counts',{}).get('finalGames')!=0: errors.append('Pre-tournament baseline should contain zero final games')
 if d.get('recommendations'): errors.append('Pre-tournament baseline should not recommend ranking movement')
for q in ['ranking-review.html','js/ranking-review-v7-44.js','css/ranking-review-v7-44.css','data/tournaments/ranking-review-engine/runtime.js']:
 if not (ROOT/q).exists(): errors.append(f'Missing {q}')
if errors:
 print('RANKING REVIEW ENGINE VALIDATION FAILED'); [print(' - '+x) for x in errors]; raise SystemExit(1)
print('RANKING REVIEW ENGINE VALIDATION PASSED')
print(' - Zero completed JO games correctly produce zero ranking recommendations')
print(' - Review policy blocks automatic publication')
