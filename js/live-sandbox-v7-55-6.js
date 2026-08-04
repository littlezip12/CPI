/* WPI 7.55.6 — age-aware lineups and direct quarter flow.
 * Demo mode stores test data only in the current browser.
 * Connected mode validates the Supabase session before showing the console.
 */
(() => {
  "use strict";

  const RELEASE = "7.55.6";
  const STORAGE_KEY = "wpi-live-sandbox-v7-55-6";
  const LEGACY_STORAGE_KEYS = ["wpi-live-sandbox-v7-55-5", "wpi-live-sandbox-v7-55-4", "wpi-live-sandbox-v7-55-3", "wpi-live-sandbox-v7-55-2"];
  const AUTH_KEY = "wpi-live-auth-v7-55-6";
  const LEGACY_AUTH_KEYS = ["wpi-live-auth-v7-55-5", "wpi-live-auth-v7-55-4", "wpi-live-auth-v7-55-3"];
  const config = window.WPI_LIVE_SANDBOX_CONFIG || {};
  const $ = id => document.getElementById(id);
  const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));
  const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));

  const EVENT_TYPES = [
    {id:"goal", label:"Goal", dropdownLabel:"Goal — our team", playerLabel:"Scorer", category:"scoring", requiresPlayer:true, allowsAssist:true, teamDelta:1, priority:"major"},
    {id:"opponent_goal", label:"Opponent goal", dropdownLabel:"Goal — opponent", category:"scoring", requiresPlayer:false, opponentDelta:1, priority:"major"},
    {id:"save", label:"Save", playerLabel:"Player making save", category:"defense", requiresPlayer:true, priority:"all"},
    {id:"field_block", label:"Field block", playerLabel:"Player making block", category:"defense", requiresPlayer:true, priority:"all"},
    {id:"steal", label:"Steal", playerLabel:"Player making steal", category:"possession", requiresPlayer:true, priority:"all"},
    {id:"turnover", label:"Turnover", playerLabel:"Player", category:"possession", requiresPlayer:true, priority:"all"},
    {id:"exclusion_drawn", label:"Exclusion drawn", dropdownLabel:"Exclusion drawn — our player earned it", playerLabel:"Player drawing exclusion", category:"exclusions", requiresPlayer:true, priority:"major"},
    {id:"exclusion_committed", label:"Exclusion called on", dropdownLabel:"Exclusion called on — our player excluded", playerLabel:"Excluded player", category:"exclusions", requiresPlayer:true, priority:"major"},
    {id:"five_meter_drawn", label:"5m drawn", dropdownLabel:"5m drawn — our player earned it", playerLabel:"Player drawing 5m", category:"penalties", requiresPlayer:true, priority:"major"},
    {id:"five_meter_committed", label:"5m called on", dropdownLabel:"5m called on — our player committed it", playerLabel:"Player called for 5m", category:"penalties", requiresPlayer:true, priority:"major"}
  ];
  const EVENT_MAP = new Map(EVENT_TYPES.map(item => [item.id, item]));

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
        teamName: "Pilot Team",
        opponentName: "Scrimmage Opponent",
        gameDateTime: "",
        venue: "",
        ageGroup: "14U",
        quarterLength: 7,
        groupMeName: "WPI Live Scoring Test",
        messageFrequency: "major",
        visibility: config.defaultVisibility || "team_private",
        roster: defaultRoster(),
        defaultLineup: [],
        defaultGoalieId: null
      },
      game: {
        id: uid("sandbox-game"),
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
        stored.setup.defaultLineup = Array.isArray(stored.setup.defaultLineup) ? stored.setup.defaultLineup : [];
        stored.setup.defaultGoalieId = stored.setup.defaultGoalieId || null;
        stored.game.lineups = stored.game.lineups || {};
        stored.game.lineupGoalies = stored.game.lineupGoalies || {};
        stored.game.pendingQuarter = stored.game.pendingQuarter || null;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
        return stored;
      } catch (_) { /* try the next key */ }
    }
    return defaultState();
  }

  let state = loadState();
  let pendingLineupQuarter = 1;
  let supabase = null;
  let editingSetup = false;

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function quarterText(value = state.game.quarter) {
    return Number(value) > 4 ? "OT" : `Q${value}`;
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
        team += event.teamDelta || 0;
        opponent += event.opponentDelta || 0;
      }
    }
    state.game.teamScore = team;
    state.game.opponentScore = opponent;
  }

  function syncSetupFromForm() {
    state.setup.teamName = $("teamName").value.trim() || "Pilot Team";
    state.setup.opponentName = $("opponentName").value.trim() || "Scrimmage Opponent";
    state.setup.gameDateTime = $("gameDateTime").value;
    state.setup.venue = $("gameVenue").value.trim();
    state.setup.ageGroup = $("ageGroup").value || "14U";
    state.setup.quarterLength = clamp($("quarterLength").value, 1, 15);
    state.setup.groupMeName = $("groupMeName").value.trim() || "WPI Live Scoring Test";
    state.setup.messageFrequency = $("messageFrequency").value;
    state.setup.visibility = $("visibility").value;
    state.setup.roster = Array.from($("rosterList").querySelectorAll(".live-roster-row")).map(row => ({
      id: row.dataset.playerId,
      cap: row.querySelector("[data-field='cap']").value.trim(),
      name: row.querySelector("[data-field='name']").value.trim()
    })).filter(player => player.cap || player.name);
    saveState();
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
    renderStarterRule();
  }

  function renderRoster() {
    if (!state.setup.roster.length) state.setup.roster = [{id:uid("player"), cap:"", name:""}];
    $("rosterList").innerHTML = state.setup.roster.map(player => `
      <div class="live-roster-row" data-player-id="${escapeHtml(player.id)}">
        <label>Cap<input data-field="cap" type="text" inputmode="numeric" maxlength="3" value="${escapeHtml(player.cap)}"></label>
        <label>Player name<input data-field="name" type="text" maxlength="80" value="${escapeHtml(player.name)}"></label>
        <button type="button" data-remove-player="${escapeHtml(player.id)}">Remove</button>
      </div>`).join("");

    $("rosterList").querySelectorAll("input").forEach(input => input.addEventListener("change", syncSetupFromForm));
    $("rosterList").querySelectorAll("[data-remove-player]").forEach(button => button.addEventListener("click", () => {
      syncSetupFromForm();
      state.setup.roster = state.setup.roster.filter(player => player.id !== button.dataset.removePlayer);
      if (!state.setup.roster.length) state.setup.roster.push({id:uid("player"), cap:"", name:""});
      saveState();
      renderRoster();
      renderPlayerOptions();
    }));
  }

  function renderStarterRule() {
    const rule = starterRule();
    if ($("launchRuleText")) $("launchRuleText").textContent = `${state.setup.ageGroup}: ${rule.label}. Your last starting lineup will be preselected.`;
  }

  function renderEventOptions() {
    const groups = [
      ["Scoring", ["goal", "opponent_goal"]],
      ["Defense", ["save", "field_block", "steal"]],
      ["Possession", ["turnover"]],
      ["Exclusions and penalties", ["exclusion_drawn", "exclusion_committed", "five_meter_drawn", "five_meter_committed"]]
    ];
    const options = groups.map(([label, ids]) => `<optgroup label="${label}">${ids.map(id => {
      const type = EVENT_MAP.get(id);
      return `<option value="${type.id}">${escapeHtml(type.dropdownLabel || type.label)}</option>`;
    }).join("")}</optgroup>`).join("");
    $("eventType").innerHTML = `<option value="">Choose an event</option>${options}`;
  }

  function renderPlayerOptions() {
    const sorted = [...state.setup.roster].sort((a,b) => {
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
    if (sorted.some(player => player.id === primaryValue)) $("primaryPlayer").value = primaryValue;
    if (sorted.some(player => player.id === assistValue)) $("assistPlayer").value = assistValue;
  }

  function selectedEventType() {
    return EVENT_MAP.get($("eventType").value) || null;
  }

  function canSubmitEvent(type = selectedEventType()) {
    if (!type || state.game.status === "between_quarters") return false;
    if (type.requiresPlayer && !$("primaryPlayer").value) return false;
    if (type.allowsAssist && $("assistPlayer").value && $("assistPlayer").value === $("primaryPlayer").value) return false;
    return Boolean(parseClock($("clockTime").value));
  }

  function updateSubmitState() {
    const type = selectedEventType();
    const ready = canSubmitEvent(type);
    $("recordEventButton").disabled = !ready;
    $("recordEventButton").textContent = state.game.status === "between_quarters" ? "Set next-quarter starters" : !type ? "Choose an event" : ready ? `Record ${type.label.toLowerCase()}` : type.requiresPlayer && !$("primaryPlayer").value ? "Choose a player" : "Check the time";
  }

  function updateEventFields({moveForward = false} = {}) {
    const type = selectedEventType();
    const requiresPlayer = Boolean(type && type.requiresPlayer);
    $("primaryPlayerLabel").hidden = !requiresPlayer;
    $("primaryPlayer").disabled = !requiresPlayer;
    $("primaryPlayer").required = requiresPlayer;
    if (type && type.playerLabel) $("primaryPlayerLabel").childNodes[0].nodeValue = `${type.playerLabel} `;

    const allowsAssist = Boolean(type && type.allowsAssist);
    $("assistPlayerLabel").hidden = !allowsAssist;
    $("assistPlayer").disabled = !allowsAssist;
    if (!allowsAssist) $("assistPlayer").value = "";

    $("addNoteButton").hidden = !type;
    $("messagePreviewDetails").hidden = !type;
    if (!type) {
      $("eventNoteLabel").hidden = true;
      $("eventNote").value = "";
      $("messagePreviewDetails").open = false;
    }
    $("eventValidationMessage").textContent = "";
    updateMessagePreview();
    updateSubmitState();

    if (moveForward && requiresPlayer) {
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
    const teamScore = state.game.teamScore + Number(type.teamDelta || 0);
    const opponentScore = state.game.opponentScore + Number(type.opponentDelta || 0);
    const parsed = parseClock($("clockTime").value) || {text:clockText()};
    return {
      type:type.id,
      label:type.label,
      playerId:$("primaryPlayer").value || null,
      secondaryPlayerId:type.allowsAssist ? ($("assistPlayer").value || null) : null,
      note:$("eventNote").value.trim(),
      quarter:Number(state.game.quarter),
      timeRemaining:parsed.text,
      scoreAfter:{team:teamScore, opponent:opponentScore}
    };
  }

  function formatMessage(event) {
    const score = `${state.setup.teamName} ${event.scoreAfter.team}, ${state.setup.opponentName} ${event.scoreAfter.opponent}`;
    const when = `${quarterText(event.quarter)} · ${event.timeRemaining}`;
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
    } else if (event.type === "score_correction") {
      body = `Score correction${event.note ? ` — ${event.note}` : ""}`;
    } else if (player) {
      body = `${event.label} — ${playerLabel(player)}`;
    } else if (event.type !== "opponent_goal") {
      body = `${event.label} — Select player`;
    }

    if (event.note && !["quarter_start","score_correction"].includes(event.type)) body += `\n${event.note}`;
    return `**${when}**\n${body}\n**${score}**`;
  }

  function updateMessagePreview() {
    const event = prospectiveEvent();
    $("messagePreview").textContent = event ? formatMessage(event).replace(/\*\*/g, "") : "Choose an event to preview the parent update.";
  }

  function validRosterIds() {
    return new Set(state.setup.roster.map(player => player.id));
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
    const candidate = direct || fallback || lineupForQuarter(quarter)[0] || state.setup.roster[0]?.id || null;
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
    $("lineupChoices").innerHTML = state.setup.roster.map(player => `
      <label class="live-lineup-choice"><input type="checkbox" value="${escapeHtml(player.id)}" ${selected.has(player.id) ? "checked" : ""}><span>${escapeHtml(playerLabel(player))}</span></label>`).join("");
    $("lineupChoices").querySelectorAll("input").forEach(input => input.addEventListener("change", updateLineupSelection));
    updateLineupSelection();
  }

  function openLineupDialog(quarter) {
    syncSetupFromForm();
    const rule = starterRule();
    if (state.setup.roster.length < rule.total) {
      alert(`Add at least ${rule.total} players to the roster for ${state.setup.ageGroup}.`);
      return;
    }
    pendingLineupQuarter = Number(quarter);
    const priorLineup = lineupForQuarter(pendingLineupQuarter);
    const goalieId = goalieForQuarter(pendingLineupQuarter);
    const fieldIds = priorLineup.filter(id => id !== goalieId).slice(0, rule.field);
    $("lineupDialogTitle").textContent = `Select ${quarterText(pendingLineupQuarter)} starters`;
    $("lineupRuleText").textContent = `${state.setup.ageGroup}: ${rule.label}. The previous starting lineup is preselected.`;
    $("lineupGoalie").innerHTML = `<option value="">Select goalie</option>${state.setup.roster.map(player => `<option value="${escapeHtml(player.id)}">${escapeHtml(playerLabel(player))}</option>`).join("")}`;
    $("lineupGoalie").value = goalieId || "";
    renderLineupChoices(fieldIds);
    $("lineupDialog").showModal();
  }

  function shouldCreateMessage(type) {
    if (state.game.messagesPaused || state.setup.messageFrequency === "none") return false;
    if (state.setup.messageFrequency === "all") return true;
    return type.priority === "major";
  }

  function createMessage(event, type) {
    if (!shouldCreateMessage(type)) return;
    state.game.messages.unshift({
      id:uid("message"),
      eventId:event.id,
      destination:state.setup.groupMeName,
      text:formatMessage(event),
      status:config.groupMeDelivery === "live" ? "pending" : "mock",
      createdAt:new Date().toISOString()
    });
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
      status:"active",
      createdAt:new Date().toISOString(),
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
  }

  function addSystemEvent(eventType, overrides = {}) {
    const type = {
      id:eventType,
      label:eventType === "quarter_start" ? "Quarter start" : eventType === "quarter_end" ? "Quarter end" : "Game update",
      category:"game",
      priority:"major"
    };
    commitEvent(baseEvent(type, overrides), type);
  }

  function saveLineup() {
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
    state.game.clockMinutes = state.setup.quarterLength;
    state.game.clockSeconds = 0;
    if (pendingLineupQuarter === 1) {
      state.setup.defaultLineup = [...choices];
      state.setup.defaultGoalieId = goalieId;
    }
    if (state.game.status === "setup") state.game.startedAt = new Date().toISOString();
    state.game.status = "live";

    const goalie = playerLabel(playerById(goalieId));
    const field = fieldIds.map(id => playerLabel(playerById(id)));
    addSystemEvent("quarter_start", {
      quarter:pendingLineupQuarter,
      note:`Goalie: ${goalie} · Field: ${field.join(", ")}`
    });
    $("lineupDialog").close();
    hideSetup();
    renderAll();
  }

  function endQuarter() {
    if (state.game.pendingQuarter) {
      openLineupDialog(state.game.pendingQuarter);
      return;
    }
    if (!syncClockFromInput(true)) return;

    const current = Number(state.game.quarter);
    const last = [...activeEvents()].reverse().find(event => event.type === "quarter_end" && Number(event.quarter) === current);
    if (!last) addSystemEvent("quarter_end", {quarter:current, timeRemaining:clockText()});

    if (current >= 5) {
      $("eventValidationMessage").textContent = "Overtime ended. Use End game when the result is final.";
      renderAll();
      return;
    }

    state.game.pendingQuarter = current + 1;
    state.game.status = "between_quarters";
    saveState();
    renderAll();
    openLineupDialog(state.game.pendingQuarter);
  }

  function recordSelectedEvent(event) {
    event.preventDefault();
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
    // Direct-submit workflow: record immediately. Mistakes are handled through Undo or score correction.
    commitEvent(gameEvent, type);

    $("eventValidationMessage").textContent = `${type.label} recorded at ${gameEvent.timeRemaining}.`;
    $("eventType").value = "";
    $("primaryPlayer").value = "";
    $("assistPlayer").value = "";
    $("eventNote").value = "";
    $("eventNoteLabel").hidden = true;
    $("messagePreviewDetails").open = false;
    updateEventFields();
    renderLastUpdate();
    requestAnimationFrame(() => {
      $("clockTime").focus({preventScroll:true});
      $("clockTime").select();
    });
  }

  function undoLastEvent() {
    const last = [...state.game.events].reverse().find(event => event.status !== "voided");
    if (!last) return;
    last.status = "voided";
    state.game.messages = state.game.messages.filter(message => message.eventId !== last.id);
    recalculateScore();
    saveState();
    renderAll();
  }

  function saveScoreCorrection() {
    const team = clamp($("correctTeamScore").value,0,99);
    const opponent = clamp($("correctOpponentScore").value,0,99);
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
    $("teamScore").textContent = state.game.teamScore;
    $("opponentScore").textContent = state.game.opponentScore;
    $("currentQuarter").value = String(state.game.quarter);
    $("clockTime").value = clockText();
    $("quarterClockLabel").textContent = `${quarterText()} · ${clockText()}`;
    $("gameStatus").textContent = state.game.status === "ended" ? "Final · sandbox" : state.game.status === "between_quarters" ? "Between quarters" : "Live sandbox";

    if (state.game.pendingQuarter) {
      $("endQuarterButton").textContent = `Set ${quarterText(state.game.pendingQuarter)} starters`;
      $("endQuarterButton").setAttribute("aria-label", `Set ${quarterText(state.game.pendingQuarter)} starters`);
    } else {
      $("endQuarterButton").textContent = "End quarter";
      $("endQuarterButton").setAttribute("aria-label", `End ${quarterText(state.game.quarter)}`);
    }

    const lineup = lineupForQuarter(state.game.quarter);
    const rule = starterRule();
    $("currentLineupStatus").textContent = lineup.length === rule.total ? `${quarterText()} · ${rule.total} starters saved` : `${quarterText()} · lineup not set`;
    $("compactModeLabel").textContent = config.groupMeDelivery === "live" ? "Private team game · GroupMe connected" : "Sandbox · GroupMe preview";
  }

  function renderLastUpdate() {
    const last = [...activeEvents()].reverse().find(event => !["quarter_start", "quarter_end"].includes(event.type));
    if (!last) {
      $("lastUpdateCard").hidden = true;
      return;
    }
    const player = playerById(last.playerId);
    let text = `${last.label}${player ? ` · ${playerLabel(player)}` : ""} · ${quarterText(last.quarter)} ${last.timeRemaining}`;
    if (last.type === "goal") text += ` · ${last.scoreAfter.team}–${last.scoreAfter.opponent}`;
    $("lastUpdateText").textContent = text;
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
      let detail = player ? playerLabel(player) : "Team event";
      if (event.type === "goal" && !assist) detail += " · Unassisted";
      if (assist) detail += ` · Assist ${playerLabel(assist)}`;
      if (event.note) detail += ` · ${event.note}`;
      return `<article class="live-timeline-item ${event.type === "score_correction" ? "is-correction" : ""}">
        <header><strong>${escapeHtml(event.label)}</strong><time>${escapeHtml(quarterText(event.quarter))} · ${escapeHtml(event.timeRemaining)}</time></header>
        <p>${escapeHtml(detail)}</p>
        <small>${escapeHtml(state.setup.teamName)} ${event.scoreAfter.team}–${event.scoreAfter.opponent} ${escapeHtml(state.setup.opponentName)}</small>
      </article>`;
    }).join("");
  }

  function renderMessages() {
    $("messageModeBadge").textContent = config.groupMeDelivery === "live" ? "Connected delivery" : "Mock delivery";
    const messages = state.game.messages;
    $("messageCount").textContent = `${messages.length} message${messages.length === 1 ? "" : "s"}`;
    if (!messages.length) {
      $("messageList").innerHTML = `<p class="live-empty-state">No messages generated yet.</p>`;
      return;
    }

    $("messageList").innerHTML = messages.map(message => `<article class="live-message">
      <header><strong>${escapeHtml(message.destination)}</strong><time>${new Date(message.createdAt).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"})}</time></header>
      <pre>${escapeHtml(message.text.replace(/\*\*/g,""))}</pre>
      <span class="live-message-status">${message.status === "mock" ? "Preview only" : escapeHtml(message.status)}</span>
    </article>`).join("");
  }

  function aggregate() {
    const events = activeEvents();
    const counts = Object.fromEntries(EVENT_TYPES.map(type => [type.id,0]));
    const players = new Map(state.setup.roster.map(player => [player.id, {player, counts:{}, assists:0}]));
    for (const event of events) {
      counts[event.type] = (counts[event.type] || 0) + 1;
      if (event.playerId && players.has(event.playerId)) {
        const item = players.get(event.playerId);
        item.counts[event.type] = (item.counts[event.type] || 0) + 1;
      }
      if (event.secondaryPlayerId && players.has(event.secondaryPlayerId)) players.get(event.secondaryPlayerId).assists += 1;
    }
    return {events, counts, players};
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
    return `${state.setup.teamName} ${result} against ${state.setup.opponentName}, ${state.game.teamScore}–${state.game.opponentScore}, in this sandbox scrimmage. The live log recorded ${stats.counts.goal || 0} goals, ${stats.counts.save || 0} saves, ${stats.counts.steal || 0} steals, ${stats.counts.field_block || 0} field blocks, and ${exclusions} exclusion or five-meter opportunities drawn.${leaderText} Statistics are unofficial and reflect only actions entered by the scorer.`;
  }

  function renderSummary() {
    const stats = aggregate();
    $("summaryMetrics").innerHTML = [
      ["Final score",`${state.game.teamScore}–${state.game.opponentScore}`],
      ["Goals",stats.counts.goal || 0],
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
      if (item.assists) details.push(`${item.assists} assist${item.assists === 1 ? "" : "s"}`);
      for (const [key,label] of [["save","saves"],["field_block","field blocks"],["steal","steals"],["turnover","turnovers"],["exclusion_drawn","exclusions drawn"],["exclusion_committed","exclusions committed"],["five_meter_drawn","5m drawn"],["five_meter_committed","5m committed"]]) {
        if (item.counts[key]) details.push(`${item.counts[key]} ${label}`);
      }
      return details.length ? `<div class="live-player-summary"><strong>${escapeHtml(playerLabel(item.player))}</strong><span>${escapeHtml(details.join(" · "))}</span></div>` : "";
    }).filter(Boolean);
    $("playerSummary").innerHTML = playerRows.length ? playerRows.join("") : `<p class="live-empty-state">No player-level actions were recorded.</p>`;
    $("recapText").value = buildRecap(stats);
  }

  function renderAll() {
    renderScoreboard();
    renderTimeline();
    renderMessages();
    renderLastUpdate();
    updateEventFields();
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
    }
  }

  function endGame() {
    if (!confirm("End this sandbox game and build the recap?")) return;
    addSystemEvent("quarter_end", {note:"Final whistle"});
    state.game.status = "ended";
    state.game.endedAt = new Date().toISOString();
    saveState();
    renderAll();
    $("summaryPanel").scrollIntoView({behavior:"smooth", block:"start"});
  }

  function downloadLog() {
    const payload = {
      schemaVersion:1,
      release:RELEASE,
      environment:"sandbox",
      exportedAt:new Date().toISOString(),
      disclaimer:"Unofficial sandbox data; never use as an official tournament or ranking source.",
      setup:state.setup,
      game:state.game,
      analytics:aggregate(),
      recap:$("recapText").value
    };
    payload.analytics.players = [...payload.analytics.players.values()].map(item => item);
    const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json"});
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `wpi-sandbox-${state.setup.teamName.replace(/[^a-z0-9]+/gi,"-").toLowerCase()}-${new Date().toISOString().slice(0,10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function resetSandbox() {
    if (!confirm("Delete this browser's sandbox game and start over?")) return;
    const setup = {...state.setup, roster:state.setup.roster.map(player => ({...player}))};
    state = defaultState();
    state.setup = setup;
    localStorage.removeItem(STORAGE_KEY);
    saveState();
    fillSetupForm();
    $("summaryPanel").hidden = true;
    renderAll();
  }

  async function authorize() {
    const connected = config.mode === "connected" && config.supabaseUrl && config.supabasePublishableKey;
    if (!connected) {
      let demoSession = null;
      for (const key of [AUTH_KEY, ...LEGACY_AUTH_KEYS]) {
        try {
          demoSession = JSON.parse(localStorage.getItem(key) || "null");
          if (demoSession && demoSession.environment === "sandbox") {
            localStorage.setItem(AUTH_KEY, JSON.stringify(demoSession));
            break;
          }
        } catch (_) { demoSession = null; }
      }
      if (!demoSession || demoSession.environment !== "sandbox") {
        window.location.replace("live-login.html");
        return false;
      }
      $("connectionLabel").textContent = "Local demo mode";
      $("connectionDetail").textContent = "Events remain on this browser. GroupMe messages are previewed but not sent.";
      return true;
    }

    try {
      const module = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.8/+esm");
      supabase = module.createClient(config.supabaseUrl, config.supabasePublishableKey);
      const {data} = await supabase.auth.getSession();
      if (!data.session) {
        window.location.replace("live-login.html");
        return false;
      }
      $("connectionLabel").textContent = "Authenticated sandbox";
      $("connectionDetail").textContent = `${data.session.user.email} · private team access`;
      return true;
    } catch (error) {
      $("connectionLabel").textContent = "Sandbox connection failed";
      $("connectionDetail").textContent = error.message;
      return false;
    }
  }

  function signOut() {
    if (supabase) supabase.auth.signOut().finally(() => window.location.replace("live-login.html"));
    else {
      localStorage.removeItem(AUTH_KEY);
      for (const key of LEGACY_AUTH_KEYS) localStorage.removeItem(key);
      window.location.replace("live-login.html");
    }
  }

  function bindEvents() {
    ["teamName","opponentName","gameDateTime","gameVenue","ageGroup","quarterLength","groupMeName","messageFrequency","visibility"].forEach(id => $(id).addEventListener("change", syncSetupFromForm));
    $("addPlayerButton").addEventListener("click", () => {
      syncSetupFromForm();
      state.setup.roster.push({id:uid("player"), cap:"", name:""});
      saveState();
      renderRoster();
    });
    $("startGameButton").addEventListener("click", () => openLineupDialog(1));
    $("saveLineupButton").addEventListener("click", saveLineup);
    $("lineupGoalie").addEventListener("change", updateLineupSelection);
    $("ageGroup").addEventListener("change", renderStarterRule);
    $("endQuarterButton").addEventListener("click", endQuarter);
    $("editCurrentLineupButton").addEventListener("click", () => openLineupDialog(state.game.quarter));
    $("eventForm").addEventListener("submit", recordSelectedEvent);
    $("eventType").addEventListener("change", () => updateEventFields({moveForward:true}));
    $("primaryPlayer").addEventListener("change", () => { updateMessagePreview(); updateSubmitState(); });
    $("assistPlayer").addEventListener("change", () => { updateMessagePreview(); updateSubmitState(); });
    $("eventNote").addEventListener("input", updateMessagePreview);
    $("addNoteButton").addEventListener("click", () => {
      $("eventNoteLabel").hidden = false;
      $("addNoteButton").hidden = true;
      $("eventNote").focus();
    });
    $("currentQuarter").addEventListener("change", () => {
      state.game.quarter = Number($("currentQuarter").value);
      saveState();
      renderScoreboard();
      updateMessagePreview();
      updateSubmitState();
    });
    $("clockTime").addEventListener("input", () => { updateMessagePreview(); updateSubmitState(); });
    $("clockTime").addEventListener("blur", () => syncClockFromInput(false));
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
    $("endGameButton").addEventListener("click", endGame);
    $("downloadLogButton").addEventListener("click", downloadLog);
    $("resetSandboxButton").addEventListener("click", resetSandbox);
    $("signOutButton").addEventListener("click", signOut);
    $("gameSignOutButton").addEventListener("click", signOut);
  }

  async function init() {
    const authorized = await authorize();
    if (!authorized) return;
    $("liveSandboxApp").hidden = false;
    fillSetupForm();
    renderEventOptions();
    renderPlayerOptions();
    bindEvents();
    renderAll();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
