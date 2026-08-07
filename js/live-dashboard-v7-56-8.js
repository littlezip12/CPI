/* WPI 7.56.8 — scoped team operations, GroupMe administration, and game-scoped scorer control. */
(() => {
  "use strict";
  const config = window.WPI_LIVE_SANDBOX_CONFIG || {};
  const $ = id => document.getElementById(id);
  let backend = null;
  let workspace = null;
  let games = [];
  let destination = null;
  let deliverySummary = {sent:0,failed:0,pending:0,suppressed:0};
  let scorerCodeGameId = null;
  let scorerCodePreview = null;
  let groupMeGroups = [];
  let groupMeTopics = [];

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
  }

  function formatScore(game) {
    const team = Number(game.team_score || 0).toFixed(Number(game.team_score || 0) % 1 ? 1 : 0);
    const opponent = Number(game.opponent_score || 0).toFixed(Number(game.opponent_score || 0) % 1 ? 1 : 0);
    return `${team}–${opponent}`;
  }

  function renderGames() {
    $("dashboardGameCount").textContent = String(games.length);
    const latestActive = games.find(game => game.status !== "final" && game.status !== "cancelled");
    $("continueLatestGameButton").hidden = !latestActive;
    $("enterScorerCodeButton").hidden = !latestActive;
    if (latestActive) {
      $("continueLatestGameButton").onclick = () => window.location.assign(`live-sandbox.html?game=${encodeURIComponent(latestActive.id)}`);
      $("enterScorerCodeButton").onclick = () => openScorerCodeDialog(latestActive.id);
    }

    if (!games.length) {
      $("gameHistoryList").innerHTML = '<p class="live-empty-state">No connected games yet. Create a manual scrimmage to begin the permanent history.</p>';
      return;
    }
    $("gameHistoryList").innerHTML = games.map(game => {
      const date = game.scheduled_at ? new Date(game.scheduled_at).toLocaleString([], {month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}) : "Date not set";
      const label = game.status === "final" ? "Final" : game.status === "live" ? "Live / in progress" : "Setup";
      return `<article class="live-history-row">
        <div><strong>${escapeHtml(game.team_name_snapshot)} vs ${escapeHtml(game.opponent_name)}</strong><span>${escapeHtml(date)}${game.venue ? ` · ${escapeHtml(game.venue)}` : ""}</span></div>
        <div class="live-history-score"><strong>${formatScore(game)}</strong><span>${label}</span></div>
        <div class="live-dashboard-actions"><a href="live-sandbox.html?game=${encodeURIComponent(game.id)}">${game.status === "final" ? "Review" : "Open"}</a>${game.status === "final" || game.status === "cancelled" ? "" : `<button type="button" data-scorer-code-game="${game.id}">Enter scorer code</button>`}</div>
      </article>`;
    }).join("");
    document.querySelectorAll("[data-scorer-code-game]").forEach(button => {
      button.addEventListener("click", () => openScorerCodeDialog(button.dataset.scorerCodeGame));
    });
  }

  function defaultScorerName() {
    return workspace?.scorerDisplayName || backend?.user?.user_metadata?.display_name || backend?.user?.email?.split("@")[0] || "";
  }

  function openScorerCodeDialog(gameId) {
    scorerCodeGameId = gameId;
    scorerCodePreview = null;
    $("dashboardScorerCode").value = "";
    $("dashboardScorerDisplayName").value = defaultScorerName();
    $("dashboardScorerPreview").hidden = true;
    $("dashboardScorerPreview").innerHTML = "";
    $("dashboardScorerCodeMessage").textContent = "Enter the code supplied by the current scorer.";
    $("dashboardAcceptScorerCodeButton").disabled = false;
    $("dashboardScorerCodeDialog").showModal();
    setTimeout(() => $("dashboardScorerCode").focus(), 0);
  }

  async function previewScorerCode() {
    const code = $("dashboardScorerCode").value.replace(/\D/g, "").slice(0,6);
    $("dashboardScorerCode").value = code;
    if (code.length !== 6 || !scorerCodeGameId) {
      $("dashboardScorerCodeMessage").textContent = "Enter the six-digit code.";
      return;
    }
    $("dashboardPreviewScorerCodeButton").disabled = true;
    $("dashboardScorerCodeMessage").textContent = "Checking scorer code…";
    try {
      scorerCodePreview = await backend.previewScorerHandoff({code, gameId: scorerCodeGameId});
      $("dashboardScorerPreview").hidden = false;
      $("dashboardScorerPreview").innerHTML = `<strong>${escapeHtml(scorerCodePreview.teamName)} vs ${escapeHtml(scorerCodePreview.opponentName)}</strong><p>${formatScore({team_score:scorerCodePreview.teamScore,opponent_score:scorerCodePreview.opponentScore})} · Q${Number(scorerCodePreview.quarter || 1)}</p><p>Current scorer: ${escapeHtml(scorerCodePreview.activeScorer || "Not assigned")}</p>`;
      $("dashboardScorerCodeMessage").textContent = `Valid until ${new Date(scorerCodePreview.expiresAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}.`;
      $("dashboardAcceptScorerCodeButton").disabled = false;
    } catch (error) {
      scorerCodePreview = null;
      $("dashboardScorerPreview").hidden = true;
      $("dashboardAcceptScorerCodeButton").disabled = false;
      $("dashboardScorerCodeMessage").textContent = error.message || "The scorer code is unavailable.";
    } finally {
      $("dashboardPreviewScorerCodeButton").disabled = false;
    }
  }

  async function acceptScorerCode() {
    const code = $("dashboardScorerCode").value.replace(/\D/g, "").slice(0,6);
    const displayName = $("dashboardScorerDisplayName").value.trim();
    $("dashboardScorerCode").value = code;
    if (code.length !== 6 || !scorerCodeGameId) {
      $("dashboardScorerCodeMessage").textContent = "Enter the six-digit code.";
      return;
    }
    if (!displayName) {
      $("dashboardScorerCodeMessage").textContent = "Enter the scorer name.";
      return;
    }
    $("dashboardAcceptScorerCodeButton").disabled = true;
    $("dashboardScorerCodeMessage").textContent = "Checking code and transferring scoring control…";
    try {
      scorerCodePreview = await backend.previewScorerHandoff({code, gameId:scorerCodeGameId});
      const result = await backend.acceptScorerHandoff({code, gameId:scorerCodeGameId, displayName});
      window.location.assign(`live-sandbox.html?game=${encodeURIComponent(result.gameId)}`);
    } catch (error) {
      $("dashboardScorerCodeMessage").textContent = error.message || "Scoring control could not be transferred.";
      $("dashboardAcceptScorerCodeButton").disabled = false;
    }
  }

  async function loadGames() {
    games = await backend.listGames(workspace.teamId);
    renderGames();
  }

  function currentGroupMeMode() {
    return $("groupMeDeliveryMode").value === "bot" ? "bot" : "topic";
  }

  function currentGroupMeSecretName() {
    return workspace?.role === "owner" ? $("groupMeSecretName").value.trim() : null;
  }

  function selectedGroupMeGroup() {
    const id = $("groupMeGroupSelect").value;
    return groupMeGroups.find(group => String(group.id) === String(id)) || (
      destination?.groupme_group_id === id
        ? {id, name: destination.groupme_group_name || "Selected GroupMe"}
        : null
    );
  }

  function selectedGroupMeTopic() {
    const id = $("groupMeTopicSelect").value;
    return groupMeTopics.find(topic => String(topic.id) === String(id)) || (
      destination?.groupme_topic_id === id
        ? {id, name: destination.groupme_topic_name || "Selected topic"}
        : null
    );
  }

  function resetSelect(select, placeholder) {
    select.innerHTML = "";
    const option = document.createElement("option");
    option.value = "";
    option.textContent = placeholder;
    select.appendChild(option);
  }

  function groupLabel(group) {
    if (!group?.createdAt) return group.name;
    const created = new Date(Number(group.createdAt) * 1000);
    const date = Number.isNaN(created.getTime())
      ? ""
      : created.toLocaleString([], {month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
    return date ? `${group.name} · ${date}` : group.name;
  }

  function populateGroupMeGroups(selectedId = null) {
    const select = $("groupMeGroupSelect");
    resetSelect(select, groupMeGroups.length ? "Choose a GroupMe" : "No groups loaded");
    groupMeGroups.forEach(group => {
      const option = document.createElement("option");
      option.value = String(group.id);
      option.textContent = groupLabel(group);
      select.appendChild(option);
    });
    const savedId = selectedId || destination?.groupme_group_id || "";
    if (savedId && !groupMeGroups.some(group => String(group.id) === String(savedId))) {
      const option = document.createElement("option");
      option.value = String(savedId);
      option.textContent = destination?.groupme_group_name || "Saved GroupMe";
      select.appendChild(option);
    }
    select.value = savedId && [...select.options].some(option => option.value === String(savedId)) ? String(savedId) : "";
    select.disabled = !groupMeGroups.length && !select.value;
  }

  function populateGroupMeTopics(selectedId = null) {
    const select = $("groupMeTopicSelect");
    resetSelect(select, groupMeTopics.length ? "Choose a topic" : "No topics loaded");
    groupMeTopics.forEach(topic => {
      const option = document.createElement("option");
      option.value = String(topic.id);
      option.textContent = topic.name;
      select.appendChild(option);
    });
    const savedId = selectedId || destination?.groupme_topic_id || "";
    if (savedId && !groupMeTopics.some(topic => String(topic.id) === String(savedId))) {
      const option = document.createElement("option");
      option.value = String(savedId);
      option.textContent = destination?.groupme_topic_name || "Saved topic";
      select.appendChild(option);
    }
    select.value = savedId && [...select.options].some(option => option.value === String(savedId)) ? String(savedId) : "";
    select.disabled = !$("groupMeGroupSelect").value || (!groupMeTopics.length && !select.value);
  }

  function renderGroupMeMode() {
    const mode = currentGroupMeMode();
    const owner = workspace?.role === "owner";
    const canManage = ["owner","admin"].includes(workspace?.role);
    $("groupMeTopicPanel").hidden = mode !== "topic";
    $("groupMeDeliveryMode").disabled = !owner;
    $("loadGroupMeGroupsButton").hidden = !owner;
    $("loadGroupMeGroupsButton").disabled = !owner;
    $("loadGroupMeTopicsButton").hidden = mode !== "topic";
    $("groupMeSecretName").placeholder = mode === "topic"
      ? "GROUPME_ACCESS_TOKEN_WPI_LIVE"
      : "GROUPME_BOT_ID_TEAM";
    if (mode === "topic") {
      populateGroupMeGroups(destination?.groupme_group_id || null);
      populateGroupMeTopics(destination?.groupme_topic_id || null);
      if (!owner) $("groupMeGroupSelect").disabled = true;
      $("loadGroupMeTopicsButton").disabled = !canManage || !$("groupMeGroupSelect").value;
    }
  }

  function renderGroupMe() {
    const canManage = workspace && ["owner","admin"].includes(workspace.role);
    $("groupMeAdminPanel").hidden = !canManage;
    $("groupMeReadOnly").hidden = canManage;

    if (destination) {
      $("groupMeDisplayName").value = destination.display_name || "WPI Live Scoring Test";
      $("groupMeDeliveryMode").value = destination.delivery_mode === "topic" ? "topic" : "bot";
      if (workspace.role === "owner") {
        $("groupMeSecretName").value = destination.secret_name || (
          destination.delivery_mode === "topic" ? "GROUPME_ACCESS_TOKEN_WPI_LIVE" : "GROUPME_BOT_ID"
        );
      }
      $("groupMeEnabled").checked = Boolean(destination.enabled);
      $("testGroupMeButton").disabled = !canManage;
      $("dashboardDeliveryMetric").textContent = !destination.enabled
        ? "Connection paused"
        : destination.last_test_status === "sent"
          ? destination.delivery_mode === "topic" ? "GroupMe topic connected" : "GroupMe connected"
          : destination.last_test_status === "failed"
            ? "GroupMe needs attention"
            : "Configured — test required";

      const tested = destination.last_tested_at
        ? new Date(destination.last_tested_at).toLocaleString([], {month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})
        : "Not tested yet";
      const destinationLabel = destination.delivery_mode === "topic"
        ? `${destination.groupme_group_name || destination.display_name} → ${destination.groupme_topic_name || "Topic"}`
        : destination.display_name;

      $("groupMeSetupMessage").textContent = destination.last_test_status === "sent"
        ? `Test message sent · ${tested}`
        : destination.last_test_status === "failed"
          ? `Last test failed · ${destination.last_test_error || tested}`
          : `Saved · ${tested}`;
      $("groupMeReadOnly").textContent = `${destinationLabel} · ${destination.enabled ? "connected" : "paused"}`;
    } else {
      $("groupMeDeliveryMode").value = "topic";
      $("dashboardDeliveryMetric").textContent = "Not connected";
      $("testGroupMeButton").disabled = true;
      $("groupMeSetupMessage").textContent = canManage
        ? "Topic delivery is preferred. Configure the server-side GroupMe access-token secret, load groups, choose a topic, then save and test."
        : "No GroupMe destination is connected yet.";
      $("groupMeReadOnly").textContent = "No GroupMe destination is connected yet.";
    }

    $("loadGroupMeGroupsButton").disabled = !canManage;
    renderGroupMeMode();
    $("groupMeAudit").hidden = false;
    $("deliverySentCount").textContent = String(deliverySummary.sent || 0);
    $("deliveryFailedCount").textContent = String(deliverySummary.failed || 0);
    $("deliveryPendingCount").textContent = String(deliverySummary.pending || 0);
  }

  async function loadGroupMe() {
    destination = await backend.loadGroupMeDestination(workspace.teamId);
    deliverySummary = await backend.groupMeDeliverySummary(workspace.teamId);
    renderGroupMe();
  }

  async function loadGroupMeTopics() {
    if (currentGroupMeMode() !== "topic") return;
    const group = selectedGroupMeGroup();
    if (!group?.id) {
      groupMeTopics = [];
      populateGroupMeTopics();
      $("groupMeDiscoveryMessage").textContent = "Choose a GroupMe first.";
      return;
    }

    $("groupMeTopicSelect").disabled = true;
    $("loadGroupMeTopicsButton").disabled = true;
    $("groupMeDiscoveryMessage").textContent = `Loading topics from ${group.name}…`;
    try {
      groupMeTopics = await backend.discoverGroupMeTopics(
        workspace.teamId,
        group.id,
        currentGroupMeSecretName()
      );
      populateGroupMeTopics(
        destination?.groupme_group_id === String(group.id) ? destination?.groupme_topic_id : null
      );
      if (groupMeTopics.length === 1 && !$("groupMeTopicSelect").value) {
        $("groupMeTopicSelect").value = String(groupMeTopics[0].id);
      }
      $("groupMeDiscoveryMessage").textContent = groupMeTopics.length
        ? `Found ${groupMeTopics.length} topic${groupMeTopics.length === 1 ? "" : "s"}. Choose where WPI score updates should go.`
        : "No topics were returned for this GroupMe.";
    } catch (error) {
      groupMeTopics = [];
      populateGroupMeTopics();
      $("groupMeDiscoveryMessage").textContent = error.message || "GroupMe topics could not be loaded.";
    } finally {
      $("loadGroupMeTopicsButton").disabled = !$("groupMeGroupSelect").value;
    }
  }

  async function loadGroupMeGroups() {
    if (currentGroupMeMode() !== "topic") return;
    if (workspace?.role !== "owner") {
      $("groupMeDiscoveryMessage").textContent = "Only the Team Owner may browse the connected GroupMe account's groups.";
      return;
    }
    $("loadGroupMeGroupsButton").disabled = true;
    $("groupMeDiscoveryMessage").textContent = "Loading GroupMe groups securely…";
    try {
      groupMeGroups = await backend.discoverGroupMeGroups(
        workspace.teamId,
        currentGroupMeSecretName()
      );
      populateGroupMeGroups(destination?.groupme_group_id || null);
      groupMeTopics = [];
      populateGroupMeTopics(destination?.groupme_topic_id || null);
      $("groupMeDiscoveryMessage").textContent = groupMeGroups.length
        ? `Found ${groupMeGroups.length} GroupMe${groupMeGroups.length === 1 ? "" : "s"}. Choose the tournament/group, then select its topic.`
        : "No GroupMe groups were returned for this account.";
      if ($("groupMeGroupSelect").value) await loadGroupMeTopics();
    } catch (error) {
      groupMeGroups = [];
      groupMeTopics = [];
      populateGroupMeGroups();
      populateGroupMeTopics();
      $("groupMeDiscoveryMessage").textContent = error.message || "GroupMe groups could not be loaded.";
    } finally {
      $("loadGroupMeGroupsButton").disabled = false;
    }
  }

  async function saveGroupMe() {
    const mode = currentGroupMeMode();
    const group = mode === "topic" ? selectedGroupMeGroup() : null;
    const topic = mode === "topic" ? selectedGroupMeTopic() : null;

    if (mode === "topic" && $("groupMeEnabled").checked && (!group?.id || !topic?.id)) {
      $("groupMeSetupMessage").textContent = "Choose both the GroupMe and topic before enabling Topic delivery.";
      return;
    }

    $("saveGroupMeButton").disabled = true;
    $("groupMeSetupMessage").textContent = "Saving GroupMe destination…";
    try {
      destination = await backend.saveGroupMeDestination(
        workspace.teamId,
        $("groupMeDisplayName").value.trim(),
        currentGroupMeSecretName(),
        $("groupMeEnabled").checked,
        {
          mode,
          groupId: group?.id || null,
          groupName: group?.name || null,
          topicId: topic?.id || null,
          topicName: topic?.name || null
        }
      );
      $("groupMeSetupMessage").textContent = mode === "topic"
        ? "Topic destination saved. Send a test message before using it during a game."
        : "Bot destination saved. Send a test message before using it during a game.";
      renderGroupMe();
    } catch (error) {
      $("groupMeSetupMessage").textContent = error.message;
    } finally {
      $("saveGroupMeButton").disabled = false;
    }
  }

  async function testGroupMe() {
    if (!destination?.id) {
      $("groupMeSetupMessage").textContent = "Save the GroupMe destination before testing it.";
      return;
    }
    $("testGroupMeButton").disabled = true;
    const target = destination.delivery_mode === "topic" && destination.groupme_topic_name
      ? ` → ${destination.groupme_topic_name}`
      : "";
    $("groupMeSetupMessage").textContent = `Sending WPI Live test message${target}…`;
    try {
      await backend.testGroupMeDestination(
        destination.id,
        `WPI Live test: ${workspace.teamName} is connected and ready for parent game updates.`
      );
      destination = await backend.loadGroupMeDestination(workspace.teamId);
      $("groupMeSetupMessage").textContent = destination.delivery_mode === "topic"
        ? `Test message sent successfully to ${destination.groupme_topic_name}.`
        : "Test message sent successfully.";
      renderGroupMe();
    } catch (error) {
      const message = error.message || "GroupMe test failed";
      destination = await backend.loadGroupMeDestination(workspace.teamId).catch(() => destination);
      renderGroupMe();
      $("groupMeSetupMessage").textContent = `Test failed: ${message}`;
    } finally {
      $("testGroupMeButton").disabled = false;
    }
  }

  async function createInvite() {
    const email = $("inviteEmail").value.trim();
    const role = $("inviteRole").value;
    if (!email) {
      $("inviteMessage").textContent = "Enter the email address to invite.";
      return;
    }
    $("createInviteButton").disabled = true;
    $("inviteMessage").textContent = "Creating invite…";
    try {
      const invite = await backend.createInvite(workspace.teamId, email, role);
      const url = `${window.location.origin}${window.location.pathname.replace(/live-dashboard\.html$/, "live-login.html")}?invite=${encodeURIComponent(invite.token)}`;
      $("inviteResult").hidden = false;
      $("inviteResult").innerHTML = `<strong>Invite ready</strong><p>Send this private link to ${escapeHtml(email)}:</p><code>${escapeHtml(url)}</code><p>The invite expires ${new Date(invite.expiresAt).toLocaleDateString()}.</p>`;
      $("inviteMessage").textContent = "Invite created. Email delivery is not automated in this foundation release.";
    } catch (error) {
      $("inviteMessage").textContent = error.message;
    } finally {
      $("createInviteButton").disabled = false;
    }
  }

  async function init() {
    $("liveDashboardApp").hidden = false;
    if (!window.WPILiveBackend?.isConfigured(config)) {
      let demoSession = null;
      try { demoSession = JSON.parse(localStorage.getItem("wpi-live-auth-v7-56-8") || localStorage.getItem("wpi-live-auth-v7-56-3") || localStorage.getItem("wpi-live-auth-v7-56-1") || "null"); } catch (_) { demoSession = null; }
      if (!demoSession || demoSession.environment !== "sandbox") { window.location.replace("live-login.html"); return; }
      $("dashboardDemoPanel").hidden = false;
      $("dashboardConnectionLabel").textContent = "Local demo mode";
      $("dashboardConnectionDetail").textContent = "No connected Supabase project is configured yet.";
      $("dashboardRoleBadge").textContent = "Demo";
      return;
    }

    try {
      backend = await window.WPILiveBackend.connect(config);
      const session = await backend.waitForHealthySession();
      if (!session) {
        window.location.replace("live-login.html");
        return;
      }
      const inviteToken = new URLSearchParams(window.location.search).get("invite");
      if (inviteToken) {
        await backend.acceptInvite(inviteToken);
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("invite");
        history.replaceState(null, "", cleanUrl);
      }
      workspace = await backend.bootstrap({teamName:"Lamorinda A 14U Boys",teamSlug:"lamorinda-a-14u-boys",ageGroup:"14U",competitiveSeason:"2026-2027"});
      $("dashboardConnectedContent").hidden = false;
      $("dashboardTeamName").textContent = workspace.teamName;
      $("dashboardRoleBadge").textContent = workspace.role;
      $("dashboardRoleMetric").textContent = workspace.role;
      $("dashboardConnectionLabel").textContent = "Connected private workspace";
      $("dashboardConnectionDetail").textContent = `${session.user.email} · data protected by team membership and role policies`;
      const canCreateGames = ["owner","admin"].includes(workspace.role);
      $("createScrimmageLink").hidden = !canCreateGames;
      if (workspace.role === "viewer") $("dashboardSubtitle").textContent = "Private read-only game history and team analytics.";
      if (workspace.role === "scorer") $("dashboardSubtitle").textContent = "Open an assigned game to score; Team Owners and Admins manage games and permanent rosters.";
      const canInvite = ["owner","admin"].includes(workspace.role);
      $("invitePanel").hidden = !canInvite;
      $("inviteUnavailable").hidden = canInvite;
      if (workspace.role !== "owner") $("inviteRole").querySelector('option[value="admin"]')?.remove();
      $("groupMeSecretField").hidden = workspace.role !== "owner";
      await Promise.all([loadGames(), loadGroupMe()]);
    } catch (error) {
      $("dashboardConnectionLabel").textContent = "Connected setup needs attention";
      $("dashboardConnectionDetail").textContent = error.message;
    }
  }

  $("dashboardSignOutButton").addEventListener("click", async () => {
    if (backend) await backend.signOut();
    localStorage.removeItem("wpi-live-auth-v7-56-8");
    localStorage.removeItem("wpi-live-auth-v7-56-3");
    localStorage.removeItem("wpi-live-auth-v7-56-1");
    window.location.assign("live-login.html");
  });
  $("createInviteButton").addEventListener("click", createInvite);
  $("saveGroupMeButton").addEventListener("click", saveGroupMe);
  $("testGroupMeButton").addEventListener("click", testGroupMe);
  $("groupMeDeliveryMode").addEventListener("change", () => {
    groupMeGroups = [];
    groupMeTopics = [];
    $("groupMeDiscoveryMessage").textContent = "";
    renderGroupMeMode();
  });
  $("loadGroupMeGroupsButton").addEventListener("click", loadGroupMeGroups);
  $("loadGroupMeTopicsButton").addEventListener("click", loadGroupMeTopics);
  $("groupMeGroupSelect").addEventListener("change", () => {
    groupMeTopics = [];
    populateGroupMeTopics();
    $("loadGroupMeTopicsButton").disabled = !$("groupMeGroupSelect").value;
    loadGroupMeTopics();
  });
  $("refreshGamesButton").addEventListener("click", () => loadGames().catch(error => { $("dashboardConnectionDetail").textContent = error.message; }));
  $("dashboardScorerCode").addEventListener("input", event => { event.target.value = event.target.value.replace(/\D/g, "").slice(0,6); });
  $("dashboardScorerCode").addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); previewScorerCode(); } });
  $("dashboardPreviewScorerCodeButton").addEventListener("click", previewScorerCode);
  $("dashboardAcceptScorerCodeButton").addEventListener("click", acceptScorerCode);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
