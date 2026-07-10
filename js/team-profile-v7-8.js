(function () {
  const rankings = window.CPI_RANKINGS || [];
  const clubs = window.CPI_CLUBS || [];
  const root = document.querySelector("#teamProfile");

  if (!root) return;

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatNumber(value, decimals = 1) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(decimals) : "—";
  }

  function movementLabel(value) {
    const number = Number(value || 0);
    if (number > 0) return `${number}`;
    if (number < 0) return `${Math.abs(number)}`;
    return "—";
  }

  function movementIcon(value) {
    const number = Number(value || 0);
    if (number > 0) return "↑";
    if (number < 0) return "↓";
    return "→";
  }

  function movementText(value) {
    const number = Number(value || 0);
    if (number > 0) return `Up ${number}`;
    if (number < 0) return `Down ${Math.abs(number)}`;
    return "No change";
  }

  function movementClass(value) {
    const number = Number(value || 0);
    if (number > 0) return "is-up";
    if (number < 0) return "is-down";
    return "is-flat";
  }

  function safeColor(value, fallback) {
    const color = String(value || "").trim();
    return /^#([0-9A-F]{3}){1,2}$/i.test(color) ? color : fallback;
  }

  function logoMarkup(item, className = "team-logo") {
    const src = escapeHtml(item.logo || "");
    const label = escapeHtml(item.team || item.displayName || item.club || "CPI");
    if (!src) return `<span class="${className} team-logo-fallback">${escapeHtml((label || "CPI").slice(0, 2).toUpperCase())}</span>`;
    return `<span class="${className}"><img src="${src}" alt="${label} logo" onerror="this.closest('.${className.split(" ")[0]}').classList.add('team-logo-fallback'); this.remove();"></span>`;
  }

  function findTeam(slug) {
    if (!slug) return null;
    const decoded = decodeURIComponent(slug).trim().toLowerCase();
    return rankings.find((team) => String(team.slug || "").toLowerCase() === decoded)
      || rankings.find((team) => String(team.team || "").toLowerCase() === decoded);
  }

  function groupSortValue(group) {
    const text = String(group || "");
    const age = Number((text.match(/\d+/) || [99])[0]);
    const gender = text.toLowerCase().includes("girls") ? 1 : 0;
    return age * 10 + gender;
  }

  function sortTeams(teams) {
    return [...teams].sort((a, b) => Number(a.postRank || 999) - Number(b.postRank || 999));
  }

  function clubPortfolio(team) {
    return sortTeams(rankings.filter((candidate) => candidate.clubSlug === team.clubSlug));
  }

  function clubGroupMap(teams) {
    return teams.reduce((map, team) => {
      const group = team.group || "Group TBD";
      if (!map.has(group)) map.set(group, []);
      map.get(group).push(team);
      return map;
    }, new Map());
  }

  function sameClubGroupTeams(team) {
    return sortTeams(rankings.filter((candidate) => candidate.clubSlug === team.clubSlug && candidate.group === team.group));
  }

  function groupPeers(team) {
    return rankings
      .filter((candidate) => candidate.group === team.group && candidate.slug !== team.slug)
      .sort((a, b) => Number(a.postRank || 999) - Number(b.postRank || 999))
      .slice(0, 6);
  }

  function setBrandVars(team, club = {}) {
    const primary = safeColor(club.primaryColor || team.primaryColor, "#092E61");
    const secondary = safeColor(club.secondaryColor || team.secondaryColor, "#D4AF37");
    const target = document.querySelector(".team-profile-page") || document.documentElement;

    target.style.setProperty("--team-primary", primary);
    target.style.setProperty("--team-secondary", secondary);
    target.style.setProperty("--team-primary-soft", `${primary}18`);
    target.style.setProperty("--team-secondary-soft", `${secondary}24`);
  }

  function renderNotFound() {
    root.innerHTML = `
      <section class="team-profile-not-found">
        <p class="kicker">Team Profile</p>
        <h1>Team not found</h1>
        <p>The team profile could not be matched to the current CPI rankings data.</p>
        <div class="team-actions">
          <a class="team-btn primary" href="rankings.html">Back to rankings</a>
          <a class="team-btn secondary" href="clubs.html">Explore clubs</a>
        </div>
      </section>
    `;
  }

  function renderClubRail(club, teams, activeTeam) {
    const groups = [...clubGroupMap(teams).entries()].sort(([a], [b]) => groupSortValue(a) - groupSortValue(b));
    const clubName = club.displayName || activeTeam.displayClubName || activeTeam.club;

    return `<aside class="team-club-rail" aria-label="${escapeHtml(clubName)} team navigation">
      <div class="team-club-rail-head">
        ${logoMarkup({ ...club, logo: club.logo || activeTeam.logo }, "team-logo lg")}
        <div>
          <span>Club navigation</span>
          <strong>${escapeHtml(clubName)}</strong>
        </div>
      </div>
      <a class="team-rail-club-link" href="${escapeHtml(activeTeam.clubPage || club.clubPage || `club.html?club=${activeTeam.clubSlug}`)}">View full club profile →</a>
      <div class="team-rail-groups">
        ${groups.map(([group, groupTeams]) => `<section class="team-rail-group ${group === activeTeam.group ? "is-open" : ""}">
          <h2>${escapeHtml(group)} <span>${groupTeams.length}</span></h2>
          <div>
            ${sortTeams(groupTeams).map((team) => `<a class="team-rail-team ${team.slug === activeTeam.slug ? "is-current" : ""}" href="${escapeHtml(team.teamPage || `team.html?team=${team.slug}`)}">
              <span>#${escapeHtml(team.postRank || "—")}</span>
              <strong>${escapeHtml(team.team)}</strong>
              <em>${formatNumber(team.postCPI)}</em>
            </a>`).join("")}
          </div>
        </section>`).join("")}
      </div>
    </aside>`;
  }

  function renderSameGroupRows(teams, activeSlug) {
    if (!teams.length) return `<p class="empty-state">Same-group club teams will appear here as additional teams are added.</p>`;
    return teams.map((team) => `<a class="same-group-card ${team.slug === activeSlug ? "is-current" : ""}" href="${escapeHtml(team.teamPage || `team.html?team=${team.slug}`)}">
      ${logoMarkup(team, "team-logo")}
      <div>
        <strong>${escapeHtml(team.team)}</strong>
        <span>#${escapeHtml(team.postRank || "—")} · ${formatNumber(team.postCPI)} CPI</span>
      </div>
      <em class="${movementClass(team.movement)}">${movementIcon(team.movement)} ${movementLabel(team.movement)}</em>
    </a>`).join("");
  }

  function renderPeerRows(teams) {
    if (!teams.length) return `<p class="empty-state">Nearby teams will appear here as additional groups are added.</p>`;
    return teams.map((team) => `
      <a class="peer-row" href="${escapeHtml(team.teamPage || `team.html?team=${team.slug}`)}">
        <span>#${escapeHtml(team.postRank)}</span>
        <strong>${escapeHtml(team.team)}</strong>
        <em>${formatNumber(team.postCPI)}</em>
      </a>
    `).join("");
  }

  function renderTeamProfile(team) {
    const club = clubs.find((candidate) => candidate.slug === team.clubSlug) || {};
    setBrandVars(team, club);

    const portfolio = clubPortfolio(team);
    const sameGroup = sameClubGroupTeams(team);
    const peers = groupPeers(team);
    const logoTeam = { ...team, logo: team.logo || club.logo };
    const region = team.region || club.region || "Region TBD";
    const clubName = team.displayClubName || club.displayName || team.club;
    const clubPage = team.clubPage || club.clubPage || `club.html?club=${team.clubSlug}`;
    const gamesTracked = Number(team.gamesLatest || 0);
    const latestRecord = team.latestTournamentRecord || "Record TBD";
    const bestWin = team.bestWinClean || "Best win TBD";
    const rank = team.postRank ? `#${team.postRank}` : "—";

    document.title = `${team.team} | CPI Team Profile`;

    root.innerHTML = `<section class="team-profile-layout">
      ${renderClubRail(club, portfolio, team)}
      <div class="team-profile-main">
        <section class="team-hero" style="--team-watermark:url('${escapeHtml(team.logo || club.logo || "")}')">
          <div class="team-hero-copy">
            <p class="kicker">Team Profile · ${escapeHtml(team.group || "")}</p>
            <h1>${escapeHtml(team.team)}</h1>
            <p class="team-summary">
              ${escapeHtml(clubName)} profile with current CPI rank, tournament context, best-win signal, and club portfolio.
            </p>
            <div class="team-meta">
              <a href="${escapeHtml(clubPage)}">${escapeHtml(clubName)}</a>
              <span>${escapeHtml(region)}</span>
              <span>${escapeHtml(team.latestTournament || "Tournament context TBD")}</span>
            </div>
            <div class="team-actions">
              <a class="team-btn primary" href="${escapeHtml(clubPage)}">View club profile</a>
              <a class="team-btn secondary" href="rankings.html">Back to rankings</a>
            </div>
          </div>
          <aside class="team-hero-card">
            ${logoMarkup(logoTeam, "team-logo xl")}
            <div>
              <span class="eyebrow">Current Rank</span>
              <strong>${escapeHtml(rank)}</strong>
              <em>CPI ${formatNumber(team.postCPI)}</em>
            </div>
          </aside>
        </section>

        <nav class="profile-tabs" aria-label="Team profile sections">
          <a href="#team-intelligence">Overview</a>
          <a href="#club-age-group">Club age group</a>
          <a href="#statewide-context">Statewide context</a>
          <a href="#future-modules">Future modules</a>
        </nav>

        <section class="team-snapshot" aria-label="Team ranking snapshot">
          <article>
            <span>Current Rank</span>
            <strong>${escapeHtml(rank)}</strong>
            <em>${escapeHtml(team.group || "")}</em>
          </article>
          <article>
            <span>CPI Rating</span>
            <strong>${formatNumber(team.postCPI)}</strong>
            <em>${Number(team.cpiChange || 0) >= 0 ? "+" : ""}${formatNumber(team.cpiChange)}</em>
          </article>
          <article>
            <span>Movement</span>
            <strong class="movement-value ${movementClass(team.movement)}" aria-label="${escapeHtml(movementText(team.movement))}">
              <span class="movement-arrow" aria-hidden="true">${escapeHtml(movementIcon(team.movement))}</span>
              <span>${escapeHtml(movementLabel(team.movement))}</span>
            </strong>
            <em>${escapeHtml(movementText(team.movement))} since prior CPI update</em>
          </article>
          <article>
            <span>Games Tracked</span>
            <strong>${gamesTracked || "—"}</strong>
            <em>Latest tournament sample</em>
          </article>
        </section>

        <section class="team-content-grid">
          <article id="team-intelligence" class="team-panel highlight-panel">
            <div class="section-heading">
              <p class="kicker">Team Intelligence</p>
              <h2>Current competitive profile</h2>
            </div>
            <div class="intelligence-grid">
              <div>
                <span>Latest tournament</span>
                <strong>${escapeHtml(team.latestTournament || "TBD")}</strong>
                <em>${escapeHtml(latestRecord)}</em>
              </div>
              <div>
                <span>Best win signal</span>
                <strong>${escapeHtml(bestWin)}</strong>
                <em>Quality result in current data set</em>
              </div>
              <div>
                <span>Club footprint</span>
                <strong>${portfolio.length}</strong>
                <em>Ranked team${portfolio.length === 1 ? "" : "s"} from ${escapeHtml(clubName)}</em>
              </div>
              <div>
                <span>Ranking context</span>
                <strong>${escapeHtml(team.ageGroup || "")} ${escapeHtml(team.gender || "")}</strong>
                <em>Verified tournament results only</em>
              </div>
            </div>
          </article>

          <aside class="team-panel brand-panel">
            <div class="section-heading">
              <p class="kicker">Club Identity</p>
              <h2>${escapeHtml(clubName)}</h2>
            </div>
            <div class="brand-card">
              ${logoMarkup({ ...club, logo: club.logo || team.logo }, "team-logo lg")}
              <div>
                <strong>${escapeHtml(region)}</strong>
                <span>${club.website ? `<a href="${escapeHtml(club.website)}" target="_blank" rel="noopener">Official website</a>` : "Website TBD"}</span>
              </div>
            </div>
          </aside>
        </section>

        <section id="club-age-group" class="team-panel same-group-panel">
          <div class="section-heading with-note">
            <div>
              <p class="kicker">Club age group</p>
              <h2>All ${escapeHtml(clubName)} ${escapeHtml(team.group || "teams")}</h2>
            </div>
            <span>${sameGroup.length} team${sameGroup.length === 1 ? "" : "s"}</span>
          </div>
          <div class="same-group-grid">
            ${renderSameGroupRows(sameGroup, team.slug)}
          </div>
        </section>

        <section class="team-content-grid lower">
          <article id="statewide-context" class="team-panel">
            <div class="section-heading">
              <p class="kicker">Statewide context</p>
              <h2>Nearby top teams in ${escapeHtml(team.group || "this group")}</h2>
            </div>
            <div class="peer-list">
              ${renderPeerRows(peers)}
            </div>
          </article>
          <article id="future-modules" class="team-future-panel compact">
            <div>
              <p class="kicker">Coming in future releases</p>
              <h2>Trend chart, recent tournaments, historical movement, and story mentions</h2>
              <p>Release 7.8 refines the profile visual system while preserving the dynamic club and team data foundation.</p>
            </div>
          </article>
        </section>
      </div>
    </section>`;
  }

  const team = findTeam(getParam("team"));
  if (!team) renderNotFound();
  else renderTeamProfile(team);
})();
