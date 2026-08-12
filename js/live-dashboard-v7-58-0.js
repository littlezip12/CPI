/* WPI 7.58.0 — Club Workspace Foundation.
 * Adds the Owner Club -> Teams workspace above the validated team-scoped
 * dashboard. Stable team_id remains the isolation boundary for roster, access,
 * GroupMe, games, scoring, series, deliveries, and history.
 */
(() => {
  "use strict";
  const config = window.WPI_LIVE_SANDBOX_CONFIG || {};
  const $ = id => document.getElementById(id);
  let backend = null;
  let workspace = null;
  let games = [];
  let destination = null;
  let deliverySummary = {sent:0,failed:0,pending:0,suppressed:0};
  let scorerCodeGameId = null;
  let scorerCodePreview = null;
  let groupMeGroups = [];
  let groupMeTopics = [];
  let currentRoster = [];
  let rosterDraft = [];
  let rosterDraftSource = "manual";
  let rosterOcrBusy = false;
  let lastRosterFile = null;
  let teamAccess = {members:[],invites:[]};
  let accountRegistry = null;
  let accountRegistryFilter = "";
  let platformOwnerAccess = false;
  let lastCreatedInvite = null;
  let teamMemberships = [];
  let clubWorkspaces = [];
  let clubWorkspace = null;
  let clubView = false;
  let gameDayQueue = [];
  let gameSeriesArchive = [];
  let gameArchiveSeasons = [];
  let gameArchiveSeason = "all";
  let gameCatalogTeams = [];
  let gameCatalogClubs = [];
  let gameIdentityAliases = new Map();
  let gameCatalogTournaments = [];
  let editingGameDayId = null;
  let gameCatalogLoaded = false;
  let tournamentScheduleIndex = null;
  let tournamentScheduleCandidates = [];
  let tournamentScheduleLoadError = null;
  let tournamentScheduleSyncBusy = false;
  let tournamentScheduleAutoSyncedTeamId = null;

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
  }

  function teamScopedUrl(path, params = {}) {
    const url = new URL(path, window.location.href);
    Object.entries(params).forEach(([key,value]) => {
      if (value !== null && value !== undefined && value !== "") url.searchParams.set(key, String(value));
    });
    const teamId = params.team || workspace?.teamId;
    if (teamId) url.searchParams.set("team", String(teamId));
    return url.href;
  }

  function formatScore(game) {
    const team = Number(game.team_score || 0).toFixed(Number(game.team_score || 0) % 1 ? 1 : 0);
    const opponent = Number(game.opponent_score || 0).toFixed(Number(game.opponent_score || 0) % 1 ? 1 : 0);
    return `${team}–${opponent}`;
  }

  function renderGames() {
    const completedGames = games.filter(game => game.status === "final");
    $("dashboardGameCount").textContent = String(completedGames.length);
    const latestActive = games.find(game => game.status === "live");
    $("continueLatestGameButton").hidden = !latestActive;
    $("enterScorerCodeButton").hidden = !latestActive;
    if (latestActive) {
      $("continueLatestGameButton").onclick = () => window.location.assign(teamScopedUrl("live-game.html", {game:latestActive.id}));
      $("enterScorerCodeButton").onclick = () => openScorerCodeDialog(latestActive.id);
    }
  }

  function archiveDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function archiveDateRange(firstValue, lastValue) {
    const first = archiveDate(firstValue);
    const last = archiveDate(lastValue) || first;
    if (!first) return "Dates will appear after games are scheduled";
    const sameDay = last && first.toDateString() === last.toDateString();
    if (sameDay) return first.toLocaleDateString([], {month:"short",day:"numeric",year:"numeric"});
    const sameYear = last && first.getFullYear() === last.getFullYear();
    const firstText = first.toLocaleDateString([], {month:"short",day:"numeric", ...(sameYear ? {} : {year:"numeric"})});
    const lastText = last.toLocaleDateString([], {month:"short",day:"numeric",year:"numeric"});
    return `${firstText} – ${lastText}`;
  }

  function archiveResult(game) {
    const teamScore = Number(game.teamScore ?? 0);
    const opponentScore = Number(game.opponentScore ?? 0);
    if (teamScore > opponentScore) return {label:"W",state:"win"};
    if (teamScore < opponentScore) return {label:"L",state:"loss"};
    return {label:"T",state:"tie"};
  }

  function renderGameSeriesArchive() {
    const container = $("gameSeriesArchive");
    const summary = $("gameArchiveSummary");
    if (!container) return;
    const filtered = gameArchiveSeason === "all"
      ? gameSeriesArchive
      : gameSeriesArchive.filter(series => String(series.competitiveSeason || "") === gameArchiveSeason);
    if (summary) {
      const finals = filtered.reduce((total,series) => total + Number(series.finalCount || 0),0);
      summary.textContent = `${filtered.length} event${filtered.length === 1 ? "" : "s"} · ${finals} final${finals === 1 ? "" : "s"}`;
    }
    if (!filtered.length) {
      container.innerHTML = `<p class="live-empty-state">${gameSeriesArchive.length ? "No tournaments or scrimmage weekends in this season yet." : "No tournaments or scrimmage weekends yet."}</p>`;
      return;
    }
    const grouped = filtered.reduce((map,series) => {
      const season = series.competitiveSeason || "Season";
      if (!map.has(season)) map.set(season,[]);
      map.get(season).push(series);
      return map;
    }, new Map());
    container.innerHTML = Array.from(grouped.entries()).map(([season,seriesRows]) => {
      const cards = seriesRows.map(series => {
        const label = series.seriesType === "tournament" ? "Tournament" : "Scrimmage weekend";
        const ties = Number(series.ties || 0);
        const finalCount = Number(series.finalCount || 0);
        const record = finalCount ? `${Number(series.wins || 0)}-${Number(series.losses || 0)}${ties ? `-${ties}` : ""}` : "—";
        const gameRows = (series.games || []).map(game => {
          const result = archiveResult(game);
          const ownName = game.teamName || workspace?.teamName || "Team";
          const opponentName = game.opponentName || "Opponent";
          const meta = [gameDayTimeLabel(game.scheduledAt),game.venue,game.officialDivisionLabel,game.officialStage].filter(Boolean).join(" · ");
          return `<article class="live-archive-game-row">
            <span class="live-archive-result" data-state="${escapeHtml(result.state)}">${escapeHtml(result.label)}</span>
            <div class="live-archive-matchup">
              <div class="live-archive-team"><img src="${escapeHtml(safeGameLogo(game.teamLogoUrl))}" alt="${escapeHtml(ownName)} logo"><span>${escapeHtml(ownName)}</span></div>
              <strong>${escapeHtml(String(game.teamScore ?? 0))}–${escapeHtml(String(game.opponentScore ?? 0))}</strong>
              <div class="live-archive-team live-archive-team--opponent"><img src="${escapeHtml(safeGameLogo(game.opponentLogoUrl))}" alt="${escapeHtml(opponentName)} logo"><span>${escapeHtml(opponentName)}</span></div>
            </div>
            <div class="live-archive-game-meta"><span>${escapeHtml(meta)}</span>${game.officialGameNumber ? `<span>Game ${escapeHtml(game.officialGameNumber)}</span>` : ""}</div>
            <a class="live-archive-game-link" href="${escapeHtml(teamScopedUrl("live-game.html", {game:game.id}))}">${game.recapAvailable ? "View recap" : "View game"}</a>
          </article>`;
        }).join("");
        const venueCopy = Array.isArray(series.venues) && series.venues.length ? series.venues.slice(0,2).join(" · ") : "";
        return `<article class="live-game-series-card">
          <div class="live-archive-series-heading">
            <div><p class="live-section-kicker">${escapeHtml(label)}</p><h3>${escapeHtml(series.name)}</h3><p>${escapeHtml(archiveDateRange(series.firstGameAt,series.lastGameAt))}${venueCopy ? ` · ${escapeHtml(venueCopy)}` : ""}</p></div>
            <div class="live-game-series-record"><strong>${escapeHtml(record)}</strong><span>${finalCount} final${finalCount === 1 ? "" : "s"}</span></div>
          </div>
          <details class="live-archive-series-details">
            <summary><span>Weekend games</span><strong>${finalCount ? `${finalCount} completed` : "No finals yet"}</strong></summary>
            <div class="live-archive-series-games">${gameRows || '<p class="live-empty-state">No completed games in this event yet.</p>'}</div>
          </details>
        </article>`;
      }).join("");
      return `<section class="live-archive-season" data-season="${escapeHtml(season)}"><div class="live-archive-season-heading"><h3>${escapeHtml(season)} season</h3><span>${seriesRows.length} event${seriesRows.length === 1 ? "" : "s"}</span></div>${cards}</section>`;
    }).join("");
  }

  async function loadGameSeriesArchive() {
    if (!backend || !workspace?.teamId) { gameSeriesArchive = []; gameArchiveSeasons = []; renderGameSeriesArchive(); return; }
    const {data,error} = await backend.client.rpc("live_game_series_archive_v2", {target_team_id:workspace.teamId});
    if (error) throw error;
    gameSeriesArchive = Array.isArray(data?.series) ? data.series : [];
    gameArchiveSeasons = Array.isArray(data?.seasons) ? data.seasons.filter(Boolean) : Array.from(new Set(gameSeriesArchive.map(row => row.competitiveSeason).filter(Boolean)));
    const filter = $("gameArchiveSeasonFilter");
    if (filter) {
      const selected = gameArchiveSeason;
      filter.innerHTML = '<option value="all">All seasons</option>' + gameArchiveSeasons.map(season => `<option value="${escapeHtml(season)}">${escapeHtml(season)}</option>`).join("");
      gameArchiveSeason = selected !== "all" && gameArchiveSeasons.includes(selected) ? selected : "all";
      filter.value = gameArchiveSeason;
    }
    renderGameSeriesArchive();
    const datalist = $("gameScrimmageWeekendSuggestions");
    if (datalist) datalist.innerHTML = gameSeriesArchive.filter(row => row.seriesType === "scrimmage_weekend").map(row => `<option value="${escapeHtml(row.name)}"></option>`).join("");
  }

  function defaultScorerName() {
    return workspace?.scorerDisplayName || backend?.user?.user_metadata?.display_name || backend?.user?.email?.split("@")[0] || "";
  }

  function openScorerCodeDialog(gameId) {
    scorerCodeGameId = gameId;
    scorerCodePreview = null;
    $("dashboardScorerCode").value = "";
    $("dashboardScorerDisplayName").value = defaultScorerName();
    $("dashboardScorerPreview").hidden = true;
    $("dashboardScorerPreview").innerHTML = "";
    $("dashboardScorerCodeMessage").textContent = "Enter the code supplied by the current scorer.";
    $("dashboardAcceptScorerCodeButton").disabled = false;
    $("dashboardScorerCodeDialog").showModal();
    setTimeout(() => $("dashboardScorerCode").focus(), 0);
  }

  async function previewScorerCode() {
    const code = $("dashboardScorerCode").value.replace(/\D/g, "").slice(0,6);
    $("dashboardScorerCode").value = code;
    if (code.length !== 6 || !scorerCodeGameId) {
      $("dashboardScorerCodeMessage").textContent = "Enter the six-digit code.";
      return;
    }
    $("dashboardPreviewScorerCodeButton").disabled = true;
    $("dashboardScorerCodeMessage").textContent = "Checking scorer code…";
    try {
      scorerCodePreview = await backend.previewScorerHandoff({code, gameId: scorerCodeGameId});
      $("dashboardScorerPreview").hidden = false;
      $("dashboardScorerPreview").innerHTML = `<strong>${escapeHtml(scorerCodePreview.teamName)} vs ${escapeHtml(scorerCodePreview.opponentName)}</strong><p>${formatScore({team_score:scorerCodePreview.teamScore,opponent_score:scorerCodePreview.opponentScore})} · Q${Number(scorerCodePreview.quarter || 1)}</p><p>Current scorer: ${escapeHtml(scorerCodePreview.activeScorer || "Not assigned")}</p>`;
      $("dashboardScorerCodeMessage").textContent = `Valid until ${new Date(scorerCodePreview.expiresAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}.`;
      $("dashboardAcceptScorerCodeButton").disabled = false;
    } catch (error) {
      scorerCodePreview = null;
      $("dashboardScorerPreview").hidden = true;
      $("dashboardAcceptScorerCodeButton").disabled = false;
      $("dashboardScorerCodeMessage").textContent = error.message || "The scorer code is unavailable.";
    } finally {
      $("dashboardPreviewScorerCodeButton").disabled = false;
    }
  }

  async function acceptScorerCode() {
    const code = $("dashboardScorerCode").value.replace(/\D/g, "").slice(0,6);
    const displayName = $("dashboardScorerDisplayName").value.trim();
    $("dashboardScorerCode").value = code;
    if (code.length !== 6 || !scorerCodeGameId) {
      $("dashboardScorerCodeMessage").textContent = "Enter the six-digit code.";
      return;
    }
    if (!displayName) {
      $("dashboardScorerCodeMessage").textContent = "Enter the scorer name.";
      return;
    }
    $("dashboardAcceptScorerCodeButton").disabled = true;
    $("dashboardScorerCodeMessage").textContent = "Checking code and transferring scoring control…";
    try {
      scorerCodePreview = await backend.previewScorerHandoff({code, gameId:scorerCodeGameId});
      const result = await backend.acceptScorerHandoff({code, gameId:scorerCodeGameId, displayName});
      window.location.assign(teamScopedUrl("live-game.html", {game:result.gameId, team:result.teamId || workspace?.teamId}));
    } catch (error) {
      $("dashboardScorerCodeMessage").textContent = error.message || "Scoring control could not be transferred.";
      $("dashboardAcceptScorerCodeButton").disabled = false;
    }
  }

  function gameDayTimeLabel(value) {
    if (!value) return "Time not set";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Time not set";
    return date.toLocaleString([], {weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
  }

  function localDateTimeValue(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const pad = number => String(number).padStart(2,"0");
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function normalizedGameTeamName(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/&/g," and ")
      .replace(/\b(10u|12u|14u|16u|18u|19u|boys|girls|coed|men|women)\b/g," ")
      .replace(/[^a-z0-9]+/g," ")
      .trim();
  }

  function workspaceGenderHint() {
    const value = String(workspace?.teamName || "").toLowerCase();
    if (value.includes("girls")) return "girls";
    if (value.includes("boys")) return "boys";
    if (value.includes("coed")) return "coed";
    return "";
  }

  const GAME_DAY_SQUAD_TOKENS = new Set(["a","b","c","d","red","black","blue","gold","white","silver","navy","green","orange","gray","grey","purple","maroon","teal"]);

  function shortClubDisplayName(club) {
    if (!club) return "";
    const configured = gameIdentityAliases.get(club.slug || "");
    return configured?.displayName || club.club || club.displayName || "";
  }

  function clubAliases(club) {
    const configured = gameIdentityAliases.get(club.slug || "");
    const aliases = new Set([
      club.club,
      club.displayName,
      String(club.slug || "").replace(/-/g," "),
      ...(configured?.aliases || [])
    ].map(normalizedGameTeamName).filter(Boolean));
    return [...aliases].sort((a,b) => b.length-a.length);
  }

  function squadTokenForInput(input, alias, club) {
    const normalized = normalizedGameTeamName(input);
    if (!normalized || !alias || normalized === alias) return "";
    if (!normalized.startsWith(`${alias} `)) return null;
    const remainder = normalized.slice(alias.length).trim();
    if (!remainder) return "";
    const tokens = remainder.split(/\s+/).filter(Boolean);
    if (!tokens.every(token => GAME_DAY_SQUAD_TOKENS.has(token))) return null;
    const configured = gameIdentityAliases.get(club.slug || "");
    return configured?.squadAliases?.[tokens.join(" ")] || configured?.squadAliases?.[tokens[0]] || tokens[0].toUpperCase();
  }

  function teamForClubSquad(club, squad) {
    if (!club || !squad) return null;
    const age = String(workspace?.ageGroup || "").toLowerCase();
    const gender = workspaceGenderHint();
    const suffix = String(squad).toLowerCase();
    const candidates = gameCatalogTeams.filter(team => {
      if (team.clubSlug !== club.slug) return false;
      if (age && String(team.ageGroup || "").toLowerCase() !== age) return false;
      if (gender && team.group && !String(team.group).toLowerCase().includes(gender)) return false;
      const normalizedTeam = normalizedGameTeamName(team.team);
      return normalizedTeam === `${normalizedGameTeamName(club.club)} ${suffix}` || normalizedTeam.endsWith(` ${suffix}`);
    });
    return candidates[0] || null;
  }

  function resolveGameDayTeamIdentity(name) {
    const normalized = normalizedGameTeamName(name);
    if (!normalized) return null;
    const age = String(workspace?.ageGroup || "").toLowerCase();
    const gender = workspaceGenderHint();
    const scopedTeams = gameCatalogTeams.filter(team => {
      if (age && String(team.ageGroup || "").toLowerCase() !== age) return false;
      if (gender && team.group && !String(team.group).toLowerCase().includes(gender)) return false;
      return true;
    });
    const exactTeam = scopedTeams.find(team => normalizedGameTeamName(team.team) === normalized)
      || gameCatalogTeams.find(team => normalizedGameTeamName(team.team) === normalized);
    if (exactTeam) {
      const club = gameCatalogClubs.find(row => row.slug === exactTeam.clubSlug) || null;
      return {team:exactTeam,club,displayName:shortClubDisplayName(club) || exactTeam.displayClubName || exactTeam.club || exactTeam.team,matchType:"exact_team",confidence:1};
    }

    for (const club of gameCatalogClubs) {
      for (const alias of clubAliases(club)) {
        if (normalized !== alias && !normalized.startsWith(`${alias} `)) continue;
        const squad = squadTokenForInput(normalized,alias,club);
        if (squad === null) continue;
        const team = teamForClubSquad(club,squad);
        return {
          team,
          club,
          displayName:shortClubDisplayName(club),
          matchType:squad ? "club_squad_alias" : "club_alias",
          confidence:squad ? 0.98 : 0.96,
          squad:squad || null
        };
      }
    }
    return null;
  }

  function catalogTeamMatch(name) {
    return resolveGameDayTeamIdentity(name)?.team || null;
  }

  function currentTeamCatalogMatch() {
    return resolveGameDayTeamIdentity(workspace?.teamName || "")?.team || null;
  }

  function safeGameLogo(value) {
    return value || "assets/branding/wpi-logo-mark.png";
  }

  function scheduleParticipantResolution(participant) {
    const source = participant || {};
    const identity = resolveGameDayTeamIdentity(source.name || "");
    return {
      source,
      identity,
      teamId: source.teamId || identity?.team?.canonicalTeamId || null,
      clubId: source.clubId || identity?.club?.canonicalClubId || (identity?.club?.slug ? `club-${identity.club.slug}` : null),
      displayName: identity?.displayName || source.name || "Opponent",
      logo: identity?.team?.logo || identity?.club?.logo || null
    };
  }

  function participantWorkspaceMatchScore(participant) {
    const ownIdentity = resolveGameDayTeamIdentity(workspace?.teamName || "");
    const ownTeamId = ownIdentity?.team?.canonicalTeamId || null;
    const ownClubId = ownIdentity?.club?.canonicalClubId || (ownIdentity?.club?.slug ? `club-${ownIdentity.club.slug}` : null);
    const resolved = scheduleParticipantResolution(participant);
    if (!workspace || !participant) return 0;
    if (ownTeamId && resolved.teamId) return ownTeamId === resolved.teamId ? 1 : 0;
    if (normalizedGameTeamName(participant.name) === normalizedGameTeamName(workspace.teamName)) return 1;
    if (ownClubId && resolved.clubId && ownClubId === resolved.clubId) {
      // Club-only schedule identities are intentionally not strong enough to
      // auto-import when WPI knows multiple squads for the same club/age group.
      return resolved.identity?.team ? 0 : 0.68;
    }
    return 0;
  }

  function officialGameForWorkspace(row) {
    if (!row || !workspace) return null;
    if (row.competitiveSeason && workspace.competitiveSeason && row.competitiveSeason !== workspace.competitiveSeason) return null;
    if (row.ageGroup && workspace.ageGroup && String(row.ageGroup).toUpperCase() !== String(workspace.ageGroup).toUpperCase()) return null;
    const genderHint = workspaceGenderHint();
    if (genderHint && row.gender && String(row.gender).toLowerCase() !== genderHint) return null;
    const whiteScore = participantWorkspaceMatchScore(row.white);
    const darkScore = participantWorkspaceMatchScore(row.dark);
    const ownSide = whiteScore >= darkScore ? "white" : "dark";
    const ownMatchScore = Math.max(whiteScore,darkScore);
    if (ownMatchScore < 0.6 || Math.abs(whiteScore-darkScore) < 0.15) return null;
    const ownParticipant = ownSide === "white" ? row.white : row.dark;
    const opponentParticipant = ownSide === "white" ? row.dark : row.white;
    const ownResolved = scheduleParticipantResolution(ownParticipant);
    const opponentResolved = scheduleParticipantResolution(opponentParticipant);
    const ownIdentity = resolveGameDayTeamIdentity(workspace.teamName || "");
    const scores = row.scores || {};
    return {
      eventId: row.eventId,
      gameId: row.gameId,
      tournamentName: row.eventName,
      tournamentPublicId: row.eventId,
      eventPublicPath: row.eventPublicPath || null,
      competitiveSeason: row.competitiveSeason || workspace.competitiveSeason,
      scheduledAt: row.scheduledAt || null,
      timezone: row.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      venue: row.venue || null,
      ageGroup: row.ageGroup || workspace.ageGroup,
      divisionId: row.divisionId || null,
      divisionLabel: row.divisionLabel || null,
      gameNumber: row.gameNumber || null,
      stage: row.stage || null,
      status: row.status || null,
      teamSide: ownSide,
      teamName: ownResolved.displayName || ownParticipant?.name || workspace.teamName,
      teamWpiTeamId: ownIdentity?.team?.canonicalTeamId || ownResolved.teamId || null,
      teamWpiClubId: ownIdentity?.club?.canonicalClubId || (ownIdentity?.club?.slug ? `club-${ownIdentity.club.slug}` : ownResolved.clubId),
      opponentName: opponentResolved.displayName || opponentParticipant?.name || "Opponent",
      opponentSourceName: opponentParticipant?.name || opponentResolved.displayName || "Opponent",
      opponentWpiTeamId: opponentResolved.teamId,
      opponentWpiClubId: opponentResolved.clubId,
      teamLogoUrl: ownIdentity?.team?.logo || ownIdentity?.club?.logo || ownResolved.logo,
      opponentLogoUrl: opponentResolved.logo,
      teamScore: ownSide === "white" ? scores.white : scores.dark,
      opponentScore: ownSide === "white" ? scores.dark : scores.white,
      workspaceMatchConfidence: ownMatchScore
    };
  }

  async function loadTournamentScheduleIndex({force=false} = {}) {
    if (tournamentScheduleIndex && !force) return tournamentScheduleIndex;
    tournamentScheduleLoadError = null;
    try {
      const response = await fetch(`data/live/tournament-schedule-index.json${force ? `?ts=${Date.now()}` : ""}`, {cache:"no-store"});
      if (!response.ok) throw new Error(`WPI schedule index returned ${response.status}`);
      tournamentScheduleIndex = await response.json();
      tournamentScheduleCandidates = (tournamentScheduleIndex.games || []).map(officialGameForWorkspace).filter(Boolean);
    } catch (error) {
      tournamentScheduleIndex = null;
      tournamentScheduleCandidates = [];
      tournamentScheduleLoadError = error;
    }
    renderTournamentScheduleStatus();
    return tournamentScheduleIndex;
  }

  function normalizedVenue(value) {
    return normalizedGameTeamName(value || "");
  }

  function manualOfficialMatchConfidence(manual, official) {
    if (!manual || !official || manual.gameKind !== "tournament") return 0;
    if (manual.officialTournamentEventId || manual.officialSourceGameId) return 0;
    if (manual.reconciliationStatus === "dismissed"
      && manual.reconciliationCandidateEventId === official.eventId
      && manual.reconciliationCandidateGameId === official.gameId) return 0;

    let score = 0;
    const manualTournamentId = String(manual.tournamentPublicId || "");
    const manualTournamentName = normalizedGameTeamName(manual.tournamentName || "");
    const officialTournamentName = normalizedGameTeamName(official.tournamentName || "");
    if (manualTournamentId && manualTournamentId === official.eventId) score += 0.35;
    else if (manualTournamentName && manualTournamentName === officialTournamentName) score += 0.30;
    else if (manualTournamentId || manualTournamentName) return 0;

    const manualTeamId = String(manual.opponentWpiTeamId || "");
    const manualClubId = String(manual.opponentWpiClubId || "");
    if (manualTeamId && official.opponentWpiTeamId && manualTeamId === official.opponentWpiTeamId) score += 0.40;
    else if (manualClubId && official.opponentWpiClubId && manualClubId === official.opponentWpiClubId) score += 0.35;
    else {
      const manualOpponent = normalizedGameTeamName(manual.opponentSourceName || manual.opponentName || "");
      const officialOpponent = normalizedGameTeamName(official.opponentSourceName || official.opponentName || "");
      if (manualOpponent && manualOpponent === officialOpponent) score += 0.30;
      else if (normalizedGameTeamName(manual.opponentName || "") === normalizedGameTeamName(official.opponentName || "")) score += 0.25;
      else return 0;
    }

    if (manual.ageGroup && official.ageGroup && String(manual.ageGroup).toUpperCase() === String(official.ageGroup).toUpperCase()) score += 0.05;
    if (manual.scheduledAt && official.scheduledAt) {
      const manualTime = new Date(manual.scheduledAt).getTime();
      const officialTime = new Date(official.scheduledAt).getTime();
      if (Number.isFinite(manualTime) && Number.isFinite(officialTime)) {
        const minutes = Math.abs(manualTime-officialTime)/60000;
        if (minutes <= 15) score += 0.20;
        else if (minutes <= 60) score += 0.15;
        else if (minutes <= 180) score += 0.08;
        else if (new Date(manualTime).toDateString() === new Date(officialTime).toDateString()) score += 0.05;
      }
    }
    if (manual.venue && official.venue && normalizedVenue(manual.venue) === normalizedVenue(official.venue)) score += 0.05;
    return Math.min(1,score);
  }

  function officialRpcPayload(official) {
    return {
      eventId:official.eventId,
      gameId:official.gameId,
      tournamentName:official.tournamentName,
      tournamentPublicId:official.tournamentPublicId || official.eventId,
      eventPublicPath:official.eventPublicPath || null,
      scheduledAt:official.scheduledAt,
      timezone:official.timezone,
      venue:official.venue,
      ageGroup:official.ageGroup,
      divisionId:official.divisionId,
      divisionLabel:official.divisionLabel,
      gameNumber:official.gameNumber,
      stage:official.stage,
      status:official.status,
      teamSide:official.teamSide,
      teamName:official.teamName,
      teamWpiTeamId:official.teamWpiTeamId,
      teamWpiClubId:official.teamWpiClubId,
      opponentName:official.opponentName,
      opponentSourceName:official.opponentSourceName,
      opponentWpiTeamId:official.opponentWpiTeamId,
      opponentWpiClubId:official.opponentWpiClubId,
      teamLogoUrl:official.teamLogoUrl,
      opponentLogoUrl:official.opponentLogoUrl,
      teamScore:official.teamScore ?? null,
      opponentScore:official.opponentScore ?? null
    };
  }

  function renderTournamentScheduleStatus() {
    const pill = $("wpiScheduleStatusPill");
    const summary = $("wpiScheduleSummary");
    const detail = $("wpiScheduleDetail");
    const button = $("syncWpiScheduleButton");
    if (!pill || !summary || !detail || !button) return;
    if (tournamentScheduleLoadError) {
      pill.textContent = "Manual fallback available";
      pill.dataset.state = "attention";
      summary.textContent = "WPI could not load the tournament schedule right now.";
      detail.textContent = "You can still add the tournament game manually and WPI will reconcile it after the official schedule becomes available.";
      button.textContent = "Try schedule again";
      return;
    }
    const next = tournamentScheduleIndex?.nextTournament || null;
    const scheduleCount = tournamentScheduleCandidates.length;
    if (!tournamentScheduleIndex) {
      pill.textContent = "Checking";
      pill.dataset.state = "loading";
      summary.textContent = "Checking the WPI tournament schedule…";
      detail.textContent = "Manual tournament entry remains available at all times.";
      return;
    }
    if (!scheduleCount) {
      pill.textContent = next?.status === "announced" ? "Schedule coming soon" : "No schedule games";
      pill.dataset.state = "waiting";
      summary.textContent = next?.name ? `${next.name}${next.dateLabel ? ` · ${next.dateLabel}` : ""}` : "No official WPI schedule is published for this team yet.";
      detail.textContent = next?.description || "Add a tournament game manually if needed. It will remain eligible for reconciliation later.";
      button.textContent = "Check WPI schedule";
      return;
    }
    const reviewCount = gameDayQueue.filter(game => game.reconciliationStatus === "possible_match").length;
    pill.textContent = reviewCount ? `${reviewCount} match${reviewCount === 1 ? "" : "es"} to review` : `${scheduleCount} official game${scheduleCount === 1 ? "" : "s"}`;
    pill.dataset.state = reviewCount ? "attention" : "connected";
    summary.textContent = `WPI found ${scheduleCount} official ${workspace?.teamName || "team"} game${scheduleCount === 1 ? "" : "s"} in the active tournament schedule.`;
    detail.textContent = reviewCount ? "Ambiguous manual fallbacks are never merged silently. Review the flagged game card below." : "Official games sync into Game Day; strong manual fallback matches reconcile to the same scored record.";
    button.textContent = "Sync WPI schedule";
  }

  async function syncTournamentSchedule({automatic=false,force=false} = {}) {
    if (tournamentScheduleSyncBusy || !backend || !workspace) return;
    tournamentScheduleSyncBusy = true;
    const button = $("syncWpiScheduleButton");
    const message = $("wpiScheduleSyncMessage");
    if (button) button.disabled = true;
    if (message) message.textContent = automatic ? "Checking WPI schedule…" : "Syncing WPI tournament schedule…";
    try {
      await loadGameCatalog();
      await loadTournamentScheduleIndex({force});
      if (!tournamentScheduleCandidates.length) {
        if (message) message.textContent = tournamentScheduleIndex?.nextTournament?.status === "announced" ? "The next tournament is announced; its official schedule has not been published to WPI yet." : "No official WPI schedule games are available for this team yet.";
        return;
      }
      if (!["owner","admin"].includes(workspace.role)) {
        if (message) message.textContent = "The official schedule is visible. A Team Owner or Admin syncs it into Game Day.";
        return;
      }

      const existingOfficial = new Map(gameDayQueue.filter(game => game.officialTournamentEventId && game.officialSourceGameId).map(game => [`${game.officialTournamentEventId}|${game.officialSourceGameId}`,game]));
      const manualPool = gameDayQueue.filter(game => game.gameKind === "tournament" && game.creationSource !== "tournament_schedule" && !game.officialSourceGameId && game.status !== "cancelled");
      const claimedManualIds = new Set();
      const now = Date.now();
      let created = 0, reconciled = 0, refreshed = 0, possible = 0, skipped = 0;

      const candidates = [...tournamentScheduleCandidates].sort((a,b) => String(a.scheduledAt || "").localeCompare(String(b.scheduledAt || "")));
      for (const official of candidates) {
        const key = `${official.eventId}|${official.gameId}`;
        const linked = existingOfficial.get(key);
        if (linked) {
          const {data,error} = await backend.client.rpc("live_sync_official_tournament_game_v1", {target_team_id:workspace.teamId,official_game:officialRpcPayload(official),candidate_manual_game_id:null,match_confidence:1});
          if (error) throw error;
          if (data?.action === "refreshed") refreshed += 1;
          continue;
        }

        const ranked = manualPool
          .filter(game => !claimedManualIds.has(game.id))
          .map(game => ({game,score:manualOfficialMatchConfidence(game,official)}))
          .filter(row => row.score >= 0.60)
          .sort((a,b) => b.score-a.score);
        let selected = ranked[0] || null;
        if (selected && ranked[1] && selected.score-ranked[1].score < 0.10) selected = {...selected,score:Math.min(selected.score,0.79)};
        if (selected) claimedManualIds.add(selected.game.id);

        const officialTime = official.scheduledAt ? new Date(official.scheduledAt).getTime() : NaN;
        const isFutureOrCurrent = !Number.isFinite(officialTime) || officialTime >= now - 12*60*60*1000;
        const shouldCreate = !selected && String(official.status || "").toLowerCase() !== "final" && isFutureOrCurrent;
        if (!selected && !shouldCreate) { skipped += 1; continue; }

        const {data,error} = await backend.client.rpc("live_sync_official_tournament_game_v1", {
          target_team_id:workspace.teamId,
          official_game:officialRpcPayload(official),
          candidate_manual_game_id:selected?.game?.id || null,
          match_confidence:selected?.score ?? null
        });
        if (error) throw error;
        if (data?.action === "created") created += 1;
        else if (data?.action === "reconciled") reconciled += 1;
        else if (data?.action === "possible_match") possible += 1;
        else if (data?.action === "refreshed") refreshed += 1;
      }

      await loadGameDayQueue();
      renderTournamentScheduleStatus();
      if (message) {
        const parts = [];
        if (created) parts.push(`${created} official game${created === 1 ? "" : "s"} added`);
        if (reconciled) parts.push(`${reconciled} manual game${reconciled === 1 ? "" : "s"} reconciled`);
        if (possible) parts.push(`${possible} match${possible === 1 ? "" : "es"} need review`);
        if (refreshed && !parts.length) parts.push(`${refreshed} official game${refreshed === 1 ? "" : "s"} refreshed`);
        if (!parts.length) parts.push(skipped ? "No new upcoming games to add" : "Schedule is already in sync");
        message.textContent = parts.join(" · ") + ".";
      }
    } catch (error) {
      if (message) message.textContent = error.message || "The WPI tournament schedule could not be synced.";
      if (!automatic) throw error;
    } finally {
      tournamentScheduleSyncBusy = false;
      if (button) button.disabled = false;
      renderTournamentScheduleStatus();
    }
  }

  async function autoSyncTournamentSchedule() {
    if (!workspace?.teamId || tournamentScheduleAutoSyncedTeamId === workspace.teamId) return;
    tournamentScheduleAutoSyncedTeamId = workspace.teamId;
    await syncTournamentSchedule({automatic:true});
  }

  async function confirmTournamentReconciliation(gameId) {
    const {error} = await backend.client.rpc("live_confirm_tournament_reconciliation_v1", {target_game_id:gameId});
    if (error) throw error;
    await loadGameDayQueue();
    renderTournamentScheduleStatus();
    const message = $("wpiScheduleSyncMessage");
    if (message) message.textContent = "Manual tournament game linked to the official WPI schedule. The score and event log stayed on the same game record.";
  }

  async function dismissTournamentReconciliation(gameId) {
    const {error} = await backend.client.rpc("live_dismiss_tournament_reconciliation_v1", {target_game_id:gameId});
    if (error) throw error;
    await loadGameDayQueue();
    renderTournamentScheduleStatus();
    const message = $("wpiScheduleSyncMessage");
    if (message) message.textContent = "That official matchup will not be linked to this manual game.";
  }

  async function loadGameCatalog() {
    if (gameCatalogLoaded) return;
    try {
      const [clubsResponse,tournamentsResponse,aliasesResponse] = await Promise.all([
        fetch("clubs.json", {cache:"no-store"}),
        fetch("data/tournaments/public-hub.json", {cache:"no-store"}),
        fetch("data/live/team-identity-aliases.json", {cache:"no-store"})
      ]);
      if (aliasesResponse.ok) {
        const aliasData = await aliasesResponse.json();
        gameIdentityAliases = new Map((aliasData.clubs || []).map(row => [row.canonicalClubSlug,row]));
      }
      if (clubsResponse.ok) {
        const clubs = await clubsResponse.json();
        gameCatalogClubs = (Array.isArray(clubs) ? clubs : []).map(club => ({...club,logo:club.logo || null}));
        gameCatalogTeams = gameCatalogClubs.flatMap(club => (club.teams || []).map(team => ({
          ...team,
          club:team.club || club.club,
          clubSlug:team.clubSlug || club.slug,
          displayClubName:team.displayClubName || club.displayName || club.club,
          logo:team.logo || club.logo || null
        })));
      }
      if (tournamentsResponse.ok) {
        const hub = await tournamentsResponse.json();
        const seen = new Set();
        const rows = [];
        const add = row => {
          if (!row?.name) return;
          const key = `${row.id || ""}|${row.name}|${row.competitiveSeason || ""}`;
          if (seen.has(key)) return;
          seen.add(key);
          rows.push(row);
        };
        if (hub.nextTournament?.name) add({
          id:null,
          name:hub.nextTournament.name,
          dateLabel:hub.nextTournament.dateLabel || "Upcoming",
          competitiveSeason:hub.nextTournament.competitiveSeason || workspace?.competitiveSeason,
          status:hub.nextTournament.status || "announced",
          isNext:true
        });
        (hub.events || []).forEach(add);
        gameCatalogTournaments = rows.sort((a,b) => {
          const aCurrent = a.competitiveSeason === workspace?.competitiveSeason ? 0 : 1;
          const bCurrent = b.competitiveSeason === workspace?.competitiveSeason ? 0 : 1;
          return aCurrent - bCurrent || Number(Boolean(b.isNext)) - Number(Boolean(a.isNext)) || String(b.dateLabel || "").localeCompare(String(a.dateLabel || ""));
        });
      }
    } catch (_) {
      // Manual entry remains available even if public WPI catalogs fail to load.
    }
    gameCatalogLoaded = true;
    populateGameCatalogControls();
  }

  function populateGameCatalogControls() {
    const opponentList = $("gameOpponentSuggestions");
    if (opponentList) {
      const age = String(workspace?.ageGroup || "");
      const gender = workspaceGenderHint();
      const candidates = gameCatalogTeams.filter(team => (!age || team.ageGroup === age) && (!gender || !team.group || String(team.group).toLowerCase().includes(gender)));
      const seen = new Set();
      opponentList.innerHTML = candidates.filter(team => {
        const key = `${team.team}|${team.canonicalTeamId || team.slug || ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0,250).map(team => `<option value="${escapeHtml(team.team)}">${escapeHtml([team.displayClubName || team.club,team.group].filter(Boolean).join(" · "))}</option>`).join("");
    }

    const tournamentSelect = $("gameTournamentSelect");
    if (tournamentSelect) {
      tournamentSelect.innerHTML = '<option value="">Choose tournament</option>' + gameCatalogTournaments.map((event,index) => {
        const value = event.id ? `id:${event.id}` : `next:${index}`;
        const suffix = [event.dateLabel,event.competitiveSeason].filter(Boolean).join(" · ");
        return `<option value="${escapeHtml(value)}">${escapeHtml(event.name)}${suffix ? ` · ${escapeHtml(suffix)}` : ""}</option>`;
      }).join("") + '<option value="__other__">Other / unlisted tournament</option>';
    }
  }

  function selectedTournamentCatalogEntry() {
    const value = $("gameTournamentSelect")?.value || "";
    if (value.startsWith("id:")) return gameCatalogTournaments.find(event => String(event.id) === value.slice(3)) || null;
    if (value.startsWith("next:")) return gameCatalogTournaments[Number(value.slice(5))] || null;
    return null;
  }

  function selectedGameKind() {
    return document.querySelector('input[name="gameKind"]:checked')?.value || "tournament";
  }

  function renderGameKindFields() {
    const tournament = selectedGameKind() === "tournament";
    $("gameTournamentFields").hidden = !tournament;
    $("gameFriendlyFields").hidden = tournament;
    const other = tournament && $("gameTournamentSelect").value === "__other__";
    $("gameTournamentOtherLabel").hidden = !other;
    updateGameMatchupPreview();
  }

  function updateGameMatchupPreview() {
    const opponentSourceName = $("gameOpponentName")?.value.trim() || "";
    const identity = resolveGameDayTeamIdentity(opponentSourceName);
    const opponent = identity?.team || null;
    const ownIdentity = resolveGameDayTeamIdentity(workspace?.teamName || "");
    const own = ownIdentity?.team || null;
    $("gameTeamPreviewName").textContent = ownIdentity?.displayName || workspace?.teamName || "Your team";
    $("gameOpponentPreviewName").textContent = identity?.displayName || opponentSourceName || "Opponent";
    $("gameTeamLogoPreview").src = safeGameLogo(own?.logo || ownIdentity?.club?.logo);
    $("gameOpponentLogoPreview").src = safeGameLogo(opponent?.logo || identity?.club?.logo);
    const hint = $("gameOpponentMatchHint");
    if (hint) {
      if (identity?.club) {
        const squad = identity.squad ? ` · ${identity.squad} squad recognized for matching` : "";
        hint.textContent = `Matched WPI club: ${identity.displayName}${squad}. The original name is preserved for tournament reconciliation.`;
        hint.dataset.state = "matched";
      } else if (opponentSourceName) {
        hint.textContent = "No WPI club match yet. Keep typing or leave the manual name as entered.";
        hint.dataset.state = "unmatched";
      } else {
        hint.textContent = "Type a club or team name. WPI will load a known logo automatically when it recognizes the club.";
        hint.dataset.state = "idle";
      }
    }
    $("gameTeamLogoPreview").onerror = event => { event.currentTarget.onerror = null; event.currentTarget.src = "assets/branding/wpi-logo-mark.png"; };
    $("gameOpponentLogoPreview").onerror = event => { event.currentTarget.onerror = null; event.currentTarget.src = "assets/branding/wpi-logo-mark.png"; };
  }

  function gameDayDialogTournamentValues(game = null) {
    const select = $("gameTournamentSelect");
    if (!select) return;
    const publicId = game?.tournamentPublicId || "";
    const name = game?.tournamentName || "";
    let value = "";
    if (publicId && [...select.options].some(option => option.value === `id:${publicId}`)) value = `id:${publicId}`;
    if (!value && name) {
      const matchIndex = gameCatalogTournaments.findIndex(event => event.name === name && !event.id);
      if (matchIndex >= 0) value = `next:${matchIndex}`;
      const idMatch = gameCatalogTournaments.find(event => event.name === name && event.id);
      if (!value && idMatch) value = `id:${idMatch.id}`;
    }
    if (!value && name) value = "__other__";
    select.value = value;
    $("gameTournamentOther").value = value === "__other__" ? name : "";
  }

  function assignableGameScorers() {
    const members = Array.isArray(teamAccess?.members) ? teamAccess.members : [];
    return members.filter(member => ["owner","admin","scorer"].includes(member.role));
  }

  function scorerAssignmentOptions(selectedUserId = "") {
    const selected = String(selectedUserId || "");
    return ['<option value="">Unassigned</option>', ...assignableGameScorers().map(member => {
      const label = member.displayName || member.email || "Team member";
      const role = roleLabel(member.role);
      return `<option value="${escapeHtml(member.userId)}"${String(member.userId) === selected ? " selected" : ""}>${escapeHtml(label)} · ${escapeHtml(role)}</option>`;
    })].join("");
  }

  function populateGameScorerSelect(game = null) {
    const select = $("gameAssignedScorer");
    const row = $("gameAssignedScorerRow");
    if (!select || !row) return;
    const manager = workspace && ["owner","admin"].includes(workspace.role);
    row.hidden = !manager;
    if (!manager) return;
    select.innerHTML = scorerAssignmentOptions(game?.assignedScorerUserId || "");
    select.value = game?.assignedScorerUserId || "";
  }

  async function assignGameScorer(gameId, userId) {
    if (!backend || !workspace || !["owner","admin"].includes(workspace.role)) return;
    const {error} = await backend.client.rpc("live_assign_game_scorer_v1", {
      target_game_id:gameId,
      target_scorer_user_id:userId || null
    });
    if (error) throw error;
  }

  async function openGameDayDialog(game = null) {
    await loadGameCatalog();
    editingGameDayId = game?.id || null;
    $("gameDayDialogKicker").textContent = game ? "Edit game" : "Game-Day Hub";
    $("gameDayDialogTitle").textContent = game ? "Update game details" : "Add game";
    $("gameDayDialogHelp").textContent = game
      ? "You can change matchup details until the game starts. Live and completed records are protected from Game-Day Hub rewrites."
      : "Choose Tournament or Friendly. Tournament games stay tied to their tournament; Friendly games are stored under a named Scrimmage Weekend.";
    const kind = game?.gameKind === "scrimmage" ? "friendly" : (game?.gameKind || "tournament");
    const kindInput = document.querySelector(`input[name="gameKind"][value="${CSS.escape(kind)}"]`);
    if (kindInput) kindInput.checked = true;
    $("gameOpponentName").value = game?.opponentSourceName || game?.opponentName || "";
    $("gameScheduledAt").value = localDateTimeValue(game?.scheduledAt);
    $("gameVenue").value = game?.venue || "";
    $("gameQuarterLength").value = String(Math.round(Number(game?.quarterLengthSeconds || 420) / 60));
    gameDayDialogTournamentValues(game);
    $("gameScrimmageWeekendName").value = game?.seriesType === "scrimmage_weekend" ? (game?.seriesName || game?.scrimmageWeekendName || "") : "";
    populateGameScorerSelect(game);
    $("gameDayDialogMessage").textContent = "";
    $("saveGameDayButton").textContent = game ? "Save changes" : "Save to Game Day";
    $("saveStartGameDayButton").textContent = "Start game";
    renderGameKindFields();
    updateGameMatchupPreview();
    $("gameDayDialog").showModal();
    window.setTimeout(() => $("gameOpponentName").focus(),0);
  }

  function gameDayFormPayload() {
    const kind = selectedGameKind();
    const opponentName = $("gameOpponentName").value.trim();
    const scheduledLocal = $("gameScheduledAt").value;
    const tournamentEntry = selectedTournamentCatalogEntry();
    const tournamentName = kind === "tournament"
      ? ($("gameTournamentSelect").value === "__other__" ? $("gameTournamentOther").value.trim() : (tournamentEntry?.name || ""))
      : null;
    const identity = resolveGameDayTeamIdentity(opponentName);
    const opponent = identity?.team || null;
    const ownIdentity = resolveGameDayTeamIdentity(workspace?.teamName || "");
    const own = ownIdentity?.team || null;
    const scrimmageWeekendName = kind === "friendly" ? $("gameScrimmageWeekendName").value.trim() : null;
    if (!opponentName) throw new Error("Enter the opponent.");
    if (kind === "tournament" && !tournamentName) throw new Error("Choose a tournament or enter an unlisted tournament name.");
    if (kind === "friendly" && !scrimmageWeekendName) throw new Error("Enter the scrimmage weekend name so this game has a permanent weekend record.");
    let scheduledAt = null;
    if (scheduledLocal) {
      const date = new Date(scheduledLocal);
      if (Number.isNaN(date.getTime())) throw new Error("Enter a valid game date and time.");
      scheduledAt = date.toISOString();
    }
    return {
      kind,
      opponentName:identity?.displayName || opponentName,
      opponentSourceName:opponentName,
      scheduledAt,
      timezone:Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      venue:$("gameVenue").value.trim() || null,
      quarterMinutes:Number($("gameQuarterLength").value || 7),
      tournamentName,
      seriesName:kind === "tournament" ? tournamentName : scrimmageWeekendName,
      tournamentPublicId:kind === "tournament" ? (tournamentEntry?.id || null) : null,
      opponentWpiTeamId:opponent?.canonicalTeamId || null,
      opponentWpiClubId:identity?.club?.canonicalClubId || (identity?.club?.slug ? `club-${identity.club.slug}` : null),
      teamLogoUrl:own?.logo || ownIdentity?.club?.logo || null,
      opponentLogoUrl:opponent?.logo || identity?.club?.logo || null,
      assignedScorerUserId:$("gameAssignedScorer")?.value || null
    };
  }

  async function verifyGameDayRecord(gameId) {
    if (!backend || !gameId) throw new Error("Game ID is missing.");
    const {data,error} = await backend.client.rpc("live_game_day_record_v1", {target_game_id:gameId});
    if (error) throw error;
    if (!data?.gameId || String(data.gameId) !== String(gameId)) throw new Error("WPI could not verify the saved game. Keep this window open and try Refresh before creating another game.");
    return data;
  }

  async function prepareGameDayStart(gameId) {
    if (!backend || !gameId) throw new Error("Game ID is missing.");
    await verifyGameDayRecord(gameId);
    const {data,error} = await backend.client.rpc("live_prepare_game_start_v3", {target_game_id:gameId});
    if (error) throw error;
    if (data?.canScore === false) throw new Error(data?.activeDisplayName ? `Scoring is currently controlled by ${data.activeDisplayName}.` : "This account could not take scoring control.");
    const loaded = await backend.loadGameState(gameId);
    if (!loaded?.remoteGameId || !loaded?.state?.game || !loaded?.state?.setup) {
      throw new Error("The game was saved, but its scorer state could not be loaded. WPI kept the game on Game Day; refresh and try Start game again.");
    }
    return loaded;
  }

  async function refreshSavedGame(gameId) {
    await loadGameDayQueue();
    const saved = gameDayQueue.find(row => String(row.id) === String(gameId));
    if (!saved) throw new Error("The game was saved, but WPI could not reload it into Game Day. Refresh before creating another game.");
    backend.listGames(workspace.teamId).then(rows => { games = rows || []; renderGames(); }).catch(() => {});
    return saved;
  }

  async function saveGameDay({startAfter=false} = {}) {
    if (!backend || !workspace || !["owner","admin"].includes(workspace.role)) return;
    const message = $("gameDayDialogMessage");
    let payload;
    try { payload = gameDayFormPayload(); }
    catch (error) { message.textContent = error.message; return; }
    if (!editingGameDayId && payload.scheduledAt) {
      const requestedTime = new Date(payload.scheduledAt).getTime();
      const requestedOpponent = normalizedGameTeamName(payload.opponentName);
      const requestedTournament = normalizedGameTeamName(payload.tournamentName || "");
      const similar = gameDayQueue.find(game => {
        if (!game?.scheduledAt || ["cancelled"].includes(game.status)) return false;
        if (normalizedGameTeamName(game.opponentName) !== requestedOpponent) return false;
        if ((game.gameKind || "friendly") !== payload.kind) return false;
        if (payload.kind === "tournament" && normalizedGameTeamName(game.tournamentName || "") !== requestedTournament) return false;
        const existingTime = new Date(game.scheduledAt).getTime();
        return Number.isFinite(existingTime) && Math.abs(existingTime - requestedTime) <= 90 * 60 * 1000;
      });
      if (similar && !confirm(`A similar ${payload.kind === "tournament" ? "tournament " : ""}game is already on Game Day (${workspace.teamName} vs ${similar.opponentName} · ${gameDayTimeLabel(similar.scheduledAt)}). Add another game anyway?`)) {
        message.textContent = "No duplicate was added.";
        return;
      }
    }
    const buttons = [$("saveGameDayButton"),$("saveStartGameDayButton")];
    buttons.forEach(button => button.disabled = true);
    message.textContent = editingGameDayId ? "Saving game and scoring coverage…" : "Saving game and scoring coverage…";
    try {
      const {data:result,error} = await backend.client.rpc("live_save_game_day_v2", {
        target_team_id:workspace.teamId,
        target_game_id:editingGameDayId || null,
        requested_game_kind:payload.kind,
        requested_opponent_name:payload.opponentName,
        requested_opponent_source_name:payload.opponentSourceName,
        requested_scheduled_at:payload.scheduledAt,
        requested_timezone:payload.timezone,
        requested_venue:payload.venue,
        requested_quarter_length_minutes:payload.quarterMinutes,
        requested_tournament_name:payload.tournamentName,
        requested_tournament_public_id:payload.tournamentPublicId,
        requested_series_name:payload.seriesName,
        requested_opponent_wpi_team_id:payload.opponentWpiTeamId,
        requested_opponent_wpi_club_id:payload.opponentWpiClubId,
        requested_team_logo_url:payload.teamLogoUrl,
        requested_opponent_logo_url:payload.opponentLogoUrl,
        target_scorer_user_id:payload.assignedScorerUserId || null
      });
      if (error) throw error;
      const gameId = result?.gameId;
      if (!gameId) throw new Error("WPI did not return the saved game ID. Nothing else was started.");
      await verifyGameDayRecord(gameId);
      await refreshSavedGame(gameId);
      if (startAfter) {
        message.textContent = "Checking the saved game and preparing scoring…";
        await prepareGameDayStart(gameId);
        window.location.assign(teamScopedUrl("live-game.html", {game:gameId}));
        return;
      }
      $("gameDayDialog").close();
      $("gameDayQueueMessage").textContent = "Game saved. It is on deck and ready to start when your scorer is ready.";
      $("dashboardGameDay")?.scrollIntoView({behavior:"smooth",block:"start"});
    } catch (error) {
      message.textContent = error.message || "The game could not be saved.";
    } finally {
      buttons.forEach(button => button.disabled = false);
    }
  }

  async function cancelPlannedGame(gameId) {
    const game = gameDayQueue.find(row => row.id === gameId);
    if (!game || !["owner","admin"].includes(workspace?.role)) return;
    if (!confirm(`Cancel ${workspace.teamName} vs ${game.opponentName}? The scored-history record will not be deleted.`)) return;
    const {error} = await backend.client.rpc("live_cancel_planned_game_v1", {target_game_id:gameId,cancel_reason:"Cancelled from Game-Day Hub"});
    if (error) throw error;
    await loadGames();
  }

  function gameDayDisplayStatus(game) {
    if (game.status === "live") return {label:"Live",state:"live"};
    if (game.status === "final") return {label:"Final",state:"final"};
    const ready = readinessModel().allReady;
    return ready ? {label:"Ready",state:"ready"} : {label:"Upcoming",state:"upcoming"};
  }

  function gameDaySourceLabel(game) {
    if (game.gameKind === "tournament") {
      if (game.reconciliationStatus === "conflict") return "Official schedule linked · score conflict needs review";
      if (game.reconciliationStatus === "possible_match") return "Possible WPI schedule match · review required";
      if (game.reconciliationStatus === "verified" && game.creationSource === "tournament_schedule") return "WPI tournament schedule";
      if (game.reconciliationStatus === "verified") return "Manual tournament · matched to WPI schedule";
      if (game.reconciliationStatus === "dismissed") return "Manual tournament · prior schedule match dismissed";
      return "Manual tournament · official link pending";
    }
    return game.seriesName ? `Scrimmage weekend · ${game.seriesName}` : "Manual friendly";
  }

  function assignmentDisplay(game) {
    if (game.assignedScorerDisplayName) return game.assignedScorerDisplayName;
    if (game.assignedScorerUserId) return "Assigned scorer";
    return "Unassigned";
  }

  function roleHomeStatus(game) {
    if (game.status === "live") return {label:"Live",state:"live"};
    if (game.status === "final") return {label:"Final",state:"final"};
    return {label:"Upcoming",state:"upcoming"};
  }

  function renderRoleHome() {
    const panel = $("dashboardRoleHome");
    const list = $("roleHomeGames");
    if (!panel || !list || !workspace) return;
    const supporter = workspace.role === "viewer";
    const scorer = workspace.role === "scorer";
    panel.hidden = !(supporter || scorer);
    if (!(supporter || scorer)) return;

    if (supporter) {
      $("roleHomeKicker").textContent = "WPI Live";
      $("roleHomeTitle").textContent = "Follow a game";
      $("roleHomeHelp").textContent = "Live games are first. Upcoming games and recent finals stay easy to find without any team-administration setup.";
    } else {
      $("roleHomeKicker").textContent = "Game-day scoring";
      $("roleHomeTitle").textContent = "Your games";
      $("roleHomeHelp").textContent = "Open a live game, start one assigned to you, or claim an unassigned game when you are covering it.";
    }

    const scheduledTime = game => {
      const value = Date.parse(game.scheduledAt || game.startedAt || game.finalAt || 0);
      return Number.isFinite(value) ? value : 0;
    };
    const available = gameDayQueue.filter(game => game.status !== "cancelled");
    const groups = supporter ? [
      {key:"live", title:"Live now", rows:available.filter(game => game.status === "live").sort((a,b) => scheduledTime(a)-scheduledTime(b))},
      {key:"upcoming", title:"Upcoming", rows:available.filter(game => ["setup","scheduled"].includes(game.status)).sort((a,b) => scheduledTime(a)-scheduledTime(b))},
      {key:"final", title:"Recent finals", rows:available.filter(game => game.status === "final").sort((a,b) => scheduledTime(b)-scheduledTime(a)).slice(0,8)}
    ] : [
      {key:"live", title:"Live now", rows:available.filter(game => game.status === "live").sort((a,b) => scheduledTime(a)-scheduledTime(b))},
      {key:"assigned", title:"Assigned to you", rows:available.filter(game => ["setup","scheduled"].includes(game.status) && game.isAssignedToMe).sort((a,b) => scheduledTime(a)-scheduledTime(b))},
      {key:"open", title:"Available to claim", rows:available.filter(game => ["setup","scheduled"].includes(game.status) && !game.assignedScorerUserId).sort((a,b) => scheduledTime(a)-scheduledTime(b))}
    ];
    const populated = groups.filter(group => group.rows.length);

    if (!populated.length) {
      list.innerHTML = `<div class="live-role-game-empty"><strong>${supporter ? "No games to follow yet" : "No games assigned yet"}</strong><span>${supporter ? "Upcoming, live and completed games will appear here automatically." : "An Owner/Admin can assign a game, or you can claim an unassigned game when you are covering it."}</span></div>`;
      return;
    }

    const renderCard = game => {
      const status = roleHomeStatus(game);
      const opponentIdentity = resolveGameDayTeamIdentity(game.opponentSourceName || game.opponentName || "");
      const opponentDisplayName = opponentIdentity?.displayName || game.opponentName || "Opponent";
      const opponentLogo = game.opponentLogoUrl || opponentIdentity?.team?.logo || opponentIdentity?.club?.logo;
      const ownIdentity = resolveGameDayTeamIdentity(game.teamName || workspace.teamName || "");
      const ownDisplayName = ownIdentity?.displayName || game.teamName || workspace.teamName;
      const ownLogo = game.teamLogoUrl || ownIdentity?.team?.logo || ownIdentity?.club?.logo;
      const score = ["live","final"].includes(game.status) ? `<strong class="live-role-game-score">${escapeHtml(String(game.teamScore ?? 0))}–${escapeHtml(String(game.opponentScore ?? 0))}</strong>` : `<span class="live-role-game-vs">vs</span>`;
      let action = '<span class="live-role-game-waiting">Not started</span>';
      if (supporter && game.status === "live") action = `<a class="live-primary-link" href="${escapeHtml(teamScopedUrl("live-game.html", {game:game.id}))}">Follow live</a>`;
      else if (supporter && game.status === "final") action = `<a class="live-secondary-link" href="${escapeHtml(teamScopedUrl("live-game.html", {game:game.id}))}">View final</a>`;
      else if (supporter) action = '<span class="live-role-game-waiting">Upcoming</span>';
      else if (scorer && game.status === "live") action = `<button type="button" data-role-home-start="${escapeHtml(game.id)}">Open live game</button>`;
      else if (scorer && game.canStart !== false && ["setup","scheduled"].includes(game.status)) action = `<button type="button" data-role-home-start="${escapeHtml(game.id)}">Start game</button>`;
      else if (scorer) action = '<span class="live-role-game-waiting">Assigned elsewhere</span>';
      const coverage = scorer && game.status !== "live"
        ? `<span class="live-role-game-coverage" data-state="${game.isAssignedToMe ? "mine" : (game.assignedScorerUserId ? "assigned" : "open")}">${game.isAssignedToMe ? "Assigned to you" : (game.assignedScorerUserId ? "Assigned" : "Available to claim")}</span>`
        : "";
      return `<article class="live-role-game-card" data-role-game-id="${escapeHtml(game.id)}">
        <div class="live-role-game-top"><span>${escapeHtml(game.seriesName || (game.gameKind === "tournament" ? (game.tournamentName || "Tournament") : "Scrimmage weekend"))}</span><div>${coverage}<span class="live-game-day-status" data-state="${escapeHtml(status.state)}">${escapeHtml(status.label)}</span></div></div>
        <div class="live-role-game-matchup"><div><img src="${escapeHtml(safeGameLogo(ownLogo))}" alt="${escapeHtml(ownDisplayName)} logo"><span>${escapeHtml(ownDisplayName)}</span></div>${score}<div><img src="${escapeHtml(safeGameLogo(opponentLogo))}" alt="${escapeHtml(opponentDisplayName)} logo"><span>${escapeHtml(opponentDisplayName)}</span></div></div>
        <div class="live-role-game-meta"><span>${escapeHtml(gameDayTimeLabel(game.scheduledAt))}</span>${game.venue ? `<span>${escapeHtml(game.venue)}</span>` : ""}</div>
        <div class="live-role-game-action">${action}</div>
      </article>`;
    };

    list.innerHTML = populated.map(group => `<section class="live-role-game-section" data-role-group="${escapeHtml(group.key)}">
      <div class="live-role-game-section-heading"><strong>${escapeHtml(group.title)}</strong><span>${group.rows.length}</span></div>
      <div class="live-role-game-section-list">${group.rows.map(renderCard).join("")}</div>
    </section>`).join("");
  }

  function renderGameDayCoverage(deck) {
    const coverage = $("gameDayCoverage");
    if (!coverage) return;
    const planned = deck.filter(game => game.status !== "live");
    const assigned = planned.filter(game => game.assignedScorerUserId).length;
    const unassigned = planned.filter(game => !game.assignedScorerUserId).length;
    const mine = planned.filter(game => game.isAssignedToMe).length;
    coverage.innerHTML = `<span data-state="${unassigned ? "attention" : "ready"}"><strong>${assigned}</strong> assigned</span><span data-state="${unassigned ? "attention" : "ready"}"><strong>${unassigned}</strong> need scorer</span>${workspace.role === "scorer" ? `<span data-state="mine"><strong>${mine}</strong> mine</span>` : ""}`;
  }

  function renderGameDayHub() {
    const container = $("gameDayQueue");
    if (!container || !workspace) return;
    renderTournamentScheduleStatus();
    renderRoleHome();
    const deck = gameDayQueue.filter(game => !["final","cancelled"].includes(game.status));
    const hub = $("dashboardGameDay");
    if (hub) hub.dataset.hasGames = deck.length ? "true" : "false";
    $("gameDayQueueCount").textContent = `${deck.length} game${deck.length === 1 ? "" : "s"} on deck`;
    const assignedCount = deck.filter(game => game.status !== "live" && game.assignedScorerUserId).length;
    const unassignedCount = deck.filter(game => game.status !== "live" && !game.assignedScorerUserId).length;
    $("gameDayQueueSummary").textContent = deck.length
      ? `${assignedCount} assigned · ${unassignedCount} need scorer · live games remain handoff-capable.`
      : "No upcoming games yet. Add a tournament game or friendly.";
    renderGameDayCoverage(deck);
    if (!deck.length) {
      container.innerHTML = `<div class="live-game-day-empty"><strong>No games on deck</strong><span>Add a tournament game even if the official WPI schedule is missing, or create a friendly manually.</span></div>`;
      return;
    }
    container.innerHTML = deck.map(game => {
      const status = gameDayDisplayStatus(game);
      const canManage = ["owner","admin"].includes(workspace.role) && ["setup","scheduled"].includes(game.status) && !game.startedAt;
      const scorerMayStart = workspace.role === "scorer" && game.canStart !== false;
      const canOpen = game.status === "live" || canManage || scorerMayStart;
      const assignmentName = assignmentDisplay(game);
      const assignmentState = game.isAssignedToMe ? "mine" : (game.assignedScorerUserId ? "assigned" : "unassigned");
      const tournament = `<strong class="live-game-day-tournament">${escapeHtml(game.seriesName || (game.gameKind === "tournament" ? (game.tournamentName || "Tournament") : "Scrimmage weekend"))}</strong>`;
      const opponentIdentity = resolveGameDayTeamIdentity(game.opponentSourceName || game.opponentName || "");
      const opponentDisplayName = opponentIdentity?.displayName || game.opponentName;
      const opponentLogo = game.opponentLogoUrl || opponentIdentity?.team?.logo || opponentIdentity?.club?.logo;
      const ownIdentity = resolveGameDayTeamIdentity(game.teamName || workspace.teamName || "");
      const ownDisplayName = ownIdentity?.displayName || game.teamName;
      const ownLogo = game.teamLogoUrl || ownIdentity?.team?.logo || ownIdentity?.club?.logo;
      return `<article class="live-game-day-card" data-game-day-id="${escapeHtml(game.id)}">
        <div class="live-game-day-card-top">${tournament}<span class="live-game-day-status" data-state="${escapeHtml(status.state)}">${escapeHtml(status.label)}</span></div>
        <div class="live-game-day-matchup">
          <div class="live-game-day-team"><img src="${escapeHtml(safeGameLogo(ownLogo))}" alt="${escapeHtml(ownDisplayName)} logo" onerror="this.onerror=null;this.src='assets/branding/wpi-logo-mark.png'"><span>${escapeHtml(ownDisplayName)}</span></div>
          <strong>vs</strong>
          <div class="live-game-day-team live-game-day-team--opponent"><img src="${escapeHtml(safeGameLogo(opponentLogo))}" alt="${escapeHtml(opponentDisplayName)} logo" onerror="this.onerror=null;this.src='assets/branding/wpi-logo-mark.png'"><span>${escapeHtml(opponentDisplayName)}</span></div>
        </div>
        <div class="live-game-day-meta"><span>${escapeHtml(gameDayTimeLabel(game.scheduledAt))}</span>${game.venue ? `<span>${escapeHtml(game.venue)}</span>` : ""}<span>${escapeHtml(workspace.ageGroup || game.ageGroup || "")}</span></div>
        <div class="live-game-day-source" data-state="${escapeHtml(game.reconciliationStatus || "not_applicable")}">${escapeHtml(gameDaySourceLabel(game))}</div>
        <div class="live-game-day-assignment" data-state="${escapeHtml(assignmentState)}">
          <div><small>Scoring coverage</small><strong>${escapeHtml(game.isAssignedToMe ? "You" : assignmentName)}</strong></div>
          ${canManage ? `<div class="live-game-day-assignment-controls"><select data-game-assignment-select aria-label="Assigned scorer">${scorerAssignmentOptions(game.assignedScorerUserId || "")}</select><button type="button" data-game-assignment-save="${escapeHtml(game.id)}">Save scorer</button></div>` : ""}
        </div>
        ${workspace.role === "scorer" && game.status !== "live" && game.assignedScorerUserId && !game.isAssignedToMe ? `<p class="live-game-day-assignment-note">Assigned to ${escapeHtml(assignmentName)}. An Owner/Admin can reassign it; scorer handoff remains available after the game starts.</p>` : ""}
        ${game.reconciliationStatus === "possible_match" && game.reconciliationCandidateSnapshot ? `<div class="live-game-reconcile-review"><strong>Is this the official matchup?</strong><span>${escapeHtml(game.reconciliationCandidateSnapshot.tournamentName || game.tournamentName || "Tournament")} · ${escapeHtml(gameDayTimeLabel(game.reconciliationCandidateSnapshot.scheduledAt))}${game.reconciliationCandidateSnapshot.venue ? ` · ${escapeHtml(game.reconciliationCandidateSnapshot.venue)}` : ""}</span><div><button type="button" data-game-reconcile-confirm="${escapeHtml(game.id)}">Link official game</button><button type="button" class="live-secondary-button" data-game-reconcile-dismiss="${escapeHtml(game.id)}">Not the same game</button></div></div>` : ""}
        <div class="live-game-day-actions">
          ${canOpen ? `<button type="button" class="live-game-day-start" data-game-day-start="${escapeHtml(game.id)}">${game.status === "live" ? "Open live game" : "Start game"}</button>` : ""}
          ${canManage ? `<button type="button" data-game-day-edit="${escapeHtml(game.id)}">Edit</button><button type="button" class="live-danger-button" data-game-day-cancel="${escapeHtml(game.id)}">Cancel</button>` : ""}
        </div>
      </article>`;
    }).join("");
  }

  async function loadGameDayQueue() {
    if (!backend || !workspace?.teamId) { gameDayQueue = []; return; }
    const {data,error} = await backend.client.rpc("live_game_day_queue_v4", {target_team_id:workspace.teamId});
    if (error) throw error;
    gameDayQueue = Array.isArray(data?.games) ? data.games : [];
    renderGameDayHub();
  }

  async function loadGames() {
    const [legacyGames] = await Promise.all([
      backend.listGames(workspace.teamId),
      loadGameDayQueue(),
      loadGameSeriesArchive(),
      loadGameCatalog(),
      loadTournamentScheduleIndex()
    ]);
    games = legacyGames;
    renderGames();
    renderGameDayHub();
  }

  function currentGroupMeMode() {
    return "topic";
  }

  function currentGroupMeSecretName() {
    return null;
  }

  function selectedGroupMeGroup() {
    const id = $("groupMeGroupSelect").value;
    return groupMeGroups.find(group => String(group.id) === String(id)) || (
      destination?.groupme_group_id === id
        ? {id, name: destination.groupme_group_name || "Selected GroupMe"}
        : null
    );
  }

  function selectedGroupMeTopic() {
    const id = $("groupMeTopicSelect").value;
    return groupMeTopics.find(topic => String(topic.id) === String(id)) || (
      destination?.groupme_topic_id === id
        ? {id, name: destination.groupme_topic_name || "Selected topic"}
        : null
    );
  }

  function resetSelect(select, placeholder) {
    select.innerHTML = "";
    const option = document.createElement("option");
    option.value = "";
    option.textContent = placeholder;
    select.appendChild(option);
  }

  function groupLabel(group) {
    if (!group?.createdAt) return group.name;
    const created = new Date(Number(group.createdAt) * 1000);
    const date = Number.isNaN(created.getTime())
      ? ""
      : created.toLocaleString([], {month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
    return date ? `${group.name} · ${date}` : group.name;
  }

  function populateGroupMeGroups(selectedId = null) {
    const select = $("groupMeGroupSelect");
    resetSelect(select, groupMeGroups.length ? "Choose a GroupMe" : "Choose tournament GroupMe");
    groupMeGroups.forEach(group => {
      const option = document.createElement("option");
      option.value = String(group.id);
      option.textContent = groupLabel(group);
      select.appendChild(option);
    });
    const savedId = selectedId || destination?.groupme_group_id || "";
    if (savedId && !groupMeGroups.some(group => String(group.id) === String(savedId))) {
      const option = document.createElement("option");
      option.value = String(savedId);
      option.textContent = destination?.groupme_group_name || "Approved tournament GroupMe";
      select.appendChild(option);
    }
    select.value = savedId && [...select.options].some(option => option.value === String(savedId)) ? String(savedId) : "";
    select.disabled = workspace?.role !== "owner" || (!groupMeGroups.length && !select.value);
  }

  function populateGroupMeTopics(selectedId = null) {
    const select = $("groupMeTopicSelect");
    resetSelect(select, groupMeTopics.length ? "Choose a topic" : "Choose a GroupMe first");
    groupMeTopics.forEach(topic => {
      const option = document.createElement("option");
      option.value = String(topic.id);
      option.textContent = topic.name;
      select.appendChild(option);
    });
    const savedId = selectedId || destination?.groupme_topic_id || "";
    if (savedId && !groupMeTopics.some(topic => String(topic.id) === String(savedId))) {
      const option = document.createElement("option");
      option.value = String(savedId);
      option.textContent = destination?.groupme_topic_name || "Saved Score Updates topic";
      select.appendChild(option);
    }
    select.value = savedId && [...select.options].some(option => option.value === String(savedId)) ? String(savedId) : "";
    select.disabled = !canManageGroupMeSetup() || !$("groupMeGroupSelect").value || (!groupMeTopics.length && !select.value);
  }

  function groupMeSelectionMatchesDestination() {
    const group = selectedGroupMeGroup();
    const topic = selectedGroupMeTopic();
    return Boolean(
      destination?.id &&
      destination.delivery_mode === "topic" &&
      group?.id && topic?.id &&
      String(destination.groupme_group_id || "") === String(group.id) &&
      String(destination.groupme_topic_id || "") === String(topic.id)
    );
  }

  function groupMeSelectionReady() {
    return Boolean(selectedGroupMeGroup()?.id && selectedGroupMeTopic()?.id);
  }

  function hasLiveGame() {
    return games.some(game => game.status === "live");
  }

  function setGroupMeStepState(id, text, state = "idle") {
    const node = $(id);
    if (!node) return;
    node.textContent = text;
    node.dataset.state = state;
  }

  function renderGroupMeSetupProgress() {
    const canManage = canManageGroupMeSetup();
    const group = selectedGroupMeGroup();
    const topic = selectedGroupMeTopic();
    const matches = groupMeSelectionMatchesDestination();
    const tested = Boolean(matches && destination?.last_test_status === "sent");
    const failed = Boolean(matches && destination?.last_test_status === "failed");
    const active = Boolean(matches && tested && destination?.enabled);

    setGroupMeStepState("groupMeGroupState", group?.id ? (destination?.groupme_group_id === String(group.id) ? "Approved" : "Selected") : "Choose", group?.id ? "ready" : "idle");
    setGroupMeStepState("groupMeTopicState", topic?.id ? "Selected" : "Choose", topic?.id ? "ready" : "idle");
    setGroupMeStepState("groupMeTestState", tested ? "Passed" : failed ? "Failed" : group && topic ? "Test required" : "Waiting", tested ? "ready" : failed ? "error" : "idle");
    setGroupMeStepState("groupMeActivateState", active ? "Active" : tested ? "Ready" : "Waiting", active ? "ready" : tested ? "ready" : "idle");

    $("testGroupMeButton").disabled = !canManage || !groupMeSelectionReady();
    $("saveGroupMeButton").disabled = !canManage || !tested || active;
    $("saveGroupMeButton").textContent = active ? "Active for new games" : "Use for new games";
    $("pauseGroupMeButton").hidden = !canManage || !active;

    if (workspace?.role === "owner") {
      $("groupMeManagerScope").textContent = "Choose the tournament GroupMe, select its Score Updates topic, test it, then activate it.";
      $("groupMeGroupHelp").textContent = "Only the Team Owner can choose or change the tournament GroupMe.";
    } else if (workspace?.role === "admin" && workspace?.canManageGroupMe) {
      $("groupMeManagerScope").textContent = "The Team Owner approved the tournament GroupMe. You can choose its Score Updates topic, test it and activate it.";
      $("groupMeGroupHelp").textContent = destination?.groupme_group_name
        ? `Owner-approved GroupMe: ${destination.groupme_group_name}`
        : "The Team Owner must approve a tournament GroupMe before you can continue.";
    }
  }

  function renderGroupMeMode() {
    const owner = workspace?.role === "owner";
    const canManage = canManageGroupMeSetup();
    $("groupMeDeliveryMode").value = "topic";
    $("loadGroupMeGroupsButton").hidden = !owner;
    $("loadGroupMeGroupsButton").disabled = !owner;
    populateGroupMeGroups(destination?.groupme_group_id || null);
    populateGroupMeTopics(destination?.groupme_topic_id || null);
    if (!owner) $("groupMeGroupSelect").disabled = true;
    $("loadGroupMeTopicsButton").disabled = !canManage || !$("groupMeGroupSelect").value;
    renderGroupMeSetupProgress();
  }

  function updateGroupMeStatusPill() {
    const pill = $("groupMeSetupStatusPill");
    if (!pill) return;
    if (!destination) {
      pill.textContent = "Not connected";
      pill.dataset.state = "idle";
      return;
    }
    if (destination.last_test_status === "failed") {
      pill.textContent = "Needs attention";
      pill.dataset.state = "error";
      return;
    }
    if (destination.enabled && destination.last_test_status === "sent") {
      pill.textContent = "Connected";
      pill.dataset.state = "connected";
      return;
    }
    if (destination.last_test_status === "sent") {
      pill.textContent = "Tested · activate";
      pill.dataset.state = "tested";
      return;
    }
    if (!destination.enabled) {
      pill.textContent = "Saved · not active";
      pill.dataset.state = "paused";
      return;
    }
    pill.textContent = "Test required";
    pill.dataset.state = "idle";
  }

  function renderGroupMe() {
    const canManage = canManageGroupMeSetup();
    $("groupMeAdminPanel").hidden = !canManage;
    $("groupMeReadOnly").hidden = canManage;
    $("groupMeDisplayName").value = destination?.display_name || "WPI Score Updates";
    $("groupMeDeliveryMode").value = "topic";
    $("groupMeEnabled").checked = Boolean(destination?.enabled);

    if (destination) {
      const tested = destination.last_tested_at
        ? new Date(destination.last_tested_at).toLocaleString([], {month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})
        : "Not tested yet";
      const destinationLabel = `${destination.groupme_group_name || destination.display_name} → ${destination.groupme_topic_name || "Topic"}`;
      $("dashboardDeliveryMetric").textContent = destination.enabled && destination.last_test_status === "sent"
        ? "GroupMe topic connected"
        : destination.last_test_status === "failed"
          ? "GroupMe needs attention"
          : destination.last_test_status === "sent"
            ? "Tested — activation required"
            : "Setup not active";
      $("groupMeSetupMessage").textContent = destination.last_test_status === "sent"
        ? destination.enabled ? `Connected · last tested ${tested}` : `Test passed · ${tested}. Activate it for new games when ready.`
        : destination.last_test_status === "failed"
          ? `Last test failed · ${destination.last_test_error || tested}`
          : "Choose the destination and send a test message.";
      $("groupMeReadOnly").textContent = `${destinationLabel} · ${destination.enabled ? "connected" : "not active"}${workspace.role === "admin" && !workspace.canManageGroupMe ? " · Team Owner approval required to change setup" : ""}`;
    } else {
      $("dashboardDeliveryMetric").textContent = "Not connected";
      $("groupMeSetupMessage").textContent = canManage
        ? workspace?.role === "owner"
          ? "Choose the tournament GroupMe to begin. WPI handles the protected server connection automatically."
          : "The Team Owner must approve a tournament GroupMe before an Admin can choose its Score Updates topic."
        : "No GroupMe destination is connected yet.";
      $("groupMeReadOnly").textContent = "No GroupMe destination is connected yet.";
    }

    renderGroupMeMode();
    updateGroupMeStatusPill();
    $("groupMeAudit").hidden = false;
    $("deliverySentCount").textContent = String(deliverySummary.sent || 0);
    $("deliveryFailedCount").textContent = String(deliverySummary.failed || 0);
    $("deliveryPendingCount").textContent = String(deliverySummary.pending || 0);
    updateReadiness();
  }

  async function loadGroupMe() {
    destination = await backend.loadGroupMeDestination(workspace.teamId);
    deliverySummary = await backend.groupMeDeliverySummary(workspace.teamId);
    renderGroupMe();
    if (canManageGroupMeSetup() && destination?.groupme_group_id) {
      loadGroupMeTopics().catch(() => {});
    }
  }

  async function loadGroupMeTopics() {
    if (!canManageGroupMeSetup()) {
      $("groupMeDiscoveryMessage").textContent = "Tournament GroupMe management permission is required.";
      return;
    }
    const group = selectedGroupMeGroup();
    if (!group?.id) {
      groupMeTopics = [];
      populateGroupMeTopics();
      $("groupMeDiscoveryMessage").textContent = workspace?.role === "owner" ? "Choose the tournament GroupMe first." : "The Team Owner must approve the tournament GroupMe first.";
      renderGroupMeSetupProgress();
      return;
    }

    $("groupMeTopicSelect").disabled = true;
    $("loadGroupMeTopicsButton").disabled = true;
    $("groupMeDiscoveryMessage").textContent = `Loading topics from ${group.name}…`;
    try {
      groupMeTopics = await backend.discoverGroupMeTopics(workspace.teamId, group.id, null);
      populateGroupMeTopics(
        destination?.groupme_group_id === String(group.id) ? destination?.groupme_topic_id : null
      );
      if (groupMeTopics.length === 1 && !$("groupMeTopicSelect").value) {
        $("groupMeTopicSelect").value = String(groupMeTopics[0].id);
      }
      $("groupMeDiscoveryMessage").textContent = groupMeTopics.length
        ? `Found ${groupMeTopics.length} topic${groupMeTopics.length === 1 ? "" : "s"}. Choose the Score Updates topic.`
        : "No topics were returned for this GroupMe. Create the topic in GroupMe, then select Refresh topics.";
    } catch (error) {
      groupMeTopics = [];
      populateGroupMeTopics();
      $("groupMeDiscoveryMessage").textContent = error.message || "GroupMe topics could not be loaded.";
    } finally {
      $("loadGroupMeTopicsButton").disabled = !$("groupMeGroupSelect").value;
      renderGroupMeSetupProgress();
    }
  }

  async function loadGroupMeGroups() {
    if (workspace?.role !== "owner") {
      $("groupMeDiscoveryMessage").textContent = "Only the Team Owner may choose the tournament GroupMe.";
      return;
    }
    $("loadGroupMeGroupsButton").disabled = true;
    $("groupMeDiscoveryMessage").textContent = "Loading your GroupMes securely…";
    try {
      groupMeGroups = await backend.discoverGroupMeGroups(workspace.teamId, null);
      populateGroupMeGroups(destination?.groupme_group_id || null);
      groupMeTopics = [];
      populateGroupMeTopics(destination?.groupme_topic_id || null);
      $("groupMeDiscoveryMessage").textContent = groupMeGroups.length
        ? `Found ${groupMeGroups.length} GroupMe${groupMeGroups.length === 1 ? "" : "s"}. Select the tournament GroupMe.`
        : "No GroupMe groups were returned for the protected WPI connection.";
      if ($("groupMeGroupSelect").value) await loadGroupMeTopics();
    } catch (error) {
      groupMeGroups = [];
      groupMeTopics = [];
      populateGroupMeGroups();
      populateGroupMeTopics();
      $("groupMeDiscoveryMessage").textContent = error.message || "GroupMe groups could not be loaded.";
    } finally {
      $("loadGroupMeGroupsButton").disabled = false;
      renderGroupMeSetupProgress();
    }
  }

  async function activateGroupMe() {
    if (!canManageGroupMeSetup()) {
      $("groupMeSetupMessage").textContent = "Tournament GroupMe management permission is required.";
      return;
    }
    if (!destination?.id || !groupMeSelectionMatchesDestination() || destination.last_test_status !== "sent") {
      $("groupMeSetupMessage").textContent = "Send a successful test message for this exact GroupMe and topic before activation.";
      renderGroupMeSetupProgress();
      return;
    }

    $("saveGroupMeButton").disabled = true;
    $("groupMeSetupMessage").textContent = "Activating Score Updates for new games…";
    try {
      destination = await backend.activateGroupMeDestination(workspace.teamId, destination.id);
      $("groupMeEnabled").checked = true;
      $("groupMeSetupMessage").textContent = `Connected. New ${workspace.teamName} games will use ${destination.groupme_topic_name}.`;
      renderGroupMe();
    } catch (error) {
      $("groupMeSetupMessage").textContent = error.message || "GroupMe destination could not be activated.";
      renderGroupMeSetupProgress();
    }
  }

  async function pauseGroupMe() {
    if (!canManageGroupMeSetup() || !destination?.id) return;
    $("pauseGroupMeButton").disabled = true;
    $("groupMeSetupMessage").textContent = "Pausing Score Updates for new games…";
    try {
      destination = await backend.pauseGroupMeDestination(workspace.teamId, destination.id);
      $("groupMeEnabled").checked = false;
      $("groupMeSetupMessage").textContent = "Score Updates are paused for new games. The tested destination is still saved.";
      renderGroupMe();
    } catch (error) {
      $("groupMeSetupMessage").textContent = error.message || "GroupMe delivery could not be paused.";
    } finally {
      $("pauseGroupMeButton").disabled = false;
    }
  }

  async function testGroupMe() {
    if (!canManageGroupMeSetup()) {
      $("groupMeSetupMessage").textContent = "Tournament GroupMe management permission is required.";
      return;
    }
    const group = selectedGroupMeGroup();
    const topic = selectedGroupMeTopic();
    if (!group?.id || !topic?.id) {
      $("groupMeSetupMessage").textContent = "Choose the tournament GroupMe and Score Updates topic before testing.";
      return;
    }

    const selectionChanged = !groupMeSelectionMatchesDestination();
    if (selectionChanged && hasLiveGame()) {
      $("groupMeSetupMessage").textContent = "A game is live right now. Finish it before changing the GroupMe destination.";
      return;
    }

    $("testGroupMeButton").disabled = true;
    $("saveGroupMeButton").disabled = true;
    try {
      if (selectionChanged || !destination?.id) {
        $("groupMeSetupMessage").textContent = "Preparing this destination for a safe test…";
        destination = await backend.prepareGroupMeDestination(workspace.teamId, {
          groupId: group.id,
          groupName: group.name,
          topicId: topic.id,
          topicName: topic.name
        });
      }

      $("groupMeSetupMessage").textContent = `Sending a test message to ${topic.name}…`;
      await backend.testGroupMeDestination(
        destination.id,
        `WPI Live test: ${workspace.teamName} is connected and ready for parent game updates.`
      );
      destination = await backend.loadGroupMeDestination(workspace.teamId);
      $("groupMeEnabled").checked = Boolean(destination.enabled);
      $("groupMeSetupMessage").textContent = destination.enabled
        ? `Test delivered to ${destination.groupme_topic_name}. This destination remains active for new games.`
        : `Test delivered to ${destination.groupme_topic_name}. Select Use for new games to activate it.`;
      renderGroupMe();
    } catch (error) {
      const message = error.message || "GroupMe test failed";
      destination = await backend.loadGroupMeDestination(workspace.teamId).catch(() => destination);
      renderGroupMe();
      $("groupMeSetupMessage").textContent = `Test failed: ${message}`;
    } finally {
      renderGroupMeSetupProgress();
    }
  }

  function roleLabel(role) {
    return ({owner:"Owner",admin:"Admin",scorer:"Scorer",viewer:"Supporter"})[role] || "Member";
  }

  function teamOptionLabel(team) {
    const label = team.teamDisplayLabel || team.teamName || "Team";
    const otherClub = workspace?.clubId && team.clubId && String(team.clubId) !== String(workspace.clubId);
    const club = otherClub ? ` · ${team.clubName || team.clubDisplayName || "Club"}` : "";
    return `${label}${club} · ${roleLabel(team.role)}`;
  }

  function allTeamsOptionLabel() {
    const clubName = clubWorkspace?.clubName || workspace?.clubName || "Club";
    return `All ${clubName} Teams`;
  }

  function renderWorkspaceHeader() {
    const clubName = clubWorkspace?.clubDisplayName || workspace?.clubDisplayName || workspace?.clubName || "WPI Live";
    const teamName = clubView ? "All teams" : (workspace?.teamDisplayLabel || workspace?.teamName || "Team workspace");
    if ($("dashboardClubName")) $("dashboardClubName").textContent = clubName;
    if ($("dashboardTeamName")) $("dashboardTeamName").textContent = teamName;
  }

  function canOpenClubOverview() {
    return Boolean(clubWorkspace && ["owner","admin"].includes(clubWorkspace.role));
  }

  function renderTeamSwitcher() {
    const wrap = $("teamSwitcherWrap");
    const select = $("dashboardTeamSwitcher");
    if (!wrap || !select) return;
    wrap.hidden = !teamMemberships.length;
    const options = [];
    if (canOpenClubOverview()) {
      options.push(`<option value="__club__"${clubView ? " selected" : ""}>${escapeHtml(allTeamsOptionLabel())}</option>`);
    }
    options.push(...teamMemberships.map(team => `<option value="${escapeHtml(team.teamId)}"${!clubView && String(team.teamId) === String(workspace?.teamId) ? " selected" : ""}>${escapeHtml(teamOptionLabel(team))}</option>`));
    select.innerHTML = options.join("");
    select.disabled = options.length < 2;
    $("createTeamButton").hidden = clubWorkspace?.role !== "owner";
  }

  async function loadTeamMemberships() {
    teamMemberships = await backend.listTeamMemberships();
    clubWorkspaces = await backend.listClubWorkspaces().catch(() => []);
    const requestedClubId = window.WPILiveTeamContext?.requestedClubId?.();
    const selectedClubId = requestedClubId || workspace?.clubId || clubWorkspaces[0]?.clubId || null;
    clubWorkspace = selectedClubId ? await backend.clubWorkspace(selectedClubId).catch(() => null) : null;
    clubView = Boolean(window.WPILiveTeamContext?.requestedClubView?.() && canOpenClubOverview());
    renderWorkspaceHeader();
    renderTeamSwitcher();
    return teamMemberships;
  }

  function switchTeam(teamId) {
    if (!teamId) return;
    if (teamId === "__club__") {
      if (!canOpenClubOverview()) return;
      const url = new URL(window.location.href);
      url.searchParams.delete("invite");
      url.searchParams.set("view", "club");
      url.searchParams.set("club", clubWorkspace.clubId);
      if (workspace?.teamId) url.searchParams.set("team", workspace.teamId);
      url.hash = "";
      window.location.assign(url.href);
      return;
    }
    if (String(teamId) === String(workspace?.teamId) && !clubView) return;
    const allowed = teamMemberships.some(team => String(team.teamId) === String(teamId));
    if (!allowed) {
      $("dashboardConnectionDetail").textContent = "That team is not available to this account.";
      renderTeamSwitcher();
      return;
    }
    window.WPILiveTeamContext?.rememberTeam(teamId);
    const url = new URL(window.location.href);
    url.searchParams.delete("invite");
    url.searchParams.delete("view");
    url.searchParams.delete("club");
    url.searchParams.set("team", teamId);
    url.hash = "";
    window.location.assign(url.href);
  }

  function clubTeamMembership(teamId) {
    return teamMemberships.find(team => String(team.teamId) === String(teamId)) || null;
  }

  function clubRosterMinimum(team) {
    const age = Number(String(team?.ageGroup || "").replace(/\D/g, "")) || 14;
    return age <= 12 ? 6 : 7;
  }

  function clubTeamIssues(team) {
    const issues = [];
    if (Number(team.rosterPlayerCount || 0) < clubRosterMinimum(team)) issues.push("Roster");
    if (Number(team.scorerEligibleCount || 0) < 1) issues.push("Scorer access");
    if (!team.groupMeReady) issues.push("GroupMe");
    return issues;
  }

  function clubGameRow(game, {final=false} = {}) {
    const membership = clubTeamMembership(game.teamId);
    const teamLabel = game.teamDisplayLabel || game.teamName || "Team";
    const when = gameDayTimeLabel(game.endedAt || game.scheduledAt);
    const score = final || game.status === "live" ? `<strong>${escapeHtml(String(game.teamScore ?? 0))}–${escapeHtml(String(game.opponentScore ?? 0))}</strong>` : "";
    const scorer = !final && ["setup","scheduled"].includes(game.status)
      ? (game.assignedScorerDisplayName ? `Scorer: ${escapeHtml(game.assignedScorerDisplayName)}` : '<span data-state="attention">Needs scorer</span>')
      : "";
    const href = membership ? teamScopedUrl("live-game.html", {game:game.gameId,team:game.teamId}) : null;
    return `<article class="live-club-game-row" data-state="${escapeHtml(game.status || (final ? "final" : "scheduled"))}">
      <div><small>${escapeHtml(teamLabel)}</small><strong>${escapeHtml(game.opponentName || "Opponent")}</strong><span>${escapeHtml(when || "Time TBD")}${game.venue ? ` · ${escapeHtml(game.venue)}` : ""}</span></div>
      <div class="live-club-game-row-meta">${score}${scorer}${href ? `<a href="${escapeHtml(href)}">${game.status === "live" ? "Open game" : final ? "View final" : "View game"}</a>` : ""}</div>
    </article>`;
  }

  function renderClubOverview() {
    const panel = $("clubOverviewPanel");
    if (!panel || !clubWorkspace) return;
    const teams = Array.isArray(clubWorkspace.teams) ? clubWorkspace.teams : [];
    const operational = Array.isArray(clubWorkspace.operationalGames) ? clubWorkspace.operationalGames : [];
    const finals = Array.isArray(clubWorkspace.recentFinals) ? clubWorkspace.recentFinals : [];
    const live = operational.filter(game => game.status === "live");
    const upcoming = operational.filter(game => ["setup","scheduled"].includes(game.status));
    const needsScorer = upcoming.filter(game => !game.assignedScorerUserId);
    const attentionTeams = teams.filter(team => clubTeamIssues(team).length);

    $("clubOverviewTitle").textContent = `All ${clubWorkspace.clubName || "Club"} Teams`;
    $("clubOverviewSubtitle").textContent = `${teams.length} active team${teams.length === 1 ? "" : "s"} · ${clubWorkspace.region || "club workspace"}`;
    $("clubMetricLive").textContent = String(live.length);
    $("clubMetricUpcoming").textContent = String(upcoming.length);
    $("clubMetricScorer").textContent = String(needsScorer.length);
    $("clubMetricAttention").textContent = String(attentionTeams.length);

    $("clubTeamGrid").innerHTML = teams.length ? teams.map(team => {
      const issues = clubTeamIssues(team);
      const membership = clubTeamMembership(team.teamId);
      const role = membership?.role ? roleLabel(membership.role) : "Club overview only";
      return `<article class="live-club-team-card" data-state="${issues.length ? "attention" : "ready"}">
        <div class="live-club-team-card-heading"><div><small>${escapeHtml(team.competitiveSeason || "Season")}</small><h3>${escapeHtml(team.teamDisplayLabel || team.teamName)}</h3><span>${escapeHtml(role)}</span></div><em>${issues.length ? `${issues.length} item${issues.length === 1 ? "" : "s"}` : "Ready ✓"}</em></div>
        <div class="live-club-team-stats"><span><strong>${Number(team.rosterPlayerCount || 0)}</strong> roster</span><span><strong>${Number(team.upcomingGameCount || 0)}</strong> upcoming</span><span><strong>${Number(team.needsScorerCount || 0)}</strong> need scorer</span></div>
        <p>${issues.length ? `Needs attention: ${escapeHtml(issues.join(" · "))}` : "Roster, scorer access and GroupMe are ready."}</p>
        ${membership ? `<button type="button" data-club-team-jump="${escapeHtml(team.teamId)}">Open team</button>` : '<button type="button" disabled>Team membership required</button>'}
      </article>`;
    }).join("") : '<p class="live-empty-state">No active teams are attached to this club yet.</p>';

    $("clubLiveGames").innerHTML = live.length ? live.map(game => clubGameRow(game)).join("") : '<p class="live-empty-state">No Lamorinda teams are live right now.</p>';
    $("clubUpcomingGames").innerHTML = upcoming.length ? upcoming.slice(0,12).map(game => clubGameRow(game)).join("") : '<p class="live-empty-state">No upcoming games are on deck across the club.</p>';
    $("clubRecentFinals").innerHTML = finals.length ? finals.slice(0,10).map(game => clubGameRow(game,{final:true})).join("") : '<p class="live-empty-state">No recent finals yet.</p>';
  }

  function openCreateTeamDialog() {
    $("newTeamName").value = "";
    $("newTeamAgeGroup").value = workspace?.ageGroup || "14U";
    if ($("newTeamGender")) $("newTeamGender").value = workspace?.gender || "Boys";
    if ($("newTeamSquad")) $("newTeamSquad").value = "";
    $("newTeamSeason").value = workspace?.competitiveSeason || "2026-2027";
    $("createTeamMessage").textContent = "";
    $("createTeamDialog").showModal();
    setTimeout(() => $("newTeamName").focus(), 0);
  }

  async function createAdditionalTeam() {
    const name = $("newTeamName").value.trim();
    if (!name) { $("createTeamMessage").textContent = "Enter the team name."; return; }
    $("confirmCreateTeamButton").disabled = true;
    $("createTeamMessage").textContent = "Creating private team workspace…";
    try {
      const created = await backend.createAdditionalTeam({
        clubId:clubWorkspace?.clubId || workspace?.clubId,
        name,
        ageGroup:$("newTeamAgeGroup").value,
        gender:$("newTeamGender")?.value || null,
        squadLabel:$("newTeamSquad")?.value || null,
        competitiveSeason:$("newTeamSeason").value
      });
      window.WPILiveTeamContext?.rememberTeam(created.teamId);
      const url = new URL(window.location.href);
      url.searchParams.delete("invite");
      url.searchParams.delete("view");
      url.searchParams.delete("club");
      url.searchParams.set("team", created.teamId);
      url.hash = "";
      window.location.assign(url.href);
    } catch (error) {
      $("createTeamMessage").textContent = error.message || "Team could not be created.";
      $("confirmCreateTeamButton").disabled = false;
    }
  }

  function inviteUrl(token) {
    return `${window.location.origin}${window.location.pathname.replace(/live-dashboard\.html$/, "live-login.html")}?invite=${encodeURIComponent(token)}`;
  }

  function canManageGroupMeSetup() {
    return Boolean(workspace && (
      workspace.role === "owner"
      || (workspace.role === "admin" && workspace.canManageGroupMe === true)
    ));
  }

  function canManageMember(member) {
    if (!workspace || member?.role === "owner" || member?.isCurrentUser) return false;
    if (workspace.role === "owner") return true;
    return workspace.role === "admin" && ["scorer","viewer"].includes(member?.role);
  }

  function updateInvitePermissionVisibility() {
    // 7.57.10: invitations are always Supporter-first. The database role remains `viewer`; elevated permissions are granted only after acceptance.
  }

  function memberRoleOptions(member) {
    if (workspace?.role === "owner") {
      return ["admin","scorer","viewer"].map(role => `<option value="${role}"${member.role === role ? " selected" : ""}>${roleLabel(role)}</option>`).join("");
    }
    return ["scorer","viewer"].map(role => `<option value="${role}"${member.role === role ? " selected" : ""}>${roleLabel(role)}</option>`).join("");
  }

  function accessInitials(member) {
    const source = String(member?.displayName || member?.email || "TM").trim();
    const parts = source.split(/\s+/).filter(Boolean);
    return (parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : source.slice(0,2)).toUpperCase();
  }

  function renderTeamAccess() {
    const manager = workspace && ["owner","admin"].includes(workspace.role);
    $("teamAccessManagerPanel").hidden = !manager;
    $("teamAccessUnavailable").hidden = manager;
    const members = Array.isArray(teamAccess.members) ? teamAccess.members : [];
    const invites = Array.isArray(teamAccess.invites) ? teamAccess.invites : [];
    $("teamAccessCount").textContent = `${members.length} member${members.length === 1 ? "" : "s"}`;
    $("pendingInviteCount").textContent = String(invites.filter(invite => invite.status === "pending").length);

    if (!manager) {
      updateReadiness();
      return;
    }

    $("teamAccessMembers").innerHTML = members.length ? members.map(member => {
      const manageable = canManageMember(member);
      const groupMeBadge = member.role === "owner" || member.canManageGroupMe
        ? '<span class="live-access-permission-badge">GroupMe manager</span>' : "";
      const ownerCopy = member.role === "owner" ? '<small>Platform / Team Owner</small>' : "";
      const controls = manageable ? `
        <div class="live-access-member-controls">
          ${member.role === "viewer" ? `<button type="button" data-make-scorer="${escapeHtml(member.userId)}">Make scorer</button>` : ""}
          <label>Role<select data-member-role>${memberRoleOptions(member)}</select></label>
          ${workspace.role === "owner" ? `<label class="live-access-inline-check" data-member-groupme-row${member.role !== "admin" ? ' hidden' : ''}><input data-member-groupme type="checkbox"${member.canManageGroupMe ? " checked" : ""}> GroupMe manager</label>` : ""}
          <button type="button" data-save-member="${escapeHtml(member.userId)}">Save role</button>
          <button class="live-danger-button" type="button" data-remove-member="${escapeHtml(member.userId)}">Remove</button>
        </div>` : "";
      return `<article class="live-access-member" data-access-user="${escapeHtml(member.userId)}">
        <div class="live-access-avatar">${escapeHtml(accessInitials(member))}</div>
        <div class="live-access-identity"><strong>${escapeHtml(member.displayName || member.email || "Team member")}</strong><small>${escapeHtml(member.email || "")}</small>${ownerCopy}</div>
        <div class="live-access-role"><span data-role="${escapeHtml(member.role)}">${escapeHtml(roleLabel(member.role))}</span>${groupMeBadge}</div>
        ${controls}
      </article>`;
    }).join("") : '<p class="live-empty-state">No permanent team members yet.</p>';

    $("teamAccessInvites").innerHTML = invites.length ? invites.map(invite => {
      const expired = invite.status === "expired";
      const expires = new Date(invite.expiresAt).toLocaleDateString([], {month:"short",day:"numeric",year:"numeric"});
      const permission = invite.canManageGroupMe ? '<span class="live-access-permission-badge">GroupMe manager</span>' : "";
      return `<article class="live-access-invite" data-access-invite="${escapeHtml(invite.inviteId)}">
        <div><strong>${escapeHtml(invite.email)}</strong><small>${escapeHtml(roleLabel(invite.role))} · ${expired ? "Expired" : `Expires ${escapeHtml(expires)}`}</small></div>
        <div class="live-access-role"><span data-role="${escapeHtml(invite.role)}">${escapeHtml(roleLabel(invite.role))}</span>${permission}</div>
        <div class="live-access-invite-actions">
          ${expired ? "" : `<button type="button" data-copy-invite="${escapeHtml(invite.inviteId)}">Copy link</button><button type="button" data-email-invite="${escapeHtml(invite.inviteId)}">Email invite</button>`}
          <button type="button" data-reissue-invite="${escapeHtml(invite.inviteId)}">${expired ? "Reissue" : "New link"}</button>
          <button class="live-danger-button" type="button" data-revoke-invite="${escapeHtml(invite.inviteId)}">Revoke</button>
        </div>
      </article>`;
    }).join("") : '<p class="live-empty-state">No pending invitations.</p>';
    updateInvitePermissionVisibility();
    updateReadiness();
  }

  async function loadTeamAccess() {
    if (!workspace || !["owner","admin"].includes(workspace.role)) {
      teamAccess = {members:[],invites:[]};
      renderTeamAccess();
      return;
    }
    const {data, error} = await backend.client.rpc("live_list_team_access", {target_team_id:workspace.teamId});
    if (error) throw error;
    teamAccess = {members:Array.isArray(data?.members) ? data.members : [], invites:Array.isArray(data?.invites) ? data.invites : []};
    workspace.canManageGroupMe = workspace.role === "owner" || data?.callerCanManageGroupMe === true;
    renderTeamAccess();
  }

  function accountDate(value, includeTime = false) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return includeTime
      ? date.toLocaleString([], {month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})
      : date.toLocaleDateString([], {month:"short",day:"numeric",year:"numeric"});
  }

  function signupSourceLabel(value) {
    return ({owner_bootstrap:"Owner setup",team_invite:"Team invite",legacy:"Existing account",unknown:"Unknown"})[value] || "Unknown";
  }

  function accountMembershipText(account) {
    const memberships = Array.isArray(account?.memberships) ? account.memberships : [];
    if (!memberships.length) return "No active team membership";
    return memberships.map(row => `${row.teamName || "Team"} · ${roleLabel(row.role || "viewer")}`).join(" | ");
  }

  function filteredAccountRegistryRows() {
    const rows = Array.isArray(accountRegistry?.accounts) ? accountRegistry.accounts : [];
    const query = accountRegistryFilter.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(account => [
      account.displayName,
      account.email,
      account.initialTeamName,
      signupSourceLabel(account.signupSource),
      accountMembershipText(account)
    ].some(value => String(value || "").toLowerCase().includes(query)));
  }

  function renderAccountRegistry() {
    const metrics = accountRegistry?.metrics || {};
    $("accountRegistryTotal").textContent = String(metrics.total || 0);
    $("accountRegistryVerified").textContent = String(metrics.verified || 0);
    $("accountRegistryActive30").textContent = String(metrics.active30Days || 0);
    $("accountRegistryInvited").textContent = String(metrics.teamInviteSignups || 0);
    const rows = filteredAccountRegistryRows();
    const total = Array.isArray(accountRegistry?.accounts) ? accountRegistry.accounts.length : 0;
    $("accountRegistrySummary").textContent = accountRegistryFilter
      ? `${rows.length} of ${total} accounts shown`
      : `${total} account${total === 1 ? "" : "s"} · refreshed ${accountDate(accountRegistry?.generatedAt,true)}`;
    $("accountRegistryList").innerHTML = rows.length ? rows.map(account => {
      const verified = Boolean(account.emailConfirmedAt);
      const memberships = accountMembershipText(account);
      return `<article class="live-account-row">
        <div class="live-account-identity"><strong>${escapeHtml(account.displayName || account.email || "WPI account")}</strong><small>${escapeHtml(account.email || "")}</small><div class="live-account-memberships">${escapeHtml(memberships)}</div></div>
        <div class="live-account-cell"><span>Signup</span><strong>${escapeHtml(signupSourceLabel(account.signupSource))}</strong><span>${escapeHtml(accountDate(account.registeredAt))}</span></div>
        <div class="live-account-cell"><span>Email</span><strong class="live-account-status" data-state="${verified ? "verified" : "unverified"}">${verified ? "Verified" : "Needs verification"}</strong><span>${escapeHtml(account.emailConfirmedAt ? accountDate(account.emailConfirmedAt) : "—")}</span></div>
        <div class="live-account-cell"><span>Last sign-in</span><strong>${escapeHtml(accountDate(account.lastSignInAt,true))}</strong><span>${escapeHtml(account.initialTeamName || "No initial team")}</span></div>
      </article>`;
    }).join("") : '<p class="live-empty-state">No accounts match this search.</p>';
  }

  async function loadPlatformOwnerAccess() {
    platformOwnerAccess = false;
    const button = $("openAccountRegistryButton");
    if (button) button.hidden = true;
    if (!backend || workspace?.role !== "owner") return;
    const {data,error} = await backend.client.rpc("live_is_platform_owner");
    if (error || data !== true) return;
    platformOwnerAccess = true;
    if (button) button.hidden = false;
  }

  async function loadAccountRegistry() {
    if (!platformOwnerAccess) throw new Error("Platform Owner access required.");
    $("accountRegistryMessage").textContent = "Loading account records…";
    const {data,error} = await backend.client.rpc("live_platform_account_registry_v1");
    if (error) throw error;
    accountRegistry = data || {metrics:{},accounts:[]};
    renderAccountRegistry();
    $("accountRegistryMessage").textContent = "";
  }

  async function openAccountRegistry() {
    if (!platformOwnerAccess) return;
    accountRegistryFilter = "";
    $("accountRegistrySearch").value = "";
    $("accountRegistryDialog").showModal();
    try { await loadAccountRegistry(); }
    catch (error) { $("accountRegistryMessage").textContent = error.message || "Account records could not be loaded."; }
  }

  function csvCell(value) {
    const text = String(value ?? "");
    return `"${text.replace(/"/g,'""')}"`;
  }

  function exportAccountRegistryCsv() {
    const rows = filteredAccountRegistryRows();
    if (!rows.length) { $("accountRegistryMessage").textContent = "There are no account rows to export."; return; }
    const header = ["Name","Email","Signup source","Registered at","Email confirmed at","Last sign-in at","Initial team","Memberships"];
    const lines = [header.map(csvCell).join(",")];
    rows.forEach(account => lines.push([
      account.displayName || "",
      account.email || "",
      signupSourceLabel(account.signupSource),
      account.registeredAt || "",
      account.emailConfirmedAt || "",
      account.lastSignInAt || "",
      account.initialTeamName || "",
      accountMembershipText(account)
    ].map(csvCell).join(",")));
    const blob = new Blob([lines.join("\n")+"\n"], {type:"text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `wpi-live-account-registry-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    $("accountRegistryMessage").textContent = `${rows.length} account${rows.length === 1 ? "" : "s"} exported.`;
  }

  function renderCreatedInvite(invite) {
    lastCreatedInvite = invite;
    if (!invite?.token) { $("inviteResult").hidden = true; return; }
    const url = inviteUrl(invite.token);
    $("inviteResult").hidden = false;
    $("inviteResult").innerHTML = `<strong>Supporter invite ready</strong><p>${escapeHtml(invite.email)} · starts as ${escapeHtml(roleLabel(invite.role))}</p><code>${escapeHtml(url)}</code><div class="live-access-created-actions"><button type="button" data-copy-created-invite>Copy link</button><button type="button" data-email-created-invite>Email invite</button></div><p>Expires ${new Date(invite.expiresAt).toLocaleDateString()}.</p>`;
  }

  async function copyText(value, successMessage = "Copied.") {
    try {
      await navigator.clipboard.writeText(value);
      $("inviteMessage").textContent = successMessage;
    } catch (_) {
      const area = document.createElement("textarea");
      area.value = value;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      $("inviteMessage").textContent = successMessage;
    }
  }

  function emailInvite(invite) {
    const url = inviteUrl(invite.token);
    const subject = encodeURIComponent(`WPI Live invitation · ${workspace.teamName}`);
    const body = encodeURIComponent(`You've been invited to ${workspace.teamName} in WPI Live.\n\nEveryone joins with Supporter access first. A Team Owner/Admin can grant Scorer access after you join.\n\nOpen your private invitation:\n${url}\n\nThis invitation expires ${new Date(invite.expiresAt).toLocaleDateString()}.`);
    window.location.href = `mailto:${encodeURIComponent(invite.email)}?subject=${subject}&body=${body}`;
  }

  async function createInvite() {
    const email = $("inviteEmail").value.trim();
    if (!email) {
      $("inviteMessage").textContent = "Enter the email address to invite.";
      return;
    }
    $("createInviteButton").disabled = true;
    $("inviteMessage").textContent = "Creating Supporter-first invite…";
    try {
      const {data:invite, error} = await backend.client.rpc("live_create_team_invite_v3", {
        target_team_id:workspace.teamId,
        invite_email:email
      });
      if (error) throw error;
      renderCreatedInvite(invite);
      $("inviteEmail").value = "";
      $("inviteMessage").textContent = "Invite created. They will join as Supporter; grant Scorer access after they accept if needed.";
      await loadTeamAccess();
    } catch (error) {
      $("inviteMessage").textContent = error.message || "Invite could not be created.";
    } finally {
      $("createInviteButton").disabled = false;
    }
  }

  async function promoteSupporterToScorer(userId, button = null) {
    const member = teamAccess.members.find(row => row.userId === userId);
    if (!member) return;
    if (button) button.disabled = true;
    $("inviteMessage").textContent = `Granting Scorer access to ${member.displayName || member.email}…`;
    try {
      const {data,error} = await backend.client.rpc("live_promote_supporter_to_scorer_v1", {
        target_team_id:workspace.teamId,
        target_user_id:userId
      });
      if (error) throw error;
      $("inviteMessage").textContent = data?.message || "Scorer access granted.";
      await loadTeamAccess();
    } finally {
      if (button?.isConnected) button.disabled = false;
    }
  }

  async function saveMemberAccess(userId, card) {
    const member = teamAccess.members.find(row => row.userId === userId);
    if (!member || !card) return;
    const role = card.querySelector("[data-member-role]")?.value || member.role;
    if (member.role === "viewer" && role === "scorer") {
      return promoteSupporterToScorer(userId, card.querySelector("[data-save-member]"));
    }
    const allowGroupMe = workspace.role === "owner" && role === "admin" && Boolean(card.querySelector("[data-member-groupme]")?.checked);
    $("inviteMessage").textContent = `Updating ${member.displayName || member.email}…`;
    const {error} = await backend.client.rpc("live_update_team_member_access", {
      target_team_id:workspace.teamId,
      target_user_id:userId,
      new_role:role,
      member_can_manage_groupme:allowGroupMe
    });
    if (error) throw error;
    $("inviteMessage").textContent = "Team access updated.";
    await loadTeamAccess();
  }

  async function removeMember(userId) {
    const member = teamAccess.members.find(row => row.userId === userId);
    if (!member) return;
    if (!window.confirm(`Remove ${member.displayName || member.email} from ${workspace.teamName}?`)) return;
    const {error} = await backend.client.rpc("live_remove_team_member", {target_team_id:workspace.teamId,target_user_id:userId});
    if (error) throw error;
    $("inviteMessage").textContent = "Team member removed.";
    await loadTeamAccess();
  }

  async function reissueInvite(inviteId) {
    const {data:invite,error} = await backend.client.rpc("live_reissue_team_invite", {target_team_id:workspace.teamId,target_invite_id:inviteId});
    if (error) throw error;
    renderCreatedInvite(invite);
    $("inviteMessage").textContent = "A fresh 14-day invite link is ready.";
    await loadTeamAccess();
  }

  async function revokeInvite(inviteId) {
    if (!window.confirm("Revoke this team invitation?")) return;
    const {error} = await backend.client.rpc("live_revoke_team_invite", {target_team_id:workspace.teamId,target_invite_id:inviteId});
    if (error) throw error;
    $("inviteMessage").textContent = "Invitation revoked.";
    await loadTeamAccess();
  }



  function uid(prefix = "row") {
    if (window.crypto?.randomUUID) return `${prefix}-${window.crypto.randomUUID()}`;
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function canManageTeam() {
    return Boolean(workspace && ["owner","admin"].includes(workspace.role));
  }

  function starterMinimum(ageGroup = workspace?.ageGroup || "14U") {
    const age = Number(String(ageGroup).replace(/\D/g, ""));
    return age && age <= 12 ? 6 : 7;
  }

  function setReadinessItem(id, ready, label) {
    const item = $(id);
    if (!item) return;
    item.dataset.state = ready ? "ready" : "needs-attention";
    item.setAttribute("aria-label", `${item.querySelector("strong")?.textContent || "Setup step"}: ${label || (ready ? "Ready" : "Needs setup")}`);
    const status = item.querySelector("em");
    if (status) status.textContent = label || (ready ? "Ready" : "Needs setup");
  }

  function readinessModel() {
    const profileReady = Boolean(String(workspace?.teamName || "").trim() && String(workspace?.ageGroup || "").trim());
    const rosterMinimum = starterMinimum(workspace?.ageGroup);
    const rosterReady = currentRoster.length >= rosterMinimum;
    const groupMeReady = Boolean(destination?.enabled && destination?.last_test_status === "sent");
    const permanentMembers = Array.isArray(teamAccess.members) ? teamAccess.members : [];
    const scoringMembers = permanentMembers.filter(member => ["owner","admin","scorer"].includes(member.role));
    const accessReady = ["owner","admin","scorer"].includes(workspace?.role) || scoringMembers.length > 0;
    const accessLabel = scoringMembers.length
      ? `${scoringMembers.length} scorer${scoringMembers.length === 1 ? "" : "s"} ready`
      : workspace?.role === "viewer" ? "Supporter only" : `${roleLabel(workspace?.role || "viewer")} ready`;
    const steps = [
      {key:"profile", number:"1", id:"readinessProfile", ready:profileReady, label:profileReady ? "Ready" : "Needs setup", title:"Confirm the team profile", copy:"Set the team name and age group that WPI will reuse for every new game.", action:"Complete team profile", target:"dashboardTeamProfile", focus:"teamProfileName"},
      {key:"roster", number:"2", id:"readinessRoster", ready:rosterReady, label:rosterReady ? `${currentRoster.length} players` : `${currentRoster.length}/${rosterMinimum} players`, title:"Build the game-day roster", copy:`Add at least ${rosterMinimum} players so WPI can create a valid starting lineup for ${workspace?.ageGroup || "this team"}.`, action:"Set up roster", target:"dashboardRoster", focus:"takeRosterPhotoButton"},
      {key:"access", number:"3", id:"readinessAccess", ready:accessReady, label:accessLabel, title:"Confirm scoring access", copy:"Make sure an Owner, Admin or permanent Scorer can run game day. Temporary scorer handoff remains available during a game.", action:"Review team access", target:"dashboardTeamAccess", focus:"createInviteButton"},
      {key:"groupme", number:"4", id:"readinessGroupMe", ready:groupMeReady, label:groupMeReady ? "Active + tested" : "Needs setup", title:"Connect score updates", copy:"Choose the tournament GroupMe and Scores topic, send a successful test message, then activate it for new games.", action:"Connect score updates", target:"dashboardGroupMe", focus:"loadGroupMeGroupsButton"}
    ];
    const readyCount = steps.filter(step => step.ready).length;
    return {steps, readyCount, allReady:readyCount === steps.length, rosterMinimum};
  }

  function focusSetupStep(targetId, focusId) {
    const target = $(targetId);
    if (!target) return;
    target.scrollIntoView({behavior:"smooth", block:"start"});
    if (!focusId) return;
    window.setTimeout(() => {
      const focusTarget = $(focusId);
      if (focusTarget && !focusTarget.disabled && !focusTarget.hidden) focusTarget.focus({preventScroll:true});
    }, 420);
  }

  function renderReadinessGuidance(model) {
    const {steps,readyCount,allReady} = model;
    const overview = $("dashboardOverview");
    if (overview) overview.dataset.readinessState = allReady ? "ready" : "setup";
    document.body.dataset.teamReadiness = allReady ? "ready" : "setup";
    const percentage = Math.round((readyCount / steps.length) * 100);
    const progress = $("readinessProgressBar");
    if (progress) progress.style.width = `${percentage}%`;
    $("readinessProgressLabel").textContent = allReady
      ? "Reusable team setup complete · ready to launch a game"
      : `${readyCount} of ${steps.length} reusable setup steps complete`;
    $("readinessHeadline").textContent = allReady ? "Your team is game-day ready" : `Finish ${steps.length - readyCount} setup step${steps.length - readyCount === 1 ? "" : "s"}`;

    const score = $("teamReadinessScore");
    score.textContent = allReady ? "Game-day ready" : `${readyCount}/${steps.length} ready`;
    score.dataset.state = allReady ? "ready" : "progress";

    const next = steps.find(step => !step.ready);
    const nextCard = $("readinessNextCard");
    const nextButton = $("readinessNextButton");
    const canManage = canManageTeam();
    if (allReady) {
      nextCard.dataset.state = "ready";
      $("readinessNextIcon").textContent = "✓";
      $("readinessNextTitle").textContent = "Team setup complete";
      $("readinessNextCopy").textContent = "Profile, roster, scoring access and score updates are ready. New games will inherit this reusable setup automatically.";
      nextButton.hidden = false;
      nextButton.disabled = !["owner","admin"].includes(workspace.role);
      nextButton.textContent = ["owner","admin"].includes(workspace.role) ? "Go to Game Day" : "Setup complete";
      nextButton.dataset.mode = "game-day";
      nextButton.dataset.target = "dashboardGameDay";
      delete nextButton.dataset.focus;
      $("readinessLaunchSummary").innerHTML = `<strong>Ready to score</strong><span>${escapeHtml(workspace.teamName)} can launch a new game with its saved roster and active score-updates route.</span>`;
    } else if (!canManage) {
      nextCard.dataset.state = "waiting";
      $("readinessNextIcon").textContent = "…";
      $("readinessNextTitle").textContent = "Team setup is still in progress";
      $("readinessNextCopy").textContent = `A Team Owner or Admin needs to finish ${next?.title?.toLowerCase() || "the remaining setup"}. Your ${roleLabel(workspace.role)} access will update automatically.`;
      nextButton.hidden = true;
      $("readinessLaunchSummary").innerHTML = `<strong>${steps.length - readyCount} step${steps.length - readyCount === 1 ? "" : "s"} remaining</strong><span>Permanent setup changes are managed by a Team Owner or Admin.</span>`;
    } else {
      nextCard.dataset.state = "next";
      $("readinessNextIcon").textContent = next.number;
      $("readinessNextTitle").textContent = next.title;
      $("readinessNextCopy").textContent = next.copy;
      nextButton.hidden = false;
      nextButton.disabled = false;
      nextButton.textContent = next.action;
      nextButton.dataset.mode = "setup";
      nextButton.dataset.target = next.target;
      nextButton.dataset.focus = next.focus || "";
      $("readinessLaunchSummary").innerHTML = `<strong>${steps.length - readyCount} step${steps.length - readyCount === 1 ? "" : "s"} remaining</strong><span>Finish the recommended step above and WPI will automatically advance the launch checklist.</span>`;
    }

    const sidebarHelp = document.querySelector(".live-dashboard-sidebar-help span");
    if (sidebarHelp) sidebarHelp.textContent = allReady ? "Game-day ready." : `${steps.length - readyCount} setup step${steps.length - readyCount === 1 ? "" : "s"} remaining.`;
  }

  function updateReadiness() {
    if (!workspace) return;
    const model = readinessModel();
    model.steps.forEach(step => setReadinessItem(step.id, step.ready, step.label));
    renderReadinessGuidance(model);
    renderGameDayHub();
  }

  function renderTeamProfile() {
    if (!workspace) return;
    $("teamProfileName").value = workspace.teamName || "";
    $("teamProfileAgeGroup").value = workspace.ageGroup || "14U";
    $("teamProfileSeason").value = workspace.competitiveSeason || "2026-2027";
    const editable = canManageTeam();
    $("teamProfileName").disabled = !editable;
    $("teamProfileAgeGroup").disabled = !editable;
    $("saveTeamProfileButton").hidden = !editable;
    $("teamProfileStatus").textContent = editable ? "Editable" : "View only";
    updateReadiness();
  }

  async function saveTeamProfile() {
    if (!canManageTeam()) return;
    const name = $("teamProfileName").value.trim();
    const ageGroup = $("teamProfileAgeGroup").value;
    if (!name) { $("teamProfileMessage").textContent = "Enter a team name."; return; }
    $("saveTeamProfileButton").disabled = true;
    $("teamProfileMessage").textContent = "Saving team profile…";
    try {
      const { error } = await backend.client.from("live_teams").update({
        name,
        age_group: ageGroup,
        updated_at: new Date().toISOString()
      }).eq("id", workspace.teamId);
      if (error) throw error;
      workspace.teamName = name;
      workspace.ageGroup = ageGroup;
      if (!workspace.teamDisplayLabel) workspace.teamDisplayLabel = name;
      renderWorkspaceHeader();
      $("teamProfileMessage").textContent = "Team profile saved. New games will use this identity.";
      renderTeamProfile();
    } catch (error) {
      $("teamProfileMessage").textContent = error.message || "Team profile could not be saved.";
    } finally {
      $("saveTeamProfileButton").disabled = false;
    }
  }

  function renderCurrentRoster() {
    const count = currentRoster.length;
    $("dashboardRosterCount").textContent = `${count} player${count === 1 ? "" : "s"}`;
    $("currentRosterHelp").textContent = count ? `Saved for ${workspace?.teamName || "this team"}.` : "No players saved yet.";
    $("currentRosterList").innerHTML = count ? currentRoster.map(player => `
      <div class="live-current-roster-player">
        <strong>#${escapeHtml(player.cap)}</strong>
        <span>${escapeHtml(player.name)}</span>
      </div>`).join("") : '<p class="live-empty-state">Add a roster by photo, image upload, or manual entry.</p>';
    $("editCurrentRosterButton").hidden = !canManageTeam() || !count;
    updateReadiness();
  }

  async function loadRoster() {
    currentRoster = await backend.loadRoster(workspace.rosterId);
    renderCurrentRoster();
  }

  function normalizedCap(value) {
    return String(value || "").trim().replace(/^#/, "").toUpperCase();
  }

  function cleanedRosterName(value) {
    return String(value || "").replace(/\s+/g, " ").replace(/^[\-–—:|,;.]+|[\-–—:|,;.]+$/g, "").trim();
  }

  function rosterDraftFromCurrent() {
    return currentRoster.map(player => ({
      id: player.id || uid("player"),
      remoteId: player.remoteId || null,
      cap: normalizedCap(player.cap),
      name: player.name || "",
      createdByUserId: player.createdByUserId || null,
      source: "existing",
      review: false
    }));
  }

  function rosterDraftFromVision(players = []) {
    const seenCaps = new Map();
    const rows = players.map(player => {
      const cap = normalizedCap(player?.cap);
      const name = cleanedRosterName(player?.name);
      const confidence = ["high","medium","low"].includes(player?.confidence) ? player.confidence : "low";
      seenCaps.set(cap, (seenCaps.get(cap) || 0) + 1);
      return {
        id: uid("player"),
        cap,
        name,
        source: "vision",
        confidence,
        review: confidence !== "high" || !cap || !name
      };
    }).filter(row => row.cap || row.name);
    rows.forEach(row => {
      if ((seenCaps.get(row.cap) || 0) > 1 || !/^\d{1,3}[A-Z]?$/.test(row.cap) || row.name.length < 3) row.review = true;
    });
    return rows;
  }

  function renderRosterDraft() {
    $("rosterDraftCount").textContent = `${rosterDraft.length} player${rosterDraft.length === 1 ? "" : "s"} ${rosterDraftSource === "photo" ? "detected" : "in draft"}`;
    $("rosterDraftRows").innerHTML = rosterDraft.length ? rosterDraft.map((row, index) => `
      <div class="live-roster-draft-row" data-roster-draft-id="${escapeHtml(row.id)}">
        <label><span>Cap #</span><input data-roster-cap type="text" inputmode="numeric" maxlength="3" value="${escapeHtml(row.cap)}" aria-label="Cap number for player ${index + 1}"></label>
        <label><span>Player name</span><input data-roster-name type="text" maxlength="100" value="${escapeHtml(row.name)}" aria-label="Player name ${index + 1}"></label>
        <span class="live-roster-review-state" data-state="${row.review ? "review" : "ready"}">${row.review ? "Review" : "Ready"}</span>
        <button type="button" data-remove-roster-row="${escapeHtml(row.id)}" aria-label="Remove ${escapeHtml(row.name || `player ${index + 1}`)}">Remove</button>
      </div>`).join("") : '<p class="live-empty-state">No players detected yet. Add a player manually below.</p>';
    $("rosterDraftRows").querySelectorAll("input").forEach(input => input.addEventListener("input", syncRosterDraftFromForm));
  }

  function syncRosterDraftFromForm() {
    const rows = Array.from($("rosterDraftRows").querySelectorAll("[data-roster-draft-id]"));
    const previous = new Map(rosterDraft.map(row => [row.id, row]));
    rosterDraft = rows.map(row => {
      const prior = previous.get(row.dataset.rosterDraftId) || {};
      return {
        ...prior,
        id: row.dataset.rosterDraftId,
        cap: normalizedCap(row.querySelector("[data-roster-cap]")?.value),
        name: cleanedRosterName(row.querySelector("[data-roster-name]")?.value),
        review: false
      };
    });
  }

  function openRosterDialog({source = "manual", rows = null} = {}) {
    rosterDraftSource = source;
    $("rosterFailureActions").hidden = true;
    rosterDraft = rows || rosterDraftFromCurrent();
    $("rosterOcrWorkspace").hidden = source !== "photo";
    $("rosterRawDetails").hidden = true;
    $("rosterRawText").value = "";
    $("rosterDraftMessage").textContent = "Review every row before saving. Nothing is saved automatically.";
    $("rosterDialogKicker").textContent = source === "photo" ? "High-accuracy roster import" : "Manual roster";
    $("rosterDialogTitle").textContent = source === "photo" ? "Review detected roster" : (currentRoster.length ? "Edit roster" : "Build roster manually");
    $("rosterDialogHelp").textContent = source === "photo"
      ? "WPI reads the image into a structured draft. Confirm every name and cap number before saving."
      : "Enter cap numbers and player names. You can always edit this roster later.";
    renderRosterDraft();
    $("rosterImportDialog").showModal();
  }

  function loadImageElement(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => resolve({image, url});
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("This image could not be opened. Try a JPEG, PNG, or screenshot.")); };
      image.src = url;
    });
  }

  async function prepareRosterImageForVision(file) {
    const {image, url} = await loadImageElement(file);
    try {
      const sourceWidth = Number(image.naturalWidth || image.width || 0);
      const sourceHeight = Number(image.naturalHeight || image.height || 0);
      if (!sourceWidth || !sourceHeight) throw new Error("The roster image has no readable dimensions.");
      const maxDimension = 2400;
      const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
      const width = Math.max(1, Math.round(sourceWidth * scale));
      const height = Math.max(1, Math.round(sourceHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", {alpha:false});
      if (!context) throw new Error("Your browser could not prepare the roster image.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      if (!dataUrl.startsWith("data:image/jpeg;base64,")) throw new Error("The roster image could not be normalized.");
      if (dataUrl.length > 8_000_000) throw new Error("This roster image is too large. Crop closer to the roster and try again.");
      return {dataUrl, width, height};
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function extractRosterWithVision(imageDataUrl) {
    if (!backend?.client?.functions) throw new Error("Connected roster reading is unavailable. Enter the roster manually.");
    const {data, error} = await backend.client.functions.invoke("roster-extract", {
      body: {team_id: workspace.teamId, image_data_url: imageDataUrl}
    });
    if (error) {
      let message = error.message || "Automatic roster reading failed.";
      try {
        const context = error.context;
        if (context?.json) {
          const body = await context.json();
          if (body?.error) message = body.error;
        }
      } catch (_) {}
      throw new Error(message);
    }
    if (!data || data.status !== "ok" || !Array.isArray(data.players)) {
      throw new Error(data?.error || "WPI could not read a structured roster from this image.");
    }
    return data;
  }

  async function readRosterImage(file) {
    if (!file || rosterOcrBusy) return;
    if (!String(file.type || "").startsWith("image/")) {
      $("rosterDraftMessage").textContent = "Choose a photo or image file.";
      return;
    }
    rosterOcrBusy = true;
    lastRosterFile = file;
    openRosterDialog({source:"photo", rows:[]});
    const previewUrl = URL.createObjectURL(file);
    $("rosterImagePreview").src = previewUrl;
    $("rosterOcrStatus").textContent = "Preparing roster photo…";
    $("rosterOcrProgress").removeAttribute("value");
    $("rosterOcrDetail").textContent = "WPI sends a normalized copy through a secure roster-reading function. The image is not added to your WPI roster.";
    $("saveRosterDraftButton").disabled = true;
    try {
      const prepared = await prepareRosterImageForVision(file);
      $("rosterOcrStatus").textContent = "Reading names and cap numbers…";
      const result = await extractRosterWithVision(prepared.dataUrl);
      $("rosterFailureActions").hidden = true;
      rosterDraft = rosterDraftFromVision(result.players);
      const notes = Array.isArray(result.warnings) ? result.warnings.filter(Boolean) : [];
      $("rosterRawText").value = notes.join("\n");
      $("rosterRawDetails").hidden = !notes.length;
      $("rosterRawDetails").querySelector("summary").textContent = "View import notes";
      $("rosterOcrProgress").value = 100;
      $("rosterOcrStatus").textContent = rosterDraft.length ? `Found ${rosterDraft.length} player${rosterDraft.length === 1 ? "" : "s"}` : "No roster rows were confidently detected";
      const reviewCount = rosterDraft.filter(row => row.review).length;
      $("rosterOcrDetail").textContent = rosterDraft.length
        ? (reviewCount ? `${reviewCount} row${reviewCount === 1 ? "" : "s"} need review. Nothing saves until you confirm.` : "High-confidence draft ready. Review every row before saving.")
        : "Try a closer photo with the full roster visible, or enter the roster manually.";
      if (!rosterDraft.length) rosterDraft.push({id:uid("player"),cap:"",name:"",source:"manual",review:true});
      renderRosterDraft();
      $("rosterDraftMessage").textContent = "Verify the draft, correct anything needed, then save the confirmed roster.";
    } catch (error) {
      rosterDraft = [];
      renderRosterDraft();
      $("rosterOcrProgress").value = 0;
      $("rosterOcrStatus").textContent = "Automatic reading unavailable";
      $("rosterOcrDetail").textContent = "No roster draft was created. Try again, choose another image, or switch to manual entry.";
      $("rosterFailureActions").hidden = false;
      $("rosterDraftMessage").textContent = error.message || "Roster image could not be read.";
    } finally {
      URL.revokeObjectURL(previewUrl);
      rosterOcrBusy = false;
      $("saveRosterDraftButton").disabled = !rosterDraft.length;
    }
  }

  function validateRosterDraft() {
    syncRosterDraftFromForm();
    const complete = rosterDraft.filter(row => row.cap || row.name);
    if (!complete.length) return {ok:false, message:"Add at least one player before saving."};
    const incomplete = complete.find(row => !row.cap || !row.name);
    if (incomplete) return {ok:false, message:"Every roster row needs both a cap number and player name."};
    const caps = new Set();
    for (const row of complete) {
      const cap = normalizedCap(row.cap);
      if (cap.length > 3) return {ok:false, message:`Cap #${cap} is too long. Use a cap number of three characters or fewer.`};
      if (caps.has(cap)) return {ok:false, message:`Cap #${cap} appears more than once. Correct the duplicate before saving.`};
      caps.add(cap);
    }
    return {ok:true, rows:complete};
  }

  async function saveRosterDraft() {
    if (!canManageTeam()) return;
    const validation = validateRosterDraft();
    if (!validation.ok) { $("rosterDraftMessage").textContent = validation.message; return; }
    $("saveRosterDraftButton").disabled = true;
    $("rosterDraftMessage").textContent = "Saving confirmed roster…";
    try {
      const session = await backend.session();
      if (!session?.user) throw new Error("Your session expired. Sign in again.");
      const existingByCap = new Map(currentRoster.map(player => [normalizedCap(player.cap), player]));
      const existingByName = new Map(currentRoster.map(player => [String(player.name || "").trim().toLowerCase(), player]));
      const rows = validation.rows.map((row, index) => {
        const match = (row.remoteId ? currentRoster.find(player => player.remoteId === row.remoteId) : null)
          || existingByCap.get(normalizedCap(row.cap))
          || existingByName.get(String(row.name || "").trim().toLowerCase());
        return {
          roster_id: workspace.rosterId,
          client_player_id: match?.id || row.id || uid("player"),
          cap_number: normalizedCap(row.cap),
          display_name: cleanedRosterName(row.name),
          active: true,
          sort_order: index,
          created_by: match?.createdByUserId || session.user.id,
          updated_by: session.user.id,
          updated_at: new Date().toISOString()
        };
      });
      const { error: upsertError } = await backend.client.from("live_players").upsert(rows, {onConflict:"roster_id,client_player_id"});
      if (upsertError) throw upsertError;
      const savedIds = new Set(rows.map(row => row.client_player_id));
      const removedRemoteIds = currentRoster.filter(player => !savedIds.has(player.id)).map(player => player.remoteId).filter(Boolean);
      if (removedRemoteIds.length) {
        const { error: removeError } = await backend.client.from("live_players").update({active:false,updated_by:session.user.id,updated_at:new Date().toISOString()}).in("id", removedRemoteIds);
        if (removeError) throw removeError;
      }
      await loadRoster();
      $("rosterDraftMessage").textContent = `Roster saved · ${currentRoster.length} player${currentRoster.length === 1 ? "" : "s"}.`;
      setTimeout(() => $("rosterImportDialog").close(), 450);
    } catch (error) {
      $("rosterDraftMessage").textContent = error.message || "Roster could not be saved.";
    } finally {
      $("saveRosterDraftButton").disabled = false;
    }
  }

  function applyRoleExperience() {
    if (!workspace) return;
    document.body.dataset.liveRole = workspace.role || "viewer";
    const compact = ["viewer","scorer"].includes(workspace.role);
    const roleHome = $("dashboardRoleHome");
    if (roleHome) roleHome.hidden = !compact;
    const mobileJump = $("mobileAdminJump");
    if (mobileJump) mobileJump.hidden = compact;
    if (workspace.role === "viewer") {
      $("dashboardSubtitle").textContent = "Follow your team’s games, live scores and play-by-play. Supporter access is read-only.";
    } else if (workspace.role === "scorer") {
      $("dashboardSubtitle").textContent = "Your assigned games and scoring controls.";
    }
  }

  async function init() {
    $("liveDashboardApp").hidden = false;
    if (!window.WPILiveBackend?.isConfigured(config)) {
      $("dashboardConnectionLabel").textContent = "WPI Live unavailable";
      $("dashboardConnectionDetail").textContent = "The connected WPI Live service is not configured on this deployment.";
      $("dashboardRoleBadge").textContent = "Unavailable";
      return;
    }

    try {
      backend = await window.WPILiveBackend.connect(config);
      const session = await backend.waitForHealthySession();
      if (!session) {
        window.location.replace("live-login.html");
        return;
      }
      const inviteToken = new URLSearchParams(window.location.search).get("invite");
      if (inviteToken) {
        await backend.acceptInvite(inviteToken);
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("invite");
        history.replaceState(null, "", cleanUrl);
      }
      workspace = await backend.bootstrap({teamName:"Lamorinda A 14U Boys",teamSlug:"lamorinda-a-14u-boys",ageGroup:"14U",competitiveSeason:"2026-2027"});
      await loadTeamMemberships();
      $("dashboardConnectedContent").hidden = false;
      renderWorkspaceHeader();
      $("dashboardRoleBadge").textContent = clubView ? `Club ${roleLabel(clubWorkspace?.role)}` : roleLabel(workspace.role);
      $("dashboardRoleMetric").textContent = roleLabel(workspace.role);
      $("dashboardConnectionLabel").textContent = clubView ? "Connected club workspace" : "Connected private workspace";
      $("dashboardConnectionDetail").textContent = clubView
        ? `${session.user.email} · ${clubWorkspace?.teams?.length || 0} ${clubWorkspace?.clubName || "club"} team${(clubWorkspace?.teams?.length || 0) === 1 ? "" : "s"} · team records stay isolated`
        : `${session.user.email} · ${teamMemberships.length} team workspace${teamMemberships.length === 1 ? "" : "s"} · membership protected`;

      if (clubView) {
        if ($("teamWorkspaceLayout")) $("teamWorkspaceLayout").hidden = true;
        $("clubOverviewPanel").hidden = false;
        renderClubOverview();
        return;
      }

      if ($("teamWorkspaceLayout")) $("teamWorkspaceLayout").hidden = false;
      $("clubOverviewPanel").hidden = true;
      applyRoleExperience();
      const canInvite = ["owner","admin"].includes(workspace.role);
      $("teamAccessManagerPanel").hidden = !canInvite;
      $("teamAccessUnavailable").hidden = canInvite;
      $("rosterManagerPanel").hidden = !canInvite;
      $("rosterReadOnlyMessage").hidden = canInvite;
      renderTeamProfile();
      await loadTeamAccess();
      await loadPlatformOwnerAccess();
      await Promise.all([loadGames(), loadGroupMe(), loadRoster()]);
      updateReadiness();
      await autoSyncTournamentSchedule();
    } catch (error) {
      $("dashboardConnectionLabel").textContent = "Connected setup needs attention";
      $("dashboardConnectionDetail").textContent = error.message;
    }
  }

  $("readinessNextButton").addEventListener("click", event => {
    const button = event.currentTarget;
    if (button.dataset.mode === "game-day") {
      focusSetupStep("dashboardGameDay", "addGameDayButton");
      return;
    }
    if (button.dataset.target) focusSetupStep(button.dataset.target, button.dataset.focus || null);
  });

  $("addGameDayButton").addEventListener("click", () => openGameDayDialog().catch(error => { $("dashboardConnectionDetail").textContent = error.message; }));
  $("refreshGameDayButton").addEventListener("click", () => loadGames().then(() => syncTournamentSchedule({automatic:true,force:true})).catch(error => { $("dashboardConnectionDetail").textContent = error.message; }));
  $("refreshGameArchiveButton")?.addEventListener("click", () => loadGameSeriesArchive().catch(error => { $("dashboardConnectionDetail").textContent = error.message; }));
  $("gameArchiveSeasonFilter")?.addEventListener("change", event => { gameArchiveSeason = event.target.value || "all"; renderGameSeriesArchive(); });
  $("syncWpiScheduleButton").addEventListener("click", () => syncTournamentSchedule({automatic:false,force:true}).catch(error => { $("wpiScheduleSyncMessage").textContent = error.message || "The WPI schedule could not be synced."; }));
  $("gameKindOptions").addEventListener("change", renderGameKindFields);
  $("gameTournamentSelect").addEventListener("change", renderGameKindFields);
  $("gameOpponentName").addEventListener("input", updateGameMatchupPreview);
  $("gameOpponentName").addEventListener("change", updateGameMatchupPreview);
  $("saveGameDayButton").addEventListener("click", () => saveGameDay({startAfter:false}));
  $("saveStartGameDayButton").addEventListener("click", () => saveGameDay({startAfter:true}));
  $("gameDayQueue").addEventListener("click", event => {
    const add = event.target.closest("[data-game-day-add]");
    if (add) return void openGameDayDialog().catch(error => { $("dashboardConnectionDetail").textContent = error.message; });
    const saveAssignment = event.target.closest("[data-game-assignment-save]");
    if (saveAssignment) {
      const card = saveAssignment.closest("[data-game-day-id]");
      const select = card?.querySelector("[data-game-assignment-select]");
      saveAssignment.disabled = true;
      const previous = saveAssignment.textContent;
      saveAssignment.textContent = "Saving…";
      assignGameScorer(saveAssignment.dataset.gameAssignmentSave,select?.value || null)
        .then(() => loadGameDayQueue())
        .then(() => { const target=$("gameDayQueueMessage"); if (target) target.textContent = select?.value ? "Scorer assigned." : "Game is unassigned and available for a permanent scorer to claim."; })
        .catch(error => { const target=$("gameDayQueueMessage"); if (target) target.textContent = error.message || "Scorer assignment could not be saved."; })
        .finally(() => { if (saveAssignment.isConnected) { saveAssignment.disabled=false; saveAssignment.textContent=previous; } });
      return;
    }
    const start = event.target.closest("[data-game-day-start]");
    if (start) {
      const gameId = start.dataset.gameDayStart;
      const game = gameDayQueue.find(row => row.id === gameId);
      if (game?.status === "live") return void window.location.assign(teamScopedUrl("live-game.html", {game:gameId}));
      start.disabled = true;
      const previousText = start.textContent;
      start.textContent = "Preparing…";
      prepareGameDayStart(gameId)
        .then(() => window.location.assign(teamScopedUrl("live-game.html", {game:gameId})))
        .catch(error => {
          start.disabled = false;
          start.textContent = previousText;
          const target = $("gameDayQueueMessage");
          if (target) target.textContent = error.message || "The game could not be started.";
          else alert(error.message || "The game could not be started.");
        });
      return;
    }
    const confirmMatch = event.target.closest("[data-game-reconcile-confirm]");
    if (confirmMatch) return void confirmTournamentReconciliation(confirmMatch.dataset.gameReconcileConfirm).catch(error => { $("wpiScheduleSyncMessage").textContent = error.message || "The official matchup could not be linked."; });
    const dismissMatch = event.target.closest("[data-game-reconcile-dismiss]");
    if (dismissMatch) return void dismissTournamentReconciliation(dismissMatch.dataset.gameReconcileDismiss).catch(error => { $("wpiScheduleSyncMessage").textContent = error.message || "The match review could not be dismissed."; });
    const edit = event.target.closest("[data-game-day-edit]");
    if (edit) {
      const game = gameDayQueue.find(row => row.id === edit.dataset.gameDayEdit);
      return void openGameDayDialog(game).catch(error => { $("dashboardConnectionDetail").textContent = error.message; });
    }
    const cancel = event.target.closest("[data-game-day-cancel]");
    if (cancel) return void cancelPlannedGame(cancel.dataset.gameDayCancel).catch(error => { $("dashboardConnectionDetail").textContent = error.message; });
  });

  $("refreshRoleHomeButton").addEventListener("click", () => loadGames().catch(error => { $("dashboardConnectionDetail").textContent = error.message; }));
  $("roleHomeGames").addEventListener("click", event => {
    const start = event.target.closest("[data-role-home-start]");
    if (!start) return;
    const gameId = start.dataset.roleHomeStart;
    const game = gameDayQueue.find(row => String(row.id) === String(gameId));
    if (game?.status === "live") { window.location.assign(teamScopedUrl("live-game.html", {game:gameId})); return; }
    start.disabled = true;
    const prior = start.textContent;
    start.textContent = "Preparing…";
    prepareGameDayStart(gameId)
      .then(() => window.location.assign(teamScopedUrl("live-game.html", {game:gameId})))
      .catch(error => { start.disabled=false; start.textContent=prior; $("dashboardConnectionDetail").textContent = error.message || "The game could not be started."; });
  });

  $("dashboardSignOutButton").addEventListener("click", async () => {
    if (backend) await backend.signOut();
    localStorage.removeItem("wpi-live-auth-v7-56-8");
    localStorage.removeItem("wpi-live-auth-v7-56-3");
    localStorage.removeItem("wpi-live-auth-v7-56-1");
    localStorage.removeItem(window.WPILiveTeamContext?.storageKey || "wpi-live-selected-team-v7-57-3");
    window.location.assign("live-login.html");
  });
  $("dashboardTeamSwitcher").addEventListener("change", event => switchTeam(event.target.value));
  $("clubOverviewPanel")?.addEventListener("click", event => {
    const button = event.target.closest("[data-club-team-jump]");
    if (button) switchTeam(button.dataset.clubTeamJump);
  });
  $("createTeamButton").addEventListener("click", openCreateTeamDialog);
  $("confirmCreateTeamButton").addEventListener("click", createAdditionalTeam);
  $("newTeamName").addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); createAdditionalTeam(); } });
  $("openAccountRegistryButton")?.addEventListener("click", openAccountRegistry);
  $("refreshAccountRegistryButton")?.addEventListener("click", () => loadAccountRegistry().catch(error => { $("accountRegistryMessage").textContent = error.message || "Account records could not be refreshed."; }));
  $("exportAccountRegistryButton")?.addEventListener("click", exportAccountRegistryCsv);
  $("accountRegistrySearch")?.addEventListener("input", event => { accountRegistryFilter = event.target.value || ""; renderAccountRegistry(); });
  $("createInviteButton").addEventListener("click", createInvite);
  $("inviteResult").addEventListener("click", event => {
    if (!lastCreatedInvite) return;
    if (event.target.closest("[data-copy-created-invite]")) copyText(inviteUrl(lastCreatedInvite.token), "Invite link copied.");
    if (event.target.closest("[data-email-created-invite]")) emailInvite(lastCreatedInvite);
  });
  $("teamAccessMembers").addEventListener("change", event => {
    const select = event.target.closest("[data-member-role]");
    if (!select) return;
    const card = select.closest("[data-access-user]");
    const row = card?.querySelector("[data-member-groupme-row]");
    if (row) { row.hidden = select.value !== "admin"; if (row.hidden) row.querySelector("input").checked = false; }
  });
  $("teamAccessMembers").addEventListener("click", async event => {
    try {
      const promote = event.target.closest("[data-make-scorer]");
      if (promote) return await promoteSupporterToScorer(promote.dataset.makeScorer, promote);
      const save = event.target.closest("[data-save-member]");
      if (save) return await saveMemberAccess(save.dataset.saveMember, save.closest("[data-access-user]"));
      const remove = event.target.closest("[data-remove-member]");
      if (remove) return await removeMember(remove.dataset.removeMember);
    } catch (error) { $("inviteMessage").textContent = error.message || "Team access could not be updated."; }
  });
  $("teamAccessInvites").addEventListener("click", async event => {
    const button = event.target.closest("button");
    if (!button) return;
    const id = button.dataset.copyInvite || button.dataset.emailInvite || button.dataset.reissueInvite || button.dataset.revokeInvite;
    const invite = teamAccess.invites.find(row => row.inviteId === id);
    try {
      if (button.dataset.copyInvite && invite) return await copyText(inviteUrl(invite.token), "Invite link copied.");
      if (button.dataset.emailInvite && invite) return emailInvite(invite);
      if (button.dataset.reissueInvite) return await reissueInvite(button.dataset.reissueInvite);
      if (button.dataset.revokeInvite) return await revokeInvite(button.dataset.revokeInvite);
    } catch (error) { $("inviteMessage").textContent = error.message || "Invitation could not be updated."; }
  });
  $("saveGroupMeButton").addEventListener("click", activateGroupMe);
  $("pauseGroupMeButton").addEventListener("click", pauseGroupMe);
  $("testGroupMeButton").addEventListener("click", testGroupMe);
  $("loadGroupMeGroupsButton").addEventListener("click", loadGroupMeGroups);
  $("loadGroupMeTopicsButton").addEventListener("click", loadGroupMeTopics);
  $("groupMeGroupSelect").addEventListener("change", () => {
    groupMeTopics = [];
    populateGroupMeTopics();
    $("loadGroupMeTopicsButton").disabled = !$("groupMeGroupSelect").value;
    renderGroupMeSetupProgress();
    loadGroupMeTopics();
  });
  $("groupMeTopicSelect").addEventListener("change", () => {
    $("groupMeSetupMessage").textContent = groupMeSelectionMatchesDestination()
      ? (destination?.enabled ? "This is the active Score Updates destination." : "This saved destination is not active yet.")
      : "This selection is not active yet. Send a test message before using it for new games.";
    renderGroupMeSetupProgress();
  });
  $("dashboardScorerCode").addEventListener("input", event => { event.target.value = event.target.value.replace(/\D/g, "").slice(0,6); });
  $("dashboardScorerCode").addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); previewScorerCode(); } });
  $("dashboardPreviewScorerCodeButton").addEventListener("click", previewScorerCode);
  $("dashboardAcceptScorerCodeButton").addEventListener("click", acceptScorerCode);

  $("saveTeamProfileButton").addEventListener("click", saveTeamProfile);
  $("takeRosterPhotoButton").addEventListener("click", () => { $("rosterCameraInput").value = ""; $("rosterCameraInput").click(); });
  $("uploadRosterImageButton").addEventListener("click", () => { $("rosterUploadInput").value = ""; $("rosterUploadInput").click(); });
  $("manualRosterButton").addEventListener("click", () => openRosterDialog({source:"manual", rows:rosterDraftFromCurrent().length ? rosterDraftFromCurrent() : [{id:uid("player"),cap:"",name:"",source:"manual",review:false}]}));
  $("editCurrentRosterButton").addEventListener("click", () => openRosterDialog({source:"manual", rows:rosterDraftFromCurrent()}));
  $("rosterCameraInput").addEventListener("change", event => readRosterImage(event.target.files?.[0]));
  $("rosterUploadInput").addEventListener("change", event => readRosterImage(event.target.files?.[0]));
  $("addRosterDraftRowButton").addEventListener("click", () => { syncRosterDraftFromForm(); rosterDraft.push({id:uid("player"),cap:"",name:"",source:"manual",review:false}); renderRosterDraft(); });
  $("rosterDraftRows").addEventListener("click", event => {
    const button = event.target.closest("[data-remove-roster-row]");
    if (!button) return;
    syncRosterDraftFromForm();
    rosterDraft = rosterDraft.filter(row => row.id !== button.dataset.removeRosterRow);
    renderRosterDraft();
  });
  $("saveRosterDraftButton").addEventListener("click", saveRosterDraft);
  $("retryRosterImageButton").addEventListener("click", () => {
    if (!lastRosterFile) return;
    $("rosterImportDialog").close();
    setTimeout(() => readRosterImage(lastRosterFile), 0);
  });
  $("uploadAnotherRosterButton").addEventListener("click", () => {
    $("rosterImportDialog").close();
    setTimeout(() => { $("rosterUploadInput").value = ""; $("rosterUploadInput").click(); }, 0);
  });
  $("manualRosterFromFailureButton").addEventListener("click", () => {
    $("rosterImportDialog").close();
    setTimeout(() => openRosterDialog({source:"manual", rows:rosterDraftFromCurrent().length ? rosterDraftFromCurrent() : [{id:uid("player"),cap:"",name:"",source:"manual",review:false}]}), 0);
  });
  $("mobileAdminJumpSelect")?.addEventListener("change", event => {
    const targetId = event.target.value;
    if (!targetId) return;
    focusSetupStep(targetId, targetId === "dashboardGameDay" ? "addGameDayButton" : null);
    event.target.value = "";
  });

  document.querySelectorAll(".live-dashboard-sidebar nav a").forEach(link => link.addEventListener("click", () => {
    document.querySelectorAll(".live-dashboard-sidebar nav a").forEach(item => item.classList.remove("is-active"));
    link.classList.add("is-active");
  }));

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
