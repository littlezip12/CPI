/* WPI 7.57.0 — Team Administration & Roster Onboarding Foundation. */
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
  let currentRoster = [];
  let rosterDraft = [];
  let rosterDraftSource = "manual";
  let rosterOcrBusy = false;

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

  function updateGroupMeStatusPill() {
    const pill = $("groupMeSetupStatusPill");
    if (!pill) return;
    if (!destination) {
      pill.textContent = "Not connected";
      pill.dataset.state = "idle";
      return;
    }
    if (!destination.enabled) {
      pill.textContent = destination.last_test_status === "sent" ? "Tested · save to use" : "Saved · paused";
      pill.dataset.state = destination.last_test_status === "sent" ? "tested" : "paused";
      return;
    }
    if (destination.last_test_status === "sent") {
      pill.textContent = "Connected";
      pill.dataset.state = "connected";
      return;
    }
    if (destination.last_test_status === "failed") {
      pill.textContent = "Needs attention";
      pill.dataset.state = "error";
      return;
    }
    pill.textContent = "Ready when tested";
    pill.dataset.state = "idle";
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
    updateGroupMeStatusPill();
    $("groupMeAudit").hidden = false;
    $("deliverySentCount").textContent = String(deliverySummary.sent || 0);
    $("deliveryFailedCount").textContent = String(deliverySummary.failed || 0);
    $("deliveryPendingCount").textContent = String(deliverySummary.pending || 0);
    updateReadiness();
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
    const enableDelivery = mode === "topic" ? true : $("groupMeEnabled").checked;

    if (mode === "topic" && (!group?.id || !topic?.id)) {
      $("groupMeSetupMessage").textContent = "Choose both the tournament GroupMe and Score Updates topic before saving.";
      return;
    }

    $("saveGroupMeButton").disabled = true;
    $("groupMeSetupMessage").textContent = "Saving score-updates setup…";
    try {
      destination = await backend.saveGroupMeDestination(
        workspace.teamId,
        $("groupMeDisplayName").value.trim(),
        currentGroupMeSecretName(),
        enableDelivery,
        {
          mode,
          groupId: group?.id || null,
          groupName: group?.name || null,
          topicId: topic?.id || null,
          topicName: topic?.name || null
        }
      );
      $("groupMeEnabled").checked = Boolean(destination.enabled);
      $("groupMeSetupMessage").textContent = mode === "topic"
        ? "Score Updates saved and enabled for new games."
        : "Bot destination saved.";
      renderGroupMe();
    } catch (error) {
      $("groupMeSetupMessage").textContent = error.message;
    } finally {
      $("saveGroupMeButton").disabled = false;
    }
  }

  async function testGroupMe() {
    const mode = currentGroupMeMode();
    const group = mode === "topic" ? selectedGroupMeGroup() : null;
    const topic = mode === "topic" ? selectedGroupMeTopic() : null;
    if (mode === "topic" && (!group?.id || !topic?.id)) {
      $("groupMeSetupMessage").textContent = "Choose the tournament GroupMe and Score Updates topic before testing.";
      return;
    }

    $("testGroupMeButton").disabled = true;
    try {
      const selectionChanged = !destination?.id ||
        destination.delivery_mode !== mode ||
        (mode === "topic" && (String(destination.groupme_group_id || "") !== String(group?.id || "") || String(destination.groupme_topic_id || "") !== String(topic?.id || "")));

      if (selectionChanged) {
        $("groupMeSetupMessage").textContent = "Preparing the selected Score Updates destination…";
        destination = await backend.saveGroupMeDestination(
          workspace.teamId,
          $("groupMeDisplayName").value.trim(),
          currentGroupMeSecretName(),
          false,
          {
            mode,
            groupId: group?.id || null,
            groupName: group?.name || null,
            topicId: topic?.id || null,
            topicName: topic?.name || null
          }
        );
      }

      const target = destination.delivery_mode === "topic" && destination.groupme_topic_name
        ? ` → ${destination.groupme_topic_name}`
        : "";
      $("groupMeSetupMessage").textContent = `Sending WPI Live test message${target}…`;
      await backend.testGroupMeDestination(
        destination.id,
        `WPI Live test: ${workspace.teamName} is connected and ready for parent game updates.`
      );
      destination = await backend.loadGroupMeDestination(workspace.teamId);
      $("groupMeEnabled").checked = Boolean(destination.enabled);
      $("groupMeSetupMessage").textContent = destination.delivery_mode === "topic"
        ? `Test message delivered to ${destination.groupme_topic_name}. Select Save & use for new games to activate it.`
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


  function uid(prefix = "row") {
    if (window.crypto?.randomUUID) return `${prefix}-${window.crypto.randomUUID()}`;
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function canManageTeam() {
    return Boolean(workspace && ["owner","admin"].includes(workspace.role));
  }

  function starterMinimum(ageGroup = workspace?.ageGroup || "14U") {
    const age = Number(String(ageGroup).replace(/\D/g, ""));
    return age && age <= 12 ? 6 : 7;
  }

  function setReadinessItem(id, ready, label) {
    const item = $(id);
    if (!item) return;
    item.dataset.state = ready ? "ready" : "needs-attention";
    const status = item.querySelector("em");
    if (status) status.textContent = label || (ready ? "Ready" : "Needs setup");
  }

  function updateReadiness() {
    if (!workspace) return;
    const profileReady = Boolean(String(workspace.teamName || "").trim() && String(workspace.ageGroup || "").trim());
    const rosterMinimum = starterMinimum(workspace.ageGroup);
    const rosterReady = currentRoster.length >= rosterMinimum;
    const groupMeReady = Boolean(destination?.enabled && destination?.last_test_status === "sent");
    const accessReady = Boolean(workspace.role);
    setReadinessItem("readinessProfile", profileReady);
    setReadinessItem("readinessRoster", rosterReady, rosterReady ? `${currentRoster.length} players` : `${currentRoster.length}/${rosterMinimum} players`);
    setReadinessItem("readinessGroupMe", groupMeReady, groupMeReady ? "Connected" : "Needs setup");
    setReadinessItem("readinessAccess", accessReady, "Ready");
    const readyCount = [profileReady, rosterReady, groupMeReady, accessReady].filter(Boolean).length;
    const score = $("teamReadinessScore");
    if (score) {
      score.textContent = `${readyCount}/4 ready`;
      score.dataset.state = readyCount === 4 ? "ready" : "progress";
    }
  }

  function renderTeamProfile() {
    if (!workspace) return;
    $("teamProfileName").value = workspace.teamName || "";
    $("teamProfileAgeGroup").value = workspace.ageGroup || "14U";
    $("teamProfileSeason").value = workspace.competitiveSeason || "2026-2027";
    const editable = canManageTeam();
    $("teamProfileName").disabled = !editable;
    $("teamProfileAgeGroup").disabled = !editable;
    $("saveTeamProfileButton").hidden = !editable;
    $("teamProfileStatus").textContent = editable ? "Editable" : "View only";
    updateReadiness();
  }

  async function saveTeamProfile() {
    if (!canManageTeam()) return;
    const name = $("teamProfileName").value.trim();
    const ageGroup = $("teamProfileAgeGroup").value;
    if (!name) { $("teamProfileMessage").textContent = "Enter a team name."; return; }
    $("saveTeamProfileButton").disabled = true;
    $("teamProfileMessage").textContent = "Saving team profile…";
    try {
      const { error } = await backend.client.from("live_teams").update({
        name,
        age_group: ageGroup,
        updated_at: new Date().toISOString()
      }).eq("id", workspace.teamId);
      if (error) throw error;
      workspace.teamName = name;
      workspace.ageGroup = ageGroup;
      $("dashboardTeamName").textContent = name;
      $("teamProfileMessage").textContent = "Team profile saved. New games will use this identity.";
      renderTeamProfile();
    } catch (error) {
      $("teamProfileMessage").textContent = error.message || "Team profile could not be saved.";
    } finally {
      $("saveTeamProfileButton").disabled = false;
    }
  }

  function renderCurrentRoster() {
    const count = currentRoster.length;
    $("dashboardRosterCount").textContent = `${count} player${count === 1 ? "" : "s"}`;
    $("currentRosterHelp").textContent = count ? `Saved for ${workspace?.teamName || "this team"}.` : "No players saved yet.";
    $("currentRosterList").innerHTML = count ? currentRoster.map(player => `
      <div class="live-current-roster-player">
        <strong>#${escapeHtml(player.cap)}</strong>
        <span>${escapeHtml(player.name)}</span>
      </div>`).join("") : '<p class="live-empty-state">Add a roster by photo, image upload, or manual entry.</p>';
    $("editCurrentRosterButton").hidden = !canManageTeam() || !count;
    updateReadiness();
  }

  async function loadRoster() {
    currentRoster = await backend.loadRoster(workspace.rosterId);
    renderCurrentRoster();
  }

  function normalizedCap(value) {
    return String(value || "").trim().replace(/^#/, "").toUpperCase();
  }

  function cleanedRosterName(value) {
    return String(value || "").replace(/\s+/g, " ").replace(/^[\-–—:|,;.]+|[\-–—:|,;.]+$/g, "").trim();
  }

  function isRosterHeading(line) {
    return /^(roster|team|players?|player name|name|cap|cap #|cap number|number|no\.?|#)$/i.test(line.trim());
  }

  function parseRosterText(text) {
    const rows = [];
    const seen = new Set();
    let pendingCap = null;
    const lines = String(text || "").split(/\r?\n/).map(line => line.replace(/[|]+/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean);

    function add(cap, name, confidence = "detected") {
      cap = normalizedCap(cap);
      name = cleanedRosterName(name);
      if (!cap || !name || isRosterHeading(name) || !/[A-Za-z]/.test(name)) return;
      const key = `${cap}|${name.toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      rows.push({ id: uid("player"), cap, name, source: "photo", review: confidence !== "clear" });
    }

    for (const raw of lines) {
      if (isRosterHeading(raw)) continue;
      let m = raw.match(/^#?\s*(\d{1,3}[A-Za-z]?)\s*(?:[-–—:.)]|\s)\s*(.+)$/);
      if (m && /[A-Za-z]/.test(m[2])) { add(m[1], m[2], "clear"); pendingCap = null; continue; }
      m = raw.match(/^(.+?)\s+(?:#\s*)?(\d{1,3}[A-Za-z]?)$/);
      if (m && /[A-Za-z]/.test(m[1])) { add(m[2], m[1], "clear"); pendingCap = null; continue; }
      m = raw.match(/^#?\s*(\d{1,3}[A-Za-z]?)$/);
      if (m) { pendingCap = m[1]; continue; }
      if (pendingCap && /[A-Za-z]{2}/.test(raw)) { add(pendingCap, raw, "review"); pendingCap = null; }
    }

    const caps = new Map();
    rows.forEach(row => caps.set(row.cap, (caps.get(row.cap) || 0) + 1));
    rows.forEach(row => { if ((caps.get(row.cap) || 0) > 1 || row.name.length < 4) row.review = true; });
    return rows;
  }

  function rosterDraftFromCurrent() {
    return currentRoster.map(player => ({
      id: player.id || uid("player"),
      remoteId: player.remoteId || null,
      cap: normalizedCap(player.cap),
      name: player.name || "",
      createdByUserId: player.createdByUserId || null,
      source: "existing",
      review: false
    }));
  }

  function renderRosterDraft() {
    $("rosterDraftCount").textContent = `${rosterDraft.length} player${rosterDraft.length === 1 ? "" : "s"} ${rosterDraftSource === "photo" ? "detected" : "in draft"}`;
    $("rosterDraftRows").innerHTML = rosterDraft.length ? rosterDraft.map((row, index) => `
      <div class="live-roster-draft-row" data-roster-draft-id="${escapeHtml(row.id)}">
        <label><span>Cap #</span><input data-roster-cap type="text" inputmode="numeric" maxlength="3" value="${escapeHtml(row.cap)}" aria-label="Cap number for player ${index + 1}"></label>
        <label><span>Player name</span><input data-roster-name type="text" maxlength="100" value="${escapeHtml(row.name)}" aria-label="Player name ${index + 1}"></label>
        <span class="live-roster-review-state" data-state="${row.review ? "review" : "ready"}">${row.review ? "Review" : "Ready"}</span>
        <button type="button" data-remove-roster-row="${escapeHtml(row.id)}" aria-label="Remove ${escapeHtml(row.name || `player ${index + 1}`)}">Remove</button>
      </div>`).join("") : '<p class="live-empty-state">No players detected yet. Add a player manually below.</p>';
    $("rosterDraftRows").querySelectorAll("input").forEach(input => input.addEventListener("input", syncRosterDraftFromForm));
  }

  function syncRosterDraftFromForm() {
    const rows = Array.from($("rosterDraftRows").querySelectorAll("[data-roster-draft-id]"));
    const previous = new Map(rosterDraft.map(row => [row.id, row]));
    rosterDraft = rows.map(row => {
      const prior = previous.get(row.dataset.rosterDraftId) || {};
      return {
        ...prior,
        id: row.dataset.rosterDraftId,
        cap: normalizedCap(row.querySelector("[data-roster-cap]")?.value),
        name: cleanedRosterName(row.querySelector("[data-roster-name]")?.value),
        review: false
      };
    });
  }

  function openRosterDialog({source = "manual", rows = null} = {}) {
    rosterDraftSource = source;
    rosterDraft = rows || rosterDraftFromCurrent();
    $("rosterOcrWorkspace").hidden = source !== "photo";
    $("rosterRawDetails").hidden = true;
    $("rosterRawText").value = "";
    $("rosterDraftMessage").textContent = "Review every row before saving. Nothing is saved automatically.";
    $("rosterDialogKicker").textContent = source === "photo" ? "Photo roster import" : "Manual roster";
    $("rosterDialogTitle").textContent = source === "photo" ? "Review detected roster" : (currentRoster.length ? "Edit roster" : "Build roster manually");
    $("rosterDialogHelp").textContent = source === "photo"
      ? "WPI reads the image into a draft. Correct anything it misread before you save."
      : "Enter cap numbers and player names. You can always edit this roster later.";
    renderRosterDraft();
    $("rosterImportDialog").showModal();
  }

  function ensureTesseract() {
    if (window.Tesseract?.createWorker) return Promise.resolve(window.Tesseract);
    if (window.__wpiTesseractPromise) return window.__wpiTesseractPromise;
    window.__wpiTesseractPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
      script.async = true;
      script.crossOrigin = "anonymous";
      script.onload = () => window.Tesseract?.createWorker ? resolve(window.Tesseract) : reject(new Error("Roster reader did not initialize."));
      script.onerror = () => reject(new Error("Roster reader could not load. Use manual entry or try again when online."));
      document.head.appendChild(script);
    });
    return window.__wpiTesseractPromise;
  }

  async function readRosterImage(file) {
    if (!file || rosterOcrBusy) return;
    if (!file.type.startsWith("image/")) {
      $("rosterDraftMessage").textContent = "Choose a photo or image file.";
      return;
    }
    rosterOcrBusy = true;
    openRosterDialog({source:"photo", rows:[]});
    const objectUrl = URL.createObjectURL(file);
    $("rosterImagePreview").src = objectUrl;
    $("rosterOcrStatus").textContent = "Loading roster reader…";
    $("rosterOcrProgress").value = 2;
    $("rosterOcrDetail").textContent = "The image stays in this browser. Only your confirmed roster is saved.";
    $("saveRosterDraftButton").disabled = true;
    let worker = null;
    try {
      const Tesseract = await ensureTesseract();
      worker = await Tesseract.createWorker("eng", 1, {
        logger: message => {
          if (typeof message.progress === "number") $("rosterOcrProgress").value = Math.max(3, Math.round(message.progress * 100));
          if (message.status) $("rosterOcrStatus").textContent = message.status.replace(/_/g, " ").replace(/^./, c => c.toUpperCase());
        }
      });
      $("rosterOcrStatus").textContent = "Reading names and cap numbers…";
      const result = await worker.recognize(file);
      const rawText = result?.data?.text || "";
      rosterDraft = parseRosterText(rawText);
      $("rosterRawText").value = rawText;
      $("rosterRawDetails").hidden = !rawText.trim();
      $("rosterOcrProgress").value = 100;
      $("rosterOcrStatus").textContent = rosterDraft.length ? `Found ${rosterDraft.length} possible player${rosterDraft.length === 1 ? "" : "s"}` : "No roster rows were confidently detected";
      $("rosterOcrDetail").textContent = rosterDraft.length ? "Review the draft below. WPI will not save until you confirm it." : "Use the detected text as a reference and add players manually below.";
      if (!rosterDraft.length) rosterDraft.push({id:uid("player"),cap:"",name:"",source:"manual",review:true});
      renderRosterDraft();
      $("rosterDraftMessage").textContent = "Review cap numbers and names, then save the confirmed roster.";
    } catch (error) {
      rosterDraft = rosterDraftFromCurrent();
      if (!rosterDraft.length) rosterDraft = [{id:uid("player"),cap:"",name:"",source:"manual",review:true}];
      renderRosterDraft();
      $("rosterOcrStatus").textContent = "Automatic reading unavailable";
      $("rosterOcrDetail").textContent = "Your image was not saved. You can enter the roster manually now.";
      $("rosterDraftMessage").textContent = error.message || "Roster image could not be read.";
    } finally {
      if (worker) await worker.terminate().catch(() => {});
      URL.revokeObjectURL(objectUrl);
      rosterOcrBusy = false;
      $("saveRosterDraftButton").disabled = false;
    }
  }

  function validateRosterDraft() {
    syncRosterDraftFromForm();
    const complete = rosterDraft.filter(row => row.cap || row.name);
    if (!complete.length) return {ok:false, message:"Add at least one player before saving."};
    const incomplete = complete.find(row => !row.cap || !row.name);
    if (incomplete) return {ok:false, message:"Every roster row needs both a cap number and player name."};
    const caps = new Set();
    for (const row of complete) {
      const cap = normalizedCap(row.cap);
      if (cap.length > 3) return {ok:false, message:`Cap #${cap} is too long. Use a cap number of three characters or fewer.`};
      if (caps.has(cap)) return {ok:false, message:`Cap #${cap} appears more than once. Correct the duplicate before saving.`};
      caps.add(cap);
    }
    return {ok:true, rows:complete};
  }

  async function saveRosterDraft() {
    if (!canManageTeam()) return;
    const validation = validateRosterDraft();
    if (!validation.ok) { $("rosterDraftMessage").textContent = validation.message; return; }
    $("saveRosterDraftButton").disabled = true;
    $("rosterDraftMessage").textContent = "Saving confirmed roster…";
    try {
      const session = await backend.session();
      if (!session?.user) throw new Error("Your session expired. Sign in again.");
      const existingByCap = new Map(currentRoster.map(player => [normalizedCap(player.cap), player]));
      const existingByName = new Map(currentRoster.map(player => [String(player.name || "").trim().toLowerCase(), player]));
      const rows = validation.rows.map((row, index) => {
        const match = (row.remoteId ? currentRoster.find(player => player.remoteId === row.remoteId) : null)
          || existingByCap.get(normalizedCap(row.cap))
          || existingByName.get(String(row.name || "").trim().toLowerCase());
        return {
          roster_id: workspace.rosterId,
          client_player_id: match?.id || row.id || uid("player"),
          cap_number: normalizedCap(row.cap),
          display_name: cleanedRosterName(row.name),
          active: true,
          sort_order: index,
          created_by: match?.createdByUserId || session.user.id,
          updated_by: session.user.id,
          updated_at: new Date().toISOString()
        };
      });
      const { error: upsertError } = await backend.client.from("live_players").upsert(rows, {onConflict:"roster_id,client_player_id"});
      if (upsertError) throw upsertError;
      const savedIds = new Set(rows.map(row => row.client_player_id));
      const removedRemoteIds = currentRoster.filter(player => !savedIds.has(player.id)).map(player => player.remoteId).filter(Boolean);
      if (removedRemoteIds.length) {
        const { error: removeError } = await backend.client.from("live_players").update({active:false,updated_by:session.user.id,updated_at:new Date().toISOString()}).in("id", removedRemoteIds);
        if (removeError) throw removeError;
      }
      await loadRoster();
      $("rosterDraftMessage").textContent = `Roster saved · ${currentRoster.length} player${currentRoster.length === 1 ? "" : "s"}.`;
      setTimeout(() => $("rosterImportDialog").close(), 450);
    } catch (error) {
      $("rosterDraftMessage").textContent = error.message || "Roster could not be saved.";
    } finally {
      $("saveRosterDraftButton").disabled = false;
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
      $("rosterManagerPanel").hidden = !canInvite;
      $("rosterReadOnlyMessage").hidden = canInvite;
      renderTeamProfile();
      if (workspace.role !== "owner") $("inviteRole").querySelector('option[value="admin"]')?.remove();
      $("groupMeSecretField").hidden = workspace.role !== "owner";
      await Promise.all([loadGames(), loadGroupMe(), loadRoster()]);
      updateReadiness();
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

  $("saveTeamProfileButton").addEventListener("click", saveTeamProfile);
  $("takeRosterPhotoButton").addEventListener("click", () => { $("rosterCameraInput").value = ""; $("rosterCameraInput").click(); });
  $("uploadRosterImageButton").addEventListener("click", () => { $("rosterUploadInput").value = ""; $("rosterUploadInput").click(); });
  $("manualRosterButton").addEventListener("click", () => openRosterDialog({source:"manual", rows:rosterDraftFromCurrent().length ? rosterDraftFromCurrent() : [{id:uid("player"),cap:"",name:"",source:"manual",review:false}]}));
  $("editCurrentRosterButton").addEventListener("click", () => openRosterDialog({source:"manual", rows:rosterDraftFromCurrent()}));
  $("rosterCameraInput").addEventListener("change", event => readRosterImage(event.target.files?.[0]));
  $("rosterUploadInput").addEventListener("change", event => readRosterImage(event.target.files?.[0]));
  $("addRosterDraftRowButton").addEventListener("click", () => { syncRosterDraftFromForm(); rosterDraft.push({id:uid("player"),cap:"",name:"",source:"manual",review:false}); renderRosterDraft(); });
  $("rosterDraftRows").addEventListener("click", event => {
    const button = event.target.closest("[data-remove-roster-row]");
    if (!button) return;
    syncRosterDraftFromForm();
    rosterDraft = rosterDraft.filter(row => row.id !== button.dataset.removeRosterRow);
    renderRosterDraft();
  });
  $("saveRosterDraftButton").addEventListener("click", saveRosterDraft);
  document.querySelectorAll(".live-dashboard-sidebar nav a").forEach(link => link.addEventListener("click", () => {
    document.querySelectorAll(".live-dashboard-sidebar nav a").forEach(item => item.classList.remove("is-active"));
    link.classList.add("is-active");
  }));

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
