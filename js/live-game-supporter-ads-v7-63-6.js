/* WPI 7.63.6 correction — monetize the authenticated free Supporter game viewer without touching scorer controls. */
(()=>{"use strict";
  const config=window.WPI_LIVE_SANDBOX_CONFIG||{};
  const params=new URLSearchParams(location.search);
  const gameId=params.get("game")||"";
  const slot=document.getElementById("supporterGameSponsorBanner");
  let backend=null,teamId="",lastRotationKey="",renderTimer=0;

  function isViewer(){return document.body.classList.contains("is-live-viewer");}
  function hide(){if(slot){slot.hidden=true;slot.replaceChildren();}lastRotationKey="";}
  function rotationKey(){
    const period=(document.getElementById("scorePeriodLabel")?.textContent||"game").trim();
    const status=(document.getElementById("gameStatus")?.textContent||"live").trim();
    return `supporter:${period}:${status}`;
  }
  async function resolveTeam(){
    if(!backend||!gameId)return "";
    const {data,error}=await backend.client.from("live_games").select("team_id").eq("id",gameId).maybeSingle();
    if(error)throw error;
    return data?.team_id||"";
  }
  async function isAdFree(){
    if(!backend||!teamId)return true;
    const {data,error}=await backend.client.rpc("live_analytics_access_level_v1",{target_team_id:teamId});
    if(error)throw error;
    return ["team_insights","organization_insights"].includes(String(data||""));
  }
  async function render(){
    if(!slot||!backend||!gameId||!isViewer()){hide();return;}
    if(await isAdFree()){hide();return;}
    const key=rotationKey();
    if(key===lastRotationKey&&!slot.hidden)return;
    lastRotationKey=key;
    await window.WPILiveAds?.renderBanner(backend.client,slot,{gameId,rotationKey:key});
  }
  function queue(){clearTimeout(renderTimer);renderTimer=setTimeout(()=>render().catch(e=>{console.warn("WPI Supporter game ad unavailable",e);hide();}),120);}
  async function init(){
    if(!slot||!gameId||!window.WPILiveBackend?.isConfigured(config)||!window.WPILiveAds)return;
    try{
      backend=await window.WPILiveBackend.connect(config);
      const session=await backend.waitForHealthySession();
      if(!session)return;
      teamId=await resolveTeam();
      if(!teamId)return;
      const app=document.getElementById("liveSandboxApp");
      const observer=new MutationObserver(queue);
      observer.observe(document.body,{attributes:true,attributeFilter:["class"]});
      for(const id of ["scorePeriodLabel","gameStatus"]){const el=document.getElementById(id);if(el)observer.observe(el,{childList:true,characterData:true,subtree:true});}
      if(app)observer.observe(app,{attributes:true,attributeFilter:["hidden"]});
      queue();
    }catch(e){console.warn("WPI Supporter game ad initialization unavailable",e);hide();}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
