#!/usr/bin/env python3
from __future__ import annotations

import csv
import importlib.util
import json
import re
import shutil
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ORIGINALS = ROOT / 'assets-original' / 'logos'
CANONICAL = ROOT / 'assets' / 'logos' / 'canonical'
FALLBACK = 'assets/logos/cpi-logo-fallback.svg'
RELEASE = '7.52.7'

DIRECT_SLUGS = {
    '808','a-team-called-quest','a-town','albuquerque','aquatex','asa','bainbridge',
    'barcelona-lions','brooklyn-hustle','capital','chargers','chicago-park',
    'cincinnati-marlins','colorado','dart','elmhurst','great-lakes-aquatics',
    'hilo-hammahz','kearns','lokahi','longhorn','lyons-aquatics','mesa',
    'miami-riptides','moose','narrows','navy','nc-select','new-trier','newberg',
    'nipc','north-idaho','nwc','oahu','ohana','pacific-valley-premier','park-city',
    'placer','princeton','puget-sound','punahou','rain-city','rise','sacramento','san-diego-shores',
    'san-jose-almaden','slap','south-valley','southside','surf-city','swift',
    't-hills','team-vegas','third-coast','topaz-tsunami','turul','viper-pigeon',
    'visalia-united','west-valley','wildkit','wolverine'
}

SHARED_ARTWORK = {
    'lamorinda-brentwood': 'lamorinda',
    'vnited': 'visalia-united',
    'vegas-patriot': 'team-vegas',
    'hilo-grammaz': 'hilo-hammahz',
}

REMAINING_GENERIC = {'99-alliance','atherton','atwater','hawaiian-islands','ypro'}


