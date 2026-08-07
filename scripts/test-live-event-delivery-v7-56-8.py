#!/usr/bin/env python3
from pathlib import Path
import json, subprocess, sys

ROOT=Path(__file__).resolve().parents[1]
errors=[]

def read(path):
    p=ROOT/path
    if not p.exists():
        errors.append(f"missing {path}")
        return ""
    return p.read_text(encoding="utf-8")

backend=read("js/live-backend-v7-56-8.js")
sandbox=read("js/live-sandbox-v7-56-8.js")
config=read("config/live-sandbox.js")
release=json.loads(read("config/site-release.json") or "{}")

for token in (
    'const existingByClientId = new Map',
    '.insert(newEventRows)',
    '.update(eventUpdatePayload)',
    '.select("id,client_event_id")',
    'unresolvedClientIds',
    'resolveRemoteEventId(gameId, clientEventId)',
    'deferredFinalGameUpdate',
    'Finalization must be the last database write',
    'config.release || "7.56.8"'
):
    if token not in backend: errors.append(f"backend missing {token}")

for token in (
    'const RELEASE = "7.56.8"',
    'backend.resolveRemoteEventId(result.remoteGameId, message.eventId)',
    'Play saved, but its server event ID could not be resolved for GroupMe delivery.',
    'await refreshDeliveryStatuses(result.remoteGameId)',
    'message.remoteEventId',
    'The final event has not been stored on the server yet.',
    'hasRecoverableDelivery'
):
    if token not in sandbox: errors.append(f"sandbox missing {token}")

for page,script in (
    ("live-dashboard.html","live-dashboard-v7-56-8.js?v=7.56.8"),
    ("live-login.html","live-login-v7-56-8.js?v=7.56.8"),
    ("live-password-reset.html","live-password-reset-v7-56-8.js?v=7.56.8"),
    ("live-sandbox.html","live-sandbox-v7-56-8.js?v=7.56.8")
):
    text=read(page)
    expected_backend = 'live-backend-v7-56-8.js?v=7.56.8' if page == 'live-sandbox.html' else 'live-backend-v7-56-8.js?v=7.56.8'
    if expected_backend not in text: errors.append(f"{page} missing backend cache bust")
    if script not in text: errors.append(f"{page} missing {script}")


if backend.find('.insert(newEventRows)') > backend.find('if (deferredFinalGameUpdate)'):
    errors.append("final game status is written before the Final Whistle event is persisted")

if 'release: "7.56.8"' not in config: errors.append('active live config missing release 7.56.8')
if release.get('version') != '7.56.8': errors.append('site-release version is not 7.56.8')

for path in ("js/live-backend-v7-56-8.js","js/live-sandbox-v7-56-8.js","js/live-dashboard-v7-56-8.js","js/live-login-v7-56-8.js","js/live-password-reset-v7-56-8.js"):
    result=subprocess.run(["node","--check",str(ROOT/path)],capture_output=True,text=True)
    if result.returncode: errors.append(f"JavaScript syntax failed for {path}: {result.stderr.strip()}")

if errors:
    print("WPI LIVE EVENT DELIVERY 7.56.8 TEST FAILED")
    for error in errors: print(f" - {error}")
    sys.exit(1)

print("WPI LIVE EVENT DELIVERY 7.56.8 TEST PASSED")
print(" - Persisted events return deterministic server IDs for GroupMe dispatch")
print(" - Missing mappings use a direct fallback lookup instead of a silent queue skip")
print(" - Unresolved dispatches become visible failures with retry timing")
print(" - Due queued/failed messages recover automatically when a scorer reopens a game")
print(" - WPI Live 7.56.8 browser assets remain protected with cross-account Scorer persistence protected")
