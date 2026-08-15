/* WPI 7.60.1 — Self-Service Club Onboarding
 * Request -> Platform Owner review -> Club + first Team creation.
 * No request creates authority before approval; branding activation stays separate.
 */
(() => {
  "use strict";

  const RELEASE = "7.60.1";
  const config = window.WPI_LIVE_SANDBOX_CONFIG || {};
  const registry = window.WPILiveClubThemeRegistry7600 || {clubs:[]};
  const clubs = Array.isArray(registry.clubs) ? registry.clubs : [];
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[ch]);
  const normalize = value => String(value || "").trim().toLowerCase().replace(/\s+/g," ");

  let backend = null;
  let session = null;
  let context = {isPlatformOwner:false,myRequests:[],reviewQueue:[],claimedCanonicalClubIds:[],pendingCanonicalClubIds:[]};
  let selectedClub = null;
  let unlistedMode = false;

  function claimedSet(){ return new Set((context.claimedCanonicalClubIds || []).map(String)); }
  function pendingSet(){ return new Set((context.pendingCanonicalClubIds || []).map(String)); }

  function candidateState(club){
    if (claimedSet().has(String(club.clubId))) return {key:"claimed",label:"Already on Live"};
    if (pendingSet().has(String(club.clubId))) return {key:"pending",label:"Review pending"};
    return {key:"available",label:"Available"};
  }

  function clubSearchText(club){
    return [club.label,club.shortLabel,club.slug,...(club.aliases || [])].filter(Boolean).join(" ").toLowerCase();
  }

  function renderCandidates(){
    const target = $("clubCandidateList");
    if (!target) return;
    const q = normalize($("clubCandidateSearch")?.value || "");
    const rows = clubs.filter(club => !q || clubSearchText(club).includes(q)).slice(0, q ? 40 : 18);
    target.innerHTML = rows.length ? rows.map(club => {
      const state = candidateState(club);
      const pressed = selectedClub?.clubId === club.clubId && !unlistedMode;
      return `<button class="live-club-candidate" type="button" data-club-id="${esc(club.clubId)}" aria-pressed="${pressed}">
        <img src="${esc(club.logo || 'assets/branding/wpi-logo-mark.png')}" alt="" onerror="this.onerror=null;this.src='assets/branding/wpi-logo-mark.png'">
        <span><strong>${esc(club.label || club.shortLabel || club.slug)}</strong><small>${esc(club.shortLabel || club.slug || "Canonical WPI club")}</small></span>
        <em data-state="${esc(state.key)}">${esc(state.label)}</em>
      </button>`;
    }).join("") : '<p class="live-onboarding-empty">No WPI clubs match that search. Use the unlisted-club option below if this is truly a new identity.</p>';
  }

  function suggestedTeamName(){
    const age = $("onboardingAgeGroup")?.value || "14U";
    const gender = $("onboardingGender")?.value || "Boys";
    const squad = String($("onboardingSquad")?.value || "").trim();
    const base = unlistedMode
      ? String($("customClubName")?.value || "").trim()
      : (selectedClub?.shortLabel || selectedClub?.label || "").trim();
    if (!base) return "";
    return [base,squad,age,gender].filter(Boolean).join(" ");
  }

  function syncSuggestedTeamName(force=false){
    const input = $("onboardingTeamName");
    if (!input) return;
    const next = suggestedTeamName();
    if (!next) return;
    if (force || !input.value.trim() || input.dataset.autoName === "true") {
      input.value = next;
      input.dataset.autoName = "true";
    }
  }

  function renderSelectedClub(){
    const preview = $("selectedClubPreview");
    const custom = $("customClubNameLabel");
    if (!preview) return;
    if (unlistedMode) {
      preview.hidden = false;
      custom.hidden = false;
      $("selectedClubLogo").src = "assets/branding/wpi-logo-mark.png";
      $("selectedClubState").textContent = "New / unlisted club request";
      $("selectedClubName").textContent = $("customClubName")?.value.trim() || "Enter the club name below";
      $("selectedClubIdentity").textContent = "WPI will not create a public canonical identity automatically. The Platform Owner will review this as a new/unlisted club.";
      $("selectedClubSwatches").innerHTML = "";
      syncSuggestedTeamName();
      return;
    }
    custom.hidden = true;
    if (!selectedClub) {
      preview.hidden = true;
      return;
    }
    preview.hidden = false;
    const state = candidateState(selectedClub);
    $("selectedClubLogo").src = selectedClub.logo || "assets/branding/wpi-logo-mark.png";
    $("selectedClubState").textContent = state.key === "available" ? "Canonical WPI club" : state.label;
    $("selectedClubName").textContent = selectedClub.label || selectedClub.shortLabel || "WPI club";
    $("selectedClubIdentity").textContent = `${selectedClub.clubId} · ${state.key === 'available' ? 'identity available to request' : state.label}`;
    const primary = selectedClub.canonicalPrimary || selectedClub.theme?.primary;
    const secondary = selectedClub.canonicalSecondary || selectedClub.theme?.accent;
    $("selectedClubSwatches").innerHTML = [
      primary ? `<span><i style="background:${esc(primary)}"></i>Primary ${esc(primary)}</span>` : "",
      secondary ? `<span><i style="background:${esc(secondary)}"></i>Secondary ${esc(secondary)}</span>` : ""
    ].join("");
    syncSuggestedTeamName();
  }

  function selectClub(clubId){
    const club = clubs.find(row => String(row.clubId) === String(clubId));
    if (!club) return;
    const state = candidateState(club);
    selectedClub = club;
    unlistedMode = false;
    if (state.key !== "available") {
      message(state.key === "claimed" ? "That club already has a WPI Live workspace." : "That club already has a pending onboarding request.","error");
    } else message("","");
    renderCandidates();
    renderSelectedClub();
  }

  function useUnlistedClub(){
    selectedClub = null;
    unlistedMode = true;
    message("Use this only when the club truly is not in the WPI directory. WPI will review the identity before creating anything.","");
    renderCandidates();
    renderSelectedClub();
    $("customClubName")?.focus();
  }

  function message(text,state=""){
    const el = $("clubOnboardingMessage");
    if (!el) return;
    el.textContent = text || "";
    if (state) el.dataset.state = state; else delete el.dataset.state;
  }

  function statusCard(row){
    const club = row.clubDisplayName || row.clubName || "Club onboarding";
    const meta = [row.initialTeamName,row.competitiveSeason,row.canonicalWpiClubId ? "Canonical WPI identity" : "Unlisted identity"].filter(Boolean);
    const approved = row.status === "approved" && row.approvedTeamId;
    return `<article class="live-request-card">
      <header><div><h3>${esc(club)}</h3><small>${esc(row.createdAt ? new Date(row.createdAt).toLocaleString() : "")}</small></div><span class="live-status-pill" data-status="${esc(row.status)}">${esc(row.status)}</span></header>
      <div class="live-request-meta">${meta.map(value => `<span>${esc(value)}</span>`).join("")}</div>
      ${row.reviewNotes ? `<p class="live-panel-help"><strong>Review note:</strong> ${esc(row.reviewNotes)}</p>` : ""}
      <footer>${row.status === "pending" ? `<button type="button" data-withdraw-request="${esc(row.requestId)}">Withdraw request</button>` : ""}${approved ? `<a href="live-dashboard.html?team=${encodeURIComponent(row.approvedTeamId)}">Open first team</a>` : ""}</footer>
    </article>`;
  }

  function renderMyRequests(){
    const rows = Array.isArray(context.myRequests) ? context.myRequests : [];
    $("myOnboardingRequests").innerHTML = rows.length ? rows.map(statusCard).join("") : '<p class="live-onboarding-empty">No club onboarding requests yet.</p>';
  }

  function reviewCard(row){
    const colors = [row.primaryColor,row.secondaryColor].filter(Boolean);
    return `<article class="live-review-card">
      <header><div><h3>${esc(row.clubDisplayName || row.clubName)}</h3><small>${esc(row.requesterDisplayName || row.requesterEmail)} · ${esc(row.requesterEmail || "")}</small></div><span class="live-status-pill" data-status="pending">pending</span></header>
      <div class="live-request-meta"><span>${esc(row.canonicalWpiClubId || "New / unlisted identity")}</span><span>${esc(row.initialTeamName || "First team")}</span><span>${esc([row.ageGroup,row.gender,row.squadLabel].filter(Boolean).join(" "))}</span><span>${esc(row.competitiveSeason || "")}</span>${row.region ? `<span>${esc(row.region)}</span>` : ""}</div>
      <div class="live-selected-club" style="margin-top:10px"><div class="live-selected-club-main"><img src="${esc(row.logoUrl || 'assets/branding/wpi-logo-mark.png')}" alt="" onerror="this.onerror=null;this.src='assets/branding/wpi-logo-mark.png'"><div><strong>Identity snapshot</strong><p>${esc(row.canonicalSlug || "No canonical slug yet")}</p><div class="live-brand-swatches">${colors.map((color,i) => `<span><i style="background:${esc(color)}"></i>${i ? 'Secondary' : 'Primary'} ${esc(color)}</span>`).join("")}</div></div></div></div>
      <label style="display:block;margin-top:10px;font-size:12px;font-weight:800;color:#34516b">Review note<textarea class="live-review-notes" rows="2" data-review-note="${esc(row.requestId)}" placeholder="Optional note to requester"></textarea></label>
      <footer><button type="button" data-action="reject" data-review-request="${esc(row.requestId)}">Reject</button><button type="button" data-action="approve" data-review-request="${esc(row.requestId)}">Approve club + first team</button></footer>
    </article>`;
  }

  function renderReviewQueue(){
    const shell = $("platformReviewShell");
    if (!context.isPlatformOwner) { shell.hidden = true; return; }
    shell.hidden = false;
    const rows = Array.isArray(context.reviewQueue) ? context.reviewQueue : [];
    $("platformReviewQueue").innerHTML = rows.length ? rows.map(reviewCard).join("") : '<p class="live-onboarding-empty">No club onboarding requests need review.</p>';
  }

  async function loadContext(){
    const {data,error} = await backend.client.rpc("live_club_onboarding_context_v1");
    if (error) throw error;
    context = data || context;
    renderCandidates();
    renderSelectedClub();
    renderMyRequests();
    renderReviewQueue();
  }

  async function submitRequest(event){
    event.preventDefault();
    if (!backend || !session) return;
    const customName = String($("customClubName")?.value || "").trim();
    const club = unlistedMode ? null : selectedClub;
    if (!unlistedMode && !club) { message("Choose a WPI club or use the unlisted-club option.","error"); return; }
    if (club && candidateState(club).key !== "available") { message("That club cannot be requested right now.","error"); return; }
    if (unlistedMode && !customName) { message("Enter the unlisted club name.","error"); return; }
    const teamName = String($("onboardingTeamName")?.value || "").trim();
    if (!teamName) { message("Enter the first team name.","error"); return; }

    const submit = $("submitOnboardingButton");
    submit.disabled = true;
    message("Submitting club onboarding request…","");
    try {
      const displayName = club?.label || customName;
      const {data,error} = await backend.client.rpc("live_submit_club_onboarding_request_v1", {
        requested_canonical_wpi_club_id:club?.clubId || null,
        requested_canonical_slug:club?.slug || null,
        requested_club_name:club?.shortLabel || displayName,
        requested_display_name:displayName,
        requested_logo_url:club?.logo || null,
        requested_region:String($("onboardingRegion")?.value || "").trim() || null,
        requested_primary_color:club?.canonicalPrimary || club?.theme?.primary || null,
        requested_secondary_color:club?.canonicalSecondary || club?.theme?.accent || null,
        requested_initial_team_name:teamName,
        requested_age_group:$("onboardingAgeGroup")?.value || "14U",
        requested_gender:$("onboardingGender")?.value || "Boys",
        requested_squad_label:String($("onboardingSquad")?.value || "").trim() || null,
        requested_season:String($("onboardingSeason")?.value || "2026-2027").trim()
      });
      if (error) throw error;
      message(data?.message || "Onboarding request submitted for review.","success");
      await loadContext();
    } catch (error) {
      message(error.message || "Onboarding request could not be submitted.","error");
    } finally { submit.disabled = false; }
  }

  async function withdrawRequest(requestId){
    if (!confirm("Withdraw this pending club onboarding request?")) return;
    const {error} = await backend.client.rpc("live_withdraw_club_onboarding_request_v1", {target_request_id:requestId});
    if (error) { message(error.message,"error"); return; }
    message("Onboarding request withdrawn.","success");
    await loadContext();
  }

  async function reviewRequest(requestId,decision){
    if (!context.isPlatformOwner) return;
    const row = (context.reviewQueue || []).find(item => String(item.requestId) === String(requestId));
    if (!row) return;
    const verb = decision === "approve" ? "Approve" : "Reject";
    const detail = decision === "approve"
      ? `${verb} ${row.clubDisplayName || row.clubName} and create ${row.initialTeamName} with the requester as Owner?`
      : `${verb} the onboarding request for ${row.clubDisplayName || row.clubName}?`;
    if (!confirm(detail)) return;
    const note = document.querySelector(`[data-review-note="${CSS.escape(String(requestId))}"]`)?.value || "";
    try {
      const {data,error} = await backend.client.rpc("live_review_club_onboarding_request_v1", {target_request_id:requestId,review_decision:decision,reviewer_notes:note.trim() || null});
      if (error) throw error;
      message(decision === "approve" ? `Approved. ${data?.teamName || "The first team"} is ready for its Owner.` : "Onboarding request rejected.","success");
      await loadContext();
    } catch (error) { message(error.message || "Review action failed.","error"); }
  }

  function resetForm(){
    selectedClub = null;
    unlistedMode = false;
    $("clubCandidateSearch").value = "";
    $("customClubName").value = "";
    $("onboardingRegion").value = "";
    $("onboardingAgeGroup").value = "14U";
    $("onboardingGender").value = "Boys";
    $("onboardingSquad").value = "";
    $("onboardingSeason").value = "2026-2027";
    $("onboardingTeamName").value = "";
    delete $("onboardingTeamName").dataset.autoName;
    message("","");
    renderCandidates();
    renderSelectedClub();
  }

  async function signOut(){
    if (backend) await backend.signOut();
    window.location.assign("live-login.html?onboard=1");
  }

  async function init(){
    document.body.dataset.liveClubOnboardingRelease = RELEASE;
    renderCandidates();
    if (!window.WPILiveBackend?.isConfigured(config)) {
      $("onboardingSignedOut").hidden = false;
      $("onboardingSignedOut").querySelector("h2").textContent = "WPI Live is unavailable";
      return;
    }
    try {
      backend = await window.WPILiveBackend.connect(config);
      session = await backend.session();
      if (!session || backend.isAnonymousUser(session.user)) {
        if (session && backend.isAnonymousUser(session.user)) await backend.signOut();
        $("onboardingSignedOut").hidden = false;
        return;
      }
      $("onboardingConnected").hidden = false;
      await loadContext();
    } catch (error) {
      $("onboardingSignedOut").hidden = false;
      $("onboardingSignedOut").querySelector("h2").textContent = "Club onboarding could not connect";
      $("onboardingSignedOut").querySelector("p").textContent = error.message || "Connection failed.";
    }
  }

  $("clubCandidateSearch")?.addEventListener("input", renderCandidates);
  $("clearClubCandidateButton")?.addEventListener("click", () => { $("clubCandidateSearch").value=""; renderCandidates(); });
  $("clubCandidateList")?.addEventListener("click", event => { const button=event.target.closest("[data-club-id]"); if(button) selectClub(button.dataset.clubId); });
  $("useUnlistedClubButton")?.addEventListener("click", useUnlistedClub);
  $("customClubName")?.addEventListener("input", () => { renderSelectedClub(); syncSuggestedTeamName(); });
  ["onboardingAgeGroup","onboardingGender","onboardingSquad"].forEach(id => $(id)?.addEventListener("input", () => syncSuggestedTeamName()));
  $("onboardingTeamName")?.addEventListener("input", event => { event.currentTarget.dataset.autoName = "false"; });
  $("clubOnboardingForm")?.addEventListener("submit", submitRequest);
  $("resetOnboardingButton")?.addEventListener("click", resetForm);
  $("myOnboardingRequests")?.addEventListener("click", event => { const button=event.target.closest("[data-withdraw-request]"); if(button) withdrawRequest(button.dataset.withdrawRequest); });
  $("platformReviewQueue")?.addEventListener("click", event => { const button=event.target.closest("[data-review-request]"); if(button) reviewRequest(button.dataset.reviewRequest,button.dataset.action); });
  $("onboardingSignOutButton")?.addEventListener("click", signOut);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
