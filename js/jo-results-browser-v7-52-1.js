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
  const rankings = Array.isArray(window.CPI_RANKINGS) ? window.CPI_RANKINGS : [];
  const clubs = Array.isArray(window.CPI_CLUBS) ? window.CPI_CLUBS : [];
  const joProfiles = window.WPI_JO_PROFILES || { teams: {}, lookup: {} };
  const fallbackLogo = "assets/logos/cpi-logo-fallback.svg?v=7.52.7";

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
    .replace(/&/g, " and ")
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

  function contextFor(group) {
    return {
      season: "2026",
      ageGroup: group?.ageGroup || "",
      gender: group?.category || ""
    };
  }

  function candidateNames(name) {
    const clean = window.CPIIdentity?.cleanSourceName?.(name) || String(name || "").trim();
    const values = [clean];
    const add = (value) => {
      const candidate = String(value || "").trim();
      if (candidate && !values.includes(candidate)) values.push(candidate);
    };
    add(clean.replace(/\s+\d{1,2}[A-Z]?\s*$/i, ""));
    let stripped = clean;
    for (let index = 0; index < 3; index += 1) {
      const next = stripped.replace(/\s+(?:A|B|C|D|Black|Blue|Red|White|Gold|Silver|Orange|Green|Teal|Yellow|Navy|Gray|Grey|Premier|13A)\s*$/i, "").trim();
      if (next === stripped) break;
      add(next);
      stripped = next;
    }
    return values;
  }

  function rankedTeamFor(name, group) {
    const target = normalize(name);
    const groupLabel = normalize(group?.label || "");
    return rankings.find((team) => normalize(team.team) === target && normalize(team.group) === groupLabel)
      || rankings.find((team) => normalize(team.team) === target)
      || null;
  }

  function clubFor(name, group) {
    const identity = window.CPIIdentity?.resolveTeam?.(name, contextFor(group));
    if (identity?.club?.logo) return identity.club;
    const resolver = window.CPIIdentity?.resolveClub;
    if (resolver) {
      for (const candidate of candidateNames(name)) {
        const club = resolver(candidate);
        if (club?.logo) return club;
      }
    }
    const targets = candidateNames(name).map(normalize);
    return clubs.find((club) => targets.includes(normalize(club.displayName || club.club || club.slug)))
      || clubs.find((club) => targets.some((target) => target && normalize(club.displayName || club.club || club.slug).includes(target)))
      || null;
  }

  function assetFor(name, group) {
    const ranked = rankedTeamFor(name, group);
    if (ranked?.logo) return { logo: ranked.logo, profile: ranked.teamPage || "" };
    const joSlug = joProfiles.lookup?.[`${group?.id || ""}|${normalize(name)}`];
    const joProfile = joSlug ? joProfiles.teams?.[joSlug] : null;
    if (joProfile) return { logo: joProfile.logo || fallbackLogo, profile: joProfile.teamPage || `team.html?team=${encodeURIComponent(joProfile.profileSlug || "")}` };
    const club = clubFor(name, group);
    return {
      logo: club?.logo || fallbackLogo,
      profile: club?.clubPage || (club?.slug ? `club.html?club=${encodeURIComponent(club.slug)}` : "")
    };
  }

  function appDivisionId(divisionId) {
    if (divisionId === "10u-boys-championship") return "10u-championship";
    if (divisionId === "10u-coed-classic") return "10u-girls-classic";
    return divisionId;
  }

  function journeyUrl(group, division, teamName) {
    const app = group?.category === "Boys" ? "jo-boys" : "jo-girls";
    const params = new URLSearchParams({
      division: appDivisionId(division.id),
      team: teamName,
      focus: "journey"
    });
    return `tournaments/${app}/?${params.toString()}#team-explorer`;
  }

  function teamRow(team, division, group) {
    const record = team.record ? `<span class="cpi521-record">${escapeHtml(team.record)}</span>` : "";
    const overall = team.overallPlaceLabel
      ? `<span class="cpi521-overall">${escapeHtml(team.overallPlaceLabel)} in ${escapeHtml(division.label)}</span>`
      : "";
    const asset = assetFor(team.team, group);
    const journey = journeyUrl(group, division, team.team);
    const profile = asset.profile
      ? `<a class="cpi521-profile-link" href="${escapeHtml(asset.profile)}" aria-label="Open ${escapeHtml(team.team)} profile">Profile</a>`
      : "";
    return `<li class="cpi521-team">
      <span class="cpi521-place">${escapeHtml(team.placeLabel || "—")}</span>
      <a class="cpi521-team-journey" href="${escapeHtml(journey)}" aria-label="View ${escapeHtml(team.team)} Junior Olympics games">
        <img class="cpi521-team-logo" src="${escapeHtml(asset.logo)}" alt="" aria-hidden="true" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${fallbackLogo}'">
        <span class="cpi521-team-name"><strong>${escapeHtml(team.team)}</strong>${record}<small>View JO games →</small></span>
      </a>
      <span class="cpi521-team-meta">${overall}${profile}</span>
    </li>`;
  }

  function render() {
    const group = selectedGroup();
    if (!group) return;
    const query = normalize(teamSearch.value);
    let matchCount = 0;

    const divisionHtml = group.divisions.map((division) => {
      const subdivisionHtml = division.subdivisions.map((subdivision) => {
        const teams = query
          ? subdivision.teams.filter((team) => normalize(team.team).includes(query))
          : subdivision.teams;
        if (!teams.length) return "";
        matchCount += teams.length;
        return `<section class="cpi521-subdivision" aria-label="${escapeHtml(subdivision.label)} results">
          <header class="cpi521-subdivision-head"><h4>${escapeHtml(subdivision.label)}</h4><span>${teams.length} ${teams.length === 1 ? "team" : "teams"}</span></header>
          <ol class="cpi521-team-list">${teams.map((team) => teamRow(team, division, group)).join("")}</ol>
        </section>`;
      }).filter(Boolean).join("");

      if (!subdivisionHtml) return "";
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
    note.textContent = `${payload.notes?.join(" ") || ""} Select any team to open its complete Junior Olympics game journey.`.trim();
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
