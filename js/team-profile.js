(function () {
  const data = window.CPI_TEAM_PAGES_2026_14U_BOYS || { teams: [], teamIndex: {} };

  function $(id) { return document.getElementById(id); }

  function getTeamFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return decodeURIComponent(params.get("team") || params.get("id") || params.get("slug") || "lamorinda-b").trim();
  }

  function normalizeKey(value) {
    return String(value || "").trim().toLowerCase();
  }

  function findTeam(key) {
    if (!key) return null;
    const direct = data.teamIndex[key] || data.teamIndex[normalizeKey(key)];
    if (direct) return direct;

    const slugKey = normalizeKey(key).replace(/^ca-2026-14ub-/, "");
    if (data.teamIndex[slugKey]) return data.teamIndex[slugKey];

    const byName = data.teams.find(t => normalizeKey(t.team) === normalizeKey(key));
    if (byName) return data.teamIndex[byName.slug];

    return data.teamIndex["lamorinda-b"] || data.teamIndex[data.teams[0]?.slug];
  }

  function resultClass(result) {
    if (result === "W") return "win";
    if (result === "L") return "loss";
    return "tie";
  }

  function renderResultLine(game) {
    const sf = game.source_scope === "superfinals" ? " superfinals" : "";
    const verb = game.result === "W" ? "def." : game.result === "L" ? "lost to" : "tied";
    return `
      <article class="result-row${sf}">
        <div class="result-pill ${resultClass(game.result)}">${game.result}</div>
        <div class="result-main">
          <strong>${verb} ${game.opponent}</strong>
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

  function renderAliasList(team) {
    return team.aliases.slice(0, 12).map(a => `
      <div class="alias-row">
        <span>${a.alias}</span>
        <strong>${a.count}</strong>
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

    $("recentResults").innerHTML = team.last_5.length
      ? team.last_5.map(renderResultLine).join("")
      : `<div class="empty">No recent results available.</div>`;

    $("fullGameLog").innerHTML = team.games_list.length
      ? team.games_list.map(renderResultLine).join("")
      : `<div class="empty">No game log available.</div>`;

    $("eventBreakdown").innerHTML = renderEventBreakdown(team);
    $("aliasList").innerHTML = renderAliasList(team);
    $("dataStatus").textContent = team.data_status || "team profile data loaded";
  }

  function init() {
    const team = findTeam(getTeamFromUrl());
    render(team);
    $("teamSelect").addEventListener("change", (e) => {
      const selected = findTeam(e.target.value);
      render(selected);
      const url = new URL(window.location.href);
      url.searchParams.set("team", selected.slug);
      window.history.replaceState({}, "", url);
    });
  }

  window.CPI_RENDER_TEAM_PROFILE = render;
  window.CPI_FIND_TEAM_PROFILE = findTeam;
  document.addEventListener("DOMContentLoaded", init);
})();