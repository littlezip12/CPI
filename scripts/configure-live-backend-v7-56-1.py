#!/usr/bin/env python3
"""Safely activate/deactivate WPI Live's browser-safe Supabase configuration."""
from __future__ import annotations
import argparse
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "config" / "live-sandbox.js"


def replace_value(text: str, key: str, value: str) -> str:
    pattern = rf'({re.escape(key)}:\s*)"[^"]*"'
    updated, count = re.subn(pattern, lambda m: f'{m.group(1)}"{value}"', text, count=1)
    if count != 1:
        raise SystemExit(f"Could not update {key} in {CONFIG}")
    return updated


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", help="Supabase project URL, e.g. https://abc.supabase.co")
    parser.add_argument("--publishable-key", help="Browser-safe sb_publishable_... key")
    parser.add_argument("--demo", action="store_true", help="Return to local demo mode")
    args = parser.parse_args()

    text = CONFIG.read_text(encoding="utf-8")
    if args.demo:
        text = replace_value(text, "mode", "demo")
        text = replace_value(text, "supabaseUrl", "")
        text = replace_value(text, "supabasePublishableKey", "")
    else:
        if not args.url or not args.publishable_key:
            raise SystemExit("Provide --url and --publishable-key, or use --demo.")
        if not re.fullmatch(r"https://[a-z0-9-]+\.supabase\.co", args.url.rstrip("/")):
            raise SystemExit("Supabase URL must look like https://PROJECT.supabase.co")
        if not (args.publishable_key.startswith("sb_publishable_") or args.publishable_key.startswith("eyJ")):
            raise SystemExit("Use the browser-safe publishable/anon key, never a secret or service-role key.")
        lowered = args.publishable_key.lower()
        if "secret" in lowered or "service_role" in lowered:
            raise SystemExit("Refusing to write a secret/service-role key into public configuration.")
        text = replace_value(text, "mode", "connected")
        text = replace_value(text, "supabaseUrl", args.url.rstrip("/"))
        text = replace_value(text, "supabasePublishableKey", args.publishable_key)

    CONFIG.write_text(text, encoding="utf-8")
    print(f"Updated {CONFIG.relative_to(ROOT)}")
    print("Run ./release-check before committing.")


if __name__ == "__main__":
    main()
