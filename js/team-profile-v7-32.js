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


  function isQuiksilverTeam(team) {
    const text = `${team.latestTournament || ""} ${team.notes || ""}`.toLowerCase();
    return text.includes("quiksilver") || text.includes("quicksilver");
  }

  function storyLinkForTeam(team) {
    if (isQuiksilverTeam(team)) {
      return {
        href: "stories/quicksilver-cup-2026.html",
        label: "Read Quiksilver Cup note",
        title: "Quiksilver Cup evidence included"
      };
    }
    return {
      href: "stories/pre-jo-rankings-context.html",
      label: "Read WPI ranking context",
      title: "Pre-JO ranking context"
    };
  }

  function evidenceStatus(team) {
    if (isQuiksilverTeam(team)) return "Quiksilver included as a lightweight secondary signal";
    if (team.latestTournament) return "Latest tournament evidence reflected in current profile";
    return "Tournament evidence review pending";
  }

  function cleanRecord(value) {
    const text = String(value || "").trim();
    return text && text.toLowerCase() !== "record tbd" ? text : "Record context pending";
  }

  function qualitySignal(team) {
    const text = String(team.bestWinClean || team.bestWin || "").trim();
    if (!text || text.toLowerCase().includes("tbd")) return "Quality-result signal pending";
    return text;
  }

  function safeColor(value, fallback) {
    const color = String(value || "").trim();
    return /^#([0-9A-F]{3}){1,2}$/i.test(color) ? color : fallback;
  }

  function logoMarkup(item, className = "team-logo") {
    const src = escapeHtml(item.logo || "");
    const label = escapeHtml(item.team || item.displayName || item.club || "WPI");
    if (!src) return `<span class="${className} team-logo-fallback">${escapeHtml((label || "WPI").slice(0, 2).toUpperCase())}</span>`;
    return `<span class="${className}"><img src="${src}" alt="${label} logo" onerror="this.closest('.${className.split(" ")[0]}').classList.add('team-logo-fallback'); this.remove();"></span>`;
  }

  function normalizeSlug(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function teamPageSlug(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      const url = new URL(raw, window.location.href);
      return normalizeSlug(url.searchParams.get("team") || raw);
    } catch (error) {
      const match = raw.match(/[?&]team=([^&]+)/);
      return normalizeSlug(match ? decodeURIComponent(match[1]) : raw);
    }
  }

  function parseSlugWithGroup(value) {
    const normalized = normalizeSlug(value);
    const match = normalized.match(/^(.*?)-(10u|12u|14u|16u|18u)-(boys|girls)$/);
    if (!match) return { baseSlug: normalized, group: "" };
    const age = match[2].toUpperCase();
    const gender = match[3] === "girls" ? "Girls" : "Boys";
    return { baseSlug: match[1], group: `${age} ${gender}` };
  }

  function findTeam(slug) {
    if (!slug) return null;
    const decoded = decodeURIComponent(slug).trim();
    const normalized = normalizeSlug(decoded);
    const parsed = parseSlugWithGroup(decoded);

    const exact = rankings.find((team) => normalizeSlug(team.slug) === normalized)
      || rankings.find((team) => teamPageSlug(team.teamPage) === normalized)
      || rankings.find((team) => normalizeSlug(team.team) === normalized);

    if (exact) return exact;

    if (parsed.group && parsed.baseSlug) {
      return rankings.find((team) => team.group === parsed.group && normalizeSlug(team.slug) === parsed.baseSlug)
        || rankings.find((team) => team.group === parsed.group && teamPageSlug(team.teamPage) === parsed.baseSlug)
        || rankings.find((team) => team.group === parsed.group && normalizeSlug(team.team) === parsed.baseSlug)
        || rankings.find((team) => team.group === parsed.group && normalizeSlug(team.clubSlug) === parsed.baseSlug && Number(team.teamDepth || 1) === 1)
        || rankings.find((team) => team.group === parsed.group && normalizeSlug(team.club) === parsed.baseSlug && Number(team.teamDepth || 1) === 1);
    }

    return null;
  }

  function groupSortValue(group) {
    const text = String(group || "");
    const age = Number((text.match(/\d+/) || [99])[0]);
    const gender = text.toLowerCase().includes("girls") ? 1 : 0;
    return age * 10 + gender;
  }

  function groupHref(group) {
    const text = String(group || "").toLowerCase();
    const age = (text.match(/\d+u/) || [""])[0];
    const gender = text.includes("girls") ? "girls" : text.includes("boys") ? "boys" : "";
    return age && gender ? `rankings.html?group=${age}-${gender}` : "rankings.html";
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
    const requested = getParam("team");
    root.innerHTML = `
      <section class="team-profile-not-found">
        <p class="kicker">Team Profile</p>
        <h1>Team not found</h1>
        <p>The team profile could not be matched to the current WPI rankings data.${requested ? ` Requested profile: <strong>${escapeHtml(requested)}</strong>.` : ""}</p>
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
        <span>#${escapeHtml(team.postRank || "—")} · ${formatNumber(team.postCPI)} WPI</span>
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
    const bestWin = qualitySignal(team);
    const rank = team.postRank ? `#${team.postRank}` : "—";
    const storyLink = storyLinkForTeam(team);
    const latestEvidence = team.latestTournament || "Evidence pending";

    document.title = `${team.team} | WPI Team Profile`;

    root.innerHTML = `<section class="team-profile-layout">
      ${renderClubRail(club, portfolio, team)}
      <div class="team-profile-main">
        <section class="team-hero" style="--team-watermark:url('${escapeHtml(team.logo || club.logo || "")}')">
          <div class="team-hero-copy">
            <p class="kicker">Team Profile · ${escapeHtml(team.group || "")}</p>
            <h1>${escapeHtml(team.team)}</h1>
            <p class="team-summary">
              ${escapeHtml(clubName)} profile with current WPI rank, latest evidence, same-age club context, and statewide comparison.
            </p>
            <div class="team-meta">
              <a href="${escapeHtml(clubPage)}">${escapeHtml(clubName)}</a>
              <span>${escapeHtml(region)}</span>
              <span>${escapeHtml(team.latestTournament || "Tournament context TBD")}</span>
            </div>
            <div class="team-actions">
              <a class="team-btn primary" href="${escapeHtml(clubPage)}">View club profile</a>
              <a class="team-btn secondary" href="${escapeHtml(groupHref(team.group))}">Back to rankings</a>
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

        <nav class="profile-tabs" aria-label="Team profile sections">
          <a href="#team-intelligence">Overview</a>
          <a href="#club-age-group">Club lineup</a>
          <a href="#statewide-context">Statewide context</a>
          <a href="#profile-notes">Data notes</a>
        </nav>

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
            <span>Latest Evidence</span>
            <strong class="snapshot-text">${escapeHtml(latestEvidence)}</strong>
            <em>${gamesTracked ? `${gamesTracked} game${gamesTracked === 1 ? "" : "s"} tracked` : evidenceStatus(team)}</em>
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
                <span>Latest evidence</span>
                <strong>${escapeHtml(latestEvidence)}</strong>
                <em>${escapeHtml(cleanRecord(latestRecord))}</em>
              </div>
              <div>
                <span>Quality signal</span>
                <strong>${escapeHtml(bestWin)}</strong>
                <em>Context-only signal, not a standalone rank driver</em>
              </div>
              <div>
                <span>Club footprint</span>
                <strong>${portfolio.length}</strong>
                <em>Ranked team${portfolio.length === 1 ? "" : "s"} from ${escapeHtml(clubName)}</em>
              </div>
              <div>
                <span>Data status</span>
                <strong>${escapeHtml(evidenceStatus(team))}</strong>
                <em>${escapeHtml(team.ageGroup || "")} ${escapeHtml(team.gender || "")} · Pre-JO profile</em>
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
                <span><a href="${escapeHtml(groupHref(team.group))}">View ${escapeHtml(team.group || "group")} rankings</a></span>
                <span><a href="${escapeHtml(storyLink.href)}">${escapeHtml(storyLink.label)}</a></span>
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
          <article id="profile-notes" class="team-panel profile-notes-panel">
            <div class="section-heading">
              <p class="kicker">Data notes</p>
              <h2>${escapeHtml(storyLink.title)}</h2>
            </div>
            <ul class="profile-note-list">
              <li>Current rankings are pre-JO profiles and may change after alias review and post-JO recalibration.</li>
              <li>${escapeHtml(evidenceStatus(team))}.</li>
              <li>Team-depth, A/B/C/D naming, and club identity issues are tracked separately in the WPI QA files.</li>
            </ul>
            <a class="team-btn secondary profile-note-link" href="${escapeHtml(storyLink.href)}">${escapeHtml(storyLink.label)} →</a>
          </article>
        </section>
      </div>
    </section>`;
  }

  const team = findTeam(getParam("team"));
  if (!team) renderNotFound();
  else renderTeamProfile(team);
})();
