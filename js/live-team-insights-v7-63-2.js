(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const config = window.WPI_LIVE_SANDBOX_CONFIG || {};
  let backend = null;
  let state = null;
  let selectedSeriesId = null;

  function esc(value) {
    return String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  }
  function money(cents) {
    const n = Number(cents || 0) / 100;
    return new Intl.NumberFormat("en-US", {style:"currency", currency:"USD", maximumFractionDigits:n % 1 ? 2 : 0}).format(n);
  }
  function dateLabel(value) {
    if (!value) return "Date unavailable";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "Date unavailable";
    return d.toLocaleDateString([], {month:"short",day:"numeric",year:"numeric"});
  }
  function resultLabel(row) {
    const r = String(row.result || "tie");
    return r === "win" ? "W" : r === "loss" ? "L" : "T";
  }
  function statGrid(totals) {
    const shots = Number(totals?.shots || 0), goals = Number(totals?.goals || 0);
    const rows = [
      ["Goals", goals], ["Shots", shots], ["Shooting", shots ? `${Math.round((goals / shots) * 100)}%` : "—"],
      ["Saves", totals?.saves || 0], ["Steals", totals?.steals || 0], ["Turnovers", totals?.turnovers || 0],
      ["Field blocks", totals?.fieldBlocks || 0], ["Excl. drawn", totals?.exclusionsDrawn || 0], ["Excl. committed", totals?.exclusionsCommitted || 0],
      ["5m drawn", totals?.fiveMetersDrawn || 0], ["5m committed", totals?.fiveMetersCommitted || 0]
    ];
    return rows.map(([label,value]) => `<div><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`).join("");
  }
  function playerRows(players) {
    if (!Array.isArray(players) || !players.length) return '<p class="insights-empty">No player analytics were recorded for this scope.</p>';
    return players.map(p => `<div class="insights-player-row"><strong>${esc(p.cap ? `#${p.cap} ${p.name}` : p.name || "Player")}</strong><span>${esc(p.games || 0)} GP</span><span>${esc(p.goals || 0)} G</span><span>${esc(p.assists || 0)} A</span><span>${esc(p.saves || 0)} SV</span><span>${esc(p.steals || 0)} STL</span></div>`).join("");
  }
  function recordKpis(summary, compact=false) {
    const rows = compact ? [
      ["Games",summary?.games||0],["Record",`${summary?.wins||0}-${summary?.losses||0}${summary?.ties?`-${summary.ties}`:""}`],
      ["GF",summary?.goalsFor||0],["GA",summary?.goalsAgainst||0],["Diff",Number(summary?.goalDifferential||0)>0?`+${summary.goalDifferential}`:summary?.goalDifferential||0]
    ] : [
      ["Games",summary?.games||0],["Wins",summary?.wins||0],["Losses",summary?.losses||0],["Ties",summary?.ties||0],
      ["Goals for",summary?.goalsFor||0],["Goals against",summary?.goalsAgainst||0]
    ];
    return rows.map(([label,value]) => `<div><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`).join("");
  }
  function renderOffer(data) {
    const offer = data.offer || {};
    $("monthlyPrice").textContent = money(offer.monthlyPriceCents || 500);
    $("annualPrice").textContent = money(offer.annualPriceCents || 5000);
    const monthlyAnnual = Number(offer.monthlyPriceCents || 500) * 12;
    const annual = Number(offer.annualPriceCents || 5000);
    const savings = Math.max(0, monthlyAnnual - annual);
    const annualSpan = $("annualPrice")?.nextElementSibling;
    if (annualSpan) annualSpan.textContent = `/ year${savings ? ` · save ${money(savings)}` : ""}`;
    $("upgradeStatus").textContent = offer.checkoutStatus === "active"
      ? "Secure checkout is available."
      : "Subscriptions are coming soon. No payment will be collected yet.";
    $("upgradePreviewButton").addEventListener("click", () => {
      $("upgradeStatus").textContent = "Team Insights is priced at $5/month or $50/year. Checkout will be enabled in the billing release.";
    }, {once:true});
  }
  function renderSeriesSelection(series) {
    selectedSeriesId = series?.seriesId || null;
    if (!series) {
      $("selectedSeriesPanel").hidden = true;
      $("gamesHeading").textContent = "Season games";
      renderGames(state.games || []);
      return;
    }
    $("selectedSeriesPanel").hidden = false;
    $("selectedSeriesType").textContent = series.seriesType === "tournament" ? "Tournament analytics" : "Weekend analytics";
    $("selectedSeriesName").textContent = series.name || "Event";
    $("selectedSeriesRecord").innerHTML = recordKpis(series,true);
    $("selectedSeriesTotals").innerHTML = statGrid(series.teamTotals || {});
    $("selectedSeriesPlayers").innerHTML = playerRows(series.playerTotals || []);
    $("gamesHeading").textContent = series.name || "Event games";
    renderGames((state.games || []).filter(g => String(g.seriesId || "") === String(series.seriesId || "")));
    $("selectedSeriesPanel").scrollIntoView({behavior:"smooth",block:"start"});
  }
  function renderGames(games) {
    $("gameCount").textContent = `${games.length} game${games.length===1?"":"s"}`;
    $("gameList").innerHTML = games.length ? games.map(g => {
      const meta = [dateLabel(g.endedAt || g.scheduledAt),g.seriesName,g.venue].filter(Boolean).join(" · ");
      return `<div class="insights-game-row"><div><strong>${esc(resultLabel(g))} · ${esc(g.opponentName || "Opponent")}</strong><small>${esc(meta)}</small></div><div class="insights-game-score">${esc(g.teamScore)}–${esc(g.opponentScore)}</div><a href="live-game-recap.html?game=${encodeURIComponent(g.gameId)}&team=${encodeURIComponent(state.team.id)}">Game analytics →</a></div>`;
    }).join("") : '<p class="insights-empty">No finalized games are available for this scope.</p>';
  }
  function renderDetailed(data) {
    const summary = data.seasonSummary || {}, totals = data.seasonTeamTotals || {}, players = data.seasonPlayerTotals || [], series = data.seriesSummaries || [];
    $("seasonRecord").innerHTML = recordKpis(summary);
    $("seasonTeamTotals").innerHTML = statGrid(totals);
    const shots = Number(totals.shots || 0), goals = Number(totals.goals || 0);
    $("seasonShootingPct").textContent = shots ? `${Math.round((goals/shots)*100)}% shooting` : "Shooting —";
    $("seasonPlayerCount").textContent = `${players.length} player${players.length===1?"":"s"}`;
    $("seasonPlayerTotals").innerHTML = playerRows(players);
    $("seriesCount").textContent = `${series.length} event${series.length===1?"":"s"}`;
    $("seriesCards").innerHTML = series.length ? series.map(s => `<button class="insights-series-card" type="button" data-series-id="${esc(s.seriesId)}"><small>${esc(s.seriesType === "tournament" ? "Tournament" : "Weekend")}</small><strong>${esc(s.name || "Event")}</strong><div class="insights-series-record"><span>${esc(s.wins||0)}-${esc(s.losses||0)}${s.ties?`-${esc(s.ties)}`:""}</span><span>${esc(s.goalsFor||0)} GF · ${esc(s.goalsAgainst||0)} GA</span></div></button>`).join("") : '<p class="insights-empty">No tournament or weekend groupings have finalized analytics yet.</p>';
    renderGames(data.games || []);
    $("seriesCards").querySelectorAll("[data-series-id]").forEach(button => button.addEventListener("click", () => {
      const found = series.find(row => String(row.seriesId) === String(button.dataset.seriesId));
      renderSeriesSelection(found || null);
    }));
    $("clearSeries").onclick = () => renderSeriesSelection(null);
  }
  function render(data) {
    state = data || {};
    const team = state.team || {}, offer = state.offer || {}, access = state.access || {};
    $("insightsTeamName").textContent = team.displayLabel || team.name || "Team Insights";
    $("insightsTeamContext").textContent = [team.organizationName,team.competitiveSeason].filter(Boolean).join(" · ") || "Game, weekend and season analytics in one place.";
    $("insightsBackLink").href = new URLSearchParams(location.search).get("game") ? `live-game-recap.html?game=${encodeURIComponent(new URLSearchParams(location.search).get("game"))}&team=${encodeURIComponent(team.id||"")}` : "live-following.html";
    renderOffer(state);

    const seasons = Array.isArray(state.availableSeasons) ? state.availableSeasons : [];
    $("seasonSelect").innerHTML = seasons.length ? seasons.map(s => `<option value="${esc(s)}"${String(s)===String(state.selectedSeason)?" selected":""}>${esc(s)}</option>`).join("") : `<option value="${esc(state.selectedSeason || team.competitiveSeason || "")}">${esc(state.selectedSeason || team.competitiveSeason || "Current season")}</option>`;

    if (!access.hasDetailedAnalytics) {
      $("insightsLocked").hidden = false;
      $("insightsContent").hidden = true;
    } else {
      $("insightsLocked").hidden = true;
      $("insightsContent").hidden = false;
      renderDetailed(state);
    }
    $("insightsLoading").hidden = true;
  }
  function renderError(error) {
    const message = String(error?.message || "");
    $("insightsLoading").hidden = true;
    $("insightsError").hidden = false;
    if (/Team access required/i.test(message)) {
      $("insightsErrorTitle").textContent = "Team access required";
      $("insightsErrorText").textContent = "Follow this team or use an account with team access before opening Team Insights.";
    } else if (/Team not found/i.test(message)) {
      $("insightsErrorTitle").textContent = "Team not found";
      $("insightsErrorText").textContent = "This WPI team record is unavailable.";
    } else {
      $("insightsErrorTitle").textContent = "Team Insights unavailable";
      $("insightsErrorText").textContent = message || "WPI could not load Team Insights right now.";
    }
  }
  async function load(season) {
    const params = new URLSearchParams(location.search);
    const teamId = params.get("team");
    if (!teamId) throw new Error("Team not found");
    const {data,error} = await backend.client.rpc("live_team_insights_overview_v1", {target_team_id:teamId,requested_season:season || null});
    if (error) throw error;
    render(data || {});
  }
  async function init() {
    try {
      if (!window.WPILiveBackend?.isConfigured(config)) throw new Error("WPI Live is not configured.");
      backend = await window.WPILiveBackend.connect(config);
      const session = await backend.waitForHealthySession();
      if (!session) { location.replace(`live-login.html?return=${encodeURIComponent(location.href)}`); return; }
      await load(new URLSearchParams(location.search).get("season"));
      $("seasonSelect").addEventListener("change", async () => {
        try {
          $("insightsLoading").hidden = false;
          selectedSeriesId = null;
          await load($("seasonSelect").value);
        } catch (e) { renderError(e); }
      });
    } catch (error) { renderError(error); }
  }
  $("insightsSignOut")?.addEventListener("click", async () => { try { if (backend) await backend.signOut(); } finally { location.replace("live-login.html"); } });
  init();
})();
