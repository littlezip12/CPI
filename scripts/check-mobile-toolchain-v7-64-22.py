#!/usr/bin/env python3
from pathlib import Path
import platform
import re
import shutil
import subprocess
import sys


def output(cmd):
    try:
        return subprocess.check_output(cmd, stderr=subprocess.STDOUT, text=True).strip()
    except Exception:
        return ""

node = output(["node", "--version"])
node_match = re.match(r"v(\d+)", node)
node_ok = bool(node_match and int(node_match.group(1)) >= 22)

print("Water Polo HQ mobile toolchain check")
print(f" - OS: {platform.system()} {platform.release()}")
print(f" - Node: {node or 'not found'} {'OK' if node_ok else 'REQUIRES 22+'}")

if platform.system() == "Darwin":
    xcode = output(["xcodebuild", "-version"])
    xcode_ok = bool(re.search(r"Xcode\s+(2[6-9]|[3-9]\d)(?:\.|$)", xcode))
    print(f" - Xcode: {xcode.splitlines()[0] if xcode else 'not found'} {'OK' if xcode_ok else 'REQUIRES 26+'}")
    clt = output(["xcode-select", "-p"])
    print(f" - Xcode command line tools: {clt or 'not configured'}")
else:
    print(" - Xcode: skipped (iOS builds require macOS)")

android_studio = shutil.which("studio") or shutil.which("studio.sh")
print(f" - Android Studio CLI: {android_studio or 'not detected (GUI install may still exist)'}")

if not node_ok:
    sys.exit(1)
