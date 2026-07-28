/* CPI Release 7.26 — club directory and club profile polish */
(function () {
  const clubs = Array.isArray(window.CPI_CLUBS) ? window.CPI_CLUBS : [];
  const LOGO_CACHE_VERSION = "7.50.2";
  const LOGO_FALLBACK = `assets/logos/cpi-logo-fallback.svg?v=${LOGO_CACHE_VERSION}`;
  function versionLogo(src) {
    const value = String(src || "assets/logos/cpi-logo-fallback.svg");
    if (!value.includes("assets/logos/")) return value;
    if (/([?&])v=/.test(value)) return value.replace(/([?&])v=[^&]*/, `$1v=${LOGO_CACHE_VERSION}`);
    return `${value}${value.includes("?") ? "&" : "?"}v=${LOGO_CACHE_VERSION}`;
  }
  const rankings = Array.isArray(window.CPI_RANKINGS) ? window.CPI_RANKINGS : [];
  const historicalProfiles = window.CPI_HISTORICAL_PROFILES || { clubs: {}, counts: {} };
  const joProfiles = window.WPI_JO_PROFILES || { clubs: {}, teams: {}, counts: {} };
  const params = new URLSearchParams(window.location.search);
  const directoryState = { visibleCount: 25 };
  const REGION_ORDER = [
    "San Diego",
    "Orange County",
    "Los Angeles",
    "Inland Empire",
    "Central Coast",
    "Central Valley",
    "Sacramento",
    "East Bay",
    "Peninsula / San Francisco",
    "Out of State",
    "Needs Review"
  ];

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
    return versionLogo(club?.logo);
  }

  function safeName(club) {
    return club?.displayName || club?.club || club?.name || club?.slug || "Club";
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
    if (!teams.length) return number(club?.avgCPI || club?.averageCPI, 0);
    return teams.reduce((sum, team) => sum + number(team.postCPI), 0) / teams.length;
  }

  function groupsForClub(club) {
    return [...new Set(clubTeams(club).map((team) => team.group).filter(Boolean))].sort((a, b) => groupSortValue(a) - groupSortValue(b));
  }

  function gendersForClub(club) {
    return [...new Set(clubTeams(club).map((team) => team.gender).filter(Boolean))].sort();
  }

  function connectedTeams(club, joClub) {
    const ranked = [...clubTeams(club)].map((team) => ({ ...team, profileKind: "ranked" }));
    const byCanonical = new Map(ranked.filter((team) => team.canonicalTeamId).map((team) => [team.canonicalTeamId, team]));
    const output = [...ranked];
    for (const jo of (joClub?.teams || [])) {
      const matched = jo.canonicalTeamId ? byCanonical.get(jo.canonicalTeamId) : null;
      if (matched) {
        matched.joRecord = jo.record;
        matched.joDivision = jo.division;
        matched.joSubdivision = jo.subdivision;
        matched.joDivisionPlaceLabel = jo.divisionPlaceLabel;
        matched.joTeamPage = jo.teamPage;
        continue;
      }
      output.push({ ...jo, profileKind: "jo", postRank: null, postCPI: null });
    }
    return output.sort((a, b) => groupSortValue(a.group) - groupSortValue(b.group)
      || number(a.postRank, 9999) - number(b.postRank, 9999)
      || String(a.team || "").localeCompare(String(b.team || "")));
  }

  function clubScore(club) {
    const best = number(club.bestRank, 999);
    return (1000 - best) + (rankedTeams(club) * 35) + (top25Count(club) * 90) + averageCpi(club);
  }

  function normalizeClub(club) {
    const teams = clubTeams(club);
    const top = topTeam(club) || {};
    const region = club.region || teams.find((team) => team.region)?.region || "Needs Review";
    const primaryColor = club.primaryColor || club.theme?.primary || top.primaryColor || "#0f67ff";
    const secondaryColor = club.secondaryColor || club.theme?.secondary || top.secondaryColor || "#f5b700";
    return {
      ...club,
      slug: club.slug || normalizeSlug(club.displayName || club.club),
      teams,
      region,
      city: club.city || top.city || "",
      state: club.state || top.state || "",
      country: club.country || top.country || "",
      locationLabel: club.locationLabel || top.locationLabel || "",
      metroRegion: club.metroRegion || top.metroRegion || "",
      macroRegion: club.macroRegion || top.macroRegion || "",
      primaryColor,
      secondaryColor,
      bestRank: number(club.bestRank || top.postRank, 0),
      rankedTeamCount: rankedTeams(club),
      averageCpi: averageCpi(club),
      top25: top25Count(club),
      topTeam: top,
      groups: groupsForClub({ ...club, teams }),
      genders: gendersForClub({ ...club, teams })
    };
  }

  const normalized = clubs.map(normalizeClub);

  function groupSortValue(group) {
    const text = String(group || "");
    const age = Number((text.match(/\d+/) || [99])[0]);
    const gender = text.toLowerCase().includes("girls") ? 1 : 0;
    return age * 10 + gender;
  }

  function regionSort(a, b) {
    const ai = REGION_ORDER.indexOf(a);
    const bi = REGION_ORDER.indexOf(b);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return String(a).localeCompare(String(b));
  }

  function groupHref(group) {
    return `rankings.html?group=${encodeURIComponent(normalizeSlug(group || "12U Boys"))}`;
  }

  function teamHref(team) {
    return team?.teamPage || `team.html?team=${encodeURIComponent(team?.slug || "")}`;
  }

  function logoMarkup(club, className = "club-logo-box") {
    return `<span class="${className}"><img src="${escapeHtml(safeLogo(club))}" alt="${escapeHtml(safeName(club))} logo" loading="lazy" onerror="this.onerror=null;this.src='assets/logos/cpi-logo-fallback.svg?v=7.50.2'"></span>`;
  }

  function bestTeamSummary(club) {
    const top = club.topTeam || {};
    if (!top.team) return "No ranked team yet";
    return `#${top.postRank} ${top.team} · ${top.group || "Group TBD"}`;
  }

  function clubFootprintLabel(club) {
    const groups = club.groups || groupsForClub(club);
    if (!groups.length) return "Age groups will populate as rankings expand.";
    const first = groups.slice(0, 4).join(", ");
    return groups.length > 4 ? `${first} + ${groups.length - 4} more` : first;
  }

  function renderTopClubRow(club) {
    return `<a class="club-signal-row club-signal-row-v726" href="club.html?club=${encodeURIComponent(club.slug)}">
      ${logoMarkup(club)}
      <div class="club-signal-main-v726">
        <strong>${escapeHtml(safeName(club))}</strong>
        <span>${escapeHtml(club.locationLabel || club.region)} · ${club.rankedTeamCount} ranked team${club.rankedTeamCount === 1 ? "" : "s"}</span>
        <em>${escapeHtml(bestTeamSummary(club))}</em>
      </div>
      <div class="club-signal-score"><b>${club.bestRank ? `#${club.bestRank}` : "—"}</b><small>Best rank</small></div>
    </a>`;
  }

  function regionStats() {
    const map = new Map();
    normalized.forEach((club) => {
      const region = club.region || "Needs Review";
      if (!map.has(region)) map.set(region, { region, clubs: 0, teams: 0, topClub: null, bestRank: 9999 });
      const item = map.get(region);
      item.clubs += 1;
      item.teams += club.rankedTeamCount;
      if (club.bestRank && club.bestRank < item.bestRank) {
        item.bestRank = club.bestRank;
        item.topClub = club;
      }
    });
    return [...map.values()].sort((a, b) => regionSort(a.region, b.region));
  }

  function renderRegionRow(stat) {
    const club = stat.topClub;
    return `<button class="club-region-row-v726" type="button" data-region="${escapeHtml(stat.region)}">
      <span><strong>${escapeHtml(stat.region)}</strong><em>${stat.clubs} club${stat.clubs === 1 ? "" : "s"} · ${stat.teams} ranked team${stat.teams === 1 ? "" : "s"}</em></span>
      <b>${club ? `#${club.bestRank} ${escapeHtml(safeName(club))}` : "—"}</b>
    </button>`;
  }

  function renderRegionChips(stats) {
    const target = $("#clubRegionChips");
    if (!target) return;
    target.innerHTML = `<button class="is-active" type="button" data-region="all">All regions</button>` + stats.map((stat) => (
      `<button type="button" data-region="${escapeHtml(stat.region)}">${escapeHtml(stat.region)} <span>${stat.clubs}</span></button>`
    )).join("");
    target.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        const selected = button.dataset.region || "all";
        const select = $("#regionFilter");
        if (select) select.value = selected;
        directoryState.visibleCount = 25;
        target.querySelectorAll("button").forEach((item) => item.classList.toggle("is-active", item === button));
        applyClubFilters();
      });
    });
  }

  function syncRegionChips(value) {
    const target = $("#clubRegionChips");
    if (!target) return;
    target.querySelectorAll("button").forEach((button) => button.classList.toggle("is-active", (button.dataset.region || "all") === value));
  }

  function renderClubCard(club) {
    const top = club.topTeam || {};
    const theme = `--club-theme:${club.primaryColor}22;--club-card-accent:${club.primaryColor || "#0f67ff"}`;
    const groups = club.groups || groupsForClub(club);
    return `<a class="club-card club-card-v726" style="${escapeHtml(theme)}" href="club.html?club=${encodeURIComponent(club.slug)}">
      <div class="club-card-head-v726">
        ${logoMarkup(club, "club-card-logo")}
        <span class="club-region-pill-v726">${escapeHtml(club.locationLabel || club.region || "Needs Review")}</span>
      </div>
      <div class="club-card-body-v726">
        <h3>${escapeHtml(safeName(club))}</h3>
        <p>${escapeHtml(clubFootprintLabel(club))}</p>
      </div>
      <div class="club-card-best-v726">
        <small>Best ranked team</small>
        <strong>${top.team ? `#${top.postRank} ${escapeHtml(top.team)}` : "—"}</strong>
        ${top.group ? `<span>${escapeHtml(top.group)}</span>` : ""}
      </div>
      <div class="club-card-stats club-card-stats-v726">
        <div><small>Teams</small><b>${club.rankedTeamCount}</b></div>
        <div><small>Avg CPI</small><b>${formatCpi(club.averageCpi)}</b></div>
        <div><small>Top 25</small><b>${club.top25}</b></div>
        <div><small>Groups</small><b>${groups.length || "—"}</b></div>
      </div>
      <div class="club-card-footer"><span>View profile</span><span>→</span></div>
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
    syncRegionChips(region);
    const filtered = sortedDirectory.filter((club) => {
      const haystack = [safeName(club), club.club, club.region, club.slug, club.topTeam?.team, club.groups?.join(" ")].join(" ").toLowerCase();
      const matchesQuery = !q || haystack.includes(q);
      const matchesRegion = region === "all" || club.region === region;
      const matchesRanked = !onlyRanked || club.rankedTeamCount > 0;
      return matchesQuery && matchesRegion && matchesRanked;
    });
    const shown = filtered.slice(0, directoryState.visibleCount);
    grid.innerHTML = filtered.length ? shown.map(renderClubCard).join("") : `<div class="club-empty">No clubs match the current filters.</div>`;
    const loadMore = document.createElement("div");
    loadMore.id = "clubLoadMore";
    loadMore.className = "club-load-more-v724 club-load-more-v726";
    grid.appendChild(loadMore);
    renderLoadMore(filtered.length, shown.length);
    const count = $("#clubResultCount");
    if (count) count.textContent = `${shown.length} of ${filtered.length} clubs shown`;
  }

  function renderClubsPage() {
    const grid = $("#clubCardGrid");
    if (!grid) return;
    sortedDirectory = [...normalized].sort((a, b) => clubScore(b) - clubScore(a));
    const stats = regionStats();
    const regions = stats.map((stat) => stat.region);
    const regionFilter = $("#regionFilter");
    if (regionFilter && !regionFilter.dataset.loaded) {
      regionFilter.innerHTML = `<option value="all">All regions</option>${regions.map((region) => `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`).join("")}`;
      regionFilter.dataset.loaded = "true";
      const requestedRegion = params.get("region");
      if (requestedRegion && regions.includes(requestedRegion)) regionFilter.value = requestedRegion;
    }
    const searchInput = $("#clubSearch");
    if (searchInput && !searchInput.dataset.queryLoaded) {
      searchInput.value = params.get("search") || "";
      searchInput.dataset.queryLoaded = "true";
    }
    renderRegionChips(stats);
    syncRegionChips(regionFilter?.value || "all");

    const top = sortedDirectory.slice(0, 6);
    const totalRankedTeams = sortedDirectory.reduce((sum, club) => sum + club.rankedTeamCount, 0);
    const totalCount = $("#clubTotalCount");
    const teamCount = $("#clubTeamCount");
    const regionCount = $("#clubRegionCount");
    if (totalCount) totalCount.textContent = sortedDirectory.length;
    if (teamCount) teamCount.textContent = totalRankedTeams;
    if (regionCount) regionCount.textContent = regions.length;

    const topTarget = $("#topClubSignals");
    const regionTarget = $("#regionClubSignals");
    if (topTarget) topTarget.innerHTML = top.map(renderTopClubRow).join("");
    if (regionTarget) {
      regionTarget.innerHTML = stats.map(renderRegionRow).join("");
      regionTarget.querySelectorAll("button[data-region]").forEach((button) => {
        button.addEventListener("click", () => {
          const select = $("#regionFilter");
          if (select) select.value = button.dataset.region || "all";
          directoryState.visibleCount = 25;
          applyClubFilters();
          document.querySelector("#club-directory")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    }

    ["#clubSearch", "#regionFilter", "#rankedOnly"].forEach((selector) => {
      const el = $(selector);
      if (el && !el.dataset.bound) {
        el.addEventListener("input", () => { directoryState.visibleCount = 25; applyClubFilters(); });
        el.addEventListener("change", () => { directoryState.visibleCount = 25; applyClubFilters(); });
        el.dataset.bound = "true";
      }
    });
    applyClubFilters();
    if ((params.get("region") || params.get("search")) && !document.documentElement.dataset.clubQueryScrolled) {
      document.documentElement.dataset.clubQueryScrolled = "true";
      window.setTimeout(() => document.querySelector("#club-directory")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    }
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
    if (!groups.length) return `<div class="club-empty">Age-group navigation will populate as teams are connected.</div>`;
    return groups.map(([group, groupTeams]) => {
      const sortedTeams = [...groupTeams].sort((a, b) => number(a.postRank, 9999) - number(b.postRank, 9999) || String(a.team || "").localeCompare(String(b.team || "")));
      const ranked = sortedTeams.filter((team) => team.profileKind !== "jo");
      const leader = ranked[0] || {};
      return `<article class="club-age-group-card club-age-group-card-v726">
        <div class="club-age-group-head">
          <div><small>Age group</small><strong>${escapeHtml(group)}</strong></div>
          <span>${sortedTeams.length} team${sortedTeams.length === 1 ? "" : "s"}</span>
        </div>
        <div class="club-age-group-meta">
          <div><small>Best rank</small><b>${leader.postRank ? `#${leader.postRank}` : "—"}</b></div>
          <div><small>JO entries</small><b>${sortedTeams.filter((team) => team.joRecord || team.profileKind === "jo").length}</b></div>
        </div>
        <div class="club-age-team-list">
          ${sortedTeams.map((team) => {
            const isJoOnly = team.profileKind === "jo";
            const href = isJoOnly ? team.teamPage : teamHref(team);
            const left = isJoOnly ? "JO" : `#${escapeHtml(team.postRank || "—")}`;
            const right = isJoOnly ? escapeHtml(team.record || team.divisionPlaceLabel || "JO") : formatCpi(team.postCPI);
            const detail = isJoOnly ? `${escapeHtml(team.division || "Junior Olympics")}${team.divisionPlaceLabel ? ` · ${escapeHtml(team.divisionPlaceLabel)}` : ""}` : (team.joRecord ? `JO ${escapeHtml(team.joRecord)}` : "Ranked team");
            return `<a href="${escapeHtml(href)}"><span>${left}</span><strong>${escapeHtml(team.team)}</strong><em>${right}</em><small>${detail}</small></a>`;
          }).join("")}
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

  function joForClub(club) {
    const clubId = club?.canonicalClubId;
    return clubId ? joProfiles.clubs?.[clubId] || null : null;
  }

  function renderJoClubProfile(joClub) {
    if (!joClub || !Array.isArray(joClub.teams) || !joClub.teams.length) return "";
    const teams = joClub.teams;
    return `<section id="club-jo-history" class="club-profile-table-card jo-club-profile-panel">
      <div class="club-profile-section-title"><div><p class="club-intel-eyebrow">2026 Junior Olympics</p><h2>Teams and final results</h2></div><span>${teams.length} team${teams.length === 1 ? "" : "s"}</span></div>
      <p class="club-profile-note">These records and placements come from the completed WPI Junior Olympics results browser. Tournament-only profiles are shown even when a team is not currently ranked.</p>
      <div class="jo-club-summary-grid">
        <div><span>JO teams</span><strong>${escapeHtml(joClub.teamCount || teams.length)}</strong></div>
        <div><span>Age groups</span><strong>${escapeHtml(joClub.groupCount || new Set(teams.map((team) => team.group)).size)}</strong></div>
        <div><span>Best division finish</span><strong>${joClub.bestDivisionFinish ? `#${escapeHtml(joClub.bestDivisionFinish)}` : "—"}</strong></div>
        <div><span>Tournament</span><strong>2026 JO</strong></div>
      </div>
      <div class="jo-club-team-grid">${teams.map((team) => `<a class="jo-club-team-card" href="${escapeHtml(team.teamPage)}">
        <div><span>${escapeHtml(team.group || "Age group")} · ${escapeHtml(team.division || "Division")} · ${escapeHtml(team.subdivision || "")}</span><strong>${escapeHtml(team.team)}</strong><em>${escapeHtml(team.record || "Record available in JO journey")}</em></div>
        <b>${escapeHtml(team.divisionPlaceLabel || team.subdivisionPlaceLabel || "JO")}</b>
      </a>`).join("")}</div>
    </section>`;
  }

  function historicalForClub(club) {
    const clubId = club?.canonicalClubId;
    return clubId ? historicalProfiles.clubs?.[clubId] || null : null;
  }

  function historicalClubRecord(summary = {}) {
    const finals = Number(summary.finalGames || 0);
    if (!finals) return `${Number(summary.scheduledGames || 0)} archived schedule${Number(summary.scheduledGames || 0) === 1 ? "" : "s"}`;
    return `${Number(summary.wins || 0)}-${Number(summary.losses || 0)}${Number(summary.ties || 0) ? `-${Number(summary.ties || 0)}` : ""} · ${finals} finals`;
  }

  function renderHistoricalClubProfile(history) {
    if (!history) return `<section id="club-tournament-history" class="club-profile-table-card historical-club-panel is-empty"><div class="club-profile-section-title"><div><p class="club-intel-eyebrow">Historical archive</p><h2>No linked historical results yet</h2></div><span>Profile-only</span></div><p class="club-profile-note">Historical entries appear only when archived participants resolve safely to this canonical club identity.</p></section>`;
    const summary = history.summary || {};
    const appearances = history.appearances || [];
    const placements = history.placements || [];
    const recent = history.recentGames || [];
    return `<section id="club-tournament-history" class="club-profile-table-card historical-club-panel">
      <div class="club-profile-section-title"><div><p class="club-intel-eyebrow">Historical tournament archive</p><h2>Program results and entries</h2></div><span>${escapeHtml(historicalClubRecord(summary))}</span></div>
      <p class="club-profile-note historical-policy-note">Historical results are profile context only. They remain separate from live JO evidence and cannot change published CPI rankings automatically.</p>
      <div class="historical-summary-grid club-history-summary">
        <div><span>Events</span><strong>${escapeHtml(summary.events || 0)}</strong></div>
        <div><span>Teams identified</span><strong>${escapeHtml((history.teamNames || []).length)}</strong></div>
        <div><span>Final games</span><strong>${escapeHtml(summary.finalGames || 0)}</strong></div>
        <div><span>Best verified finish</span><strong>${summary.bestFinish ? `#${escapeHtml(summary.bestFinish)}` : "—"}</strong></div>
      </div>
      <div class="historical-appearance-grid club-history-appearances">${appearances.map((appearance) => `<article class="historical-appearance-card"><span>${escapeHtml(appearance.eventName || "Tournament")}</span><strong>${escapeHtml(appearance.divisionLabel || "Division")}</strong><em>${escapeHtml(historicalClubRecord(appearance))} · ${(appearance.teamNames || []).length} team${(appearance.teamNames || []).length === 1 ? "" : "s"}</em><div>${appearance.eventPublicPath ? `<a href="${escapeHtml(appearance.eventPublicPath)}">Tournament page</a>` : ""}${appearance.sourceUrl ? `<a href="${escapeHtml(appearance.sourceUrl)}" target="_blank" rel="noopener">Source</a>` : ""}</div></article>`).join("")}</div>
      ${placements.length ? `<div class="historical-placement-row">${placements.slice(0, 12).map((item) => `<span><b>#${escapeHtml(item.place)}</b>${escapeHtml(item.name)} · ${escapeHtml(item.eventName)}</span>`).join("")}</div>` : ""}
      <div class="historical-game-list club-history-games">${recent.slice(0, 10).map((game) => `<article class="historical-game-row ${game.status === "final" ? "is-final" : "is-scheduled"}"><div><span>${escapeHtml(game.eventName || "Tournament")} · ${escapeHtml(game.divisionLabel || "Division")}</span><strong>${game.teamPage ? `<a href="${escapeHtml(game.teamPage)}">${escapeHtml(game.teamName || "Club team")}</a>` : escapeHtml(game.teamName || "Club team")} vs ${game.opponentTeamPage ? `<a href="${escapeHtml(game.opponentTeamPage)}">${escapeHtml(game.opponentName || "Opponent")}</a>` : escapeHtml(game.opponentName || "Opponent")}</strong></div><div><strong>${escapeHtml(game.status === "final" ? `${game.result ? `${game.result} ` : ""}${game.scoreDisplay || "Final"}` : "Scheduled")}</strong><span>${escapeHtml(game.stage || game.dateLabel || game.gameNumber || "Archived game")}</span></div></article>`).join("")}</div>
      <a class="historical-archive-link" href="tournament-archive.html?club=${encodeURIComponent(history.canonicalClubId || "")}">Search full tournament archive →</a>
    </section>`;
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
        <p>The requested club could not be matched to the current CPI club registry.${requestedSlug ? ` Requested profile: <strong>${escapeHtml(requestedSlug)}</strong>.` : ""}</p>
        <div class="club-profile-actions"><a class="club-intel-btn" href="clubs.html">Explore clubs</a><a class="club-intel-btn secondary" href="rankings.html">View rankings</a></div>
      </section>`;
      return;
    }

    applyClubProfileVars(club);
    document.title = `${safeName(club)} | California Polo Index`;
    const top = club.topTeam || {};
    const historicalProfile = historicalForClub(club);
    const joClubProfile = joForClub(club);
    const joTeamCount = Number(joClubProfile?.teamCount || joClubProfile?.teams?.length || 0);
    const teams = [...club.teams].sort((a, b) => number(a.postRank, 999) - number(b.postRank, 999));
    const allTeams = connectedTeams(club, joClubProfile);
    const groups = [...new Set(allTeams.map((team) => team.group).filter(Boolean))].sort((a, b) => groupSortValue(a) - groupSortValue(b));
    const genders = [...new Set(allTeams.map((team) => team.gender).filter(Boolean))].sort();
    const theme = `--profile-theme:${club.primaryColor}25`;
    const teamRows = teams.length ? teams.map((team) => `<a class="club-team-row club-team-row-v726" href="${escapeHtml(teamHref(team))}">
      <div class="club-team-rank">#${escapeHtml(team.postRank || "—")}</div>
      <div><strong>${escapeHtml(team.team)}</strong><span>${escapeHtml(team.group || "Group TBD")} · ${escapeHtml(team.latestTournamentRecord || "—")}</span></div>
      <div class="club-team-stat">${formatCpi(team.postCPI)}<span>CPI</span></div>
      <div class="club-team-stat">${escapeHtml(team.bestDivisionTier || "—")}<span>Tier</span></div>
    </a>`).join("") : `<div class="club-empty">No ranked teams are currently connected to this club.</div>`;

    root.innerHTML = `<section class="club-profile-hero club-profile-hero-v726">
      <article class="club-profile-card club-profile-main-card-v726 branded" style="${escapeHtml(theme)}">
        <div class="club-profile-brand-row-v726">
          ${logoMarkup(club, "club-profile-logo")}
          <div class="club-profile-title-block-v726">
            <p class="club-intel-eyebrow">Club profile</p>
            <h1>${escapeHtml(safeName(club))}</h1>
            <div class="club-profile-chip-row-v726">
              <span>${escapeHtml(club.region)}</span>
              <span>${club.rankedTeamCount} ranked team${club.rankedTeamCount === 1 ? "" : "s"}</span>
              ${joTeamCount ? `<span>${joTeamCount} JO team${joTeamCount === 1 ? "" : "s"}</span>` : ""}
              <span>${groups.length || joClubProfile?.groupCount || 0} age group${(groups.length || joClubProfile?.groupCount || 0) === 1 ? "" : "s"}</span>
            </div>
          </div>
        </div>
        <p class="club-profile-summary-v726">${escapeHtml(safeName(club))} is currently connected to ${club.rankedTeamCount} ranked WPI team${club.rankedTeamCount === 1 ? "" : "s"}${joTeamCount ? ` and ${joTeamCount} verified 2026 Junior Olympics team profile${joTeamCount === 1 ? "" : "s"}` : ""}${groups.length ? ` across ${escapeHtml(groups.join(", "))}` : ""}. Team-specific tournament records and placements are available below.</p>
        <div class="club-profile-actions">
          ${club.website ? `<a class="club-intel-btn" href="${escapeHtml(club.website)}" target="_blank" rel="noopener">Official website</a>` : ""}
          ${top.group ? `<a class="club-intel-btn secondary" href="${escapeHtml(groupHref(top.group))}">View rankings</a>` : `<a class="club-intel-btn secondary" href="rankings.html">View rankings</a>`}
          <a class="club-intel-btn secondary" href="clubs.html">All clubs</a>
        </div>
      </article>
      <aside class="club-profile-side-card club-profile-side-card-v726 branded-side">
        <div class="club-profile-kpis club-profile-kpis-v726">
          <div class="club-profile-kpi"><small>Ranked teams</small><b>${club.rankedTeamCount}</b></div>
          <div class="club-profile-kpi"><small>Best rank</small><b>${club.bestRank ? `#${club.bestRank}` : "—"}</b></div>
          <div class="club-profile-kpi"><small>Average CPI</small><b>${formatCpi(club.averageCpi)}</b></div>
          <div class="club-profile-kpi"><small>Top 25 teams</small><b>${club.top25}</b></div>
        </div>
        <a class="club-best-team-card-v726" href="${top.team ? escapeHtml(teamHref(top)) : "rankings.html"}">
          <small>Best ranked team</small>
          <strong>${top.team ? `#${top.postRank} ${escapeHtml(top.team)}` : "No ranked team yet"}</strong>
          ${top.group ? `<span>${escapeHtml(top.group)} · ${formatCpi(top.postCPI)} CPI</span>` : ""}
        </a>
        <div class="club-profile-insight club-profile-insight-v726"><small>Footprint</small><strong>${groups.length ? escapeHtml(groups.join(", ")) : "Groups will expand as more data is added"}</strong></div>
        <div class="club-profile-insight club-profile-insight-v726"><small>Gender coverage</small><strong>${genders.length ? escapeHtml(genders.join(" + ")) : "—"}</strong></div>
      </aside>
    </section>

    <nav class="club-profile-tabs club-profile-tabs-v726" aria-label="Club profile sections">
      <a href="#club-age-groups">Ranked teams</a>
      ${joTeamCount ? `<a href="#club-jo-history">2026 JO teams</a>` : ""}
      <a href="#club-tournament-history">Other tournament history</a>
      <a href="#club-team-portfolio">Ranked portfolio</a>
    </nav>

    <section id="club-age-groups" class="club-profile-table-card club-age-section club-age-section-v726">
      <div class="club-profile-section-title">
        <div><p class="club-intel-eyebrow">Club navigation</p><h2>Teams by age group</h2></div>
        <span>${groups.length || 0} group${groups.length === 1 ? "" : "s"}</span>
      </div>
      <div class="club-age-group-grid">${renderClubAgeGroups(allTeams)}</div>
      <p class="club-profile-note">Ranked teams and verified Junior Olympics-only teams are combined here. Open a team for its ranking, tournament record, placement, and full JO journey.</p>
    </section>

    ${renderJoClubProfile(joClubProfile)}
    ${renderHistoricalClubProfile(historicalProfile)}

    <section class="club-profile-grid club-profile-grid-v726">
      <article id="club-team-portfolio" class="club-profile-table-card">
        <div class="club-profile-section-title">
          <div><p class="club-intel-eyebrow">Current teams</p><h2>Ranked team portfolio</h2></div>
          <span>${teams.length} team${teams.length === 1 ? "" : "s"}</span>
        </div>
        <div class="club-team-list">${teamRows}</div>
        <p class="club-profile-note">Club metrics are calculated from ranked CPI teams currently connected to this club. Regions, aliases, and logos remain under active audit.</p>
      </article>
    </section>`;
  }

  renderClubsPage();
  renderClubProfile();
})();
