/* WPI 7.64.13 — Team-specific share links + QR onboarding. */
(() => {
  "use strict";
  const RELEASE="7.64.13";
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[ch]);
  let current={teamId:"",label:"WPI team",meta:""};

  function followUrl(teamId){
    const url=new URL("live-following.html",window.location.href);
    url.searchParams.set("followTeam",teamId);
    return url.href;
  }
  function ensureDialog(){
    if($("teamShareDialog"))return;
    const dialog=document.createElement("dialog");
    dialog.id="teamShareDialog"; dialog.className="wpi-share-dialog";
    dialog.innerHTML=`<div class="wpi-share-card"><header><div><p>WPI Live · Follow team</p><h2>Share Team</h2><p>Parents scan once, sign in or create a supporter account, and WPI adds this team to My Teams.</p></div><button class="wpi-share-close" id="closeTeamShareButton" type="button">Close</button></header><div class="wpi-share-team"><strong id="teamShareName">WPI team</strong><span id="teamShareMeta">Read-only supporter access</span></div><div id="teamShareQr" class="wpi-share-qr" aria-label="Team follow QR code"></div><input id="teamShareLink" class="wpi-share-link" type="text" readonly><div class="wpi-share-actions"><button id="copyTeamShareLink" type="button">Copy link</button><button id="downloadTeamQr" type="button">Download QR</button><button id="printTeamQr" type="button">Print</button></div><p id="teamShareMessage" class="wpi-share-message" role="status"></p></div>`;
    document.body.appendChild(dialog);
    $("closeTeamShareButton").addEventListener("click",()=>dialog.close());
    dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close();});
    $("copyTeamShareLink").addEventListener("click",copyLink);
    $("downloadTeamQr").addEventListener("click",downloadQr);
    $("printTeamQr").addEventListener("click",()=>window.print());
  }
  function renderQr(url){
    const node=$("teamShareQr");node.innerHTML="";
    if(window.QRCode){new window.QRCode(node,{text:url,width:220,height:220,correctLevel:window.QRCode.CorrectLevel.M});}
    else node.innerHTML='<p>QR generator could not load. Use Copy link instead.</p>';
  }
  async function copyLink(){
    const input=$("teamShareLink"),msg=$("teamShareMessage");
    try{await navigator.clipboard.writeText(input.value);msg.textContent="Team follow link copied.";}
    catch(_){input.focus();input.select();document.execCommand("copy");msg.textContent="Team follow link copied.";}
  }
  function downloadQr(){
    const node=$("teamShareQr"),canvas=node?.querySelector("canvas"),img=node?.querySelector("img"),msg=$("teamShareMessage");
    let href="";try{href=canvas?canvas.toDataURL("image/png"):img?.src||"";}catch(_){}
    if(!href){msg.textContent="QR image is not ready yet.";return;}
    const a=document.createElement("a");a.href=href;a.download=`wpi-${String(current.label||"team").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}-follow-qr.png`;a.click();msg.textContent="QR image ready.";
  }
  function openShare(teamId,label,meta=""){
    if(!teamId)return;
    ensureDialog();current={teamId,label:label||"WPI team",meta};
    const url=followUrl(teamId);
    $("teamShareName").textContent=current.label;$("teamShareMeta").textContent=meta||"Read-only supporter access";$("teamShareLink").value=url;$("teamShareMessage").textContent="";renderQr(url);$("teamShareDialog").showModal();
  }
  async function dashboardTeam(){
    const config=window.WPI_LIVE_SANDBOX_CONFIG||{};
    if(!window.WPILiveBackend?.isConfigured(config))return null;
    try{
      const backend=await window.WPILiveBackend.connect(config),session=await backend.session();if(!session||backend.isAnonymousUser(session.user))return null;
      const {data,error}=await backend.client.rpc("live_following_overview_v2");if(error)throw error;
      const rows=(data?.teams||[]).filter(t=>t.isMember);
      const requested=new URLSearchParams(location.search).get("team");
      const team=(requested&&rows.find(t=>String(t.teamId)===String(requested)))||(rows.length===1?rows[0]:null);
      if(!team)return null;
      return {teamId:team.teamId,label:[team.clubDisplayName,team.teamDisplayLabel].filter(Boolean).join(" · ")||team.teamName,meta:[team.ageGroup,team.gender,team.squadLabel].filter(Boolean).join(" · ")};
    }catch(_){return null;}
  }
  async function init(){
    document.body.dataset.teamShareRelease=RELEASE;ensureDialog();
    document.addEventListener("click",e=>{const b=e.target.closest("[data-share-team]");if(b)openShare(b.dataset.shareTeam,b.dataset.shareLabel,b.dataset.shareMeta);});
    const dashButton=$("openTeamShareButton");if(dashButton){const team=await dashboardTeam();if(team){dashButton.hidden=false;dashButton.addEventListener("click",()=>openShare(team.teamId,team.label,team.meta));}else dashButton.hidden=true;}
  }
  window.WPITeamShare={open:openShare,followUrl};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
