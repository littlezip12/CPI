(function () {
  const data = window.CPI_TEAM_PAGES_2026_14U_BOYS || { teams: [], teamIndex: {} };

  function $(id) { return document.getElementById(id); }

  function getTeamFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return decodeURIComponent(params.get("team") || params.get("id") || params.get("slug") || "lamorinda-b").trim();
  }

  function getViewFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return (params.get("view") || "overview").toLowerCase();
  }

  function normalizeKey(value) {
    return String(value || "").trim().toLowerCase();
  }

  function legacySlugCandidates(value) {
    const raw = String(value || "").trim();
    const lower = normalizeKey(raw);
    const candidates = new Set([raw, lower]);
    candidates.add(lower.replace(/^ca-2026-14ub-/, ""));
    const words = lower.replace(/^ca-2026-14ub-/, "").split("-").filter(Boolean);
    if (words.length) {
      candidates.add(words.join(" "));
      candidates.add(words.map(w => w.toUpperCase() === "wpc" ? "WPC" : w.charAt(0).toUpperCase() + w.slice(1)).join(" "));
    }
    return Array.from(candidates);
  }

  function findTeam(key) {
    if (!key) return null;

    for (const candidate of legacySlugCandidates(key)) {
      const direct = data.teamIndex[candidate] || data.teamIndex[normalizeKey(candidate)];
      if (direct) return direct;

      const slugKey = normalizeKey(candidate).replace(/^ca-2026-14ub-/, "");
      if (data.teamIndex[slugKey]) return data.teamIndex[slugKey];

      const byName = data.teams.find(t => normalizeKey(t.team) === normalizeKey(candidate));
      if (byName) return data.teamIndex[byName.slug];
    }

    return data.teamIndex["lamorinda-b"] || data.teamIndex[data.teams[0]?.slug];
  }

  function resultClass(result) {
    if (result === "W") return "win";
    if (result === "L") return "loss";
    return "tie";
  }

  function resultVerb(result) {
    if (result === "W") return "def.";
    if (result === "L") return "lost to";
    return "tied";
  }

  function renderResultLine(game) {
    const sf = game.source_scope === "superfinals" ? " superfinals" : "";
    return `
      <article class="result-row${sf}">
        <div class="result-pill ${resultClass(game.result)}">${game.result}</div>
        <div class="result-main">
          <strong>${resultVerb(game.result)} ${game.opponent}</strong>
          <span>${game.event}${game.round ? " · " + game.round : ""}</span>
        </div>
        <div class="result-score">${game.score}</div>
      </article>
    `;
  }

  function renderEventBreakdown(team) {
    return team.events.map(e => `
      <div class="event-chip">
        <strong>${e.event}</strong>
        <span>${e.game_count} games</span>
      </div>
    `).join("");
  }

  function renderTeamOptions(current) {
    return data.teams
      .slice()
      .sort((a, b) => a.team.localeCompare(b.team))
      .map(t => `<option value="${t.slug}" ${t.slug === current.slug ? "selected" : ""}>${t.team}</option>`)
      .join("");
  }

  function renderGameLog(team, limit) {
    const games = limit ? team.games_list.slice(0, limit) : team.games_list;
    return games.length ? games.map(renderResultLine).join("") : `<div class="empty">No results available.</div>`;
  }

  function setActiveView(view) {
    document.querySelectorAll("[data-view-panel]").forEach(panel => {
      panel.hidden = panel.dataset.viewPanel !== view;
    });
    document.querySelectorAll("[data-view-link]").forEach(link => {
      link.classList.toggle("active", link.dataset.viewLink === view);
    });
  }

  function render(team) {
    if (!team) return;

    document.title = `${team.team} | CPI Team Profile`;

    $("teamSelect").innerHTML = renderTeamOptions(team);
    $("profileTitle").textContent = team.team;
    $("profileSubtitle").textContent = `${team.age_group} ${team.gender} · ${team.club}`;
    $("profileRecord").textContent = team.record;
    $("profileGames").textContent = team.games_count;
    $("profileEvents").textContent = team.event_count;
    $("profileGoals").textContent = `${team.goals_for} / ${team.goals_against}`;
    $("profileDiff").textContent = team.goal_diff;

    $("recentResults").innerHTML = renderGameLog(team, 5);
    $("fullGameLog").innerHTML = renderGameLog(team);
    $("eventBreakdown").innerHTML = renderEventBreakdown(team);

    const allResultsLinks = document.querySelectorAll("[data-results-link]");
    allResultsLinks.forEach(link => {
      link.href = `team.html?team=${team.slug}&view=results`;
    });

    $("dataStatus").textContent = "Super Finals integrated · rankings paused";
  }

  function init() {
    const team = findTeam(getTeamFromUrl());
    render(team);

    const view = getViewFromUrl();
    setActiveView(view === "results" ? "results" : "overview");

    $("teamSelect").addEventListener("change", (e) => {
      const selected = findTeam(e.target.value);
      render(selected);
      const url = new URL(window.location.href);
      url.searchParams.set("team", selected.slug);
      window.history.replaceState({}, "", url);
    });

    document.querySelectorAll("[data-view-link]").forEach(link => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const view = link.dataset.viewLink;
        setActiveView(view);
        const url = new URL(window.location.href);
        url.searchParams.set("view", view);
        window.history.replaceState({}, "", url);
      });
    });
  }

  window.CPI_RENDER_TEAM_PROFILE = render;
  window.CPI_FIND_TEAM_PROFILE = findTeam;
  document.addEventListener("DOMContentLoaded", init);
})();