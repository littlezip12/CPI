/* WPI 7.60.3 — return read-only followers to My Teams instead of a team-admin dashboard. */
(() => {
  "use strict";
  if (new URLSearchParams(location.search).get("follow") !== "1") return;
  const ids=new Set(["dashboardTopButton","gameDashboardButton","summaryDashboardButton"]);
  function label(){for(const id of ids){const el=document.getElementById(id);if(el) el.textContent=id==="summaryDashboardButton"?"Back to My Teams":"My Teams";}}
  document.addEventListener("click",event=>{const target=event.target?.closest?.("button");if(!target||!ids.has(target.id))return;event.preventDefault();event.stopImmediatePropagation();location.assign("live-following.html");},true);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",label,{once:true});else label();
})();
