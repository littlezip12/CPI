/* WPHQ 7.64.32 — Poolside throughput: explicit exact-time confirmation, keyboard-safe input, Back/Cancel recovery, and duplicate-submit protection. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(resolve => setTimeout(resolve,ms));
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":"&#39;"}[ch]));
  const form = $("eventForm"), clock = $("clockTime"), eventType = $("eventType"), primary = $("primaryPlayer"), assist = $("assistPlayer");
  if (!form || !clock || !eventType || !primary) return;

  const EXACT_TIME_EVENTS = new Set(["goal","opponent_goal","exclusion_drawn","exclusion_committed","five_meter_drawn","five_meter_committed"]);
  let routineSubmitting = false;

  // Keep exact time where it adds real value. Routine stats inherit the current clock and record immediately.
  $("clockConfirmButton")?.setAttribute("hidden","");
  if ($("clockHelp")) $("clockHelp").textContent = "Goals and penalties ask for time. Routine stats record immediately and keep the current clock.";

  const dialog = document.createElement("dialog");
  dialog.id = "wpiQuickTimeDialog";
  dialog.className = "wpi-quick-time-dialog";
  dialog.innerHTML = `
    <form method="dialog" class="wpi-quick-time-shell">
      <header><div><span>Quick Time</span><strong id="wpiQuickTimeEvent">Record play</strong></div><button type="button" data-qtp-cancel aria-label="Cancel this play">Cancel</button></header>
      <div class="wpi-quick-time-display"><small>Time remaining</small><input id="wpiQuickTimeInput" type="text" inputmode="numeric" enterkeyhint="done" autocomplete="off" maxlength="5" placeholder="632" aria-label="Time remaining"><span id="wpiQuickTimeHint">Type the scoreboard time</span></div>
      <label id="wpiQuickAssistWrap" class="wpi-quick-assist" hidden>Assist <select id="wpiQuickAssist"></select></label>
      <details class="wpi-quick-note"><summary>Add note <span>optional</span></summary><input id="wpiQuickNote" type="text" maxlength="140" placeholder="Short context for supporters"></details>
      <div class="wpi-quick-time-shortcuts">
        <button type="button" data-qtp-same>Use current time</button><button type="button" data-qtp-adjust="1">+1 sec</button><button type="button" data-qtp-adjust="-1">−1 sec</button>
      </div>
      <div class="wpi-quick-time-grid" aria-label="Time keypad">
        ${[1,2,3,4,5,6,7,8,9].map(n=>`<button type="button" data-qtp-digit="${n}">${n}</button>`).join("")}
        <button type="button" data-qtp-clear>Clear</button><button type="button" data-qtp-digit="0">0</button><button type="button" data-qtp-delete>⌫</button>
      </div>
      <p id="wpiQuickTimeError" class="wpi-quick-time-error" role="status"></p>
      <div class="wpi-quick-time-actions"><button type="button" data-qtp-back-step>Back</button><button id="wpiQuickTimeRecord" class="wpi-quick-time-record" type="button" disabled>Record play</button></div>
    </form>`;
  document.body.appendChild(dialog);
  document.body.classList.add("wpi-quick-time-active");

  const timeInput=$("wpiQuickTimeInput"), hint=$("wpiQuickTimeHint"), error=$("wpiQuickTimeError"), quickAssist=$("wpiQuickAssist"), quickAssistWrap=$("wpiQuickAssistWrap"), quickNote=$("wpiQuickNote"), record=$("wpiQuickTimeRecord");
  let fresh=true, sameTime="", submitting=false;
  const draftApi = () => window.WPHQLiveScoringDraft || null;
  const labelForEvent = () => {
    const active = document.querySelector(`[data-event-variant="${CSS.escape(eventType.value)}"]`) || document.querySelector(`[data-event-chip="${CSS.escape(eventType.value)}"]`);
    return active?.textContent?.trim() || $("recordEventButton")?.textContent?.replace(/^Submit\s+/i,"") || "Record play";
  };
  function parse(value) {
    const raw=String(value||"").trim(); if(!raw) return null;
    let m,s;
    if(raw.includes(":")){const p=raw.split(":"); if(p.length!==2||!/^\d+$/.test(p[0])||!/^\d{1,2}$/.test(p[1])) return null; m=+p[0];s=+p[1];}
    else if(/^\d+$/.test(raw)){ if(raw.length<=2){m=0;s=+raw;} else {m=+raw.slice(0,-2);s=+raw.slice(-2);} }
    else return null;
    if(m>15||s>59) return null;
    return {seconds:m*60+s,text:`${m}:${String(s).padStart(2,"0")}`};
  }
  function fromSeconds(total){total=Math.max(0,Math.min(15*60+59,Number(total)||0));return `${Math.floor(total/60)}:${String(total%60).padStart(2,"0")}`;}
  function renderPad(){
    const parsed=parse(timeInput.value);
    const raw=String(timeInput.value||"").trim();
    hint.textContent=raw ? (parsed ? `Ready to record at ${parsed.text}.` : "Enter time as MM:SS or digits like 632.") : `Current clock: ${sameTime || "—"}. Enter the play time or tap Use current time.`;
    error.textContent=raw && !parsed ? "Enter a valid time, for example 632 for 6:32." : "";
    record.disabled=submitting || !parsed;
    record.textContent=parsed ? `Record ${labelForEvent()} at ${parsed.text}` : `Record ${labelForEvent()}`;
  }
  function setTimeInput(value){
    timeInput.value=String(value||"");
    fresh=false;
    renderPad();
  }
  function openPad(){
    if (!eventType.value || dialog.open) return;
    const playerNeeded = !$("primaryPlayerLabel")?.hidden;
    if (playerNeeded && !primary.value) { primary.focus({preventScroll:true}); return; }
    draftApi()?.begin?.();
    sameTime=parse(clock.value)?.text || clock.value || "";
    timeInput.value=""; fresh=true; submitting=false;
    $("wpiQuickTimeEvent").textContent=labelForEvent();
    const isGoal=eventType.value==="goal" && assist && !$("assistPlayerLabel")?.hidden;
    quickAssistWrap.hidden=!isGoal;
    if(isGoal){ quickAssist.innerHTML=assist.innerHTML; quickAssist.value=assist.value || ""; }
    if(quickNote) quickNote.value=$("eventNote")?.value || "";
    renderPad();
    dialog.showModal();
    // Keep keyboard focus inside the original player-selection gesture when iOS allows it.
    // This removes the extra tap that was triggering Safari/WKWebView focus zoom.
    try { timeInput.focus({preventScroll:true}); } catch (_) { timeInput.focus(); }
  }
  function setAndRecord(value){
    if(submitting) return;
    const parsed=parse(value);
    if(!parsed){error.textContent="Enter a valid time, for example 632 for 6:32.";return;}
    submitting=true; renderPad();
    clock.value=parsed.text;
    clock.dispatchEvent(new Event("input",{bubbles:true}));
    if(!quickAssistWrap.hidden){assist.value=quickAssist.value;assist.dispatchEvent(new Event("change",{bubbles:true}));}
    if($("eventNote") && quickNote) $("eventNote").value=quickNote.value.trim();
    form.dataset.wpiTimePrecision="exact";
    dialog.close();
    requestAnimationFrame(()=>form.requestSubmit());
  }
  dialog.addEventListener("cancel",e=>{ e.preventDefault(); dialog.close(); draftApi()?.cancel?.(); });
  dialog.addEventListener("click",e=>{
    const digit=e.target.closest("[data-qtp-digit]");
    if(digit){const compact=String(timeInput.value||"").replace(/\D/g,""); const next=fresh ? digit.dataset.qtpDigit : `${compact}${digit.dataset.qtpDigit}`; if(next.length<=4)setTimeInput(next);return;}
    if(e.target.closest("[data-qtp-clear]")){setTimeInput("");return;}
    if(e.target.closest("[data-qtp-delete]")){const compact=String(timeInput.value||"").replace(/\D/g,"");setTimeInput(compact.slice(0,-1));return;}
    const adjust=e.target.closest("[data-qtp-adjust]");
    if(adjust){const base=parse(timeInput.value)?.seconds ?? parse(sameTime)?.seconds; if(base!=null)setTimeInput(fromSeconds(base+Number(adjust.dataset.qtpAdjust)));return;}
    if(e.target.closest("[data-qtp-same]")){setTimeInput(sameTime);return;}
    if(e.target.closest("[data-qtp-back-step]")){dialog.close();draftApi()?.back?.();return;}
    if(e.target.closest("[data-qtp-cancel]")){dialog.close();draftApi()?.cancel?.();return;}
  });
  // iPhone focus stabilization: browser-default tap-to-focus can visibly zoom the page even
  // when the field is large. Own the touch end for this dedicated numeric field, focus it
  // ourselves, and keep the caret at the end. Pinch zoom remains available elsewhere.
  timeInput.addEventListener("touchend",e=>{
    e.preventDefault();
    try { timeInput.focus({preventScroll:true}); } catch (_) { timeInput.focus(); }
    try { const end=timeInput.value.length; timeInput.setSelectionRange(end,end); } catch (_) {}
  },{passive:false});
  timeInput.addEventListener("dblclick",e=>e.preventDefault());
  timeInput.addEventListener("input",()=>{fresh=false;renderPad();});
  timeInput.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();setAndRecord(timeInput.value);}});
  record.addEventListener("click",()=>setAndRecord(timeInput.value));
  document.addEventListener("wphq:scoring-commit-complete",()=>{submitting=false;});

  function requiresExactTime(){ return EXACT_TIME_EVENTS.has(eventType.value); }
  function submitRoutineIfReady(){
    if(routineSubmitting || !eventType.value || requiresExactTime()) return;
    const needsPlayer=!$("primaryPlayerLabel")?.hidden;
    if(needsPlayer && !primary.value){ primary.focus({preventScroll:false}); return; }
    routineSubmitting=true;
    form.dataset.wpiTimePrecision="inherited";
    requestAnimationFrame(()=>{
      try{ form.requestSubmit(); } finally { setTimeout(()=>{routineSubmitting=false;},0); }
    });
  }

  // Fast Scorekeeping: routine stat -> player -> recorded. Goals/penalties still ask for exact time.
  document.addEventListener("click",e=>{
    if(!e.target.closest("#eventQuickActions button,#eventVariantChooser button")) return;
    queueMicrotask(()=>{
      if(!eventType.value) return;
      draftApi()?.begin?.();
      const needsPlayer=!$("primaryPlayerLabel")?.hidden;
      if(needsPlayer && !primary.value){ primary.focus({preventScroll:true}); return; }
      if(requiresExactTime()) openPad(); else submitRoutineIfReady();
    });
  },true);
  primary.addEventListener("change",()=>{
    if(!eventType.value || !primary.value) return;
    draftApi()?.begin?.();
    if(requiresExactTime()) openPad();
    else queueMicrotask(submitRoutineIfReady);
  });

  // Event-level cap inheritance. Game-specific caps live in the canonical state snapshot.
  const capPanel=$("gameCapScopePanel"), capButton=$("saveCapsForEventButton"), capStatus=$("gameCapScopeStatus"), capHelp=$("gameCapScopeHelp");
  let capBackend=null, capContext=null, loadedGameId=null;
  async function backend(){
    if(capBackend) return capBackend;
    const config=window.WPI_LIVE_SANDBOX_CONFIG || {};
    if(!window.WPILiveBackend?.isConfigured?.(config)) return null;
    capBackend=await window.WPILiveBackend.connect(config); await capBackend.waitForHealthySession(); return capBackend;
  }
  async function loadCaps(){
    const api=window.WPILiveGameCapAPI; const gameId=api?.getGameId?.();
    if(!api||!gameId||gameId===loadedGameId) return;
    try{
      const b=await backend(); if(!b) return;
      const {data,error:rpcError}=await b.client.rpc("live_game_player_cap_context_v1",{target_game_id:gameId});
      if(rpcError) throw rpcError; capContext=data||{}; loadedGameId=gameId;
      const assignments={}; (capContext.players||[]).forEach(row=>{if(row.clientPlayerId && row.effectiveCap!=null) assignments[String(row.clientPlayerId)]=String(row.effectiveCap||"");});
      api.applyAssignments(assignments,{onlyEmpty:true});
      if(capPanel){ capPanel.hidden=!capContext.seriesId; if(capHelp) capHelp.textContent=capContext.seriesId ? `Game caps are saved with this game. Save once to reuse these caps across ${capContext.seriesName || "this event"}.` : "Game caps are saved with this game."; }
    }catch(err){ if(capStatus) capStatus.textContent="Event cap defaults unavailable; game caps still work."; }
  }
  capButton?.addEventListener("click",async()=>{
    try{
      if(!capContext?.seriesId) throw new Error("This game is not attached to an event yet.");
      const b=await backend(); const api=window.WPILiveGameCapAPI;
      const assignments=api?.getAssignments?.() || {};
      capButton.disabled=true; if(capStatus)capStatus.textContent="Saving event caps…";
      const {error:rpcError}=await b.client.rpc("live_save_series_cap_assignments_v1",{target_series_id:capContext.seriesId,requested_assignments:assignments});
      if(rpcError) throw rpcError; if(capStatus)capStatus.textContent="Event caps saved. Future games in this event can inherit them.";
    }catch(err){if(capStatus)capStatus.textContent=err.message||"Event caps could not be saved.";}finally{capButton.disabled=false;}
  });
  (async()=>{for(let i=0;i<60;i++){await loadCaps(); if(loadedGameId)break; await sleep(500);}})();
})();
