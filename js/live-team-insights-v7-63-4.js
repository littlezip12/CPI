(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const config = window.WPI_LIVE_SANDBOX_CONFIG || {};
  let backend = null;
  let state = null;
  let selectedSeriesId = null;
  let playerScopeData = null;
  let comparisonPlayerIds = [];
  let commerceState = null;
  let selectedBillingInterval = "annual";

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
  function playerLabel(player) {
    return player?.cap ? `#${player.cap} ${player.name || "Player"}` : (player?.name || "Player");
  }
  function pct(goals, shots) {
    const s = Number(shots || 0);
    return s > 0 ? `${((Number(goals || 0) / s) * 100).toFixed(1).replace(/\.0$/,"")}%` : "—";
  }
  function perGame(value, games) {
    const g = Number(games || 0);
    return g > 0 ? (Number(value || 0) / g).toFixed(1).replace(/\.0$/,"") : "—";
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
    return players.map(p => {
      const shooting = Number(p.shots || 0) ? pct(p.goals,p.shots) : "—";
      return `<div class="insights-player-row"><strong>${esc(playerLabel(p))}</strong><span>${esc(p.games || 0)} GP</span><span>${esc(p.goals || 0)} G</span><span>${esc(p.shots || 0)} SH</span><span>${esc(shooting)}</span><span>${esc(p.assists || 0)} A</span></div>`;
    }).join("");
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
  }
  function billingDate(value) {
    if (!value) return "";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString([], {month:"short",day:"numeric",year:"numeric"});
  }
  function setPlan(interval) {
    selectedBillingInterval = interval === "monthly" ? "monthly" : "annual";
    $("monthlyPlanButton")?.classList.toggle("is-selected", selectedBillingInterval === "monthly");
    $("annualPlanButton")?.classList.toggle("is-selected", selectedBillingInterval === "annual");
    if (commerceState) renderCommerce(commerceState);
  }
  async function invokeBilling(action) {
    const teamId = state?.team?.id;
    if (!teamId) return;
    $("upgradeStatus").textContent = action === "portal" ? "Opening secure billing management…" : "Opening secure checkout…";
    const {data,error} = await backend.client.functions.invoke("team-insights-billing", {body:{
      action,
      team_id:teamId,
      billing_interval:selectedBillingInterval,
      adult_purchaser_confirmed: action === "checkout" ? !!$("adultPurchaserConfirm")?.checked : undefined,
    }});
    if (error) throw error;
    if (!data?.url) throw new Error("Secure billing did not return a destination.");
    location.assign(data.url);
  }
  function renderCommerce(data) {
    commerceState = data || {};
    const product = commerceState.product || {};
    const promo = commerceState.promotion || null;
    const subscription = commerceState.subscription || null;
    const supporter = !!state?.access?.isSupporter;
    const promoBanner = $("insightsPromotionBanner");
    promoBanner.hidden = !(promo && supporter);
    if (promo && supporter) {
      $("promotionLabel").textContent = promo.label || "Premium analytics are unlocked";
      const ends = billingDate(promo.endsAt);
      $("promotionEnds").textContent = ends ? `Free through ${ends}` : "Free preview active";
      $("promotionMessage").textContent = `No card required. Your account returns to free Supporter access${ends ? ` after ${ends}` : " when the preview ends"} unless you choose to subscribe.`;
    }

    const subBar = $("insightsSubscriptionBar");
    subBar.hidden = !subscription;
    if (subscription) {
      const end = billingDate(subscription.currentPeriodEnd);
      const status = String(subscription.status || "");
      $("subscriptionStatusTitle").textContent = subscription.cancelAtPeriodEnd ? "Team Insights · cancellation scheduled" : "Team Insights subscription";
      $("subscriptionStatusText").textContent = subscription.cancelAtPeriodEnd
        ? `Access continues${end ? ` through ${end}` : " through the paid period"}.`
        : `${status === "past_due" ? "Payment needs attention. " : ""}${end ? `Current period through ${end}.` : "Subscription billing is managed securely by Stripe."}`;
      $("manageSubscriptionButton").onclick = () => invokeBilling("portal").catch(err => { $("subscriptionStatusText").textContent = err?.message || "Billing management is not available yet."; });
    }

    const checkoutStatus = String(product.checkoutStatus || state?.offer?.checkoutStatus || "preview");
    const chosenPrice = selectedBillingInterval === "monthly" ? money(product.monthlyPriceCents || 500) : money(product.annualPriceCents || 5000);
    const chosenSuffix = selectedBillingInterval === "monthly" ? "/month" : "/year";
    const adultRequired = product.adultPurchaserRequired !== false;
    const adultWrap = $("adultPurchaserConfirmWrap");
    if (adultWrap) adultWrap.hidden = !(checkoutStatus === "active" && adultRequired);
    $("upgradePreviewButton").textContent = checkoutStatus === "active" ? `Subscribe · ${chosenPrice}${chosenSuffix}` : "Upgrade to Team Insights";
    $("upgradeStatus").textContent = checkoutStatus === "active"
      ? "Secure Stripe checkout is available. Payment details are handled by Stripe, not WPI."
      : "Subscriptions are not live yet. No payment will be collected.";
    $("upgradePreviewButton").onclick = () => {
      if (checkoutStatus !== "active") {
        $("upgradeStatus").textContent = "Team Insights will launch at $5/month or $50/year after WPI business, banking, legal, hosting and Stripe setup are complete.";
        return;
      }
      if (adultRequired && !$("adultPurchaserConfirm")?.checked) {
        $("upgradeStatus").textContent = "Please confirm that you are 18 or older and authorized to make this purchase.";
        return;
      }
      invokeBilling("checkout").catch(err => { $("upgradeStatus").textContent = err?.message || "Secure checkout could not be opened."; });
    };
  }
  async function loadCommerceStatus() {
    const teamId = state?.team?.id;
    if (!teamId) return;
    const {data,error} = await backend.client.rpc("live_team_insights_commerce_status_v1", {target_team_id:teamId});
    if (error) throw error;
    renderCommerce(data || {});
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
  function renderPlayerScopeOptions() {
    const season = state.selectedSeason || state.team?.competitiveSeason || "Current season";
    const series = Array.isArray(state.seriesSummaries) ? state.seriesSummaries : [];
    const games = Array.isArray(state.games) ? state.games : [];
    const seriesOptions = series.map(s => `<option value="series:${esc(s.seriesId)}">${esc(s.seriesType === "tournament" ? "Tournament" : "Weekend")} · ${esc(s.name || "Event")}</option>`).join("");
    const gameOptions = games.map(g => `<option value="game:${esc(g.gameId)}">Game · vs ${esc(g.opponentName || "Opponent")} · ${esc(dateLabel(g.endedAt || g.scheduledAt))}</option>`).join("");
    $("playerScopeSelect").innerHTML = `<option value="season">Season · ${esc(season)}</option>${seriesOptions ? `<optgroup label="Tournaments & weekends">${seriesOptions}</optgroup>` : ""}${gameOptions ? `<optgroup label="Individual games">${gameOptions}</optgroup>` : ""}`;
  }
  function parseScope(value) {
    const raw = String(value || "season");
    if (!raw.includes(":")) return {type:"season", id:null};
    const [type,id] = raw.split(":",2);
    return {type:["series","game"].includes(type) ? type : "season", id:id || null};
  }
  function comparisonMetrics(players) {
    const rows = [
      ["Games", p => p.games || 0],
      ["Goals", p => p.goals || 0],
      ["Shots", p => p.shots || 0],
      ["Shooting %", p => pct(p.goals,p.shots)],
      ["Goals / game", p => perGame(p.goals,p.games)],
      ["Assists", p => p.assists || 0],
      ["Assists / game", p => perGame(p.assists,p.games)],
      ["Steals", p => p.steals || 0],
      ["Turnovers", p => p.turnovers || 0],
      ["Saves", p => p.saves || 0],
      ["Field blocks", p => p.fieldBlocks || 0],
      ["Exclusions drawn", p => p.exclusionsDrawn || 0],
      ["Exclusions committed", p => p.exclusionsCommitted || 0],
      ["5m drawn", p => p.fiveMetersDrawn || 0],
      ["5m committed", p => p.fiveMetersCommitted || 0],
      ["Shots saved", p => p.shotsSaved || 0],
      ["Shots blocked", p => p.shotsBlocked || 0],
      ["Off post", p => p.shotsPost || 0],
      ["Missed", p => p.shotsMissed || 0],
      ["Shootout goals", p => p.shootoutGoals || 0],
      ["Shootout misses", p => p.shootoutMisses || 0]
    ];
    return `<div class="insights-comparison-scroll"><table class="insights-comparison-table"><thead><tr><th>Metric</th>${players.map(p => `<th>${esc(playerLabel(p))}</th>`).join("")}</tr></thead><tbody>${rows.map(([label,getter]) => `<tr><th>${esc(label)}</th>${players.map(p => `<td>${esc(getter(p))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }
  function refreshComparisonControls() {
    const players = Array.isArray(playerScopeData?.players) ? playerScopeData.players : [];
    if (!players.length) {
      $("primaryPlayerSelect").innerHTML = '<option value="">No player data</option>';
      $("comparisonPlayerSelect").innerHTML = '<option value="">No player available</option>';
      $("addComparisonPlayer").disabled = true;
      $("comparisonPlayerChips").innerHTML = "";
      $("playerComparison").innerHTML = '<p class="insights-empty">No player analytics were recorded for this scope.</p>';
      return;
    }
    const currentPrimary = $("primaryPlayerSelect").value;
    const ids = new Set(players.map(p => String(p.playerId || "")));
    const primaryId = ids.has(currentPrimary) ? currentPrimary : String(players[0].playerId || "");
    comparisonPlayerIds = comparisonPlayerIds.filter(id => ids.has(String(id)) && String(id) !== primaryId).slice(0,3);
    $("primaryPlayerSelect").innerHTML = players.map(p => `<option value="${esc(p.playerId)}"${String(p.playerId)===primaryId?" selected":""}>${esc(playerLabel(p))}</option>`).join("");
    const excluded = new Set([primaryId,...comparisonPlayerIds.map(String)]);
    const available = players.filter(p => !excluded.has(String(p.playerId || "")));
    $("comparisonPlayerSelect").innerHTML = available.length ? available.map(p => `<option value="${esc(p.playerId)}">${esc(playerLabel(p))}</option>`).join("") : '<option value="">No additional player</option>';
    $("addComparisonPlayer").disabled = comparisonPlayerIds.length >= 3 || !available.length;
    $("comparisonPlayerChips").innerHTML = comparisonPlayerIds.length ? `<span>Comparing with</span>${comparisonPlayerIds.map(id => {
      const p = players.find(row => String(row.playerId) === String(id));
      return `<button type="button" data-remove-player="${esc(id)}">${esc(playerLabel(p))} ×</button>`;
    }).join("")}` : '<span>Add up to three teammates for a side-by-side comparison.</span>';
    $("comparisonPlayerChips").querySelectorAll("[data-remove-player]").forEach(button => button.addEventListener("click", () => {
      comparisonPlayerIds = comparisonPlayerIds.filter(id => String(id) !== String(button.dataset.removePlayer));
      refreshComparisonControls();
    }));
    renderPlayerComparison();
  }
  function renderPlayerComparison() {
    const players = Array.isArray(playerScopeData?.players) ? playerScopeData.players : [];
    const primaryId = $("primaryPlayerSelect").value;
    const selectedIds = [primaryId,...comparisonPlayerIds].filter(Boolean);
    const selected = selectedIds.map(id => players.find(p => String(p.playerId) === String(id))).filter(Boolean);
    if (!selected.length) {
      $("playerComparison").innerHTML = '<p class="insights-empty">Choose a player to view detailed analytics.</p>';
      return;
    }
    const scope = playerScopeData?.scope || {};
    const scopeLabel = scope.label || "Selected scope";
    $("playerComparison").innerHTML = `<div class="insights-comparison-caption"><strong>${esc(scopeLabel)}</strong><span>${esc(selected.length)} player${selected.length===1?"":"s"} selected</span></div>${comparisonMetrics(selected)}`;
  }
  async function loadPlayerAnalytics(scopeValue) {
    if (!state?.access?.hasDetailedAnalytics) return;
    const scope = parseScope(scopeValue || $("playerScopeSelect").value || "season");
    $("playerAnalyticsLoading").hidden = false;
    $("playerComparison").innerHTML = "";
    try {
      const {data,error} = await backend.client.rpc("live_team_player_insights_v1", {
        target_team_id: state.team.id,
        requested_season: state.selectedSeason || null,
        requested_scope: scope.type,
        requested_scope_id: scope.id || null
      });
      if (error) throw error;
      playerScopeData = data || {players:[]};
      comparisonPlayerIds = [];
      refreshComparisonControls();
    } catch (error) {
      playerScopeData = null;
      $("playerComparison").innerHTML = `<p class="insights-empty">Player analytics could not be loaded for this scope. ${esc(error?.message || "")}</p>`;
    } finally {
      $("playerAnalyticsLoading").hidden = true;
    }
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
    renderPlayerScopeOptions();
    $("seriesCards").querySelectorAll("[data-series-id]").forEach(button => button.addEventListener("click", () => {
      const found = series.find(row => String(row.seriesId) === String(button.dataset.seriesId));
      renderSeriesSelection(found || null);
    }));
    $("clearSeries").onclick = () => renderSeriesSelection(null);
  }
  function render(data) {
    state = data || {};
    const team = state.team || {}, access = state.access || {};
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
  async function load(season, preferredScope) {
    const params = new URLSearchParams(location.search);
    const teamId = params.get("team");
    if (!teamId) throw new Error("Team not found");
    const {data,error} = await backend.client.rpc("live_team_insights_overview_v1", {target_team_id:teamId,requested_season:season || null});
    if (error) throw error;
    render(data || {});
    await loadCommerceStatus();
    if (state?.access?.hasDetailedAnalytics) {
      let scopeValue = preferredScope || "season";
      const validValues = new Set(Array.from($("playerScopeSelect").options).map(o => o.value));
      if (!validValues.has(scopeValue)) scopeValue = "season";
      $("playerScopeSelect").value = scopeValue;
      await loadPlayerAnalytics(scopeValue);
    }
  }
  function bindPlayerControls() {
    $("playerScopeSelect").addEventListener("change", async () => {
      comparisonPlayerIds = [];
      await loadPlayerAnalytics($("playerScopeSelect").value);
    });
    $("primaryPlayerSelect").addEventListener("change", () => {
      comparisonPlayerIds = comparisonPlayerIds.filter(id => String(id) !== String($("primaryPlayerSelect").value));
      refreshComparisonControls();
    });
    $("addComparisonPlayer").addEventListener("click", () => {
      const id = $("comparisonPlayerSelect").value;
      if (!id || comparisonPlayerIds.length >= 3 || comparisonPlayerIds.includes(id)) return;
      comparisonPlayerIds.push(id);
      refreshComparisonControls();
    });
  }
  async function init() {
    try {
      if (!window.WPILiveBackend?.isConfigured(config)) throw new Error("WPI Live is not configured.");
      backend = await window.WPILiveBackend.connect(config);
      const session = await backend.waitForHealthySession();
      if (!session) { location.replace(`live-login.html?return=${encodeURIComponent(location.href)}`); return; }
      bindPlayerControls();
      $("monthlyPlanButton")?.addEventListener("click", () => setPlan("monthly"));
      $("annualPlanButton")?.addEventListener("click", () => setPlan("annual"));
      const params = new URLSearchParams(location.search);
      const gameId = params.get("game");
      await load(params.get("season"), gameId ? `game:${gameId}` : "season");
      if (params.get("billing") === "success") {
        const target = $("subscriptionStatusText") || $("upgradeStatus");
        if (target) target.textContent = "Payment completed. Team Insights activates after the signed Stripe confirmation is processed.";
      } else if (params.get("billing") === "cancel") {
        $("upgradeStatus").textContent = "Checkout canceled. Nothing was charged.";
      }
      $("seasonSelect").addEventListener("change", async () => {
        try {
          $("insightsLoading").hidden = false;
          selectedSeriesId = null;
          comparisonPlayerIds = [];
          await load($("seasonSelect").value, "season");
        } catch (e) { renderError(e); }
      });
    } catch (error) { renderError(error); }
  }
  $("insightsSignOut")?.addEventListener("click", async () => { try { if (backend) await backend.signOut(); } finally { location.replace("live-login.html"); } });
  init();
})();
