(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const config = window.WPI_LIVE_SANDBOX_CONFIG || {};
  let backend = null;
  let state = null;
  let selectedSeriesId = null;
  let playerScopeData = null;
  let comparisonPlayerIds = [];
  let selectedPlayerIds = [];
  let playerDirectory = new Map();
  let playerScopeMode = "season";
  let commerceState = null;
  let selectedBillingInterval = "annual";
  let isPlatformOwner = false;
  const livePlayerStatsExperienceRelease = "7.64.14";

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
  function playerStorageKey() {
    return `wpi-player-compare:${state?.team?.id || "team"}:${state?.selectedSeason || state?.team?.competitiveSeason || "season"}`;
  }
  function restorePlayerSelection() {
    try {
      const raw = JSON.parse(localStorage.getItem(playerStorageKey()) || "[]");
      if (Array.isArray(raw)) selectedPlayerIds = raw.map(String).filter(Boolean).slice(0,4);
    } catch (_) { selectedPlayerIds = []; }
  }
  function persistPlayerSelection() {
    try { localStorage.setItem(playerStorageKey(), JSON.stringify(selectedPlayerIds.slice(0,4))); } catch (_) {}
  }
  function renderPlayerScopeOptions() {
    const season = state.selectedSeason || state.team?.competitiveSeason || "Current season";
    const series = Array.isArray(state.seriesSummaries) ? state.seriesSummaries : [];
    const games = Array.isArray(state.games) ? state.games : [];
    const seriesOptions = series.map(s => `<option value="${esc(s.seriesId)}">${esc(s.name || "Event")} · ${esc(s.wins||0)}-${esc(s.losses||0)}${s.ties?`-${esc(s.ties)}`:""}</option>`).join("");
    const gameOptions = games.map(g => `<option value="${esc(g.gameId)}">${esc(resultLabel(g))} · ${esc(g.opponentName || "Opponent")} · ${esc(dateLabel(g.endedAt || g.scheduledAt))}</option>`).join("");
    $("playerSeriesSelect").innerHTML = seriesOptions || '<option value="">No events yet</option>';
    $("playerGameSelect").innerHTML = gameOptions || '<option value="">No finalized games yet</option>';
    $("playerScopeSelect").innerHTML = `<option value="season">Season · ${esc(season)}</option>${series.map(s => `<option value="series:${esc(s.seriesId)}">Event · ${esc(s.name || "Event")}</option>`).join("")}${games.map(g => `<option value="game:${esc(g.gameId)}">Game · vs ${esc(g.opponentName || "Opponent")}</option>`).join("")}`;
    updateScopeUi();
  }
  function parseScope(value) {
    const raw = String(value || "season");
    if (!raw.includes(":")) return {type:"season", id:null};
    const [type,id] = raw.split(":",2);
    return {type:["series","game"].includes(type) ? type : "season", id:id || null};
  }
  function currentScopeValue() {
    if (playerScopeMode === "series") return `series:${$("playerSeriesSelect").value || ""}`;
    if (playerScopeMode === "game") return `game:${$("playerGameSelect").value || ""}`;
    return "season";
  }
  function updateScopeUi() {
    $("playerScopeTabs").querySelectorAll("[data-player-scope-mode]").forEach(button => button.classList.toggle("is-active", button.dataset.playerScopeMode === playerScopeMode));
    $("playerSeriesWrap").hidden = playerScopeMode !== "series";
    $("playerGameWrap").hidden = playerScopeMode !== "game";
  }
  function metricSections() {
    return [
      ["Overview", [["Games played",p=>p.games||0],["Goals",p=>p.goals||0],["Assists",p=>p.assists||0],["Goals / game",p=>perGame(p.goals,p.games)]]],
      ["Shooting", [["Shots",p=>p.shots||0],["Shooting %",p=>pct(p.goals,p.shots)],["Saved",p=>p.shotsSaved||0],["Blocked",p=>p.shotsBlocked||0],["Post",p=>p.shotsPost||0],["Missed",p=>p.shotsMissed||0]]],
      ["Defense", [["Steals",p=>p.steals||0],["Field blocks",p=>p.fieldBlocks||0],["Saves",p=>p.saves||0]]],
      ["Possession", [["Turnovers",p=>p.turnovers||0]]],
      ["Draws & fouls", [["Exclusions drawn",p=>p.exclusionsDrawn||0],["Exclusions committed",p=>p.exclusionsCommitted||0],["5m drawn",p=>p.fiveMetersDrawn||0],["5m committed",p=>p.fiveMetersCommitted||0]]],
      ["Shootout", [["Shootout goals",p=>p.shootoutGoals||0],["Shootout misses",p=>p.shootoutMisses||0]]]
    ];
  }
  function totalRecordedStats(p) {
    return ["goals","assists","shots","saves","fieldBlocks","steals","turnovers","exclusionsDrawn","exclusionsCommitted","fiveMetersDrawn","fiveMetersCommitted","shootoutGoals","shootoutMisses"].reduce((sum,key)=>sum+Number(p?.[key]||0),0);
  }
  function scopedPlayer(id) {
    const scopePlayers = Array.isArray(playerScopeData?.players) ? playerScopeData.players : [];
    const found = scopePlayers.find(p => String(p.playerId) === String(id));
    if (found) return {...playerDirectory.get(String(id)),...found,scopeMissing:false};
    const base = playerDirectory.get(String(id));
    if (!base) return null;
    return {...base,games:0,goals:0,assists:0,shots:0,shotsMissed:0,shotsPost:0,shotsBlocked:0,shotsSaved:0,shootoutGoals:0,shootoutMisses:0,saves:0,fieldBlocks:0,steals:0,turnovers:0,exclusionsDrawn:0,exclusionsCommitted:0,fiveMetersDrawn:0,fiveMetersCommitted:0,scopeMissing:true};
  }
  function participationText(p) {
    const scopeType = playerScopeData?.scope?.type || playerScopeMode;
    if (scopeType === "game" && p.scopeMissing) return "DNP";
    if (scopeType === "game" && Number(p.games||0) > 0 && totalRecordedStats(p) === 0) return "Played · 0 recorded stats";
    const games = Number(p.games||0);
    return `${games} game${games===1?"":"s"} played`;
  }
  function playerPickerLabel(p) {
    const cap = p?.cap ? `#${p.cap}` : "—";
    return `<span class="insights-player-cap">${esc(cap)}</span><span class="insights-player-pick-text"><strong>${esc(p?.name || "Player")}</strong><small>${esc(p?.cap ? `Cap ${p.cap}` : "No cap")}</small></span>`;
  }
  function renderPlayerPicker() {
    const query = String($("playerSearchInput").value || "").trim().toLowerCase();
    const all = Array.from(playerDirectory.values()).filter(p => !query || `${p.name||""} ${p.cap||""}`.toLowerCase().includes(query));
    $("playerSelectionCount").textContent = `${selectedPlayerIds.length} selected`;
    $("clearPlayerSelection").hidden = selectedPlayerIds.length === 0;
    $("playerPicker").innerHTML = all.length ? all.map(p => {
      const id=String(p.playerId||""); const selected=selectedPlayerIds.includes(id); const maxed=selectedPlayerIds.length>=4 && !selected;
      return `<button type="button" class="insights-player-pick${selected?" is-selected":""}" data-player-pick="${esc(id)}" aria-pressed="${selected?"true":"false"}"${maxed?" disabled":""}>${playerPickerLabel(p)}</button>`;
    }).join("") : '<p class="insights-empty">No players match that search.</p>';
    $("playerPicker").querySelectorAll("[data-player-pick]").forEach(button => button.addEventListener("click",()=>togglePlayer(button.dataset.playerPick)));
  }
  function togglePlayer(id) {
    id=String(id||""); if(!id) return;
    if(selectedPlayerIds.includes(id)) selectedPlayerIds=selectedPlayerIds.filter(x=>x!==id);
    else if(selectedPlayerIds.length<4) selectedPlayerIds.push(id);
    persistPlayerSelection();
    syncLegacyPlayerControls();
    renderPlayerPicker();
    renderPlayerComparison();
  }
  function syncLegacyPlayerControls() {
    const all=Array.from(playerDirectory.values());
    const primary=selectedPlayerIds[0] || String(all[0]?.playerId||"");
    comparisonPlayerIds=selectedPlayerIds.slice(1,4);
    $("primaryPlayerSelect").innerHTML=all.map(p=>`<option value="${esc(p.playerId)}"${String(p.playerId)===primary?" selected":""}>${esc(playerLabel(p))}</option>`).join("");
    $("comparisonPlayerSelect").innerHTML=all.filter(p=>!selectedPlayerIds.includes(String(p.playerId))).map(p=>`<option value="${esc(p.playerId)}">${esc(playerLabel(p))}</option>`).join("");
    $("addComparisonPlayer").disabled=selectedPlayerIds.length>=4;
  }
  function playerCards(players) {
    return `<div class="insights-player-selected-cards">${players.map(p=>{
      const status=participationText(p); const dnp=status==="DNP";
      return `<article class="insights-player-card"><button class="insights-player-card-remove" type="button" data-remove-selected="${esc(p.playerId)}" aria-label="Remove ${esc(p.name||"player")}">×</button><div class="insights-player-card-head"><span class="insights-player-cap">${esc(p.cap?`#${p.cap}`:"—")}</span><div><h3>${esc(p.name||"Player")}</h3><p>${esc(Number(p.games||0)===1?"1 game played":`${Number(p.games||0)} games played`)}</p></div></div><span class="insights-player-card-status${dnp?" is-dnp":""}">${esc(status)}</span><div class="insights-player-card-metrics"><div><strong>${esc(p.goals||0)}</strong><span>Goals</span></div><div><strong>${esc(p.assists||0)}</strong><span>Assists</span></div><div><strong>${esc(p.shots||0)}</strong><span>Shots</span></div><div><strong>${esc(pct(p.goals,p.shots))}</strong><span>Shooting</span></div><div><strong>${esc(p.steals||0)}</strong><span>Steals</span></div><div><strong>${esc(p.turnovers||0)}</strong><span>Turnovers</span></div><div><strong>${esc(p.exclusionsDrawn||0)}</strong><span>Excl. drawn</span></div><div><strong>${esc(p.exclusionsCommitted||0)}</strong><span>Excl. comm.</span></div></div></article>`;
    }).join("")}</div>`;
  }
  function comparisonMetrics(players) {
    const sections=metricSections();
    const desktop=`<div class="insights-comparison-desktop">${sections.map(([title,rows])=>`<section class="insights-stat-section"><h3>${esc(title)}</h3><table><thead><tr><th>Stat</th>${players.map(p=>`<th>${esc(p.cap?`#${p.cap} ${p.name||"Player"}`:(p.name||"Player"))}</th>`).join("")}</tr></thead><tbody>${rows.map(([label,getter])=>`<tr><th>${esc(label)}</th>${players.map(p=>`<td>${esc(getter(p))}</td>`).join("")}</tr>`).join("")}</tbody></table></section>`).join("")}</div>`;
    const mobile=`<div class="insights-comparison-mobile">${sections.map(([title,rows])=>`<section class="insights-mobile-compare-section"><h3>${esc(title)}</h3>${rows.map(([label,getter])=>`<div class="insights-mobile-metric"><strong>${esc(label)}</strong><div class="insights-mobile-values">${players.map(p=>`<span class="insights-mobile-value"><b>${esc(p.cap?`#${p.cap}`:(p.name||"P").slice(0,8))}</b><span>${esc(getter(p))}</span></span>`).join("")}</div></div>`).join("")}</section>`).join("")}</div>`;
    return desktop+mobile;
  }
  function renderPlayerComparison() {
    const selected=selectedPlayerIds.map(scopedPlayer).filter(Boolean);
    if(!selected.length){$("playerComparison").innerHTML='<p class="insights-empty">Select up to four players to compare.</p>';return;}
    const scopeLabel=playerScopeData?.scope?.label || (playerScopeMode==="season"?`${state?.selectedSeason||"Season"} season`:"Selected scope");
    $("playerComparison").innerHTML=`<div class="insights-comparison-caption"><strong>${esc(scopeLabel)}</strong><span>${esc(selected.length)} player${selected.length===1?"":"s"} selected</span></div>${playerCards(selected)}${comparisonMetrics(selected)}`;
    $("playerComparison").querySelectorAll("[data-remove-selected]").forEach(button=>button.addEventListener("click",()=>togglePlayer(button.dataset.removeSelected)));
  }
  function refreshComparisonControls() {
    syncLegacyPlayerControls();
    renderPlayerPicker();
    renderPlayerComparison();
  }
  async function fetchPlayerAnalytics(scopeValue) {
    const scope=parseScope(scopeValue);
    const {data,error}=await backend.client.rpc("live_team_player_insights_v1",{target_team_id:state.team.id,requested_season:state.selectedSeason||null,requested_scope:scope.type,requested_scope_id:scope.id||null});
    if(error) throw error;
    return data || {players:[]};
  }
  async function loadPlayerAnalytics(scopeValue, options={}) {
    if(!state?.access?.hasDetailedAnalytics) return;
    $("playerAnalyticsLoading").hidden=false;
    try{
      const requested=scopeValue || currentScopeValue();
      playerScopeData=await fetchPlayerAnalytics(requested);
      if(playerScopeData?.scope?.type==="season" || !playerDirectory.size){
        (playerScopeData?.players||[]).forEach(p=>playerDirectory.set(String(p.playerId),p));
      }
      (playerScopeData?.players||[]).forEach(p=>{
        const id=String(p.playerId||""); if(id) playerDirectory.set(id,{...(playerDirectory.get(id)||{}),...p});
      });
      if(!options.skipSelectionInit && !selectedPlayerIds.length){
        restorePlayerSelection();
        selectedPlayerIds=selectedPlayerIds.filter(id=>playerDirectory.has(String(id))).slice(0,4);
        if(!selectedPlayerIds.length){const first=Array.from(playerDirectory.keys())[0];if(first)selectedPlayerIds=[first];}
      }
      persistPlayerSelection();
      refreshComparisonControls();
    }catch(error){playerScopeData=null;$("playerComparison").innerHTML=`<p class="insights-empty">Player stats could not be loaded for this scope. ${esc(error?.message||"")}</p>`;}
    finally{$("playerAnalyticsLoading").hidden=true;}
  }
  async function setPlayerScopeMode(mode, preferredId=null) {
    playerScopeMode=["season","series","game"].includes(mode)?mode:"season";
    if(playerScopeMode==="series" && preferredId && Array.from($("playerSeriesSelect").options).some(o=>String(o.value)===String(preferredId))) $("playerSeriesSelect").value=preferredId;
    if(playerScopeMode==="game" && preferredId && Array.from($("playerGameSelect").options).some(o=>String(o.value)===String(preferredId))) $("playerGameSelect").value=preferredId;
    updateScopeUi();
    const value=currentScopeValue();
    $("playerScopeSelect").value=value;
    if((playerScopeMode==="series" || playerScopeMode==="game") && !parseScope(value).id){
      playerScopeData={scope:{type:playerScopeMode,label:"No data"},players:[]};refreshComparisonControls();return;
    }
    await loadPlayerAnalytics(value,{skipSelectionInit:true});
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
    if ($("organizationInsightsLink")) {
      $("organizationInsightsLink").href = `live-organization-insights.html?organization=${encodeURIComponent(team.organizationId || "")}`;
      $("organizationInsightsLink").hidden = access.analyticsLevel !== "organization_insights";
    }
    if ($("teamInsightsCommercialLink")) $("teamInsightsCommercialLink").hidden = !isPlatformOwner;

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
      playerDirectory = new Map();
      playerScopeMode = "season";
      await loadPlayerAnalytics("season");
      const preferred = parseScope(preferredScope || "season");
      if (preferred.type !== "season") await setPlayerScopeMode(preferred.type, preferred.id);
    }
  }
  function bindPlayerControls() {
    $("playerScopeTabs").querySelectorAll("[data-player-scope-mode]").forEach(button=>button.addEventListener("click",()=>setPlayerScopeMode(button.dataset.playerScopeMode)));
    $("playerSeriesSelect").addEventListener("change",()=>setPlayerScopeMode("series",$("playerSeriesSelect").value));
    $("playerGameSelect").addEventListener("change",()=>setPlayerScopeMode("game",$("playerGameSelect").value));
    $("playerSearchInput").addEventListener("input",renderPlayerPicker);
    $("clearPlayerSelection").addEventListener("click",()=>{selectedPlayerIds=[];persistPlayerSelection();refreshComparisonControls();});
    // Legacy controls remain functional for regression compatibility.
    $("playerScopeSelect").addEventListener("change",async()=>{
      const scope=parseScope($("playerScopeSelect").value); await setPlayerScopeMode(scope.type,scope.id);
    });
    $("primaryPlayerSelect").addEventListener("change",()=>{const id=String($("primaryPlayerSelect").value||"");selectedPlayerIds=[id,...selectedPlayerIds.filter(x=>x!==id)].filter(Boolean).slice(0,4);persistPlayerSelection();refreshComparisonControls();});
    $("addComparisonPlayer").addEventListener("click",()=>{const id=$("comparisonPlayerSelect").value;if(id&&!selectedPlayerIds.includes(id)&&selectedPlayerIds.length<4){selectedPlayerIds.push(id);persistPlayerSelection();refreshComparisonControls();}});
  }
  async function init() {
    try {
      if (!window.WPILiveBackend?.isConfigured(config)) throw new Error("WPI Live is not configured.");
      backend = await window.WPILiveBackend.connect(config);
      const session = await backend.waitForHealthySession();
      if (!session) { location.replace(`live-login.html?return=${encodeURIComponent(location.href)}`); return; }
      const {data:platformOwnerData} = await backend.client.rpc("live_is_platform_owner");
      isPlatformOwner = platformOwnerData === true;
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
          selectedPlayerIds = [];
          comparisonPlayerIds = [];
          await load($("seasonSelect").value, "season");
        } catch (e) { renderError(e); }
      });
    } catch (error) { renderError(error); }
  }
  $("insightsSignOut")?.addEventListener("click", async () => { try { if (backend) await backend.signOut(); } finally { location.replace("live-login.html"); } });
  init();
})();
