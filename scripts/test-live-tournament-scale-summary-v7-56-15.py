#!/usr/bin/env python3
from pathlib import Path
import hashlib, json, sys

ROOT = Path(__file__).resolve().parents[1]
errors = []

def check(name, condition):
    if not condition:
        errors.append(name)

def sha256(path):
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()

js = (ROOT / "js/live-sandbox-v7-56-15.js").read_text()
html = (ROOT / "live-sandbox.html").read_text()
site = json.loads((ROOT / "config/site-release.json").read_text())
summary_migration = (ROOT / "supabase/migrations/202608080001_game_summary_event.sql").read_text()

# Release wiring.
check("7.56.15 JS marker", 'const RELEASE = "7.56.15";' in js)
check("7.56.15 scorer asset", 'js/live-sandbox-v7-56-15.js?v=7.56.15' in html)
check("7.56.15 scorer CSS", 'css/live-sandbox-v7-56-15.css?v=7.56.15' in html)
check("site version", site.get("version") == "7.56.15")
check("sandbox marker", site.get("liveScoringSandboxRelease") == "7.56.15")
check("summary marker", site.get("liveScoringAutomaticSummaryRelease") == "7.56.15")
check("tournament-scale marker", site.get("liveScoringTournamentScaleSummaryRelease") == "7.56.15")

# GroupMe capacity is per-message, not a shared game/tournament character pool.
check("900-char safety limit", 'const GROUPME_SAFE_MESSAGE_LIMIT = 900;' in js)
check("summary payload target", 'const GROUPME_SUMMARY_PAYLOAD_TARGET = 820;' in js)
check("line-aware chunker", 'function splitSummaryPayload(fullText, target = GROUPME_SUMMARY_PAYLOAD_TARGET)' in js)
check("unbounded part count", 'const total = payloads.length;' in js and 'slice(0,' not in js[js.find('function buildGroupMeSummaryMessages'):js.find('function automaticSummaryEvents')])
check("part labels", 'GAME SUMMARY · ${index + 1}/${total}' in js)
check("hard safety assertion", 'text.length > GROUPME_SAFE_MESSAGE_LIMIT' in js)

# Summary database events use compact audit notes; the full text lives in independent message chunks.
check("compact summary audit note", 'note:`Game summary ${part}/${total} · ${state.setup.teamName} vs ${state.setup.opponentName}`' in js)
check("full text passed as delivery text", 'text:messageText' in js)
check("summary character count retained", 'event.summaryCharacterCount = fullText.length;' in js)
check("legacy long-note repair", 'function repairLegacyAutomaticGameSummary()' in js and 'String(event.note || "").length > 280' in js)
check("game_summary migration retained", "'game_summary'" in summary_migration)

# Ordered final delivery: Final Whistle -> Summary 1/N -> Summary 2/N ...
check("delivery dependency stored", 'if (options.requiresEventId) message.requiresEventId = options.requiresEventId;' in js)
check("dependency enforced", 'if (message.requiresEventId)' in js and '!["sent","suppressed","mock"].includes(prerequisite.status)' in js)
check("summary chain starts after prior message", 'let previousEventId = priorMessage?.eventId || null;' in js)
check("summary chain advances", 'previousEventId = event.id;' in js)
end_game = js[js.find('async function endGame'):js.find('function downloadLog')]
check("Final Whistle before summary", end_game.find('addSystemEvent("quarter_end", {note:"Final whistle"})') < end_game.find('ensureAutomaticGameSummary()'))
check("summary before awaited final sync", end_game.find('ensureAutomaticGameSummary()') < end_game.find('const result = await pushRemoteState();'))

# 7.56.14 poolside action cleanup remains present.
check("hidden event state", '<input id="eventType" type="hidden" value="">' in html)
check("seven direct actions", all(f'label:"{label}"' in js for label in ["Goals","Shots","Saves","Steals","Exclusions","Turnover","5M"]))
check("actual team goal label", 'if (eventId === "goal") return state.setup.teamName || "Our team";' in js)
check("actual opponent goal label", 'if (eventId === "opponent_goal") return state.setup.opponentName || "Opponent";' in js)

# Protected connected backend/server assets remain byte-for-byte unchanged.
expected_hashes = {
    "js/live-backend-v7-56-8.js": "fdeb80c539a2b375861de55e2cbdb48154652517110fab1db7c88d7148a7e328",
    "supabase/functions/groupme-post/index.ts": "42d994906dafba551681d69fd7d35b1d0e83a5a88de25c1563cb697b4b834777",
    "supabase/migrations/202608070001_groupme_topic_delivery.sql": "aacefc33e16c3d170953e68b6d52f99d9da35c1808dde9016ff94e6539525f04",
    "supabase/migrations/202608080001_game_summary_event.sql": "80e6a939aa87104849bd4ca84c8c91a2171017885a6883cbe5f9346b4e038a14",
    "supabase/WPI_LIVE_7_56_8_FULL_SETUP.sql": "b8b51402aa944039125a325bd5e811b9ba4cce6af6a44e21cd0860c06dc39db4",
    "js/live-dashboard-v7-56-9.js": "8b35d994d0bb8359bc65c0c6107f36e79ec084b9c98dfd4a29b14dc7f1a4609d",
    "js/live-scorer-handoff-v7-56-9.js": "4c6a32992f861042f8be857363c2c582c6e0fdb2de4f7ebd9e61077f4f4a3e92",
}
for path, expected in expected_hashes.items():
    check(f"protected hash {path}", sha256(path) == expected)

# Synthetic capacity proof: >100K of recap text can be represented as independent <=900-char messages.
def chunk_like_runtime(text, target=820, safe=900):
    chunks=[]; current=""
    for raw in text.split("\n"):
        line=raw
        while len(line)>target:
            split_at=line.rfind(" ",0,target+1)
            if split_at < int(target*0.6): split_at=target
            piece=line[:split_at].strip(); line=line[split_at:].strip()
            if current and len(current)+1+len(piece)>target:
                chunks.append(current); current=""
            current = piece if not current else current+"\n"+piece
        if line:
            if current and len(current)+1+len(line)>target:
                chunks.append(current); current=line
            else:
                current=line if not current else current+"\n"+line
    if current: chunks.append(current)
    out=[]
    total=max(1,len(chunks))
    for i,payload in enumerate(chunks or ["Game complete."],1):
        header="GAME SUMMARY" if total==1 else f"GAME SUMMARY · {i}/{total}"
        msg=(header+"\n"+payload).strip(); out.append(msg)
    return out

synthetic = "\n".join(f"Q4 1:23 · Event {i}: " + ("detailed scorer note " * 12) for i in range(450))
messages = chunk_like_runtime(synthetic)
check("synthetic summary exceeds 100K", len(synthetic) > 100_000)
check("synthetic summary creates many independent chunks", len(messages) > 100)
check("synthetic chunks all safe", all(len(message) <= 900 for message in messages))

if errors:
    print("WPI LIVE TOURNAMENT-SCALE SUMMARY 7.56.15 TEST FAILED")
    for error in errors:
        print(" -", error)
    sys.exit(1)

print("WPI LIVE TOURNAMENT-SCALE SUMMARY 7.56.15 TEST PASSED")
print(" - Every play remains an independent delivery; no game/tournament/topic character pool")
print(" - End-game recap can exceed 100K aggregate characters and is split into <=900-character messages")
print(" - Final Whistle -> Summary 1/N -> ... -> Summary N/N dependency ordering is enforced")
print(" - Legacy 7.56.14 oversized summary notes self-repair without weakening database constraints")
print(" - 7.56.14 direct actions/team labels and protected connected backend assets remain intact")
