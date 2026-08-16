#!/usr/bin/env python3
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
clubs=json.loads((ROOT/'data/identity/clubs.json').read_text())
club_teams=json.loads((ROOT/'data/live/team-identity-directory-v7-60-2.json').read_text())['teams']
schools=json.loads((ROOT/'data/live/high-school-directory-v7-61-0.json').read_text())
orgs=[]
for c in clubs:
    orgs.append({
        'organizationId':c['id'],'organizationType':'club','slug':c['slug'],
        'name':c.get('displayName') or c.get('name'),'shortName':c.get('name') or c.get('displayName'),
        'city':c.get('city') or '', 'state':c.get('state') or '', 'country':c.get('country') or '',
        'locationLabel':c.get('locationLabel') or ', '.join(x for x in [c.get('city'),c.get('state')] if x),
        'region':c.get('region') or '', 'logo':c.get('logo') or '',
        'primaryColor':c.get('primaryColor') or '#126DFF','secondaryColor':c.get('secondaryColor') or '#2BD7F3',
        'profileHref':f"organization.html?organization={c['id']}",'legacyProfileHref':c.get('legacyClubPage') or f"club.html?club={c['slug']}"
    })
for s in schools.get('organizations',[]):
    orgs.append({
        'organizationId':s['organizationId'],'organizationType':'high_school','slug':s['slug'],
        'name':s['name'],'shortName':s.get('shortName') or s['name'],'city':s.get('city') or '',
        'state':s.get('state') or '', 'country':'United States',
        'locationLabel':', '.join(x for x in [s.get('city'),s.get('state')] if x),'region':'High School',
        'logo':s.get('logo') or '', 'primaryColor':s.get('colors',{}).get('primary') or '#126DFF',
        'secondaryColor':s.get('colors',{}).get('secondary') or '#2BD7F3',
        'profileHref':f"organization.html?organization={s['organizationId']}",'legacyProfileHref':f"live-high-schools.html?school={s['slug']}"
    })
team_rows=[]
for t in club_teams:
    team_rows.append({
        'familyKey':t['familyKey'],'organizationId':t['clubId'],'organizationType':'club',
        'organizationName':t['clubName'],'teamName':t['teamName'],'ageGroup':t.get('ageGroup'),
        'gender':t.get('gender'),'squadDescriptor':t.get('squadDescriptor') or t.get('level'),
        'group':t.get('group'),'logo':t.get('logo'),'profileHref':t.get('profileHref'),
        'aliases':t.get('aliases',[])
    })
for t in schools.get('teams',[]):
    team_rows.append({
        'familyKey':t['familyKey'],'organizationId':t['organizationId'],'organizationType':'high_school',
        'organizationName':t['organizationName'],'teamName':t['teamName'],'ageGroup':t.get('ageGroup'),
        'gender':t.get('gender'),'squadDescriptor':t.get('squadDescriptor') or t.get('level'),
        'group':'High School','logo':t.get('logo'),
        'profileHref':f"organization.html?organization={t['organizationId']}#teams",'aliases':t.get('aliases',[])
    })
counts={
    'organizations':len(orgs),'clubs':sum(o['organizationType']=='club' for o in orgs),
    'highSchools':sum(o['organizationType']=='high_school' for o in orgs),'teams':len(team_rows),
    'clubTeams':sum(t['organizationType']=='club' for t in team_rows),'highSchoolTeams':sum(t['organizationType']=='high_school' for t in team_rows)
}
payload={'schemaVersion':1,'release':'7.62.0','policy':'unified_organizations_clubs_and_high_schools','counts':counts,
         'organizations':sorted(orgs,key=lambda x:x['name'].lower()),'teams':sorted(team_rows,key=lambda x:(x['organizationName'].lower(),str(x.get('ageGroup') or ''),str(x.get('gender') or ''),str(x.get('squadDescriptor') or '')))}
path=ROOT/'data/live/organization-directory-v7-62-0.json'
path.write_text(json.dumps(payload,indent=2)+"\n")
print(f"Wrote {path.relative_to(ROOT)}: {counts}")
