(function () {
  "use strict";
  const data = window.CPI_TOURNAMENT_OPERATIONS || { counts: {}, events: [], divisions: [], alerts: [] };
  const $ = (selector) => document.querySelector(selector);
  const rowsRoot = $("#opsRows");
  const eventSelect = $("#opsEvent");
  const modeSelect = $("#opsMode");
  const statusSelect = $("#opsStatus");
  const ageSelect = $("#opsAge");
  const searchInput = $("#opsSearch");

  const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  function formatDate(value) {
    if (!value) return "Not verified";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }
  const statusLabel = (value) => ({ ready: "Ready", attention: "Attention", blocking: "Blocking", historical: "Historical / registered", archive_pending: "Archive pending", archived: "Archived", archive_attention: "Archive review" })[value] || value;
  const phaseLabel = (value) => ({ pre_tournament: "Pre-tournament", awaiting_results: "Awaiting results", in_progress: "In progress", complete: "Complete", schedule_banked: "Schedule banked", past_due_no_results: "Past date · no results", historical: "Historical", archive_pending: "Archive pending", archive_complete: "Archive banked", unbanked: "Unbanked" })[value] || value || "Unknown";

  function renderSummary() {
    const c = data.counts || {};
    $("#opsGenerated").textContent = formatDate(data.generatedAt);
    $("#opsOverall").textContent = c.blocking ? `${c.blocking} live division${c.blocking === 1 ? "" : "s"} blocked` : c.attention ? `${c.attention} live division${c.attention === 1 ? "" : "s"} need attention` : "All live JO divisions ready";
    $("#opsStats").innerHTML = [
      ["Live divisions", c.liveDivisions || 0],
      ["Ready", c.ready || 0],
      ["Archive banked", c.archiveBankedDivisions || 0],
      ["Archive pending", c.archivePendingDivisions || 0],
      ["Scheduled", c.scheduledGames || 0],
      ["Completed", c.completedGames || 0],
    ].map(([label, value]) => `<article><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`).join("");
    const alerts = data.alerts || [];
    const hasBlocking = alerts.some((item) => item.severity === "blocking");
    $("#opsAlertBanner").innerHTML = `<article class="${hasBlocking ? "is-blocking" : alerts.length ? "is-alert" : ""}"><strong>${alerts.length ? `${alerts.length} operational alert${alerts.length === 1 ? "" : "s"}` : "No live operational alerts"}</strong><span>${alerts.length ? "Filter to Attention or Blocking for details." : "Both JO weekends have verified schedules, readable public pages, and reconciled score states."}</span></article>`;
  }

  function renderEvents() {
    $("#opsEvents").innerHTML = (data.events || []).map((event) => {
      const live = event.monitoringMode === "live";
      const archive = event.monitoringMode === "archive";
      const summary = live ? `${event.ready} ready · ${event.attention} attention · ${event.blocking} blocking` : archive ? `${event.archived || 0} archived · ${event.archivePending || 0} pending · ${event.archiveAttention || 0} review` : `${event.divisionCount} divisions registered for future onboarding`;
      const badge = live ? "Live" : archive ? "Archive" : "Historical";
      return `<article class="ops-event-card"><header><h3>${esc(event.eventName)}</h3><span class="ops-event-badge ${archive ? "archive" : live ? "" : "historical"}">${badge}</span></header><p>${esc(summary)}</p><p>${esc(event.scheduledGames || 0)} scheduled · ${esc(event.completedGames || 0)} completed</p>${event.publicPath ? `<a href="${esc(event.publicPath)}">Open tournament →</a>` : ""}</article>`;
    }).join("");
  }

  function populateFilters() {
    const events = [...new Map((data.divisions || []).map((item) => [item.eventId, item.eventName])).entries()];
    eventSelect.insertAdjacentHTML("beforeend", events.map(([id, name]) => `<option value="${esc(id)}">${esc(name)}</option>`).join(""));
    const ages = [...new Set((data.divisions || []).map((item) => item.ageGroup).filter(Boolean))].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    ageSelect.insertAdjacentHTML("beforeend", ages.map((age) => `<option value="${esc(age)}">${esc(age)}</option>`).join(""));
  }

  function matches(item) {
    if (eventSelect.value !== "all" && item.eventId !== eventSelect.value) return false;
    if (modeSelect.value !== "all" && item.monitoringMode !== modeSelect.value) return false;
    if (statusSelect.value !== "all" && item.operationalStatus !== statusSelect.value) return false;
    if (ageSelect.value !== "all" && item.ageGroup !== ageSelect.value) return false;
    const query = searchInput.value.trim().toLowerCase();
    if (!query) return true;
    const failed = (item.checks || []).filter((entry) => !entry.passed).map((entry) => `${entry.message} ${entry.detail}`).join(" ");
    return `${item.eventName} ${item.divisionLabel} ${item.ageGroup} ${item.gender} ${item.division} ${item.source?.provider || ""} ${item.source?.sheetName || ""} ${failed}`.toLowerCase().includes(query);
  }

  function renderRows() {
    const rows = (data.divisions || []).filter(matches);
    $("#opsCount").textContent = `${rows.length} shown`;
    rowsRoot.innerHTML = rows.length ? rows.map((item) => {
      const schedule = item.schedule || {};
      const source = item.source || {};
      const page = item.publicPage || {};
      const failures = (item.checks || []).filter((entry) => !entry.passed && ["blocking", "warning"].includes(entry.severity));
      const modeText = item.monitoringMode === "live" ? phaseLabel(item.phase) : item.monitoringMode === "archive" ? phaseLabel(item.phase) : "Registered · not monitored yet";
      return `<article class="ops-row is-${esc(item.operationalStatus)}" role="row">
        <div role="cell"><span>${esc(item.eventName)}</span><strong>${esc(item.divisionLabel)}</strong><em>${esc(modeText)}</em></div>
        <div role="cell"><strong>${esc(schedule.games || 0)} games${schedule.expectedGames ? ` / ${esc(schedule.expectedGames)} expected` : ""}</strong><span>${esc(schedule.scheduledGames || 0)} scheduled · ${esc(schedule.completedGames || 0)} completed</span>${schedule.partialScores ? `<em>${esc(schedule.partialScores)} partial score${schedule.partialScores === 1 ? "" : "s"}</em>` : ""}</div>
        <div role="cell"><strong>${esc(source.provider || "Registered source")}</strong><span>${esc(source.sheetName || source.mode || "Not yet onboarded")}</span><em>${item.monitoringMode === "live" ? `Verified ${esc(formatDate(source.lastSuccessfulAt))}` : item.monitoringMode === "archive" ? (source.lastSuccessfulAt ? `Archived ${esc(formatDate(source.lastSuccessfulAt))}` : "Awaiting first archive sync") : "Historical source registration"}</em>${source.url ? `<a href="${esc(source.url)}" target="_blank" rel="noopener">Open source</a>` : ""}</div>
        <div role="cell"><strong>${page.localStatus === "ready" ? "Page ready" : "Page issue"}</strong><span>${page.networkChecked ? (page.networkStatus === "ready" ? "Published page reachable" : "Published page check failed") : "Local wiring verified"}</span>${item.eventPublicPath ? `<a href="${esc(item.eventPublicPath)}">Open page</a>` : ""}</div>
        <div role="cell"><b class="ops-status-pill">${esc(statusLabel(item.operationalStatus))}</b>${failures.length ? `<div class="ops-issue-list">${failures.slice(0, 3).map((entry) => `<small>${esc(entry.detail || entry.message)}</small>`).join("")}</div>` : `<small>${esc(schedule.reviewItems || 0)} identity review item${Number(schedule.reviewItems || 0) === 1 ? "" : "s"}</small>`}</div>
      </article>`;
    }).join("") : `<p class="ops-empty">No tournament divisions match these filters.</p>`;
  }

  renderSummary();
  renderEvents();
  populateFilters();
  [eventSelect, modeSelect, statusSelect, ageSelect].forEach((element) => element.addEventListener("change", renderRows));
  searchInput.addEventListener("input", renderRows);
  renderRows();
})();