def load_builder():
    path = ROOT / 'scripts' / 'build-logos.py'
    spec = importlib.util.spec_from_file_location('wpi_build_logos', path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


def find_original(slug: str) -> Path:
    matches = sorted(p for p in ORIGINALS.glob(slug + '.*') if p.suffix.lower() in {'.png','.jpg','.jpeg','.webp','.avif','.bmp','.tif','.tiff'})
    if not matches:
        raise FileNotFoundError(f'missing original for {slug}')
    return matches[-1]


def normalize_fast(builder, src, out):
    img = Image.open(src)
    img = ImageOps.exif_transpose(img).convert('RGBA')
    img = builder.remove_simple_white_background(img)
    img = builder.trim_transparency(img)
    max_dim = builder.CANVAS_SIZE - (builder.PADDING * 2)
    scale = min(max_dim / img.width, max_dim / img.height)
    size = (max(1, int(img.width * scale)), max(1, int(img.height * scale)))
    img = img.resize(size, Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (builder.CANVAS_SIZE, builder.CANVAS_SIZE), (255,255,255,0))
    canvas.alpha_composite(img, ((builder.CANVAS_SIZE-size[0])//2, (builder.CANVAS_SIZE-size[1])//2))
    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out, 'WEBP', quality=builder.WEBP_QUALITY, method=3)

def build_assets():
    builder = load_builder()
    CANONICAL.mkdir(parents=True, exist_ok=True)
    built = []
    for slug in sorted(DIRECT_SLUGS):
        src = find_original(slug)
        out = CANONICAL / f'{slug}.webp'
        normalize_fast(builder, src, out)
        built.append(slug)
        print(f'Built {slug}')
    for alias, source in SHARED_ARTWORK.items():
        src = CANONICAL / f'{source}.webp'
        dst = CANONICAL / f'{alias}.webp'
        if not src.exists():
            raise FileNotFoundError(f'missing shared artwork source {source}')
        shutil.copy2(src, dst)
        built.append(alias)
    return sorted(built)


def update_logo_registry(slugs):
    path = ROOT / 'data' / 'logo-registry.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    logos = data.setdefault('logos', {})
    for slug in slugs:
        logos[slug] = f'assets/logos/canonical/{slug}.webp'
    path.write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8')


def update_team(row, target):
    slug = row.get('clubSlug') or str(row.get('canonicalClubId','')).removeprefix('club-')
    if slug in target:
        row['logo'] = f'assets/logos/canonical/{slug}.webp'


def update_club(row, target):
    slug = row.get('slug') or str(row.get('canonicalClubId','')).removeprefix('club-') or str(row.get('id','')).removeprefix('club-')
    if slug in target:
        row['logo'] = f'assets/logos/canonical/{slug}.webp'
        row['logoStatus'] = 'verified_by_user'
    for team in row.get('teams', []) if isinstance(row.get('teams'), list) else []:
        update_team(team, target)
    if isinstance(row.get('topTeam'), dict):
        update_team(row['topTeam'], target)


def update_json_files(target):
    # Ranking rows
    path = ROOT / 'rankings.json'
    rows = json.loads(path.read_text(encoding='utf-8'))
    for row in rows: update_team(row, target)
    path.write_text(json.dumps(rows, indent=2) + '\n', encoding='utf-8')

    # Public and registry club records
    for filename in ['club-registry.json','clubs.json']:
        path = ROOT / filename
        rows = json.loads(path.read_text(encoding='utf-8'))
        for row in rows: update_club(row, target)
        path.write_text(json.dumps(rows, indent=2) + '\n', encoding='utf-8')

    # Club intelligence generated object
    path = ROOT / 'data' / 'club-intelligence.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    collection = data.get('clubs', data)
    if isinstance(collection, dict):
        for slug, row in collection.items():
            if slug in target:
                row['logo'] = f'assets/logos/canonical/{slug}.webp'
    path.write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8')

    # Identity club exports
    path = ROOT / 'data' / 'identity' / 'clubs.json'
    rows = json.loads(path.read_text(encoding='utf-8'))
    for row in rows: update_club(row, target)
    path.write_text(json.dumps(rows, indent=2) + '\n', encoding='utf-8')

    path = ROOT / 'data' / 'identity' / 'index.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    for row in data.get('clubs', {}).values(): update_club(row, target)
    path.write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8')

    # Identity browser runtime
    path = ROOT / 'data' / 'identity' / 'runtime.js'
    raw = path.read_text(encoding='utf-8').strip()
    prefix = 'window.CPI_IDENTITY_RUNTIME='
    if raw.startswith(prefix) and raw.endswith(';'):
        payload = json.loads(raw[len(prefix):-1])
        for row in payload.get('clubs', {}).values(): update_club(row, target)
        path.write_text(prefix + json.dumps(payload, separators=(',', ':')) + ';\n', encoding='utf-8')


def update_data_js(target):
    path = ROOT / 'data.js'
    lines = path.read_text(encoding='utf-8').splitlines()
    out = []
    for line in lines:
        match = re.match(r'window\.(CPI_[A-Z_]+) = (.*);$', line)
        if not match:
            out.append(line)
            continue
        name, raw = match.groups()
        data = json.loads(raw)
        if name == 'CPI_RANKINGS':
            for row in data: update_team(row, target)
        elif name == 'CPI_CLUBS':
            for row in data: update_club(row, target)
        elif name == 'CPI_PLATFORM':
            data.setdefault('brandingStatus', {})['verifiedLogoCount'] = 136
            data['brandingStatus']['clubCount'] = 183
            logo_system = data.setdefault('rankingDataReadiness', {}).setdefault('logoSystem', {})
            logo_system['convertedVerifiedLogos'] = 136
            logo_system['placeholderLogosNeedingSource'] = 47
            logo_system['status'] = '136 user-verified club logos normalized; 42 provisional artworks and 5 generic fallbacks remain'
        out.append(f'window.{name} = {json.dumps(data, separators=(",", ":"))};')
    path.write_text('\n'.join(out) + '\n', encoding='utf-8')


def update_csv(target):
    path = ROOT / 'club-registry.csv'
    with path.open(newline='', encoding='utf-8') as f:
        rows = list(csv.DictReader(f)); fields = list(rows[0].keys())
    for row in rows:
        if row.get('slug') in target:
            row['logo'] = f"assets/logos/canonical/{row['slug']}.webp"
            row['logoStatus'] = 'verified_by_user'
    with path.open('w', newline='', encoding='utf-8') as f:
        w=csv.DictWriter(f, fieldnames=fields); w.writeheader(); w.writerows(rows)

    path = ROOT / 'logo_map.csv'
    with path.open(newline='', encoding='utf-8') as f:
        rows = list(csv.DictReader(f)); fields = list(rows[0].keys())
    by_club = {row['club']: row for row in rows}
    registry = json.loads((ROOT/'club-registry.json').read_text(encoding='utf-8'))
    for club in registry:
        if club['slug'] not in target: continue
        row = by_club.get(club['club'])
        payload = {
            'club': club['club'],
            'logo_file': club['logo'],
            'status': 'canonical_webp',
            'primary': club.get('primaryColor',''),
            'secondary': club.get('secondaryColor',''),
            'region': club.get('region',''),
        }
        if row: row.update(payload)
        else: rows.append(payload); by_club[club['club']] = payload
    rows.sort(key=lambda r: r['club'].lower())
    with path.open('w', newline='', encoding='utf-8') as f:
        w=csv.DictWriter(f, fieldnames=fields); w.writeheader(); w.writerows(rows)


def update_builder_shared_map():
    path = ROOT / 'scripts' / 'build-logos.py'
    text = path.read_text(encoding='utf-8')
    if 'SHARED_ARTWORK = {' not in text:
        marker = 'ALIASES = {'
        idx = text.index(marker)
        # insert before aliases
        block = "SHARED_ARTWORK = {\n" + ''.join(f'    "{a}": "{s}",\n' for a,s in SHARED_ARTWORK.items()) + "}\n\n"
        text = text[:idx] + block + text[idx:]
    # Add shared copy phase after source loop and before registry write.
    needle = '    REGISTRY.write_text(json.dumps(registry, indent=2), encoding="utf-8")\n'
    if 'Built shared artwork' not in text:
        block = '''    for alias, canonical in SHARED_ARTWORK.items():\n        src = OUTPUT / f"{canonical}.webp"\n        out = OUTPUT / f"{alias}.webp"\n        if src.exists():\n            shutil.copy2(src, out)\n            registry["logos"][alias] = f"assets/logos/canonical/{alias}.webp"\n            print(f"Built shared artwork {out.relative_to(ROOT)} from {canonical}")\n\n'''
        text = text.replace(needle, block + needle)
    path.write_text(text, encoding='utf-8')


def update_site_release():
    path = ROOT / 'config' / 'site-release.json'
    site = json.loads(path.read_text(encoding='utf-8'))
    site.update({
        'version': RELEASE,
        'name': 'JO Results Logos and Journey Links',
        'date': '2026-07-27',
        'notes': 'Adds San Diego Shores artwork, displays club logos in JO results, and links every placement to the team’s completed JO game journey.',
        'logoLibraryRelease': RELEASE,
        'logoDeliveryRelease': RELEASE,
        'clubLogoCompletionRelease': RELEASE,
    })
    path.write_text(json.dumps(site, indent=2) + '\n', encoding='utf-8')


def main():
    update_builder_shared_map()
    built = build_assets()
    target = set(built)
    update_logo_registry(target)
    update_json_files(target)
    update_data_js(target)
    update_csv(target)
    update_site_release()
    print(f'Installed {len(DIRECT_SLUGS)} direct logos and {len(SHARED_ARTWORK)} shared mappings.')
    print('Remaining generic:', ', '.join(sorted(REMAINING_GENERIC)))

if __name__ == '__main__':
    main()
