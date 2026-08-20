/* WPI 7.63.7 — Commercial & Adoption Operations. */
(()=>{"use strict";
const $=id=>document.getElementById(id),config=window.WPI_LIVE_SANDBOX_CONFIG||{};
let backend=null;
let snapshot={advertisers:[],creatives:[],campaigns:[],organizations:[],teams:[]};
let previewState={promotions:[]};
let previewSeries=[];
const esc=v=>String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const cents=v=>{const n=Number(v);return Number.isFinite(n)&&n>=0?Math.round(n*100):null;};
const money=v=>v==null?"—":new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number(v)/100);
const iso=v=>v?new Date(v).toISOString():null;
const dateTimeLabel=v=>{if(!v)return"—";const d=new Date(v);return Number.isNaN(d.getTime())?"—":d.toLocaleString([],{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});};
const localInput=v=>{const d=v?new Date(v):new Date();if(Number.isNaN(d.getTime()))return"";const p=n=>String(n).padStart(2,"0");return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;};

function defaultPreviewWindow(force=false){
  if(!force&&$("previewStart").value&&$("previewEnd").value)return;
  const start=new Date();start.setSeconds(0,0);
  const end=new Date(start.getTime()+7*86400000);
  $("previewStart").value=localInput(start);$("previewEnd").value=localInput(end);
}
function fillOptions(){
  const ads=snapshot.advertisers||[],creatives=snapshot.creatives||[],orgs=snapshot.organizations||[],teams=snapshot.teams||[];
  const adOpts=ads.length?ads.map(a=>`<option value="${esc(a.id)}">${esc(a.name)}</option>`).join(""):'<option value="">Create advertiser first</option>';
  const currentCreativeAd=$("creativeAdvertiser").value,currentCampaignAd=$("campaignAdvertiser").value;
  $("creativeAdvertiser").innerHTML=adOpts;$("campaignAdvertiser").innerHTML=adOpts;
  if(currentCreativeAd&&ads.some(a=>String(a.id)===currentCreativeAd))$("creativeAdvertiser").value=currentCreativeAd;
  if(currentCampaignAd&&ads.some(a=>String(a.id)===currentCampaignAd))$("campaignAdvertiser").value=currentCampaignAd;
  const selectedAd=$("campaignAdvertiser").value;
  const eligible=creatives.filter(c=>!selectedAd||String(c.advertiser_id)===String(selectedAd));
  const currentCreative=$("campaignCreative").value;
  $("campaignCreative").innerHTML=eligible.length?eligible.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} · ${esc(c.creative_format)}</option>`).join(""):'<option value="">Create approved creative first</option>';
  if(currentCreative&&eligible.some(c=>String(c.id)===currentCreative))$("campaignCreative").value=currentCreative;

  const orgOptions=orgs.map(o=>`<option value="${esc(o.id)}">${esc(o.name)}</option>`).join("");
  const currentCampaignOrg=$("campaignOrganization").value,currentPreviewOrg=$("previewOrganization").value;
  $("campaignOrganization").innerHTML=orgOptions;$("previewOrganization").innerHTML=orgOptions;
  if(currentCampaignOrg&&orgs.some(o=>String(o.id)===currentCampaignOrg))$("campaignOrganization").value=currentCampaignOrg;
  if(currentPreviewOrg&&orgs.some(o=>String(o.id)===currentPreviewOrg))$("previewOrganization").value=currentPreviewOrg;

  const orgId=$("campaignOrganization").value;
  const filtered=teams.filter(t=>!orgId||String(t.organizationId)===String(orgId));
  const currentCampaignTeam=$("campaignTeam").value;
  $("campaignTeam").innerHTML=filtered.map(t=>`<option value="${esc(t.id)}">${esc(t.name)} · ${esc(t.season||"")}</option>`).join("");
  if(currentCampaignTeam&&filtered.some(t=>String(t.id)===currentCampaignTeam))$("campaignTeam").value=currentCampaignTeam;

  const orgMap=Object.fromEntries(orgs.map(o=>[String(o.id),o.name]));
  const currentPreviewTeam=$("previewTeam").value;
  $("previewTeam").innerHTML=teams.map(t=>`<option value="${esc(t.id)}">${esc(orgMap[String(t.organizationId)]||"Organization")} · ${esc(t.name)}${t.season?` · ${esc(t.season)}`:""}</option>`).join("");
  if(currentPreviewTeam&&teams.some(t=>String(t.id)===currentPreviewTeam))$("previewTeam").value=currentPreviewTeam;
}
function scopeVisibility(){
  const v=$("campaignScope").value;
  ["Region","Organization","Team","Tournament","Weekend","Game"].forEach(k=>$("scope"+k+"Wrap").hidden=v!==k.toLowerCase()&&(k!=="Weekend"||v!=="weekend"));
  if(v==="team")$("scopeTeamWrap").hidden=false;
}
function previewScopeVisibility(){
  const v=$("previewScope").value;
  $("previewOrganizationWrap").hidden=v!=="organization";
  $("previewTeamWrap").hidden=v!=="team";
  $("previewSeriesWrap").hidden=v!=="team";
  if(v==="team")loadPreviewSeries().catch(e=>{$("previewStatusText").textContent=e.message||String(e);});
}
async function loadPreviewSeries(selectedId=null){
  const teamId=$("previewTeam").value;
  previewSeries=[];
  if(!teamId){$("previewSeries").innerHTML='<option value="">No event reference</option>';return;}
  const {data,error}=await backend.client.rpc("live_team_insights_preview_series_v1",{target_team_id:teamId});
  if(error)throw error;
  previewSeries=Array.isArray(data)?data:[];
  $("previewSeries").innerHTML='<option value="">No event reference</option>'+previewSeries.map(s=>`<option value="${esc(s.id)}">${esc(s.name)} · ${esc(s.seriesType==="tournament"?"Tournament":"Weekend")} · ${esc(s.gameCount||0)} games</option>`).join("");
  if(selectedId&&previewSeries.some(s=>String(s.id)===String(selectedId)))$("previewSeries").value=String(selectedId);
}
function placementMix(r){const m=r.placementMetrics||{};const fmt=(key,label)=>{const x=m[key]||{};return `${label} ${Number(x.impressions||0)}/${Number(x.clicks||0)}`;};return [fmt("live.game.banner","Game"),fmt("live.recap.interstitial","Recap"),fmt("live.weekend.banner","Event")].join(" · ");}
function renderCampaigns(){
  const rows=snapshot.campaigns||[];
  const head='<div class="campaign-row campaign-row--head"><span>Campaign</span><span>Advertiser</span><span>Status</span><span>Scope</span><span>Value</span><span>Impressions</span><span>Clicks</span><span>Placement mix</span><span>Action</span></div>';
  const adMap=Object.fromEntries((snapshot.advertisers||[]).map(a=>[a.id,a.name]));
  $("campaignTable").innerHTML=rows.length?head+rows.map(r=>`<div class="campaign-row"><strong>${esc(r.campaignName||r.name)}</strong><span>${esc(r.advertiserName||adMap[r.advertiserId]||"Advertiser")}</span><span class="campaign-badge">${esc(r.status)}</span><span>${esc(r.scopeType)}${r.exclusive?" · exclusive":""}</span><span>${esc(money(r.contractValueCents))}</span><span>${esc(r.impressions||0)}</span><span>${esc(r.clicks||0)}</span><span class="campaign-placement-mix">${placementMix(r)}</span><button class="campaign-toggle" type="button" data-campaign-id="${esc(r.campaignId||r.id)}" data-next-status="${r.status==="active"?"paused":"active"}">${r.status==="active"?"Pause":"Activate"}</button></div>`).join(""):'<p class="campaign-empty">No campaigns yet. Create an approved advertiser, creative and campaign above.</p>';
}
function previewScopeLabel(p){
  if(p.scopeType==="platform")return"Entire WPI platform";
  if(p.scopeType==="organization")return p.organizationName||"Organization";
  const base=p.teamName||"Team";return p.referenceSeriesName?`${base} · ${p.referenceSeriesName}`:base;
}
function renderPreviews(){
  const rows=previewState.promotions||[];
  $("previewTable").innerHTML=rows.length?rows.map(p=>{
    const state=p.displayStatus||p.status||"paused";
    const canToggle=state==="active"||state==="scheduled"||state==="paused";
    const next=(state==="active"||state==="scheduled")?"paused":"active";
    const actionLabel=(state==="active"||state==="scheduled")?"Pause":"Reactivate";
    return `<div class="preview-row" data-preview-id="${esc(p.id)}"><div><h3>${esc(p.label)}</h3><p>${esc(previewScopeLabel(p))}<br>${esc(dateTimeLabel(p.startsAt))} → ${esc(dateTimeLabel(p.endsAt))}</p></div><div class="preview-row-actions"><span class="preview-status" data-state="${esc(state)}">${esc(state)}</span><button type="button" class="preview-edit" data-preview-id="${esc(p.id)}">Edit</button>${canToggle?`<button type="button" class="preview-toggle" data-preview-id="${esc(p.id)}" data-next-status="${esc(next)}">${esc(actionLabel)}</button>`:""}</div></div>`;
  }).join(""):'<p class="preview-empty">No preview windows yet. Schedule one when you are ready to let early Supporters experience Team Insights for free.</p>';
}
async function refresh(){
  const [{data:s,error:e1},{data:r,error:e2},{data:p,error:e3}]=await Promise.all([
    backend.client.rpc("live_ad_admin_snapshot_v1"),backend.client.rpc("live_platform_ad_campaign_reporting_v2"),backend.client.rpc("live_team_insights_preview_admin_snapshot_v1")
  ]);
  if(e1)throw e1;if(e2)throw e2;if(e3)throw e3;
  snapshot=s||snapshot;previewState=p||previewState;
  const report=Array.isArray(r?.campaigns)?r.campaigns:[];const byId=Object.fromEntries(report.map(x=>[x.campaignId,x]));
  snapshot.campaigns=(snapshot.campaigns||[]).map(c=>({...c,...(byId[c.id]||{})}));
  fillOptions();scopeVisibility();previewScopeVisibility();renderCampaigns();renderPreviews();defaultPreviewWindow();
}
function resetPreviewForm(){
  $("previewId").value="";$("previewLabel").value="";$("previewScope").value="team";$("previewStatus").value="active";previewScopeVisibility();defaultPreviewWindow(true);$("previewStatusText").textContent="";
}
async function editPreview(id){
  const p=(previewState.promotions||[]).find(x=>String(x.id)===String(id));if(!p)return;
  $("previewId").value=p.id;$("previewLabel").value=p.label||"";$("previewScope").value=p.scopeType||"team";$("previewStatus").value=p.status==="paused"?"paused":"active";
  if(p.organizationId)$("previewOrganization").value=p.organizationId;
  if(p.teamId)$("previewTeam").value=p.teamId;
  $("previewStart").value=localInput(p.startsAt);$("previewEnd").value=localInput(p.endsAt);previewScopeVisibility();
  if(p.scopeType==="team")await loadPreviewSeries(p.referenceSeriesId||null);
  $("previewStatusText").textContent="Editing preview. Save to apply changes.";$("previewForm").scrollIntoView({behavior:"smooth",block:"center"});
}
async function init(){
  try{backend=await window.WPILiveBackend.connect(config);const session=await backend.waitForHealthySession();if(!session){location.replace(`live-login.html?return=${encodeURIComponent(location.href)}`);return;}const {data:owner,error}=await backend.client.rpc("live_is_platform_owner");if(error||!owner)throw new Error("Platform Owner access required");await refresh();$("commercialLoading").hidden=true;$("commercialContent").hidden=false;}
  catch(e){console.warn(e);$("commercialLoading").hidden=true;$("commercialError").hidden=false;$("commercialErrorText").textContent=String(e?.message||e);}
}

$("previewForm").addEventListener("submit",async e=>{e.preventDefault();try{
  $("previewStatusText").textContent="Saving no-card preview…";const scope=$("previewScope").value;
  const params={target_id:$("previewId").value||null,preview_label:$("previewLabel").value,scope_type_value:scope,organization_value:scope==="organization"?$("previewOrganization").value:null,team_value:scope==="team"?$("previewTeam").value:null,reference_series_value:scope==="team"&&$("previewSeries").value?$("previewSeries").value:null,starts_value:iso($("previewStart").value),ends_value:iso($("previewEnd").value),desired_status:$("previewStatus").value};
  const {error}=await backend.client.rpc("live_team_insights_preview_admin_save_v1",params);if(error)throw error;
  $("previewStatusText").textContent="Preview saved. Eligible Supporters will unlock Team Insights only during the configured window.";await refresh();
}catch(err){$("previewStatusText").textContent=err.message||String(err);}});
$("resetPreviewForm").addEventListener("click",resetPreviewForm);
$("previewScope").addEventListener("change",previewScopeVisibility);
$("previewTeam").addEventListener("change",()=>loadPreviewSeries().catch(e=>{$("previewStatusText").textContent=e.message||String(e);}));
document.querySelectorAll("[data-preview-days]").forEach(b=>b.addEventListener("click",()=>{const days=Number(b.dataset.previewDays||7);let start=$("previewStart").value?new Date($("previewStart").value):new Date();if(Number.isNaN(start.getTime()))start=new Date();$("previewStart").value=localInput(start);$("previewEnd").value=localInput(new Date(start.getTime()+days*86400000));}));
$("previewTable").addEventListener("click",async e=>{const edit=e.target.closest(".preview-edit"),toggle=e.target.closest(".preview-toggle");try{
  if(edit){await editPreview(edit.dataset.previewId);return;}
  if(toggle){toggle.disabled=true;const {error}=await backend.client.rpc("live_team_insights_preview_admin_set_status_v1",{target_promotion_id:toggle.dataset.previewId,desired_status:toggle.dataset.nextStatus});if(error)throw error;await refresh();}
}catch(err){$("previewStatusText").textContent=err.message||String(err);}finally{if(toggle)toggle.disabled=false;}});
$("refreshPreviews").addEventListener("click",()=>refresh().catch(e=>{$("previewStatusText").textContent=e.message||String(e);}));

$("advertiserForm").addEventListener("submit",async e=>{e.preventDefault();try{$("advertiserStatus").textContent="Saving…";const {error}=await backend.client.rpc("live_ad_admin_save_advertiser_v1",{target_id:$("advertiserId").value||null,advertiser_name:$("advertiserName").value,advertiser_slug:$("advertiserSlug").value,advertiser_category:$("advertiserCategory").value||null,advertiser_website:$("advertiserWebsite").value||null,advertiser_type_value:$("advertiserType").value,youth_safe_confirmed:$("advertiserYouthSafe").checked,advertiser_notes:null});if(error)throw error;$("advertiserStatus").textContent="Saved and youth-safe approved.";await refresh();}catch(err){$("advertiserStatus").textContent=err.message||String(err);}});
$("creativeForm").addEventListener("submit",async e=>{e.preventDefault();try{$("creativeStatus").textContent="Saving…";const {error}=await backend.client.rpc("live_ad_admin_save_creative_v1",{target_id:$("creativeId").value||null,target_advertiser_id:$("creativeAdvertiser").value,creative_name:$("creativeName").value,format_value:$("creativeFormat").value,asset_url_value:$("creativeAsset").value||null,headline_value:$("creativeHeadline").value||null,body_value:$("creativeBody").value||null,cta_value:$("creativeCta").value||null,destination_value:$("creativeDestination").value||null,youth_safe_confirmed:$("creativeYouthSafe").checked});if(error)throw error;$("creativeStatus").textContent="Saved and youth-safe approved.";await refresh();}catch(err){$("creativeStatus").textContent=err.message||String(err);}});
$("campaignForm").addEventListener("submit",async e=>{e.preventDefault();try{$("campaignStatusText").textContent="Saving…";const placements=[...document.querySelectorAll(".placementCheck:checked")].map(x=>x.value),scope=$("campaignScope").value;const params={target_id:$("campaignId").value||null,target_advertiser_id:$("campaignAdvertiser").value,target_creative_id:$("campaignCreative").value,campaign_name:$("campaignName").value,desired_status:$("campaignStatus").value,start_value:iso($("campaignStart").value),end_value:iso($("campaignEnd").value),priority_value:Number($("campaignPriority").value||50),exclusive_value:$("campaignExclusive").checked,share_value:Number($("campaignShare").value||100),placements_value:placements,scope_type_value:scope,region_value:scope==="region"?$("campaignRegion").value:null,organization_value:scope==="organization"?$("campaignOrganization").value:null,team_value:scope==="team"?$("campaignTeam").value:null,series_value:scope==="weekend"?$("campaignSeries").value:null,game_value:scope==="game"?$("campaignGame").value:null,tournament_value:scope==="tournament"?$("campaignTournament").value:null,event_tier_value:$("campaignTier").value,commercial_model_value:$("campaignModel").value,contract_value_cents_value:cents($("campaignValue").value),payment_status_value:$("campaignPayment").value,impression_cap_value:$("campaignCap").value?Number($("campaignCap").value):null,notes_value:$("campaignNotes").value||null};const {error}=await backend.client.rpc("live_ad_admin_save_campaign_v1",params);if(error)throw error;$("campaignStatusText").textContent="Campaign saved. Paid/Waived approved campaigns can serve automatically within their scope.";await refresh();}catch(err){$("campaignStatusText").textContent=err.message||String(err);}});
$("activateHouseValidation").addEventListener("click",async()=>{try{$("houseValidationStatus").textContent="Activating safe WPI house test…";const {data,error}=await backend.client.rpc("live_ad_admin_provision_house_validation_v1");if(error)throw error;$("houseValidationStatus").textContent=`Active for 24 hours · campaign ${data?.campaignId||"ready"}. Open a free Live score, free recap and event results page to validate all three placements.`;await refresh();}catch(err){$("houseValidationStatus").textContent=err.message||String(err);}});
$("campaignTable").addEventListener("click",async e=>{const b=e.target.closest(".campaign-toggle");if(!b)return;try{b.disabled=true;const {error}=await backend.client.rpc("live_ad_admin_set_campaign_status_v1",{target_campaign_id:b.dataset.campaignId,desired_status:b.dataset.nextStatus});if(error)throw error;await refresh();}catch(err){alert(err.message||err);}finally{b.disabled=false;}});
$("campaignAdvertiser").addEventListener("change",fillOptions);$("campaignOrganization").addEventListener("change",fillOptions);$("campaignScope").addEventListener("change",scopeVisibility);$("refreshCommercial").addEventListener("click",()=>refresh().catch(e=>alert(e.message||e)));$("commercialSignOut").addEventListener("click",async()=>{try{await backend?.signOut();}finally{location.replace("live-login.html");}});
defaultPreviewWindow(true);scopeVisibility();previewScopeVisibility();init();
})();
