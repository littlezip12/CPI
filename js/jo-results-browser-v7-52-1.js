(() => {
  "use strict";

  const mount = document.getElementById("joResultsBrowser");
  if (!mount) return;

  const groupSelect = document.getElementById("joResultsGroup");
  const teamSearch = document.getElementById("joResultsSearch");
  const summary = document.getElementById("joResultsSummaryText");
  const clearButton = document.getElementById("joResultsClear");
  const resultsGrid = document.getElementById("joResultsGrid");
  const note = document.getElementById("joResultsNote");

  let payload = null;

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const normalize = (value) => String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  const selectedGroup = () => payload?.groups.find((group) => group.id === groupSelect.value) || payload?.groups[0];

  function updateUrl() {
    const params = new URLSearchParams(window.location.search);
    params.set("results", groupSelect.value);
    const query = teamSearch.value.trim();
    if (query) params.set("team", query);
    else params.delete("team");
    const next = `${window.location.pathname}?${params.toString()}#jo-results`;
    window.history.replaceState({}, "", next);
  }

  function teamRow(team, divisionLabel) {
    const record = team.record ? `<span class="cpi521-record">${escapeHtml(team.record)}</span>` : "";
    const overall = team.overallPlaceLabel
      ? `<span class="cpi521-overall">${escapeHtml(team.overallPlaceLabel)} in ${escapeHtml(divisionLabel)}</span>`
      : "";
    return `<li class="cpi521-team">
      <span class="cpi521-place">${escapeHtml(team.placeLabel || "—")}</span>
      <span class="cpi521-team-name">${escapeHtml(team.team)}${record}</span>
      ${overall}
    </li>`;
  }

  function render() {
    const group = selectedGroup();
    if (!group) return;
    const query = normalize(teamSearch.value);
    let matchCount = 0;
    let visibleDivisions = 0;

    const divisionHtml = group.divisions.map((division) => {
      const subdivisionHtml = division.subdivisions.map((subdivision) => {
        const teams = query
          ? subdivision.teams.filter((team) => normalize(team.team).includes(query))
          : subdivision.teams;
        if (!teams.length) return "";
        matchCount += teams.length;
        return `<section class="cpi521-subdivision" aria-label="${escapeHtml(subdivision.label)} results">
          <header class="cpi521-subdivision-head"><h4>${escapeHtml(subdivision.label)}</h4><span>${teams.length} ${teams.length === 1 ? "team" : "teams"}</span></header>
          <ol class="cpi521-team-list">${teams.map((team) => teamRow(team, division.label)).join("")}</ol>
        </section>`;
      }).filter(Boolean).join("");

      if (!subdivisionHtml) return "";
      visibleDivisions += 1;
      return `<article class="cpi521-division">
        <header class="cpi521-division-head">
          <div><span class="cpi521-tier">${escapeHtml(division.tier)}</span><h3>${escapeHtml(division.label)}</h3></div>
          <span class="cpi521-division-count">${division.teamCount} teams</span>
        </header>
        <div class="cpi521-subdivision-grid">${subdivisionHtml}</div>
      </article>`;
    }).filter(Boolean).join("");

    clearButton.hidden = !query;
    if (query) {
      summary.innerHTML = `<strong>${matchCount}</strong> ${matchCount === 1 ? "match" : "matches"} for “${escapeHtml(teamSearch.value.trim())}” in ${escapeHtml(group.label)}`;
    } else {
      summary.innerHTML = `<strong>${group.teamCount}</strong> final placements across ${group.divisions.length} ${group.divisions.length === 1 ? "division" : "divisions"}`;
    }

    resultsGrid.innerHTML = divisionHtml || `<div class="cpi521-empty"><strong>No team found</strong>Try a shorter club name or check another age group.</div>`;
    note.textContent = payload.notes?.join(" ") || "";
    mount.dataset.ready = "true";
    updateUrl();
  }

  function populate() {
    groupSelect.innerHTML = payload.groups.map((group) =>
      `<option value="${escapeHtml(group.id)}">${escapeHtml(group.label)} — ${group.teamCount} teams</option>`
    ).join("");

    const params = new URLSearchParams(window.location.search);
    const requested = params.get("results");
    groupSelect.value = payload.groups.some((group) => group.id === requested) ? requested : "14u-boys";
    teamSearch.value = params.get("team") || "";
    render();
  }

  groupSelect.addEventListener("change", render);
  teamSearch.addEventListener("input", render);
  clearButton.addEventListener("click", () => {
    teamSearch.value = "";
    teamSearch.focus();
    render();
  });

  fetch("data/tournaments/jo-results-2026.json?v=7.52.1", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((data) => {
      payload = data;
      populate();
    })
    .catch((error) => {
      console.error("Unable to load JO results", error);
      resultsGrid.innerHTML = `<div class="cpi521-empty"><strong>Results could not be loaded</strong>Please refresh the page and try again.</div>`;
      summary.textContent = "Results temporarily unavailable";
    });
})();
