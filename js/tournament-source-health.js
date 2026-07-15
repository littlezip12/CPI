(function () {
  const data = window.CPI_TOURNAMENT_SOURCE_HEALTH || { counts: {}, sources: [] };
  const rowsRoot = document.querySelector("#sourceHealthRows");
  const eventSelect = document.querySelector("#healthEvent");
  const statusSelect = document.querySelector("#healthStatus");
  const phaseSelect = document.querySelector("#healthPhase");
  const searchInput = document.querySelector("#healthSearch");

  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function formatDate(value) {
    if (!value) return "Never banked";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  function phaseLabel(value) {
    return ({
      pre_tournament: "Pre-tournament",
      awaiting_results: "Awaiting results",
      in_progress: "In progress",
      complete: "Complete",
      past_due_no_results: "Past date · no results",
      schedule_banked: "Schedule banked",
      unbanked: "Unbanked",
    })[value] || value || "Unknown";
  }

  function healthLabel(value) {
    return ({ current: "Current", stale: "Stale snapshot", unbanked: "Not banked", error: "Source error", blocked: "Blocked" })[value] || value;
  }

  function renderStats() {
    const counts = data.counts || {};
    document.querySelector("#sourceHealthStats").innerHTML = [
      ["JO divisions", counts.joSources || 0],
      ["Banked divisions", counts.bankedDatasets || 0],
      ["Scheduled games", counts.scheduledGames || 0],
      ["Completed games", counts.completedGames || 0],
      ["Stale / errors", Number(counts.stale || 0) + Number(counts.error || 0) + Number(counts.blocked || 0)],
    ].map(([label, value]) => `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join("");
    document.querySelector("#healthGenerated").textContent = formatDate(data.generatedAt);
    document.querySelector("#healthPolicy").textContent = data.policy || document.querySelector("#healthPolicy").textContent;
  }

  function populateEvents() {
    const events = [...new Map((data.sources || []).map((item) => [item.eventId, item.eventName])).entries()];
    eventSelect.insertAdjacentHTML("beforeend", events.map(([id, name]) => `<option value="${escapeHtml(id)}">${escapeHtml(name)}</option>`).join(""));
  }

  function matches(item) {
    if (eventSelect.value !== "all" && item.eventId !== eventSelect.value) return false;
    if (statusSelect.value !== "all" && item.healthStatus !== statusSelect.value) return false;
    if (phaseSelect.value !== "all" && item.phase !== phaseSelect.value) return false;
    const query = searchInput.value.trim().toLowerCase();
    if (!query) return true;
    const source = item.source || {};
    return `${item.eventName} ${item.divisionLabel} ${item.ageGroup} ${item.gender} ${item.division} ${source.provider} ${source.sheetName || ""}`.toLowerCase().includes(query);
  }

  function renderRows() {
    const items = (data.sources || []).filter(matches);
    document.querySelector("#healthCount").textContent = `${items.length} shown`;
    rowsRoot.innerHTML = items.length ? items.map((item) => {
      const schedule = item.schedule || {};
      const source = item.source || {};
      const issue = source.error || source.warning;
      return `<article class="source-health-row is-${escapeHtml(item.healthStatus)}" role="row">
        <div role="cell"><span>${escapeHtml(item.eventName)}</span><strong>${escapeHtml(item.divisionLabel)}</strong><em>${escapeHtml(phaseLabel(item.phase))}</em></div>
        <div role="cell"><span>${escapeHtml(source.provider || "Registered source")}</span><strong>${escapeHtml(source.sheetName || `GID ${source.gid || "—"}`)}</strong>${source.url ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener">Open official source</a>` : ""}</div>
        <div role="cell"><strong>${escapeHtml(schedule.games || 0)} games</strong><span>${escapeHtml(schedule.scheduledGames || 0)} scheduled · ${escapeHtml(schedule.completedGames || 0)} completed</span>${schedule.zeroZeroPlaceholders ? `<em>${escapeHtml(schedule.zeroZeroPlaceholders)} blank 0–0 placeholder${schedule.zeroZeroPlaceholders === 1 ? "" : "s"}</em>` : ""}</div>
        <div role="cell"><strong>${escapeHtml(formatDate(source.lastSuccessfulAt))}</strong><span>${source.ageHours == null ? "No successful snapshot" : `${escapeHtml(source.ageHours)} hours old`}</span>${source.lastAttemptAt ? `<em>Checked ${escapeHtml(formatDate(source.lastAttemptAt))}</em>` : ""}</div>
        <div role="cell"><b class="health-pill">${escapeHtml(healthLabel(item.healthStatus))}</b>${issue ? `<small title="${escapeHtml(issue)}">${escapeHtml(issue)}</small>` : `<small>${schedule.reviewItems || 0} identity review item${Number(schedule.reviewItems || 0) === 1 ? "" : "s"}</small>`}</div>
      </article>`;
    }).join("") : `<p class="source-health-empty">No registered divisions match these filters.</p>`;
  }

  renderStats();
  populateEvents();
  [eventSelect, statusSelect, phaseSelect].forEach((element) => element.addEventListener("change", renderRows));
  searchInput.addEventListener("input", renderRows);
  renderRows();
})();
