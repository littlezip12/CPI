(() => {
  "use strict";

  const rankings = Array.isArray(window.CPI_RANKINGS) ? window.CPI_RANKINGS : [];
  const clubs = Array.isArray(window.CPI_CLUBS) ? window.CPI_CLUBS : [];
  const stories = Array.isArray(window.CPI_STORIES) ? window.CPI_STORIES : [];
  const fallbackLogo = "assets/logos/cpi-logo-fallback.svg?v=7.52.4";
  const ages = ["12U", "14U", "16U", "18U"];
  let joPayload = null;
  let resultCategory = "Boys";
  let resultGroupId = "14u-boys";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const normalize = (value) => String(value ?? "").toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
  const slugify = (value) => normalize(value).replace(/\s+/g, "-");
  const logo = (item) => item?.logo || fallbackLogo;

  function teamLink(team) {
    return team?.teamPage || `team.html?team=${encodeURIComponent(team?.slug || slugify(team?.team))}`;
  }
  function clubLink(club) {
    return club?.clubPage || `club.html?club=${encodeURIComponent(club?.slug || slugify(club?.displayName || club?.club))}`;
  }
  function resultsLink(groupId, team = "") {
    const params = new URLSearchParams({ results: groupId });
    if (team) params.set("team", team);
    return `tournaments.html?${params.toString()}#jo-results`;
  }

  function findRankedTeam(name, groupId = "") {
    const target = normalize(name);
    const group = groupId ? groupId.replace(/-/g, " ") : "";
    return rankings.find((team) => normalize(team.team) === target && (!group || normalize(team.group) === group))
      || rankings.find((team) => normalize(team.team) === target);
  }

  function resultDivisionId(divisionId) {
    if (divisionId === "10u-boys-championship") return "10u-championship";
    if (divisionId === "10u-coed-classic") return "10u-girls-classic";
    return divisionId;
  }

  function resultJourneyLink(group, division, teamName) {
    const app = group.category === "Boys" ? "jo-boys" : "jo-girls";
    const params = new URLSearchParams({ division: resultDivisionId(division.id), team: teamName, focus: "journey" });
    return `tournaments/${app}/?${params.toString()}#team-explorer`;
  }

  function resultAsset(name, group) {
    const ranked = findRankedTeam(name, group.id);
    if (ranked?.logo) return ranked.logo;
    const context = { season: "2026", ageGroup: group.ageGroup, gender: group.category };
    const identity = window.CPIIdentity?.resolveTeam?.(name, context);
    if (identity?.club?.logo) return identity.club.logo;
    const resolver = window.CPIIdentity?.resolveClub;
    const clean = window.CPIIdentity?.cleanSourceName?.(name) || String(name || "").trim();
    const candidates = [clean];
    let stripped = clean;
    for (let i = 0; i < 3; i += 1) {
      const next = stripped.replace(/\s+(?:A|B|C|D|Black|Blue|Red|White|Gold|Silver|Orange|Green|Teal|Yellow|Navy|Gray|Grey|Premier|13A)\s*$/i, "").trim();
      if (next === stripped) break;
      candidates.push(next); stripped = next;
    }
    for (const candidate of candidates) {
      const club = resolver?.(candidate);
      if (club?.logo) return club.logo;
    }
    return fallbackLogo;
  }

  function updateStats() {
    $("#wpiRankedTeams").textContent = rankings.length.toLocaleString();
    $("#wpiClubCount").textContent = clubs.length.toLocaleString();
    $("#wpiGroupCount").textContent = new Set(rankings.map((team) => team.group).filter(Boolean)).size.toLocaleString();
  }

  function searchItems(query, type) {
    const q = normalize(query);
    if (!q) return [];
    const items = [];
    if (type !== "clubs") {
      rankings.forEach((team) => {
        const haystack = normalize([team.team, team.displayClubName, team.club, team.group].join(" "));
        if (haystack.includes(q)) items.push({ kind: "Team", name: team.team, meta: `${team.group} · #${team.postRank}`, logo: logo(team), url: teamLink(team), score: haystack.startsWith(q) ? 0 : 2 });
      });
    }
    if (type !== "teams") {
      clubs.forEach((club) => {
        const name = club.displayName || club.club || club.slug;
        const haystack = normalize([name, club.region, club.slug].join(" "));
        if (haystack.includes(q)) items.push({ kind: "Club", name, meta: club.region || "Region under review", logo: logo(club), url: clubLink(club), score: haystack.startsWith(q) ? 1 : 3 });
      });
    }
    return items.sort((a, b) => a.score - b.score || a.name.localeCompare(b.name)).slice(0, 10);
  }

  function bindSearch() {
    const form = $("#wpiHomeSearch");
    const input = $("#wpiSearchInput");
    const type = $("#wpiSearchType");
    const results = $("#wpiSearchResults");
    if (!form || !input || !type || !results) return;

    function render() {
      const items = searchItems(input.value, type.value);
      if (!input.value.trim()) { results.hidden = true; results.innerHTML = ""; return; }
      results.hidden = false;
      results.innerHTML = items.length ? items.map((item) => `<a class="wpi-search-result" href="${escapeHtml(item.url)}">
        <img src="${escapeHtml(item.logo)}" alt="" onerror="this.onerror=null;this.src='${fallbackLogo}'">
        <span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.kind)} · ${escapeHtml(item.meta)}</small></span><em>Open →</em>
      </a>`).join("") : `<div class="wpi-search-empty">No teams or clubs match “${escapeHtml(input.value.trim())}”.</div>`;
    }
    input.addEventListener("input", render);
    type.addEventListener("change", render);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const items = searchItems(input.value, type.value);
      if (items[0]) window.location.href = items[0].url;
      else window.location.href = type.value === "clubs" ? `clubs.html?search=${encodeURIComponent(input.value.trim())}#club-directory` : `rankings.html?search=${encodeURIComponent(input.value.trim())}`;
    });
    document.addEventListener("click", (event) => { if (!form.contains(event.target)) results.hidden = true; });
  }

  function renderRankings(gender = "Boys") {
    const target = $("#wpiRankingGrid");
    if (!target) return;
    target.innerHTML = ages.map((age) => {
      const group = `${age} ${gender}`;
      const groupTeams = rankings.filter((team) => team.group === group).sort((a, b) => Number(a.postRank || 999) - Number(b.postRank || 999));
      const leader = groupTeams[0];
      const groupSlug = slugify(group);
      return `<article class="wpi-ranking-card">
        <div class="wpi-ranking-card-head"><h3>${age}</h3><span>${groupTeams.length} teams ranked</span></div>
        ${leader ? `<a class="wpi-ranking-leader" href="${escapeHtml(teamLink(leader))}"><small>#1</small><img src="${escapeHtml(logo(leader))}" alt="${escapeHtml(leader.team)} logo" onerror="this.onerror=null;this.src='${fallbackLogo}'"><strong>${escapeHtml(leader.team)}</strong><em>${escapeHtml(leader.displayClubName || leader.club || "")}</em></a>` : `<div class="wpi-ranking-leader"><strong>Ranking unavailable</strong></div>`}
        <a href="rankings.html?group=${encodeURIComponent(groupSlug)}">Open ${age} ${gender}</a>
      </article>`;
    }).join("");
  }

  function bindRankingToggle() {
    $("#wpiGenderToggle")?.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-gender]");
      if (!button) return;
      $$("#wpiGenderToggle button").forEach((item) => item.classList.toggle("is-active", item === button));
      renderRankings(button.dataset.gender);
    });
  }

  function availableResultGroups(category) {
    return (joPayload?.groups || []).filter((group) => group.category === category);
  }

  function renderResultAgeButtons() {
    const target = $("#wpiResultAge");
    if (!target) return;
    const groups = availableResultGroups(resultCategory);
    if (!groups.some((group) => group.id === resultGroupId)) resultGroupId = groups.find((group) => group.ageGroup === "14U")?.id || groups[0]?.id || "";
    target.innerHTML = groups.map((group) => `<button type="button" class="${group.id === resultGroupId ? "is-active" : ""}" data-group="${escapeHtml(group.id)}">${escapeHtml(group.ageGroup)}</button>`).join("");
  }

  function renderResults() {
    const target = $("#wpiResultsGrid");
    if (!target || !joPayload) return;
    const group = joPayload.groups.find((item) => item.id === resultGroupId) || availableResultGroups(resultCategory)[0];
    if (!group) { target.innerHTML = `<div class="wpi-loading">No completed ${escapeHtml(resultCategory)} results are available.</div>`; return; }
    resultGroupId = group.id;
    const divisionCards = group.divisions.map((division) => {
      const subdivision = division.subdivisions[0];
      const leaders = subdivision?.teams?.slice(0, 3) || [];
      return `<article class="wpi-result-card">
        <div class="wpi-result-card-head"><h3>${escapeHtml(division.label)}</h3><span>${escapeHtml(division.tier)}</span></div>
        <div class="wpi-result-subdivision">${escapeHtml(subdivision?.label || "Final results")} · top finishers</div>
        <div class="wpi-result-list">${leaders.map((team) => {
          const url = resultJourneyLink(group, division, team.team);
          const teamLogo = resultAsset(team.team, group);
          return `<a class="wpi-result-team" href="${escapeHtml(url)}" aria-label="View ${escapeHtml(team.team)} Junior Olympics games"><b>${escapeHtml(team.place)}</b><img src="${escapeHtml(teamLogo)}" alt="" aria-hidden="true" loading="lazy" onerror="this.onerror=null;this.src='${fallbackLogo}'"><strong>${escapeHtml(team.team)}</strong><em>${escapeHtml(team.record || team.overallPlaceLabel || "")}</em></a>`;
        }).join("")}</div>
        <a href="${escapeHtml(resultsLink(group.id))}">Browse ${escapeHtml(division.label)} results →</a>
      </article>`;
    });
    const subdivisions = [...new Set(group.divisions.flatMap((division) => division.subdivisions.map((subdivision) => subdivision.label)))];
    divisionCards.push(`<article class="wpi-result-card wpi-subdivision-card"><div class="wpi-result-card-head"><h3>Subdivisions</h3><span>All divisions</span></div><ul>${subdivisions.map((name) => `<li><a href="${escapeHtml(resultsLink(group.id))}"><span>${escapeHtml(name)}</span><em>Results →</em></a></li>`).join("")}</ul><a href="${escapeHtml(resultsLink(group.id))}">View all ${escapeHtml(group.label)} finishes →</a></article>`);
    target.innerHTML = divisionCards.slice(0, 4).join("");
  }

  function bindResultsControls() {
    $("#wpiResultCategory")?.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-category]");
      if (!button) return;
      resultCategory = button.dataset.category;
      $$("#wpiResultCategory button").forEach((item) => item.classList.toggle("is-active", item === button));
      renderResultAgeButtons();
      renderResults();
    });
    $("#wpiResultAge")?.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-group]");
      if (!button) return;
      resultGroupId = button.dataset.group;
      $$("#wpiResultAge button").forEach((item) => item.classList.toggle("is-active", item === button));
      renderResults();
    });
  }

  function clubMetric(club) {
    const teams = Array.isArray(club.teams) ? club.teams : rankings.filter((team) => team.clubSlug === club.slug);
    const best = teams.reduce((value, team) => Math.min(value, Number(team.postRank || 999)), 999);
    return { teams: teams.length, best };
  }

  function renderFeaturedClubs() {
    const target = $("#wpiFeaturedClubs");
    if (!target) return;
    const candidates = clubs.map((club) => ({ club, metric: clubMetric(club) }))
      .filter(({ club, metric }) => metric.teams > 0 && club.region && !/review|tbd/i.test(club.region) && !String(logo(club)).includes("fallback"))
      .sort((a, b) => b.metric.teams - a.metric.teams || a.metric.best - b.metric.best);
    const chosen = [];
    const regions = new Set();
    for (const item of candidates) {
      if (regions.has(item.club.region) && chosen.length < 2) continue;
      chosen.push(item); regions.add(item.club.region);
      if (chosen.length === 3) break;
    }
    target.innerHTML = chosen.map(({ club, metric }) => `<a class="wpi-club-card" href="${escapeHtml(clubLink(club))}"><img src="${escapeHtml(logo(club))}" alt="${escapeHtml(club.displayName || club.club)} logo" onerror="this.onerror=null;this.src='${fallbackLogo}'"><strong>${escapeHtml(club.displayName || club.club)}</strong><span>${escapeHtml(club.region)} · ${metric.teams} ranked team${metric.teams === 1 ? "" : "s"}</span><em>View club profile →</em></a>`).join("");
  }

  function renderUpdates() {
    const target = $("#wpiUpdateList");
    if (!target) return;
    const defaults = [
      { label: "Rankings", title: "Girls post-JO rankings published", summary: "324 all-girls JO entrants are live.", url: "rankings.html?group=12u-girls" },
      { label: "Rankings", title: "Boys post-JO rankings published", summary: "Four top-100 ranking groups are live.", url: "rankings.html?group=12u-boys" },
      { label: "Results", title: "Junior Olympics results browser", summary: "976 final placements are searchable.", url: "tournaments.html#jo-results" }
    ];
    const items = (stories.length ? stories : defaults).slice(0, 3);
    target.innerHTML = items.map((item) => `<a class="wpi-update-item" href="${escapeHtml(item.url || "stories.html")}"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.label || item.summary || "WPI update")}</span><em>→</em></a>`).join("");
  }

  updateStats();
  bindSearch();
  renderRankings("Boys");
  bindRankingToggle();
  renderFeaturedClubs();
  renderUpdates();
  bindResultsControls();

  fetch("data/tournaments/jo-results-2026.json?v=7.52.1", { cache: "no-store" })
    .then((response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
    .then((data) => {
      joPayload = data;
      $("#wpiJoFinishCount").textContent = Number(data.summary?.teamPlacements || data.summary?.teams || 0).toLocaleString();
      renderResultAgeButtons();
      renderResults();
    })
    .catch((error) => {
      console.error("Unable to load JO results on homepage", error);
      $("#wpiJoFinishCount").textContent = "976";
      $("#wpiResultsGrid").innerHTML = `<div class="wpi-loading">Results are temporarily unavailable. <a href="tournaments.html#jo-results">Open the full results browser.</a></div>`;
    });
})();
