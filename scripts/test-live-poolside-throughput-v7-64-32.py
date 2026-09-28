from pathlib import Path
import hashlib, json, re
ROOT=Path(__file__).resolve().parents[1]

def req(cond,msg):
    if not cond: raise AssertionError(msg)
def read(rel): return (ROOT/rel).read_text()
def sha(rel): return hashlib.sha256((ROOT/rel).read_bytes()).hexdigest()

def function_block(text, start_marker, end_marker):
    start=text.index(start_marker)
    end=text.index(end_marker,start)
    return text[start:end]

site=json.loads(read('config/site-release.json'))
def ver(value): return tuple(int(x) for x in str(value).split('.'))
req(ver(site.get('version','0.0.0'))>=ver('7.64.32'),'site release must be 7.64.32 or a validated successor')
for key in ('livePoolsideScoringThroughputRelease','liveScoringDraftIsolationRelease','liveScoringEntryRecoveryRelease','liveScoringDuplicateProtectionRelease','liveScoringMobileZoomPolishRelease'):
    req(site.get(key)=='7.64.32',f'{key} metadata missing')

html=read('live-game.html')
scorer=read('js/live-game-v7-64-32.js')
quick=read('js/live-quick-time-pad-v7-64-32.js')
css=read('css/live-poolside-throughput-v7-64-32.css')

req('js/live-backend-v7-64-31.js?v=7.64.31' in html,'7.64.31 backend must remain active')
req('js/live-game-v7-64-32.js?v=7.64.32' in html,'7.64.32 scorer must be active')
req('js/live-quick-time-pad-v7-64-32.js?v=7.64.32' in html,'7.64.32 Quick Time must be active')
req('css/live-poolside-throughput-v7-64-32.css?v=7.64.32' in html,'7.64.32 throughput CSS missing')
req('id="eventDraftActions"' in html and 'id="eventBackButton"' in html and 'id="eventCancelButton"' in html,'Back/Cancel scorer controls missing')

# 7.64.31 server reliability layer must remain byte-stable.
for rel,expected in {
  'js/live-backend-v7-64-31.js':'ab8f2608be5e147cf7a03424fc469857b285e57785541fd52c196d531f47100f',
  'supabase/functions/groupme-post-v7-64-31/index.ts':'bdd973e9683c13e6ec470c5309b6eb81d321a4fbc1f52bcad9cc4d3b40e80bb7',
  'supabase/migrations/202609260001_live_delivery_finalization_reliability.sql':'66afd1a955096f8d50ef41b3c205348d738e622e96479640a3d1455b97fd7748',
}.items():
    req(sha(rel)==expected,f'7.64.31 reliability asset changed unexpectedly: {rel}')

# Final Whistle implementation is inherited exactly from the validated 7.64.31 scorer.
old_scorer=read('js/live-game-v7-64-31.js')
old_final=function_block(old_scorer,'  async function endGame(', '  async function refreshReopenEligibility')
new_final=function_block(scorer,'  async function endGame(', '  async function refreshReopenEligibility')
req(old_final==new_final,'Final Whistle logic changed during throughput work')
old_flush=function_block(old_scorer,'  async function flushGameDelivery(', '  function deliveryIsDue')
new_flush=function_block(scorer,'  async function flushGameDelivery(', '  function deliveryIsDue')
req(old_flush==new_flush,'7.64.31 GroupMe catch-up helper changed during throughput work')

# Draft isolation: realtime echoes cannot replace in-progress scorer UI.
for marker in ('let eventDraftActive = false;','let pendingRemoteUpdate = null;','function scoringDraftLocked()','function handleRemoteGameUpdate(','if (scoringDraftLocked())','pendingRemoteUpdate = {remoteState, remoteRow, gameId}'):
    req(marker in scorer,f'draft-isolation marker missing: {marker}')
