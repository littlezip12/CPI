/* WPI 7.64.4 — mobile Owner/Admin guided game setup. */
(() => {
  "use strict";
  const dialog=document.getElementById("gameDayDialog");
  if(!dialog) return;
  const $=id=>document.getElementById(id);
  const mobile=()=>window.matchMedia("(max-width: 720px)").matches;
  let step=1;

  function kind(){ return document.querySelector('input[name="gameKind"]:checked')?.value || "tournament"; }
  function text(id){ return $(id)?.value?.trim?.() || ""; }
  function selectedText(id){ const el=$(id); return el?.selectedOptions?.[0]?.textContent?.trim() || ""; }
  function eventName(){
    if(kind()==="tournament") return $("gameTournamentSelect")?.value === "__other__" ? text("gameTournamentOther") : selectedText("gameTournamentSelect");
    if(kind()==="friendly") return $("gameScrimmageWeekendSelect")?.value === "__new__" ? text("gameScrimmageWeekendNew") : selectedText("gameScrimmageWeekendSelect");
    return "Regular season";
  }
  function kindLabel(){ return kind()==="tournament" ? "Tournament" : kind()==="friendly" ? "Friendly" : "Regular season"; }
  function dateLabel(){
    const raw=$("gameScheduledAt")?.value;
    if(!raw) return "Time TBD";
    const d=new Date(raw); if(Number.isNaN(d.getTime())) return "Check date/time";
    try{return new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(d);}catch(_){return raw;}
  }
  function setMessage(message=""){ const target=$("gameDayDialogMessage"); if(target) target.textContent=message; }
  function validate(n){
    if(n===1 && !kind()) return "Choose the game type.";
    if(n===2){
      if(kind()==="tournament" && !eventName()) return "Choose the tournament or enter its name.";
      if(kind()==="friendly" && !eventName()) return "Choose or name the Scrimmage Weekend.";
      if(!text("gameOpponentName")) return "Enter the opponent before continuing.";
    }
    const scheduled=$("gameScheduledAt")?.value;
    if(n===3 && scheduled && Number.isNaN(new Date(scheduled).getTime())) return "Check the game date and time.";
    return "";
  }
  function review(){
    const target=$("gameMobileReview"); if(!target) return;
    const rows=[
      ["Game",kindLabel()],
      [kind()==="friendly"?"Weekend":kind()==="tournament"?"Tournament":"Schedule",eventName()||"—"],
      ["Opponent",text("gameOpponentName")||"—"],
      ["When",dateLabel()],
      ["Venue",text("gameVenue")||"TBD"],
      ["Quarter",`${$("gameQuarterLength")?.value||7} min`]
    ];
    target.innerHTML=rows.map(([label,value])=>`<span><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></span>`).join("");
  }
  function escapeHtml(value){ return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch])); }
  function render(){
    if(!mobile()){
      dialog.removeAttribute("data-mobile-step");
      dialog.querySelectorAll("[data-game-step]").forEach(el=>el.removeAttribute("data-active"));
      return;
    }
    step=Math.min(4,Math.max(1,step)); dialog.dataset.mobileStep=String(step);
    dialog.querySelectorAll("[data-game-step]").forEach(el=>el.dataset.active=String(Number(el.dataset.gameStep)===step));
    dialog.querySelectorAll("[data-game-progress-step]").forEach(el=>{
      const n=Number(el.dataset.gameProgressStep); el.dataset.state=n<step?"done":n===step?"current":"upcoming";
    });
    const back=$("gameWizardBack"), next=$("gameWizardNext"), label=$("gameWizardStepLabel");
    if(back) back.disabled=step===1;
    if(next) next.textContent=step===3?"Review":"Continue";
    if(label) label.textContent=`Step ${step} of 4`;
    if(step===4) review();
    const active=dialog.querySelector(`[data-game-step="${step}"]`);
    active?.scrollTo?.({top:0,behavior:"instant"});
    setMessage("");
  }
  function next(){ const message=validate(step); if(message){setMessage(message);return;} step+=1; render(); }
  function back(){ step-=1; render(); }
  $("gameWizardNext")?.addEventListener("click",next);
  $("gameWizardBack")?.addEventListener("click",back);
  dialog.addEventListener("keydown",event=>{
    if(!mobile()||event.key!=="Enter"||event.target?.tagName==="TEXTAREA") return;
    if(step<4 && event.target?.tagName!=="BUTTON"){ event.preventDefault(); next(); }
  });
  dialog.addEventListener("input",()=>{ if(step===4) review(); });
  dialog.addEventListener("change",()=>{ if(step===4) review(); });
  const observer=new MutationObserver(()=>{ if(dialog.hasAttribute("open")){step=1;requestAnimationFrame(render);} });
  observer.observe(dialog,{attributes:true,attributeFilter:["open"]});
  window.matchMedia("(max-width: 720px)").addEventListener?.("change",render);
})();
