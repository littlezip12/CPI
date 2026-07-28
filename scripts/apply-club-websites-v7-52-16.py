#!/usr/bin/env python3
from __future__ import annotations
import csv, json, re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
RELEASE='7.52.16'
DATE='2026-07-28'
SUBMISSIONS='data/club-website-submissions-7.52.16.json'

def load(rel): return json.loads((ROOT/rel).read_text(encoding='utf-8'))
def write(rel,obj):
    p=ROOT/rel; p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(obj,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')

def normalize_submission(rows):
    by={r['slug']:dict(r) for r in rows}
    # User explicitly said Hilo Hammahz uses the same link as the other Hilo entry.
    shared=by['hilo-grammaz']['submission'].strip()
    by['hilo-hammahz']['submission']=shared
    by['hilo-hammahz']['sharedFrom']='hilo-grammaz'
    return by

def website_meta(item):
    value=str(item.get('submission') or '').strip()
    low=value.lower()
    if low=='no site':
        return {'website':'','websiteStatus':'no_site_found','websiteUpdatedAt':DATE,'websiteSource':'User-provided club website audit','websiteReviewNote':'User reported no website found.'}
    if value.startswith('http://') or value.startswith('https://'):
        return {'website':value,'websiteStatus':'user_supplied','websiteUpdatedAt':DATE,'websiteSource':'User-provided club website audit','websiteReviewNote':''}
    return {'website':'','websiteStatus':'missing','websiteUpdatedAt':DATE,'websiteSource':'User-provided club website audit','websiteReviewNote':'No website URL was supplied.'}

def apply_fields(row,meta):
    row.update(meta)
    if not meta.get('websiteReviewNote'): row.pop('websiteReviewNote',None)
    row.pop('websiteVerifiedAt',None)

def main():
    subs=normalize_submission(load(SUBMISSIONS))
    clubs=load('clubs.json'); rankings=load('rankings.json')
    by={c['slug']:c for c in clubs}
    missing_slugs=sorted(set(subs)-set(by))
    if missing_slugs: raise SystemExit(f'Unknown club slugs in submission: {missing_slugs}')
    for slug,item in subs.items():
        meta=website_meta(item); club=by[slug]; apply_fields(club,meta)
        for team in club.get('teams',[]): apply_fields(team,meta)
        if isinstance(club.get('topTeam'),dict): apply_fields(club['topTeam'],meta)
    for row in rankings:
        club=by.get(row.get('clubSlug'))
        if club:
            meta={k:club.get(k,'') for k in ['website','websiteStatus','websiteUpdatedAt','websiteSource','websiteReviewNote']}
            apply_fields(row,meta)
    write('clubs.json',clubs); write('club-registry.json',clubs); write('rankings.json',rankings)

    # Durable manual overrides so future identity rebuilds retain the links/statuses.
    overrides=load('config/identity-manual-overrides.json')
    profiles=overrides.setdefault('clubProfileOverrides',{})
    for slug,item in subs.items():
        profiles.setdefault(f'club-{slug}',{}).update(website_meta(item))
    write('config/identity-manual-overrides.json',overrides)

    # Builder support for user-supplied timestamp and neutral public label.
    p=ROOT/'scripts/build-identity-registry.py'; text=p.read_text(encoding='utf-8')
    needle='            "websiteVerifiedAt": profile_override.get("websiteVerifiedAt") or preferred.get("websiteVerifiedAt") or "",\n'
    if '"websiteUpdatedAt": profile_override.get("websiteUpdatedAt")' not in text:
        text=text.replace(needle,needle+'            "websiteUpdatedAt": profile_override.get("websiteUpdatedAt") or preferred.get("websiteUpdatedAt") or "",\n')
    p.write_text(text,encoding='utf-8')
    p=ROOT/'scripts/build-club-pages.py'; text=p.read_text(encoding='utf-8')
    text=text.replace('Official Club Website</a>', 'Club Website</a>')
    for needle in [
        '            "websiteVerifiedAt": reg.get("websiteVerifiedAt") or top.get("websiteVerifiedAt") or "",\n',
        '                "websiteVerifiedAt": reg.get("websiteVerifiedAt") or "",\n']:
        if needle in text and 'websiteUpdatedAt' not in text[text.index(needle):text.index(needle)+180]:
            indent=needle.split('"')[0]
            text=text.replace(needle,needle+indent+'"websiteUpdatedAt": reg.get("websiteUpdatedAt") or '+('top.get("websiteUpdatedAt") or ' if 'top.get' in needle else '')+'"",\n')
    p.write_text(text,encoding='utf-8')

    # Rebuild canonical identity and static club pages from the durable source.
    import subprocess
    subprocess.run(['python3','scripts/build-identity-registry.py'],cwd=ROOT,check=True)
    subprocess.run(['python3','scripts/build-club-pages.py'],cwd=ROOT,check=True)

    # Re-sync public website metadata after deterministic rebuild.
    clubs=load('clubs.json'); rankings=load('rankings.json'); by={c['slug']:c for c in clubs}
    for slug,item in subs.items():
        meta=website_meta(item); apply_fields(by[slug],meta)
        for team in by[slug].get('teams',[]): apply_fields(team,meta)
        if isinstance(by[slug].get('topTeam'),dict): apply_fields(by[slug]['topTeam'],meta)
    for row in rankings:
        c=by.get(row.get('clubSlug'))
        if c: apply_fields(row,{k:c.get(k,'') for k in ['website','websiteStatus','websiteUpdatedAt','websiteSource','websiteReviewNote']})
    write('clubs.json',clubs); write('club-registry.json',clubs); write('rankings.json',rankings)

    # Canonical identity outputs.
    identity=load('data/identity/clubs.json'); id_by={c['slug']:c for c in identity}
    idx=load('data/identity/index.json')
    for slug,item in subs.items():
        meta=website_meta(item); apply_fields(id_by[slug],meta); apply_fields(idx['clubs'][f'club-{slug}'],meta)
    write('data/identity/clubs.json',identity); write('data/identity/index.json',idx)
    (ROOT/'data/identity/runtime.js').write_text('window.CPI_IDENTITY_RUNTIME='+json.dumps(idx,separators=(',',':'),ensure_ascii=True)+';\n',encoding='utf-8')

    # Club intelligence output and static pages rebuilt once more with final metadata.
    subprocess.run(['python3','scripts/build-club-pages.py'],cwd=ROOT,check=True)

    # Registry CSV.
    fields=['club','displayName','slug','initials','teamCount','bestRank','avgCPI','primaryColor','secondaryColor','website','websiteStatus','websiteVerifiedAt','websiteUpdatedAt','websiteSource','websiteReviewNote','locationLabel','city','state','country','region','metroRegion','macroRegion','locationConfidence','locationSource','logo','logoStatus','clubPage','identityStatus','canonicalClubId']
    with (ROOT/'club-registry.csv').open('w',encoding='utf-8',newline='') as f:
        w=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore'); w.writeheader(); w.writerows(clubs)

    # Browser exports and coverage metadata.
    path=ROOT/'data.js'; out=[]
    for line in path.read_text(encoding='utf-8').splitlines():
        if line.startswith('window.CPI_PLATFORM = '):
            payload=json.loads(line[len('window.CPI_PLATFORM = '):-1]); payload['release']=RELEASE
            present=sum(bool(str(c.get('website') or '').strip()) for c in clubs)
            payload['clubWebsiteCoverage']={'release':RELEASE,'totalClubs':len(clubs),'websitePresent':present,'userSupplied':sum(c.get('websiteStatus')=='user_supplied' for c in clubs),'noSiteFound':sum(c.get('websiteStatus')=='no_site_found' for c in clubs),'missing':sum(c.get('websiteStatus')=='missing' for c in clubs),'audit':'data/club-website-audit-7.52.16.json'}
            line='window.CPI_PLATFORM = '+json.dumps(payload,separators=(',',':'),ensure_ascii=True)+';'
        elif line.startswith('window.CPI_RANKINGS = '): line='window.CPI_RANKINGS = '+json.dumps(rankings,separators=(',',':'),ensure_ascii=True)+';'
        elif line.startswith('window.CPI_CLUBS = '): line='window.CPI_CLUBS = '+json.dumps(clubs,separators=(',',':'),ensure_ascii=True)+';'
        out.append(line)
    path.write_text('\n'.join(out)+'\n',encoding='utf-8')

    # Audit artifacts.
    rows=[]
    for c in sorted(clubs,key=lambda x:(x.get('displayName') or x.get('club') or '').lower()):
        rows.append({'slug':c.get('slug'),'club':c.get('displayName') or c.get('club'),'region':c.get('region'),'locationLabel':c.get('locationLabel') or '', 'rankedTeams':c.get('teamCount') or c.get('rankedTeams') or 0,'website':c.get('website') or '','websiteStatus':c.get('websiteStatus') or '','websiteUpdatedAt':c.get('websiteUpdatedAt') or '','websiteSource':c.get('websiteSource') or '','reviewNote':c.get('websiteReviewNote') or ''})
    audit={'schemaVersion':1,'release':RELEASE,'updatedAt':DATE,'summary':{'totalClubs':len(rows),'websitePresent':sum(bool(r['website']) for r in rows),'verifiedOfficial':sum(r['websiteStatus']=='verified_official' for r in rows),'presentUnverified':sum(r['websiteStatus']=='present_unverified' for r in rows),'userSupplied':sum(r['websiteStatus']=='user_supplied' for r in rows),'noSiteFound':sum(r['websiteStatus']=='no_site_found' for r in rows),'missing':sum(r['websiteStatus']=='missing' for r in rows)},'clubs':rows}
    write('data/club-website-audit-7.52.16.json',audit)
    for rel,selection in [('qa/club-website-audit-7.52.16.csv',rows),('qa/club-websites-unresolved-7.52.16.csv',[r for r in rows if r['websiteStatus'] in {'no_site_found','missing'}])]:
        p=ROOT/rel; p.parent.mkdir(parents=True,exist_ok=True)
        with p.open('w',encoding='utf-8',newline='') as f:
            w=csv.DictWriter(f,fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(selection)

    # Cache-bust data only. JO/logo assets remain untouched at 7.52.15.
    for p in ROOT.rglob('*.html'):
        text=p.read_text(encoding='utf-8')
        text=text.replace('data.js?v=7.52.14','data.js?v=7.52.16').replace('data.js?v=7.52.15','data.js?v=7.52.16')
        p.write_text(text,encoding='utf-8')

    site=load('config/site-release.json'); site.update({'version':RELEASE,'name':'Club Website Completion from User Audit','date':DATE,'notes':'Adds user-supplied website links for 135 clubs, records four clubs with no site found and one remaining missing URL, while preserving rankings, club identities, JO placements, team profiles, and all JO logo-delivery assets.','clubWebsiteRelease':RELEASE})
    write('config/site-release.json',site)
    (ROOT/'VERSION.md').write_text('# WPI 7.52.16\n\nClub website completion from the user audit.\n- Adds 135 user-supplied club links.\n- Records four clubs with no site found and one club still missing a URL.\n- Preserves rankings, identities, tournament data, profiles, and JO logo delivery.\n',encoding='utf-8')
    print(json.dumps(audit['summary'],indent=2))

if __name__=='__main__': main()
