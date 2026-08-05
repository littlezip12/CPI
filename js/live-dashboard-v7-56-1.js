/* WPI 7.56.1 — private team dashboard. */
(() => {
  "use strict";
  const config = window.WPI_LIVE_SANDBOX_CONFIG || {};
  const $ = id => document.getElementById(id);
  let backend = null;
  let workspace = null;
  let games = [];

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
      try { demoSession = JSON.parse(localStorage.getItem("wpi-live-auth-v7-56-1") || "null"); } catch (_) { demoSession = null; }
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
      await loadGames();
    } catch (error) {
      $("dashboardConnectionLabel").textContent = "Connected setup needs attention";
      $("dashboardConnectionDetail").textContent = error.message;
    }
  }

  $("dashboardSignOutButton").addEventListener("click", async () => {
    if (backend) await backend.signOut();
    localStorage.removeItem("wpi-live-auth-v7-56-1");
    window.location.assign("live-login.html");
  });
  $("createInviteButton").addEventListener("click", createInvite);
  $("refreshGamesButton").addEventListener("click", () => loadGames().catch(error => { $("dashboardConnectionDetail").textContent = error.message; }));

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
