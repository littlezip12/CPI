#!/usr/bin/env python3
from __future__ import annotations
import csv, io, json, re, subprocess, sys, time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SHEET_ID='1MnXWw7DZ6SCosPD4wy1SY5g4gNMT8h1fa7zYTuO-BoU'
SHEET='MASTER BY DIVISION'
URL=f'https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet=MASTER%20BY%20DIVISION'
EVENT=ROOT/'data/tournaments/platform/events/2026-evan-cousineau-memorial-cup.json'
DIVISIONS={'10U_BOYS':'10u-boys','10U_COED_PLATINUM_&_SILVER':'10u-coed-platinum','10U_GIRLS_&_COED_GOLD':'10u-girls-coed-gold','12U_BOYS_GOLD':'12u-boys-gold','12U_BOYS_PLATINUM':'12u-boys-platinum','12U_COED_&_BOYS_SILVER':'12u-coed-boys-silver','12U_GIRLS':'12u-girls','14U_BOYS_GOLD':'14u-boys-gold','14U_BOYS_PLATINUM':'14u-boys-platinum','14U_COED_&_BOYS_SILVER':'14u-coed-boys-silver','14U_GIRLS_GOLD':'14u-girls-gold','14U_GIRLS_PLATINUM':'14u-girls-platinum','HS_GIRLS':'hs-girls'}
def norm(v:str)->str:
    key=re.sub(r'[^A-Za-z0-9]','',str(v)).upper()
    if key.startswith('10CPTAG'): key='10CPT'+key[len('10CPTAG'):]
    return key
def main()->int:
    completed=subprocess.run(['curl','--fail','--location','--silent','--show-error','--connect-timeout','5','--max-time','20',f'{URL}&_={int(time.time()*1000)}'],capture_output=True)
    if completed.returncode:
        print('WPHQ 7.64.42 ECC GOOGLE SOURCE FAILED:',completed.stderr.decode(errors='replace').strip() or f'curl exited {completed.returncode}')
        return 1
    text=completed.stdout.decode('utf-8-sig',errors='replace')
    if '<html' in text[:1500].lower() or 'accounts.google.com' in text[:2500].lower():
        print('WPHQ 7.64.42 ECC GOOGLE SOURCE FAILED: Google returned HTML/login instead of CSV');return 1
    rows=list(csv.reader(io.StringIO(text)))
    if not rows or rows[0][:10]!=['DATE','TIME','LOCATION','GAME ID','WHITE TEAM','S','DARK TEAM','S','COMMENTS','DIVISION']:
        print('WPHQ 7.64.42 ECC GOOGLE SOURCE FAILED: unexpected master-sheet header');return 1
    live=[r for r in rows[1:] if len(r)>9 and r[3].strip()]
    bundle=json.loads(EVENT.read_text())
    baseline={norm(g['gameNumber']):g for g in bundle['games']}
    seen={}
    finals=0
    for row in live:
        key=norm(row[3]); seen[key]=row
        if key not in baseline:
            print('WPHQ 7.64.42 ECC GOOGLE SOURCE FAILED: unknown game ID',row[3]);return 1
        div=DIVISIONS.get(row[9].strip())
        if div!=baseline[key]['divisionId']:
            print('WPHQ 7.64.42 ECC GOOGLE SOURCE FAILED: division mismatch',row[3],row[9]);return 1
        try:
            if row[5].strip() and row[7].strip() and float(row[5])!=float(row[7]): finals+=1
        except ValueError: pass
    missing=sorted(set(baseline)-set(seen));extra=sorted(set(seen)-set(baseline))
    if len(live)!=335 or missing or extra:
        print(f'WPHQ 7.64.42 ECC GOOGLE SOURCE FAILED: games={len(live)} missing={missing[:8]} extra={extra[:8]}');return 1
    if len({r[9].strip() for r in live})!=13:
        print('WPHQ 7.64.42 ECC GOOGLE SOURCE FAILED: expected 13 divisions');return 1
    print('WPHQ 7.64.42 ECC GOOGLE SOURCE PASSED')
    print('- 335/335 stable game IDs')
    print('- 13/13 divisions')
    print(f'- {finals} official results currently posted')
    print('- anonymous Google CSV access works')
    return 0
if __name__=='__main__':sys.exit(main())