req(scorer.count('handleRemoteGameUpdate(remoteState, remoteRow') >= 2,'both connected realtime subscription paths must use draft-safe handler')
req('syncClockFromInput(true, {persist:false})' in scorer,'event commit must not autosave clock before play commit')

# Recovery + duplicate protection.
req('function backEventDraft()' in scorer and 'function cancelEventDraft()' in scorer,'Back/Cancel draft recovery missing')
req('window.WPHQLiveScoringDraft' in scorer,'Quick Time/Main scorer draft bridge missing')
req('function eventCommitFingerprint' in scorer,'duplicate fingerprint missing')
req('now - lastEventCommit.at < 650' in scorer,'short duplicate-submit window missing')
req('eventCommitInFlight' in scorer,'in-flight submit lock missing')

# Exact-time plays require an explicit time value + explicit Record action.
req('id="wpiQuickTimeInput"' in quick,'Quick Time direct numeric input missing')
req('placeholder="632"' in quick,'compact time-entry cue missing')
req('record.disabled=submitting || !parsed' in quick,'Record must remain disabled until time is valid')
req('if(e.target.closest("[data-qtp-same]")){setTimeInput(sameTime);return;}' in quick,'Use current time must fill but not auto-submit')
req('setAndRecord(sameTime)' not in quick,'Same-time shortcut must not auto-record')
req('clock.dispatchEvent(new Event("blur"' not in quick,'Quick Time must not trigger pre-commit clock blur/autosave')
req('timeInput.addEventListener("keydown"' in quick and 'e.key==="Enter"' in quick,'keyboard Enter explicit commit path missing')
req('data-qtp-back-step' in quick and 'data-qtp-cancel' in quick,'Quick Time Back/Cancel controls missing')
req('queueMicrotask' in quick,'fast selection should advance without multi-frame delay')

# Exact-time event set remains the proven goal/penalty set.
expected={'goal','opponent_goal','exclusion_drawn','exclusion_committed','five_meter_drawn','five_meter_committed'}
m=re.search(r'const EXACT_TIME_EVENTS = new Set\(\[(.*?)\]\);',quick)
req(m is not None,'Quick Time exact-event set missing')
actual=set(re.findall(r'"([a-z_]+)"',m.group(1)))
req(actual==expected,f'exact-time event set changed unexpectedly: {actual}')

# Mobile zoom/focus mitigation must not disable accessibility pinch zoom.
req('html,body{touch-action:manipulation}' in css,'page-level double-tap zoom mitigation missing')
req('#eventForm,.wpi-quick-time-dialog{touch-action:manipulation}' in css,'scorer-shell double-tap zoom mitigation missing')
req('font-size:16px!important' in css,'iOS-safe scorer input font sizing missing')
req('timeInput.addEventListener("touchend"' in quick and 'passive:false' in quick,'iPhone time-field focus stabilization missing')
req('timeInput.focus({preventScroll:true})' in quick,'Quick Time should focus directly without a delayed frame')
req('requestAnimationFrame(()=>timeInput.focus' not in quick,'delayed Quick Time autofocus can reintroduce iPhone focus zoom')
viewport=re.search(r'<meta name="viewport" content="([^"]+)">',html)
req(viewport is not None,'viewport metadata missing')
vp=viewport.group(1).lower()
req('user-scalable=no' not in vp and 'maximum-scale=1' not in vp,'pinch zoom/accessibility must not be disabled')

# No new backend deployment belongs to 7.64.32.
req(not (ROOT/'supabase/functions/groupme-post-v7-64-32').exists(),'7.64.32 must not introduce a GroupMe Edge Function')

print('WPHQ 7.64.32 POOLSIDE SCORING THROUGHPUT & RECOVERY TEST PASSED')
print(' - realtime state echoes are held during event composition')
print(' - exact-time plays require explicit valid time + Record')
print(' - Back/Cancel and duplicate-submit protection are present')
print(' - mobile double-tap/focus zoom is reduced without disabling pinch zoom')
print(' - 7.64.31 GroupMe/finalization server reliability remains byte-stable')
