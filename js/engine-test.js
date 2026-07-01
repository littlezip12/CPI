
(function () {
  const api = window.CPI_API;

  const $ = (id) => document.getElementById(id);

  function setStatus(ok, message, submessage) {
    const card = $("connectionStatus");
    const dot = card.querySelector(".status-dot");
    dot.className = "status-dot " + (ok ? "connected" : "error");
    card.querySelector("h2").textContent = message;
    card.querySelector("p").textContent = submessage;
  }

  function num(value) {
    if (value === undefined || value === null) return "—";
    return Number(value).toLocaleString();
  }

  function renderMetrics(api) {
    const counts = api.manifest?.counts || {};
    const season = api.seasons?.[0] || {};
    const metrics = [
      ["Season", season.season_id || "—"],
      ["Organizations", counts.organizations],
      ["Teams", counts.teams],
      ["Events", counts.events],
      ["Rankings", counts.rankings],
    ];

    $("metricGrid").innerHTML = metrics.map(([label, value]) => `
      <article class="metric-card">
        <strong>${num(value)}</strong>
        <span>${label}</span>
      </article>
    `).join("");
  }

  function renderRankings(api) {
    const rows = (api.rankingsCurrent || []).slice(0, 12);
    const snapshot = api.seasons?.[0]?.current_ranking_label || api.manifest?.scope?.season || "Current";
    $("snapshotLabel").textContent = snapshot;

    $("rankingTable").innerHTML = rows.map(r => `
      <tr>
        <td>#${r.rank ?? "—"}</td>
        <td>${r.team || "—"}</td>
        <td>${r.record || "—"}</td>
        <td>${r.cpi_score ?? "—"}</td>
        <td>${r.power_rating ?? "—"}</td>
      </tr>
    `).join("");
  }

  function renderEvents(api) {
    const events = (api.events || []).slice(0, 8);
    $("eventCount").textContent = `${api.events?.length || 0} events`;

    $("eventsList").innerHTML = events.map(e => `
      <div class="list-item">
        <div>
          <div class="list-title">${e.name || "Unnamed event"}</div>
          <div class="list-sub">${e.date_label || ""} · ${e.region || ""}</div>
        </div>
        <div class="list-badge">${e.event_type || "event"}</div>
      </div>
    `).join("");
  }

  function renderSearch(api) {
    const search = (api.search || []).slice(0, 10);
    $("searchCount").textContent = `${api.search?.length || 0} records`;

    $("searchList").innerHTML = search.map(s => `
      <div class="list-item">
        <div>
          <div class="list-title">${s.title || "Untitled"}</div>
          <div class="list-sub">${s.subtitle || s.type || ""}</div>
        </div>
        <div class="list-badge">${s.type || "item"}</div>
      </div>
    `).join("");
  }

  function renderDebug(api) {
    const debug = {
      connected: !!api,
      apiVersion: api.manifest?.api_version,
      generatedAt: api.manifest?.generated_at,
      dataStatus: api.manifest?.data_status,
      counts: api.manifest?.counts,
      currentSnapshot: api.seasons?.[0]?.current_ranking_label,
      warning: api.manifest?.warning
    };
    $("debugOutput").textContent = JSON.stringify(debug, null, 2);
  }

  function init() {
    if (!api) {
      setStatus(false, "Engine not connected", "Could not find window.CPI_API. Check that data/cpi_api_bundle.js exists.");
      $("debugOutput").textContent = "window.CPI_API is missing.";
      return;
    }

    setStatus(true, "Engine connected", "CPI API bundle loaded successfully.");
    renderMetrics(api);
    renderRankings(api);
    renderEvents(api);
    renderSearch(api);
    renderDebug(api);
  }

  init();
})();
