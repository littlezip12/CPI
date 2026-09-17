/* WPI 7.64.9 — Event-first Quick Time Pad + game/event cap assignment controls. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(resolve => setTimeout(resolve,ms));
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":"&#39;"}[ch]));
  const form = $("eventForm"), clock = $("clockTime"), eventType = $("eventType"), primary = $("primaryPlayer"), assist = $("assistPlayer");
  if (!form || !clock || !eventType || !primary) return;

  // Replace the older explicit clock button with an event-first pad while leaving the protected engine authoritative.
  $("clockConfirmButton")?.setAttribute("hidden","");
  if ($("clockHelp")) $("clockHelp").textContent = "Choose the play and player first. WPI will open the Quick Time Pad.";

  const dialog = document.createElement("dialog");
  dialog.id = "wpiQuickTimeDialog";
  dialog.className = "wpi-quick-time-dialog";
  dialog.innerHTML = `
    <form method="dialog" class="wpi-quick-time-shell">
      <header><div><span>Quick Time</span><strong id="wpiQuickTimeEvent">Record play</strong></div><button value="cancel" aria-label="Close">Close</button></header>
      <div class="wpi-quick-time-display"><small>Time remaining</small><strong id="wpiQuickTimeDisplay">—</strong><span id="wpiQuickTimeHint">Type the scoreboard time</span></div>
      <label id="wpiQuickAssistWrap" class="wpi-quick-assist" hidden>Assist <select id="wpiQuickAssist"></select></label>
      <details class="wpi-quick-note"><summary>Add note <span>optional</span></summary><input id="wpiQuickNote" type="text" maxlength="140" placeholder="Short context for supporters"></details>
      <div class="wpi-quick-time-shortcuts">
        <button type="button" data-qtp-same>Same time</button><button type="button" data-qtp-adjust="1">+1 sec</button><button type="button" data-qtp-adjust="-1">−1 sec</button>
      </div>
      <div class="wpi-quick-time-grid" aria-label="Time keypad">
        ${[1,2,3,4,5,6,7,8,9].map(n=>`<button type="button" data-qtp-digit="${n}">${n}</button>`).join("")}
        <button type="button" data-qtp-clear>Clear</button><button type="button" data-qtp-digit="0">0</button><button type="button" data-qtp-back>⌫</button>
      </div>
      <p id="wpiQuickTimeError" class="wpi-quick-time-error" role="status"></p>
      <button id="wpiQuickTimeRecord" class="wpi-quick-time-record" type="button">Record play</button>
    </form>`;
  document.body.appendChild(dialog);
  document.body.classList.add("wpi-quick-time-active");

  const display = $("wpiQuickTimeDisplay"), hint=$("wpiQuickTimeHint"), error=$("wpiQuickTimeError"), quickAssist=$("wpiQuickAssist"), quickAssistWrap=$("wpiQuickAssistWrap"), quickNote=$("wpiQuickNote"), record=$("wpiQuickTimeRecord");
  let digits="", fresh=true, sameTime="";
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
    const parsed=parse(digits);
    display.textContent=parsed?.text || (digits ? digits : sameTime || "—");
    hint.textContent=digits ? "Tap Record when the time matches the scoreboard." : `Current time: ${sameTime || "—"}`;
    error.textContent="";
    record.textContent=`Record ${labelForEvent()}${parsed?.text ? ` at ${parsed.text}` : digits ? "" : sameTime ? ` at ${sameTime}` : ""}`;
  }
  function openPad(){
    if (!eventType.value || dialog.open) return;
    const playerNeeded = !$("primaryPlayerLabel")?.hidden;
    if (playerNeeded && !primary.value) { primary.focus({preventScroll:false}); return; }
    sameTime=parse(clock.value)?.text || clock.value || "";
    digits="";fresh=true;
    $("wpiQuickTimeEvent").textContent=labelForEvent();
    const isGoal=eventType.value==="goal" && assist && !$("assistPlayerLabel")?.hidden;
    quickAssistWrap.hidden=!isGoal;
    if(isGoal){ quickAssist.innerHTML=assist.innerHTML; quickAssist.value=assist.value || ""; }
    if(quickNote) quickNote.value=$("eventNote")?.value || "";
    renderPad();
    dialog.showModal();
  }
  function setAndRecord(value){
    const parsed=parse(value || sameTime);
    if(!parsed){error.textContent="Enter a valid time, for example 632 for 6:32.";return;}
    clock.value=parsed.text; clock.dispatchEvent(new Event("input",{bubbles:true})); clock.dispatchEvent(new Event("blur"));
    if(!quickAssistWrap.hidden){assist.value=quickAssist.value;assist.dispatchEvent(new Event("change",{bubbles:true}));}
    if($("eventNote") && quickNote) $("eventNote").value=quickNote.value.trim();
    dialog.close();
    requestAnimationFrame(()=>form.requestSubmit());
  }
  dialog.addEventListener("click",e=>{
    const digit=e.target.closest("[data-qtp-digit]");
    if(digit){if(fresh){digits="";fresh=false;} if(digits.length<4)digits+=digit.dataset.qtpDigit;renderPad();return;}
    if(e.target.closest("[data-qtp-clear]")){digits="";fresh=false;renderPad();return;}
    if(e.target.closest("[data-qtp-back]")){digits=digits.slice(0,-1);fresh=false;renderPad();return;}
    const adjust=e.target.closest("[data-qtp-adjust]");
    if(adjust){const base=parse(digits)?.seconds ?? parse(sameTime)?.seconds; if(base!=null){digits=String(Math.max(0,base+Number(adjust.dataset.qtpAdjust))); const t=fromSeconds(Number(digits)); const p=parse(t); digits=String(p.seconds); sameTime=t; digits=""; fresh=true; renderPad();}return;}
    if(e.target.closest("[data-qtp-same]")){setAndRecord(sameTime);return;}
  });
  record.addEventListener("click",()=>setAndRecord(digits || sameTime));

  // Event -> player -> time. Variant/direct events without a player jump straight to time.
  document.addEventListener("click",e=>{
    if(!e.target.closest("#eventQuickActions button,#eventVariantChooser button")) return;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(!eventType.value) return;
      const needsPlayer=!$("primaryPlayerLabel")?.hidden;
      if(needsPlayer && !primary.value){primary.focus({preventScroll:false});}
      else openPad();
    }));
  },true);
  primary.addEventListener("change",()=>{if(eventType.value && primary.value) requestAnimationFrame(openPad);});

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
