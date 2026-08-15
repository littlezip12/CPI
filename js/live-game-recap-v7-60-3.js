(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const config = window.WPI_LIVE_SANDBOX_CONFIG || {};
  const fallbackLogo = "assets/branding/wpi-logo-mark.png";
  let backend = null;

  function esc(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
  }
  function safeLogo(value) { return value && !/^javascript:/i.test(String(value)) ? value : fallbackLogo; }
  function gameDate(value) {
    if (!value) return "Date unavailable";
    const d = new Date(value); if (Number.isNaN(d.getTime())) return "Date unavailable";
    return d.toLocaleString([], {weekday:"short",month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"});
  }
  function clock(seconds) {
    const n = Math.max(0, Number(seconds || 0));
    return `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2,"0")}`;
  }
  function periodLabel(event) {
    const phase = String(event.phase || "regulation");
    if (phase === "shootout") return "SO";
    if (phase === "overtime") return `OT${Math.max(1, Number(event.quarter || 5) - 4)}`;
    return `Q${event.quarter || 1}`;
  }
  function eventLabel(event) {
    const player = event.playerName ? `${event.playerCap != null ? `#${event.playerCap} ` : ""}${event.playerName}` : "";
    const assist = event.secondaryPlayerName ? ` · Assist ${event.secondaryPlayerCap != null ? `#${event.secondaryPlayerCap} ` : ""}${event.secondaryPlayerName}` : "";
    const labels = {
      goal:"Goal",opponent_goal:"Opponent goal",shot_missed:"Shot missed",shot_post:"Shot off post",shot_blocked:"Shot blocked",shot_saved:"Shot saved",
      save:"Save",field_block:"Field block",steal:"Steal",turnover:"Turnover",exclusion_drawn:"Exclusion drawn",exclusion_committed:"Exclusion committed",
      five_meter_drawn:"5-meter drawn",five_meter_committed:"5-meter committed",quarter_start:"Period started",quarter_end:"Period ended",overtime_start:"Overtime started",
      shootout_start:"Shootout started",shootout_goal:"Shootout goal",shootout_miss:"Shootout miss",score_correction:"Score correction",game_summary:"Game summary"
    };
    const main = labels[event.eventType] || event.eventLabel || event.eventType || "Game event";
    return {main: player ? `${main} · ${player}` : main, detail:[assist.replace(/^ · /,""), event.note].filter(Boolean).join(" · ")};
  }
  function metaItem(label,value) { return value ? `<div class="live-recap-meta-item"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>` : ""; }

  function render(data) {
    const game = data.game || {};
    const series = data.series || {};
    const recap = data.recap || {};
    const events = Array.isArray(data.events) ? data.events : [];
    const lineups = Array.isArray(data.lineups) ? data.lineups : [];
    const stats = Array.isArray(data.playerStats) ? data.playerStats : [];
    const periods = Array.isArray(data.periods) ? data.periods : [];
    const teamScore = Number(game.teamScore || 0), opponentScore = Number(game.opponentScore || 0);

    $("recapEventName").textContent = series.name || `${game.teamName || "Team"} vs ${game.opponentName || "Opponent"}`;
    $("recapTeamLogo").src = safeLogo(game.teamLogoUrl); $("recapOpponentLogo").src = safeLogo(game.opponentLogoUrl);
    $("recapTeamName").textContent = game.teamName || "Team"; $("recapOpponentName").textContent = game.opponentName || "Opponent";
    $("recapTeamScore").textContent = teamScore; $("recapOpponentScore").textContent = opponentScore;
    const badge = $("recapResultBadge");
    if (teamScore > opponentScore) { badge.textContent="Win"; badge.className="live-recap-result-win"; }
    else if (teamScore < opponentScore) { badge.textContent="Loss"; badge.className="live-recap-result-loss"; }
    else { badge.textContent="Tie"; badge.className="live-recap-result-tie"; }
    $("recapGameMeta").textContent = [gameDate(game.scheduledAt || game.endedAt),game.venue].filter(Boolean).join(" · ");

    $("recapSeriesName").textContent = series.name || (game.gameKind === "tournament" ? "Tournament" : "Scrimmage Weekend");
    $("recapSeason").textContent = series.competitiveSeason || game.competitiveSeason || "Season";
    $("recapEventDetails").innerHTML = [
      metaItem("Type",series.seriesType === "tournament" ? "Tournament" : "Scrimmage Weekend"),
      metaItem("Game",game.officialGameNumber ? `Game ${game.officialGameNumber}` : null),
      metaItem("Division",game.officialDivisionLabel),metaItem("Stage",game.officialStage),metaItem("Venue",game.venue),
      metaItem("Started",game.startedAt ? gameDate(game.startedAt) : null),metaItem("Finished",game.endedAt ? gameDate(game.endedAt) : null)
    ].join("") || '<p class="live-recap-empty">No additional event metadata was saved.</p>';

    $("recapPeriodScores").innerHTML = periods.length ? periods.map(row => `<div class="live-recap-period"><span>${esc(row.periodLabel || `Q${row.quarter}`)}</span><strong>${esc(row.teamScore)}–${esc(row.opponentScore)}</strong></div>`).join("") : '<p class="live-recap-empty">No period score checkpoints were recorded.</p>';

    const narrative = recap.approvedText || recap.straightText || "";
    if (narrative) { $("recapNarrative").textContent = narrative; $("recapNarrativeStatus").textContent = recap.approvedText ? "Approved recap" : "Saved recap"; }

    $("recapLineups").innerHTML = lineups.length ? lineups.map(row => {
      const goalie = row.goalieName ? `Goalie: ${row.goalieCap != null ? `#${row.goalieCap} ` : ""}${row.goalieName}` : "Goalie not recorded";
      const players = (row.players || []).map(p => `${p.cap != null ? `#${p.cap} ` : ""}${p.name}`).join(" · ");
      return `<div class="live-recap-lineup-row"><strong>${esc(row.periodLabel || `Q${row.quarter}`)}</strong><span>${esc(goalie)}${players ? `<br>${esc(players)}` : ""}</span></div>`;
    }).join("") : '<p class="live-recap-empty">No saved lineups for this game.</p>';

    $("recapPlayerStats").innerHTML = stats.length ? stats.map(row => {
      const chips = [["G",row.goals],["A",row.assists],["SV",row.saves],["STL",row.steals],["TO",row.turnovers],["EXD",row.exclusionsDrawn],["EXC",row.exclusionsCommitted],["5MD",row.fiveMetersDrawn],["5MC",row.fiveMetersCommitted]].filter(([,v]) => Number(v)>0);
      return `<div class="live-recap-stat-row"><strong>${esc(row.cap != null ? `#${row.cap} ${row.name}` : row.name)}</strong>${chips.length ? `<div class="live-recap-stat-chips">${chips.map(([k,v]) => `<em>${esc(k)} ${esc(v)}</em>`).join("")}</div>` : '<span>No tracked counting stats.</span>'}</div>`;
    }).join("") : '<p class="live-recap-empty">No player stats were recorded.</p>';

    $("recapEventCount").textContent = `${events.length} event${events.length === 1 ? "" : "s"}`;
    $("recapTimeline").innerHTML = events.length ? events.map(event => {
      const label = eventLabel(event);
      return `<div class="live-recap-event"><div class="live-recap-event-time">${esc(periodLabel(event))} · ${esc(clock(event.timeRemainingSeconds))}</div><div class="live-recap-event-main"><strong>${esc(label.main)}</strong>${label.detail ? `<span>${esc(label.detail)}</span>` : ""}</div><div class="live-recap-event-score">${esc(event.teamScoreAfter)}–${esc(event.opponentScoreAfter)}</div></div>`;
    }).join("") : '<p class="live-recap-empty">No active timeline events were recorded.</p>';

    if (data.deliveryAudit && data.viewer?.canManage) {
      $("recapDeliveryPanel").hidden = false;
      const audit = data.deliveryAudit;
      $("recapDeliveryAudit").innerHTML = [["Sent",audit.sent],["Failed",audit.failed],["Queued",audit.pending],["Suppressed",audit.suppressed]].map(([label,value]) => `<div><strong>${esc(value || 0)}</strong><span>${esc(label)}</span></div>`).join("");
    }
    const followReturn = new URLSearchParams(location.search).get("follow") === "1";
    $("backToDashboard").href = followReturn ? "live-following.html" : `live-dashboard.html?team=${encodeURIComponent(game.teamId || "")}`;
    $("backToDashboard").textContent = followReturn ? "Back to My Teams" : "Back to dashboard";
    $("recapLoading").hidden = true; $("recapContent").hidden = false;
  }

  async function init() {
    try {
      const gameId = new URLSearchParams(location.search).get("game");
      if (!gameId) throw new Error("A game ID is required to open a recap.");
      if (!window.WPILiveBackend?.isConfigured(config)) throw new Error("WPI Live is not configured.");
      backend = await window.WPILiveBackend.connect(config);
      const session = await backend.waitForHealthySession();
      if (!session) { location.replace(`live-login.html?return=${encodeURIComponent(location.href)}`); return; }
      const {data,error} = await backend.client.rpc("live_game_recap_detail_v1", {target_game_id:gameId});
      if (error) throw error;
      render(data || {});
    } catch (error) {
      $("recapLoading").hidden = true; $("recapError").hidden = false; $("recapErrorText").textContent = error?.message || "This recap could not be loaded.";
    }
  }

  $("recapSignOutButton")?.addEventListener("click", async () => { try { if (backend) await backend.signOut(); } finally { location.replace("live-login.html"); } });
  init();
})();
