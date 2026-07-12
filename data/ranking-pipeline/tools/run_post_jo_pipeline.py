#!/usr/bin/env python3
"""Run the CPI post-JO validation, comparison, and review-packet pipeline."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def tool_dir() -> Path:
    return Path(__file__).resolve().parent


def run_script(script_name: str) -> int:
    script = tool_dir() / script_name
    print(f"\n=== Running {script_name} ===")
    result = subprocess.run([sys.executable, str(script)], check=False)
    if result.returncode != 0:
        print(f"{script_name} failed with exit code {result.returncode}.")
    return result.returncode


def main() -> int:
    steps = [
        "validate_post_jo_intake.py",
        "build_post_jo_comparison.py",
        "generate_post_jo_review_packets.py",
    ]

    for step in steps:
        code = run_script(step)
        if code != 0:
            print("\nPipeline stopped before completing all steps.")
            return code

    print("\nPost-JO pipeline completed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
