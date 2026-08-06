/* WPI 7.56.6 — no-account, game-scoped Guest Scorer Pass acceptance. */
(() => {
  "use strict";
  const config = window.WPI_LIVE_SANDBOX_CONFIG || {};
  const $ = id => document.getElementById(id);
  let backend = null;
  let preview = null;
  let token = null;
  let gameId = null;

  function setMessage(message, state = "") {
    $("handoffMessage").textContent = message || "";
    $("handoffMessage").dataset.state = state;
  }

  function formatScore(value) {
    const number = Number(value || 0);
    return Number.isInteger(number) ? String(number) : number.toFixed(1);
  }

  function renderPreview(data) {
    preview = data;
    gameId = data.gameId;
    $("handoffPreview").hidden = false;
    $("handoffCodePanel").hidden = true;
    $("handoffIntro").textContent = "Confirm the game and enter the name that should appear in the scoring audit.";
    $("handoffTeamName").textContent = data.teamName || "Team";
    $("handoffOpponentName").textContent = data.opponentName || "Opponent";
    $("handoffScore").textContent = `${formatScore(data.teamScore)}–${formatScore(data.opponentScore)}`;
    $("handoffQuarter").textContent = `Q${Number(data.quarter || 1)}`;
    const details = [];
    if (data.scheduledAt) details.push(new Date(data.scheduledAt).toLocaleString([], {month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}));
    if (data.venue) details.push(data.venue);
    $("handoffMeta").textContent = details.join(" · ") || "Live WPI game";
    $("handoffCurrentScorer").textContent = data.activeScorer
      ? `Current scorer: ${data.activeScorer}. They remain in control until you accept.`
      : "No active scorer is currently shown.";
    setMessage(`Pass expires ${new Date(data.expiresAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}.`);
  }

  async function previewPass({ code = null } = {}) {
    setMessage("Checking handoff…");
    try {
      const data = await backend.previewScorerHandoff({ token, code, gameId });
      renderPreview(data);
    } catch (error) {
      setMessage(error.message || "The scorer pass is unavailable.", "error");
    }
  }

  async function acceptPass() {
    const displayName = $("handoffDisplayName").value.trim();
    if (!displayName) {
      setMessage("Enter the scorer name before continuing.", "error");
      $("handoffDisplayName").focus();
      return;
    }
    $("acceptHandoffButton").disabled = true;
    setMessage("Transferring scoring control…");
    try {
      const result = await backend.acceptScorerHandoff({
        token,
        code: token ? null : $("handoffCode").value.trim(),
        gameId,
        displayName
      });
      sessionStorage.setItem("wpi-live-guest-scorer-name", displayName);
      window.location.replace(`live-sandbox.html?game=${encodeURIComponent(result.gameId)}&guest=1`);
    } catch (error) {
      setMessage(error.message || "Scoring control could not be transferred.", "error");
      $("acceptHandoffButton").disabled = false;
    }
  }

  async function init() {
    if (!window.WPILiveBackend?.isConfigured(config)) {
      setMessage("Connected WPI Live is not configured on this site.", "error");
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    token = hashParams.get("token");
    gameId = params.get("game");
    if (token) {
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
    try {
      backend = await window.WPILiveBackend.connect(config);
      let session = await backend.session();
      if (!session) session = await backend.ensureAnonymousSession();
      const existingName = session?.user?.user_metadata?.display_name;
      if (existingName && existingName !== "Guest scorer") $("handoffDisplayName").value = existingName;
      if (token) {
        await previewPass();
      } else if (gameId) {
        $("handoffIntro").textContent = "Enter the six-digit code shown on the current scorer’s device.";
        $("handoffCodePanel").hidden = false;
      } else {
        setMessage("Open the private QR link or fallback link supplied by the current scorer.", "error");
      }
    } catch (error) {
      setMessage(error.message || "Guest scoring could not start.", "error");
    }
  }

  $("previewCodeButton").addEventListener("click", () => previewPass({ code: $("handoffCode").value.trim() }));
  $("handoffCode").addEventListener("input", event => {
    event.target.value = event.target.value.replace(/\D/g, "").slice(0,6);
  });
  $("handoffCode").addEventListener("keydown", event => {
    if (event.key === "Enter") { event.preventDefault(); previewPass({ code: $("handoffCode").value.trim() }); }
  });
  $("acceptHandoffButton").addEventListener("click", acceptPass);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
