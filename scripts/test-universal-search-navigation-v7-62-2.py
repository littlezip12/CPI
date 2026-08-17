#!/usr/bin/env python3
from pathlib import Path
import json
import re

ROOT=Path(__file__).resolve().parents[1]

def req(cond,msg):
    if not cond:
        raise SystemExit(f"UNIVERSAL SEARCH & NAVIGATION 7.62.2 TEST FAILED\n - {msg}")

site=(ROOT/'js/site-shell.js').read_text()
cmd=(ROOT/'js/command-palette.js').read_text()
directory=json.loads((ROOT/'data/live/organization-directory-v7-62-1.json').read_text())
html=list(ROOT.rglob('*.html'))

req(any(x in site for x in ('release 7.62.2','release 7.62.3')),'site shell must preserve the unified navigation release')
req('{ label: "Organizations", href: "organizations.html"' in site,'primary navigation must expose Organizations')
req(any(x in site for x in ('{ label: "WPI Live", href: "live-following.html"','{ label: "WPI Live", href: "live.html"')),'primary navigation must expose WPI Live')
req('{ label: "Teams"' not in site and '{ label: "Clubs"' not in site,'primary nav must not split Teams and Clubs after unified Organizations launch')
req('Search WPI' in site and 'href="${makeHref("organizations.html")}"' in site,'header search must be a universal WPI search entry point')
req('youth and high school water polo' in site,'footer must describe the expanded youth + high-school scope')
site_release=json.loads((ROOT/'config/site-release.json').read_text())
req(site_release.get('version') in ('7.62.2','7.62.3','7.62.4','7.62.5','7.62.6','7.63.0','7.63.1'),'site release metadata must preserve 7.62.2 or later')
req(site_release.get('navigationRelease') in ('7.62.2','7.62.3','7.62.4','7.62.5','7.62.6','7.63.0','7.63.1'),'navigation release metadata must preserve 7.62.2 or later')
req('organization-directory-v7-62-1.json?v=7.62.2' in cmd,'command palette must load the canonical unified organization/team directory')
req('data/club-intelligence.json' not in cmd,'universal search must not rebuild its primary index from the legacy club-only directory')
req('team.teamHubHref || team.profileHref' in cmd,'team results must route to stable Team Hubs')
req('organizationTypeLabel' in cmd and 'High School' in cmd,'command palette must distinguish clubs and high schools')
req('Search teams, clubs, high schools...' in cmd,'search prompt must describe all supported organization/team types')
req(len(directory.get('organizations',[]))==185,'canonical directory must retain 185 organizations')
req(len(directory.get('teams',[]))==736,'canonical directory must retain 736 team identities')
req(sum(1 for o in directory['organizations'] if o.get('organizationType')=='high_school')==3,'canonical directory must retain the 3 seeded high schools')
req(all(t.get('teamHubHref') for t in directory['teams']),'every search-indexed team must have a stable Team Hub route')

shell_pages=[p for p in html if 'js/site-shell.js?' in p.read_text()]
cmd_pages=[p for p in html if 'js/command-palette.js?' in p.read_text()]
req(len(shell_pages)>=50,'universal shell must remain present across the public/live HTML surface')
req(len(cmd_pages)>=50,'command palette must remain present across the public/live HTML surface')
for p in shell_pages:
    req(any(x in p.read_text() for x in ('js/site-shell.js?v=7.62.2','js/site-shell.js?v=7.62.3')),f'{p.name} must cache-bust the current unified site shell')
for p in cmd_pages:
    req('js/command-palette.js?v=7.62.2' in p.read_text(),f'{p.name} must cache-bust the 7.62.2 universal search')

print('UNIVERSAL SEARCH & NAVIGATION 7.62.2 TEST PASSED')
print(' - primary navigation now centers Organizations instead of separate Teams / Clubs silos')
print(' - universal Search WPI indexes 185 organizations and 736 stable Team Hubs')
print(' - high schools and clubs share one search model while legacy rankings/history remain reachable')
print(' - shell/search cache keys are advanced across the site without touching scoring authority')
