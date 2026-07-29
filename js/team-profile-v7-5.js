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
    const label = escapeHtml(item.team || item.displayName || item.club || "WPI");
    if (!src) return `<span class="${className} team-logo-fallback">${escapeHtml((label || "WPI").slice(0, 2).toUpperCase())}</span>`;
    return `<span class="${className}"><img src="${src}" alt="${label} logo" onerror="this.closest('.${className}').classList.add('team-logo-fallback'); this.remove();"></span>`;
  }

  function findTeam(slug) {
    if (!slug) return null;
    const decoded = decodeURIComponent(slug).trim().toLowerCase();
    return rankings.find((team) => String(team.slug || "").toLowerCase() === decoded)
      || rankings.find((team) => String(team.team || "").toLowerCase() === decoded);
  }

  function groupPeers(team) {
    return rankings
      .filter((candidate) => candidate.group === team.group && candidate.slug !== team.slug)
      .sort((a, b) => Number(a.postRank || 999) - Number(b.postRank || 999))
      .slice(0, 5);
  }

  function clubPortfolio(team) {
    return rankings
      .filter((candidate) => candidate.clubSlug === team.clubSlug)
      .sort((a, b) => Number(a.postRank || 999) - Number(b.postRank || 999));
  }

  function setBrandVars(team) {
    const primary = safeColor(team.primaryColor, "#092E61");
    const secondary = safeColor(team.secondaryColor, "#D4AF37");
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
        <p>The team profile could not be matched to the current WPI rankings data.</p>
        <div class="team-actions">
          <a class="team-btn primary" href="rankings.html">Back to rankings</a>
          <a class="team-btn secondary" href="clubs.html">Explore clubs</a>
        </div>
      </section>
    `;
  }

  function renderPortfolioRows(teams, activeSlug) {
    return teams.map((team) => `
      <a class="portfolio-row ${team.slug === activeSlug ? "is-current" : ""}" href="${escapeHtml(team.teamPage || `team.html?team=${team.slug}`)}">
        <span class="portfolio-rank">#${escapeHtml(team.postRank)}</span>
        <span>
          <strong>${escapeHtml(team.team)}</strong>
          <em>${escapeHtml(team.group || "")}</em>
        </span>
        <span class="portfolio-cpi">${formatNumber(team.postCPI)}</span>
      </a>
    `).join("");
  }

  function renderPeerRows(teams) {
    if (!teams.length) return `<p class="empty-state">More teams will appear here as additional groups are added.</p>`;
    return teams.map((team) => `
      <a class="peer-row" href="${escapeHtml(team.teamPage || `team.html?team=${team.slug}`)}">
        <span>#${escapeHtml(team.postRank)}</span>
        <strong>${escapeHtml(team.team)}</strong>
        <em>${formatNumber(team.postCPI)}</em>
      </a>
    `).join("");
  }

  function renderTeamProfile(team) {
    setBrandVars(team);

    const club = clubs.find((candidate) => candidate.slug === team.clubSlug) || {};
    const portfolio = clubPortfolio(team);
    const peers = groupPeers(team);
    const logoTeam = { ...team, logo: team.logo || club.logo };
    const region = team.region || club.region || "Region TBD";
    const clubName = team.displayClubName || club.displayName || team.club;
    const clubPage = team.clubPage || club.clubPage || `club.html?club=${team.clubSlug}`;
    const gamesTracked = Number(team.gamesLatest || 0);
    const latestRecord = team.latestTournamentRecord || "Record TBD";
    const bestWin = team.bestWinClean || "Best win TBD";
    const rank = team.postRank ? `#${team.postRank}` : "—";

    document.title = `${team.team} | WPI Team Profile`;

    root.innerHTML = `
      <section class="team-hero" style="--team-watermark:url('${escapeHtml(team.logo || club.logo || "")}')">
        <div class="team-hero-copy">
          <p class="kicker">Team Profile · ${escapeHtml(team.group || "")}</p>
          <h1>${escapeHtml(team.team)}</h1>
          <p class="team-summary">
            ${escapeHtml(clubName)} profile with current WPI rank, tournament context, best-win signal, and club portfolio.
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
            <em>WPI ${formatNumber(team.postCPI)}</em>
          </div>
        </aside>
      </section>

      <section class="team-snapshot" aria-label="Team ranking snapshot">
        <article>
          <span>Current Rank</span>
          <strong>${escapeHtml(rank)}</strong>
          <em>${escapeHtml(team.group || "")}</em>
        </article>
        <article>
          <span>WPI Rating</span>
          <strong>${formatNumber(team.postCPI)}</strong>
          <em>${Number(team.cpiChange || 0) >= 0 ? "+" : ""}${formatNumber(team.cpiChange)}</em>
        </article>
        <article>
          <span>Movement</span>
          <strong class="movement-value ${movementClass(team.movement)}" aria-label="${escapeHtml(movementText(team.movement))}">
            <span class="movement-arrow" aria-hidden="true">${escapeHtml(movementIcon(team.movement))}</span>
            <span>${escapeHtml(movementLabel(team.movement))}</span>
          </strong>
          <em>${escapeHtml(movementText(team.movement))} since prior WPI update</em>
        </article>
        <article>
          <span>Games Tracked</span>
          <strong>${gamesTracked || "—"}</strong>
          <em>Latest tournament sample</em>
        </article>
      </section>

      <section class="team-content-grid">
        <article class="team-panel highlight-panel">
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

      <section class="team-content-grid lower">
        <article class="team-panel">
          <div class="section-heading">
            <p class="kicker">Club Portfolio</p>
            <h2>Other ranked teams from this club</h2>
          </div>
          <div class="portfolio-list">
            ${renderPortfolioRows(portfolio, team.slug)}
          </div>
        </article>

        <article class="team-panel">
          <div class="section-heading">
            <p class="kicker">Group Context</p>
            <h2>Nearby top teams</h2>
          </div>
          <div class="peer-list">
            ${renderPeerRows(peers)}
          </div>
        </article>
      </section>

      <section class="team-future-panel">
        <div>
          <p class="kicker">Coming in future releases</p>
          <h2>Trend chart, recent tournaments, historical movement, and story mentions</h2>
          <p>Release 7.5 establishes the dynamic team profile foundation. As more tournament data is normalized, this page can expand without changing the route structure.</p>
        </div>
      </section>
    `;
  }

  const team = findTeam(getParam("team"));
  if (!team) renderNotFound();
  else renderTeamProfile(team);
})();
