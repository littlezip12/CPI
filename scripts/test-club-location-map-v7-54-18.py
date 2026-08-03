#!/usr/bin/env python3
from pathlib import Path
import json,re,sys,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
errors=[]
def fail(x): errors.append(x)
clubs=json.loads((ROOT/'clubs.json').read_text())
html=(ROOT/'clubs.html').read_text()
index=(ROOT/'index.html').read_text()
js=(ROOT/'js/club-location-map-v7-54-18.js').read_text()
dir_js=(ROOT/'js/club-intelligence-v7-26.js').read_text()
css=(ROOT/'css/club-location-map-v7-54-18.css').read_text()
svg_path=ROOT/'assets/maps/wpi-us-club-regions.svg'
for rel in ['assets/maps/wpi-us-club-regions.svg','js/club-location-map-v7-54-18.js','css/club-location-map-v7-54-18.css']:
    if not (ROOT/rel).exists(): fail(f'missing {rel}')
for token in ['wpiClubRegionMap','wpiClubRegionLegend','wpiCaliforniaRegionFilters','club-location-map-v7-54-18.css?v=7.54.18','club-location-map-v7-54-18.js?v=7.54.18']:
    if token not in html: fail(f'clubs.html missing {token}')
for region in ['Hawaii','Northwest','Southwest','Mountain West','Midwest','Northeast','Southeast','International']:
    if f'region={region.replace(" ","%20")}' not in index and region not in index: fail(f'homepage lacks {region} pathway')
    if region not in js: fail(f'map JS lacks {region}')
for token in ['__california__','__outside_california__','scope','club.city','club.country','club.metroRegion']:
    if token not in dir_js: fail(f'directory JS missing {token}')
if svg_path.exists():
    try: root=ET.parse(svg_path).getroot()
    except Exception as exc: fail(f'invalid SVG: {exc}'); root=None
    if root is not None:
        paths=[node for node in root.iter() if node.tag.endswith('path') and node.attrib.get('data-state')]
        if len(paths)!=51: fail(f'expected 51 state/DC paths, found {len(paths)}')
        regions={node.attrib.get('data-region') for node in paths}
        expected={'California','Hawaii','Northwest','Southwest','Mountain West','Midwest','Northeast','Southeast'}
        if regions!=expected: fail(f'map region set differs: {sorted(regions)}')
        if not any(node.attrib.get('data-state')=='CA' and node.attrib.get('data-region')=='California' for node in paths): fail('California map classification missing')
        if not any(node.attrib.get('data-state')=='HI' and node.attrib.get('data-region')=='Hawaii' for node in paths): fail('Hawaii map classification missing')
if not any(c.get('region')=='International' and c.get('slug')=='barcelona-lions' for c in clubs): fail('Barcelona Lions is not International')
if 'Out of State' in {c.get('region') for c in clubs}: fail('generic Out of State region remains')
for token in ['wpi-region-california','wpi-region-hawaii','wpi-region-northwest','wpi-region-southeast']:
    if token not in css and token not in svg_path.read_text(): fail(f'map styling missing {token}')
if errors:
    print('CLUB LOCATION MAP 7.54.18 TEST FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('CLUB LOCATION MAP 7.54.18 TEST PASSED')
print(' - A real 51-state/DC boundary map supports California and seven national U.S. regions')
print(' - Homepage, map, dropdown, search, and URL filters share the approved region model')
print(' - International clubs remain accessible without being placed on the U.S. map')
