#!/usr/bin/env python3
import json
import subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
errors=[]

def fail(msg): errors.append(msg)

def load(rel):
 p=ROOT/rel
 if not p.exists(): fail(f'Missing {rel}'); return {}
 try:return json.loads(p.read_text(encoding='utf-8'))
 except Exception as exc: fail(f'Invalid JSON in {rel}: {exc}'); return {}

d=load('data/tournaments/ranking-review-engine/index.json')
if d.get('policy','').lower().find('never change automatically')<0: fail('Manual-only ranking policy missing')
counts=d.get('counts',{}); recommendations=d.get('recommendations',[])
if counts.get('teamsWithFinalEvidence')!=len(recommendations): fail('Recommendation count does not match teamsWithFinalEvidence')
if counts.get('finalGames',0)<0: fail('Final-game count cannot be negative')
if counts.get('finalGames',0)==0 and recommendations: fail('Zero final games cannot produce ranking recommendations')
for item in recommendations:
 if item.get('policy')!='manual_review_only': fail(f"Recommendation is not manual-only: {item.get('canonicalTeamId')}")
 if item.get('recommendation',{}).get('direction') not in {'up','down','hold'}: fail(f"Invalid recommendation direction: {item.get('canonicalTeamId')}")
 if not item.get('allResults'): fail(f"Recommendation lacks result evidence: {item.get('canonicalTeamId')}")
for q in ['ranking-review.html','js/ranking-review-v7-44.js','css/ranking-review-v7-44.css','data/tournaments/ranking-review-engine/runtime.js']:
 if not (ROOT/q).exists(): fail(f'Missing {q}')
for script in ['scripts/build-ranking-review.py','scripts/test-ranking-review-engine.py','scripts/validate-ranking-review-engine.py']:
 proc=subprocess.run(['python3','-m','py_compile',str(ROOT/script)],capture_output=True,text=True)
 if proc.returncode: fail(f'Python syntax error in {script}: {proc.stderr.strip()}')
if errors:
 print('RANKING REVIEW ENGINE VALIDATION FAILED'); [print(' - '+x) for x in errors]; raise SystemExit(1)
print('RANKING REVIEW ENGINE VALIDATION PASSED')
print(f" - {counts.get('finalGames',0)} unique final games currently support manual review")
print(f" - {len(recommendations)} team recommendation(s) remain evidence-linked and advisory")
print(' - Review policy blocks automatic publication')
