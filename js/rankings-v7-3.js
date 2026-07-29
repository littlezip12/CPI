/* Release 7.3 — Rankings Redesign */
(function () {
  const rankings = Array.isArray(window.CPI_RANKINGS) ? window.CPI_RANKINGS : [];

  const els = {
    search: document.querySelector("#search"),
    group: document.querySelector("#groupFilter"),
    count: document.querySelector("#count"),
    list: document.querySelector("#rankingsBody"),
    featureGrid: document.querySelector("#rankingsFeatureGrid"),
    heroGroup: document.querySelector("#heroGroup"),
    heroTeams: document.querySelector("#heroTeams")
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function movementClass(value) {
    const movement = safeNumber(value);
    if (movement > 0) return "up";
    if (movement < 0) return "down";
    return "flat";
  }

  function movementLabel(value) {
    const movement = safeNumber(value);
    if (movement > 0) return `▲ +${movement}`;
    if (movement < 0) return `▼ ${Math.abs(movement)}`;
    return "—";
  }

  function teamUrl(team) {
    return team.teamPage || `team.html?team=${encodeURIComponent(team.slug || team.team || "")}`;
  }

  function clubLabel(team) {
    return team.displayClubName || team.club || "Unknown club";
  }

  function groupOptions() {
    return [...new Set(rankings.map(item => item.group).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  function populateFilters() {
    if (!els.group) return;
    const groups = groupOptions();
    els.group.innerHTML = [`<option value="">All groups</option>`]
      .concat(groups.map(group => `<option value="${escapeHtml(group)}">${escapeHtml(group)}</option>`))
      .join("");

    if (groups.length === 1) els.group.value = groups[0];
    if (els.heroGroup) els.heroGroup.textContent = groups.length === 1 ? groups[0] : "All groups";
    if (els.heroTeams) els.heroTeams.textContent = rankings.length.toLocaleString();
  }

  function currentFilteredRankings() {
    const query = (els.search?.value || "").trim().toLowerCase();
    const group = els.group?.value || "";

    return rankings
      .filter(item => {
        const haystack = [item.team, item.club, item.displayClubName, item.group, item.region]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return (!query || haystack.includes(query)) && (!group || item.group === group);
      })
      .sort((a, b) => safeNumber(a.postRank, 9999) - safeNumber(b.postRank, 9999));
  }

  function renderFeatureCards(items) {
    if (!els.featureGrid) return;
    const top = items.slice(0, 3);
    els.featureGrid.innerHTML = top.map(team => `
      <a class="ranking-feature-card" href="${escapeHtml(teamUrl(team))}" style="--team-primary:${escapeHtml(team.primaryColor || "#126dff")}">
        <div class="ranking-feature-rank">#${escapeHtml(team.postRank || "—")}</div>
        <div>
          <h3>${escapeHtml(team.team)}</h3>
          <p>${escapeHtml(clubLabel(team))} · ${escapeHtml(team.group || "")}</p>
          <p>WPI ${safeNumber(team.postCPI).toFixed(1)} · ${escapeHtml(movementLabel(team.movement))}</p>
        </div>
      </a>
    `).join("");
  }

  function rankingRow(team) {
    const move = movementClass(team.movement);
    const cpi = safeNumber(team.postCPI).toFixed(1);
    const logo = team.logo || "assets/logos/cpi-logo-fallback.svg";
    const record = team.latestTournamentRecord || `${team.gamesLatest || "—"} games`;

    return `
      <article class="ranking-row" style="--team-primary:${escapeHtml(team.primaryColor || "#126dff")}">
        <div class="ranking-rank">#${escapeHtml(team.postRank || "—")}</div>
        <div class="ranking-team">
          <img class="ranking-logo" src="${escapeHtml(logo)}" alt="${escapeHtml(clubLabel(team))} logo" loading="lazy" onerror="this.src='assets/logos/cpi-logo-fallback.svg'">
          <a href="${escapeHtml(teamUrl(team))}">
            <strong>${escapeHtml(team.team)}</strong>
            <span>${escapeHtml(clubLabel(team))}${team.region ? ` · ${escapeHtml(team.region)}` : ""}</span>
          </a>
        </div>
        <div class="ranking-group"><span class="ranking-pill">${escapeHtml(team.group || "—")}</span></div>
        <div class="ranking-cpi"><span class="ranking-detail-label">WPI</span><strong>${cpi}</strong></div>
        <div class="ranking-movement"><span class="ranking-move ${move}">${escapeHtml(movementLabel(team.movement))}</span></div>
        <div class="ranking-tournament"><span class="ranking-detail-label">Latest</span><strong>${escapeHtml(team.latestTournament || "—")}</strong><span>${escapeHtml(record)}</span></div>
        <div class="ranking-best-win"><span class="ranking-detail-label">Best win</span><strong>${escapeHtml(team.bestWinClean || "—")}</strong><span>${escapeHtml(team.gamesLatest || "—")} tracked games</span></div>
      </article>
    `;
  }

  function render() {
    const items = currentFilteredRankings();
    const group = els.group?.value || "";
    if (els.count) els.count.textContent = `${items.length.toLocaleString()} team${items.length === 1 ? "" : "s"}`;
    if (els.heroGroup) els.heroGroup.textContent = group || (groupOptions().length === 1 ? groupOptions()[0] : "All groups");
    if (els.heroTeams) els.heroTeams.textContent = items.length.toLocaleString();

    renderFeatureCards(items);

    if (!els.list) return;
    if (!items.length) {
      els.list.innerHTML = `<div class="rankings-empty">No ranked teams match the current filters.</div>`;
      return;
    }
    els.list.innerHTML = items.map(rankingRow).join("");
  }

  populateFilters();
  els.search?.addEventListener("input", render);
  els.group?.addEventListener("change", render);
  render();
})();
