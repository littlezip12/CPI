/* WPI 7.64.4 — explicit mobile clock confirmation without changing the protected scoring engine. */
(() => {
  "use strict";
  const input=document.getElementById("clockTime");
  const button=document.getElementById("clockConfirmButton");
  const status=document.getElementById("clockConfirmStatus");
  if(!input||!button) return;
  let timer=null;
  function parse(value){
    const raw=String(value||"").trim(); if(!raw) return null;
    let minutes,seconds;
    if(raw.includes(":")){
      const parts=raw.split(":"); if(parts.length!==2||!/^\d+$/.test(parts[0])||!/^\d{1,2}$/.test(parts[1])) return null;
      minutes=Number(parts[0]);seconds=Number(parts[1]);
    }else if(/^\d+$/.test(raw)){
      if(raw.length===1){minutes=Number(raw);seconds=0;}
      else if(raw.length===2){minutes=0;seconds=Number(raw);}
      else{minutes=Number(raw.slice(0,-2));seconds=Number(raw.slice(-2));}
    }else return null;
    if(minutes>15||seconds>59) return null;
    return `${minutes}:${String(seconds).padStart(2,"0")}`;
  }
  function flash(message,error=false){
    if(!status) return; status.textContent=message; status.dataset.state=error?"error":"set";
    clearTimeout(timer); timer=setTimeout(()=>{status.textContent="";status.removeAttribute("data-state");},1400);
  }
  function confirm(){
    const normalized=parse(input.value);
    if(!normalized){flash("Use MM:SS — for example 6:45 or 645.",true);input.focus();input.select();return false;}
    input.value=normalized;
    input.dispatchEvent(new Event("input",{bubbles:true}));
    input.dispatchEvent(new Event("blur"));
    input.blur();
    flash(`Time set: ${normalized}`);
    return true;
  }
  button.addEventListener("click",confirm);
  input.addEventListener("keydown",event=>{ if(event.key==="Enter"){event.preventDefault();confirm();} });
})();
