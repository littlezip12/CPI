/* WPI 7.53.0 — adaptive, sponsor-ready club profiles */
(function () {
  const root = document.querySelector("#clubProfileApp");
  if (!root) return;

  const clubs = Array.isArray(window.CPI_CLUBS) ? window.CPI_CLUBS : [];
  const rankings = Array.isArray(window.CPI_RANKINGS) ? window.CPI_RANKINGS : [];
  const joProfiles = window.WPI_JO_PROFILES || { clubs: {}, teams: {} };
  const historicalProfiles = window.CPI_HISTORICAL_PROFILES || { clubs: {} };
  const params = new URLSearchParams(window.location.search || "");
  const LOGO_VERSION = "7.53.0";

  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  const number = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const normalizeSlug = (value) => String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const groupSortValue = (group) => {
    const text = String(group || "");
    const age = Number((text.match(/\d+/) || [99])[0]);
    const gender = text.toLowerCase().includes("girls") ? 1 : 0;
    return age * 10 + gender;
  };

  const formatWpi = (value) => {
    const parsed = number(value, NaN);
    return Number.isFinite(parsed) ? parsed.toFixed(1) : "—";
  };

  const ordinal = (value) => {
    const n = number(value, 0);
    if (!n) return "—";
    const mod100 = n % 100;
    const suffix = mod100 >= 11 && mod100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th");
    return `${n}${suffix}`;
  };

  const safeLogo = (club) => {
    const src = String(club?.logo || "assets/logos/cpi-logo-fallback.svg");
    if (!src.includes("assets/logos/")) return src;
    return `${src}${src.includes("?") ? "&" : "?"}v=${LOGO_VERSION}`;
  };

  const safeName = (club) => club?.displayName || club?.club || club?.name || club?.slug || "Club";
  const teamHref = (team) => team?.teamPage || `team.html?team=${encodeURIComponent(team?.slug || team?.profileSlug || "")}`;
  const groupHref = (group) => `rankings.html?group=${encodeURIComponent(normalizeSlug(group || "12U Boys"))}`;

  function clubTeams(club) {
    const embedded = Array.isArray(club?.teams) ? club.teams : [];
    if (embedded.length) return embedded;
    return rankings.filter((team) => team.clubSlug === club?.slug || team.canonicalClubId === club?.canonicalClubId);
  }

  function rankedTeams(club) {
    return clubTeams(club)
      .filter((team) => number(team.postRank, 0) > 0)
      .sort((a, b) => number(a.postRank, 9999) - number(b.postRank, 9999));
  }

  function joForClub(club) {
    return club?.canonicalClubId ? joProfiles.clubs?.[club.canonicalClubId] || null : null;
  }

  function historyForClub(club) {
    return club?.canonicalClubId ? historicalProfiles.clubs?.[club.canonicalClubId] || null : null;
  }

  function connectedTeams(club, joClub) {
    const ranked = rankedTeams(club).map((team) => ({ ...team, profileKind: "ranked" }));
    const byCanonical = new Map(ranked.filter((team) => team.canonicalTeamId).map((team) => [team.canonicalTeamId, team]));
    const output = [...ranked];
    for (const jo of (joClub?.teams || [])) {
      const match = jo.canonicalTeamId ? byCanonical.get(jo.canonicalTeamId) : null;
      if (match) {
        Object.assign(match, {
          joRecord: jo.record,
          joDivision: jo.division,
          joSubdivision: jo.subdivision,
          joDivisionPlace: jo.divisionPlace,
          joDivisionPlaceLabel: jo.divisionPlaceLabel,
          joJourneyUrl: jo.journeyUrl,
          joResultsUrl: jo.resultsUrl,
        });
      } else {
        output.push({ ...jo, profileKind: "jo", postRank: null, postCPI: null });
      }
    }
    return output.sort((a, b) => groupSortValue(a.group) - groupSortValue(b.group)
      || number(a.postRank, 9999) - number(b.postRank, 9999)
      || String(a.team || a.displayTeamName || "").localeCompare(String(b.team || b.displayTeamName || "")));
  }

  function profileMetrics(club, ranked, joClub, history) {
    const rankedCount = ranked.length;
    const bestRank = rankedCount ? Math.min(...ranked.map((team) => number(team.postRank, 9999))) : 0;
    const average = rankedCount ? ranked.reduce((sum, team) => sum + number(team.postCPI), 0) / rankedCount : 0;
    const top25 = ranked.filter((team) => number(team.postRank, 9999) <= 25).length;
    const joTeams = joClub?.teams || [];
    const joGames = joTeams.reduce((sum, team) => sum + number(team.recordSummary?.games), 0);
    const historySummary = history?.summary || {};
    const groups = new Set([...ranked, ...joTeams].map((team) => team.group).filter(Boolean));
    const genders = new Set([...ranked, ...joTeams].map((team) => team.gender).filter(Boolean));
    return {
      rankedCount,
      bestRank,
      average,
      top25,
      joCount: joTeams.length,
      joGames,
      bestJoFinish: number(joClub?.bestDivisionFinish, 0),
      groups: [...groups].sort((a, b) => groupSortValue(a) - groupSortValue(b)),
      genders: [...genders].sort(),
      events: number(historySummary.events),
      finalGames: number(historySummary.finalGames),
      bestHistoricalFinish: number(historySummary.bestFinish),
      mode: rankedCount ? "ranked" : joTeams.length ? "tournament" : history ? "archive" : "identity",
    };
  }

  function summaryCopy(club, metrics) {
    const name = safeName(club);
    const parts = [];
    if (metrics.rankedCount) parts.push(`${metrics.rankedCount} ranked WPI team${metrics.rankedCount === 1 ? "" : "s"}`);
    if (metrics.joCount) parts.push(`${metrics.joCount} verified 2026 Junior Olympics entr${metrics.joCount === 1 ? "y" : "ies"}`);
    if (metrics.events) parts.push(`${metrics.events} additional tournament event${metrics.events === 1 ? "" : "s"} in the WPI archive`);
    if (!parts.length) return `${name} has an active WPI club profile. Team and tournament information will expand as verified results are connected.`;
    return `${name} is connected to ${parts.join(", ")}. Rankings, results and team pathways are organized below in one club view.`;
  }

  function logoMarkup(club) {
    return `<span class="wpi-club-logo"><img src="${escapeHtml(safeLogo(club))}" alt="${escapeHtml(safeName(club))} logo" onerror="this.onerror=null;this.src='assets/logos/cpi-logo-fallback.svg?v=${LOGO_VERSION}'"></span>`;
  }

  function metricCard(label, value, note) {
    return `<article class="wpi-club-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></article>`;
  }

  function renderSnapshot(metrics) {
    if (metrics.mode === "ranked") {
      return [
        metricCard("Best current rank", metrics.bestRank ? `#${metrics.bestRank}` : "—", "Across all ranked teams"),
        metricCard("Ranked teams", metrics.rankedCount, "Current WPI portfolio"),
        metricCard("Average WPI", formatWpi(metrics.average), "Across ranked teams"),
        metricCard("Top 25 teams", metrics.top25, "Current rankings"),
      ].join("");
    }
    if (metrics.mode === "tournament") {
      return [
        metricCard("JO teams", metrics.joCount, "Verified 2026 entries"),
        metricCard("Age groups", metrics.groups.length, "Program footprint"),
        metricCard("Best JO finish", metrics.bestJoFinish ? `#${metrics.bestJoFinish}` : "—", "Division placement"),
        metricCard("JO games", metrics.joGames || "—", "Completed team games"),
      ].join("");
    }
    if (metrics.mode === "archive") {
      return [
        metricCard("Events", metrics.events, "Connected tournaments"),
        metricCard("Final games", metrics.finalGames, "Verified results"),
        metricCard("Best finish", metrics.bestHistoricalFinish ? `#${metrics.bestHistoricalFinish}` : "—", "Connected placements"),
        metricCard("Age groups", metrics.groups.length || "—", "Program footprint"),
      ].join("");
    }
    return [
      metricCard("Profile status", "Active", "Club identity connected"),
      metricCard("Region", club?.region || "—", "WPI geography"),
      metricCard("Teams", "—", "Results pending"),
      metricCard("Events", "—", "Results pending"),
    ].join("");
  }

  function bestSignal(ranked, joClub, history) {
    const top = ranked[0];
    if (top) {
      return `<a class="wpi-club-signal" href="${escapeHtml(teamHref(top))}"><span>Top-ranked team</span><strong>#${escapeHtml(top.postRank)} ${escapeHtml(top.team)}</strong><small>${escapeHtml(top.group || "Age group")} · ${formatWpi(top.postCPI)} WPI</small><b>View team →</b></a>`;
    }
    const bestJo = [...(joClub?.teams || [])].sort((a, b) => number(a.divisionPlace, 9999) - number(b.divisionPlace, 9999))[0];
    if (bestJo) {
      return `<a class="wpi-club-signal" href="${escapeHtml(bestJo.teamPage || bestJo.journeyUrl || "tournaments.html")}"><span>Best verified JO result</span><strong>${escapeHtml(bestJo.team || bestJo.displayTeamName)} · ${escapeHtml(bestJo.divisionPlaceLabel || ordinal(bestJo.divisionPlace))}</strong><small>${escapeHtml(bestJo.group || "Age group")} · ${escapeHtml(bestJo.division || "Division")}</small><b>View result →</b></a>`;
    }
    const bestFinish = number(history?.summary?.bestFinish, 0);
    return `<div class="wpi-club-signal is-static"><span>Competitive record</span><strong>${bestFinish ? `Best connected finish #${bestFinish}` : "Results are being connected"}</strong><small>WPI publishes verified tournament information as it becomes available.</small></div>`;
  }

  function renderTeamGroups(teams) {
    const grouped = new Map();
    teams.forEach((team) => {
      const group = team.group || "Group TBD";
      if (!grouped.has(group)) grouped.set(group, []);
      grouped.get(group).push(team);
    });
    if (!grouped.size) return `<div class="wpi-club-empty"><strong>No connected teams yet</strong><p>Verified team records will appear here when they are added to WPI.</p></div>`;
    return [...grouped.entries()]
      .sort(([a], [b]) => groupSortValue(a) - groupSortValue(b))
      .map(([group, groupTeams]) => {
        const sorted = [...groupTeams].sort((a, b) => number(a.postRank, 9999) - number(b.postRank, 9999));
        const best = sorted.find((team) => team.profileKind === "ranked");
        return `<article class="wpi-club-group-card">
          <header><div><span>Age group</span><h3>${escapeHtml(group)}</h3></div><b>${sorted.length} team${sorted.length === 1 ? "" : "s"}</b></header>
          <div class="wpi-club-group-stats"><span><small>Best rank</small><strong>${best?.postRank ? `#${escapeHtml(best.postRank)}` : "—"}</strong></span><span><small>JO entries</small><strong>${sorted.filter((team) => team.joRecord || team.profileKind === "jo").length}</strong></span></div>
          <div class="wpi-club-team-cards">${sorted.map((team) => {
            const isJoOnly = team.profileKind === "jo";
            const name = team.team || team.displayTeamName || "Team";
            const href = isJoOnly ? (team.teamPage || team.journeyUrl || "tournaments.html") : teamHref(team);
            const rank = isJoOnly ? "JO" : `#${escapeHtml(team.postRank || "—")}`;
            const primary = isJoOnly ? (team.record || team.divisionPlaceLabel || "JO result") : `${formatWpi(team.postCPI)} WPI`;
            const detail = isJoOnly
              ? `${team.division || "Junior Olympics"}${team.subdivision ? ` · ${team.subdivision}` : ""}${team.divisionPlaceLabel ? ` · ${team.divisionPlaceLabel}` : ""}`
              : `${team.latestTournament || "Current ranking"}${team.joRecord ? ` · JO ${team.joRecord}` : ""}`;
            return `<a href="${escapeHtml(href)}"><span class="wpi-club-team-rank">${rank}</span><div><strong>${escapeHtml(name)}</strong><small>${escapeHtml(detail)}</small></div><em>${escapeHtml(primary)}</em><b>→</b></a>`;
          }).join("")}</div>
        </article>`;
      }).join("");
  }

  function renderJoTournament(joClub) {
    if (!joClub?.teams?.length) return "";
    const teams = joClub.teams;
    const wins = teams.reduce((sum, team) => sum + number(team.recordSummary?.wins), 0);
    const losses = teams.reduce((sum, team) => sum + number(team.recordSummary?.losses), 0);
    return `<article class="wpi-club-event is-featured">
      <header><div><span>Featured tournament</span><h3>2026 Junior Olympics</h3><p>${teams.length} team${teams.length === 1 ? "" : "s"} · ${wins}-${losses} combined record</p></div><a href="tournaments.html#jo-results">Full JO results →</a></header>
      <div class="wpi-club-result-grid">${teams.map((team) => `<a href="${escapeHtml(team.teamPage || team.journeyUrl || "tournaments.html")}">
        <span>${escapeHtml(team.group || "Age group")} · ${escapeHtml(team.division || "Division")}</span>
        <strong>${escapeHtml(team.team || team.displayTeamName)}</strong>
        <em>${escapeHtml(team.record || "Record available")}</em>
        <b>${escapeHtml(team.divisionPlaceLabel || team.subdivisionPlaceLabel || "View")}</b>
      </a>`).join("")}</div>
    </article>`;
  }

  function recordLabel(summary = {}) {
    const finals = number(summary.finalGames);
    if (!finals) return `${number(summary.scheduledGames)} schedule${number(summary.scheduledGames) === 1 ? "" : "s"}`;
    return `${number(summary.wins)}-${number(summary.losses)}${number(summary.ties) ? `-${number(summary.ties)}` : ""}`;
  }

  function renderHistoricalTournament(history) {
    if (!history) return "";
    const appearances = history.appearances || [];
    const recent = history.recentGames || [];
    return `<article class="wpi-club-event">
      <header><div><span>Additional tournament history</span><h3>${number(history.summary?.events)} connected event${number(history.summary?.events) === 1 ? "" : "s"}</h3><p>${number(history.summary?.finalGames)} verified finals · ${recordLabel(history.summary)}</p></div><a href="tournament-archive.html?club=${encodeURIComponent(history.canonicalClubId || "")}">Search archive →</a></header>
      ${appearances.length ? `<div class="wpi-club-event-list">${appearances.slice(0, 8).map((appearance) => `<article><span>${escapeHtml(appearance.eventName || "Tournament")}</span><strong>${escapeHtml(appearance.divisionLabel || "Division")}</strong><small>${escapeHtml(recordLabel(appearance))}${appearance.bestFinish ? ` · Best #${escapeHtml(appearance.bestFinish)}` : ""}</small>${appearance.eventPublicPath ? `<a href="${escapeHtml(appearance.eventPublicPath)}">Tournament page →</a>` : ""}</article>`).join("")}</div>` : ""}
      ${recent.length ? `<div class="wpi-club-recent"><h4>Recent connected results</h4>${recent.slice(0, 8).map((game) => `<article><div><span>${escapeHtml(game.eventName || "Tournament")} · ${escapeHtml(game.divisionLabel || "Division")}</span><strong>${escapeHtml(game.teamName || "Club team")} vs ${escapeHtml(game.opponentName || "Opponent")}</strong></div><div><b>${escapeHtml(game.status === "final" ? `${game.result ? `${game.result} ` : ""}${game.scoreDisplay || "Final"}` : "Scheduled")}</b><small>${escapeHtml(game.stageDisplay || game.stage || game.dateLabel || "")}</small></div></article>`).join("")}</div>` : ""}
    </article>`;
  }

  function renderProgramOverview(club, metrics) {
    const websiteLabel = club.website ? "Club website connected" : (club.websiteStatus === "no_site_found" ? "No public club site found" : "Website not yet connected");
    const location = club.locationLabel || [club.city, club.state].filter(Boolean).join(", ") || club.region || "Location pending";
    return `<section id="club-overview" class="wpi-club-panel wpi-club-overview">
      <div class="wpi-club-section-heading"><div><span>Program overview</span><h2>Club at a glance</h2></div><p>Current WPI identity and competitive footprint.</p></div>
      <div class="wpi-club-fact-grid">
        <article><span>Location</span><strong>${escapeHtml(location)}</strong><small>${escapeHtml(club.region || "WPI region")}</small></article>
        <article><span>Age groups</span><strong>${metrics.groups.length || "—"}</strong><small>${escapeHtml(metrics.groups.join(" · ") || "Teams pending")}</small></article>
        <article><span>Gender coverage</span><strong>${escapeHtml(metrics.genders.join(" + ") || "—")}</strong><small>Connected WPI teams</small></article>
        <article><span>Digital presence</span><strong>${club.website ? "Connected" : "Not listed"}</strong><small>${escapeHtml(websiteLabel)}</small></article>
      </div>
    </section>`;
  }

  function renderSponsorModule(club) {
    return `<section id="club-partners" class="wpi-club-partner-panel">
      <div><span>WPI partner opportunity</span><h2>Support youth water polo in ${escapeHtml(club.region || "this region")}</h2><p>Club-profile and regional sponsorship placements are available. Sponsorship is clearly labeled and never influences WPI rankings, results or editorial decisions.</p></div>
      <a href="subscribe.html">Partner with WPI →</a>
    </section>`;
  }

  const requestedSlug = normalizeSlug(params.get("club"));
  const club = requestedSlug ? clubs.find((item) => normalizeSlug(item.slug) === requestedSlug) : null;
  if (!club) {
    root.innerHTML = `<section class="wpi-club-not-found"><span>WPI club profile</span><h1>Club not found</h1><p>The requested club could not be matched to the current WPI registry.</p><a href="clubs.html">Explore all clubs →</a></section>`;
    return;
  }

  const ranked = rankedTeams(club);
  const joClub = joForClub(club);
  const history = historyForClub(club);
  const teams = connectedTeams(club, joClub);
  const metrics = profileMetrics(club, ranked, joClub, history);
  const top = ranked[0];
  const primary = club.primaryColor || top?.primaryColor || "#0b4fb3";
  const secondary = club.secondaryColor || top?.secondaryColor || "#f6b700";
  const pageTarget = document.querySelector(".club-profile-page") || document.documentElement;
  pageTarget.style?.setProperty?.("--profile-primary", primary);
  pageTarget.style?.setProperty?.("--profile-secondary", secondary);
  pageTarget.style?.setProperty?.("--profile-primary-soft", `${primary}20`);
  pageTarget.style?.setProperty?.("--profile-secondary-soft", `${secondary}24`);
  document.title = `${safeName(club)} | Water Polo Index`;

  root.classList?.add?.("wpi-club-profile-v7530");
  root.innerHTML = `
    <section class="wpi-club-hero">
      <article class="wpi-club-identity">
        <div class="wpi-club-brand-row">${logoMarkup(club)}<div><span class="wpi-club-eyebrow">Water Polo Index · Club profile</span><h1>${escapeHtml(safeName(club))}</h1><p>${escapeHtml(club.locationLabel || club.region || "Location pending")}</p></div></div>
        <div class="wpi-club-badges"><span>${escapeHtml(club.region || "Region pending")}</span>${metrics.rankedCount ? `<span>${metrics.rankedCount} ranked team${metrics.rankedCount === 1 ? "" : "s"}</span>` : ""}${metrics.joCount ? `<span>${metrics.joCount} JO team${metrics.joCount === 1 ? "" : "s"}</span>` : ""}<span>${metrics.groups.length} age group${metrics.groups.length === 1 ? "" : "s"}</span></div>
        <p class="wpi-club-summary">${escapeHtml(summaryCopy(club, metrics))}</p>
        <div class="wpi-club-actions">${club.website ? `<a class="primary" href="${escapeHtml(club.website)}" target="_blank" rel="noopener">Visit club website ↗</a>` : ""}<a href="${top?.group ? escapeHtml(groupHref(top.group)) : "rankings.html"}">Explore rankings</a><a href="#club-tournaments">Tournament history</a></div>
        <div class="wpi-club-independence"><b>Independent profile</b><span>WPI rankings and results are not influenced by sponsorship.</span></div>
      </article>
      <aside class="wpi-club-snapshot"><header><span>Competitive snapshot</span><strong>${metrics.mode === "ranked" ? "Current rankings" : metrics.mode === "tournament" ? "Tournament performance" : "Connected results"}</strong></header><div class="wpi-club-metrics">${renderSnapshot(metrics)}</div>${bestSignal(ranked, joClub, history)}</aside>
    </section>

    <nav class="wpi-club-nav" aria-label="Club profile sections"><a href="#club-overview">Overview</a><a href="#club-teams">Teams</a><a href="#club-tournaments">Tournaments</a><a href="#club-partners">Partners</a></nav>

    ${renderProgramOverview(club, metrics)}

    <section id="club-teams" class="wpi-club-panel">
      <div class="wpi-club-section-heading"><div><span>Team portfolio</span><h2>Teams by age group</h2></div><p>${teams.length} connected team profile${teams.length === 1 ? "" : "s"}</p></div>
      <div class="wpi-club-group-grid">${renderTeamGroups(teams)}</div>
    </section>

    <section id="club-tournaments" class="wpi-club-panel">
      <div class="wpi-club-section-heading"><div><span>Tournament intelligence</span><h2>Results and event history</h2></div><p>Verified records connected to this club.</p></div>
      <div class="wpi-club-tournament-stack">${renderJoTournament(joClub)}${renderHistoricalTournament(history) || (!joClub ? `<div class="wpi-club-empty"><strong>No connected tournament history yet</strong><p>Results will appear as WPI adds and verifies events.</p></div>` : "")}</div>
    </section>

    ${renderSponsorModule(club)}
  `;
})();
