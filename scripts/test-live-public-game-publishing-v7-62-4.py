#!/usr/bin/env python3
from pathlib import Path
import json, hashlib

ROOT = Path(__file__).resolve().parents[1]

def req(cond, msg):
    if not cond:
        raise SystemExit("PUBLIC GAME PUBLISHING 7.62.4 TEST FAILED\n - " + msg)

site = json.loads((ROOT / "config/site-release.json").read_text())
req(site.get("version") == "7.62.4", "site version must be 7.62.4")
req(site.get("liveScoringPublicGamePublishingRelease") == "7.62.4", "publishing release metadata missing")
req(site.get("liveScoringPublicGameSharingRelease") == "7.62.4", "sharing release metadata missing")
req("7.62.4" in (ROOT / "VERSION.md").read_text(), "VERSION must identify 7.62.4")

for rel in [
    "js/live-public-publishing-v7-62-4.js",
    "css/live-public-publishing-v7-62-4.css",
    "live-game.html",
    "live-score.html",
    "live.html",
]:
    req((ROOT / rel).exists(), f"missing {rel}")

game = (ROOT / "live-game.html").read_text()
score = (ROOT / "live-score.html").read_text()
center = (ROOT / "live.html").read_text()
helper = (ROOT / "js/live-public-publishing-v7-62-4.js").read_text()

req('value="team_private" selected>Team + followers<' in game, "team_private audience label must be clear")
req('value="private_only">Team members only<' in game, "private_only audience label must be clear")
req('value="public_team">Public on WPI Live<' in game, "public_team audience label must be clear")
req('id="visibilityHelp"' in game, "visibility explanation is missing")
req('id="publicGameSharePanel"' in game and 'id="publicGameShareCopy"' in game, "public sharing panel is missing")
req('live-score.html' in helper and 'searchParams.set("game", gameId)' in helper, "share helper must create stable public score link")
req('navigator.clipboard' in helper, "share helper must support copy-to-clipboard")
req('id="publicScoreShareButton"' in score, "public score page must expose copy-link action")
req('Public on WPI Live' in center, "Live Center policy wording must match publishing control")
req("public_team" in helper and "team_private" in helper and "private_only" in helper, "all audience modes must be explained")

# This release is presentation/share-only; protected scorer/backend files must stay byte-stable.
hashes = json.loads((ROOT / "data/live/protected-foundation-hashes-v7-62-1.json").read_text())["files"]
for rel, expected in hashes.items():
    got = hashlib.sha256((ROOT / rel).read_bytes()).hexdigest()
    req(got == expected, f"protected file changed: {rel}")

print("PUBLIC GAME PUBLISHING 7.62.4 TEST PASSED")
print(" - game audience choices use plain-language Team + followers / Team members only / Public on WPI Live")
print(" - public games expose a shareable score-only link without changing scoring authority")
print(" - the public score viewer can copy its own stable game link")
print(" - protected scoring, GroupMe and scorer-authority files remain byte-stable")
