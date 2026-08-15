#!/usr/bin/env python3
from pathlib import Path
import json, re
ROOT=Path(__file__).resolve().parents[1]
TEAM_PATH=ROOT/'data/identity/teams.json'
CLUB_PATH=ROOT/'data/identity/clubs.json'
ALIASES_PATH=ROOT/'data/identity/aliases.json'
OUT=ROOT/'data/live/team-identity-directory-v7-60-2.json'

def norm(v):
    return re.sub(r'[^a-z0-9]+','-',str(v or '').lower()).strip('-')

def family_key(team):
    level=(team.get('level') or team.get('squadDescriptor') or 'A').strip()
    if level.lower() in {'primary','primary/a-level'}: level='A'
    return '|'.join([team.get('clubId',''),team.get('ageGroup',''),team.get('gender',''),level.upper()])

teams=json.loads(TEAM_PATH.read_text())
clubs=json.loads(CLUB_PATH.read_text())
aliasdoc=json.loads(ALIASES_PATH.read_text())
team_aliases={}
for row in aliasdoc.get('teamAliases',[]):
    team_aliases.setdefault(row.get('entityId'),[]).append(row.get('alias'))
club_by_id={c['id']:c for c in clubs}
rows=[]
for t in teams:
    club=club_by_id.get(t.get('clubId'),{})
    aliases=[]
    for a in [t.get('name'),t.get('slug'),*(team_aliases.get(t.get('id'),[]))]:
        if a and a not in aliases: aliases.append(a)
    rows.append({
        'canonicalTeamId':t.get('id'),
        'familyKey':family_key(t),
        'season':t.get('season'),
        'group':t.get('group'),
        'ageGroup':t.get('ageGroup'),
        'gender':t.get('gender'),
        'teamName':t.get('name'),
        'teamSlug':t.get('slug'),
        'level':t.get('level'),
        'squadDescriptor':t.get('squadDescriptor'),
        'clubId':t.get('clubId'),
        'clubSlug':t.get('clubSlug'),
        'clubName':t.get('displayClubName') or t.get('clubName'),
        'logo':club.get('logo'),
        'primaryColor':club.get('primaryColor'),
        'secondaryColor':club.get('secondaryColor'),
        'aliases':aliases,
        'profileHref':t.get('legacyTeamPage')
    })
rows.sort(key=lambda r:(r['clubName'] or '', int(re.sub(r'\D','',r['ageGroup'] or '999') or 999), r['gender'] or '', r['level'] or '', r['teamName'] or ''))
club_rows=[]
for c in clubs:
    club_rows.append({
        'clubId':c.get('id'),'slug':c.get('slug'),'name':c.get('displayName') or c.get('name'),
        'shortName':c.get('name'),'logo':c.get('logo'),'primaryColor':c.get('primaryColor'),'secondaryColor':c.get('secondaryColor')
    })
family_count=len({r['familyKey'] for r in rows})
out={
    'schemaVersion':1,
    'release':'7.60.2',
    'sourceRelease':'7.40.0',
    'policy':'stable_family_key_plus_season_specific_team_id',
    'notes':'Public WPI team identities remain season-specific. familyKey provides a stable club/age/gender/squad bridge for WPI Live without pretending a prior-season public team ID is the current-season team.',
    'counts':{'clubs':len(club_rows),'teams':len(rows),'families':family_count},
    'clubs':club_rows,
    'teams':rows
}
OUT.write_text(json.dumps(out,indent=2)+"\n")
print(f'Wrote {OUT.relative_to(ROOT)}: {len(club_rows)} clubs, {len(rows)} teams, {family_count} families')
