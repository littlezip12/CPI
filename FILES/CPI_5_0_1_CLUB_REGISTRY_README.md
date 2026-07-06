# CPI Release 5.0.1 — Club Registry Foundation

## What this adds

This release adds the first true CPI Core data model:

- `data/club-registry.json`
- `scripts/build-club-registry.py`
- `scripts/validate-club-registry.py`

The club registry becomes the canonical source of truth for:

- club display name
- slug
- region
- city
- website
- logo
- colors
- verification status

## Install

Copy the contents of `FILES/` into your CPI repo while preserving folder structure.

## Run

```bash
cd ~/Documents/GitHub/CPI

python3 scripts/build-club-registry.py
python3 scripts/validate-club-registry.py
```

If validation passes:

```bash
git add data scripts
git commit -m "Add CPI club registry foundation"
git push
```

## Why this matters

Eventually pages should not hardcode club data. They should ask the registry:

> Tell me about Skip.

The registry returns:

- name
- logo
- colors
- region
- website
- verification status

That makes homepage, rankings, club pages, team pages, and stories easier to maintain.
