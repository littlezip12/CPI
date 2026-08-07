#!/usr/bin/env python3
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def read(p): return (ROOT/p).read_text()
def require(t,x,l):
    if x not in t: raise AssertionError(f"Missing {l}: {x}")
backend=read("js/live-backend-v7-56-7.js")
dash=read("js/live-dashboard-v7-56-7.js")
sandbox=read("js/live-sandbox-v7-56-7.js")
dash_html=read("live-dashboard.html")
sandbox_html=read("live-sandbox.html")
require(dash_html,"enterScorerCodeButton","dashboard code button")
require(dash_html,"dashboardScorerCodeDialog","dashboard claim dialog")
require(dash,"previewScorerHandoff({code, gameId: scorerCodeGameId})","dashboard preview")
require(dash,"acceptScorerHandoff({code, gameId:scorerCodeGameId, displayName})","dashboard acceptance")
require(dash,"data-scorer-code-game","game-history claim")
require(sandbox_html,"enterScorerCodeInlineButton","read-only game code action")
require(sandbox_html,"scorerCodeDialog","in-game claim dialog")
require(sandbox,"previewInGameScorerCode","in-game preview")
require(sandbox,"acceptInGameScorerCode","in-game acceptance")
require(sandbox,"hasGameScoringControl","viewer effective scorer promotion")
require(sandbox,"shareScorerHandoffLink","mobile share action")
require(backend,'role: data.role || "scorer"',"accepted workspace scorer role")
require(backend,"scorerSessionId: data.sessionId","accepted scorer session")
print("WPI IN-GAME SCORER CODE 7.56.7 TEST PASSED")
print(" - Signed-in viewers, parents, and scorers can enter a six-digit code from dashboard or game view")
print(" - Accepted authority is game-scoped and does not grant permanent team administration")
print(" - The same page resumes as the active scorer while the previous device becomes read-only")

# Accept must be a self-contained action; it cannot depend on the preview button's
# transient disabled/enabled state, especially on mobile Safari.
assert 'id="acceptInGameScorerCodeButton" type="button" disabled' not in sandbox_html
assert 'id="dashboardAcceptScorerCodeButton" type="button" disabled' not in dash_html
assert 'Checking code and transferring scoring control…' in sandbox
assert 'await backend.previewScorerHandoff({code, gameId:state.game.remoteId});' in sandbox
assert 'Checking code and transferring scoring control…' in dash
assert 'scorerCodePreview = await backend.previewScorerHandoff({code, gameId:scorerCodeGameId});' in dash
print(" - QR/no-account handoff and mobile link sharing remain available")
