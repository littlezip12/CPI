#!/bin/bash
set -e
python3 scripts/build-logos.py
python3 scripts/validate-assets.py
