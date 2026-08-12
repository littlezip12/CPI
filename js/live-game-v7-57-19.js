/* WPI 7.57.18 — Scorer Access & Game Recovery.
 * Extends the validated WPI Live game surface with always-visible Notes, clearer
 * Game actions language, and a guarded Reopen Game recovery path after an
 * accidental final. Core scoring/event/delivery behavior remains 7.56.15.
 */
(() => {
  "use strict";

  const RELEASE = "7.56.15";
  const STORAGE_KEY = "wpi-live-sandbox-v7-56-15";
  const LEGACY_STORAGE_KEYS = ["wpi-live-sandbox-v7-56-14","wpi-live-sandbox-v7-56-13","wpi-live-sandbox-v7-56-12","wpi-live-sandbox-v7-56-11","wpi-live-sandbox-v7-56-10","wpi-live-sandbox-v7-56-9","wpi-live-sandbox-v7-56-8","wpi-live-sandbox-v7-56-5","wpi-live-sandbox-v7-56-3","wpi-live-sandbox-v7-56-2","wpi-live-sandbox-v7-56-1","wpi-live-sandbox-v7-56-0","wpi-live-sandbox-v7-55-9", "wpi-live-sandbox-v7-55-8", "wpi-live-sandbox-v7-55-6", "wpi-live-sandbox-v7-55-5", "wpi-live-sandbox-v7-55-4", "wpi-live-sandbox-v7-55-3", "wpi-live-sandbox-v7-55-2"];
  const AUTH_KEY = "wpi-live-auth-v7-56-15";
  const LEGACY_AUTH_KEYS = ["wpi-live-auth-v7-56-14","wpi-live-auth-v7-56-13","wpi-live-auth-v7-56-12","wpi-live-auth-v7-56-11","wpi-live-auth-v7-56-10","wpi-live-auth-v7-56-9","wpi-live-auth-v7-56-8","wpi-live-auth-v7-56-5","wpi-live-auth-v7-56-3","wpi-live-auth-v7-56-2","wpi-live-auth-v7-56-1","wpi-live-auth-v7-56-0","wpi-live-auth-v7-55-9", "wpi-live-auth-v7-55-8", "wpi-live-auth-v7-55-6", "wpi-live-auth-v7-55-5", "wpi-live-auth-v7-55-4", "wpi-live-auth-v7-55-3"];
  const config = window.WPI_LIVE_SANDBOX_CONFIG || {};
  const $ = id => document.getElementById(id);
  const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));
  const roundScore = value => Math.round((Number(value) || 0) * 10) / 10;
  const displayScore = value => Number.isInteger(roundScore(value)) ? String(roundScore(value)) : roundScore(value).toFixed(1);
  const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
  const GROUPME_SAFE_MESSAGE_LIMIT = 900;
  const GROUPME_SUMMARY_PAYLOAD_TARGET = 820;


  const EVENT_TYPES = [
    {id:"goal", label:"Goal", dropdownLabel:"Goal — our team", playerLabel:"Scorer", category:"scoring", requiresPlayer:true, allowsAssist:true, teamDelta:1, teamShotDelta:1, priority:"major"},
    {id:"opponent_goal", label:"Opponent goal", dropdownLabel:"Goal — opponent", category:"scoring", requiresPlayer:false, opponentDelta:1, opponentShotDelta:1, priority:"major"},
    {id:"shot_missed", label:"Shot missed", dropdownLabel:"Shot missed the goal — our team", playerLabel:"Shooter", category:"shots", requiresPlayer:true, teamShotDelta:1, priority:"all"},
    {id:"shot_post", label:"Shot off post", dropdownLabel:"Shot off the post — our team", playerLabel:"Shooter", category:"shots", requiresPlayer:true, teamShotDelta:1, priority:"all"},
    {id:"shot_blocked", label:"Shot blocked in play", dropdownLabel:"Shot blocked in play — our team", playerLabel:"Shooter", category:"shots", requiresPlayer:true, teamShotDelta:1, opponentFieldBlockDelta:1, priority:"all"},
    {id:"shot_saved", label:"Shot saved by opponent goalie", dropdownLabel:"Shot saved by opponent goalie — our team", playerLabel:"Shooter", category:"shots", requiresPlayer:true, teamShotDelta:1, opponentSaveDelta:1, priority:"all"},
    {id:"field_block", label:"Field block", dropdownLabel:"Field block — our defense", playerLabel:"Player making block", category:"defense", requiresPlayer:true, opponentShotDelta:1, fieldBlockDelta:1, priority:"all"},
    {id:"save", label:"Goalie save", dropdownLabel:"Goalie save — our defense", playerLabel:"Goalie making save", category:"defense", requiresPlayer:true, opponentShotDelta:1, saveDelta:1, priority:"all"},
    {id:"steal", label:"Steal", playerLabel:"Player making steal", category:"defense", requiresPlayer:true, priority:"all"},
    {id:"turnover", label:"Turnover", playerLabel:"Player", category:"possession", requiresPlayer:true, priority:"all"},
    {id:"exclusion_drawn", label:"Exclusion drawn", dropdownLabel:"Exclusion drawn — our player earned it", playerLabel:"Player drawing exclusion", category:"exclusions", requiresPlayer:true, priority:"major"},
    {id:"exclusion_committed", label:"Exclusion called on", dropdownLabel:"Exclusion called on — our player excluded", playerLabel:"Excluded player", category:"exclusions", requiresPlayer:true, priority:"major"},
    {id:"five_meter_drawn", label:"5m drawn", dropdownLabel:"5m drawn — our player earned it", playerLabel:"Player drawing 5m", category:"penalties", requiresPlayer:true, priority:"major"},
    {id:"five_meter_committed", label:"5m called on", dropdownLabel:"5m called on — our player committed it", playerLabel:"Player called for 5m", category:"penalties", requiresPlayer:true, priority:"major"}
  ];
  const EVENT_MAP = new Map(EVENT_TYPES.map(item => [item.id, item]));
  const QUICK_EVENT_ACTIONS = [
    {id:"goals", label:"Goals", variants:["goal","opponent_goal"], icon:"goal"},
    {id:"shots", label:"Shots", variants:["shot_missed","shot_post","shot_blocked","shot_saved"], icon:"shots"},
    {id:"saves", label:"Saves", variants:["save","field_block"], icon:"save"},
    {id:"steals", label:"Steals", eventId:"steal", icon:"steal"},
    {id:"exclusions", label:"Exclusions", variants:["exclusion_drawn","exclusion_committed"], icon:"exclusion"},
    {id:"turnover", label:"Turnover", eventId:"turnover", icon:"turnover"},
    {id:"five_meter", label:"5M", variants:["five_meter_drawn","five_meter_committed"], icon:"five_meter"}
  ];
  const QUICK_EVENT_VARIANT_LABELS = {
    shot_missed:"Missed",
    shot_post:"Post",
    shot_blocked:"Blocked",
    shot_saved:"Saved",
    save:"Goalie save",
    field_block:"Field block",
    exclusion_drawn:"Drawn by us",
    exclusion_committed:"Committed by us",
    five_meter_drawn:"Drawn by us",
    five_meter_committed:"Committed by us"
  };
  const QUICK_EVENT_ICONS = {
    goal:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7.25"/><path d="M12 4.75 9.2 8l1.1 3.3h3.4L14.8 8 12 4.75Zm-1.7 6.55-3.45 2.1 1.3 3.65h3.85m1.7-5.75 3.45 2.1-1.3 3.65H12m-3.85 0 1.7 2.2m6-2.2-1.7 2.2"/></svg>',
    shots:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5 10.2 13.3"/><path d="m8.4 12.4 2.5 2.5"/><circle cx="15.5" cy="8.5" r="4.2"/><path d="M15.5 4.3v8.4M11.3 8.5h8.4"/></svg>',
    save:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 18.5 6v5.2c0 4.2-2.7 7.5-6.5 9.3-3.8-1.8-6.5-5.1-6.5-9.3V6L12 3.5Z"/><path d="m9.3 12 1.7 1.7 3.8-4"/></svg>',
    steal:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 12.5V9.8m2.4 2.7V7.7m2.4 4.8V6.8m2.4 6.2V8.6m0 4.4 1.1-1.2c1.3-1.5 3.6.4 2.4 2l-3.6 4.4a4.3 4.3 0 0 1-3.4 1.6H9.5a4 4 0 0 1-4-4v-3.3c0-1.7 2.3-2.1 3-.6l1.1 2.2"/></svg>',
    exclusion:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/><circle cx="12" cy="12" r="8.25"/></svg>',
    turnover:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.5 8.2A7.5 7.5 0 0 0 5.7 6.7L4 8.4m1.5 7.4a7.5 7.5 0 0 0 12.8 1.5l1.7-1.7"/><path d="M4.1 4.8 4 8.5l3.7-.1m12.2 10.8.1-3.7-3.7.1"/></svg>',
    five_meter:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="7.5"/><path d="M12 9.2v4.1l2.8 1.8M9 3.5h6M12 3.5V6"/></svg>'
  };

  function defaultRoster() {
    return Array.from({length:12}, (_, index) => ({
      id:`p${index + 1}`,
      cap:String(index + 1),
      name:index === 0 ? "Goalkeeper" : `Player ${index + 1}`
    }));
  }

  function defaultState() {
    return {
      release: RELEASE,
      environment: "sandbox",
      mode: config.mode || "demo",
      setup: {
        source: "manual_scrimmage",
        teamName: "Lamorinda A 14U Boys",
        opponentName: "Scrimmage Opponent",
        gameDateTime: "",
        venue: "",
        ageGroup: "14U",
        quarterLength: 7,
        groupMeName: "WPI Live Scoring Test",
        messageFrequency: "all",
        visibility: config.defaultVisibility || "team_private",
        roster: defaultRoster(),
        defaultLineup: [],
        defaultGoalieId: null
      },
      game: {
        id: uid("sandbox-game"),
        createdByUserId: null,
        status: "setup",
        quarter: 1,
        clockMinutes: 7,
        clockSeconds: 0,
        teamScore: 0,
        opponentScore: 0,
        messagesPaused: false,
        events: [],
        messages: [],
        lineups: {},
        lineupGoalies: {},
        pendingQuarter: null,
        phase: "regulation",
        overtimeLength: 2,
        overtimeMultiplePeriods: true,
        shootout: {
          active: false,
          firstTeam: null,
          nextTeam: null,
          teamAttempts: 0,
          opponentAttempts: 0,
          teamGoals: 0,
          opponentGoals: 0
        },
        startedAt: null,
        endedAt: null
      }
    };
  }

  function loadState() {
    const keys = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS];
    for (const key of keys) {
      try {
        const stored = JSON.parse(localStorage.getItem(key) || "null");
        if (!stored || stored.environment !== "sandbox") continue;
        stored.release = RELEASE;
        stored.mode = config.mode || stored.mode || "demo";
        if (!stored.setup || !stored.game) continue;
        stored.setup.ageGroup = stored.setup.ageGroup || "14U";
        if (!stored.setup.teamName || stored.setup.teamName === "Pilot Team") stored.setup.teamName = "Lamorinda A 14U Boys";
        stored.setup.defaultLineup = Array.isArray(stored.setup.defaultLineup) ? stored.setup.defaultLineup : [];
        stored.setup.defaultGoalieId = stored.setup.defaultGoalieId || null;
        stored.game.lineups = stored.game.lineups || {};
        stored.game.lineupGoalies = stored.game.lineupGoalies || {};
        stored.game.pendingQuarter = stored.game.pendingQuarter || null;
        stored.game.phase = stored.game.phase || (Number(stored.game.quarter) > 4 ? "overtime" : "regulation");
        stored.game.overtimeLength = clamp(stored.game.overtimeLength || 2, 1, 3);
        stored.game.overtimeMultiplePeriods = stored.game.overtimeMultiplePeriods !== false;
        stored.game.shootout = Object.assign({active:false, firstTeam:null, nextTeam:null, teamAttempts:0, opponentAttempts:0, teamGoals:0, opponentGoals:0}, stored.game.shootout || {});
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
        return stored;
      } catch (_) { /* try the next key */ }
    }
    return defaultState();
  }

  let state = loadState();
  let pendingLineupQuarter = 1;
  let supabase = null;
  let backend = null;
  let workspace = null;
  let unsubscribeRemote = null;
  let unsubscribeDeliveries = null;
  let groupMeDestination = null;
  let deliveryRetryTimer = null;
  let remoteSyncTimer = null;
  let remoteSyncInFlight = false;
  let remoteSyncPending = false;
  let editingSetup = false;
  let scorerControl = null;
  let activeHandoffPass = null;
  let readOnlyScorer = false;

  function setSyncStatus(label, status = "local") {
    const node = $("backendSyncStatus");
    if (!node) return;
    node.textContent = label;
    node.dataset.state = status;
  }


  function scorerControlFromRow(row = {}) {
    const activeUserId = row.active_scorer_user_id || row.activeUserId || null;
    const activeDisplayName = row.active_scorer_display_name || row.activeDisplayName || null;
    const activeKind = row.active_scorer_kind || row.activeKind || null;
    const activeSessionId = row.active_scorer_session_id || row.activeSessionId || null;
    const controlVersion = row.scorer_control_version ?? row.controlVersion ?? 0;
    const canManage = Boolean(workspace && ["owner","admin"].includes(workspace.role));
    const canScore = Boolean(row.canScore ?? (activeUserId && backend?.user?.id === activeUserId));
    return {
      activeUserId,
      activeDisplayName,
      activeKind,
      activeSessionId,
      controlVersion,
      canScore,
      canManage: Boolean(row.canManage ?? canManage),
      canTransfer: Boolean(row.canTransfer ?? (canScore || canManage)),
      callerSessionStatus: row.callerSessionStatus || null
    };
  }

  function renderScorerControl() {
    const strip = $("scorerControlStrip");
    if (!strip) return;
    const hasRemoteGame = Boolean(backend && state.game.remoteId);
    strip.hidden = !hasRemoteGame;
    if (!hasRemoteGame) {
      $("scorerReadOnlyNotice").hidden = true;
      document.body.classList.remove("is-live-read-only-scorer");
      return;
    }
    const control = scorerControl || {};
    $("activeScorerName").textContent = control.activeDisplayName || "Not assigned";
    const gameOpen = !["ended","final","cancelled"].includes(state.game.status);
    $("transferScoringButton").hidden = !(gameOpen && control.canTransfer);
    $("transferScoringInlineButton").hidden = !(gameOpen && control.canTransfer);
    $("takeOverScoringButton").hidden = !(gameOpen && control.canManage && !control.canScore);
    readOnlyScorer = gameOpen && !control.canScore;
    document.body.classList.toggle("is-live-read-only-scorer", readOnlyScorer);
    const notice = $("scorerReadOnlyNotice");
    notice.hidden = !readOnlyScorer;
    if (readOnlyScorer) {
      $("scorerReadOnlyMessage").textContent = control.activeDisplayName
        ? `${control.activeDisplayName} is scoring. You’re viewing only.`
        : "You’re viewing only until scoring control is assigned.";
      $("enterScorerCodeInlineButton").hidden = !gameOpen;
      if (activeHandoffPass && control.activeDisplayName) {
        setHandoffState(`✓ ${control.activeDisplayName} has taken control`, "accepted");
        $("scorerHandoffMessage").textContent = "Transfer complete. This device is now read-only.";
      }
    }
  }

  function applyScorerControl(control) {
    scorerControl = scorerControlFromRow(control || {});
    if (backend) backend.scorerControl = scorerControl;
    renderScorerControl();
    applyRoleAccess();
  }

  async function refreshScorerControl(gameId = state.game.remoteId) {
    if (!backend || !gameId) return null;
    const control = await backend.scorerControlStatus(gameId);
    applyScorerControl(control);
    return scorerControl;
  }


  function scoringActionAllowed() {
    if (!backend) return true;
    if (!readOnlyScorer && scorerControl?.canScore !== false) return true;
    $("connectionDetail").textContent = scorerControl?.activeDisplayName
      ? `${scorerControl.activeDisplayName} currently controls scoring.`
      : "This device does not currently control scoring.";
    return false;
  }

  function setHandoffState(label, stateName = "waiting") {
    const node = $("scorerHandoffState");
    if (!node) return;
    node.dataset.state = stateName;
    const strong = node.querySelector("strong");
    if (strong) strong.textContent = label;
  }

  async function createScorerHandoffPass() {
    if (!backend) return;
    if (!state.game.remoteId) await pushRemoteState();
    if (!state.game.remoteId) {
      $("connectionDetail").textContent = "Save the game before creating a scorer handoff.";
      return;
    }
    $("scorerHandoffMessage").textContent = "Creating a private scorer pass…";
    setHandoffState("Creating scorer pass…", "working");
    try {
      activeHandoffPass = await backend.createScorerHandoffPass(state.game.remoteId);
      const base = window.location.href.replace(/live-(?:sandbox|game)\.html.*$/, "live-scorer-handoff.html");
      const qrUrl = `${base}#token=${encodeURIComponent(activeHandoffPass.token)}`;
      const fallbackUrl = `${base}?game=${encodeURIComponent(activeHandoffPass.gameId)}`;
      $("scorerHandoffCode").textContent = activeHandoffPass.code;
      $("scorerHandoffLink").textContent = fallbackUrl;
      $("scorerHandoffLink").dataset.copyUrl = qrUrl;
      $("scorerHandoffExpiry").textContent = `Expires ${new Date(activeHandoffPass.expiresAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}.`;
      $("scorerHandoffMessage").textContent = "Scan the QR code, or use the six-digit code if needed.";
      setHandoffState("Waiting for new scorer…", "waiting");
      const qrNode = $("scorerHandoffQr");
      qrNode.innerHTML = "";
      if (window.QRCode) {
        new window.QRCode(qrNode, {
          text: qrUrl,
          width: 240,
          height: 240,
          correctLevel: window.QRCode.CorrectLevel.M
        });
      } else {
        qrNode.textContent = "QR generation did not load. Use the backup link and backup code instead.";
      }
      if (!$("scorerHandoffDialog").open) $("scorerHandoffDialog").showModal();
    } catch (error) {
      $("scorerHandoffMessage").textContent = error.message;
      if (!$("scorerHandoffDialog").open) $("scorerHandoffDialog").showModal();
    }
  }

  async function revokeScorerHandoffPass() {
    if (!activeHandoffPass?.passId) return;
    try {
      await backend.revokeScorerHandoffPass(activeHandoffPass.passId);
      $("scorerHandoffMessage").textContent = "The scorer pass was revoked.";
      setHandoffState("Transfer cancelled", "revoked");
      activeHandoffPass = null;
      $("scorerHandoffQr").innerHTML = "";
      $("scorerHandoffCode").textContent = "—";
    } catch (error) {
      $("scorerHandoffMessage").textContent = error.message;
    }
  }

  async function takeOverScoring() {
    if (!backend || !state.game.remoteId) return;
    if (!confirm(`Take over scoring from ${scorerControl?.activeDisplayName || "the current scorer"}? Their device will become read-only.`)) return;
    $("takeOverScoringButton").disabled = true;
    try {
      const control = await backend.takeOverGameScoring(state.game.remoteId);
      applyScorerControl(control);
      setSyncStatus("Scoring control transferred", "saved");
    } catch (error) {
      $("connectionDetail").textContent = error.message;
    } finally {
      $("takeOverScoringButton").disabled = false;
    }
  }

  function defaultScorerClaimName() {
    return workspace?.scorerDisplayName || backend?.user?.user_metadata?.display_name || backend?.user?.email?.split("@")[0] || "";
  }

  function openInGameScorerCodeDialog() {
    if (!state.game.remoteId) return;
    $("inGameScorerCode").value = "";
    $("inGameScorerDisplayName").value = defaultScorerClaimName();
    $("inGameScorerPreview").hidden = true;
    $("inGameScorerPreview").innerHTML = "";
    $("inGameScorerCodeMessage").textContent = "Enter the code supplied by the current scorer.";
    $("acceptInGameScorerCodeButton").disabled = false;
    $("scorerCodeDialog").showModal();
    setTimeout(() => $("inGameScorerCode").focus(), 0);
  }

  async function previewInGameScorerCode() {
    const code = $("inGameScorerCode").value.replace(/\D/g, "").slice(0,6);
    $("inGameScorerCode").value = code;
    if (code.length !== 6 || !state.game.remoteId) {
      $("inGameScorerCodeMessage").textContent = "Enter the six-digit code.";
      return;
    }
    $("previewInGameScorerCodeButton").disabled = true;
    $("inGameScorerCodeMessage").textContent = "Checking scorer code…";
    try {
      const preview = await backend.previewScorerHandoff({code, gameId:state.game.remoteId});
      $("inGameScorerPreview").hidden = false;
      $("inGameScorerPreview").innerHTML = `<strong>${preview.teamName} vs ${preview.opponentName}</strong><p>${formatScore(preview.teamScore)}–${formatScore(preview.opponentScore)} · Q${Number(preview.quarter || 1)}</p><p>Current scorer: ${preview.activeScorer || "Not assigned"}</p>`;
      $("inGameScorerCodeMessage").textContent = `Valid until ${new Date(preview.expiresAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}.`;
      $("acceptInGameScorerCodeButton").disabled = false;
    } catch (error) {
      $("inGameScorerPreview").hidden = true;
      $("acceptInGameScorerCodeButton").disabled = false;
      $("inGameScorerCodeMessage").textContent = error.message || "The scorer code is unavailable.";
    } finally {
      $("previewInGameScorerCodeButton").disabled = false;
    }
  }

  async function acceptInGameScorerCode() {
    const code = $("inGameScorerCode").value.replace(/\D/g, "").slice(0,6);
    const displayName = $("inGameScorerDisplayName").value.trim();
    $("inGameScorerCode").value = code;
    if (code.length !== 6) { $("inGameScorerCodeMessage").textContent = "Enter the six-digit code."; return; }
    if (!displayName) { $("inGameScorerCodeMessage").textContent = "Enter the scorer name."; return; }
    if (!state.game.remoteId) { $("inGameScorerCodeMessage").textContent = "This game is not connected yet."; return; }
    $("acceptInGameScorerCodeButton").disabled = true;
    $("inGameScorerCodeMessage").textContent = "Checking code and transferring scoring control…";
    try {
      await backend.previewScorerHandoff({code, gameId:state.game.remoteId});
      await backend.acceptScorerHandoff({code, gameId:state.game.remoteId, displayName});
      window.location.replace(`live-game.html?game=${encodeURIComponent(state.game.remoteId)}`);
    } catch (error) {
      $("inGameScorerCodeMessage").textContent = error.message || "Scoring control could not be transferred.";
      $("acceptInGameScorerCodeButton").disabled = false;
    }
  }

  async function shareScorerHandoffLink() {
    const url = $("scorerHandoffLink").dataset.copyUrl || $("scorerHandoffLink").textContent;
    if (!url) return;
    if (navigator.share) {
      try { await navigator.share({title:"WPI Guest Scorer Pass", text:"Use this private pass to take over scoring.", url}); return; } catch (error) { if (error?.name === "AbortError") return; }
    }
    await navigator.clipboard.writeText(url);
    $("scorerHandoffMessage").textContent = "Private handoff link copied.";
  }

  function applyDeliveryStatuses(rows = []) {
    const statusMap = new Map(rows.map(row => [row.eventId, row]));
    let changed = false;
    for (const message of state.game.messages || []) {
      const remote = statusMap.get(message.eventId);
      if (!remote) continue;
      const next = remote.status === "sent" ? "sent" : remote.status === "failed" ? "failed" : remote.status === "suppressed" ? "suppressed" : "pending";
      if (message.status !== next || message.attemptCount !== remote.attemptCount || message.nextRetryAt !== remote.nextRetryAt || message.lastError !== remote.lastError) {
        message.status = next;
        message.attemptCount = remote.attemptCount || 0;
        message.nextRetryAt = remote.nextRetryAt || null;
        message.sentAt = remote.sentAt || null;
        message.lastError = remote.lastError || "";
        changed = true;
      }
    }
    if (changed) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      renderMessages();
    }
  }

  async function refreshDeliveryStatuses(gameId = state.game.remoteId) {
    if (!backend || !gameId) return;
    try {
      applyDeliveryStatuses(await backend.loadDeliveryStatuses(gameId));
    } catch (_) { /* game state remains available even if delivery audit refresh fails */ }
  }

  function deliveryIsDue(message) {
    if (!message || !["pending", "failed"].includes(message.status)) return false;
    if (!message.nextRetryAt) return true;
    return new Date(message.nextRetryAt).getTime() <= Date.now();
  }

  function canDeliverAfterGameEnd() {
    if (state.game.status !== "ended" || !backend?.user?.id) return false;
    return ["owner", "admin"].includes(workspace?.role) || state.game.endedByUserId === backend.user.id;
  }

  async function deliverMessage(message, remoteEventId, options = {}) {
    if (!backend || !remoteEventId || !message) return;
    message.status = "sending";
    message.lastError = "";
    renderMessages();
    try {
      const result = await backend.invokeGroupMeDelivery(remoteEventId, options);
      message.status = result.status === "already_sent" ? "sent" : result.status === "suppressed" ? "suppressed" : result.status === "queued" ? "pending" : "sent";
      message.nextRetryAt = result.next_retry_at || result.delivery?.next_retry_at || null;
      message.attemptCount = result.delivery?.attempt_count || message.attemptCount || 0;
      message.sentAt = message.status === "sent" ? (result.delivery?.sent_at || new Date().toISOString()) : null;
    } catch (error) {
      message.status = "failed";
      message.lastError = error.message;
      message.nextRetryAt = message.nextRetryAt || new Date(Date.now() + 60000).toISOString();
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderMessages();
  }

  async function deliverPendingMessages(result, forceEventIds = new Set()) {
    const finalDeliveryAllowed = canDeliverAfterGameEnd();
    if (!backend || (!finalDeliveryAllowed && (readOnlyScorer || scorerControl?.canScore === false)) || !groupMeDestination?.enabled || state.game.messagesPaused) return;
    const eventMap = result?.remoteEventMap || {};
    let dispatchStateChanged = false;
    for (const message of [...(state.game.messages || [])].reverse()) {
      const force = forceEventIds.has(message.eventId);
      if (!force && !deliveryIsDue(message)) continue;

      if (message.requiresEventId) {
        const prerequisite = (state.game.messages || []).find(item => item.eventId === message.requiresEventId);
        if (prerequisite && !["sent","suppressed","mock"].includes(prerequisite.status)) continue;
      }

      let remoteEventId = eventMap[message.eventId] || message.remoteEventId || null;
      if (!remoteEventId && result?.remoteGameId) {
        try {
          remoteEventId = await backend.resolveRemoteEventId(result.remoteGameId, message.eventId);
          if (remoteEventId) { eventMap[message.eventId] = remoteEventId; message.remoteEventId = remoteEventId; }
        } catch (error) {
          message.status = "failed";
          message.lastError = `Delivery dispatch lookup failed: ${error.message}`;
          message.nextRetryAt = new Date(Date.now() + 60000).toISOString();
          dispatchStateChanged = true;
          continue;
        }
      }

      if (remoteEventId) message.remoteEventId = remoteEventId;

      if (!remoteEventId) {
        message.status = "failed";
        message.lastError = "Play saved, but its server event ID could not be resolved for GroupMe delivery.";
        message.nextRetryAt = new Date(Date.now() + 60000).toISOString();
        dispatchStateChanged = true;
        continue;
      }

      await deliverMessage(message, remoteEventId, { force, triggerSource: force ? "manual_retry" : "scorer" });
    }
    if (dispatchStateChanged) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      renderMessages();
    }
    clearTimeout(deliveryRetryTimer);
    const future = (state.game.messages || [])
      .filter(message => ["pending", "failed"].includes(message.status) && message.nextRetryAt)
      .map(message => new Date(message.nextRetryAt).getTime())
      .filter(time => time > Date.now())
      .sort((a,b) => a-b)[0];
    if (future) deliveryRetryTimer = setTimeout(() => scheduleRemoteSync(10), Math.min(future - Date.now() + 250, 60000));
  }

  async function retryMessage(eventId) {
    const finalDeliveryAllowed = canDeliverAfterGameEnd();
    if (!backend || (!finalDeliveryAllowed && (readOnlyScorer || scorerControl?.canScore === false)) || !state.game.remoteId) return;
    const message = (state.game.messages || []).find(item => item.eventId === eventId);
    if (!message) return;
    try {
      if (finalDeliveryAllowed && state.game.status === "ended") {
        let remoteEventId = message.remoteEventId || null;
        if (!remoteEventId) {
          remoteEventId = await backend.resolveRemoteEventId(state.game.remoteId, message.eventId);
          if (remoteEventId) message.remoteEventId = remoteEventId;
        }
        if (!remoteEventId) throw new Error("The final event has not been stored on the server yet.");
        await deliverMessage(message, remoteEventId, { force:true, triggerSource:"manual_retry" });
        await refreshDeliveryStatuses(state.game.remoteId);
        return;
      }
      const result = await backend.syncState(state);
      await deliverPendingMessages(result, new Set([eventId]));
      await refreshDeliveryStatuses(result.remoteGameId);
    } catch (error) {
      message.status = "failed";
      message.lastError = error.message;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      renderMessages();
    }
  }

  async function pushRemoteState() {
    if (readOnlyScorer || scorerControl?.canScore === false) return null;
    if (!backend || !workspace || remoteSyncInFlight) {
      if (remoteSyncInFlight) remoteSyncPending = true;
      return;
    }
    remoteSyncInFlight = true;
    remoteSyncPending = false;
    setSyncStatus("Saving…", "saving");
    try {
      const result = await backend.syncState(state);
      state.game.remoteId = result.remoteGameId;
      groupMeDestination = result.destination || groupMeDestination;
      if (result.scorerControl) applyScorerControl(result.scorerControl);
      else await refreshScorerControl(result.remoteGameId);
      applyDeliveryStatuses(result.deliveryStatuses || []);
      await deliverPendingMessages(result);
      await refreshDeliveryStatuses(result.remoteGameId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setSyncStatus("Saved", "saved");
      const url = new URL(window.location.href);
      if (!url.searchParams.get("game")) {
        url.searchParams.delete("new");
        url.searchParams.set("game", result.remoteGameId);
        history.replaceState(null, "", url);
      }
      if (!unsubscribeRemote) unsubscribeRemote = backend.subscribeToGame(result.remoteGameId, (remoteState, remoteRow) => {
        if (remoteRow) applyScorerControl(remoteRow);
        if (!remoteState || remoteSyncInFlight) return;
        state = remoteState;
        state.release = RELEASE;
        state.mode = "connected";
        state.game.remoteId = result.remoteGameId;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        fillSetupForm();
        renderAll();
        refreshDeliveryStatuses(result.remoteGameId);
        setSyncStatus("Synced", "saved");
      });
      if (!unsubscribeDeliveries) unsubscribeDeliveries = backend.subscribeToDeliveries(result.remoteGameId, () => refreshDeliveryStatuses(result.remoteGameId));
      return result;
    } catch (error) {
      if (error.scorerControl) applyScorerControl(error.scorerControl);
      else if (state.game.remoteId && backend) refreshScorerControl(state.game.remoteId).catch(() => {});
      setSyncStatus(error.code === "WPI_SCORER_READ_ONLY" ? "Read only" : "Sync failed", error.code === "WPI_SCORER_READ_ONLY" ? "saved" : "error");
      $("connectionDetail").textContent = error.code === "WPI_SCORER_READ_ONLY"
        ? error.message
        : `Local copy preserved · ${error.message}`;
      return null;
    } finally {
      remoteSyncInFlight = false;
      if (remoteSyncPending) scheduleRemoteSync(100);
    }
  }

  function scheduleRemoteSync(delay = 650) {
    if (!backend || !workspace) return;
    clearTimeout(remoteSyncTimer);
    remoteSyncTimer = setTimeout(pushRemoteState, delay);
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (!readOnlyScorer) scheduleRemoteSync();
  }

  function quarterText(value = state.game.quarter) {
    const numeric = Number(value);
    return numeric > 4 ? `OT${numeric - 4}` : `Q${numeric}`;
  }

  function shootoutRound() {
    if (!state.game.shootout?.active) return 1;
    return Math.min(state.game.shootout.teamAttempts, state.game.shootout.opponentAttempts) + 1;
  }

  function nextShootoutTeamFromEvents() {
    const attempts = activeEvents().filter(event => ["shootout_goal", "shootout_miss"].includes(event.type));
    if (!state.game.shootout.firstTeam) return "team";
    return attempts.length % 2 === 0
      ? state.game.shootout.firstTeam
      : (state.game.shootout.firstTeam === "team" ? "opponent" : "team");
  }

  function recalculateShootout() {
    const attempts = activeEvents().filter(event => ["shootout_goal", "shootout_miss"].includes(event.type));
    state.game.shootout.teamAttempts = attempts.filter(event => event.shootoutTeam === "team").length;
    state.game.shootout.opponentAttempts = attempts.filter(event => event.shootoutTeam === "opponent").length;
    state.game.shootout.teamGoals = attempts.filter(event => event.shootoutTeam === "team" && event.type === "shootout_goal").length;
    state.game.shootout.opponentGoals = attempts.filter(event => event.shootoutTeam === "opponent" && event.type === "shootout_goal").length;
    state.game.shootout.nextTeam = nextShootoutTeamFromEvents();
  }

  function starterRule(ageGroup = state.setup.ageGroup) {
    const younger = ["10U", "12U"].includes(String(ageGroup));
    return {
      total: younger ? 6 : 7,
      field: younger ? 5 : 6,
      goalie: 1,
      label: younger ? "1 goalie + 5 field players (6 total)" : "1 goalie + 6 field players (7 total)"
    };
  }

  function clockText(minutes = state.game.clockMinutes, seconds = state.game.clockSeconds) {
    return `${clamp(minutes,0,99)}:${String(clamp(seconds,0,59)).padStart(2,"0")}`;
  }

  function parseClock(value) {
    const raw = String(value || "").trim();
    if (!raw) return null;

    let minutes;
    let seconds;
    if (raw.includes(":")) {
      const parts = raw.split(":");
      if (parts.length !== 2 || !/^\d+$/.test(parts[0]) || !/^\d{1,2}$/.test(parts[1])) return null;
      minutes = Number(parts[0]);
      seconds = Number(parts[1]);
    } else if (/^\d+$/.test(raw)) {
      if (raw.length === 1) {
        minutes = Number(raw);
        seconds = 0;
      } else if (raw.length === 2) {
        minutes = 0;
        seconds = Number(raw);
      } else {
        minutes = Number(raw.slice(0,-2));
        seconds = Number(raw.slice(-2));
      }
    } else {
      return null;
    }

    if (minutes > 15 || seconds > 59) return null;
    return {minutes, seconds, text:`${minutes}:${String(seconds).padStart(2,"0")}`};
  }

  function playerById(id) {
    return state.setup.roster.find(player => player.id === id) || null;
  }

  function playerLabel(player) {
    if (!player) return "Team";
    return `#${player.cap || "–"} ${player.name || "Unnamed player"}`;
  }

  function activeEvents() {
    return state.game.events.filter(event => event.status !== "voided");
  }

  function recalculateScore() {
    let team = 0;
    let opponent = 0;
    for (const event of activeEvents()) {
      if (event.type === "score_correction") {
        team = event.correctedTeamScore;
        opponent = event.correctedOpponentScore;
      } else {
        team = roundScore(team + (event.teamDelta || 0));
        opponent = roundScore(opponent + (event.opponentDelta || 0));
      }
    }
    state.game.teamScore = roundScore(team);
    state.game.opponentScore = roundScore(opponent);
    recalculateShootout();
  }

  function rosterFromForm() {
    const existing = new Map((state.setup.roster || []).map(player => [player.id, player]));
    return Array.from($("rosterList").querySelectorAll(".live-roster-row")).map(row => {
      const id = row.dataset.playerId || uid("player");
      return {
        ...(existing.get(id) || {}),
        id,
        cap: row.querySelector("[data-field='cap']").value.trim(),
        name: row.querySelector("[data-field='name']").value.trim()
      };
    });
  }

  function availableRoster() {
    return state.setup.roster.filter(player => String(player.cap || "").trim() && String(player.name || "").trim());
  }

  function updateTeamRosterHeading() {
    const team = state.setup.teamName || "Team";
    if ($("rosterHeading")) $("rosterHeading").textContent = `${team} roster`;
    if ($("rosterHelp")) $("rosterHelp").textContent = `This is the active roster for ${team}. Add, remove, rename, or change cap numbers as needed.`;
  }

  function syncSetupFromForm() {
    state.setup.teamName = $("teamName").value.trim() || "Lamorinda A 14U Boys";
    state.setup.opponentName = $("opponentName").value.trim() || "Scrimmage Opponent";
    state.setup.gameDateTime = $("gameDateTime").value;
    state.setup.venue = $("gameVenue").value.trim();
    state.setup.ageGroup = $("ageGroup").value || "14U";
    state.setup.quarterLength = clamp($("quarterLength").value, 1, 15);
    state.setup.groupMeName = $("groupMeName").value.trim() || "WPI Live Scoring Test";
    state.setup.messageFrequency = $("messageFrequency").value;
    state.setup.visibility = $("visibility").value;
    state.setup.roster = rosterFromForm();
    saveState();
    updateTeamRosterHeading();
    renderPlayerOptions();
    renderScoreboard();
    updateMessagePreview();
  }

  function fillSetupForm() {
    $("teamName").value = state.setup.teamName;
    $("opponentName").value = state.setup.opponentName;
    $("gameDateTime").value = state.setup.gameDateTime;
    $("gameVenue").value = state.setup.venue;
    $("ageGroup").value = state.setup.ageGroup || "14U";
    $("quarterLength").value = String(state.setup.quarterLength);
    $("groupMeName").value = state.setup.groupMeName;
    $("messageFrequency").value = state.setup.messageFrequency;
    $("visibility").value = state.setup.visibility;
    renderRoster();
    updateTeamRosterHeading();
    renderStarterRule();
  }

  function renderRoster(focusPlayerId = null) {
    if (!state.setup.roster.length) state.setup.roster = [{id:uid("player"), cap:"", name:"", createdByUserId:backend?.user?.id || null}];
    $("rosterList").innerHTML = state.setup.roster.map(player => `
      <div class="live-roster-row" data-player-id="${escapeHtml(player.id)}">
        <label>Cap<input data-field="cap" type="text" inputmode="numeric" maxlength="3" value="${escapeHtml(player.cap)}"></label>
        <label>Player name<input data-field="name" type="text" maxlength="80" value="${escapeHtml(player.name)}"></label>
        <button type="button" data-remove-player="${escapeHtml(player.id)}">Remove</button>
      </div>`).join("");

    $("rosterList").querySelectorAll("input").forEach(input => input.addEventListener("change", syncSetupFromForm));
    $("rosterList").querySelectorAll("[data-remove-player]").forEach(button => button.addEventListener("click", () => {
      state.setup.roster = rosterFromForm().filter(player => player.id !== button.dataset.removePlayer);
      if (!state.setup.roster.length) state.setup.roster.push({id:uid("player"), cap:"", name:"", createdByUserId:backend?.user?.id || null});
      saveState();
      renderRoster();
      renderPlayerOptions();
    }));

    if (focusPlayerId) requestAnimationFrame(() => {
      const row = Array.from($("rosterList").querySelectorAll(".live-roster-row")).find(item => item.dataset.playerId === focusPlayerId);
      const input = row?.querySelector("[data-field='cap']");
      row?.scrollIntoView({behavior:"smooth", block:"center"});
      input?.focus({preventScroll:true});
    });
  }

  function addRosterPlayer() {
    state.setup.roster = rosterFromForm();
    const player = {id:uid("player"), cap:"", name:"", createdByUserId:backend?.user?.id || null};
    state.setup.roster.push(player);
    saveState();
    renderRoster(player.id);
    renderPlayerOptions();
    $("rosterStatus").textContent = "New player added. Enter a cap number and name.";
  }

  function renderStarterRule() {
    const rule = starterRule();
    if ($("launchRuleText")) $("launchRuleText").textContent = `${state.setup.ageGroup}: ${rule.label}. Your last starting lineup will be preselected.`;
  }

  function renderEventOptions() {
    $("eventType").value = "";
    const quick = $("eventQuickActions");
    if (quick) {
      quick.innerHTML = QUICK_EVENT_ACTIONS.map(action => `
        <button type="button" class="live-event-chip" data-quick-action="${action.id}" ${action.eventId ? `data-event-chip="${action.eventId}"` : ""} aria-pressed="false">
          <span class="live-event-chip-icon">${QUICK_EVENT_ICONS[action.icon] || ""}</span>
          <span>${escapeHtml(action.label)}</span>
        </button>`).join("");
    }
    syncEventQuickActions();
  }

  function quickActionForEvent(eventId) {
    return QUICK_EVENT_ACTIONS.find(action => action.eventId === eventId || action.variants?.includes(eventId)) || null;
  }

  function eventVariantLabel(eventId) {
    if (eventId === "goal") return state.setup.teamName || "Our team";
    if (eventId === "opponent_goal") return state.setup.opponentName || "Opponent";
    return QUICK_EVENT_VARIANT_LABELS[eventId] || EVENT_MAP.get(eventId)?.label || eventId;
  }

  function eventVariantPrompt(action) {
    if (action?.id === "goals") return "Which team scored?";
    if (action?.id === "shots") return "Shot result";
    if (action?.id === "saves") return "Save type";
    if (action?.id === "exclusions") return "Exclusion";
    if (action?.id === "five_meter") return "5M call";
    return "Choose one";
  }

  function renderEventVariants(action = null) {
    const chooser = $("eventVariantChooser");
    if (!chooser) return;
    if (!action?.variants?.length) {
      chooser.hidden = true;
      chooser.innerHTML = "";
      return;
    }
    chooser.innerHTML = `<span>${escapeHtml(eventVariantPrompt(action))}</span><div>${action.variants.map(eventId => {
      const active = $("eventType")?.value === eventId;
      return `<button type="button" data-event-variant="${eventId}" class="${active ? "is-active" : ""}">${escapeHtml(eventVariantLabel(eventId))}</button>`;
    }).join("")}</div>`;
    chooser.hidden = false;
  }

  function syncEventQuickActions() {
    const value = $("eventType")?.value || "";
    const activeAction = quickActionForEvent(value);
    document.querySelectorAll("[data-quick-action]").forEach(button => {
      const active = Boolean(activeAction && button.dataset.quickAction === activeAction.id);
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    renderEventVariants(activeAction?.variants ? activeAction : null);
  }

  function renderPlayerOptions() {
    const sorted = [...availableRoster()].sort((a,b) => {
      const capA = Number.parseInt(a.cap,10);
      const capB = Number.parseInt(b.cap,10);
      if (Number.isFinite(capA) && Number.isFinite(capB)) return capA - capB;
      return String(a.cap).localeCompare(String(b.cap));
    });
    const options = sorted.map(player => `<option value="${escapeHtml(player.id)}">${escapeHtml(playerLabel(player))}</option>`).join("");
    const primaryValue = $("primaryPlayer").value;
    const assistValue = $("assistPlayer").value;
    $("primaryPlayer").innerHTML = `<option value="">Select player</option>${options}`;
    $("assistPlayer").innerHTML = `<option value="">Unassisted</option>${options}`;
    if ($("shootoutOurPlayer")) {
      const shootoutValue = $("shootoutOurPlayer").value;
      $("shootoutOurPlayer").innerHTML = `<option value="">Choose player</option>${options}`;
      if (sorted.some(player => player.id === shootoutValue)) $("shootoutOurPlayer").value = shootoutValue;
    }
    if (sorted.some(player => player.id === primaryValue)) $("primaryPlayer").value = primaryValue;
    if (sorted.some(player => player.id === assistValue)) $("assistPlayer").value = assistValue;
  }

  function selectedEventType() {
    return EVENT_MAP.get($("eventType").value) || null;
  }

  function canSubmitEvent(type = selectedEventType()) {
    if (!type || state.game.status === "between_quarters" || state.game.phase === "shootout") return false;
    if (type.requiresPlayer && !$("primaryPlayer").value) return false;
    if (type.allowsAssist && $("assistPlayer").value && $("assistPlayer").value === $("primaryPlayer").value) return false;
    return Boolean(parseClock($("clockTime").value));
  }

  function updateSubmitState() {
    const type = selectedEventType();
    const ready = canSubmitEvent(type);
    $("recordEventButton").disabled = !ready;
    $("recordEventButton").textContent = type ? `Submit ${type.label}` : "Submit play";
  }

  function resetEventEntry({preserveClock = true} = {}) {
    $("eventType").value = "";
    $("primaryPlayer").value = "";
    $("assistPlayer").value = "";
    $("eventNote").value = "";
    if (!preserveClock) $("clockTime").value = clockText();
    if ($("eventMoreActions")) $("eventMoreActions").open = false;
    if ($("eventNoteDetails")) $("eventNoteDetails").open = false;
    renderEventVariants(null);
    updateEventFields();
  }

  function updateEventFields({moveForward = false} = {}) {
    const type = selectedEventType();
    const requiresPlayer = Boolean(type && type.requiresPlayer);
    $("primaryPlayerLabel").hidden = !requiresPlayer;
    $("primaryPlayer").disabled = !requiresPlayer;
    $("primaryPlayer").required = requiresPlayer;
    if (type && type.playerLabel) {
      $("primaryPlayerLabel").childNodes[0].nodeValue = `${type.playerLabel} `;
      const emptyOption = $("primaryPlayer").options?.[0];
      if (emptyOption) emptyOption.textContent = `Select ${type.playerLabel.toLowerCase()}`;
    }
    if (type?.id === "save" && !$("primaryPlayer").value) {
      const currentGoalie = goalieForQuarter(state.game.quarter);
      if (currentGoalie && availableRoster().some(player => player.id === currentGoalie)) $("primaryPlayer").value = currentGoalie;
    }

    const allowsAssist = Boolean(type && type.allowsAssist);
    $("assistPlayerLabel").hidden = !allowsAssist;
    $("assistPlayer").disabled = !allowsAssist;
    if (!allowsAssist) $("assistPlayer").value = "";

    $("eventNoteLabel").hidden = false;
    $("eventNote").placeholder = type?.id === "goal"
      ? "Optional context for supporters"
      : type?.id === "opponent_goal"
        ? "Optional note (counterattack, 6-on-5, etc.)"
        : "Short context for supporters";
    $("messagePreviewDetails").hidden = !type;
    if (!type) {
      $("eventNote").value = "";
      $("messagePreviewDetails").open = false;
      if ($("eventNoteDetails")) $("eventNoteDetails").open = false;
    } else {
      // Keep optional/debug content collapsed during normal poolside scoring.
      $("messagePreviewDetails").open = false;
    }
    $("eventValidationMessage").textContent = "";
    syncEventQuickActions();
    updateMessagePreview();
    updateSubmitState();

    if (moveForward && requiresPlayer && window.matchMedia("(min-width: 721px)").matches) {
      requestAnimationFrame(() => {
        $("primaryPlayerLabel").scrollIntoView({behavior:"smooth", block:"center"});
        $("primaryPlayer").focus({preventScroll:true});
      });
    }
  }

  function syncClockFromInput(showError = false) {
    const parsed = parseClock($("clockTime").value);
    if (!parsed) {
      if (showError) $("eventValidationMessage").textContent = "Enter time as MM:SS, such as 6:45. You can also type 645.";
      return false;
    }
    state.game.quarter = Number($("currentQuarter").value);
    state.game.clockMinutes = parsed.minutes;
    state.game.clockSeconds = parsed.seconds;
    $("clockTime").value = parsed.text;
    saveState();
    renderScoreboard();
    return true;
  }

  function prospectiveEvent() {
    const type = selectedEventType();
    if (!type) return null;
    const teamScore = roundScore(state.game.teamScore + Number(type.teamDelta || 0));
    const opponentScore = roundScore(state.game.opponentScore + Number(type.opponentDelta || 0));
    const parsed = parseClock($("clockTime").value) || {text:clockText()};
    return {
      type:type.id,
      label:type.label,
      playerId:$("primaryPlayer").value || null,
      secondaryPlayerId:type.allowsAssist ? ($("assistPlayer").value || null) : null,
      note:$("eventNote").value.trim(),
      teamShotDelta:Number(type.teamShotDelta || 0),
      opponentShotDelta:Number(type.opponentShotDelta || 0),
      opponentFieldBlockDelta:Number(type.opponentFieldBlockDelta || 0),
      opponentSaveDelta:Number(type.opponentSaveDelta || 0),
      quarter:Number(state.game.quarter),
      timeRemaining:parsed.text,
      scoreAfter:{team:teamScore, opponent:opponentScore}
    };
  }

  function formatMessage(event) {
    if (event.type === "game_summary") return event.note || "Game summary";
    const score = `${state.setup.teamName} ${displayScore(event.scoreAfter.team)}, ${state.setup.opponentName} ${displayScore(event.scoreAfter.opponent)}`;
    const when = event.phase === "shootout" || event.type.startsWith("shootout_")
      ? `Shootout · Round ${event.shootoutRound || shootoutRound()}`
      : `${quarterText(event.quarter)} · ${event.timeRemaining}`;
    const player = playerById(event.playerId);
    const assist = playerById(event.secondaryPlayerId);
    let body = event.label;

    if (event.type === "goal") {
      body = `Goal — ${player ? playerLabel(player) : "Select player"}`;
      body += assist ? `\nAssist — ${playerLabel(assist)}` : "\nUnassisted";
    } else if (event.type === "opponent_goal") {
      body = `${state.setup.opponentName} goal`;
    } else if (event.type === "quarter_start") {
      body = `Start of ${quarterText(event.quarter)}`;
      if (event.note) body += `\n${event.note}`;
    } else if (event.type === "quarter_end") {
      body = `End of ${quarterText(event.quarter)}`;
    } else if (event.type === "overtime_start") {
      body = `Start of ${quarterText(event.quarter)} · ${event.note}`;
    } else if (event.type === "shootout_start") {
      body = `Shootout begins\n${event.note}`;
    } else if (["shootout_goal","shootout_miss"].includes(event.type)) {
      const teamName = event.shootoutTeam === "team" ? state.setup.teamName : state.setup.opponentName;
      const shooter = event.shooterLabel || (player ? playerLabel(player) : "Shooter");
      body = `${teamName} — ${event.type === "shootout_goal" ? "Goal" : "Miss"}\n${shooter}`;
    } else if (event.type === "score_correction") {
      body = `Score correction${event.note ? ` — ${event.note}` : ""}`;
    } else if (event.type === "shot_missed" && player) {
      body = `Shot missed — ${playerLabel(player)}`;
    } else if (event.type === "shot_post" && player) {
      body = `Shot off the post — ${playerLabel(player)}`;
    } else if (event.type === "shot_blocked" && player) {
      body = `Shot blocked in play — ${playerLabel(player)}`;
    } else if (event.type === "shot_saved" && player) {
      body = `Shot saved by ${state.setup.opponentName} goalie — ${playerLabel(player)}`;
    } else if (event.type === "field_block" && player) {
      body = `Field block — ${playerLabel(player)}`;
    } else if (event.type === "save" && player) {
      body = `Goalie save — ${playerLabel(player)}`;
    } else if (player) {
      body = `${event.label} — ${playerLabel(player)}`;
    } else if (event.type !== "opponent_goal") {
      body = event.label;
    }

    if (event.note && !["quarter_start","overtime_start","shootout_start","score_correction"].includes(event.type)) body += `\n${event.note}`;
    return `**${when}**\n${body}\n**${score}**`;
  }

  function updateMessagePreview() {
    const event = prospectiveEvent();
    $("messagePreview").textContent = event ? formatMessage(event).replace(/\*\*/g, "") : "Choose a play to preview the score update.";
  }

  function validRosterIds() {
    return new Set(availableRoster().map(player => player.id));
  }

  function lineupForQuarter(quarter) {
    const valid = validRosterIds();
    const direct = state.game.lineups[String(quarter)];
    const previous = state.game.lineups[String(Math.max(1, quarter - 1))];
    const fallback = Number(quarter) === 1 ? state.setup.defaultLineup : previous;
    return (direct || fallback || []).filter(id => valid.has(id));
  }

  function goalieForQuarter(quarter) {
    const valid = validRosterIds();
    const direct = state.game.lineupGoalies[String(quarter)];
    const previous = state.game.lineupGoalies[String(Math.max(1, quarter - 1))];
    const fallback = Number(quarter) === 1 ? state.setup.defaultGoalieId : previous;
    const candidate = direct || fallback || lineupForQuarter(quarter)[0] || availableRoster()[0]?.id || null;
    return candidate && valid.has(candidate) ? candidate : null;
  }

  function selectedFieldLineup() {
    return Array.from($("lineupChoices").querySelectorAll("input:checked")).map(input => input.value);
  }

  function updateLineupSelection() {
    const rule = starterRule();
    const goalieId = $("lineupGoalie").value;
    const checked = selectedFieldLineup().filter(id => id !== goalieId);
    $("lineupChoices").querySelectorAll("input[type='checkbox']").forEach(input => {
      if (input.value === goalieId) {
        input.checked = false;
        input.disabled = true;
      } else {
        input.disabled = checked.length >= rule.field && !input.checked;
      }
    });
    const finalChecked = selectedFieldLineup();
    const ready = Boolean(goalieId) && finalChecked.length === rule.field && !finalChecked.includes(goalieId);
    $("lineupCount").textContent = `${finalChecked.length} of ${rule.field} field players selected`;
    $("lineupValidationMessage").textContent = ready ? `${rule.label} selected.` : `Select exactly ${rule.field} field players and one goalie.`;
    $("saveLineupButton").disabled = !ready;
  }

  function renderLineupChoices(selectedIds = []) {
    const selected = new Set(selectedIds);
    $("lineupChoices").innerHTML = availableRoster().map(player => `
      <label class="live-lineup-choice"><input type="checkbox" value="${escapeHtml(player.id)}" ${selected.has(player.id) ? "checked" : ""}><span>${escapeHtml(playerLabel(player))}</span></label>`).join("");
    $("lineupChoices").querySelectorAll("input").forEach(input => input.addEventListener("change", updateLineupSelection));
    updateLineupSelection();
  }

  function openLineupDialog(quarter) {
    syncSetupFromForm();
    const rule = starterRule();
    if (availableRoster().length < rule.total) {
      alert(`Add at least ${rule.total} players to the roster for ${state.setup.ageGroup}.`);
      return;
    }
    pendingLineupQuarter = Number(quarter);
    const priorLineup = lineupForQuarter(pendingLineupQuarter);
    const goalieId = goalieForQuarter(pendingLineupQuarter);
    const fieldIds = priorLineup.filter(id => id !== goalieId).slice(0, rule.field);
    $("lineupDialogTitle").textContent = pendingLineupQuarter === 1 ? "Who is starting the game?" : `Set ${quarterText(pendingLineupQuarter)} starters`;
    const transition = $("lineupTransitionSummary");
    if (transition) {
      transition.hidden = pendingLineupQuarter === 1;
      if (pendingLineupQuarter > 1) transition.innerHTML = `<strong>${quarterText(pendingLineupQuarter - 1)} complete</strong><span>${escapeHtml(state.setup.teamName)} ${displayScore(state.game.teamScore)}–${displayScore(state.game.opponentScore)} ${escapeHtml(state.setup.opponentName)}</span>`;
    }
    $("lineupRuleText").textContent = pendingLineupQuarter === 1
      ? `${state.setup.teamName} · ${state.setup.ageGroup}: ${rule.label}. Your saved lineup is preselected.`
      : `Confirm one goalie and ${rule.field} field players. Your previous lineup is already selected.`;
    $("lineupGoalie").innerHTML = `<option value="">Select goalie</option>${availableRoster().map(player => `<option value="${escapeHtml(player.id)}">${escapeHtml(playerLabel(player))}</option>`).join("")}`;
    $("lineupGoalie").value = goalieId || "";
    renderLineupChoices(fieldIds);
    const locked = state.game.status === "between_quarters";
    $("lineupCloseButton").hidden = locked;
    $("lineupCancelButton").hidden = locked;
    $("saveLineupButton").textContent = pendingLineupQuarter === 1 ? "Start game" : `Start ${quarterText(pendingLineupQuarter)}`;
    $("lineupDialog").showModal();
  }

  function shouldCreateMessage(type) {
    if (state.game.messagesPaused || state.setup.messageFrequency === "none") return false;
    if (state.setup.messageFrequency === "all") return true;
    return type.priority === "major";
  }

  function createMessage(event, type, options = {}) {
    if (!shouldCreateMessage(type)) return null;
    const text = String(options.text ?? formatMessage(event));
    if (text.length > GROUPME_SAFE_MESSAGE_LIMIT) {
      throw new Error(`GroupMe message exceeds the ${GROUPME_SAFE_MESSAGE_LIMIT}-character WPI safety limit.`);
    }
    const message = {
      id:uid("message"),
      eventId:event.id,
      destination:state.setup.groupMeName,
      text,
      status:backend && groupMeDestination?.enabled ? "pending" : "mock",
      attemptCount:0,
      nextRetryAt:null,
      lastError:"",
      createdAt:new Date().toISOString()
    };
    if (options.requiresEventId) message.requiresEventId = options.requiresEventId;
    if (options.summaryPart) message.summaryPart = Number(options.summaryPart);
    if (options.summaryTotal) message.summaryTotal = Number(options.summaryTotal);
    state.game.messages.unshift(message);
    return message;
  }

  function baseEvent(type, overrides = {}) {
    return {
      id:uid("event"),
      sequence:activeEvents().length + 1,
      type:type.id,
      label:type.label,
      category:type.category,
      playerId:overrides.playerId || null,
      secondaryPlayerId:overrides.secondaryPlayerId || null,
      quarter:Number(overrides.quarter || state.game.quarter),
      timeRemaining:overrides.timeRemaining || clockText(),
      note:overrides.note || "",
      teamDelta:Number(overrides.teamDelta ?? type.teamDelta ?? 0),
      opponentDelta:Number(overrides.opponentDelta ?? type.opponentDelta ?? 0),
      teamShotDelta:Number(overrides.teamShotDelta ?? type.teamShotDelta ?? 0),
      opponentShotDelta:Number(overrides.opponentShotDelta ?? type.opponentShotDelta ?? 0),
      opponentFieldBlockDelta:Number(overrides.opponentFieldBlockDelta ?? type.opponentFieldBlockDelta ?? 0),
      opponentSaveDelta:Number(overrides.opponentSaveDelta ?? type.opponentSaveDelta ?? 0),
      status:"active",
      phase:overrides.phase || state.game.phase,
      shootoutTeam:overrides.shootoutTeam || null,
      shootoutRound:overrides.shootoutRound || null,
      shooterLabel:overrides.shooterLabel || "",
      createdAt:new Date().toISOString(),
      createdByUserId:backend?.user?.id || null,
      createdBy:config.mode === "connected" ? "authenticated scorer" : "local demo scorer"
    };
  }

  function commitEvent(event, type) {
    state.game.events.push(event);
    recalculateScore();
    event.scoreAfter = {team:state.game.teamScore, opponent:state.game.opponentScore};
    createMessage(event, type);
    saveState();
    renderAll();
    openActivityPanels();
  }

  function openActivityPanels() {
    if (window.matchMedia("(min-width: 721px)").matches) {
      $("messageDetails").open = true;
      $("timelineDetails").open = true;
    }
  }

  function addSystemEvent(eventType, overrides = {}) {
    const labels = {
      quarter_start:"Quarter start",
      quarter_end:"Quarter end",
      overtime_start:"Overtime start",
      shootout_start:"Shootout start",
      game_summary:"Game summary"
    };
    const type = {id:eventType, label:labels[eventType] || "Game update", category:"game", priority:"major"};
    commitEvent(baseEvent(type, overrides), type);
  }

  function saveLineup() {
    if (!scoringActionAllowed()) return;
    const rule = starterRule();
    const goalieId = $("lineupGoalie").value;
    const fieldIds = selectedFieldLineup();
    if (!goalieId || fieldIds.length !== rule.field || fieldIds.includes(goalieId)) {
      $("lineupValidationMessage").textContent = `Select exactly one goalie and ${rule.field} field players.`;
      return;
    }

    const choices = [goalieId, ...fieldIds];
    state.game.lineups[String(pendingLineupQuarter)] = choices;
    state.game.lineupGoalies[String(pendingLineupQuarter)] = goalieId;
    state.game.quarter = pendingLineupQuarter;
    state.game.pendingQuarter = null;
    state.game.clockMinutes = state.game.phase === "overtime" ? state.game.overtimeLength : state.setup.quarterLength;
    state.game.clockSeconds = 0;
    if (pendingLineupQuarter === 1) {
      state.setup.defaultLineup = [...choices];
      state.setup.defaultGoalieId = goalieId;
    }
    if (state.game.status === "setup") state.game.startedAt = new Date().toISOString();
    state.game.status = "live";

    const goalie = playerLabel(playerById(goalieId));
    const field = fieldIds.map(id => playerLabel(playerById(id)));
    addSystemEvent(state.game.phase === "overtime" ? "overtime_start" : "quarter_start", {
      quarter:pendingLineupQuarter,
      note:`${state.game.phase === "overtime" ? `${state.game.overtimeLength}-minute period · ` : ""}Goalie: ${goalie} · Field: ${field.join(", ")}`
    });
    resetEventEntry({preserveClock:false});
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    $("lineupDialog").close();
    hideSetup();
    renderAll();
    requestAnimationFrame(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });
  }

  function endQuarter() {
    if (!scoringActionAllowed()) return;
    if (state.game.pendingQuarter || state.game.phase === "shootout") return;

    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    resetEventEntry({preserveClock:true});
    const current = Number(state.game.quarter);
    state.game.clockMinutes = 0;
    state.game.clockSeconds = 0;
    $("clockTime").value = "0:00";

    const last = [...activeEvents()].reverse().find(event => event.type === "quarter_end" && Number(event.quarter) === current);
    if (!last) addSystemEvent("quarter_end", {quarter:current, timeRemaining:"0:00"});

    if (current < 4 && state.game.phase === "regulation") {
      state.game.pendingQuarter = current + 1;
      state.game.status = "between_quarters";
      saveState();
      renderAll();
      openLineupDialog(state.game.pendingQuarter);
      return;
    }

    state.game.status = "between_periods";
    saveState();
    renderAll();
    openPostPeriodDialog();
  }

  function openPostPeriodDialog() {
    const title = state.game.phase === "overtime" ? `${quarterText()} complete` : "Q4 complete";
    $("postPeriodTitle").textContent = title;
    $("postPeriodScore").textContent = `${state.setup.teamName} ${displayScore(state.game.teamScore)}–${displayScore(state.game.opponentScore)} ${state.setup.opponentName}`;
    $("overtimeLength").value = String(state.game.overtimeLength || 2);
    $("overtimeFormat").value = state.game.overtimeMultiplePeriods === false ? "single" : "multiple";
    const mayContinueOvertime = state.game.phase !== "overtime" || state.game.overtimeMultiplePeriods !== false;
    $("overtimeOption").hidden = !mayContinueOvertime;
    $("startOvertimeButton").textContent = state.game.phase === "overtime" ? "Start next overtime period" : "Start overtime";
    if (!$("postPeriodDialog").open) $("postPeriodDialog").showModal();
  }

  function startOvertime() {
    if (!scoringActionAllowed()) return;
    state.game.overtimeLength = clamp($("overtimeLength").value, 1, 3);
    if (state.game.phase !== "overtime") state.game.overtimeMultiplePeriods = $("overtimeFormat").value === "multiple";
    state.game.phase = "overtime";
    state.game.pendingQuarter = Math.max(5, Number(state.game.quarter) + 1);
    state.game.status = "between_quarters";
    $("postPeriodDialog").close();
    saveState();
    renderAll();
    openLineupDialog(state.game.pendingQuarter);
  }

  function openShootoutSetup() {
    $("postPeriodDialog").close();
    $("shootoutFirstTeam").innerHTML = `<option value="team">${escapeHtml(state.setup.teamName)}</option><option value="opponent">${escapeHtml(state.setup.opponentName)}</option>`;
    $("shootoutSetupDialog").showModal();
  }

  function startShootout() {
    if (!scoringActionAllowed()) return;
    const firstTeam = $("shootoutFirstTeam").value === "opponent" ? "opponent" : "team";
    state.game.phase = "shootout";
    state.game.status = "live";
    state.game.pendingQuarter = null;
    state.game.clockMinutes = 0;
    state.game.clockSeconds = 0;
    state.game.shootout = {active:true, firstTeam, nextTeam:firstTeam, teamAttempts:0, opponentAttempts:0, teamGoals:0, opponentGoals:0};
    addSystemEvent("shootout_start", {phase:"shootout", quarter:state.game.quarter, timeRemaining:"", note:`${firstTeam === "team" ? state.setup.teamName : state.setup.opponentName} shoots first.`});
    $("shootoutSetupDialog").close();
    renderAll();
    focusShootoutInput();
  }

  function focusShootoutInput() {
    requestAnimationFrame(() => {
      if (state.game.shootout.nextTeam === "team") $("shootoutOurPlayer").focus();
      else $("shootoutOpponentPlayer").focus();
    });
  }

  function recordShootoutAttempt(outcome) {
    if (!scoringActionAllowed()) return;
    if (!state.game.shootout.active || state.game.phase !== "shootout") return;
    const side = state.game.shootout.nextTeam || state.game.shootout.firstTeam;
    const round = shootoutRound();
    let playerId = null;
    let shooterLabel = "";
    if (side === "team") {
      playerId = $("shootoutOurPlayer").value;
      if (!playerId) {
        $("shootoutValidationMessage").textContent = "Select the shooter.";
        return;
      }
      shooterLabel = playerLabel(playerById(playerId));
    } else {
      shooterLabel = $("shootoutOpponentPlayer").value.trim();
      if (!shooterLabel) {
        $("shootoutValidationMessage").textContent = "Enter the opponent shooter or cap number.";
        return;
      }
    }

    const goal = outcome === "goal";
    const type = {id:goal ? "shootout_goal" : "shootout_miss", label:goal ? "Shootout goal" : "Shootout miss", category:"shootout", priority:"major"};
    const event = baseEvent(type, {
      playerId,
      phase:"shootout",
      shootoutTeam:side,
      shootoutRound:round,
      shooterLabel,
      timeRemaining:"",
      teamDelta:goal && side === "team" ? 0.1 : 0,
      opponentDelta:goal && side === "opponent" ? 0.1 : 0
    });
    commitEvent(event, type);
    $("shootoutOurPlayer").value = "";
    $("shootoutOpponentPlayer").value = "";
    $("shootoutValidationMessage").textContent = `${shooterLabel}: ${goal ? "goal" : "miss"}.`;
    renderShootoutPanel();
    focusShootoutInput();
  }

  function renderShootoutPanel() {
    const active = state.game.phase === "shootout" && state.game.shootout.active && state.game.status !== "ended";
    $("shootoutPanel").hidden = !active;
    $("eventForm").hidden = active;
    $("currentLineupStatus").hidden = active;
    if (!active) return;
    recalculateShootout();
    const side = state.game.shootout.nextTeam || state.game.shootout.firstTeam;
    $("shootoutRoundBadge").textContent = `Round ${shootoutRound()}`;
    $("shootoutTeamLabel").textContent = side === "team" ? state.setup.teamName : state.setup.opponentName;
    $("shootoutOurPlayerLabel").hidden = side !== "team";
    $("shootoutOpponentPlayerLabel").hidden = side !== "opponent";
    $("undoShootoutButton").disabled = !activeEvents().some(event => ["shootout_goal","shootout_miss"].includes(event.type));
  }

  function recordSelectedEvent(event) {
    event.preventDefault();
    if (!scoringActionAllowed()) return;
    if (!syncClockFromInput(true)) return;

    const type = selectedEventType();
    if (!type) {
      $("eventValidationMessage").textContent = "Select an event.";
      return;
    }

    const playerId = $("primaryPlayer").value;
    const assistId = type.allowsAssist ? $("assistPlayer").value : "";
    const note = $("eventNote").value.trim();

    if (type.requiresPlayer && !playerId) {
      $("eventValidationMessage").textContent = "Select the player involved in this event.";
      return;
    }
    if (playerId && assistId === playerId) {
      $("eventValidationMessage").textContent = "The scorer and assist cannot be the same player.";
      return;
    }

    const gameEvent = baseEvent(type, {playerId, secondaryPlayerId:assistId, note});
    // Submit-play workflow: record immediately. Mistakes are handled through Undo or score correction.
    commitEvent(gameEvent, type);

    $("eventValidationMessage").textContent = `${type.label} submitted at ${gameEvent.timeRemaining}.`;
    $("eventType").value = "";
    $("primaryPlayer").value = "";
    $("assistPlayer").value = "";
    $("eventNote").value = "";
    $("eventNoteLabel").hidden = false;
    $("messagePreviewDetails").open = false;
    updateEventFields();
    renderLastUpdate();
    requestAnimationFrame(() => {
      if (window.matchMedia("(min-width: 721px)").matches) {
        $("clockTime").focus({preventScroll:true});
        $("clockTime").select();
      } else if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    });
  }

  function undoLastEvent() {
    if (!scoringActionAllowed()) return;
    const last = [...state.game.events].reverse().find(event => event.status !== "voided");
    if (!last) return;
    last.status = "voided";
    state.game.messages = state.game.messages.filter(message => message.eventId !== last.id);
    recalculateScore();
    saveState();
    renderAll();
  }

  function saveScoreCorrection() {
    if (!scoringActionAllowed()) return;
    const team = roundScore(clamp($("correctTeamScore").value,0,99));
    const opponent = roundScore(clamp($("correctOpponentScore").value,0,99));
    const reason = $("scoreCorrectionReason").value.trim();
    if (!reason) {
      alert("Add a reason for the score correction.");
      return;
    }
    if (!syncClockFromInput(true)) return;

    const type = {id:"score_correction", label:"Score correction", category:"game", priority:"major"};
    const event = baseEvent(type, {note:reason});
    event.correctedTeamScore = team;
    event.correctedOpponentScore = opponent;
    state.game.events.push(event);
    recalculateScore();
    event.scoreAfter = {team:state.game.teamScore, opponent:state.game.opponentScore};
    createMessage(event, type);
    saveState();
    $("scoreDialog").close();
    renderAll();
  }

  function showSetup() {
    editingSetup = true;
    document.body.classList.remove("is-live-game");
    $("setupPanel").hidden = false;
    $("hideSetupButton").hidden = false;
    $("liveConsole").hidden = true;
    $("setupPanel").scrollIntoView({behavior:"smooth", block:"start"});
  }

  function hideSetup() {
    if (state.game.status === "setup") return;
    syncSetupFromForm();
    editingSetup = false;
    $("setupPanel").hidden = true;
    $("hideSetupButton").hidden = true;
    $("liveConsole").hidden = false;
    document.body.classList.add("is-live-game");
    $("liveConsole").scrollIntoView({behavior:"smooth", block:"start"});
  }

  function renderScoreboard() {
    $("scoreTeamName").textContent = state.setup.teamName;
    $("scoreOpponentName").textContent = state.setup.opponentName;
    $("teamScore").textContent = displayScore(state.game.teamScore);
    $("opponentScore").textContent = displayScore(state.game.opponentScore);
    if (![...$("currentQuarter").options].some(option => option.value === String(state.game.quarter)) && Number(state.game.quarter) > 4) {
      $("currentQuarter").add(new Option(quarterText(state.game.quarter), String(state.game.quarter)));
    }
    $("currentQuarter").value = String(state.game.quarter);
    $("currentQuarter").disabled = state.game.phase === "shootout";
    $("clockTime").value = clockText();

    if (state.game.phase === "shootout") {
      $("quarterClockLabel").textContent = `Shootout · Round ${shootoutRound()}`;
      if ($("scorePeriodLabel")) $("scorePeriodLabel").textContent = "SO";
      if ($("scoreClockLabel")) $("scoreClockLabel").textContent = `Round ${shootoutRound()}`;
      $("gameStatus").textContent = state.game.status === "ended" ? "Final" : "Shootout";
    } else {
      $("quarterClockLabel").textContent = `${quarterText()} · ${clockText()}`;
      if ($("scorePeriodLabel")) $("scorePeriodLabel").textContent = quarterText();
      if ($("scoreClockLabel")) $("scoreClockLabel").textContent = clockText();
      $("gameStatus").textContent = state.game.status === "ended" ? "Final" : ["between_quarters","between_periods"].includes(state.game.status) ? "Between periods" : state.game.phase === "overtime" ? "Overtime" : "Live";
    }

    $("endQuarterButton").textContent = state.game.phase === "overtime" ? `End ${quarterText()}` : "End quarter";
    $("endQuarterButton").setAttribute("aria-label", `End ${quarterText(state.game.quarter)}`);
    $("endQuarterButton").disabled = Boolean(state.game.pendingQuarter) || state.game.status !== "live" || state.game.phase === "shootout";

    const lineup = lineupForQuarter(state.game.quarter);
    const rule = starterRule();
    $("currentLineupStatus").textContent = lineup.length === rule.total ? `${quarterText()} · ${rule.total} starters saved` : `${quarterText()} · lineup not set`;
    $("compactModeLabel").textContent = backend
      ? (groupMeDestination?.enabled ? "Private team game" : "Private team game")
      : "WPI Live game";
    if ($("gameGroupMeBadge")) {
      const connected = Boolean(backend && groupMeDestination?.enabled);
      $("gameGroupMeBadge").textContent = connected ? "GroupMe ✓" : backend ? "GroupMe setup" : "Preview";
      $("gameGroupMeBadge").dataset.state = connected ? "connected" : "idle";
    }
  }

  function renderLastUpdate() {
    const last = [...activeEvents()].reverse().find(event => !["quarter_start", "quarter_end", "overtime_start", "shootout_start", "game_summary"].includes(event.type));
    if (!last) {
      $("lastUpdateCard").hidden = true;
      return;
    }
    const player = playerById(last.playerId);
    const period = last.phase === "shootout" ? `SO R${last.shootoutRound}` : `${quarterText(last.quarter)} ${last.timeRemaining}`;
    let text = `${last.label}${player ? ` · ${playerLabel(player)}` : last.shooterLabel ? ` · ${last.shooterLabel}` : ""} · ${period}`;
    if (["goal","shootout_goal","shootout_miss"].includes(last.type)) text += ` · ${displayScore(last.scoreAfter.team)}–${displayScore(last.scoreAfter.opponent)}`;
    $("lastUpdateText").textContent = text;
    if ($("lastUpdateDelivery")) {
      const message = state.game.messages.find(item => item.eventId === last.id);
      const status = !message ? "Recorded"
        : message.status === "sent" ? "GroupMe ✓ Sent"
        : message.status === "sending" ? "GroupMe · Sending…"
        : message.status === "failed" ? "GroupMe ⚠ Failed"
        : message.status === "mock" ? "Preview only"
        : message.status === "suppressed" ? "Recorded · delivery paused"
        : "GroupMe · Queued";
      $("lastUpdateDelivery").textContent = status;
      $("lastUpdateDelivery").dataset.state = message?.status || "recorded";
    }
    $("lastUpdateCard").hidden = false;
  }

  function renderTimeline() {
    const events = activeEvents().slice().reverse();
    $("eventCount").textContent = `${events.length} event${events.length === 1 ? "" : "s"}`;
    if (!events.length) {
      $("timelineList").innerHTML = `<p class="live-empty-state">Start the game to create the first timeline event.</p>`;
      return;
    }

    $("timelineList").innerHTML = events.map(event => {
      const player = playerById(event.playerId);
      const assist = playerById(event.secondaryPlayerId);
      let detail = event.shooterLabel || (player ? playerLabel(player) : "Team event");
      if (event.type === "goal" && !assist) detail += " · Unassisted";
      if (assist) detail += ` · Assist ${playerLabel(assist)}`;
      if (event.type === "game_summary") detail = `Automatically queued after Final Whistle${event.summaryPart ? ` · Part ${event.summaryPart}/${event.summaryTotal}` : ""}`;
      else if (event.note) detail += ` · ${event.note}`;
      const when = event.phase === "shootout" || event.type.startsWith("shootout_")
        ? `Shootout · Round ${event.shootoutRound || 1}`
        : `${quarterText(event.quarter)} · ${event.timeRemaining}`;
      return `<article class="live-timeline-item ${event.type === "score_correction" ? "is-correction" : ""}">
        <header><strong>${escapeHtml(event.label)}</strong><time>${escapeHtml(when)}</time></header>
        <p>${escapeHtml(detail)}</p>
        <small>${escapeHtml(state.setup.teamName)} ${displayScore(event.scoreAfter.team)}–${displayScore(event.scoreAfter.opponent)} ${escapeHtml(state.setup.opponentName)}</small>
      </article>`;
    }).join("");
  }

  function renderMessages() {
    $("messageModeBadge").textContent = backend
      ? (groupMeDestination?.enabled ? "Connected delivery" : "GroupMe setup needed")
      : "Mock delivery";
    $("messageHelp").textContent = backend
      ? (groupMeDestination?.enabled
        ? `Messages post to ${groupMeDestination.display_name || state.setup.groupMeName}. Failed deliveries remain in the retry queue.`
        : "An Owner or Admin must connect and test the GroupMe destination from the WPI Live dashboard.")
      : "Messages are previewed locally until the secure GroupMe connection is activated.";
    const messages = state.game.messages;
    $("messageCount").textContent = `${messages.length} message${messages.length === 1 ? "" : "s"}`;
    if (!messages.length) {
      $("messageList").innerHTML = `<p class="live-empty-state">No messages generated yet.</p>`;
      return;
    }

    $("messageList").innerHTML = messages.map(message => {
      const statusLabel = message.status === "mock" ? "Preview only"
        : message.status === "sent" ? "Sent"
        : message.status === "sending" ? "Sending…"
        : message.status === "suppressed" ? "Suppressed"
        : message.status === "failed" ? "Failed"
        : "Queued";
      const retry = message.status === "failed" && (!backend || scorerControl?.canScore || canDeliverAfterGameEnd())
        ? `<button class="live-message-retry" type="button" data-retry-event="${escapeHtml(message.eventId)}">Retry</button>`
        : "";
      const detail = message.lastError ? `<small>${escapeHtml(message.lastError)}</small>`
        : message.nextRetryAt && ["pending","failed"].includes(message.status) ? `<small>Next retry ${new Date(message.nextRetryAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit",second:"2-digit"})}</small>` : "";
      return `<article class="live-message">
        <header><strong>${escapeHtml(message.destination)}</strong><time>${new Date(message.createdAt).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"})}</time></header>
        <pre>${escapeHtml(message.text.replace(/\*\*/g,""))}</pre>
        <div class="live-message-delivery"><span class="live-message-status is-${escapeHtml(message.status)}">${statusLabel}</span>${retry}</div>${detail}
      </article>`;
    }).join("");
  }

  function aggregate() {
    const events = activeEvents();
    const counts = Object.fromEntries(EVENT_TYPES.map(type => [type.id,0]));
    let teamShots = 0;
    let opponentShots = 0;
    let opponentFieldBlocks = 0;
    let opponentGoalieSaves = 0;
    const players = new Map(state.setup.roster.map(player => [player.id, {player, counts:{}, assists:0}]));
    for (const event of events) {
      counts[event.type] = (counts[event.type] || 0) + 1;
      const type = EVENT_MAP.get(event.type);
      teamShots += Number(event.teamShotDelta ?? type?.teamShotDelta ?? (event.type === "goal" ? 1 : 0));
      opponentShots += Number(event.opponentShotDelta ?? type?.opponentShotDelta ?? (event.type === "opponent_goal" ? 1 : 0));
      opponentFieldBlocks += Number(event.opponentFieldBlockDelta ?? type?.opponentFieldBlockDelta ?? 0);
      opponentGoalieSaves += Number(event.opponentSaveDelta ?? type?.opponentSaveDelta ?? 0);
      if (event.playerId && players.has(event.playerId)) {
        const item = players.get(event.playerId);
        item.counts[event.type] = (item.counts[event.type] || 0) + 1;
      }
      if (event.secondaryPlayerId && players.has(event.secondaryPlayerId)) players.get(event.secondaryPlayerId).assists += 1;
    }
    return {events, counts, players, teamShots, opponentShots, opponentFieldBlocks, opponentGoalieSaves};
  }

  function buildRecap(stats) {
    const result = state.game.teamScore > state.game.opponentScore ? "won" : state.game.teamScore < state.game.opponentScore ? "fell" : "finished level";
    const exclusions = (stats.counts.exclusion_drawn || 0) + (stats.counts.five_meter_drawn || 0);
    const leaders = [...stats.players.values()].map(item => ({
      label:playerLabel(item.player),
      goals:item.counts.goal || 0,
      assists:item.assists,
      defense:(item.counts.save || 0) + (item.counts.field_block || 0) + (item.counts.steal || 0)
    })).sort((a,b) => (b.goals+b.assists+b.defense) - (a.goals+a.assists+a.defense)).filter(item => item.goals || item.assists || item.defense).slice(0,3);
    const leaderText = leaders.length ? ` Recorded contributors included ${leaders.map(item => `${item.label} (${item.goals} goals, ${item.assists} assists, ${item.defense} defensive actions)`).join("; ")}.` : "";
    const shootoutText = state.game.shootout?.active ? ` The shootout log finished ${state.game.shootout.teamGoals}–${state.game.shootout.opponentGoals}.` : "";
    return `${state.setup.teamName} ${result} against ${state.setup.opponentName}, ${displayScore(state.game.teamScore)}–${displayScore(state.game.opponentScore)}, in this WPI Live game.${shootoutText} The live log recorded ${stats.teamShots} team shots, ${stats.counts.goal || 0} goals, ${stats.opponentGoalieSaves} shots saved by the opposing goalie, ${stats.opponentFieldBlocks} shots blocked by the opponent, ${stats.counts.save || 0} goalie saves, ${stats.counts.field_block || 0} field blocks, ${stats.counts.steal || 0} steals, and ${exclusions} exclusion or five-meter opportunities drawn.${leaderText} Statistics are unofficial and reflect only actions entered by the scorer.`;
  }

  function buildGroupMeSummary(stats) {
    const assists = [...stats.players.values()].reduce((sum,item) => sum + item.assists, 0);
    const lines = [
      `${state.setup.teamName} ${displayScore(state.game.teamScore)} — ${state.setup.opponentName} ${displayScore(state.game.opponentScore)}`,
      "",
      "TEAM STATS",
      `Shots ${stats.teamShots} · Goals ${stats.counts.goal || 0} · Assists ${assists}`,
      `Saves ${stats.counts.save || 0} · Field blocks ${stats.counts.field_block || 0} · Steals ${stats.counts.steal || 0}`,
      `Turnovers ${stats.counts.turnover || 0} · Exclusions drawn ${stats.counts.exclusion_drawn || 0} · Exclusions committed ${stats.counts.exclusion_committed || 0}`,
      `5M drawn ${stats.counts.five_meter_drawn || 0} · 5M committed ${stats.counts.five_meter_committed || 0}`
    ];

    const quarterEnds = activeEvents()
      .filter(event => event.type === "quarter_end" && event.scoreAfter)
      .sort((a,b) => Number(a.quarter || 0) - Number(b.quarter || 0));
    if (quarterEnds.length) {
      lines.push("", "PERIOD SCORES");
      for (const event of quarterEnds) {
        lines.push(`${quarterText(event.quarter)} · ${state.setup.teamName} ${displayScore(event.scoreAfter.team)} — ${state.setup.opponentName} ${displayScore(event.scoreAfter.opponent)}`);
      }
    }

    const players = [...stats.players.values()].map(item => {
      const details = [];
      const goals = item.counts.goal || 0;
      if (goals) details.push(`${goals}G`);
      if (item.assists) details.push(`${item.assists}A`);
      if (item.counts.shot_missed) details.push(`${item.counts.shot_missed} miss`);
      if (item.counts.shot_post) details.push(`${item.counts.shot_post} post`);
      if (item.counts.shot_blocked) details.push(`${item.counts.shot_blocked} blocked shot`);
      if (item.counts.shot_saved) details.push(`${item.counts.shot_saved} saved shot`);
      if (item.counts.save) details.push(`${item.counts.save} save${item.counts.save === 1 ? "" : "s"}`);
      if (item.counts.field_block) details.push(`${item.counts.field_block} field block${item.counts.field_block === 1 ? "" : "s"}`);
      if (item.counts.steal) details.push(`${item.counts.steal} steal${item.counts.steal === 1 ? "" : "s"}`);
      if (item.counts.turnover) details.push(`${item.counts.turnover} turnover${item.counts.turnover === 1 ? "" : "s"}`);
      if (item.counts.exclusion_drawn) details.push(`${item.counts.exclusion_drawn} excl drawn`);
      if (item.counts.exclusion_committed) details.push(`${item.counts.exclusion_committed} excl committed`);
      if (item.counts.five_meter_drawn) details.push(`${item.counts.five_meter_drawn} 5M drawn`);
      if (item.counts.five_meter_committed) details.push(`${item.counts.five_meter_committed} 5M committed`);
      return details.length ? `${playerLabel(item.player)} — ${details.join(" · ")}` : null;
    }).filter(Boolean);
    if (players.length) lines.push("", "PLAYER STATS", ...players);

    const notes = activeEvents()
      .filter(event => event.note && !["game_summary","quarter_start","quarter_end","overtime_start","shootout_start"].includes(event.type))
      .map(event => `${quarterText(event.quarter)} ${event.timeRemaining} · ${event.label}: ${String(event.note).trim()}`);
    if (notes.length) lines.push("", "SCORER NOTES", ...notes);

    lines.push("", "Unofficial stats reflect scorer-entered actions.");
    return lines.join("\n");
  }

  function splitSummaryPayload(fullText, target = GROUPME_SUMMARY_PAYLOAD_TARGET) {
    const chunks = [];
    let current = "";
    const append = piece => {
      if (!piece) return;
      if (!current) current = piece;
      else if (current.length + 1 + piece.length <= target) current += `\n${piece}`;
      else { chunks.push(current); current = piece; }
    };

    for (const rawLine of String(fullText || "").split("\n")) {
      let line = rawLine;
      if (!line) {
        if (current && current.length + 1 <= target && !current.endsWith("\n")) current += "\n";
        continue;
      }
      while (line.length > target) {
        let splitAt = line.lastIndexOf(" ", target);
        if (splitAt < Math.floor(target * 0.6)) splitAt = target;
        append(line.slice(0, splitAt).trim());
        line = line.slice(splitAt).trim();
      }
      append(line);
    }
    if (current) chunks.push(current);
    return chunks.length ? chunks : ["Game complete."];
  }

  function buildGroupMeSummaryMessages(stats) {
    const fullText = buildGroupMeSummary(stats);
    const payloads = splitSummaryPayload(fullText);
    const total = payloads.length;
    const messages = payloads.map((payload, index) => {
      const header = total === 1 ? "GAME SUMMARY" : `GAME SUMMARY · ${index + 1}/${total}`;
      const text = `${header}\n${payload}`.trim();
      if (text.length > GROUPME_SAFE_MESSAGE_LIMIT) throw new Error("A generated Game Summary chunk exceeded the GroupMe safety limit.");
      return text;
    });
    return {fullText, messages};
  }

  function automaticSummaryEvents() {
    return activeEvents().filter(event => event.type === "game_summary");
  }

  function removeUnsentAutomaticSummaries() {
    const summaryIds = new Set(automaticSummaryEvents().map(event => event.id));
    const sent = (state.game.messages || []).some(message => summaryIds.has(message.eventId) && message.status === "sent");
    if (sent) return false;
    state.game.events = (state.game.events || []).filter(event => !summaryIds.has(event.id));
    state.game.messages = (state.game.messages || []).filter(message => !summaryIds.has(message.eventId));
    return true;
  }

  function ensureAutomaticGameSummary() {
    const existing = automaticSummaryEvents();
    const existingMessages = new Map((state.game.messages || []).map(message => [message.eventId, message]));
    const currentShape = existing.length > 0 && existing.every(event => {
      const message = existingMessages.get(event.id);
      return String(event.note || "").length <= 280
        && Number(event.summaryPart || 0) > 0
        && Number(event.summaryTotal || 0) === existing.length
        && (!message || String(message.text || "").length <= GROUPME_SAFE_MESSAGE_LIMIT);
    });
    if (currentShape) return existing;
    if (existing.length && !removeUnsentAutomaticSummaries()) return existing;

    const stats = aggregate();
    const {fullText, messages} = buildGroupMeSummaryMessages(stats);
    const type = {id:"game_summary", label:"Game summary", category:"game", priority:"major"};
    const priorMessage = (state.game.messages || [])[0] || null;
    let previousEventId = priorMessage?.eventId || null;
    const created = [];

    messages.forEach((messageText, index) => {
      const part = index + 1;
      const total = messages.length;
      const event = baseEvent(type, {
        quarter:state.game.quarter,
        timeRemaining:"0:00",
        note:`Game summary ${part}/${total} · ${state.setup.teamName} vs ${state.setup.opponentName}`
      });
      event.summaryPart = part;
      event.summaryTotal = total;
      event.summaryCharacterCount = fullText.length;
      state.game.events.push(event);
      event.scoreAfter = {team:state.game.teamScore, opponent:state.game.opponentScore};
      createMessage(event, type, {
        text:messageText,
        requiresEventId:previousEventId,
        summaryPart:part,
        summaryTotal:total
      });
      previousEventId = event.id;
      created.push(event);
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderMessages();
    renderTimeline();
    return created;
  }

  function repairLegacyAutomaticGameSummary() {
    if (state.game.status !== "ended") return false;
    const existing = automaticSummaryEvents();
    if (!existing.length) return false;
    const messages = new Map((state.game.messages || []).map(message => [message.eventId, message]));
    const needsRepair = existing.some(event => String(event.note || "").length > 280
      || !event.summaryPart
      || !event.summaryTotal
      || String(messages.get(event.id)?.text || "").length > GROUPME_SAFE_MESSAGE_LIMIT);
    if (!needsRepair) return false;
    const sent = existing.some(event => messages.get(event.id)?.status === "sent");
    if (sent || !removeUnsentAutomaticSummaries()) return false;
    ensureAutomaticGameSummary();
    return true;
  }

  function renderSummary() {
    const stats = aggregate();
    $("summaryMetrics").innerHTML = [
      ["Final score",`${displayScore(state.game.teamScore)}–${displayScore(state.game.opponentScore)}`],
      ["Shootout",state.game.shootout?.active ? `${state.game.shootout.teamGoals}–${state.game.shootout.opponentGoals}` : "—"],
      ["Team shots",stats.teamShots],
      ["Shots faced",stats.opponentShots],
      ["Goals",stats.counts.goal || 0],
      ["Missed shots",stats.counts.shot_missed || 0],
      ["Shots off post",stats.counts.shot_post || 0],
      ["Shots blocked by opponent",stats.opponentFieldBlocks],
      ["Shots saved by opponent goalie",stats.opponentGoalieSaves],
      ["Assists",[...stats.players.values()].reduce((sum,item) => sum + item.assists,0)],
      ["Saves",stats.counts.save || 0],
      ["Steals",stats.counts.steal || 0],
      ["Field blocks",stats.counts.field_block || 0],
      ["Turnovers",stats.counts.turnover || 0],
      ["Exclusions drawn",stats.counts.exclusion_drawn || 0],
      ["5m drawn",stats.counts.five_meter_drawn || 0],
      ["Events recorded",stats.events.length]
    ].map(([label,value]) => `<div class="live-summary-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");

    const playerRows = [...stats.players.values()].map(item => {
      const details = [];
      if (item.counts.goal) details.push(`${item.counts.goal} goal${item.counts.goal === 1 ? "" : "s"}`);
      if (item.counts.shot_missed) details.push(`${item.counts.shot_missed} missed shot${item.counts.shot_missed === 1 ? "" : "s"}`);
      if (item.counts.shot_post) details.push(`${item.counts.shot_post} shot${item.counts.shot_post === 1 ? "" : "s"} off post`);
      if (item.counts.shot_blocked) details.push(`${item.counts.shot_blocked} shot${item.counts.shot_blocked === 1 ? "" : "s"} blocked`);
      if (item.counts.shot_saved) details.push(`${item.counts.shot_saved} shot${item.counts.shot_saved === 1 ? "" : "s"} saved`);
      if (item.counts.shootout_goal) details.push(`${item.counts.shootout_goal} shootout goal${item.counts.shootout_goal === 1 ? "" : "s"}`);
      if (item.assists) details.push(`${item.assists} assist${item.assists === 1 ? "" : "s"}`);
      for (const [key,label] of [["save","saves"],["field_block","field blocks"],["steal","steals"],["turnover","turnovers"],["exclusion_drawn","exclusions drawn"],["exclusion_committed","exclusions committed"],["five_meter_drawn","5m drawn"],["five_meter_committed","5m committed"]]) {
        if (item.counts[key]) details.push(`${item.counts[key]} ${label}`);
      }
      return details.length ? `<div class="live-player-summary"><strong>${escapeHtml(playerLabel(item.player))}</strong><span>${escapeHtml(details.join(" · "))}</span></div>` : "";
    }).filter(Boolean);
    $("playerSummary").innerHTML = playerRows.length ? playerRows.join("") : `<p class="live-empty-state">No player-level actions were recorded.</p>`;
    const straightRecap = buildRecap(stats);
    $("recapText").value = state.recapDrafts?.approvedText || straightRecap;
    state.analyticsSnapshot = {
      finalScore:{team:state.game.teamScore,opponent:state.game.opponentScore},
      teamShots:stats.teamShots,opponentShots:stats.opponentShots,
      opponentFieldBlocks:stats.opponentFieldBlocks,opponentGoalieSaves:stats.opponentGoalieSaves,
      counts:stats.counts,
      players:[...stats.players.values()].map(item => ({player:item.player,counts:item.counts,assists:item.assists}))
    };
    state.recapDrafts = Object.assign({playful:"",straight:straightRecap,coach:"",selectedStyle:"straight",approvedText:straightRecap}, state.recapDrafts || {});
    if (!state.recapDrafts.straight) state.recapDrafts.straight = straightRecap;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function renderAll() {
    renderScoreboard();
    renderScorerControl();
    renderTimeline();
    renderMessages();
    renderLastUpdate();
    updateEventFields();
    renderShootoutPanel();
    $("pauseMessagesButton").setAttribute("aria-pressed", String(state.game.messagesPaused));
    $("pauseMessagesButton").textContent = state.game.messagesPaused ? "Resume messages" : "Pause messages";

    if (state.game.status === "setup") {
      editingSetup = false;
      document.body.classList.remove("is-live-game");
      $("setupPanel").hidden = false;
      $("launchRow").hidden = false;
      $("liveConsole").hidden = true;
    } else if (editingSetup) {
      document.body.classList.remove("is-live-game");
      $("setupPanel").hidden = false;
      $("launchRow").hidden = true;
      $("liveConsole").hidden = true;
    } else {
      document.body.classList.add("is-live-game");
      $("setupPanel").hidden = true;
      $("launchRow").hidden = true;
      $("liveConsole").hidden = false;
    }

    if (state.game.status === "ended") {
      document.body.classList.remove("is-live-game");
      $("summaryPanel").hidden = false;
      $("timelineDetails").open = true;
      renderSummary();
    } else {
      $("summaryPanel").hidden = true;
    }

    if (state.game.status === "between_periods" && !$("postPeriodDialog").open) {
      requestAnimationFrame(openPostPeriodDialog);
    }
  }

  async function endGame({skipConfirm = false} = {}) {
    if (!scoringActionAllowed()) return;
    if (!skipConfirm && !confirm("End this game and build the recap?")) return;
    const endButtons = [$("endGameButton"), $("postPeriodEndGameButton"), $("endShootoutGameButton")].filter(Boolean);
    endButtons.forEach(button => { button.disabled = true; });
    try {
      if (state.game.phase !== "shootout") {
        const finalPeriod = [...activeEvents()].reverse().find(event => event.type === "quarter_end" && Number(event.quarter) === Number(state.game.quarter));
        if (!finalPeriod) addSystemEvent("quarter_end", {note:"Final whistle"});
      }
      state.game.status = "ended";
      state.game.endedAt = new Date().toISOString();
      state.game.endedByUserId = backend?.user?.id || state.game.endedByUserId || null;
      for (const dialog of document.querySelectorAll("dialog[open]")) dialog.close();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      clearTimeout(remoteSyncTimer);
      renderAll();
      ensureAutomaticGameSummary();
      clearTimeout(remoteSyncTimer);
      if (backend && workspace) {
        setSyncStatus("Finishing game…", "saving");
        const result = await pushRemoteState();
        if (!result) throw new Error("The final game state could not be confirmed on the server.");
        const summaryIds = new Set(automaticSummaryEvents().map(event => event.id));
        const summaryMessages = (state.game.messages || []).filter(message => summaryIds.has(message.eventId));
        const allSummarySent = summaryMessages.length > 0 && summaryMessages.every(message => ["sent","suppressed","mock"].includes(message.status));
        setSyncStatus(allSummarySent ? "Final saved · Summary sent" : "Final saved · Summary queued", "saved");
      }
      $("summaryPanel").scrollIntoView({behavior:"smooth", block:"start"});
    } catch (error) {
      setSyncStatus("Final sync needs attention", "error");
      $("connectionDetail").textContent = `Game retained on this device · ${error.message}`;
      endButtons.forEach(button => { button.disabled = false; });
    }
  }

  function voidAccidentalFinalOutput() {
    const summaryIds = new Set();
    for (const event of state.game.events || []) {
      if (event.status !== "voided" && event.type === "game_summary") {
        event.status = "voided";
        summaryIds.add(event.id);
      }
    }

    const finalWhistle = [...(state.game.events || [])].reverse().find(event =>
      event.status !== "voided"
      && event.type === "quarter_end"
      && String(event.note || "").trim().toLowerCase() === "final whistle"
    );
    if (finalWhistle) {
      finalWhistle.status = "voided";
      summaryIds.add(finalWhistle.id);
    }

    if (summaryIds.size) {
      state.game.messages = (state.game.messages || []).filter(message => !summaryIds.has(message.eventId));
    }
    state.analyticsSnapshot = null;
    state.recapDrafts = {playful:"",straight:"",coach:"",selectedStyle:"straight",approvedText:""};
  }

  async function reopenGame() {
    if (!backend || !workspace || !state.game.remoteId || state.game.status !== "ended") return;
    if (!confirm("Reopen this game and continue scoring?\n\nIf a final update already reached GroupMe, WPI will keep that delivery in the audit and send a correction that the game was reopened.")) return;

    const button = $("reopenGameButton");
    if (button) { button.disabled = true; button.textContent = "Reopening…"; }
    clearTimeout(remoteSyncTimer);
    if (remoteSyncInFlight) {
      if (button) { button.disabled = false; button.textContent = "Reopen game"; }
      return;
    }

    remoteSyncInFlight = true;
    remoteSyncPending = false;
    setSyncStatus("Reopening game…", "saving");
    try {
      const {data,error} = await backend.client.rpc("live_reopen_game_v1", {
        target_game_id:state.game.remoteId,
        reopen_reason:"Game ended prematurely"
      });
      if (error) throw error;
      applyScorerControl(data || {});

      state.game.status = "live";
      state.game.endedAt = null;
      state.game.endedByUserId = null;
      voidAccidentalFinalOutput();

      const preservedTeamScore = roundScore(state.game.teamScore);
      const preservedOpponentScore = roundScore(state.game.opponentScore);
      const type = {id:"score_correction", label:"Game reopened", category:"game", priority:"major"};
      const event = baseEvent(type, {note:"Previous final entered in error"});
      // A reopen is an audit/correction event, not a score reset. Because score_correction
      // events are authoritative in recalculateScore(), carry the current score explicitly.
      event.correctedTeamScore = preservedTeamScore;
      event.correctedOpponentScore = preservedOpponentScore;
      state.game.events.push(event);
      recalculateScore();
      event.scoreAfter = {team:state.game.teamScore, opponent:state.game.opponentScore};
      createMessage(event, type, {
        text:`Game reopened — previous final was entered in error.\n${state.setup.teamName} ${displayScore(state.game.teamScore)}, ${state.setup.opponentName} ${displayScore(state.game.opponentScore)}\n${quarterText(state.game.quarter)} · ${clockText()}`
      });

      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      renderAll();
    } catch (error) {
      setSyncStatus("Reopen failed", "error");
      $("connectionDetail").textContent = error.message || "The game could not be reopened.";
      if (button) { button.disabled = false; button.textContent = "Reopen game"; }
      return;
    } finally {
      remoteSyncInFlight = false;
    }

    const synced = await pushRemoteState();
    if (!synced) {
      setSyncStatus("Reopened · sync needs attention", "error");
    } else {
      setSyncStatus("Game reopened", "saved");
      $("connectionDetail").textContent = "Game reopened with the existing score preserved. Continue scoring from the current period and clock.";
    }
    if (button) { button.disabled = false; button.textContent = "Reopen game"; }
    // endGame() intentionally disables its finalization buttons after a successful final.
    // A reopened game must be finalizable again (and again on any later reopen).
    [$("endGameButton"), $("postPeriodEndGameButton"), $("endShootoutGameButton")].filter(Boolean).forEach(control => { control.disabled = false; });
    $("liveConsole")?.scrollIntoView({behavior:"smooth", block:"start"});
  }

  function downloadLog() {
    const payload = {
      schemaVersion:1,
      release:RELEASE,
      environment:"pilot",
      exportedAt:new Date().toISOString(),
      disclaimer:"Unofficial WPI Live statistics based on recorded scorer events.",
      setup:state.setup,
      game:state.game,
      analytics:aggregate(),
      recap:$("recapText").value
    };
    payload.analytics.players = [...payload.analytics.players.values()].map(item => item);
    const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json"});
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `wpi-live-${state.setup.teamName.replace(/[^a-z0-9]+/gi,"-").toLowerCase()}-${new Date().toISOString().slice(0,10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function resetSandbox() {
    const confirmed = confirm(
      "Reset this test game and return to pregame setup?\n\n" +
      "The score, quarter, plays, timeline, recap, and mock GroupMe log will be cleared. " +
      "The team setup, roster, and saved default starting lineup will be kept."
    );
    if (!confirmed) return;

    const setup = {
      ...state.setup,
      roster: state.setup.roster.map(player => ({...player})),
      defaultLineup: [...(state.setup.defaultLineup || [])]
    };
    state = defaultState();
    state.setup = setup;
    state.game.createdByUserId = backend?.user?.id || null;
    state.game.clockMinutes = clamp(setup.quarterLength, 1, 15);
    state.game.clockSeconds = 0;
    editingSetup = false;

    for (const dialog of document.querySelectorAll("dialog[open]")) dialog.close();
    $("summaryPanel").hidden = true;
    $("timelineDetails").open = false;
    $("gameControlsDetails").open = false;
    localStorage.removeItem(STORAGE_KEY);
    saveState();
    fillSetupForm();
    renderAll();
    $("rosterStatus").textContent = "Test game reset. Team roster and saved starters were preserved.";
    window.scrollTo({top: 0, behavior: "smooth"});
  }

  async function authorize() {
    const connected = window.WPILiveBackend?.isConfigured(config);
    if (!connected) {
      window.location.replace("live-login.html");
      return false;
    }

    try {
      const params = new URLSearchParams(window.location.search);
      const remoteGameId = params.get("game");
      const createNew = params.get("new") === "1";
      const guestRoute = params.get("guest") === "1";

      backend = await window.WPILiveBackend.connect(config);
      supabase = backend.client;
      const session = await backend.waitForHealthySession();
      if (!session) {
        window.location.replace(guestRoute && remoteGameId
          ? `live-scorer-handoff.html?game=${encodeURIComponent(remoteGameId)}`
          : "live-login.html");
        return false;
      }

      if (guestRoute || backend.isAnonymousUser(session.user)) {
        if (!remoteGameId) throw new Error("A Guest Scorer Pass must open a specific game.");
        workspace = await backend.loadGuestWorkspace(remoteGameId);
      } else {
        workspace = await backend.bootstrap({
          teamName: config.defaultTeamName || "Lamorinda A 14U Boys",
          teamSlug: config.defaultTeamSlug || "lamorinda-a-14u-boys",
          ageGroup: config.defaultAgeGroup || "14U",
          competitiveSeason: config.competitiveSeason || "2026-2027"
        });
      }

      groupMeDestination = await backend.loadGroupMeDestination(workspace.teamId);
      if (groupMeDestination?.display_name) state.setup.groupMeName = groupMeDestination.display_name;

      if (["viewer","guest_viewer"].includes(workspace.role) && !remoteGameId) {
        window.location.replace("live-dashboard.html");
        return false;
      }
      if (createNew && !["owner","admin"].includes(workspace.role)) {
        throw new Error("A Team Owner or Admin must create the game before assigning a Scorer.");
      }

      if (remoteGameId) {
        const loaded = await backend.loadGameState(remoteGameId);
        if (loaded.state && loaded.state.setup && loaded.state.game) {
          state = loaded.state;
          state.release = RELEASE;
          state.mode = "connected";
          state.game.remoteId = loaded.remoteGameId;
          if (groupMeDestination?.display_name) state.setup.groupMeName = groupMeDestination.display_name;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
          applyDeliveryStatuses(await backend.loadDeliveryStatuses(loaded.remoteGameId));
          await refreshScorerControl(loaded.remoteGameId);
          unsubscribeRemote = backend.subscribeToGame(loaded.remoteGameId, (remoteState, remoteRow) => {
            if (remoteRow) applyScorerControl(remoteRow);
            if (!remoteState || remoteSyncInFlight) return;
            state = remoteState;
            state.release = RELEASE;
            state.mode = "connected";
            state.game.remoteId = loaded.remoteGameId;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            fillSetupForm();
            renderAll();
            setSyncStatus("Synced", "saved");
          });
          unsubscribeDeliveries = backend.subscribeToDeliveries(loaded.remoteGameId, () => refreshDeliveryStatuses(loaded.remoteGameId));
        }
      } else if (createNew || state.mode !== "connected") {
        const preserved = await backend.loadRoster(workspace.rosterId);
        state = defaultState();
        state.mode = "connected";
        state.game.createdByUserId = session.user.id;
        state.setup.teamName = workspace.teamName;
        state.setup.ageGroup = workspace.ageGroup || config.defaultAgeGroup || "14U";
        if (preserved.length) {
          state.setup.roster = preserved;
          const remoteToLocal = new Map(preserved.map(player => [player.remoteId, player.id]));
          state.setup.defaultLineup = (workspace.defaultLineupPlayerIds || []).map(id => remoteToLocal.get(id)).filter(Boolean);
          state.setup.defaultGoalieId = remoteToLocal.get(workspace.defaultGoalieId) || null;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } else {
        state.mode = "connected";
        state.setup.teamName = workspace.teamName;
      }

      const identity = workspace.scorerDisplayName || session.user.email || "Guest scorer";
      const displayRole = workspace.role === "viewer" ? "Supporter" : workspace.role.replace("_"," ");
      $("connectionLabel").textContent = workspace.role.startsWith("guest_") ? "Guest Scorer Pass" : "Connected private workspace";
      $("connectionDetail").textContent = `${identity} · ${displayRole} · ${workspace.teamName} · ${groupMeDestination?.enabled ? "GroupMe connected" : "GroupMe setup needed"}`;
      setSyncStatus(remoteGameId ? (scorerControl?.canScore ? "Synced" : "Read only") : "Ready to save", remoteGameId ? "saved" : "local");
      return true;
    } catch (error) {
      $("connectionLabel").textContent = "Connected setup needs attention";
      $("connectionDetail").textContent = error.message;
      setSyncStatus("Connection failed", "error");
      return false;
    }
  }

  function applyRoleAccess() {
    if (!workspace) return;
    const role = workspace.role;
    const hasGameScoringControl = Boolean(scorerControl?.canScore);
    const isViewer = ["viewer","guest_viewer"].includes(role) && !hasGameScoringControl;
    const isManager = ["owner","admin"].includes(role);
    const isGuest = role.startsWith("guest_");
    document.body.classList.toggle("is-live-viewer", isViewer);

    const managerOnlyIds = ["addPlayerButton","showSetupButton"];
    managerOnlyIds.forEach(id => {
      const control = $(id);
      if (control) control.hidden = !isManager;
    });
    ["resetSandboxTopButton","resetSandboxGameButton","resetSandboxButton"].forEach(id => {
      const control = $(id);
      if (control) control.hidden = true;
    });
    document.querySelectorAll("#setupPanel input, #setupPanel select, #setupPanel button").forEach(control => {
      if (control.id === "hideSetupButton") return;
      control.disabled = !isManager;
    });

    const reopenButton = $("reopenGameButton");
    if (reopenButton) reopenButton.hidden = isViewer;

    if (isViewer) {
      // Supporters remain read-only unless the active scorer intentionally hands off control.
      // The code dialog is game-scoped and does not change the person's permanent team role.
      const allowedButtons = new Set(["signOutButton", "gameSignOutButton", "downloadLogButton", "enterScorerCodeInlineButton"]);
      document.querySelectorAll("#liveSandboxApp input, #liveSandboxApp select, #liveSandboxApp textarea, #liveSandboxApp button").forEach(control => {
        if (allowedButtons.has(control.id) || control.closest("#scorerCodeDialog")) return;
        control.disabled = true;
      });
      if ($("enterScorerCodeInlineButton")) {
        $("enterScorerCodeInlineButton").disabled = false;
        $("enterScorerCodeInlineButton").textContent = "Take over scoring";
      }
      $("connectionDetail").textContent = `${workspace.teamName} · ${isGuest ? "Former Guest Scorer" : "Supporter"} · read-only game view`;
      $("backendSyncStatus").textContent = "Read only";
      $("backendSyncStatus").dataset.state = "saved";
      $("gameControlsDetails").hidden = true;
      $("eventForm").hidden = true;
      $("endQuarterButton").hidden = true;
      $("shootoutPanel").querySelectorAll("button, input, select").forEach(control => { control.disabled = true; });
    } else {
      $("eventForm").hidden = false;
      $("endQuarterButton").hidden = false;
      $("gameControlsDetails").hidden = false;
      if (!isManager) {
        $("showSetupButton").hidden = true;
        $("groupMeName").readOnly = true;
      }
    }
    renderScorerControl();
  }

  function signOut() {
    if (unsubscribeRemote) unsubscribeRemote();
    if (unsubscribeDeliveries) unsubscribeDeliveries();
    clearTimeout(deliveryRetryTimer);
    if (backend) backend.signOut().finally(() => window.location.replace("live-login.html"));
    else {
      localStorage.removeItem(AUTH_KEY);
      for (const key of LEGACY_AUTH_KEYS) localStorage.removeItem(key);
      window.location.replace("live-login.html");
    }
  }

  function bindEvents() {
    ["teamName","opponentName","gameDateTime","gameVenue","ageGroup","quarterLength","groupMeName","messageFrequency","visibility"].forEach(id => $(id).addEventListener("change", syncSetupFromForm));
    $("addPlayerButton").addEventListener("click", addRosterPlayer);
    $("startGameButton").addEventListener("click", () => openLineupDialog(1));
    $("saveLineupButton").addEventListener("click", saveLineup);
    $("lineupGoalie").addEventListener("change", updateLineupSelection);
    $("lineupDialog").addEventListener("cancel", event => {
      if (state.game.status === "between_quarters") event.preventDefault();
    });
    $("ageGroup").addEventListener("change", renderStarterRule);
    $("endQuarterButton").addEventListener("click", endQuarter);
    $("editCurrentLineupButton").addEventListener("click", () => openLineupDialog(state.game.quarter));
    $("eventForm").addEventListener("submit", recordSelectedEvent);
    $("eventType").addEventListener("change", () => updateEventFields({moveForward:true}));
    $("eventQuickActions")?.addEventListener("click", event => {
      const button = event.target.closest("[data-quick-action]");
      if (!button) return;
      const action = QUICK_EVENT_ACTIONS.find(item => item.id === button.dataset.quickAction);
      if (!action) return;
      if (action.eventId) {
        $("eventType").value = action.eventId;
        updateEventFields({moveForward:true});
        return;
      }
      $("eventType").value = "";
      document.querySelectorAll("[data-quick-action]").forEach(item => {
        const active = item.dataset.quickAction === action.id;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      renderEventVariants(action);
      updateSubmitState();
    });
    $("eventVariantChooser")?.addEventListener("click", event => {
      const button = event.target.closest("[data-event-variant]");
      if (!button) return;
      $("eventType").value = button.dataset.eventVariant || "";
      updateEventFields({moveForward:true});
    });
    $("primaryPlayer").addEventListener("change", () => { updateMessagePreview(); updateSubmitState(); });
    $("assistPlayer").addEventListener("change", () => { updateMessagePreview(); updateSubmitState(); });
    $("eventNote").addEventListener("input", updateMessagePreview);
    $("currentQuarter").addEventListener("change", () => {
      state.game.quarter = Number($("currentQuarter").value);
      saveState();
      renderScoreboard();
      updateMessagePreview();
      updateSubmitState();
    });
    $("clockTime").addEventListener("input", () => { updateMessagePreview(); updateSubmitState(); });
    $("clockTime").addEventListener("blur", () => syncClockFromInput(false));
    $("messageList").addEventListener("click", event => {
      const button = event.target.closest("[data-retry-event]");
      if (button) retryMessage(button.dataset.retryEvent);
    });
    $("pauseMessagesButton").addEventListener("click", () => {
      state.game.messagesPaused = !state.game.messagesPaused;
      saveState();
      renderAll();
    });
    $("showSetupButton").addEventListener("click", showSetup);
    $("hideSetupButton").addEventListener("click", hideSetup);
    $("undoLastInlineButton").addEventListener("click", undoLastEvent);
    $("scoreCorrectionButton").addEventListener("click", () => {
      $("correctTeamScore").value = state.game.teamScore;
      $("correctOpponentScore").value = state.game.opponentScore;
      $("scoreCorrectionReason").value = "";
      $("scoreDialog").showModal();
    });
    $("saveScoreCorrectionButton").addEventListener("click", saveScoreCorrection);
    $("postPeriodDialog").addEventListener("cancel", event => event.preventDefault());
    $("postPeriodEndGameButton").addEventListener("click", () => endGame({skipConfirm:true}));
    $("startOvertimeButton").addEventListener("click", startOvertime);
    $("openShootoutSetupButton").addEventListener("click", openShootoutSetup);
    $("startShootoutButton").addEventListener("click", startShootout);
    $("shootoutGoalButton").addEventListener("click", () => recordShootoutAttempt("goal"));
    $("shootoutMissButton").addEventListener("click", () => recordShootoutAttempt("miss"));
    $("undoShootoutButton").addEventListener("click", undoLastEvent);
    $("endShootoutGameButton").addEventListener("click", () => endGame({skipConfirm:true}));
    $("endGameButton").addEventListener("click", endGame);
    $("reopenGameButton")?.addEventListener("click", reopenGame);
    $("downloadLogButton").addEventListener("click", downloadLog);
    $("resetSandboxButton").addEventListener("click", resetSandbox);
    $("resetSandboxTopButton").addEventListener("click", resetSandbox);
    $("resetSandboxGameButton").addEventListener("click", resetSandbox);
    $("transferScoringButton").addEventListener("click", createScorerHandoffPass);
    $("enterScorerCodeInlineButton").addEventListener("click", openInGameScorerCodeDialog);
    $("inGameScorerCode").addEventListener("input", event => { event.target.value = event.target.value.replace(/\D/g, "").slice(0,6); });
    $("inGameScorerCode").addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); previewInGameScorerCode(); } });
    $("previewInGameScorerCodeButton").addEventListener("click", previewInGameScorerCode);
    $("acceptInGameScorerCodeButton").addEventListener("click", acceptInGameScorerCode);
    $("shareScorerHandoffLinkButton").addEventListener("click", shareScorerHandoffLink);
    $("transferScoringInlineButton").addEventListener("click", createScorerHandoffPass);
    function setMobileNavActive(activeId) {
      ["mobileNavGame", "mobileNavUpdates", "mobileNavMore"].forEach(id => {
        const button = $(id);
        if (button) button.classList.toggle("is-active", id === activeId);
      });
    }
    $("mobileNavGame")?.addEventListener("click", () => {
      setMobileNavActive("mobileNavGame");
      $("liveActionPanel")?.scrollIntoView({behavior:"smooth", block:"start"});
    });
    $("mobileNavUpdates")?.addEventListener("click", () => {
      setMobileNavActive("mobileNavUpdates");
      $("messageDetails").open = true;
      $("messageDetails").scrollIntoView({behavior:"smooth", block:"start"});
    });
    $("mobileNavMore")?.addEventListener("click", () => {
      setMobileNavActive("mobileNavMore");
      $("gameControlsDetails").open = true;
      $("gameControlsDetails").scrollIntoView({behavior:"smooth", block:"center"});
    });
    $("takeOverScoringButton").addEventListener("click", takeOverScoring);
    $("newScorerHandoffPassButton").addEventListener("click", createScorerHandoffPass);
    $("revokeScorerHandoffPassButton").addEventListener("click", revokeScorerHandoffPass);
    $("copyScorerHandoffLinkButton").addEventListener("click", async () => {
      const url = $("scorerHandoffLink").dataset.copyUrl || $("scorerHandoffLink").textContent;
      if (!url) return;
      try {
        await navigator.clipboard.writeText(url);
        $("scorerHandoffMessage").textContent = "Private scorer link copied.";
      } catch (_) {
        $("scorerHandoffMessage").textContent = "Copy the fallback link and share the six-digit code separately.";
      }
    });
    $("signOutButton").addEventListener("click", signOut);
    $("gameSignOutButton").addEventListener("click", signOut);
  }

  async function init() {
    const authorized = await authorize();
    if (!authorized) return;
    const repairedLegacySummary = repairLegacyAutomaticGameSummary();
    if (repairedLegacySummary) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    $("liveSandboxApp").hidden = false;
    fillSetupForm();
    if (backend) {
      $("groupMeName").readOnly = true;
      $("groupMeName").title = "Manage the GroupMe destination from the WPI Live dashboard.";
    }
    renderEventOptions();
    renderPlayerOptions();
    bindEvents();
    renderAll();
    applyRoleAccess();
    if (backend && workspace && workspace.role !== "viewer") {
      const hasRecoverableDelivery = (state.game.messages || []).some(message => deliveryIsDue(message));
      if (!state.game.remoteId || hasRecoverableDelivery) scheduleRemoteSync(150);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
