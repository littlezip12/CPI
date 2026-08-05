/* WPI 7.56.3 — private team dashboard with GroupMe connection and delivery audit. */
(() => {
  "use strict";
  const config = window.WPI_LIVE_SANDBOX_CONFIG || {};
  const $ = id => document.getElementById(id);
  let backend = null;
  let workspace = null;
  let games = [];
  let destination = null;
  let deliverySummary = {sent:0,failed:0,pending:0,suppressed:0};

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
    if (latestActive) $("continueLatestGameButton").onclick = () => window.location.assign(`live-sandbox.html?game=${encodeURIComponent(latestActive.id)}`);

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
        <a href="live-sandbox.html?game=${encodeURIComponent(game.id)}">${game.status === "final" ? "Review" : "Open"}</a>
      </article>`;
    }).join("");
  }

  async function loadGames() {
    games = await backend.listGames(workspace.teamId);
    renderGames();
  }

  function renderGroupMe() {
    const canManage = workspace && ["owner","admin"].includes(workspace.role);
    $("groupMeAdminPanel").hidden = !canManage;
    $("groupMeReadOnly").hidden = canManage;
    if (destination) {
      $("groupMeDisplayName").value = destination.display_name || "WPI Live Scoring Test";
      $("groupMeSecretName").value = destination.secret_name || "GROUPME_BOT_ID";
      $("groupMeEnabled").checked = Boolean(destination.enabled);
      $("testGroupMeButton").disabled = !canManage;
      $("dashboardDeliveryMetric").textContent = !destination.enabled
        ? "Connection paused"
        : destination.last_test_status === "sent"
          ? "GroupMe connected"
          : destination.last_test_status === "failed"
            ? "GroupMe needs attention"
            : "Configured — test required";
      const tested = destination.last_tested_at ? new Date(destination.last_tested_at).toLocaleString([], {month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}) : "Not tested yet";
      $("groupMeSetupMessage").textContent = destination.last_test_status === "sent"
        ? `Test message sent · ${tested}`
        : destination.last_test_status === "failed"
          ? `Last test failed · ${destination.last_test_error || tested}`
          : `Saved · ${tested}`;
      $("groupMeReadOnly").textContent = `${destination.display_name} · ${destination.enabled ? "connected" : "paused"}`;
    } else {
      $("dashboardDeliveryMetric").textContent = "Not connected";
      $("testGroupMeButton").disabled = true;
      $("groupMeSetupMessage").textContent = canManage ? "Save the destination after the bot secret has been added in Supabase." : "No GroupMe destination is connected yet.";
      $("groupMeReadOnly").textContent = "No GroupMe destination is connected yet.";
    }
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

  async function saveGroupMe() {
    $("saveGroupMeButton").disabled = true;
    $("groupMeSetupMessage").textContent = "Saving GroupMe destination…";
    try {
      destination = await backend.saveGroupMeDestination(
        workspace.teamId,
        $("groupMeDisplayName").value.trim(),
        $("groupMeSecretName").value.trim(),
        $("groupMeEnabled").checked
      );
      $("groupMeSetupMessage").textContent = "Connection saved. Send a test message before using it during a game.";
      renderGroupMe();
    } catch (error) {
      $("groupMeSetupMessage").textContent = error.message;
    } finally {
      $("saveGroupMeButton").disabled = false;
    }
  }

  async function testGroupMe() {
    if (!destination?.id) return;
    $("testGroupMeButton").disabled = true;
    $("groupMeSetupMessage").textContent = "Sending WPI Live test message…";
    try {
      await backend.testGroupMeDestination(destination.id, `WPI Live test: ${workspace.teamName} is connected and ready for parent game updates.`);
      destination = await backend.loadGroupMeDestination(workspace.teamId);
      $("groupMeSetupMessage").textContent = "Test message sent successfully.";
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
      try { demoSession = JSON.parse(localStorage.getItem("wpi-live-auth-v7-56-3") || localStorage.getItem("wpi-live-auth-v7-56-1") || "null"); } catch (_) { demoSession = null; }
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
      const canScore = ["owner","admin","scorer"].includes(workspace.role);
      $("createScrimmageLink").hidden = !canScore;
      if (!canScore) $("dashboardSubtitle").textContent = "Private read-only game history and team analytics.";
      const canInvite = ["owner","admin"].includes(workspace.role);
      $("invitePanel").hidden = !canInvite;
      $("inviteUnavailable").hidden = canInvite;
      if (workspace.role !== "owner") $("inviteRole").querySelector('option[value="admin"]')?.remove();
      await Promise.all([loadGames(), loadGroupMe()]);
    } catch (error) {
      $("dashboardConnectionLabel").textContent = "Connected setup needs attention";
      $("dashboardConnectionDetail").textContent = error.message;
    }
  }

  $("dashboardSignOutButton").addEventListener("click", async () => {
    if (backend) await backend.signOut();
    localStorage.removeItem("wpi-live-auth-v7-56-3");
    localStorage.removeItem("wpi-live-auth-v7-56-1");
    window.location.assign("live-login.html");
  });
  $("createInviteButton").addEventListener("click", createInvite);
  $("saveGroupMeButton").addEventListener("click", saveGroupMe);
  $("testGroupMeButton").addEventListener("click", testGroupMe);
  $("refreshGamesButton").addEventListener("click", () => loadGames().catch(error => { $("dashboardConnectionDetail").textContent = error.message; }));

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
