#!/usr/bin/env python3
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
registry = json.loads((ROOT / 'data/logo-registry.json').read_text(encoding='utf-8'))['logos']
manifest = json.loads((ROOT / 'data/logo-expansion-7.51.1.json').read_text(encoding='utf-8'))
required = (
    set(manifest['sharedIdentityArtwork'])
    | set(manifest['sharedIdentityArtwork'].values())
    | {'berkeley-wpc', 'sj-foundation', 'san-jose-wpf'}
)
errors = []

for slug in sorted(required):
    path = ROOT / 'assets/logos/canonical' / f'{slug}.webp'
    if not path.exists() or path.stat().st_size <= 100:
        errors.append(f'missing/empty {slug}')
        continue
    header = path.read_bytes()[:12]
    if len(header) < 12 or header[:4] != b'RIFF' or header[8:12] != b'WEBP':
        errors.append(f'invalid WebP header {slug}')
    expected = f'assets/logos/canonical/{slug}.webp'
    if registry.get(slug) != expected:
        errors.append(f'registry mismatch {slug}')

for alias, canonical in manifest['sharedIdentityArtwork'].items():
    alias_path = ROOT / 'assets/logos/canonical' / f'{alias}.webp'
    canonical_path = ROOT / 'assets/logos/canonical' / f'{canonical}.webp'
    if alias_path.exists() and canonical_path.exists() and alias_path.read_bytes() != canonical_path.read_bytes():
        errors.append(f'shared artwork differs: {alias}/{canonical}')

if errors:
    print('LOGO EXPANSION 7.51.1 TESTS FAILED')
    for error in errors:
        print(' -', error)
    sys.exit(1)

print('LOGO EXPANSION 7.51.1 TESTS PASSED')
print(f' - {len(required)} required canonical/legacy paths validated')
print(f" - {len(manifest['sharedIdentityArtwork'])} shared identity mappings are byte-identical")
