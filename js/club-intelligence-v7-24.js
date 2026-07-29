/* WPI Release 7.24 — simplified club directory and club profiles */
(function () {
  const clubs = Array.isArray(window.CPI_CLUBS) ? window.CPI_CLUBS : [];
  const rankings = Array.isArray(window.CPI_RANKINGS) ? window.CPI_RANKINGS : [];
  const params = new URLSearchParams(window.location.search);
  const directoryState = { visibleCount: 25 };

  const $ = (selector) => document.querySelector(selector);

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function number(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function normalizeSlug(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function formatCpi(value) {
    const n = number(value, NaN);
    return Number.isFinite(n) ? n.toFixed(1) : "—";
  }

  function safeLogo(club) {
    return club?.logo || "assets/logos/cpi-logo-fallback.svg";
  }

  function safeName(club) {
    return club.displayName || club.club || club.name || club.slug || "Club";
  }

  function clubTeams(club) {
    if (Array.isArray(club?.teams)) return club.teams;
    return rankings.filter((team) => team.clubSlug === club?.slug || normalizeSlug(team.displayClubName || team.club) === club?.slug);
  }

  function rankedTeams(club) {
    return clubTeams(club).filter((team) => number(team.postRank, 0) > 0).length;
  }

  function top25Count(club) {
    return clubTeams(club).filter((team) => number(team.postRank, 999) <= 25).length;
  }

  function topTeam(club) {
    return [...clubTeams(club)].sort((a, b) => number(a.postRank, 9999) - number(b.postRank, 9999))[0];
  }

  function averageCpi(club) {
    const teams = clubTeams(club).filter((team) => Number.isFinite(number(team.postCPI, NaN)));
    if (!teams.length) return number(club.avgCPI || club.averageCPI, 0);
    return teams.reduce((sum, team) => sum + number(team.postCPI), 0) / teams.length;
  }

  function totalMovement(club) {
    return clubTeams(club).reduce((sum, team) => sum + number(team.movement), 0);
  }

  function groupsForClub(club) {
    return [...new Set(clubTeams(club).map((team) => team.group).filter(Boolean))].sort((a, b) => groupSortValue(a) - groupSortValue(b));
  }

  function clubScore(club) {
    const best = number(club.bestRank, 999);
    return (1000 - best) + (rankedTeams(club) * 35) + (top25Count(club) * 90) + averageCpi(club);
  }

  function normalizeClub(club) {
    const teams = clubTeams(club);
    const top = topTeam(club) || {};
    const region = club.region || teams.find((team) => team.region)?.region || "Region TBD";
    const primaryColor = club.primaryColor || club.theme?.primary || top.primaryColor || "#0f67ff";
    const secondaryColor = club.secondaryColor || club.theme?.secondary || top.secondaryColor || "#f5b700";
    const normalized = {
      ...club,
      slug: club.slug || normalizeSlug(club.displayName || club.club),
      teams,
      region,
      primaryColor,
      secondaryColor,
      bestRank: number(club.bestRank || top.postRank, 0),
      rankedTeamCount: rankedTeams(club),
      averageCpi: averageCpi(club),
      totalMovement: totalMovement(club),
      top25: top25Count(club),
      topTeam: top
    };
    return normalized;
  }

  const normalized = clubs.map(normalizeClub);

  function moveClass(value) {
    const n = number(value);
    if (n > 0) return "club-move-up";
    if (n < 0) return "club-move-down";
    return "club-move-neutral";
  }

  function moveLabel(value) {
    const n = number(value);
    if (n > 0) return `▲ ${n}`;
    if (n < 0) return `▼ ${Math.abs(n)}`;
    return "—";
  }

  function groupSortValue(group) {
    const text = String(group || "");
    const age = Number((text.match(/\d+/) || [99])[0]);
    const gender = text.toLowerCase().includes("girls") ? 1 : 0;
    return age * 10 + gender;
  }

  function groupHref(group) {
    return `rankings.html?group=${encodeURIComponent(normalizeSlug(group || "12U Boys"))}`;
  }

  function logoMarkup(club, className = "club-logo-box") {
    return `<span class="${className}"><img src="${escapeHtml(safeLogo(club))}" alt="${escapeHtml(safeName(club))} logo" loading="lazy" onerror="this.src='assets/logos/cpi-logo-fallback.svg'"></span>`;
  }

  function renderSignalRow(club, metric, label) {
    const top = club.topTeam || {};
    return `<a class="club-signal-row" href="club.html?club=${encodeURIComponent(club.slug)}">
      ${logoMarkup(club)}
      <div>
        <strong>${escapeHtml(safeName(club))}</strong>
        <span>${escapeHtml(club.region)} · ${club.rankedTeamCount} ranked team${club.rankedTeamCount === 1 ? "" : "s"}${top.team ? ` · top: #${top.postRank} ${escapeHtml(top.team)}` : ""}</span>
      </div>
      <div class="club-signal-score ${label.includes("Movement") ? moveClass(club.totalMovement) : ""}">${escapeHtml(metric)}<small>${escapeHtml(label)}</small></div>
    </a>`;
  }

  function renderClubCard(club) {
    const top = club.topTeam || {};
    const theme = `--club-theme:${club.primaryColor}22`;
    return `<a class="club-card" style="${escapeHtml(theme)}" href="club.html?club=${encodeURIComponent(club.slug)}">
      <div>
        <div class="club-card-top">
          ${logoMarkup(club, "club-card-logo")}
          <span class="club-card-rank">${club.bestRank ? `Best #${club.bestRank}` : "Unranked"}</span>
        </div>
        <h3>${escapeHtml(safeName(club))}</h3>
        <div class="club-card-meta">${escapeHtml(club.region)}${top.team ? ` · top team: ${escapeHtml(top.team)}` : ""}</div>
        <div class="club-card-stats">
          <div><small>Teams</small><b>${club.rankedTeamCount}</b></div>
          <div><small>Avg WPI</small><b>${formatCpi(club.averageCpi)}</b></div>
          <div><small>Top 25</small><b>${club.top25}</b></div>
          <div><small>Groups</small><b>${groupsForClub(club).length || "—"}</b></div>
          <div><small>Best</small><b>${club.bestRank ? `#${club.bestRank}` : "—"}</b></div>
          <div><small>Top team</small><b>${top.team ? `#${top.postRank}` : "—"}</b></div>
        </div>
      </div>
      <div class="club-card-footer"><span>View club profile</span><span>→</span></div>
    </a>`;
  }

  function renderLoadMore(total, shown) {
    const target = $("#clubLoadMore");
    if (!target) return;
    if (total <= 25) {
      target.innerHTML = "";
      return;
    }
    const remaining = Math.max(0, total - shown);
    target.innerHTML = `
      ${remaining > 0 ? `<button class="primary" type="button" data-action="more">View next ${Math.min(25, remaining)}</button>` : ""}
      ${shown < total ? `<button type="button" data-action="all">Show all ${total}</button>` : `<button type="button" data-action="top">Back to top 25</button>`}
    `;
    target.querySelector('[data-action="more"]')?.addEventListener("click", () => {
      directoryState.visibleCount = Math.min(total, directoryState.visibleCount + 25);
      applyClubFilters();
    });
    target.querySelector('[data-action="all"]')?.addEventListener("click", () => {
      directoryState.visibleCount = total;
      applyClubFilters();
    });
    target.querySelector('[data-action="top"]')?.addEventListener("click", () => {
      directoryState.visibleCount = 25;
      applyClubFilters();
      document.querySelector("#club-directory")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  let sortedDirectory = [];
  function applyClubFilters() {
    const grid = $("#clubCardGrid");
    if (!grid) return;
    const q = ($("#clubSearch")?.value || "").trim().toLowerCase();
    const region = $("#regionFilter")?.value || "all";
    const onlyRanked = Boolean($("#rankedOnly")?.checked);
    const filtered = sortedDirectory.filter((club) => {
      const haystack = [safeName(club), club.club, club.region, club.slug, club.topTeam?.team].join(" ").toLowerCase();
      const matchesQuery = !q || haystack.includes(q);
      const matchesRegion = region === "all" || club.region === region;
      const matchesRanked = !onlyRanked || club.rankedTeamCount > 0;
      return matchesQuery && matchesRegion && matchesRanked;
    });
    const shown = filtered.slice(0, directoryState.visibleCount);
    grid.innerHTML = filtered.length ? shown.map(renderClubCard).join("") : `<div class="club-empty">No clubs match the current filters.</div>`;
    const loadMore = document.createElement("div");
    loadMore.id = "clubLoadMore";
    loadMore.className = "club-load-more-v724";
    grid.appendChild(loadMore);
    renderLoadMore(filtered.length, shown.length);
    const count = $("#clubResultCount");
    if (count) count.textContent = `${shown.length} of ${filtered.length} clubs shown`;
  }

  function renderClubsPage() {
    const grid = $("#clubCardGrid");
    if (!grid) return;
    sortedDirectory = [...normalized].sort((a, b) => clubScore(b) - clubScore(a));
    const regions = [...new Set(sortedDirectory.map((club) => club.region).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const regionFilter = $("#regionFilter");
    if (regionFilter && !regionFilter.dataset.loaded) {
      regionFilter.innerHTML = `<option value="all">All regions</option>${regions.map((region) => `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`).join("")}`;
      regionFilter.dataset.loaded = "true";
    }

    const top = sortedDirectory.slice(0, 5);
    const rising = [...sortedDirectory].filter((club) => club.totalMovement > 0).sort((a, b) => b.totalMovement - a.totalMovement).slice(0, 5);
    const totalRankedTeams = sortedDirectory.reduce((sum, club) => sum + club.rankedTeamCount, 0);
    const totalCount = $("#clubTotalCount");
    const teamCount = $("#clubTeamCount");
    const regionCount = $("#clubRegionCount");
    if (totalCount) totalCount.textContent = sortedDirectory.length;
    if (teamCount) teamCount.textContent = totalRankedTeams;
    if (regionCount) regionCount.textContent = regions.filter((region) => region !== "Region TBD").length || regions.length;

    const topTarget = $("#topClubSignals");
    const risingTarget = $("#risingClubSignals");
    if (topTarget) topTarget.innerHTML = top.map((club) => renderSignalRow(club, club.bestRank ? `#${club.bestRank}` : "—", "Best rank")).join("");
    if (risingTarget) risingTarget.innerHTML = rising.length ? rising.map((club) => renderSignalRow(club, moveLabel(club.totalMovement), "Team movement")).join("") : `<div class="club-empty">Club movement will populate after the next ranking comparison.</div>`;

    ["#clubSearch", "#regionFilter", "#rankedOnly"].forEach((selector) => {
      const el = $(selector);
      if (el && !el.dataset.bound) {
        el.addEventListener("input", () => { directoryState.visibleCount = 25; applyClubFilters(); });
        el.addEventListener("change", () => { directoryState.visibleCount = 25; applyClubFilters(); });
        el.dataset.bound = "true";
      }
    });
    applyClubFilters();
  }

  function groupedTeams(teams) {
    return [...teams].reduce((map, team) => {
      const group = team.group || "Group TBD";
      if (!map.has(group)) map.set(group, []);
      map.get(group).push(team);
      return map;
    }, new Map());
  }

  function renderClubAgeGroups(teams) {
    const groups = [...groupedTeams(teams).entries()].sort(([a], [b]) => groupSortValue(a) - groupSortValue(b));
    if (!groups.length) return `<div class="club-empty">Age-group navigation will populate as ranked teams are added.</div>`;
    return groups.map(([group, groupTeams]) => {
      const sortedTeams = [...groupTeams].sort((a, b) => number(a.postRank, 999) - number(b.postRank, 999));
      const leader = sortedTeams[0] || {};
      return `<article class="club-age-group-card">
        <div class="club-age-group-head">
          <div><small>Age group</small><strong>${escapeHtml(group)}</strong></div>
          <span>${sortedTeams.length} team${sortedTeams.length === 1 ? "" : "s"}</span>
        </div>
        <div class="club-age-group-meta">
          <div><small>Best rank</small><b>${leader.postRank ? `#${leader.postRank}` : "—"}</b></div>
          <div><small>Top WPI</small><b>${formatCpi(leader.postCPI)}</b></div>
        </div>
        <div class="club-age-team-list">
          ${sortedTeams.map((team) => `<a href="${escapeHtml(team.teamPage || `team.html?team=${team.slug}`)}">
            <span>#${escapeHtml(team.postRank || "—")}</span>
            <strong>${escapeHtml(team.team)}</strong>
            <em>${formatCpi(team.postCPI)}</em>
          </a>`).join("")}
        </div>
      </article>`;
    }).join("");
  }

  function applyClubProfileVars(club) {
    const target = document.querySelector(".club-profile-page") || document.documentElement;
    target.style.setProperty("--profile-primary", club.primaryColor || "#0f67ff");
    target.style.setProperty("--profile-secondary", club.secondaryColor || "#f5b700");
    target.style.setProperty("--profile-primary-soft", `${club.primaryColor || "#0f67ff"}22`);
    target.style.setProperty("--profile-secondary-soft", `${club.secondaryColor || "#f5b700"}28`);
  }

  function renderClubProfile() {
    const root = $("#clubProfileApp");
    if (!root) return;
    const requestedSlug = normalizeSlug(params.get("club"));
    const club = requestedSlug ? normalized.find((item) => item.slug === requestedSlug) : null;
    if (!club) {
      root.innerHTML = `<section class="club-profile-not-found">
        <p class="club-intel-eyebrow">Club profile</p>
        <h1>Club not found</h1>
        <p>The requested club could not be matched to the current WPI club registry.${requestedSlug ? ` Requested profile: <strong>${escapeHtml(requestedSlug)}</strong>.` : ""}</p>
        <div class="club-profile-actions"><a class="club-intel-btn" href="clubs.html">Explore clubs</a><a class="club-intel-btn secondary" href="rankings.html">View rankings</a></div>
      </section>`;
      return;
    }

    applyClubProfileVars(club);
    document.title = `${safeName(club)} | Water Polo Index`;
    const top = club.topTeam || {};
    const teams = [...club.teams].sort((a, b) => number(a.postRank, 999) - number(b.postRank, 999));
    const groups = groupsForClub(club);
    const theme = `--profile-theme:${club.primaryColor}25`;
    const teamRows = teams.length ? teams.map((team) => `<a class="club-team-row" href="${escapeHtml(team.teamPage || `team.html?team=${team.slug}`)}">
      <div class="club-team-rank">#${escapeHtml(team.postRank || "—")}</div>
      <div><strong>${escapeHtml(team.team)}</strong><span>${escapeHtml(team.group || "Group TBD")} · ${escapeHtml(team.latestTournament || "Tournament TBD")}</span></div>
      <div class="club-team-stat">${formatCpi(team.postCPI)}<span>WPI</span></div>
      <div class="club-team-stat">${escapeHtml(team.latestTournamentRecord || "—")}<span>Record</span></div>
    </a>`).join("") : `<div class="club-empty">No ranked teams are currently connected to this club.</div>`;

    root.innerHTML = `<section class="club-profile-hero">
      <article class="club-profile-card branded" style="${escapeHtml(theme)}">
        <div>
          <div class="club-profile-hero-top">
            ${logoMarkup(club, "club-profile-logo")}
            <a class="club-intel-btn secondary" href="clubs.html">All clubs</a>
          </div>
          <h1>${escapeHtml(safeName(club))}</h1>
          <p>${escapeHtml(club.region)}${club.website ? ` · <a href="${escapeHtml(club.website)}" target="_blank" rel="noopener">Official website</a>` : ""}</p>
        </div>
        <div class="club-profile-actions">
          <a class="club-intel-btn" href="${escapeHtml(groupHref(top.group))}">View rankings</a>
          ${top.teamPage ? `<a class="club-intel-btn secondary" href="${escapeHtml(top.teamPage)}">Top team</a>` : ""}
        </div>
      </article>
      <aside class="club-profile-side-card branded-side">
        <div class="club-profile-kpis">
          <div class="club-profile-kpi"><small>Ranked teams</small><b>${club.rankedTeamCount}</b></div>
          <div class="club-profile-kpi"><small>Best rank</small><b>${club.bestRank ? `#${club.bestRank}` : "—"}</b></div>
          <div class="club-profile-kpi"><small>Average WPI</small><b>${formatCpi(club.averageCpi)}</b></div>
          <div class="club-profile-kpi"><small>Age groups</small><b>${groups.length || "—"}</b></div>
        </div>
        <div class="club-profile-insight"><small>Top team</small><strong>${top.team ? `#${top.postRank} ${escapeHtml(top.team)} · ${escapeHtml(top.group || "")}` : "No ranked team yet"}</strong></div>
        <div class="club-profile-insight"><small>Footprint</small><strong>${groups.length ? escapeHtml(groups.join(", ")) : "Groups will expand as more data is added"}</strong></div>
      </aside>
    </section>

    <nav class="club-profile-tabs" aria-label="Club profile sections">
      <a href="#club-age-groups">Teams by age group</a>
      <a href="#club-team-portfolio">Ranked portfolio</a>
    </nav>

    <section id="club-age-groups" class="club-profile-table-card club-age-section">
      <div class="club-profile-section-title">
        <div><p class="club-intel-eyebrow">Club navigation</p><h2>Teams by age group</h2></div>
        <span>${groups.length || 0} group${groups.length === 1 ? "" : "s"}</span>
      </div>
      <div class="club-age-group-grid">${renderClubAgeGroups(teams)}</div>
      <p class="club-profile-note">This is the club-level view. Team-specific results, movement, and best wins live on individual team pages.</p>
    </section>

    <section class="club-profile-grid">
      <article id="club-team-portfolio" class="club-profile-table-card">
        <div class="club-profile-section-title">
          <div><p class="club-intel-eyebrow">Current teams</p><h2>Ranked team portfolio</h2></div>
          <span>${teams.length} team${teams.length === 1 ? "" : "s"}</span>
        </div>
        <div class="club-team-list">${teamRows}</div>
        <p class="club-profile-note">Club metrics are calculated from ranked WPI teams currently connected to this club. Regions, aliases, and logos remain under active audit.</p>
      </article>
    </section>`;
  }

  renderClubsPage();
  renderClubProfile();
})();
