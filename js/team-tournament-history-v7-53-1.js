(function () {
  "use strict";

  const rankings = window.CPI_RANKINGS || [];
  const evidenceRuntime = window.CPI_TOURNAMENT_EVIDENCE || { teams: {} };
  const historicalRuntime = window.CPI_HISTORICAL_PROFILES || { teams: {} };
  const archiveRuntime = window.CPI_TOURNAMENT_ARCHIVE || { events: [], games: [] };
  const joRuntime = window.WPI_JO_PROFILES || { teams: {}, lookup: {} };
  const root = document.querySelector("#teamProfile");

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeSlug(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function identityKey(value) {
    return String(value || "").trim().toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9]+/g, " ").trim();
  }

  function currentSlug() {
    return new URLSearchParams(window.location.search).get("team") || "";
  }

  function teamPageSlug(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      return normalizeSlug(new URL(raw, window.location.href).searchParams.get("team") || raw);
    } catch (error) {
      const match = raw.match(/[?&]team=([^&]+)/);
      return normalizeSlug(match ? decodeURIComponent(match[1]) : raw);
    }
  }

  function parseSlugWithGroup(value) {
    const normalized = normalizeSlug(value);
    const match = normalized.match(/^(.*?)-(10u|12u|14u|16u|18u)-(boys|girls)$/);
    if (!match) return { baseSlug: normalized, group: "" };
    return { baseSlug: match[1], group: `${match[2].toUpperCase()} ${match[3] === "girls" ? "Girls" : "Boys"}` };
  }

  function findRankedTeam(slug) {
    const decoded = decodeURIComponent(slug || "").trim();
    const normalized = normalizeSlug(decoded);
    const parsed = parseSlugWithGroup(decoded);
    const exact = rankings.find((team) => normalizeSlug(team.slug) === normalized)
      || rankings.find((team) => teamPageSlug(team.teamPage) === normalized)
      || rankings.find((team) => normalizeSlug(team.team) === normalized);
    if (exact) return exact;
    if (!parsed.group || !parsed.baseSlug) return null;
    return rankings.find((team) => team.group === parsed.group && normalizeSlug(team.slug) === parsed.baseSlug)
      || rankings.find((team) => team.group === parsed.group && teamPageSlug(team.teamPage) === parsed.baseSlug)
      || rankings.find((team) => team.group === parsed.group && normalizeSlug(team.team) === parsed.baseSlug)
      || rankings.find((team) => team.group === parsed.group && normalizeSlug(team.clubSlug) === parsed.baseSlug && Number(team.teamDepth || 1) === 1)
      || null;
  }

  function findJoProfile(slug) {
    const normalized = normalizeSlug(decodeURIComponent(slug || ""));
    return joRuntime.teams?.[normalized]
      || Object.values(joRuntime.teams || {}).find((profile) => normalizeSlug(profile.profileSlug) === normalized)
      || Object.values(joRuntime.teams || {}).find((profile) => normalizeSlug(profile.participantId) === normalized)
      || null;
  }

  function findEvidence(team, joProfile) {
    const candidates = [team?.canonicalTeamId, team?.teamId, joProfile?.canonicalTeamId, joProfile?.participantId].filter(Boolean);
    for (const id of candidates) {
      if (evidenceRuntime.teams?.[id]) return evidenceRuntime.teams[id];
    }
    const target = identityKey(joProfile?.team || team?.team);
    const group = joProfile?.group || team?.group;
    return Object.values(evidenceRuntime.teams || {}).find((item) => identityKey(item.name) === target && (!group || item.group === group)) || null;
  }

  function findHistorical(team, joProfile) {
    const candidates = [team?.canonicalTeamId, team?.teamId, joProfile?.canonicalTeamId].filter(Boolean);
    for (const id of candidates) {
      if (historicalRuntime.teams?.[id]) return historicalRuntime.teams[id];
    }
    return null;
  }

  function plural(count, singular, pluralForm = `${singular}s`) {
    return `${count} ${Number(count) === 1 ? singular : pluralForm}`;
  }

  function recordText(summary = {}) {
    const wins = Number(summary.wins || 0);
    const losses = Number(summary.losses || 0);
    const ties = Number(summary.ties || 0);
    const finalGames = Number(summary.finalGames ?? summary.games ?? 0);
    if (!finalGames && !wins && !losses && !ties) return "Record unavailable";
    return `${wins}-${losses}${ties ? `-${ties}` : ""}`;
  }

  function joDates(profile) {
    return profile?.weekend === "Weekend 1" ? "July 18–21, 2026" : "July 23–26, 2026";
  }

  function formatDateRange(games) {
    const dates = [...new Set((games || []).map((game) => game.dateIso || game.dateLabel).filter(Boolean))];
    if (!dates.length) return "Date not banked";
    if (dates.length === 1) return dates[0];
    return `${dates[0]}–${dates[dates.length - 1]}`;
  }

  function eventPlacement(history, eventId, divisionId) {
    const placement = (history?.placements || []).find((item) => item.eventId === eventId && (!divisionId || item.divisionId === divisionId));
    return placement?.place ? `#${placement.place}` : "—";
  }

  function archiveGamesForTeam(teamId, eventId, divisionId) {
    if (!teamId) return [];
    return (archiveRuntime.games || []).filter((game) => {
      const isTeam = game.whiteTeamId === teamId || game.darkTeamId === teamId;
      return isTeam && game.eventId === eventId && (!divisionId || game.divisionId === divisionId);
    }).map((game) => {
      const isWhite = game.whiteTeamId === teamId;
      const opponentSide = isWhite ? "dark" : "white";
      const ownSide = isWhite ? "white" : "dark";
      return {
        gameId: game.id,
        dateLabel: game.dateLabel || game.dateIso,
        dateIso: game.dateIso,
        timeLabel: game.timeLabel,
        venue: game.venue,
        stage: game.stageDisplay || game.stage || game.gameNumber,
        status: game.status,
        opponent: game[opponentSide] || "Opponent",
        opponentTeamPage: game[`${opponentSide}TeamPage`] || "",
        opponentClubPage: game[`${opponentSide}ClubPage`] || "",
        result: game[`${ownSide}Result`] || "",
        scoreFor: game[`${ownSide}Score`],
        scoreAgainst: game[`${opponentSide}Score`],
        scoreDisplay: game.status === "final" ? `${game[`${ownSide}Score`] ?? "—"}–${game[`${opponentSide}Score`] ?? "—"}` : "",
        shootout: game.shootout || null
      };
    }).sort((a, b) => String(a.dateIso || a.dateLabel || "").localeCompare(String(b.dateIso || b.dateLabel || "")) || String(a.timeLabel || "").localeCompare(String(b.timeLabel || "")));
  }

  function gameResultClass(result, status) {
    if (status !== "final") return "is-scheduled";
    if (result === "W") return "is-win";
    if (result === "L") return "is-loss";
    return "is-tie";
  }

  function opponentLink(game, groupId = "") {
    if (game.opponentTeamPage) return `<a href="${escapeHtml(game.opponentTeamPage)}">${escapeHtml(game.opponent)}</a>`;
    if (game.opponentClubPage) return `<a href="${escapeHtml(game.opponentClubPage)}">${escapeHtml(game.opponent)}</a>`;
    if (groupId) {
      const exact = joRuntime.lookup?.[`${groupId}|${String(game.opponent || "").trim().toLowerCase()}`];
      const profile = exact ? joRuntime.teams?.[exact] : Object.values(joRuntime.teams || {}).find((item) => item.groupId === groupId && identityKey(item.team) === identityKey(game.opponent));
      if (profile?.teamPage) return `<a href="${escapeHtml(profile.teamPage)}">${escapeHtml(game.opponent)}</a>`;
    }
    return escapeHtml(game.opponent || "Opponent");
  }

  function gameRows(games, groupId = "") {
    if (!(games || []).length) return `<p class="wpi-team-history-empty">Game-by-game results are not banked in this profile yet.</p>`;
    return `<div class="wpi-team-game-list">${games.map((game) => {
      const score = game.status === "final" ? `${game.result || "Final"} ${game.scoreDisplay || `${game.scoreFor ?? "—"}–${game.scoreAgainst ?? "—"}`}` : game.timeLabel || "Scheduled";
      return `<article class="wpi-team-game-row ${gameResultClass(game.result, game.status)}">
        <div class="wpi-team-game-when"><strong>${escapeHtml(game.dateLabel || "Date pending")}</strong><span>${escapeHtml(game.timeLabel || game.stage || "Time pending")}</span></div>
        <div class="wpi-team-game-opponent"><span>${escapeHtml(game.stage || "Tournament game")}</span><strong>vs ${opponentLink(game, groupId)}</strong><em>${escapeHtml(game.venue || "Venue pending")}</em></div>
        <div class="wpi-team-game-result"><strong>${escapeHtml(score)}</strong>${game.shootout ? `<span>Shootout recorded</span>` : ""}</div>
      </article>`;
    }).join("")}</div>`;
  }

  function joSeed(evidence, profile) {
    const appearance = (evidence?.appearances || []).find((item) => item.divisionId === profile?.divisionId || item.eventId === (profile?.weekend === "Weekend 1" ? "2026-jo-weekend-1" : "2026-jo-weekend-2"));
    return appearance?.seed ?? null;
  }

  function buildEvents(team, joProfile, evidence, history) {
    const events = [];
    const teamId = team?.canonicalTeamId || team?.teamId || joProfile?.canonicalTeamId || "";

    if (joProfile) {
      const recordSummary = joProfile.recordSummary || {};
      events.push({
        key: `jo-${joProfile.profileSlug}`,
        kind: "jo",
        eventId: joProfile.weekend === "Weekend 1" ? "2026-jo-weekend-1" : "2026-jo-weekend-2",
        name: `${joProfile.season || 2026} Junior Olympics`,
        date: joDates(joProfile),
        division: joProfile.division || "Junior Olympics",
        subdivision: joProfile.subdivision || "—",
        tier: joProfile.divisionTier || "",
        seed: joSeed(evidence, joProfile),
        record: joProfile.record || recordText(recordSummary),
        finalGames: Number(recordSummary.games || 0),
        placement: joProfile.divisionPlaceLabel || "—",
        subdivisionPlacement: joProfile.subdivisionPlaceLabel || "—",
        tournamentUrl: joProfile.resultsUrl,
        journeyUrl: joProfile.journeyUrl,
        sourceUrl: (evidence?.appearances || []).find((item) => item.divisionId === joProfile.divisionId)?.sourceUrl || "",
        groupId: joProfile.groupId,
        profileSlug: joProfile.profileSlug,
        games: []
      });
    }

    for (const appearance of history?.appearances || []) {
      const games = archiveGamesForTeam(teamId, appearance.eventId, appearance.divisionId);
      events.push({
        key: `${appearance.eventId}|${appearance.divisionId}`,
        kind: "archive",
        eventId: appearance.eventId,
        name: appearance.eventName || "Tournament",
        date: formatDateRange(games),
        division: appearance.divisionLabel || appearance.divisionId || "Division",
        subdivision: appearance.divisionTier || "—",
        tier: appearance.divisionTier || "",
        seed: null,
        record: recordText(appearance),
        finalGames: Number(appearance.finalGames || 0),
        placement: eventPlacement(history, appearance.eventId, appearance.divisionId),
        subdivisionPlacement: "—",
        tournamentUrl: appearance.eventPublicPath,
        journeyUrl: `tournament-archive.html?team=${encodeURIComponent(teamId)}&event=${encodeURIComponent(appearance.eventId)}`,
        sourceUrl: appearance.sourceUrl,
        groupId: joProfile?.groupId || "",
        games
      });
    }

    const existing = new Set(events.map((event) => `${event.eventId}|${event.division}`));
    for (const appearance of evidence?.appearances || []) {
      const isJoAlready = joProfile && appearance.eventId === (joProfile.weekend === "Weekend 1" ? "2026-jo-weekend-1" : "2026-jo-weekend-2");
      const key = `${appearance.eventId}|${appearance.divisionLabel || appearance.divisionId}`;
      if (isJoAlready || existing.has(key)) continue;
      events.push({
        key: `${appearance.eventId}|${appearance.divisionId}|registration`,
        kind: "registration",
        eventId: appearance.eventId,
        name: appearance.eventName || "Tournament",
        date: "Schedule banked",
        division: appearance.divisionLabel || appearance.divisionId || "Division",
        subdivision: appearance.divisionTier || "—",
        tier: appearance.divisionTier || "",
        seed: appearance.seed ?? null,
        record: Number(appearance.finalGames || 0) ? recordText(appearance) : `${Number(appearance.scheduledGames || 0)} scheduled`,
        finalGames: Number(appearance.finalGames || 0),
        placement: "—",
        subdivisionPlacement: "—",
        tournamentUrl: appearance.publicPath,
        journeyUrl: "",
        sourceUrl: appearance.sourceUrl,
        groupId: joProfile?.groupId || "",
        games: []
      });
    }

    const priority = { jo: 0, archive: 1, registration: 2 };
    return events.sort((a, b) => priority[a.kind] - priority[b.kind] || String(b.date).localeCompare(String(a.date)));
  }

  function eventCard(event, index) {
    const actions = [
      event.journeyUrl ? `<a href="${escapeHtml(event.journeyUrl)}">${event.kind === "jo" ? "Open complete JO journey" : "Search event history"}</a>` : "",
      event.tournamentUrl ? `<a href="${escapeHtml(event.tournamentUrl)}">Tournament page</a>` : "",
      event.sourceUrl ? `<a href="${escapeHtml(event.sourceUrl)}" target="_blank" rel="noopener">Official source</a>` : ""
    ].filter(Boolean).join("");
    const gameBody = event.kind === "jo"
      ? `<div class="wpi-jo-live-games" id="jo-live-games-${escapeHtml(event.profileSlug)}" data-profile-slug="${escapeHtml(event.profileSlug)}"><p class="wpi-team-history-loading">Loading final JO game-by-game results…</p></div>`
      : gameRows(event.games, event.groupId);
    return `<details class="wpi-team-event-card" ${index === 0 ? "open" : ""}>
      <summary>
        <div><span>${escapeHtml(event.date)}</span><strong>${escapeHtml(event.name)}</strong><em>${escapeHtml(event.division)}${event.subdivision && event.subdivision !== "—" ? ` · ${escapeHtml(event.subdivision)}` : ""}</em></div>
        <div class="wpi-team-event-summary"><b>${escapeHtml(event.record)}</b><span>${event.placement !== "—" ? `${escapeHtml(event.placement)} overall` : "Placement pending"}</span></div>
      </summary>
      <div class="wpi-team-event-body">
        <div class="wpi-team-event-metrics">
          <div><span>Division</span><strong>${escapeHtml(event.division)}</strong></div>
          <div><span>Subdivision</span><strong>${escapeHtml(event.subdivision || "—")}</strong></div>
          <div><span>Seed</span><strong>${event.seed != null ? `#${escapeHtml(event.seed)}` : "—"}</strong></div>
          <div><span>Record</span><strong>${escapeHtml(event.record)}</strong></div>
          <div><span>Division finish</span><strong>${escapeHtml(event.placement)}</strong></div>
          <div><span>Subdivision finish</span><strong>${escapeHtml(event.subdivisionPlacement)}</strong></div>
        </div>
        ${gameBody}
        ${actions ? `<div class="wpi-team-event-actions">${actions}</div>` : ""}
      </div>
    </details>`;
  }

  function aggregate(events) {
    let finals = 0;
    let wins = 0;
    let losses = 0;
    let ties = 0;
    let best = null;
    for (const event of events) {
      finals += Number(event.finalGames || 0);
      const match = String(event.record || "").match(/^(\d+)-(\d+)(?:-(\d+))?/);
      if (match) {
        wins += Number(match[1]);
        losses += Number(match[2]);
        ties += Number(match[3] || 0);
      }
      const placement = Number(String(event.placement || "").match(/\d+/)?.[0]);
      if (Number.isFinite(placement) && placement > 0 && (best == null || placement < best)) best = placement;
    }
    return { events: events.length, finals, record: finals ? `${wins}-${losses}${ties ? `-${ties}` : ""}` : "—", best };
  }

  function renderUnifiedHistory(team, joProfile) {
    const evidence = findEvidence(team, joProfile);
    const history = findHistorical(team, joProfile);
    const events = buildEvents(team, joProfile, evidence, history);
    const totals = aggregate(events);
    const teamId = team?.canonicalTeamId || team?.teamId || joProfile?.canonicalTeamId || "";
    return `<section id="tournament-history" class="team-panel wpi-team-history-panel">
      <div class="section-heading with-note">
        <div><p class="kicker">Tournament history</p><h2>Results, placements and game journeys</h2></div>
        <span>${plural(events.length, "event")}</span>
      </div>
      <p class="evidence-policy-note">Published tournament results are shown as team context. Displaying an event here does not independently change the WPI ranking.</p>
      <div class="wpi-team-history-summary">
        <div><span>Events</span><strong>${escapeHtml(totals.events)}</strong></div>
        <div><span>Final games</span><strong>${escapeHtml(totals.finals)}</strong></div>
        <div><span>Combined record</span><strong>${escapeHtml(totals.record)}</strong></div>
        <div><span>Best verified finish</span><strong>${totals.best ? `#${escapeHtml(totals.best)}` : "—"}</strong></div>
      </div>
      <div class="wpi-team-event-list">
        ${events.length ? events.map(eventCard).join("") : `<p class="wpi-team-history-empty">No safely linked tournament history is currently available for this canonical team.</p>`}
      </div>
      ${teamId ? `<a class="wpi-team-archive-link" href="tournament-archive.html?team=${encodeURIComponent(teamId)}">Search the complete WPI tournament archive →</a>` : ""}
    </section>`;
  }

  function installSection(team, joProfile) {
    const unified = renderUnifiedHistory(team, joProfile);
    const primary = document.querySelector("#tournament-evidence") || document.querySelector("#jo-profile-summary") || document.querySelector("#historical-tournaments");
    if (!primary) return false;
    primary.insertAdjacentHTML("beforebegin", unified);
    document.querySelector("#tournament-evidence")?.remove();
    document.querySelector("#jo-profile-summary")?.remove();
    document.querySelector("#historical-tournaments")?.remove();

    const tabs = document.querySelector(".profile-tabs");
    if (tabs) {
      const links = [...tabs.querySelectorAll("a")].filter((link) => !["#tournament-evidence", "#historical-tournaments", "#jo-profile-summary"].includes(link.getAttribute("href")));
      const overview = links.find((link) => link.getAttribute("href") === "#team-intelligence");
      const historyLink = document.createElement("a");
      historyLink.href = "#tournament-history";
      historyLink.textContent = "Tournament history";
      if (overview?.nextSibling) tabs.insertBefore(historyLink, overview.nextSibling);
      else tabs.insertBefore(historyLink, tabs.firstChild);
    }

    document.querySelectorAll(".profile-note-list li").forEach((item) => {
      if (/Current rankings remain pre-JO/i.test(item.textContent || "")) item.textContent = "Current rankings use the approved post-JO release; tournament history remains source-traceable profile context.";
      if (/No normalized JO evidence/i.test(item.textContent || "") && joProfile) item.textContent = "The verified final JO record and placement are connected to this team profile.";
    });
    return true;
  }

  function liveGameFallback(profile, message) {
    return `<div class="wpi-team-history-source-state"><strong>Complete journey available</strong><p>${escapeHtml(message || "The embedded result feed could not be loaded in this browser.")}</p><a href="${escapeHtml(profile.journeyUrl)}">Open complete JO journey →</a></div>`;
  }

  async function hydrateJo(profile) {
    const target = document.querySelector(`#jo-live-games-${CSS.escape(profile.profileSlug)}`);
    if (!target) return;
    if (!window.WPI_JO_LIVE_HISTORY?.load) {
      target.innerHTML = liveGameFallback(profile, "The live JO history module is unavailable.");
      return;
    }
    try {
      const result = await window.WPI_JO_LIVE_HISTORY.load(profile);
      const finalGames = result.finalGames || [];
      if (!finalGames.length) {
        target.innerHTML = liveGameFallback(profile, "The source loaded, but final game rows were not resolved safely for this team.");
        return;
      }
      target.innerHTML = `${gameRows(finalGames, profile.groupId)}<p class="wpi-team-history-source-note">Game rows loaded from ${escapeHtml(result.sourceLabel || "verified JO source")}${result.seed ? ` · JO seed #${escapeHtml(result.seed)}` : ""}.</p>`;
    } catch (error) {
      target.innerHTML = liveGameFallback(profile, error?.message || "The embedded result feed could not be loaded.");
    }
  }

  window.WPI_TEAM_TOURNAMENT_HISTORY = {
    release: "7.53.1",
    _test: { buildEvents, archiveGamesForTeam, findRankedTeam, findJoProfile, gameRows, aggregate, renderUnifiedHistory }
  };

  if (!root) return;
  const slug = currentSlug();
  const team = findRankedTeam(slug);
  const joProfile = findJoProfile(slug);
  if (!team && !joProfile) return;
  if (!installSection(team, joProfile)) return;
  if (joProfile) hydrateJo(joProfile);
})();
