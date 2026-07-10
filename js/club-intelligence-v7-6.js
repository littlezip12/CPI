(function () {
  const clubs = Array.isArray(window.CPI_CLUBS) ? window.CPI_CLUBS : [];
  const rankings = Array.isArray(window.CPI_RANKINGS) ? window.CPI_RANKINGS : [];

  const $ = (selector) => document.querySelector(selector);
  const params = new URLSearchParams(window.location.search);

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

  function formatCpi(value) {
    const n = number(value, NaN);
    return Number.isFinite(n) ? n.toFixed(1) : "—";
  }

  function safeLogo(club) {
    return club?.logo || "assets/logos/cpi-logo-fallback.svg";
  }

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

  function clubTeams(club) {
    if (Array.isArray(club?.teams)) return club.teams;
    return rankings.filter((team) => team.clubSlug === club?.slug);
  }

  function topTeam(club) {
    return [...clubTeams(club)].sort((a, b) => number(a.postRank, 999) - number(b.postRank, 999))[0];
  }

  function totalMovement(club) {
    return clubTeams(club).reduce((sum, team) => sum + number(team.movement), 0);
  }

  function rankedTeams(club) {
    return clubTeams(club).filter((team) => number(team.postRank, 0) > 0).length;
  }

  function top25Count(club) {
    return clubTeams(club).filter((team) => number(team.postRank, 999) <= 25).length;
  }

  function averageCpi(club) {
    const teams = clubTeams(club).filter((team) => Number.isFinite(number(team.postCPI, NaN)));
    if (!teams.length) return club.avgCPI || club.averageCPI || 0;
    return teams.reduce((sum, team) => sum + number(team.postCPI), 0) / teams.length;
  }

  function clubScore(club) {
    const best = number(club.bestRank, 999);
    return (1000 - best) + (rankedTeams(club) * 35) + (top25Count(club) * 90) + averageCpi(club) + (totalMovement(club) * 4);
  }

  function normalizeClub(club) {
    const teams = clubTeams(club);
    const top = topTeam(club) || {};
    const region = club.region || teams.find((team) => team.region)?.region || "Region TBD";
    const primaryColor = club.primaryColor || club.theme?.primary || top.primaryColor || "#0f67ff";
    const secondaryColor = club.secondaryColor || club.theme?.secondary || top.secondaryColor || "#f5b700";
    return {
      ...club,
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
  }

  const normalized = clubs.map(normalizeClub);

  function logoMarkup(club, className = "club-logo-box") {
    return `<span class="${className}"><img src="${escapeHtml(safeLogo(club))}" alt="${escapeHtml(club.displayName || club.club || "Club")} logo" loading="lazy" onerror="this.src='assets/logos/cpi-logo-fallback.svg'"></span>`;
  }

  function renderSignalRow(club, metric, label) {
    const top = club.topTeam || {};
    return `<a class="club-signal-row" href="club.html?club=${encodeURIComponent(club.slug)}">
      ${logoMarkup(club)}
      <div>
        <strong>${escapeHtml(club.displayName || club.club)}</strong>
        <span>${escapeHtml(club.region)} · ${club.rankedTeamCount} ranked team${club.rankedTeamCount === 1 ? "" : "s"}${top.team ? ` · top: #${top.postRank} ${escapeHtml(top.team)}` : ""}</span>
      </div>
      <div class="club-signal-score ${label === "Movement" ? moveClass(metric) : ""}">${escapeHtml(metric)}<small>${escapeHtml(label)}</small></div>
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
        <h3>${escapeHtml(club.displayName || club.club)}</h3>
        <div class="club-card-meta">${escapeHtml(club.region)}${top.team ? ` · ${escapeHtml(top.team)} leads` : ""}</div>
        <div class="club-card-stats">
          <div><small>Teams</small><b>${club.rankedTeamCount}</b></div>
          <div><small>Avg CPI</small><b>${formatCpi(club.averageCpi)}</b></div>
          <div><small>Top 25</small><b>${club.top25}</b></div>
          <div><small>Move</small><b class="${moveClass(club.totalMovement)}">${moveLabel(club.totalMovement)}</b></div>
          <div><small>Best</small><b>${club.bestRank ? `#${club.bestRank}` : "—"}</b></div>
          <div><small>Groups</small><b>${new Set(club.teams.map((team) => team.group).filter(Boolean)).size || "—"}</b></div>
        </div>
      </div>
      <div class="club-card-footer"><span>View club profile</span><span>→</span></div>
    </a>`;
  }

  function renderClubsPage() {
    const grid = $("#clubCardGrid");
    if (!grid) return;

    const sorted = [...normalized].sort((a, b) => clubScore(b) - clubScore(a));
    const regions = [...new Set(sorted.map((club) => club.region).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const regionFilter = $("#regionFilter");
    if (regionFilter && !regionFilter.dataset.loaded) {
      regionFilter.innerHTML = `<option value="all">All regions</option>${regions.map((region) => `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`).join("")}`;
      regionFilter.dataset.loaded = "true";
    }

    const top = sorted.slice(0, 6);
    const rising = [...sorted].sort((a, b) => b.totalMovement - a.totalMovement).slice(0, 6);
    const totalRankedTeams = sorted.reduce((sum, club) => sum + club.rankedTeamCount, 0);

    const totalCount = $("#clubTotalCount");
    const teamCount = $("#clubTeamCount");
    const regionCount = $("#clubRegionCount");
    if (totalCount) totalCount.textContent = sorted.length;
    if (teamCount) teamCount.textContent = totalRankedTeams;
    if (regionCount) regionCount.textContent = regions.filter((region) => region !== "Region TBD").length || regions.length;

    const topTarget = $("#topClubSignals");
    const risingTarget = $("#risingClubSignals");
    if (topTarget) topTarget.innerHTML = top.map((club) => renderSignalRow(club, club.bestRank ? `#${club.bestRank}` : "—", "Best rank")).join("");
    if (risingTarget) risingTarget.innerHTML = rising.map((club) => renderSignalRow(club, moveLabel(club.totalMovement), "Movement")).join("");

    function applyFilters() {
      const q = ($("#clubSearch")?.value || "").trim().toLowerCase();
      const region = $("#regionFilter")?.value || "all";
      const onlyRanked = Boolean($("#rankedOnly")?.checked);
      const filtered = sorted.filter((club) => {
        const haystack = [club.displayName, club.club, club.region, club.slug, club.topTeam?.team].join(" ").toLowerCase();
        const matchesQuery = !q || haystack.includes(q);
        const matchesRegion = region === "all" || club.region === region;
        const matchesRanked = !onlyRanked || club.rankedTeamCount > 0;
        return matchesQuery && matchesRegion && matchesRanked;
      });
      grid.innerHTML = filtered.length ? filtered.map(renderClubCard).join("") : `<div class="club-empty">No clubs match the current filters.</div>`;
      const count = $("#clubResultCount");
      if (count) count.textContent = `${filtered.length} club${filtered.length === 1 ? "" : "s"}`;
    }

    ["#clubSearch", "#regionFilter", "#rankedOnly"].forEach((selector) => {
      const el = $(selector);
      if (el && !el.dataset.bound) {
        el.addEventListener("input", applyFilters);
        el.addEventListener("change", applyFilters);
        el.dataset.bound = "true";
      }
    });

    applyFilters();
  }


  function groupSortValue(group) {
    const text = String(group || "");
    const age = Number((text.match(/\d+/) || [99])[0]);
    const gender = text.toLowerCase().includes("girls") ? 1 : 0;
    return age * 10 + gender;
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
          <div><small>Top CPI</small><b>${formatCpi(leader.postCPI)}</b></div>
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
    const slug = params.get("club");
    const club = normalized.find((item) => item.slug === slug) || normalized[0];

    if (!club) {
      root.innerHTML = `<section class="club-empty">Club profile unavailable.</section>`;
      return;
    }

    applyClubProfileVars(club);
    document.title = `${club.displayName || club.club} | California Polo Index`;
    const top = club.topTeam || {};
    const teams = [...club.teams].sort((a, b) => number(a.postRank, 999) - number(b.postRank, 999));
    const groups = [...new Set(teams.map((team) => team.group).filter(Boolean))];
    const topWins = teams.filter((team) => team.bestWinClean && team.bestWinClean !== "—").slice(0, 5);
    const theme = `--profile-theme:${club.primaryColor}25`;

    const teamRows = teams.length ? teams.map((team) => `<a class="club-team-row" href="${escapeHtml(team.teamPage || `team.html?team=${team.slug}`)}">
      <div class="club-team-rank">#${escapeHtml(team.postRank || "—")}</div>
      <div><strong>${escapeHtml(team.team)}</strong><span>${escapeHtml(team.group || "Group TBD")} · ${escapeHtml(team.latestTournament || "Tournament TBD")}</span></div>
      <div class="club-team-stat">${formatCpi(team.postCPI)}<span>CPI</span></div>
      <div class="club-team-stat ${moveClass(team.movement)}">${moveLabel(team.movement)}<span>Move</span></div>
      <div class="club-team-stat">${escapeHtml(team.latestTournamentRecord || "—")}<span>Record</span></div>
    </a>`).join("") : `<div class="club-empty">No ranked teams are currently connected to this club.</div>`;

    const winRows = topWins.length ? topWins.map((team) => `<div class="club-profile-insight"><small>${escapeHtml(team.team)}</small><strong>${escapeHtml(team.bestWinClean)}</strong></div>`).join("") : `<div class="club-empty">Best-win context will populate as more ranked results are added.</div>`;

    root.innerHTML = `<section class="club-profile-hero">
      <article class="club-profile-card branded" style="${escapeHtml(theme)}">
        <div>
          <div class="club-profile-hero-top">
            ${logoMarkup(club, "club-profile-logo")}
            <a class="club-intel-btn secondary" href="clubs.html">All clubs</a>
          </div>
          <h1>${escapeHtml(club.displayName || club.club)}</h1>
          <p>${escapeHtml(club.region)}${club.website ? ` · <a href="${escapeHtml(club.website)}" target="_blank" rel="noopener">Official website</a>` : ""}</p>
        </div>
        <div class="club-profile-actions">
          <a class="club-intel-btn" href="rankings.html">View rankings</a>
          ${top.teamPage ? `<a class="club-intel-btn secondary" href="${escapeHtml(top.teamPage)}">Top team</a>` : ""}
        </div>
      </article>
      <aside class="club-profile-side-card branded-side">
        <div class="club-profile-kpis">
          <div class="club-profile-kpi"><small>Ranked teams</small><b>${club.rankedTeamCount}</b></div>
          <div class="club-profile-kpi"><small>Best rank</small><b>${club.bestRank ? `#${club.bestRank}` : "—"}</b></div>
          <div class="club-profile-kpi"><small>Average CPI</small><b>${formatCpi(club.averageCpi)}</b></div>
          <div class="club-profile-kpi"><small>Movement</small><b class="${moveClass(club.totalMovement)}">${moveLabel(club.totalMovement)}</b></div>
        </div>
        <div class="club-profile-insight"><small>Top team</small><strong>${top.team ? `#${top.postRank} ${escapeHtml(top.team)}` : "No ranked team yet"}</strong></div>
        <div class="club-profile-insight"><small>Footprint</small><strong>${groups.length ? escapeHtml(groups.join(", ")) : "Groups will expand as more data is added"}</strong></div>
      </aside>
    </section>

    <section class="club-profile-table-card club-age-section">
      <div class="club-profile-section-title">
        <div><p class="club-intel-eyebrow">Club navigation</p><h2>Teams by age group</h2></div>
        <span>${groups.length || 0} group${groups.length === 1 ? "" : "s"}</span>
      </div>
      <div class="club-age-group-grid">${renderClubAgeGroups(teams)}</div>
      <p class="club-profile-note">This section is designed to expand across boys and girls age groups as more rankings data is added.</p>
    </section>

    <section class="club-profile-grid">
      <article class="club-profile-table-card">
        <div class="club-profile-section-title">
          <div><p class="club-intel-eyebrow">Current teams</p><h2>Ranked team portfolio</h2></div>
          <span>${teams.length} team${teams.length === 1 ? "" : "s"}</span>
        </div>
        <div class="club-team-list">${teamRows}</div>
        <p class="club-profile-note">Club intelligence currently reflects the ranked teams available in CPI data. As more age groups and genders are loaded, this page will become a broader club footprint view.</p>
      </article>
      <aside class="club-profile-side-card">
        <div class="club-profile-section-title"><div><p class="club-intel-eyebrow">Context</p><h2>Best wins</h2></div></div>
        ${winRows}
      </aside>
    </section>`;
  }


  renderClubsPage();
  renderClubProfile();
})();
