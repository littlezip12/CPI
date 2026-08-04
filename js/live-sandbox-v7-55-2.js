/* WPI 7.55.2 — live-scoring sandbox foundation.
 * Demo mode stores test data only in the current browser.
 * Connected mode provides Supabase email/password authentication; persistent
 * team/game sync and GroupMe delivery are activated in the next connected release.
 */
(() => {
  "use strict";

  const RELEASE = "7.55.2";
  const STORAGE_KEY = "wpi-live-sandbox-v7-55-2";
  const config = window.WPI_LIVE_SANDBOX_CONFIG || {};
  const $ = id => document.getElementById(id);
  const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));
  const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));

  const EVENT_TYPES = [
    {id:"goal",label:"Goal",category:"scoring",requiresPlayer:true,allowsSecondary:true,secondaryLabel:"Assist",teamDelta:1,priority:"major"},
    {id:"opponent_goal",label:"Opponent goal",category:"scoring",requiresPlayer:false,allowsSecondary:false,opponentDelta:1,priority:"major"},
    {id:"save",label:"Save",category:"defense",requiresPlayer:true,priority:"all"},
    {id:"field_block",label:"Field block",category:"defense",requiresPlayer:true,priority:"all"},
    {id:"steal",label:"Steal",category:"possession",requiresPlayer:true,priority:"all"},
    {id:"turnover",label:"Turnover",category:"possession",requiresPlayer:true,priority:"all"},
    {id:"exclusion_drawn",label:"Exclusion drawn",category:"exclusions",requiresPlayer:true,priority:"major"},
    {id:"exclusion_committed",label:"Exclusion called on",category:"exclusions",requiresPlayer:true,priority:"major"},
    {id:"five_meter_drawn",label:"5m drawn",category:"penalties",requiresPlayer:true,priority:"major"},
    {id:"five_meter_committed",label:"5m called on",category:"penalties",requiresPlayer:true,priority:"major"}
  ];
  const EVENT_MAP = new Map(EVENT_TYPES.map(item => [item.id,item]));

  const defaultState = () => ({
    release: RELEASE,
    environment: "sandbox",
    mode: config.mode || "demo",
    setup: {
      teamName: "Pilot Team",
      opponentName: "Scrimmage Opponent",
      gameDateTime: "",
      venue: "",
      quarterLength: 7,
      groupMeName: "WPI Live Scoring Test",
      messageFrequency: "major",
      visibility: config.defaultVisibility || "team_private",
      roster: [
        {id:"p1",cap:"1",name:"Goalkeeper"},
        {id:"p2",cap:"2",name:"Player 2"},
        {id:"p3",cap:"3",name:"Player 3"},
        {id:"p4",cap:"4",name:"Player 4"},
        {id:"p5",cap:"5",name:"Player 5"},
        {id:"p6",cap:"6",name:"Player 6"},
        {id:"p7",cap:"7",name:"Player 7"}
      ]
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
      startedAt: null,
      endedAt: null
    }
  });

  function loadState() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!stored || stored.release !== RELEASE || stored.environment !== "sandbox") return defaultState();
      return stored;
    } catch (_) {
      return defaultState();
    }
  }

  let state = loadState();
  let selectedAction = "goal";
  let pendingLineupQuarter = 1;
  let supabase = null;

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function clockText(minutes = state.game.clockMinutes, seconds = state.game.clockSeconds) {
    return `${clamp(minutes,0,99)}:${String(clamp(seconds,0,59)).padStart(2,"0")}`;
  }

  function quarterText(value = state.game.quarter) {
    return Number(value) > 4 ? "OT" : `Q${value}`;
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
    state.setup.quarterLength = clamp($("quarterLength").value,1,15);
    state.setup.groupMeName = $("groupMeName").value.trim() || "WPI Live Scoring Test";
    state.setup.messageFrequency = $("messageFrequency").value;
    state.setup.visibility = $("visibility").value;
    state.setup.roster = Array.from($("rosterList").querySelectorAll(".live-roster-row")).map(row => ({
      id: row.dataset.playerId,
      cap: row.querySelector("[data-field='cap']").value.trim(),
      name: row.querySelector("[data-field='name']").value.trim()
    })).filter(player => player.cap || player.name);
    saveState();
  }

  function fillSetupForm() {
    $("teamName").value = state.setup.teamName;
    $("opponentName").value = state.setup.opponentName;
    $("gameDateTime").value = state.setup.gameDateTime;
    $("gameVenue").value = state.setup.venue;
    $("quarterLength").value = String(state.setup.quarterLength);
    $("groupMeName").value = state.setup.groupMeName;
    $("messageFrequency").value = state.setup.messageFrequency;
    $("visibility").value = state.setup.visibility;
    renderRoster();
  }

  function renderRoster() {
    const roster = state.setup.roster.length ? state.setup.roster : [{id:uid("player"),cap:"",name:""}];
    $("rosterList").innerHTML = roster.map(player => `
      <div class="live-roster-row" data-player-id="${escapeHtml(player.id)}">
        <label>Cap<input data-field="cap" type="text" inputmode="numeric" maxlength="3" value="${escapeHtml(player.cap)}"></label>
        <label>Player name<input data-field="name" type="text" maxlength="80" value="${escapeHtml(player.name)}"></label>
        <button type="button" data-remove-player="${escapeHtml(player.id)}">Remove</button>
      </div>`).join("");
    $("rosterList").querySelectorAll("input").forEach(input => input.addEventListener("change", syncSetupFromForm));
    $("rosterList").querySelectorAll("[data-remove-player]").forEach(button => button.addEventListener("click", () => {
      syncSetupFromForm();
      state.setup.roster = state.setup.roster.filter(player => player.id !== button.dataset.removePlayer);
      if (!state.setup.roster.length) state.setup.roster.push({id:uid("player"),cap:"",name:""});
      saveState();
      renderRoster();
      renderPlayerOptions();
    }));
  }

  function renderActions() {
    $("actionTabs").innerHTML = EVENT_TYPES.map(type => `<button type="button" data-action="${type.id}" data-category="${type.category}" class="${type.id === selectedAction ? "is-selected" : ""}">${escapeHtml(type.label)}</button>`).join("");
    $("actionTabs").querySelectorAll("[data-action]").forEach(button => button.addEventListener("click", () => {
      selectedAction = button.dataset.action;
      renderActions();
      renderActionEntry();
    }));
  }

  function renderPlayerOptions() {
    const options = state.setup.roster.map(player => `<option value="${escapeHtml(player.id)}">${escapeHtml(playerLabel(player))}</option>`).join("");
    $("primaryPlayer").innerHTML = `<option value="">Choose player</option>${options}`;
    $("secondaryPlayer").innerHTML = `<option value="">No assist recorded</option>${options}`;
  }

  function renderActionEntry() {
    const type = EVENT_MAP.get(selectedAction) || EVENT_TYPES[0];
    $("selectedActionLabel").textContent = type.label;
    $("primaryPlayerLabel").hidden = !type.requiresPlayer;
    $("secondaryPlayerLabel").hidden = !type.allowsSecondary;
    $("secondaryPlayerLabel").firstChild.textContent = type.secondaryLabel || "Second player";
    $("eventValidationMessage").textContent = "";
  }

  function lineupForQuarter(quarter) {
    return state.game.lineups[String(quarter)] || state.game.lineups[String(Math.max(1,quarter - 1))] || [];
  }

  function openLineupDialog(quarter) {
    syncSetupFromForm();
    if (!state.setup.roster.length) {
      alert("Add at least one player to the roster first.");
      return;
    }
    pendingLineupQuarter = Number(quarter);
    const selected = new Set(lineupForQuarter(pendingLineupQuarter));
    $("lineupDialogTitle").textContent = `Select ${quarterText(pendingLineupQuarter)} starters`;
    $("lineupChoices").innerHTML = state.setup.roster.map(player => `
      <label class="live-lineup-choice"><input type="checkbox" value="${escapeHtml(player.id)}" ${selected.has(player.id) ? "checked" : ""}><span>${escapeHtml(playerLabel(player))}</span></label>`).join("");
    $("lineupDialog").showModal();
  }

  function saveLineup() {
    const choices = Array.from($("lineupChoices").querySelectorAll("input:checked")).map(input => input.value);
    if (choices.length > 7) {
      alert("Select no more than seven starters.");
      return;
    }
    state.game.lineups[String(pendingLineupQuarter)] = choices;
    state.game.quarter = pendingLineupQuarter;
    state.game.clockMinutes = state.setup.quarterLength;
    state.game.clockSeconds = 0;
    if (state.game.status === "setup") {
      state.game.status = "live";
      state.game.startedAt = new Date().toISOString();
      $("setupPanel").hidden = true;
      $("launchRow").hidden = true;
      $("liveConsole").hidden = false;
    }
    const starters = choices.map(id => playerLabel(playerById(id)));
    addSystemEvent("quarter_start", {
      quarter: pendingLineupQuarter,
      note: starters.length ? `Starters: ${starters.join(", ")}` : "No starting lineup recorded"
    });
    $("lineupDialog").close();
    renderAll();
  }

  function shouldCreateMessage(type) {
    if (state.game.messagesPaused || state.setup.messageFrequency === "none") return false;
    if (state.setup.messageFrequency === "all") return true;
    return type.priority === "major";
  }

  function formatMessage(event) {
    const score = `${state.setup.teamName} ${event.scoreAfter.team}, ${state.setup.opponentName} ${event.scoreAfter.opponent}`;
    const when = `${quarterText(event.quarter)} · ${event.timeRemaining}`;
    const player = playerById(event.playerId);
    const secondary = playerById(event.secondaryPlayerId);
    let body = event.label;
    if (event.type === "goal") {
      body = `Goal — ${playerLabel(player)}`;
      if (secondary) body += `\nAssist — ${playerLabel(secondary)}`;
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
    }
    if (event.note && !["quarter_start","score_correction"].includes(event.type)) body += `\n${event.note}`;
    return `**${when}**\n${body}\n**${score}**`;
  }

  function createMessage(event, type) {
    if (!shouldCreateMessage(type)) return;
    state.game.messages.unshift({
      id: uid("message"),
      eventId: event.id,
      destination: state.setup.groupMeName,
      text: formatMessage(event),
      status: config.groupMeDelivery === "live" ? "pending" : "mock",
      createdAt: new Date().toISOString()
    });
  }

  function baseEvent(type, overrides = {}) {
    return {
      id: uid("event"),
      sequence: activeEvents().length + 1,
      type: type.id,
      label: type.label,
      category: type.category,
      playerId: overrides.playerId || null,
      secondaryPlayerId: overrides.secondaryPlayerId || null,
      quarter: Number(overrides.quarter || state.game.quarter),
      timeRemaining: overrides.timeRemaining || clockText(),
      note: overrides.note || "",
      teamDelta: Number(overrides.teamDelta ?? type.teamDelta ?? 0),
      opponentDelta: Number(overrides.opponentDelta ?? type.opponentDelta ?? 0),
      status: "active",
      createdAt: new Date().toISOString(),
      createdBy: config.mode === "connected" ? "authenticated scorer" : "local demo scorer"
    };
  }

  function commitEvent(event, type) {
    state.game.events.push(event);
    recalculateScore();
    event.scoreAfter = {team:state.game.teamScore,opponent:state.game.opponentScore};
    createMessage(event,type);
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
    commitEvent(baseEvent(type,overrides),type);
  }

  function recordSelectedEvent() {
    syncClockFromInputs();
    const type = EVENT_MAP.get(selectedAction);
    const playerId = $("primaryPlayer").value;
    const secondaryPlayerId = $("secondaryPlayer").value;
    const note = $("eventNote").value.trim();
    if (type.requiresPlayer && !playerId) {
      $("eventValidationMessage").textContent = "Choose the player involved in this action.";
      return;
    }
    if (playerId && secondaryPlayerId === playerId) {
      $("eventValidationMessage").textContent = "The scorer and assist cannot be the same player.";
      return;
    }
    const event = baseEvent(type,{playerId,secondaryPlayerId,note});
    commitEvent(event,type);
    $("eventNote").value = "";
    $("secondaryPlayer").value = "";
    $("eventValidationMessage").textContent = `${type.label} recorded at ${event.timeRemaining}.`;
  }

  function syncClockFromInputs() {
    state.game.quarter = Number($("currentQuarter").value);
    state.game.clockMinutes = clamp($("clockMinutes").value,0,15);
    state.game.clockSeconds = clamp($("clockSeconds").value,0,59);
    saveState();
    renderScoreboard();
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
    syncClockFromInputs();
    const type = {id:"score_correction",label:"Score correction",category:"game",priority:"major"};
    const event = baseEvent(type,{note:reason});
    event.correctedTeamScore = team;
    event.correctedOpponentScore = opponent;
    state.game.events.push(event);
    recalculateScore();
    event.scoreAfter = {team:state.game.teamScore,opponent:state.game.opponentScore};
    createMessage(event,type);
    saveState();
    $("scoreDialog").close();
    renderAll();
  }

  function renderScoreboard() {
    $("scoreTeamName").textContent = state.setup.teamName;
    $("scoreOpponentName").textContent = state.setup.opponentName;
    $("teamScore").textContent = state.game.teamScore;
    $("opponentScore").textContent = state.game.opponentScore;
    $("currentQuarter").value = String(state.game.quarter);
    $("clockMinutes").value = state.game.clockMinutes;
    $("clockSeconds").value = state.game.clockSeconds;
    $("quarterClockLabel").textContent = `${quarterText()} · ${clockText()}`;
    $("gameStatus").textContent = state.game.status === "ended" ? "Final · sandbox" : "Live sandbox";
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
      const secondary = playerById(event.secondaryPlayerId);
      let detail = player ? playerLabel(player) : "Team event";
      if (secondary) detail += ` · Assist ${playerLabel(secondary)}`;
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
    if (!messages.length) {
      $("messageList").innerHTML = `<p class="live-empty-state">No messages generated yet.</p>`;
      return;
    }
    $("messageList").innerHTML = messages.map(message => `<article class="live-message">
      <header><strong>${escapeHtml(message.destination)}</strong><time>${new Date(message.createdAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</time></header>
      <pre>${escapeHtml(message.text.replace(/\*\*/g,""))}</pre>
      <span class="live-message-status">${message.status === "mock" ? "Preview only" : escapeHtml(message.status)}</span>
    </article>`).join("");
  }

  function aggregate() {
    const events = activeEvents();
    const counts = Object.fromEntries(EVENT_TYPES.map(type => [type.id,0]));
    const players = new Map(state.setup.roster.map(player => [player.id,{player,counts:{},assists:0}]));
    for (const event of events) {
      counts[event.type] = (counts[event.type] || 0) + 1;
      if (event.playerId && players.has(event.playerId)) {
        const item = players.get(event.playerId);
        item.counts[event.type] = (item.counts[event.type] || 0) + 1;
      }
      if (event.secondaryPlayerId && players.has(event.secondaryPlayerId)) players.get(event.secondaryPlayerId).assists += 1;
    }
    return {events,counts,players};
  }

  function buildRecap(stats) {
    const team = state.setup.teamName;
    const opponent = state.setup.opponentName;
    const result = state.game.teamScore > state.game.opponentScore ? "won" : state.game.teamScore < state.game.opponentScore ? "fell" : "finished level";
    const defensive = (stats.counts.save || 0) + (stats.counts.field_block || 0) + (stats.counts.steal || 0);
    const exclusions = (stats.counts.exclusion_drawn || 0) + (stats.counts.five_meter_drawn || 0);
    const leaders = [...stats.players.values()].map(item => ({
      label:playerLabel(item.player),
      goals:item.counts.goal || 0,
      assists:item.assists,
      defense:(item.counts.save || 0)+(item.counts.field_block || 0)+(item.counts.steal || 0)
    })).sort((a,b) => (b.goals+b.assists+b.defense)-(a.goals+a.assists+a.defense)).filter(item => item.goals || item.assists || item.defense).slice(0,3);
    const leaderText = leaders.length ? ` Recorded contributors included ${leaders.map(item => `${item.label} (${item.goals} goals, ${item.assists} assists, ${item.defense} defensive actions)`).join("; ")}.` : "";
    return `${team} ${result} against ${opponent}, ${state.game.teamScore}–${state.game.opponentScore}, in this sandbox scrimmage. The live log recorded ${stats.counts.goal || 0} goals, ${stats.counts.save || 0} saves, ${stats.counts.steal || 0} steals, ${stats.counts.field_block || 0} field blocks, and ${exclusions} exclusion or five-meter opportunities drawn.${leaderText} Statistics are unofficial and reflect only actions entered by the scorer.`;
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
    $("pauseMessagesButton").setAttribute("aria-pressed", String(state.game.messagesPaused));
    $("pauseMessagesButton").textContent = state.game.messagesPaused ? "Resume messages" : "Pause messages";
    if (state.game.status !== "setup") {
      $("setupPanel").hidden = true;
      $("launchRow").hidden = true;
      $("liveConsole").hidden = false;
    }
    if (state.game.status === "ended") {
      $("summaryPanel").hidden = false;
      renderSummary();
    }
  }

  function endGame() {
    if (!confirm("End this sandbox game and build the recap?")) return;
    addSystemEvent("quarter_end",{note:"Final whistle"});
    state.game.status = "ended";
    state.game.endedAt = new Date().toISOString();
    saveState();
    renderAll();
    $("summaryPanel").scrollIntoView({behavior:"smooth",block:"start"});
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
    const blob = new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `wpi-sandbox-${state.setup.teamName.replace(/[^a-z0-9]+/gi,"-").toLowerCase()}-${new Date().toISOString().slice(0,10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function resetSandbox() {
    if (!confirm("Delete this browser's sandbox game and start over?")) return;
    const setup = {...state.setup,roster:state.setup.roster.map(player => ({...player}))};
    state = defaultState();
    state.setup = setup;
    localStorage.removeItem(STORAGE_KEY);
    saveState();
    fillSetupForm();
    $("setupPanel").hidden = false;
    $("launchRow").hidden = false;
    $("liveConsole").hidden = true;
    $("summaryPanel").hidden = true;
    renderAll();
  }

  async function initAuthentication() {
    const connected = config.mode === "connected" && config.supabaseUrl && config.supabasePublishableKey;
    if (!connected) {
      $("connectionLabel").textContent = "Local demo mode";
      $("connectionDetail").textContent = "Events remain on this browser. GroupMe messages are previewed but not sent.";
      return;
    }
    $("authPanel").hidden = false;
    $("setupPanel").hidden = true;
    $("launchRow").hidden = true;
    $("connectionLabel").textContent = "Connecting to secure sandbox";
    $("connectionDetail").textContent = "Supabase email/password authentication is enabled.";
    try {
      const module = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.8/+esm");
      supabase = module.createClient(config.supabaseUrl,config.supabasePublishableKey);
      const {data} = await supabase.auth.getSession();
      if (data.session) showAuthenticated(data.session.user);
      supabase.auth.onAuthStateChange((_event,session) => session ? showAuthenticated(session.user) : showSignedOut());
    } catch (error) {
      $("authMessage").textContent = `Connection failed: ${error.message}`;
      $("connectionLabel").textContent = "Sandbox connection failed";
    }
  }

  function showAuthenticated(user) {
    $("authPanel").hidden = true;
    $("setupPanel").hidden = state.game.status !== "setup";
    $("launchRow").hidden = state.game.status !== "setup";
    $("signOutButton").hidden = false;
    $("connectionLabel").textContent = "Authenticated sandbox";
    $("connectionDetail").textContent = `${user.email} · event storage remains local until the connected-data release is applied.`;
    renderAll();
  }

  function showSignedOut() {
    $("authPanel").hidden = false;
    $("setupPanel").hidden = true;
    $("launchRow").hidden = true;
    $("liveConsole").hidden = true;
    $("signOutButton").hidden = true;
  }

  function bindEvents() {
    ["teamName","opponentName","gameDateTime","gameVenue","quarterLength","groupMeName","messageFrequency","visibility"].forEach(id => $(id).addEventListener("change",syncSetupFromForm));
    $("addPlayerButton").addEventListener("click",() => {
      syncSetupFromForm();
      state.setup.roster.push({id:uid("player"),cap:"",name:""});
      saveState();
      renderRoster();
    });
    $("startGameButton").addEventListener("click",() => openLineupDialog(1));
    $("saveLineupButton").addEventListener("click",saveLineup);
    $("startQuarterButton").addEventListener("click",() => {syncClockFromInputs();openLineupDialog(Number($("currentQuarter").value));});
    $("recordEventButton").addEventListener("click",recordSelectedEvent);
    ["currentQuarter","clockMinutes","clockSeconds"].forEach(id => $(id).addEventListener("change",syncClockFromInputs));
    $("pauseMessagesButton").addEventListener("click",() => {state.game.messagesPaused=!state.game.messagesPaused;saveState();renderAll();});
    $("undoButton").addEventListener("click",undoLastEvent);
    $("scoreCorrectionButton").addEventListener("click",() => {
      $("correctTeamScore").value = state.game.teamScore;
      $("correctOpponentScore").value = state.game.opponentScore;
      $("scoreCorrectionReason").value = "";
      $("scoreDialog").showModal();
    });
    $("saveScoreCorrectionButton").addEventListener("click",saveScoreCorrection);
    $("endGameButton").addEventListener("click",endGame);
    $("downloadLogButton").addEventListener("click",downloadLog);
    $("resetSandboxButton").addEventListener("click",resetSandbox);
    $("authForm").addEventListener("submit",async event => {
      event.preventDefault();
      if (!supabase) return;
      $("authMessage").textContent = "Signing in…";
      const {error} = await supabase.auth.signInWithPassword({email:$("authEmail").value.trim(),password:$("authPassword").value});
      $("authMessage").textContent = error ? error.message : "Signed in.";
    });
    $("signOutButton").addEventListener("click",async () => {if(supabase) await supabase.auth.signOut();});
  }

  function init() {
    fillSetupForm();
    renderActions();
    renderPlayerOptions();
    renderActionEntry();
    bindEvents();
    renderAll();
    initAuthentication();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
