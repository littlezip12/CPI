/* WPI 7.64.29 — Water Polo HQ cross-device team QR fix. */
(() => {
  "use strict";
  const RELEASE="7.64.29";
  const PUBLIC_WEB_BASE="https://littlezip12.github.io/CPI/";
  const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const $=id=>document.getElementById(id);
  let current={teamId:"",label:"Water Polo HQ team",meta:""};

  function isNative(){
    try{return window.WPHQNativeTeamLinks?.isNative?.()===true||window.__WPHQ_NATIVE__===true||document.documentElement?.dataset?.wphqNativeShell==="true"||window.Capacitor?.isNativePlatform?.()===true;}
    catch(_){return false;}
  }
  function cleanTeamId(value){const id=String(value||"").trim();return UUID_RE.test(id)?id.toLowerCase():"";}
  function shareWebBase(){
    try{
      const here=new URL(window.location.href);
      const http=here.protocol==="https:"||here.protocol==="http:";
      const local=["localhost","127.0.0.1","0.0.0.0"].includes(String(here.hostname||"").toLowerCase());
      if(http&&!local)return new URL("./",here.href).href;
    }catch(_){}
    return PUBLIC_WEB_BASE;
  }
  function webFollowUrl(teamId){
    const id=cleanTeamId(teamId);if(!id)return"";
    const url=new URL("live-following.html",shareWebBase());url.searchParams.set("followTeam",id);return url.href;
  }
  function nativeFollowUrl(teamId){
    const id=cleanTeamId(teamId);if(!id)return"";
    return window.WPHQNativeTeamLinks?.nativeTeamUrl?.(id)||`waterpolohq://team/${id}`;
  }
  function qrFollowUrl(teamId){return webFollowUrl(teamId);}

  function ensureDialog(){
    if($("teamShareDialog"))return;
    const dialog=document.createElement("dialog");
    dialog.id="teamShareDialog";dialog.className="wpi-share-dialog";
    dialog.innerHTML=`<div class="wpi-share-card"><header><div><p>Water Polo HQ · Follow team</p><h2>Share Team</h2><p>Parents can scan the QR or open the link, sign in if needed, and add this team to My Teams with read-only supporter access.</p></div><button class="wpi-share-close" id="closeTeamShareButton" type="button">Close</button></header><div class="wpi-share-team"><strong id="teamShareName">Water Polo HQ team</strong><span id="teamShareMeta">Read-only supporter access</span></div><div id="teamShareQr" class="wpi-share-qr" aria-label="Team follow QR code"></div><p id="teamShareQrNote"></p><input id="teamShareLink" class="wpi-share-link" type="text" readonly aria-label="Team follow link"><div class="wpi-share-actions"><button id="copyTeamShareLink" type="button">Copy team link</button><button id="downloadTeamQr" type="button">Download QR</button><button id="printTeamQr" type="button">Print</button></div><p id="teamShareMessage" class="wpi-share-message" role="status"></p></div>`;
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
    else node.innerHTML='<p>QR generator could not load. Use the browser link instead.</p>';
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
    const slug=String(current.label||"team").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
    const a=document.createElement("a");a.href=href;a.download=`water-polo-hq-${slug}-follow-qr.png`;a.click();msg.textContent="QR image ready.";
  }
  function openShare(teamId,label,meta=""){
    const id=cleanTeamId(teamId);if(!id)return;
    ensureDialog();current={teamId:id,label:label||"Water Polo HQ team",meta};
    const webUrl=webFollowUrl(id),qrUrl=qrFollowUrl(id);
    $("teamShareName").textContent=current.label;
    $("teamShareMeta").textContent=meta||"Read-only supporter access";
    $("teamShareLink").value=webUrl;
    $("teamShareQrNote").textContent="Scan with any phone to open this team-follow page. Water Polo HQ app routing will move to an HTTPS Universal Link after the production domain is finalized.";
    $("teamShareMessage").textContent="";
    renderQr(qrUrl);
    $("teamShareDialog").showModal();
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
  const api={release:RELEASE,publicWebBase:PUBLIC_WEB_BASE,open:openShare,followUrl:webFollowUrl,webFollowUrl,nativeFollowUrl,qrFollowUrl};
  window.WPITeamShare=api; // compatibility for older internal callers
  window.WPHQTeamShare=api;
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
