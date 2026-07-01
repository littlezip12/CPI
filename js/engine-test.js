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
    if (value === undefined || value === null || value === "") return "—";
    if (typeof value === "string" && !/^\d+(\.\d+)?$/.test(value)) return value;
    return Number(value).toLocaleString();
  }

  function renderMetrics(api) {
    const counts = api.manifest?.counts || {};
    const season = api.seasons?.[0]?.season_id || api.manifest?.scope?.season || "2026";
    const metrics = [["Season", season],["Organizations", counts.organizations],["Teams", counts.teams],["Games", counts.games],["Events", counts.events]];
    $("metricGrid").innerHTML = metrics.map(([label,value]) => `<article class="metric-card"><strong>${num(value)}</strong><span>${label}</span></article>`).join("");
  }

  function renderQuality(api) {
    const q = api.manifest?.data_quality || {};
    const metrics = [
      ["Normalized rate", (q.normalized_participant_rate ?? "—") + "%"],
      ["Raw entries", q.raw_participant_entries],
      ["Usable entries", q.usable_participant_entries],
      ["Cleaned labels", q.embedded_labels_cleaned],
      ["Unique teams", q.unique_normalized_teams],
    ];
    $("qualityGrid").innerHTML = metrics.map(([label,value]) => `<article class="quality-card"><strong>${num(value)}</strong><span>${label}</span></article>`).join("");
  }

  function renderRankings(api) {
    const rows = (api.rankingsCurrent || []).slice(0, 15);
    $("snapshotLabel").textContent = api.manifest?.current_snapshot || "QA baseline";
    $("rankingTable").innerHTML = rows.map(r => `<tr><td>#${r.rank ?? "—"}</td><td>${r.team || "—"}</td><td>${r.club || "—"}</td><td>${r.record || "—"}</td><td>${r.cpi_score ?? "—"}</td><td><span class="status-pill">QA only</span></td></tr>`).join("");
  }

  function renderEvents(api) {
    const events = (api.events || []).slice(0, 8);
    $("eventCount").textContent = `${api.events?.length || 0} events`;
    $("eventsList").innerHTML = events.map(e => `<div class="list-item"><div><div class="list-title">${e.name || "Unnamed event"}</div><div class="list-sub">${e.date_label || ""} · ${e.game_count || 0} games</div></div><div class="list-badge">${e.event_type || "event"}</div></div>`).join("");
  }

  function renderOrganizations(api) {
    const orgs = (api.organizations || []).slice(0, 10);
    $("orgCount").textContent = `${api.organizations?.length || 0} organizations`;
    $("orgList").innerHTML = orgs.map(o => `<div class="list-item"><div><div class="list-title">${o.display_name || "Unknown"}</div><div class="list-sub">${o.team_count || 0} teams</div></div><div class="list-badge">${o.type || "club"}</div></div>`).join("");
  }

  function renderDebug(api) {
    $("debugOutput").textContent = JSON.stringify({
      connected: !!api,
      apiVersion: api.manifest?.api_version,
      generatedAt: api.manifest?.generated_at,
      dataStatus: api.manifest?.data_status,
      counts: api.manifest?.counts,
      dataQuality: api.manifest?.data_quality,
      rankingWarning: api.manifest?.ranking_warning
    }, null, 2);
  }

  function init() {
    if (!api) {
      setStatus(false, "Engine not connected", "Could not find window.CPI_API. Check that data/cpi_api_bundle.js exists.");
      $("debugOutput").textContent = "window.CPI_API is missing.";
      return;
    }
    setStatus(true, "Engine connected", "CPI API bundle loaded successfully.");
    renderMetrics(api); renderQuality(api); renderRankings(api); renderEvents(api); renderOrganizations(api); renderDebug(api);
  }
  init();
})();