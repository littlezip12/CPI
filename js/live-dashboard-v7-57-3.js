/* WPI 7.57.3 — Multi-Team & Team Switching. */
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
  let lastRosterFile = null;
  let teamAccess = {members:[],invites:[]};
  let lastCreatedInvite = null;
  let teamMemberships = [];

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
  }

  function teamScopedUrl(path, params = {}) {
    const url = new URL(path, window.location.href);
    Object.entries(params).forEach(([key,value]) => {
      if (value !== null && value !== undefined && value !== "") url.searchParams.set(key, String(value));
    });
    const teamId = params.team || workspace?.teamId;
    if (teamId) url.searchParams.set("team", String(teamId));
    return url.href;
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
      $("continueLatestGameButton").onclick = () => window.location.assign(teamScopedUrl("live-sandbox.html", {game:latestActive.id}));
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
        <div class="live-dashboard-actions"><a href="${escapeHtml(teamScopedUrl("live-sandbox.html", {game:game.id}))}">${game.status === "final" ? "Review" : "Open"}</a>${game.status === "final" || game.status === "cancelled" ? "" : `<button type="button" data-scorer-code-game="${game.id}">Enter scorer code</button>`}</div>
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
      window.location.assign(teamScopedUrl("live-sandbox.html", {game:result.gameId, team:result.teamId || workspace?.teamId}));
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
    const canManage = canManageGroupMeSetup();
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
    const canManage = canManageGroupMeSetup();
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
      $("groupMeReadOnly").textContent = `${destinationLabel} · ${destination.enabled ? "connected" : "paused"}${workspace.role === "admin" && !workspace.canManageGroupMe ? " · Team Owner approval required to change setup" : ""}`;
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
    if (!canManageGroupMeSetup()) {
      $("groupMeDiscoveryMessage").textContent = "Tournament GroupMe management permission is required.";
      return;
    }
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
    if (!canManageGroupMeSetup()) { $("groupMeSetupMessage").textContent = "Tournament GroupMe management permission is required."; return; }
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
    if (!canManageGroupMeSetup()) { $("groupMeSetupMessage").textContent = "Tournament GroupMe management permission is required."; return; }
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

  function roleLabel(role) {
    return ({owner:"Owner",admin:"Admin",scorer:"Scorer",viewer:"Viewer"})[role] || "Member";
  }

  function teamOptionLabel(team) {
    const age = team.ageGroup ? ` · ${team.ageGroup}` : "";
    return `${team.teamName}${age} · ${roleLabel(team.role)}`;
  }

  function renderTeamSwitcher() {
    const wrap = $("teamSwitcherWrap");
    const select = $("dashboardTeamSwitcher");
    if (!wrap || !select) return;
    wrap.hidden = !teamMemberships.length;
    select.innerHTML = teamMemberships.map(team => `<option value="${escapeHtml(team.teamId)}"${String(team.teamId) === String(workspace?.teamId) ? " selected" : ""}>${escapeHtml(teamOptionLabel(team))}</option>`).join("");
    select.disabled = teamMemberships.length < 2;
    const canCreateAnother = teamMemberships.some(team => team.role === "owner");
    $("createTeamButton").hidden = !canCreateAnother;
  }

  async function loadTeamMemberships() {
    teamMemberships = await backend.listTeamMemberships();
    renderTeamSwitcher();
    return teamMemberships;
  }

  function switchTeam(teamId) {
    if (!teamId || String(teamId) === String(workspace?.teamId)) return;
    const allowed = teamMemberships.some(team => String(team.teamId) === String(teamId));
    if (!allowed) {
      $("dashboardConnectionDetail").textContent = "That team is not available to this account.";
      renderTeamSwitcher();
      return;
    }
    window.WPILiveTeamContext?.rememberTeam(teamId);
    const url = new URL(window.location.href);
    url.searchParams.delete("invite");
    url.searchParams.set("team", teamId);
    url.hash = "";
    window.location.assign(url.href);
  }

  function openCreateTeamDialog() {
    $("newTeamName").value = "";
    $("newTeamAgeGroup").value = workspace?.ageGroup || "14U";
    $("newTeamSeason").value = workspace?.competitiveSeason || "2026-2027";
    $("createTeamMessage").textContent = "";
    $("createTeamDialog").showModal();
    setTimeout(() => $("newTeamName").focus(), 0);
  }

  async function createAdditionalTeam() {
    const name = $("newTeamName").value.trim();
    if (!name) { $("createTeamMessage").textContent = "Enter the team name."; return; }
    $("confirmCreateTeamButton").disabled = true;
    $("createTeamMessage").textContent = "Creating private team workspace…";
    try {
      const created = await backend.createAdditionalTeam({
        name,
        ageGroup:$("newTeamAgeGroup").value,
        competitiveSeason:$("newTeamSeason").value
      });
      window.WPILiveTeamContext?.rememberTeam(created.teamId);
      const url = new URL(window.location.href);
      url.searchParams.delete("invite");
      url.searchParams.set("team", created.teamId);
      url.hash = "";
      window.location.assign(url.href);
    } catch (error) {
      $("createTeamMessage").textContent = error.message || "Team could not be created.";
      $("confirmCreateTeamButton").disabled = false;
    }
  }

  function inviteUrl(token) {
    return `${window.location.origin}${window.location.pathname.replace(/live-dashboard\.html$/, "live-login.html")}?invite=${encodeURIComponent(token)}`;
  }

  function canManageGroupMeSetup() {
    return Boolean(workspace && (
      workspace.role === "owner"
      || (workspace.role === "admin" && workspace.canManageGroupMe === true)
    ));
  }

  function canManageMember(member) {
    if (!workspace || member?.role === "owner" || member?.isCurrentUser) return false;
    if (workspace.role === "owner") return true;
    return workspace.role === "admin" && ["scorer","viewer"].includes(member?.role);
  }

  function updateInvitePermissionVisibility() {
    const canGrant = workspace?.role === "owner" && $("inviteRole")?.value === "admin";
    $("inviteGroupMePermissionRow").hidden = !canGrant;
    if (!canGrant) $("inviteCanManageGroupMe").checked = false;
  }

  function memberRoleOptions(member) {
    if (workspace?.role === "owner") {
      return ["admin","scorer","viewer"].map(role => `<option value="${role}"${member.role === role ? " selected" : ""}>${roleLabel(role)}</option>`).join("");
    }
    return ["scorer","viewer"].map(role => `<option value="${role}"${member.role === role ? " selected" : ""}>${roleLabel(role)}</option>`).join("");
  }

  function accessInitials(member) {
    const source = String(member?.displayName || member?.email || "TM").trim();
    const parts = source.split(/\s+/).filter(Boolean);
    return (parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : source.slice(0,2)).toUpperCase();
  }

  function renderTeamAccess() {
    const manager = workspace && ["owner","admin"].includes(workspace.role);
    $("teamAccessManagerPanel").hidden = !manager;
    $("teamAccessUnavailable").hidden = manager;
    const members = Array.isArray(teamAccess.members) ? teamAccess.members : [];
    const invites = Array.isArray(teamAccess.invites) ? teamAccess.invites : [];
    $("teamAccessCount").textContent = `${members.length} member${members.length === 1 ? "" : "s"}`;
    $("pendingInviteCount").textContent = String(invites.filter(invite => invite.status === "pending").length);

    if (!manager) {
      updateReadiness();
      return;
    }

    $("teamAccessMembers").innerHTML = members.length ? members.map(member => {
      const manageable = canManageMember(member);
      const groupMeBadge = member.role === "owner" || member.canManageGroupMe
        ? '<span class="live-access-permission-badge">GroupMe manager</span>' : "";
      const ownerCopy = member.role === "owner" ? '<small>Platform / Team Owner</small>' : "";
      const controls = manageable ? `
        <div class="live-access-member-controls">
          <label>Role<select data-member-role>${memberRoleOptions(member)}</select></label>
          ${workspace.role === "owner" ? `<label class="live-access-inline-check" data-member-groupme-row${member.role !== "admin" ? ' hidden' : ''}><input data-member-groupme type="checkbox"${member.canManageGroupMe ? " checked" : ""}> GroupMe manager</label>` : ""}
          <button type="button" data-save-member="${escapeHtml(member.userId)}">Save</button>
          <button class="live-danger-button" type="button" data-remove-member="${escapeHtml(member.userId)}">Remove</button>
        </div>` : "";
      return `<article class="live-access-member" data-access-user="${escapeHtml(member.userId)}">
        <div class="live-access-avatar">${escapeHtml(accessInitials(member))}</div>
        <div class="live-access-identity"><strong>${escapeHtml(member.displayName || member.email || "Team member")}</strong><small>${escapeHtml(member.email || "")}</small>${ownerCopy}</div>
        <div class="live-access-role"><span data-role="${escapeHtml(member.role)}">${escapeHtml(roleLabel(member.role))}</span>${groupMeBadge}</div>
        ${controls}
      </article>`;
    }).join("") : '<p class="live-empty-state">No permanent team members yet.</p>';

    $("teamAccessInvites").innerHTML = invites.length ? invites.map(invite => {
      const expired = invite.status === "expired";
      const expires = new Date(invite.expiresAt).toLocaleDateString([], {month:"short",day:"numeric",year:"numeric"});
      const permission = invite.canManageGroupMe ? '<span class="live-access-permission-badge">GroupMe manager</span>' : "";
      return `<article class="live-access-invite" data-access-invite="${escapeHtml(invite.inviteId)}">
        <div><strong>${escapeHtml(invite.email)}</strong><small>${escapeHtml(roleLabel(invite.role))} · ${expired ? "Expired" : `Expires ${escapeHtml(expires)}`}</small></div>
        <div class="live-access-role"><span data-role="${escapeHtml(invite.role)}">${escapeHtml(roleLabel(invite.role))}</span>${permission}</div>
        <div class="live-access-invite-actions">
          ${expired ? "" : `<button type="button" data-copy-invite="${escapeHtml(invite.inviteId)}">Copy link</button><button type="button" data-email-invite="${escapeHtml(invite.inviteId)}">Email invite</button>`}
          <button type="button" data-reissue-invite="${escapeHtml(invite.inviteId)}">${expired ? "Reissue" : "New link"}</button>
          <button class="live-danger-button" type="button" data-revoke-invite="${escapeHtml(invite.inviteId)}">Revoke</button>
        </div>
      </article>`;
    }).join("") : '<p class="live-empty-state">No pending invitations.</p>';
    updateInvitePermissionVisibility();
    updateReadiness();
  }

  async function loadTeamAccess() {
    if (!workspace || !["owner","admin"].includes(workspace.role)) {
      teamAccess = {members:[],invites:[]};
      renderTeamAccess();
      return;
    }
    const {data, error} = await backend.client.rpc("live_list_team_access", {target_team_id:workspace.teamId});
    if (error) throw error;
    teamAccess = {members:Array.isArray(data?.members) ? data.members : [], invites:Array.isArray(data?.invites) ? data.invites : []};
    workspace.canManageGroupMe = workspace.role === "owner" || data?.callerCanManageGroupMe === true;
    renderTeamAccess();
  }

  function renderCreatedInvite(invite) {
    lastCreatedInvite = invite;
    if (!invite?.token) { $("inviteResult").hidden = true; return; }
    const url = inviteUrl(invite.token);
    $("inviteResult").hidden = false;
    $("inviteResult").innerHTML = `<strong>Invite ready</strong><p>${escapeHtml(invite.email)} · ${escapeHtml(roleLabel(invite.role))}</p><code>${escapeHtml(url)}</code><div class="live-access-created-actions"><button type="button" data-copy-created-invite>Copy link</button><button type="button" data-email-created-invite>Email invite</button></div><p>Expires ${new Date(invite.expiresAt).toLocaleDateString()}.</p>`;
  }

  async function copyText(value, successMessage = "Copied.") {
    try {
      await navigator.clipboard.writeText(value);
      $("inviteMessage").textContent = successMessage;
    } catch (_) {
      const area = document.createElement("textarea");
      area.value = value;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      $("inviteMessage").textContent = successMessage;
    }
  }

  function emailInvite(invite) {
    const url = inviteUrl(invite.token);
    const subject = encodeURIComponent(`WPI Live invitation · ${workspace.teamName}`);
    const body = encodeURIComponent(`You've been invited to ${workspace.teamName} in WPI Live as ${roleLabel(invite.role)}.\n\nOpen your private invitation:\n${url}\n\nThis invitation expires ${new Date(invite.expiresAt).toLocaleDateString()}.`);
    window.location.href = `mailto:${encodeURIComponent(invite.email)}?subject=${subject}&body=${body}`;
  }

  async function createInvite() {
    const email = $("inviteEmail").value.trim();
    const role = $("inviteRole").value;
    const allowGroupMe = workspace?.role === "owner" && role === "admin" && $("inviteCanManageGroupMe").checked;
    if (!email) {
      $("inviteMessage").textContent = "Enter the email address to invite.";
      return;
    }
    $("createInviteButton").disabled = true;
    $("inviteMessage").textContent = "Creating secure invite…";
    try {
      const {data:invite, error} = await backend.client.rpc("live_create_team_invite_v2", {
        target_team_id:workspace.teamId,
        invite_email:email,
        invite_role:role,
        invite_can_manage_groupme:allowGroupMe
      });
      if (error) throw error;
      renderCreatedInvite(invite);
      $("inviteEmail").value = "";
      $("inviteCanManageGroupMe").checked = false;
      $("inviteMessage").textContent = "Invite created. Copy the link or open a pre-addressed email.";
      await loadTeamAccess();
    } catch (error) {
      $("inviteMessage").textContent = error.message || "Invite could not be created.";
    } finally {
      $("createInviteButton").disabled = false;
    }
  }

  async function saveMemberAccess(userId, card) {
    const member = teamAccess.members.find(row => row.userId === userId);
    if (!member || !card) return;
    const role = card.querySelector("[data-member-role]")?.value || member.role;
    const allowGroupMe = workspace.role === "owner" && role === "admin" && Boolean(card.querySelector("[data-member-groupme]")?.checked);
    $("inviteMessage").textContent = `Updating ${member.displayName || member.email}…`;
    const {error} = await backend.client.rpc("live_update_team_member_access", {
      target_team_id:workspace.teamId,
      target_user_id:userId,
      new_role:role,
      member_can_manage_groupme:allowGroupMe
    });
    if (error) throw error;
    $("inviteMessage").textContent = "Team access updated.";
    await loadTeamAccess();
  }

  async function removeMember(userId) {
    const member = teamAccess.members.find(row => row.userId === userId);
    if (!member) return;
    if (!window.confirm(`Remove ${member.displayName || member.email} from ${workspace.teamName}?`)) return;
    const {error} = await backend.client.rpc("live_remove_team_member", {target_team_id:workspace.teamId,target_user_id:userId});
    if (error) throw error;
    $("inviteMessage").textContent = "Team member removed.";
    await loadTeamAccess();
  }

  async function reissueInvite(inviteId) {
    const {data:invite,error} = await backend.client.rpc("live_reissue_team_invite", {target_team_id:workspace.teamId,target_invite_id:inviteId});
    if (error) throw error;
    renderCreatedInvite(invite);
    $("inviteMessage").textContent = "A fresh 14-day invite link is ready.";
    await loadTeamAccess();
  }

  async function revokeInvite(inviteId) {
    if (!window.confirm("Revoke this team invitation?")) return;
    const {error} = await backend.client.rpc("live_revoke_team_invite", {target_team_id:workspace.teamId,target_invite_id:inviteId});
    if (error) throw error;
    $("inviteMessage").textContent = "Invitation revoked.";
    await loadTeamAccess();
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
    const accessCount = teamAccess.members.length || (workspace.role ? 1 : 0);
    const accessReady = accessCount > 0;
    setReadinessItem("readinessProfile", profileReady);
    setReadinessItem("readinessRoster", rosterReady, rosterReady ? `${currentRoster.length} players` : `${currentRoster.length}/${rosterMinimum} players`);
    setReadinessItem("readinessGroupMe", groupMeReady, groupMeReady ? "Connected" : "Needs setup");
    setReadinessItem("readinessAccess", accessReady, `${accessCount} member${accessCount === 1 ? "" : "s"}`);
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

  function rosterDraftFromVision(players = []) {
    const seenCaps = new Map();
    const rows = players.map(player => {
      const cap = normalizedCap(player?.cap);
      const name = cleanedRosterName(player?.name);
      const confidence = ["high","medium","low"].includes(player?.confidence) ? player.confidence : "low";
      seenCaps.set(cap, (seenCaps.get(cap) || 0) + 1);
      return {
        id: uid("player"),
        cap,
        name,
        source: "vision",
        confidence,
        review: confidence !== "high" || !cap || !name
      };
    }).filter(row => row.cap || row.name);
    rows.forEach(row => {
      if ((seenCaps.get(row.cap) || 0) > 1 || !/^\d{1,3}[A-Z]?$/.test(row.cap) || row.name.length < 3) row.review = true;
    });
    return rows;
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
    $("rosterFailureActions").hidden = true;
    rosterDraft = rows || rosterDraftFromCurrent();
    $("rosterOcrWorkspace").hidden = source !== "photo";
    $("rosterRawDetails").hidden = true;
    $("rosterRawText").value = "";
    $("rosterDraftMessage").textContent = "Review every row before saving. Nothing is saved automatically.";
    $("rosterDialogKicker").textContent = source === "photo" ? "High-accuracy roster import" : "Manual roster";
    $("rosterDialogTitle").textContent = source === "photo" ? "Review detected roster" : (currentRoster.length ? "Edit roster" : "Build roster manually");
    $("rosterDialogHelp").textContent = source === "photo"
      ? "WPI reads the image into a structured draft. Confirm every name and cap number before saving."
      : "Enter cap numbers and player names. You can always edit this roster later.";
    renderRosterDraft();
    $("rosterImportDialog").showModal();
  }

  function loadImageElement(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => resolve({image, url});
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("This image could not be opened. Try a JPEG, PNG, or screenshot.")); };
      image.src = url;
    });
  }

  async function prepareRosterImageForVision(file) {
    const {image, url} = await loadImageElement(file);
    try {
      const sourceWidth = Number(image.naturalWidth || image.width || 0);
      const sourceHeight = Number(image.naturalHeight || image.height || 0);
      if (!sourceWidth || !sourceHeight) throw new Error("The roster image has no readable dimensions.");
      const maxDimension = 2400;
      const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
      const width = Math.max(1, Math.round(sourceWidth * scale));
      const height = Math.max(1, Math.round(sourceHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", {alpha:false});
      if (!context) throw new Error("Your browser could not prepare the roster image.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      if (!dataUrl.startsWith("data:image/jpeg;base64,")) throw new Error("The roster image could not be normalized.");
      if (dataUrl.length > 8_000_000) throw new Error("This roster image is too large. Crop closer to the roster and try again.");
      return {dataUrl, width, height};
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function extractRosterWithVision(imageDataUrl) {
    if (!backend?.client?.functions) throw new Error("Connected roster reading is unavailable. Enter the roster manually.");
    const {data, error} = await backend.client.functions.invoke("roster-extract", {
      body: {team_id: workspace.teamId, image_data_url: imageDataUrl}
    });
    if (error) {
      let message = error.message || "Automatic roster reading failed.";
      try {
        const context = error.context;
        if (context?.json) {
          const body = await context.json();
          if (body?.error) message = body.error;
        }
      } catch (_) {}
      throw new Error(message);
    }
    if (!data || data.status !== "ok" || !Array.isArray(data.players)) {
      throw new Error(data?.error || "WPI could not read a structured roster from this image.");
    }
    return data;
  }

  async function readRosterImage(file) {
    if (!file || rosterOcrBusy) return;
    if (!String(file.type || "").startsWith("image/")) {
      $("rosterDraftMessage").textContent = "Choose a photo or image file.";
      return;
    }
    rosterOcrBusy = true;
    lastRosterFile = file;
    openRosterDialog({source:"photo", rows:[]});
    const previewUrl = URL.createObjectURL(file);
    $("rosterImagePreview").src = previewUrl;
    $("rosterOcrStatus").textContent = "Preparing roster photo…";
    $("rosterOcrProgress").removeAttribute("value");
    $("rosterOcrDetail").textContent = "WPI sends a normalized copy through a secure roster-reading function. The image is not added to your WPI roster.";
    $("saveRosterDraftButton").disabled = true;
    try {
      const prepared = await prepareRosterImageForVision(file);
      $("rosterOcrStatus").textContent = "Reading names and cap numbers…";
      const result = await extractRosterWithVision(prepared.dataUrl);
      $("rosterFailureActions").hidden = true;
      rosterDraft = rosterDraftFromVision(result.players);
      const notes = Array.isArray(result.warnings) ? result.warnings.filter(Boolean) : [];
      $("rosterRawText").value = notes.join("\n");
      $("rosterRawDetails").hidden = !notes.length;
      $("rosterRawDetails").querySelector("summary").textContent = "View import notes";
      $("rosterOcrProgress").value = 100;
      $("rosterOcrStatus").textContent = rosterDraft.length ? `Found ${rosterDraft.length} player${rosterDraft.length === 1 ? "" : "s"}` : "No roster rows were confidently detected";
      const reviewCount = rosterDraft.filter(row => row.review).length;
      $("rosterOcrDetail").textContent = rosterDraft.length
        ? (reviewCount ? `${reviewCount} row${reviewCount === 1 ? "" : "s"} need review. Nothing saves until you confirm.` : "High-confidence draft ready. Review every row before saving.")
        : "Try a closer photo with the full roster visible, or enter the roster manually.";
      if (!rosterDraft.length) rosterDraft.push({id:uid("player"),cap:"",name:"",source:"manual",review:true});
      renderRosterDraft();
      $("rosterDraftMessage").textContent = "Verify the draft, correct anything needed, then save the confirmed roster.";
    } catch (error) {
      rosterDraft = [];
      renderRosterDraft();
      $("rosterOcrProgress").value = 0;
      $("rosterOcrStatus").textContent = "Automatic reading unavailable";
      $("rosterOcrDetail").textContent = "No roster draft was created. Try again, choose another image, or switch to manual entry.";
      $("rosterFailureActions").hidden = false;
      $("rosterDraftMessage").textContent = error.message || "Roster image could not be read.";
    } finally {
      URL.revokeObjectURL(previewUrl);
      rosterOcrBusy = false;
      $("saveRosterDraftButton").disabled = !rosterDraft.length;
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
      await loadTeamMemberships();
      $("dashboardConnectedContent").hidden = false;
      $("dashboardTeamName").textContent = workspace.teamName;
      $("dashboardRoleBadge").textContent = workspace.role;
      $("dashboardRoleMetric").textContent = workspace.role;
      $("dashboardConnectionLabel").textContent = "Connected private workspace";
      $("dashboardConnectionDetail").textContent = `${session.user.email} · ${teamMemberships.length} team workspace${teamMemberships.length === 1 ? "" : "s"} · membership protected`;
      const canCreateGames = ["owner","admin"].includes(workspace.role);
      $("createScrimmageLink").hidden = !canCreateGames;
      $("createScrimmageLink").href = teamScopedUrl("live-sandbox.html", {new:"1"});
      if (workspace.role === "viewer") $("dashboardSubtitle").textContent = "Private read-only game history and team analytics.";
      if (workspace.role === "scorer") $("dashboardSubtitle").textContent = "Open an assigned game to score; Team Owners and Admins manage games and permanent rosters.";
      const canInvite = ["owner","admin"].includes(workspace.role);
      $("teamAccessManagerPanel").hidden = !canInvite;
      $("teamAccessUnavailable").hidden = canInvite;
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
    localStorage.removeItem(window.WPILiveTeamContext?.storageKey || "wpi-live-selected-team-v7-57-3");
    window.location.assign("live-login.html");
  });
  $("dashboardTeamSwitcher").addEventListener("change", event => switchTeam(event.target.value));
  $("createTeamButton").addEventListener("click", openCreateTeamDialog);
  $("confirmCreateTeamButton").addEventListener("click", createAdditionalTeam);
  $("newTeamName").addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); createAdditionalTeam(); } });
  $("createInviteButton").addEventListener("click", createInvite);
  $("inviteRole").addEventListener("change", updateInvitePermissionVisibility);
  $("inviteResult").addEventListener("click", event => {
    if (!lastCreatedInvite) return;
    if (event.target.closest("[data-copy-created-invite]")) copyText(inviteUrl(lastCreatedInvite.token), "Invite link copied.");
    if (event.target.closest("[data-email-created-invite]")) emailInvite(lastCreatedInvite);
  });
  $("teamAccessMembers").addEventListener("change", event => {
    const select = event.target.closest("[data-member-role]");
    if (!select) return;
    const card = select.closest("[data-access-user]");
    const row = card?.querySelector("[data-member-groupme-row]");
    if (row) { row.hidden = select.value !== "admin"; if (row.hidden) row.querySelector("input").checked = false; }
  });
  $("teamAccessMembers").addEventListener("click", async event => {
    try {
      const save = event.target.closest("[data-save-member]");
      if (save) return await saveMemberAccess(save.dataset.saveMember, save.closest("[data-access-user]"));
      const remove = event.target.closest("[data-remove-member]");
      if (remove) return await removeMember(remove.dataset.removeMember);
    } catch (error) { $("inviteMessage").textContent = error.message || "Team access could not be updated."; }
  });
  $("teamAccessInvites").addEventListener("click", async event => {
    const button = event.target.closest("button");
    if (!button) return;
    const id = button.dataset.copyInvite || button.dataset.emailInvite || button.dataset.reissueInvite || button.dataset.revokeInvite;
    const invite = teamAccess.invites.find(row => row.inviteId === id);
    try {
      if (button.dataset.copyInvite && invite) return await copyText(inviteUrl(invite.token), "Invite link copied.");
      if (button.dataset.emailInvite && invite) return emailInvite(invite);
      if (button.dataset.reissueInvite) return await reissueInvite(button.dataset.reissueInvite);
      if (button.dataset.revokeInvite) return await revokeInvite(button.dataset.revokeInvite);
    } catch (error) { $("inviteMessage").textContent = error.message || "Invitation could not be updated."; }
  });
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
  $("retryRosterImageButton").addEventListener("click", () => {
    if (!lastRosterFile) return;
    $("rosterImportDialog").close();
    setTimeout(() => readRosterImage(lastRosterFile), 0);
  });
  $("uploadAnotherRosterButton").addEventListener("click", () => {
    $("rosterImportDialog").close();
    setTimeout(() => { $("rosterUploadInput").value = ""; $("rosterUploadInput").click(); }, 0);
  });
  $("manualRosterFromFailureButton").addEventListener("click", () => {
    $("rosterImportDialog").close();
    setTimeout(() => openRosterDialog({source:"manual", rows:rosterDraftFromCurrent().length ? rosterDraftFromCurrent() : [{id:uid("player"),cap:"",name:"",source:"manual",review:false}]}), 0);
  });
  document.querySelectorAll(".live-dashboard-sidebar nav a").forEach(link => link.addEventListener("click", () => {
    document.querySelectorAll(".live-dashboard-sidebar nav a").forEach(item => item.classList.remove("is-active"));
    link.classList.add("is-active");
  }));

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
