/* WPI 7.62.0 — Unified Organization Discovery & Scale.
 * Preserves 7.61.1 schedule/delivery behavior and adds organization-scale workspace filtering.
 *
 * Adds source-backed high-school regular-season scheduling and makes GroupMe an optional
 * external delivery channel while WPI Live remains the canonical score surface.
 *
 * Preserves WPI 7.60.3 — Team Directory & Identity Management.
 * Adds persistent club-scoped explicit identity aliases to game setup while preserving
 * the validated 7.58.10 dashboard safety and all scoring/GroupMe/recovery contracts.
 *
 * Preserves WPI 7.58.10 — Pilot Launch Prep & Admin Safety.
 * Adds explicit team launch readiness, safer game creation context, stronger duplicate
 * protection, club-level access shortcuts, and deliberate manual-opponent identity
 * resolution while preserving validated scorer, GroupMe, Following, archive and tournament semantics.
 *
 * Preserves WPI 7.58.5 — Tournament Feed → Game-Day Validation.
 * Hardens official tournament schedule ingestion for multi-squad club workspaces,
 * preserves manual-game canonical reconciliation, and surfaces identity review instead of guessing.
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
  let rosterVersions = [];
  let rosterDraft = [];
  let rosterDraftSource = "manual";
  let rosterOcrBusy = false;
  let lastRosterFile = null;
  let teamAccess = {members:[],invites:[]};
  let teamFollowers = [];
  let followingOverview = {teams:[],games:[]};
  let roleHomeTeamFilter = "all";
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
  let persistentIdentityAliases = [];
  let highSchoolDirectory = {organizations:[],teams:[]};
  let gameCatalogTournaments = [];
  let editingGameDayId = null;
  let gameCatalogLoaded = false;
  let tournamentScheduleIndex = null;
  let tournamentScheduleCandidates = [];
  let tournamentScheduleIdentityReviews = [];
  let tournamentScheduleLoadError = null;
  let tournamentScheduleSyncBusy = false;
  let tournamentScheduleAutoSyncedTeamId = null;
  let scoreDelivery = {mode:"wpi_live_only",ready:true,groupMeConfigured:false,groupMeEnabled:false,groupMeTested:false,canManage:false};
  let highSchoolScheduleIndex = null;
  let highSchoolScheduleGames = [];
  let highSchoolScheduleSyncBusy = false;
  let highSchoolScheduleAutoSyncedTeamId = null;
  let clubPilotValidation = null;
  let clubOperations = {metrics:{},people:[],manualOpponents:[]};
  let clubTeamFilters = {query:"",age:"all",gender:"all",status:"all"};
  let clubPeopleFilter = "";
  let newTeamNameManuallyEdited = false;
  let clubLaunchReadiness = {summary:{},teams:[]};
  let identityReviewRawName = "";
  let identityReviewSelection = null;
  let teamWorkspaceSearch = "";
  let teamWorkspaceType = "all";

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

  function liveGameLaunchUrl(gameId) {
    return teamScopedUrl("live-game.html", {game:gameId, launch:1});
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

  function supporterRelationshipTeams() {
    if (workspace?.role !== "viewer") return [];
    const rows = Array.isArray(followingOverview?.teams) ? followingOverview.teams : [];
    const visible = rows.filter(team => team.isMember || team.isFollowing).map(team => ({
      id:String(team.teamId || ""),
      label:team.teamDisplayLabel || team.teamName || "Team",
      ageGroup:team.ageGroup || "",
      gender:team.gender || "",
      squadLabel:team.squadLabel || "",
      relationship:team.isMember ? "member" : "following"
    })).filter(team => team.id);
    if (!visible.some(team => team.id === String(workspace?.teamId || "")) && workspace?.teamId) {
      visible.unshift({id:String(workspace.teamId),label:workspace.teamDisplayLabel || workspace.teamName || "Team",ageGroup:workspace.ageGroup || "",gender:workspace.gender || "",squadLabel:workspace.squadLabel || "",relationship:"member"});
    }
    return [...new Map(visible.map(team => [team.id,team])).values()];
  }

  function archiveViewTargets() {
    if (!workspace?.teamId) return [];
    if (workspace.role !== "viewer") return [{id:String(workspace.teamId),label:workspace.teamDisplayLabel || workspace.teamName || "Team",ageGroup:workspace.ageGroup || "",gender:workspace.gender || "",relationship:"member"}];
    const teams = supporterRelationshipTeams();
    if (roleHomeTeamFilter === "all") return teams.length ? teams : [{id:String(workspace.teamId),label:workspace.teamDisplayLabel || workspace.teamName || "Team",ageGroup:workspace.ageGroup || "",gender:workspace.gender || "",relationship:"member"}];
    const selected = teams.find(team => team.id === String(roleHomeTeamFilter));
    return selected ? [selected] : [{id:String(workspace.teamId),label:workspace.teamDisplayLabel || workspace.teamName || "Team",ageGroup:workspace.ageGroup || "",gender:workspace.gender || "",relationship:"member"}];
  }

  function renderArchiveViewingContext(targets = archiveViewTargets()) {
    const label = $("gameArchiveViewingTeam");
    if (!label) return;
    if (workspace?.role !== "viewer") { label.textContent = `Viewing ${workspace?.teamDisplayLabel || workspace?.teamName || "current team"}`; return; }
    if (roleHomeTeamFilter === "all" && targets.length > 1) label.textContent = `Viewing all ${targets.length} teams · each event stays labeled by team`;
    else label.textContent = `Viewing ${targets[0]?.label || workspace?.teamDisplayLabel || workspace?.teamName || "team"}`;
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
        const label = series.seriesType === "tournament" ? "Tournament" : series.seriesType === "season_schedule" ? "Regular season" : "Scrimmage weekend";
        const ties = Number(series.ties || 0);
        const finalCount = Number(series.finalCount || 0);
        const record = finalCount ? `${Number(series.wins || 0)}-${Number(series.losses || 0)}${ties ? `-${ties}` : ""}` : "—";
        const gameRows = (series.games || []).map(game => {
          const result = archiveResult(game);
          const ownName = game.teamName || series.viewTeamLabel || workspace?.teamName || "Team";
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
            <a class="live-archive-game-link" href="${escapeHtml(teamScopedUrl("live-game-recap.html", {game:game.id,team:game.teamId || series.viewTeamId}))}">View recap</a>
          </article>`;
        }).join("");
        const venueCopy = Array.isArray(series.venues) && series.venues.length ? series.venues.slice(0,2).join(" · ") : "";
        const viewTeamMeta = [series.viewTeamLabel,series.viewAgeGroup,normalizedGender(series.viewGender)==="boys" ? "Boys" : normalizedGender(series.viewGender)==="girls" ? "Girls" : normalizedGender(series.viewGender)==="coed" ? "Coed" : ""].filter(Boolean);
        return `<article class="live-game-series-card" data-view-team="${escapeHtml(series.viewTeamId || "")}">
          <div class="live-archive-team-context">${escapeHtml(viewTeamMeta.join(" · ") || workspace?.teamDisplayLabel || workspace?.teamName || "Team")}</div>
          <div class="live-archive-series-heading">
            <div><p class="live-section-kicker">${escapeHtml(label)}</p><h3>${escapeHtml(series.name)}</h3><p>${escapeHtml(archiveDateRange(series.firstGameAt,series.lastGameAt))}${venueCopy ? ` · ${escapeHtml(venueCopy)}` : ""}</p></div>
            <div class="live-game-series-record"><strong>${escapeHtml(record)}</strong><span>${finalCount} final${finalCount === 1 ? "" : "s"}</span>${series.canManage ? `<button type="button" class="live-archive-merge-button" data-merge-series="${escapeHtml(series.id)}">Merge event</button>` : ""}</div>
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
    if (!backend || !workspace?.teamId) { gameSeriesArchive = []; gameArchiveSeasons = []; renderArchiveViewingContext([]); renderGameSeriesArchive(); return; }
    const targets = archiveViewTargets();
    renderArchiveViewingContext(targets);
    const responses = await Promise.all(targets.map(async target => {
      const {data,error} = await backend.client.rpc("live_game_series_archive_v4", {target_team_id:target.id});
      if (error) throw error;
      return {target,data:data || {}};
    }));
    gameSeriesArchive = responses.flatMap(({target,data}) => {
      const team = data?.team || {};
      return (Array.isArray(data?.series) ? data.series : []).map(series => ({
        ...series,
        viewTeamId:String(team.teamId || target.id),
        viewTeamLabel:team.teamDisplayLabel || team.teamName || target.label,
        viewAgeGroup:team.ageGroup || target.ageGroup || "",
        viewGender:team.gender || target.gender || "",
        viewRelationship:data.relationship || target.relationship || "member"
      }));
    });
    gameArchiveSeasons = Array.from(new Set(gameSeriesArchive.map(row => row.competitiveSeason).filter(Boolean))).sort().reverse();
    const filter = $("gameArchiveSeasonFilter");
    if (filter) {
      const selected = gameArchiveSeason;
      filter.innerHTML = '<option value="all">All seasons</option>' + gameArchiveSeasons.map(season => `<option value="${escapeHtml(season)}">${escapeHtml(season)}</option>`).join("");
      gameArchiveSeason = selected !== "all" && gameArchiveSeasons.includes(selected) ? selected : "all";
      filter.value = gameArchiveSeason;
    }
    renderGameSeriesArchive();
    populateScrimmageWeekendSelect();
  }

  function scrimmageWeekendOptions() {
    return gameSeriesArchive.filter(row => row.seriesType === "scrimmage_weekend" && String(row.competitiveSeason || "") === String(workspace?.competitiveSeason || ""));
  }

  function populateScrimmageWeekendSelect(selectedName = "") {
    const select = $("gameScrimmageWeekendSelect");
    if (!select) return;
    const rows = scrimmageWeekendOptions();
    select.innerHTML = '<option value="__new__">Create new Scrimmage Weekend…</option>' + rows.map(row => `<option value="${escapeHtml(row.name)}">${escapeHtml(row.name)}</option>`).join("");
    if (selectedName && rows.some(row => row.name === selectedName)) select.value = selectedName;
    else select.value = "__new__";
    renderScrimmageWeekendSelection();
  }

  function renderScrimmageWeekendSelection() {
    const select = $("gameScrimmageWeekendSelect");
    const label = $("gameScrimmageWeekendNewLabel");
    if (!select || !label) return;
    label.hidden = select.value !== "__new__";
  }

  function eventMergeTargets(source) {
    return gameSeriesArchive.filter(row => row.id !== source?.id && row.viewTeamId === source?.viewTeamId && row.seriesType === source?.seriesType && row.competitiveSeason === source?.competitiveSeason);
  }

  function openEventMergeDialog(seriesId) {
    const source = gameSeriesArchive.find(row => String(row.id) === String(seriesId));
    if (!source || !source.canManage) return;
    const targets = eventMergeTargets(source);
    $("eventMergeSourceId").value = source.id;
    $("eventMergeSourceName").textContent = source.name;
    $("eventMergeTarget").innerHTML = targets.length ? '<option value="">Choose event…</option>' + targets.map(row => `<option value="${escapeHtml(row.id)}">${escapeHtml(row.name)}</option>`).join("") : '<option value="">No compatible event records</option>';
    $("confirmEventMergeButton").disabled = !targets.length;
    $("eventMergeMessage").textContent = targets.length ? "All games will keep their original game IDs, scores, events, lineups, scorer history and GroupMe audit." : "Create another event in the same season/type before merging.";
    $("eventMergeDialog").showModal();
  }

  async function mergeEventSeries() {
    const sourceId = $("eventMergeSourceId").value;
    const targetId = $("eventMergeTarget").value;
    if (!sourceId || !targetId) { $("eventMergeMessage").textContent = "Choose the event these games belong under."; return; }
    const source = gameSeriesArchive.find(row => String(row.id) === String(sourceId));
    const target = gameSeriesArchive.find(row => String(row.id) === String(targetId));
    if (!source || !target) return;
    if (!confirm(`Merge “${source.name}” into “${target.name}”? WPI will move the games but preserve every game record.`)) return;
    const button = $("confirmEventMergeButton");
    button.disabled = true; $("eventMergeMessage").textContent = "Merging event records…";
    try {
      const {data,error} = await backend.client.rpc("live_merge_game_series_v1", {source_series_id:sourceId,target_series_id:targetId});
      if (error) throw error;
      $("eventMergeDialog").close();
      await Promise.all([loadGameSeriesArchive(),loadGameDayQueue()]);
      $("gameArchiveSummary").textContent = `${Number(data?.movedGameCount || 0)} game${Number(data?.movedGameCount || 0) === 1 ? "" : "s"} grouped under ${data?.targetSeriesName || target.name}.`;
    } catch (error) { $("eventMergeMessage").textContent = error.message || "The event records could not be merged."; }
    finally { button.disabled = false; }
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

  function resolvePersistentIdentityAlias(name) {
    const normalized = normalizedGameTeamName(name);
    if (!normalized) return null;
    const saved = persistentIdentityAliases.find(row => normalizedGameTeamName(row.rawAlias || row.normalizedAlias) === normalized);
    if (!saved) return null;
    const team = saved.canonicalWpiTeamId ? (gameCatalogTeams.find(row => String(row.canonicalTeamId || "") === String(saved.canonicalWpiTeamId)) || null) : null;
    const club = gameCatalogClubs.find(row => String(row.canonicalClubId || "") === String(saved.canonicalWpiClubId || "")) || null;
    return {
      team,
      club,
      displayName:saved.canonicalDisplayName || shortClubDisplayName(club) || team?.displayClubName || team?.team || name,
      matchType:"club_saved_alias",
      confidence:1,
      familyKey:saved.canonicalWpiTeamFamilyKey || null,
      savedAlias:true
    };
  }

  function normalizedHighSchoolName(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[’']/g, "")
      .replace(/\bhigh school\b/g, " ")
      .replace(/\b(mens|womens|men|women|varsity|jv)\b/g, " ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function resolveHighSchoolIdentity(name) {
    const raw = String(name || "").trim();
    const normalized = normalizedHighSchoolName(raw);
    if (!normalized || !Array.isArray(highSchoolDirectory?.organizations)) return null;
    const team = (highSchoolDirectory.teams || []).find(row => {
      const candidates = [row.teamName, ...(row.aliases || [])].map(normalizedHighSchoolName).filter(Boolean);
      return candidates.includes(normalized);
    }) || null;
    const organization = team
      ? highSchoolDirectory.organizations.find(row => row.organizationId === team.organizationId)
      : highSchoolDirectory.organizations.find(row => {
          const candidates = [row.name,row.shortName,row.slug,...(row.aliases || [])].map(normalizedHighSchoolName).filter(Boolean);
          return candidates.some(alias => normalized === alias || normalized.startsWith(`${alias} `));
        });
    if (!organization) return null;
    const resolvedTeam = team || (highSchoolDirectory.teams || []).find(row => row.organizationId === organization.organizationId && normalizedHighSchoolName(row.teamName) === normalized) || null;
    return {
      team: resolvedTeam ? {
        ...resolvedTeam,
        team: resolvedTeam.teamName,
        logo: resolvedTeam.logo || organization.logo || null,
        clubSlug: organization.slug,
        canonicalTeamId: null
      } : null,
      club: {
        club: organization.shortName || organization.name,
        displayName: organization.shortName || organization.name,
        slug: organization.slug,
        canonicalClubId: organization.organizationId,
        logo: organization.logo || null
      },
      displayName: resolvedTeam?.teamName || organization.shortName || organization.name,
      matchType: resolvedTeam ? "high_school_team" : "high_school_organization",
      confidence: 1
    };
  }


  function currentHighSchoolOrganization() {
    const candidates = [workspace?.clubName, workspace?.clubDisplayName, workspace?.teamName].map(normalizedHighSchoolName).filter(Boolean);
    if (!candidates.length) return null;
    return (highSchoolDirectory?.organizations || []).find(row => {
      const names = [row.name,row.shortName,row.slug].map(normalizedHighSchoolName).filter(Boolean);
      return names.some(name => candidates.some(candidate => candidate === name || candidate.startsWith(`${name} `)));
    }) || null;
  }

  function currentHighSchoolTeamDefinition() {
    const organization = currentHighSchoolOrganization();
    if (!organization) return null;
    const labels = [workspace?.teamDisplayLabel,workspace?.teamName].map(value => String(value || "").trim()).filter(Boolean);
    return (highSchoolDirectory?.teams || []).find(row => {
      if (row.organizationId !== organization.organizationId) return false;
      const teamNames = [row.teamName,...(row.aliases || [])].map(normalizedHighSchoolName).filter(Boolean);
      return labels.some(label => {
        const normalized = normalizedHighSchoolName(label);
        return teamNames.includes(normalized) || normalizedHighSchoolName(`${organization.shortName || organization.name} ${row.teamName}`) === normalized;
      });
    }) || null;
  }

  function isHighSchoolWorkspace() {
    return Boolean(currentHighSchoolOrganization() && currentHighSchoolTeamDefinition());
  }

  function highSchoolScheduleLabel(row) {
    if (!row) return "Schedule game";
    const date = row.date ? new Date(`${row.date}T12:00:00`).toLocaleDateString([], {month:"short",day:"numeric"}) : "Date TBD";
    const time = row.time === "TBA" ? "Time TBA" : row.time ? new Date(`2000-01-01T${row.time}:00`).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"}) : "Time TBA";
    return `${date} · ${time}`;
  }

  function resolveGameDayTeamIdentity(name) {
    const normalized = normalizedGameTeamName(name);
    if (!normalized) return null;
    const savedAlias = resolvePersistentIdentityAlias(name);
    if (savedAlias) return savedAlias;
    const highSchoolIdentity = resolveHighSchoolIdentity(name);
    if (highSchoolIdentity) return highSchoolIdentity;
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

  function participantWorkspaceMatch(participant) {
    const resolved = scheduleParticipantResolution(participant);
    const ownIdentity = resolveGameDayTeamIdentity(workspace?.teamName || "");
    const helper = window.WpiLiveTournamentFeed;
    if (!helper?.assessParticipant) return {score:0,ambiguous:false,reason:"matcher_unavailable",resolved};
    const assessment = helper.assessParticipant({
      participant,
      resolvedParticipant:resolved,
      workspace,
      resolvedWorkspace:ownIdentity,
      clubTeams:clubWorkspace?.teams || []
    });
    return {...assessment,resolved};
  }

  function officialGameAssessmentForWorkspace(row) {
    if (!row || !workspace) return {game:null,review:null};
    if (row.competitiveSeason && workspace.competitiveSeason && row.competitiveSeason !== workspace.competitiveSeason) return {game:null,review:null};
    if (row.ageGroup && workspace.ageGroup && String(row.ageGroup).toUpperCase() !== String(workspace.ageGroup).toUpperCase()) return {game:null,review:null};
    const genderHint = workspaceGenderHint();
    if (genderHint && row.gender && String(row.gender).toLowerCase() !== genderHint) return {game:null,review:null};
    const whiteMatch = participantWorkspaceMatch(row.white);
    const darkMatch = participantWorkspaceMatch(row.dark);
    const whiteScore = Number(whiteMatch.score || 0);
    const darkScore = Number(darkMatch.score || 0);
    const ownSide = whiteScore >= darkScore ? "white" : "dark";
    const ownMatch = ownSide === "white" ? whiteMatch : darkMatch;
    const ownMatchScore = Math.max(whiteScore,darkScore);
    if (ownMatchScore < 0.6 || Math.abs(whiteScore-darkScore) < 0.15) {
      const reviewMatch = whiteMatch.ambiguous ? {side:"white",match:whiteMatch,participant:row.white} : darkMatch.ambiguous ? {side:"dark",match:darkMatch,participant:row.dark} : null;
      if (reviewMatch) {
        return {game:null,review:{
          eventId:row.eventId,
          gameId:row.gameId,
          tournamentName:row.eventName,
          divisionLabel:row.divisionLabel,
          scheduledAt:row.scheduledAt,
          venue:row.venue,
          sourceTeamName:reviewMatch.participant?.name || "Club team",
          reason:reviewMatch.match.reason
        }};
      }
      return {game:null,review:null};
    }
    const ownParticipant = ownSide === "white" ? row.white : row.dark;
    const opponentParticipant = ownSide === "white" ? row.dark : row.white;
    const ownResolved = ownMatch.resolved || scheduleParticipantResolution(ownParticipant);
    const opponentResolved = ownSide === "white" ? darkMatch.resolved : whiteMatch.resolved;
    const ownIdentity = resolveGameDayTeamIdentity(workspace.teamName || "");
    const scores = row.scores || {};
    return {game:{
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
      workspaceMatchConfidence: ownMatchScore,
      workspaceMatchReason: ownMatch.reason || null
    },review:null};
  }

  function officialGameForWorkspace(row) {
    return officialGameAssessmentForWorkspace(row).game;
  }

  async function loadTournamentScheduleIndex({force=false} = {}) {
    if (tournamentScheduleIndex && !force) return tournamentScheduleIndex;
    tournamentScheduleLoadError = null;
    try {
      const response = await fetch(`data/live/tournament-schedule-index.json${force ? `?ts=${Date.now()}` : ""}`, {cache:"no-store"});
      if (!response.ok) throw new Error(`WPI schedule index returned ${response.status}`);
      tournamentScheduleIndex = await response.json();
      const assessments = (tournamentScheduleIndex.games || []).map(officialGameAssessmentForWorkspace);
      tournamentScheduleCandidates = assessments.map(row => row.game).filter(Boolean);
      tournamentScheduleIdentityReviews = assessments.map(row => row.review).filter(Boolean);
    } catch (error) {
      tournamentScheduleIndex = null;
      tournamentScheduleCandidates = [];
      tournamentScheduleIdentityReviews = [];
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
    const identityReviewCount = tournamentScheduleIdentityReviews.length;
    if (!tournamentScheduleIndex) {
      pill.textContent = "Checking";
      pill.dataset.state = "loading";
      summary.textContent = "Checking the WPI tournament schedule…";
      detail.textContent = "Manual tournament entry remains available at all times.";
      return;
    }
    if (!scheduleCount) {
      if (identityReviewCount) {
        pill.textContent = `${identityReviewCount} identity review${identityReviewCount === 1 ? "" : "s"}`;
        pill.dataset.state = "attention";
        const first = tournamentScheduleIdentityReviews[0];
        summary.textContent = `WPI found ${identityReviewCount} official club-level matchup${identityReviewCount === 1 ? "" : "s"} that cannot be assigned safely to ${workspace?.teamDisplayLabel || workspace?.teamName || "this team"}.`;
        detail.textContent = `${first?.sourceTeamName || "The source team"} is not specific enough to distinguish multiple Live squads. WPI will not auto-import or guess.`;
      } else {
        pill.textContent = next?.status === "announced" ? "Schedule coming soon" : "No schedule games";
        pill.dataset.state = "waiting";
        summary.textContent = next?.name ? `${next.name}${next.dateLabel ? ` · ${next.dateLabel}` : ""}` : "No official WPI schedule is published for this team yet.";
        detail.textContent = next?.description || "Add a tournament game manually if needed. It will remain eligible for reconciliation later.";
      }
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
        if (message) message.textContent = tournamentScheduleIdentityReviews.length
          ? `${tournamentScheduleIdentityReviews.length} official matchup${tournamentScheduleIdentityReviews.length === 1 ? " needs" : "s need"} team identity review before WPI can add anything to Game Day.`
          : tournamentScheduleIndex?.nextTournament?.status === "announced"
            ? "The next tournament is announced; its official schedule has not been published to WPI yet."
            : "No official WPI schedule games are available for this team yet.";
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


  async function loadHighSchoolScheduleIndex({force=false} = {}) {
    if (highSchoolScheduleIndex && !force) return highSchoolScheduleIndex;
    const response = await fetch(`data/live/high-school-schedule-2026-27.json${force ? `?ts=${Date.now()}` : ""}`, {cache:"no-store"});
    if (!response.ok) throw new Error(`High-school schedule returned ${response.status}`);
    highSchoolScheduleIndex = await response.json();
    const team = currentHighSchoolTeamDefinition();
    highSchoolScheduleGames = team
      ? (highSchoolScheduleIndex.games || []).filter(row => row.teamFamilyKey === team.familyKey)
      : [];
    renderHighSchoolScheduleStatus();
    return highSchoolScheduleIndex;
  }

  function highSchoolScheduleSyncPayload(row) {
    const opponentIdentity = resolveGameDayTeamIdentity(row.opponent || "");
    const ownIdentity = resolveGameDayTeamIdentity(workspace?.teamName || "");
    return {
      scheduleId:row.scheduleId,
      teamFamilyKey:row.teamFamilyKey,
      opponent:row.opponent,
      date:row.date,
      time:row.time,
      scheduledAt:row.scheduledAt || null,
      timezone:row.timezone || highSchoolScheduleIndex?.timezone || "America/Los_Angeles",
      venue:row.venue || null,
      homeAway:row.homeAway || null,
      leagueGame:Boolean(row.leagueGame),
      teamLogoUrl:ownIdentity?.team?.logo || ownIdentity?.club?.logo || workspace?.clubLogoUrl || null,
      opponentLogoUrl:opponentIdentity?.team?.logo || opponentIdentity?.club?.logo || null,
      opponentWpiTeamId:opponentIdentity?.team?.canonicalTeamId || null,
      opponentWpiClubId:opponentIdentity?.club?.canonicalClubId || null
    };
  }

  function renderHighSchoolScheduleStatus() {
    const card = $("highSchoolScheduleCard");
    if (!card) return;
    const highSchool = isHighSchoolWorkspace();
    card.hidden = !highSchool;
    if ($("highSchoolGamePath")) $("highSchoolGamePath").hidden = !highSchool;
    const archiveTitle = $("gameArchiveTitle");
    const archiveHelp = $("gameArchiveHelp");
    if (archiveTitle) archiveTitle.textContent = highSchool ? "Season schedule & events" : "Tournaments & weekends";
    if (archiveHelp) archiveHelp.textContent = highSchool ? "Regular-season games, tournaments and friendly weekends stay attached to this team and season, with permanent scores and recaps." : "Every completed game stays with its tournament or named scrimmage weekend. Open an event to revisit the full weekend, scores, opponents and game recaps.";
    if (!highSchool) return;
    const pill = $("highSchoolScheduleStatusPill");
    const summary = $("highSchoolScheduleSummary");
    const detail = $("highSchoolScheduleDetail");
    const list = $("highSchoolScheduleList");
    const button = $("syncHighSchoolScheduleButton");
    const team = currentHighSchoolTeamDefinition();
    if (!team) return;
    const rows = highSchoolScheduleGames || [];
    const synced = new Set(gameDayQueue.map(game => String(game.highSchoolScheduleId || "")).filter(Boolean));
    const knownTimeRows = rows.filter(row => row.scheduledAt);
    const tbaRows = rows.filter(row => !row.scheduledAt);
    const unsyncedKnown = knownTimeRows.filter(row => !synced.has(String(row.scheduleId)));

    if (!rows.length) {
      pill.textContent = "Not published";
      pill.dataset.state = "waiting";
      summary.textContent = `${workspace?.teamDisplayLabel || workspace?.teamName || "This team"} does not have a published schedule in WPI yet.`;
      detail.textContent = "WPI will not fabricate games. Add a regular-season game manually if needed, or sync when a real schedule is published.";
      list.innerHTML = '<p class="live-empty-state">Schedule not published yet.</p>';
      button.hidden = true;
      return;
    }

    const syncedCount = knownTimeRows.filter(row => synced.has(String(row.scheduleId))).length;
    pill.textContent = unsyncedKnown.length ? `${unsyncedKnown.length} to sync` : "In sync";
    pill.dataset.state = unsyncedKnown.length ? "attention" : "connected";
    summary.textContent = `${rows.length} source-backed varsity game${rows.length === 1 ? "" : "s"} · ${syncedCount}/${knownTimeRows.length} timed games on Game Day.`;
    detail.textContent = tbaRows.length
      ? `${tbaRows.length} schedule entr${tbaRows.length === 1 ? "y has" : "ies have"} a TBA start time and will stay source-only until a real time is published.`
      : "The supplied schedule is linked to this team's canonical Game-Day records.";
    button.hidden = !["owner","admin"].includes(workspace?.role) || !unsyncedKnown.length;
    button.disabled = highSchoolScheduleSyncBusy;
    button.textContent = highSchoolScheduleSyncBusy ? "Syncing…" : `Sync ${unsyncedKnown.length || ""} schedule game${unsyncedKnown.length === 1 ? "" : "s"}`.replace(/\s+/g," ").trim();
    list.innerHTML = rows.map(row => {
      const isSynced = synced.has(String(row.scheduleId));
      const state = isSynced ? "synced" : row.scheduledAt ? "ready" : "tba";
      const status = isSynced ? "On Game Day" : row.scheduledAt ? "Ready to sync" : "Time TBA";
      return `<article class="live-hs-schedule-row" data-state="${state}"><div><strong>${escapeHtml(row.opponent)}</strong><span>${escapeHtml(highSchoolScheduleLabel(row))}${row.homeAway === "away" ? " · Away" : row.homeAway === "home" ? " · Home" : ""}${row.leagueGame ? " · League" : ""}</span><small>${escapeHtml(row.venue || "Venue TBA")}</small></div><em>${escapeHtml(status)}</em></article>`;
    }).join("");
  }

  async function syncHighSchoolSchedule({automatic=false,force=false} = {}) {
    if (!backend || !workspace || highSchoolScheduleSyncBusy) return;
    await loadGameCatalog();
    if (!isHighSchoolWorkspace()) { renderHighSchoolScheduleStatus(); return; }
    highSchoolScheduleSyncBusy = true;
    const button = $("syncHighSchoolScheduleButton");
    const message = $("highSchoolScheduleSyncMessage");
    if (button) button.disabled = true;
    if (message) message.textContent = automatic ? "Checking the school schedule…" : "Syncing source-backed school games…";
    try {
      await loadHighSchoolScheduleIndex({force});
      if (!highSchoolScheduleGames.length) {
        if (message) message.textContent = "No published schedule exists for this team yet. Nothing was fabricated.";
        return;
      }
      if (!["owner","admin"].includes(workspace.role)) {
        if (message) message.textContent = "The source schedule is visible. A Team Owner or Admin syncs timed games into Game Day.";
        return;
      }
      const synced = new Set(gameDayQueue.map(game => String(game.highSchoolScheduleId || "")).filter(Boolean));
      let created = 0, existing = 0, linked = 0, tba = 0;
      for (const row of highSchoolScheduleGames) {
        if (synced.has(String(row.scheduleId))) { existing += 1; continue; }
        if (!row.scheduledAt) { tba += 1; continue; }
        const {data,error} = await backend.client.rpc("live_sync_high_school_schedule_game_v1", {target_team_id:workspace.teamId,schedule_game:highSchoolScheduleSyncPayload(row)});
        if (error) throw error;
        if (data?.status === "created") created += 1;
        else if (data?.status === "linked_manual") linked += 1;
        else if (data?.status === "existing") existing += 1;
        else if (data?.status === "time_tba") tba += 1;
      }
      await loadGameDayQueue();
      if (message) {
        const parts = [];
        if (created) parts.push(`${created} schedule game${created === 1 ? "" : "s"} added`);
        if (linked) parts.push(`${linked} existing manual game${linked === 1 ? "" : "s"} linked`);
        if (!created && !linked) parts.push("Schedule is already in sync");
        if (tba) parts.push(`${tba} time${tba === 1 ? "" : "s"} still TBA`);
        message.textContent = parts.join(" · ") + ".";
      }
    } catch (error) {
      if (message) message.textContent = error.message || "The high-school schedule could not be synced.";
      if (!automatic) throw error;
    } finally {
      highSchoolScheduleSyncBusy = false;
      if (button) button.disabled = false;
      renderHighSchoolScheduleStatus();
    }
  }

  async function autoSyncHighSchoolSchedule() {
    if (!workspace?.teamId || highSchoolScheduleAutoSyncedTeamId === workspace.teamId) return;
    await loadGameCatalog();
    if (!isHighSchoolWorkspace()) { renderHighSchoolScheduleStatus(); return; }
    highSchoolScheduleAutoSyncedTeamId = workspace.teamId;
    await syncHighSchoolSchedule({automatic:true});
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
      const [clubsResponse,tournamentsResponse,aliasesResponse,highSchoolResponse] = await Promise.all([
        fetch("clubs.json", {cache:"no-store"}),
        fetch("data/tournaments/public-hub.json", {cache:"no-store"}),
        fetch("data/live/team-identity-aliases.json", {cache:"no-store"}),
        fetch("data/live/high-school-directory-v7-61-0.json?v=7.61.0-logo-fix", {cache:"no-store"})
      ]);
      if (highSchoolResponse.ok) highSchoolDirectory = await highSchoolResponse.json();
      if (aliasesResponse.ok) {
        const aliasData = await aliasesResponse.json();
        gameIdentityAliases = new Map((aliasData.clubs || []).map(row => [row.canonicalClubSlug,row]));
      }
      const aliasClubId = clubWorkspace?.clubId || workspace?.clubId || null;
      if (backend && aliasClubId) {
        const {data:aliasRows,error:aliasError} = await backend.client.rpc("live_identity_aliases_for_club_v1", {target_club_id:aliasClubId});
        if (!aliasError && Array.isArray(aliasRows)) persistentIdentityAliases = aliasRows;
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
    const regularOption = $("gameRegularSeasonOption");
    if (regularOption) regularOption.hidden = !isHighSchoolWorkspace();
    const kind = selectedGameKind();
    const tournament = kind === "tournament";
    const friendly = kind === "friendly";
    $("gameTournamentFields").hidden = !tournament;
    $("gameFriendlyFields").hidden = !friendly;
    const other = tournament && $("gameTournamentSelect").value === "__other__";
    $("gameTournamentOtherLabel").hidden = !other;
    updateGameMatchupPreview();
    renderGameDaySafety();
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
        hint.textContent = `Matched to WPI: ${identity.displayName}${squad}. The name you typed is still preserved for reconciliation.`;
        hint.dataset.state = "matched";
      } else if (opponentSourceName) {
        hint.textContent = `Unlisted team — WPI will use “${opponentSourceName}” exactly as entered for this game. No canonical club/team will be created automatically.`;
        hint.dataset.state = "manual";
      } else {
        hint.textContent = "Search WPI suggestions or enter any team name. If it is not listed, just type the name and continue.";
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

  function currentSeasonYears() {
    return String(workspace?.competitiveSeason || "").split(/[^0-9]+/).map(Number).filter(year => year >= 2000 && year <= 2100);
  }

  function renderGameDaySafety() {
    const lock = $("gameTeamLockContext");
    if (lock) lock.innerHTML = `<strong>${escapeHtml(workspace?.teamDisplayLabel || workspace?.teamName || "Current team")}</strong><span>${escapeHtml(workspace?.competitiveSeason || "Current season")} · this game cannot move to another team after scoring begins.</span>`;
    const warning = $("gameDuplicateWarning");
    if (!warning || editingGameDayId) { if (warning) warning.hidden = true; return; }
    let payload = null;
    try { payload = gameDayFormPayload(); } catch (_) { warning.hidden = true; return; }
    const similar = findDuplicateGameDayCandidate(payload);
    warning.hidden = !similar;
    if (similar) warning.innerHTML = `<strong>Possible duplicate already on Game Day</strong><span>${escapeHtml(workspace?.teamDisplayLabel || workspace?.teamName || "Team")} vs ${escapeHtml(similar.opponentName || "Opponent")} · ${escapeHtml(gameDayTimeLabel(similar.scheduledAt) || "time TBD")}. Open/edit the existing game unless this is intentionally a separate matchup.</span>`;
  }

  function findDuplicateGameDayCandidate(payload) {
    if (!payload) return null;
    const requestedOpponent = normalizedGameTeamName(payload.opponentName || payload.opponentSourceName);
    const requestedTournament = normalizedGameTeamName(payload.tournamentName || payload.seriesName || "");
    const requestedTime = payload.scheduledAt ? new Date(payload.scheduledAt).getTime() : NaN;
    return gameDayQueue.find(game => {
      if (!game || String(game.id) === String(editingGameDayId || "") || game.status === "cancelled") return false;
      if ((game.gameKind || "friendly") !== payload.kind) return false;
      const sameCanonicalOpponent = payload.opponentWpiTeamId && game.opponentWpiTeamId && String(payload.opponentWpiTeamId) === String(game.opponentWpiTeamId);
      const sameName = normalizedGameTeamName(game.opponentName || game.opponentSourceName) === requestedOpponent;
      if (!sameCanonicalOpponent && !sameName) return false;
      if (payload.kind === "tournament" && requestedTournament && normalizedGameTeamName(game.tournamentName || game.seriesName || "") !== requestedTournament) return false;
      if (!Number.isFinite(requestedTime) || !game.scheduledAt) return true;
      const existingTime = new Date(game.scheduledAt).getTime();
      return Number.isFinite(existingTime) && Math.abs(existingTime-requestedTime) <= 3 * 60 * 60 * 1000;
    }) || null;
  }

  async function openGameDayDialog(game = null) {
    await loadGameCatalog();
    if (game?.teamId && String(game.teamId) !== String(workspace?.teamId || "")) throw new Error("That game belongs to another team workspace. Switch teams before editing it.");
    editingGameDayId = game?.id || null;
    $("gameDayDialogKicker").textContent = game ? "Edit game" : "Game-Day Hub";
    $("gameDayDialogTitle").textContent = game ? "Update game details" : "Add game";
    $("gameDayDialogHelp").textContent = game
      ? "You can change matchup details until the game starts. Live and completed records are protected from Game-Day Hub rewrites."
      : isHighSchoolWorkspace() ? "Choose Regular season for school schedule games. Tournament and Friendly remain available when needed." : "Choose Tournament or Friendly. Tournament games stay tied to their tournament; Friendly games are stored under a named Scrimmage Weekend.";
    const kind = game?.gameKind === "scrimmage" ? "friendly" : (game?.gameKind || (isHighSchoolWorkspace() ? "regular_season" : "tournament"));
    const kindInput = document.querySelector(`input[name="gameKind"][value="${CSS.escape(kind)}"]`);
    if (kindInput) kindInput.checked = true;
    $("gameOpponentName").value = game?.opponentSourceName || game?.opponentName || "";
    $("gameScheduledAt").value = localDateTimeValue(game?.scheduledAt);
    $("gameVenue").value = game?.venue || "";
    $("gameQuarterLength").value = String(Math.round(Number(game?.quarterLengthSeconds || 420) / 60));
    gameDayDialogTournamentValues(game);
    const existingWeekendName = game?.seriesType === "scrimmage_weekend" ? (game?.seriesName || game?.scrimmageWeekendName || "") : "";
    $("gameScrimmageWeekendNew").value = existingWeekendName && !scrimmageWeekendOptions().some(row => row.name === existingWeekendName) ? existingWeekendName : "";
    populateScrimmageWeekendSelect(existingWeekendName);
    populateGameScorerSelect(game);
    $("gameDayDialogMessage").textContent = "";
    $("saveGameDayButton").textContent = game ? "Save changes" : "Save to Game Day";
    $("saveStartGameDayButton").textContent = "Start game";
    renderGameKindFields();
    updateGameMatchupPreview();
    renderGameDaySafety();
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
    const scrimmageWeekendName = kind === "friendly"
      ? ($("gameScrimmageWeekendSelect").value === "__new__" ? $("gameScrimmageWeekendNew").value.trim() : $("gameScrimmageWeekendSelect").value)
      : null;
    if (!opponentName) throw new Error("Enter the opponent.");
    if (kind === "tournament" && !tournamentName) throw new Error("Choose a tournament or enter an unlisted tournament name.");
    if (kind === "friendly" && !scrimmageWeekendName) throw new Error("Choose an existing Scrimmage Weekend or create a new one so this game has a permanent event record.");
    let scheduledAt = null;
    if (scheduledLocal) {
      const date = new Date(scheduledLocal);
      if (Number.isNaN(date.getTime())) throw new Error("Enter a valid game date and time.");
      const seasonYears = currentSeasonYears();
      if (seasonYears.length && !seasonYears.includes(date.getFullYear())) throw new Error(`That date is outside ${workspace?.competitiveSeason || "the current season"}. Switch to the correct season/team before creating the game.`);
      scheduledAt = date.toISOString();
    }
    return {
      kind,
      opponentName:identity?.displayName || opponentName,
      opponentSourceName:opponentName,
      scheduledAt,
      timezone:isHighSchoolWorkspace() ? "America/Los_Angeles" : (Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"),
      venue:$("gameVenue").value.trim() || null,
      quarterMinutes:Number($("gameQuarterLength").value || 7),
      tournamentName,
      seriesName:kind === "tournament" ? tournamentName : scrimmageWeekendName,
      tournamentPublicId:kind === "tournament" ? (tournamentEntry?.id || null) : null,
      opponentWpiTeamId:opponent?.canonicalTeamId || null,
      opponentWpiClubId:identity?.club?.canonicalClubId || (identity?.club?.slug ? `club-${identity.club.slug}` : null),
      teamLogoUrl:own?.logo || ownIdentity?.club?.logo || workspace?.clubLogoUrl || null,
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
    if (!editingGameDayId) {
      const similar = findDuplicateGameDayCandidate(payload);
      if (similar && !confirm(`A likely duplicate is already on Game Day (${workspace.teamName} vs ${similar.opponentName} · ${gameDayTimeLabel(similar.scheduledAt)}). Only add another record if this is intentionally a separate game.`)) {
        message.textContent = "No duplicate was added. Open the existing Game-Day record instead.";
        return;
      }
    }
    const buttons = [$("saveGameDayButton"),$("saveStartGameDayButton")];
    buttons.forEach(button => button.disabled = true);
    message.textContent = editingGameDayId ? "Saving game and scoring coverage…" : "Saving game and scoring coverage…";
    try {
      const {data:result,error} = await backend.client.rpc("live_save_game_day_v3", {
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
        window.location.assign(liveGameLaunchUrl(gameId));
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
    if (game.gameKind === "regular_season") return game.creationSource === "high_school_schedule" ? "School schedule · source-backed" : "Regular season · manual";
    return game.seriesName ? `Scrimmage weekend · ${game.seriesName}` : "Manual friendly";
  }

  function assignmentDisplay(game) {
    if (game.assignedScorerDisplayName) return game.assignedScorerDisplayName;
    if (game.assignedScorerUserId) return "Assigned scorer";
    return "Unassigned";
  }

  function canUseFollowing() {
    return Boolean(workspace && ["viewer","scorer"].includes(workspace.role));
  }

  function normalizedGender(value) {
    const raw = String(value || "").toLowerCase();
    if (raw.startsWith("m") || raw.includes("boy")) return "boys";
    if (raw.startsWith("f") || raw.includes("girl")) return "girls";
    if (raw.includes("coed") || raw.includes("mixed")) return "coed";
    return raw || "other";
  }

  function renderFollowing() {
    const panel = $("roleHomeFollowingPanel");
    if (!panel) return;
    const enabled = canUseFollowing();
    panel.hidden = !enabled;
    if (!enabled) return;

    const teams = Array.isArray(followingOverview?.teams) ? followingOverview.teams : [];
    const followed = teams.filter(team => team.isFollowing);
    $("followingSummary").textContent = followed.length
      ? `${followed.length} team${followed.length === 1 ? "" : "s"} followed · read-only`
      : "Find a WPI Live team to follow";

    const ageSelect = $("followingAgeFilter");
    if (ageSelect) {
      const selected = ageSelect.value || "all";
      const ages = [...new Set(teams.map(team => String(team.ageGroup || "").trim()).filter(Boolean))].sort((a,b) => Number(a.replace(/\D/g,"")) - Number(b.replace(/\D/g,"")));
      ageSelect.innerHTML = '<option value="all">All ages</option>' + ages.map(age => `<option value="${escapeHtml(age)}">${escapeHtml(age)}</option>`).join("");
      ageSelect.value = ages.includes(selected) ? selected : "all";
    }

    const current = $("followingCurrent");
    if (current) current.innerHTML = followed.length
      ? `<div class="live-follow-current-heading"><strong>Following (${followed.length})</strong><span>Read only</span></div><div class="live-follow-current-chips">${followed.map(team => `<button type="button" data-follow-team="${escapeHtml(team.teamId)}" data-follow-next="false">${escapeHtml(team.teamDisplayLabel || team.teamName || "Team")} <span>×</span></button>`).join("")}</div>`
      : "";

    const query = String($("followingSearch")?.value || "").trim().toLowerCase();
    const age = $("followingAgeFilter")?.value || "all";
    const gender = $("followingGenderFilter")?.value || "all";
    const visible = teams.filter(team => {
      if (team.isMember || team.isFollowing) return false;
      const label = `${team.clubDisplayName || ""} ${team.teamDisplayLabel || ""} ${team.teamName || ""} ${team.ageGroup || ""} ${team.gender || ""}`.toLowerCase();
      return (!query || label.includes(query)) && (age === "all" || String(team.ageGroup || "") === age) && (gender === "all" || normalizedGender(team.gender) === gender);
    });

    if (!teams.length) {
      $("followingTeamList").innerHTML = '<p class="live-empty-state">No additional WPI Live teams are available yet.</p>';
      return;
    }
    $("followingTeamList").innerHTML = visible.length ? visible.map(team => {
      const label = team.teamDisplayLabel || team.teamName || "Team";
      const meta = [team.clubDisplayName, team.ageGroup, normalizedGender(team.gender)==="boys" ? "Boys" : normalizedGender(team.gender)==="girls" ? "Girls" : normalizedGender(team.gender)==="coed" ? "Coed" : null, team.squadLabel].filter(Boolean).join(" · ");
      return `<article class="live-follow-team-row" data-state="available">
        <div><strong>${escapeHtml(label)}</strong><small>${escapeHtml(meta || team.competitiveSeason || "Current season")}</small></div>
        <button type="button" data-follow-team="${escapeHtml(team.teamId)}" data-follow-next="true">Follow</button>
      </article>`;
    }).join("") : '<p class="live-empty-state">No teams match those filters.</p>';
  }

  async function loadFollowing() {
    if (!canUseFollowing()) {
      followingOverview = {teams:[],games:[]};
      renderFollowing();
      return followingOverview;
    }
    followingOverview = await backend.followingOverview();
    renderFollowing();
    renderRoleHome();
    if (workspace?.role === "viewer") await loadGameSeriesArchive();
    return followingOverview;
  }

  async function toggleTeamFollow(teamId, following) {
    if (!teamId || !canUseFollowing()) return;
    const message = $("followingMessage");
    if (message) message.textContent = following ? "Following team…" : "Removing follow…";
    try {
      await backend.setTeamFollow(teamId, following);
      await loadFollowing();
      if (message) message.textContent = following
        ? "Team followed. This is read-only and your permanent team role did not change."
        : "Team removed from Following. Your permanent team memberships were not changed.";
    } catch (error) {
      if (message) message.textContent = error.message || "Following could not be updated.";
    }
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
    const memberGames = gameDayQueue.filter(game => game.status !== "cancelled");
    const followedGames = (Array.isArray(followingOverview?.games) ? followingOverview.games : []).filter(game => game.status !== "cancelled");
    const dedupe = rows => [...new Map(rows.map(game => [String(game.id),game])).values()];
    const allAvailable = supporter ? dedupe([...memberGames,...followedGames]) : memberGames;
    const relationshipTeamOptions = supporter ? supporterRelationshipTeams() : [];
    const gameTeamOptions = supporter ? allAvailable.map(game => ({id:String(game.teamId || workspace.teamId || ""),label:game.teamDisplayLabel || game.teamName || workspace.teamDisplayLabel || workspace.teamName || "Team",ageGroup:game.ageGroup || "",gender:game.gender || ""})) : [];
    const teamOptions = supporter ? [...new Map([...relationshipTeamOptions,...gameTeamOptions].map(team => [team.id,team])).values()].filter(row => row.id) : [];
    const filters = $("roleHomeTeamFilters");
    if (filters) {
      filters.hidden = !(supporter && teamOptions.length > 1);
      if (!filters.hidden) {
        if (roleHomeTeamFilter !== "all" && !teamOptions.some(team => team.id === roleHomeTeamFilter)) roleHomeTeamFilter = "all";
        filters.innerHTML = `<button type="button" data-role-team-filter="all" aria-pressed="${roleHomeTeamFilter === "all"}">All teams</button>${teamOptions.map(team => `<button type="button" data-role-team-filter="${escapeHtml(team.id)}" aria-pressed="${roleHomeTeamFilter === team.id}">${escapeHtml(team.label)}</button>`).join("")}`;
      }
    }
    const available = roleHomeTeamFilter === "all" ? allAvailable : allAvailable.filter(game => String(game.teamId || workspace.teamId || "") === roleHomeTeamFilter);
    const followedOrdered = followedGames.filter(game => roleHomeTeamFilter === "all" || String(game.teamId || "") === roleHomeTeamFilter).slice().sort((a,b) => {
      const rank = value => value === "live" ? 0 : (["setup","scheduled"].includes(value) ? 1 : 2);
      return rank(a.status)-rank(b.status) || (a.status === "final" ? scheduledTime(b)-scheduledTime(a) : scheduledTime(a)-scheduledTime(b));
    });
    const groups = supporter ? [
      {key:"live", title:"Live now", rows:available.filter(game => game.status === "live").sort((a,b) => scheduledTime(a)-scheduledTime(b))},
      {key:"upcoming", title:"Upcoming", rows:available.filter(game => ["setup","scheduled"].includes(game.status)).sort((a,b) => scheduledTime(a)-scheduledTime(b))},
      {key:"final", title:"Recent finals", rows:available.filter(game => game.status === "final").sort((a,b) => scheduledTime(b)-scheduledTime(a)).slice(0,12)}
    ] : [
      {key:"live", title:"Live now", rows:available.filter(game => game.status === "live").sort((a,b) => scheduledTime(a)-scheduledTime(b))},
      {key:"assigned", title:"Assigned to you", rows:available.filter(game => ["setup","scheduled"].includes(game.status) && game.isAssignedToMe).sort((a,b) => scheduledTime(a)-scheduledTime(b))},
      {key:"open", title:"Available to claim", rows:available.filter(game => ["setup","scheduled"].includes(game.status) && !game.assignedScorerUserId).sort((a,b) => scheduledTime(a)-scheduledTime(b))},
      {key:"following", title:"Following · read only", rows:followedOrdered.slice(0,12)}
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
      const relationshipTeam = (followingOverview?.teams || []).find(row => String(row.teamId || "") === String(game.teamId || workspace?.teamId || ""));
      const ownLogo = game.teamLogoUrl || ownIdentity?.team?.logo || ownIdentity?.club?.logo || relationshipTeam?.logoUrl || (String(game.teamId || workspace?.teamId || "") === String(workspace?.teamId || "") ? workspace?.clubLogoUrl : null);
      const score = ["live","final"].includes(game.status) ? `<strong class="live-role-game-score">${escapeHtml(String(game.teamScore ?? 0))}–${escapeHtml(String(game.opponentScore ?? 0))}</strong>` : `<span class="live-role-game-vs">vs</span>`;
      const followingGame = game.followingTeam === true && String(game.teamId || "") !== String(workspace.teamId || "");
      let action = '<span class="live-role-game-waiting">Not started</span>';
      if (followingGame && game.status === "live") action = `<a class="live-primary-link" href="${escapeHtml(teamScopedUrl("live-game.html", {game:game.id,team:game.teamId,follow:1}))}">Follow live</a>`;
      else if (followingGame && game.status === "final") action = `<a class="live-secondary-link" href="${escapeHtml(teamScopedUrl("live-game-recap.html", {game:game.id,team:game.teamId,follow:1}))}">View recap</a>`;
      else if (followingGame) action = '<span class="live-role-game-waiting">Upcoming · read only</span>';
      else if (supporter && game.status === "live") action = `<a class="live-primary-link" href="${escapeHtml(teamScopedUrl("live-game.html", {game:game.id}))}">Follow live</a>`;
      else if (supporter && game.status === "final") action = `<a class="live-secondary-link" href="${escapeHtml(teamScopedUrl("live-game-recap.html", {game:game.id}))}">View recap</a>`;
      else if (supporter) action = '<span class="live-role-game-waiting">Upcoming</span>';
      else if (scorer && game.status === "live") action = `<button type="button" data-role-home-start="${escapeHtml(game.id)}">Open live game</button>`;
      else if (scorer && game.canStart !== false && ["setup","scheduled"].includes(game.status)) action = `<button type="button" data-role-home-start="${escapeHtml(game.id)}">Start game</button>`;
      else if (scorer) action = '<span class="live-role-game-waiting">Assigned elsewhere</span>';
      const coverage = scorer && !followingGame && game.status !== "live"
        ? `<span class="live-role-game-coverage" data-state="${game.isAssignedToMe ? "mine" : (game.assignedScorerUserId ? "assigned" : "open")}">${game.isAssignedToMe ? "Assigned to you" : (game.assignedScorerUserId ? "Assigned" : "Available to claim")}</span>`
        : (followingGame ? '<span class="live-role-game-coverage" data-state="following">Following</span>' : "");
      const seriesLabel = game.seriesName || (game.gameKind === "tournament" ? (game.tournamentName || "Tournament") : "Scrimmage weekend");
      const teamContext = game.teamDisplayLabel || game.teamName || workspace.teamDisplayLabel || workspace.teamName || "Team";
      return `<article class="live-role-game-card" data-role-game-id="${escapeHtml(game.id)}" data-following-game="${followingGame ? "true" : "false"}">
        <div class="live-role-game-team-context"><strong>${escapeHtml(teamContext)}</strong><span>${escapeHtml(seriesLabel)}</span></div>
        <div class="live-role-game-top"><span>${escapeHtml(game.ageGroup || "")}</span><div>${coverage}<span class="live-game-day-status" data-state="${escapeHtml(status.state)}">${escapeHtml(status.label)}</span></div></div>
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
    renderHighSchoolScheduleStatus();
    renderRoleHome();
    const deck = gameDayQueue.filter(game => !["final","cancelled"].includes(game.status));
    const hub = $("dashboardGameDay");
    if (hub) hub.dataset.hasGames = deck.length ? "true" : "false";
    $("gameDayQueueCount").textContent = `${deck.length} game${deck.length === 1 ? "" : "s"} on deck`;
    const assignedCount = deck.filter(game => game.status !== "live" && game.assignedScorerUserId).length;
    const unassignedCount = deck.filter(game => game.status !== "live" && !game.assignedScorerUserId).length;
    $("gameDayQueueSummary").textContent = deck.length
      ? `${assignedCount} assigned · ${unassignedCount} need scorer · live games remain handoff-capable.`
      : isHighSchoolWorkspace() ? "No upcoming games yet. Sync the school schedule or add a regular-season game." : "No upcoming games yet. Add a tournament game or friendly.";
    renderGameDayCoverage(deck);
    if (!deck.length) {
      container.innerHTML = `<div class="live-game-day-empty"><strong>No games on deck</strong><span>${isHighSchoolWorkspace() ? "Sync the published school schedule, or add a regular-season game manually if the schedule is not available yet." : "Add a tournament game even if the official WPI schedule is missing, or create a friendly manually."}</span></div>`;
      return;
    }
    container.innerHTML = deck.map(game => {
      const status = gameDayDisplayStatus(game);
      const canManage = ["owner","admin"].includes(workspace.role) && ["setup","scheduled"].includes(game.status) && !game.startedAt;
      const scorerMayStart = workspace.role === "scorer" && game.canStart !== false;
      const canOpen = game.status === "live" || canManage || scorerMayStart;
      const assignmentName = assignmentDisplay(game);
      const assignmentState = game.isAssignedToMe ? "mine" : (game.assignedScorerUserId ? "assigned" : "unassigned");
      const seriesTitle = game.gameKind === "regular_season" ? "Regular Season" : (game.seriesName || (game.gameKind === "tournament" ? (game.tournamentName || "Tournament") : "Scrimmage weekend"));
      const tournament = `<strong class="live-game-day-tournament">${escapeHtml(seriesTitle)}</strong>`;
      const opponentIdentity = resolveGameDayTeamIdentity(game.opponentSourceName || game.opponentName || "");
      const opponentDisplayName = opponentIdentity?.displayName || game.opponentName;
      const opponentLogo = game.opponentLogoUrl || opponentIdentity?.team?.logo || opponentIdentity?.club?.logo;
      const ownIdentity = resolveGameDayTeamIdentity(game.teamName || workspace.teamName || "");
      const ownDisplayName = ownIdentity?.displayName || game.teamName;
      const relationshipTeam = (followingOverview?.teams || []).find(row => String(row.teamId || "") === String(game.teamId || workspace?.teamId || ""));
      const ownLogo = game.teamLogoUrl || ownIdentity?.team?.logo || ownIdentity?.club?.logo || relationshipTeam?.logoUrl || (String(game.teamId || workspace?.teamId || "") === String(workspace?.teamId || "") ? workspace?.clubLogoUrl : null);
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
    const {data,error} = await backend.client.rpc("live_game_day_queue_v5", {target_team_id:workspace.teamId});
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
    resetSelect(select, groupMeGroups.length ? "Choose a GroupMe" : "Choose team GroupMe");
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
      option.textContent = destination?.groupme_group_name || "Approved team GroupMe";
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
      $("groupMeManagerScope").textContent = "Choose the team GroupMe, select its Score Updates topic, test it, then activate it.";
      $("groupMeGroupHelp").textContent = "Only the Team Owner can choose or change the team GroupMe.";
    } else if (workspace?.role === "admin" && workspace?.canManageGroupMe) {
      $("groupMeManagerScope").textContent = "The Team Owner approved the team GroupMe. You can choose its Score Updates topic, test it and activate it.";
      $("groupMeGroupHelp").textContent = destination?.groupme_group_name
        ? `Owner-approved GroupMe: ${destination.groupme_group_name}`
        : "The Team Owner must approve a team GroupMe before you can continue.";
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


  function scoreDeliveryUsesGroupMe() {
    return scoreDelivery?.mode === "wpi_live_groupme";
  }

  function renderScoreDeliveryMode() {
    const mode = scoreDelivery?.mode || "wpi_live_only";
    document.querySelectorAll('input[name="scoreDeliveryMode"]').forEach(input => {
      input.checked = input.value === mode;
      input.disabled = !scoreDelivery?.canManage;
    });
    const message = $("scoreDeliveryModeMessage");
    if (message) {
      message.textContent = mode === "wpi_live_groupme"
        ? (scoreDelivery?.ready ? "WPI Live + GroupMe is ready. New games use the tested GroupMe route in addition to the WPI supporter feed." : "WPI Live remains available now. Finish GroupMe setup to add external score delivery for new games.")
        : "WPI Live only is ready. Supporters can follow scores, finals and recaps in WPI without any GroupMe setup.";
    }
    const kicker = document.querySelector('#dashboardGroupMe .live-section-kicker');
    if (kicker) kicker.textContent = "Score delivery";
    const heading = document.querySelector('#dashboardGroupMe h2');
    if (heading) heading.textContent = mode === "wpi_live_groupme" ? "WPI Live + GroupMe" : "WPI Live only";
  }

  async function loadScoreDelivery() {
    const {data,error} = await backend.client.rpc("live_team_score_delivery_v1", {target_team_id:workspace.teamId});
    if (error) throw error;
    scoreDelivery = data || scoreDelivery;
    renderScoreDeliveryMode();
    renderGroupMe();
  }

  async function setScoreDeliveryMode(mode) {
    if (!backend || !workspace || !scoreDelivery?.canManage) return;
    const message = $("scoreDeliveryModeMessage");
    if (message) message.textContent = "Saving score-delivery preference…";
    const {data,error} = await backend.client.rpc("live_set_team_score_delivery_mode_v1", {target_team_id:workspace.teamId,requested_mode:mode});
    if (error) {
      if (message) message.textContent = error.message || "Score-delivery preference could not be saved.";
      return;
    }
    scoreDelivery = data || scoreDelivery;
    await loadGameDayQueue().catch(() => {});
    renderScoreDeliveryMode();
    renderGroupMe();
  }

  function renderGroupMe() {
    const canManage = canManageGroupMeSetup();
    const useGroupMe = scoreDeliveryUsesGroupMe();
    $("groupMeAdminPanel").hidden = !canManage || !useGroupMe;
    $("groupMeReadOnly").hidden = canManage && useGroupMe;
    $("groupMeDisplayName").value = destination?.display_name || "WPI Score Updates";
    $("groupMeDeliveryMode").value = "topic";
    $("groupMeEnabled").checked = Boolean(destination?.enabled);
    renderScoreDeliveryMode();

    if (!useGroupMe) {
      $("dashboardDeliveryMetric").textContent = "WPI Live only";
      $("groupMeSetupMessage").textContent = "External GroupMe delivery is optional and currently off for this team.";
      $("groupMeReadOnly").textContent = "WPI Live only · supporters still receive the live score, final and recap inside WPI.";
    } else if (destination) {
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
          ? "Choose the team GroupMe to begin. WPI handles the protected server connection automatically."
          : "The Team Owner must approve a team GroupMe before an Admin can choose its Score Updates topic."
        : "No GroupMe destination is connected yet.";
      $("groupMeReadOnly").textContent = "No GroupMe destination is connected yet.";
    }

    renderGroupMeMode();
    updateGroupMeStatusPill();
    if (!useGroupMe) {
      $("groupMeSetupStatusPill").textContent = "WPI Live only";
      $("groupMeSetupStatusPill").dataset.state = "connected";
    }
    $("groupMeAudit").hidden = !useGroupMe;
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
      $("groupMeDiscoveryMessage").textContent = "Team GroupMe management permission is required.";
      return;
    }
    const group = selectedGroupMeGroup();
    if (!group?.id) {
      groupMeTopics = [];
      populateGroupMeTopics();
      $("groupMeDiscoveryMessage").textContent = workspace?.role === "owner" ? "Choose the team GroupMe first." : "The Team Owner must approve the team GroupMe first.";
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
      $("groupMeDiscoveryMessage").textContent = "Only the Team Owner may choose the team GroupMe.";
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
        ? `Found ${groupMeGroups.length} GroupMe${groupMeGroups.length === 1 ? "" : "s"}. Select the team GroupMe.`
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
      $("groupMeSetupMessage").textContent = "Team GroupMe management permission is required.";
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
      $("groupMeSetupMessage").textContent = "Team GroupMe management permission is required.";
      return;
    }
    const group = selectedGroupMeGroup();
    const topic = selectedGroupMeTopic();
    if (!group?.id || !topic?.id) {
      $("groupMeSetupMessage").textContent = "Choose the team GroupMe and Score Updates topic before testing.";
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

  function organizationName(row) {
    return row?.clubDisplayName || row?.clubName || "Organization";
  }

  function organizationType(row) {
    const value = String(row?.organizationType || "").trim();
    if (value) return value;
    const canonical = String(row?.canonicalWpiClubId || row?.clubCanonicalWpiId || "");
    return canonical.startsWith("school-") ? "high_school" : "club";
  }

  function multiOrganizationAccount() {
    return new Set(teamMemberships.map(team => String(team.clubId || "")).filter(Boolean)).size > 1;
  }

  function teamOptionLabel(team) {
    const label = team.teamDisplayLabel || team.teamName || "Team";
    const organization = organizationName(team);
    return multiOrganizationAccount()
      ? `${organization} · ${label} · ${roleLabel(team.role)}`
      : `${label} · ${roleLabel(team.role)}`;
  }

  function clubOverviewOptionLabel(club) {
    return `${organizationName(club)} · All Teams`;
  }

  function normalizedWorkspaceSearch(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g," ");
  }

  function workspaceMatchesSearch(search, values) {
    if (!search) return true;
    const haystack = normalizedWorkspaceSearch(values.filter(Boolean).join(" "));
    return search.split(" ").every(token => haystack.includes(token));
  }

  function clubWorkspaceById(clubId) {
    return clubWorkspaces.find(club => String(club.clubId || "") === String(clubId || "")) || null;
  }

  function canOpenClubOverviewFor(club) {
    return Boolean(club && ["owner","admin"].includes(club.role));
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
    const searchInput = $("dashboardTeamSearch");
    const count = $("dashboardTeamSearchCount");
    const typeFilter = $("dashboardWorkspaceType");
    if (!wrap || !select) return;
    wrap.hidden = !teamMemberships.length;
    const search = normalizedWorkspaceSearch(teamWorkspaceSearch);
    const organizationIds = [...new Set(teamMemberships.map(team => String(team.clubId || "")).filter(Boolean))];
    const organizationRows = organizationIds.map(clubId => ({
      clubId,
      club:clubWorkspaceById(clubId) || {clubId,clubName:teamMemberships.find(team => String(team.clubId || "") === clubId)?.clubName,clubDisplayName:teamMemberships.find(team => String(team.clubId || "") === clubId)?.clubDisplayName,role:teamMemberships.find(team => String(team.clubId || "") === clubId)?.clubRole},
      teams:teamMemberships.filter(team => String(team.clubId || "") === clubId)
    })).sort((a,b) => organizationName(a.club).localeCompare(organizationName(b.club)));

    const groups = [];
    let visibleChoices = 0;
    organizationRows.forEach(({clubId,club,teams}) => {
      const orgName = organizationName(club);
      if (teamWorkspaceType !== "all" && organizationType(club) !== teamWorkspaceType) return;
      const matchingTeams = teams.filter(team => workspaceMatchesSearch(search,[orgName,team.teamName,team.teamDisplayLabel,team.ageGroup,team.gender,team.squadLabel,roleLabel(team.role)]));
      const overviewMatches = canOpenClubOverviewFor(club) && workspaceMatchesSearch(search,[orgName,"all teams",roleLabel(club.role)]);
      if (!matchingTeams.length && !overviewMatches) return;
      const options = [];
      if (overviewMatches) {
        const selected = clubView && String(clubWorkspace?.clubId || "") === clubId;
        options.push(`<option value="__club__:${escapeHtml(clubId)}"${selected ? " selected" : ""}>${escapeHtml(clubOverviewOptionLabel(club))}</option>`);
        visibleChoices += 1;
      }
      matchingTeams.forEach(team => {
        const selected = !clubView && String(team.teamId) === String(workspace?.teamId);
        options.push(`<option value="${escapeHtml(team.teamId)}"${selected ? " selected" : ""}>${escapeHtml(teamOptionLabel(team))}</option>`);
        visibleChoices += 1;
      });
      groups.push(`<optgroup label="${escapeHtml(orgName)}">${options.join("")}</optgroup>`);
    });

    if (!groups.length) {
      select.innerHTML = '<option value="" selected disabled>No matching workspaces</option>';
      select.disabled = true;
    } else {
      select.innerHTML = groups.join("");
      select.disabled = visibleChoices < 2;
    }
    if (searchInput) {
      searchInput.hidden = teamMemberships.length < 6 && organizationRows.length < 2;
      if (searchInput.value !== teamWorkspaceSearch) searchInput.value = teamWorkspaceSearch;
    }
    if (typeFilter) { typeFilter.hidden = organizationRows.length < 2; if (typeFilter.value !== teamWorkspaceType) typeFilter.value = teamWorkspaceType; }
    if (count) count.textContent = (search || teamWorkspaceType !== "all") ? `${visibleChoices} workspace${visibleChoices === 1 ? "" : "s"} match` : `${visibleChoices} workspace${visibleChoices === 1 ? "" : "s"}`;
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

  function switchTeam(teamId, targetHash = "") {
    if (!teamId) return;
    if (teamId === "__club__" || String(teamId).startsWith("__club__:")) {
      const requestedClubId = String(teamId).startsWith("__club__:") ? String(teamId).slice("__club__:".length) : clubWorkspace?.clubId;
      const targetClub = clubWorkspaceById(requestedClubId) || (String(clubWorkspace?.clubId || "") === String(requestedClubId || "") ? clubWorkspace : null);
      if (!canOpenClubOverviewFor(targetClub)) return;
      const preferredTeam = (workspace?.teamId && String(workspace?.clubId || "") === String(requestedClubId || ""))
        ? workspace.teamId
        : teamMemberships.find(team => String(team.clubId || "") === String(requestedClubId || ""))?.teamId;
      const url = new URL(window.location.href);
      url.searchParams.delete("invite");
      url.searchParams.set("view", "club");
      url.searchParams.set("club", requestedClubId);
      if (preferredTeam) url.searchParams.set("team", preferredTeam);
      url.hash = targetHash || "";
      window.location.assign(url.href);
      return;
    }
    if (String(teamId) === String(workspace?.teamId) && !clubView) {
      if (targetHash) document.getElementById(targetHash)?.scrollIntoView({behavior:"smooth",block:"start"});
      return;
    }
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
    url.hash = targetHash || "";
    window.location.assign(url.href);
  }

  function clubTeamMembership(teamId) {
    return teamMemberships.find(team => String(team.teamId) === String(teamId)) || null;
  }

  function clubRosterMinimum(team) {
    const age = Number(String(team?.ageGroup || "").replace(/\D/g, "")) || 14;
    return age <= 12 ? 6 : 7;
  }

  function clubLaunchRow(teamId) {
    const rows = Array.isArray(clubLaunchReadiness?.teams) ? clubLaunchReadiness.teams : [];
    return rows.find(row => String(row.teamId) === String(teamId)) || null;
  }

  function launchChecklistItems(team) {
    const row = clubLaunchRow(team?.teamId);
    if (!row) {
      return [
        {key:"roster",label:"Roster",ready:Number(team?.rosterPlayerCount || 0) >= clubRosterMinimum(team)},
        {key:"access",label:"Scorer",ready:Number(team?.scorerEligibleCount || 0) >= 1},
        {key:"delivery",label:"Delivery",ready:Boolean(team?.scoreDeliveryReady ?? team?.groupMeReady)}
      ];
    }
    return [
      {key:"profile",label:"Profile",ready:Boolean(row.profileReady)},
      {key:"roster",label:"Roster",ready:Boolean(row.rosterReady)},
      {key:"access",label:"Scorer",ready:Boolean(row.accessReady)},
      {key:"delivery",label:row.scoreDeliveryMode === "wpi_live_groupme" ? "GroupMe" : "WPI Live",ready:Boolean(row.scoreDeliveryReady ?? row.groupMeReady)},
      {key:"lineup",label:"Starters",ready:Boolean(row.defaultLineupReady)}
    ];
  }

  function clubTeamIssues(team) {
    const labels = {profile:"Profile",roster:"Roster",access:"Scorer access",delivery:"Score delivery",groupme:"GroupMe",lineup:"Default starters"};
    return launchChecklistItems(team).filter(item => !item.ready).map(item => labels[item.key] || item.label);
  }

  function clubGameRow(game, {final=false} = {}) {
    const membership = clubTeamMembership(game.teamId);
    const teamLabel = game.teamDisplayLabel || game.teamName || "Team";
    const when = gameDayTimeLabel(game.endedAt || game.scheduledAt);
    const score = final || game.status === "live" ? `<strong>${escapeHtml(String(game.teamScore ?? 0))}–${escapeHtml(String(game.opponentScore ?? 0))}</strong>` : "";
    const scorer = !final && ["setup","scheduled"].includes(game.status)
      ? (game.assignedScorerDisplayName ? `Scorer: ${escapeHtml(game.assignedScorerDisplayName)}` : '<span data-state="attention">Needs scorer</span>')
      : "";
    const href = membership ? teamScopedUrl(final || game.status === "final" ? "live-game-recap.html" : "live-game.html", {game:game.gameId,team:game.teamId}) : null;
    return `<article class="live-club-game-row" data-state="${escapeHtml(game.status || (final ? "final" : "scheduled"))}">
      <div><small>${escapeHtml(teamLabel)}</small><strong>${escapeHtml(game.opponentName || "Opponent")}</strong><span>${escapeHtml(when || "Time TBD")}${game.venue ? ` · ${escapeHtml(game.venue)}` : ""}</span></div>
      <div class="live-club-game-row-meta">${score}${scorer}${href ? `<a href="${escapeHtml(href)}">${game.status === "live" ? "Open game" : final || game.status === "final" ? "View recap" : "View game"}</a>` : ""}</div>
    </article>`;
  }

  function pilotStateLabel(state) {
    return ({observed:"Evidence found",guarded:"Guarded",manual:"Run test",deferred:"Deferred / resilience",external:"External dependency",attention:"Attention",pending:"Not yet observed"})[state] || "Pending";
  }

  function pilotGateDetail(gate) {
    const detail = String(gate?.detail || "");
    return detail || "No evidence recorded yet.";
  }

  function renderClubPilotValidation() {
    const data = clubPilotValidation || {};
    const summary = data.summary || {};
    const gates = Array.isArray(data.gates) ? data.gates : [];
    const teams = Array.isArray(data.teams) ? data.teams : [];
    const opponents = Array.isArray(data.manualOpponents) ? data.manualOpponents : [];
    if ($("pilotMetricTeams")) $("pilotMetricTeams").textContent = String(summary.activeTeamCount ?? "—");
    if ($("pilotMetricGroupMe")) $("pilotMetricGroupMe").textContent = `${Number(summary.testedGroupMeCount || 0)}/${Number(summary.activeTeamCount || 0)}`;
    if ($("pilotMetricConcurrent")) $("pilotMetricConcurrent").textContent = String(summary.concurrentGamePairCount ?? "—");
    if ($("pilotMetricWeekend")) $("pilotMetricWeekend").textContent = String(summary.multiGameEventCount ?? "—");

    const next = gates.find(gate => ["attention","pending","manual"].includes(gate.state));
    const external = gates.find(gate => gate.state === "external");
    const nextBox = $("clubPilotNextTest");
    if (nextBox) {
      if (next) {
        nextBox.dataset.state = next.state || "pending";
        nextBox.innerHTML = `<strong>Next proof: ${escapeHtml(next.title || "Pilot validation")}</strong><span>${escapeHtml(pilotGateDetail(next))}</span>`;
      } else if (external) {
        nextBox.dataset.state = "external";
        nextBox.innerHTML = `<strong>Engineering gates clear · external feed pending</strong><span>${escapeHtml(pilotGateDetail(external))}</span>`;
      } else {
        nextBox.dataset.state = "observed";
        nextBox.innerHTML = `<strong>Engineered evidence is complete</strong><span>No unresolved club-pilot engineering gate is currently blocking the next milestone.</span>`;
      }
    }

    const gateList = $("clubPilotGateList");
    if (gateList) gateList.innerHTML = gates.length ? gates.map(gate => `<article class="live-pilot-gate" data-state="${escapeHtml(gate.state || "pending")}"><span class="live-pilot-gate-mark" aria-hidden="true">${gate.state === "observed" || gate.state === "guarded" ? "✓" : gate.state === "attention" ? "!" : gate.state === "deferred" ? "↷" : "•"}</span><div><strong>${escapeHtml(gate.title || "Pilot gate")}</strong><p>${escapeHtml(pilotGateDetail(gate))}</p></div><em>${escapeHtml(pilotStateLabel(gate.state))}</em></article>`).join("") : '<p class="live-empty-state">Pilot evidence is not available yet.</p>';

    const routes = $("clubPilotTeamRoutes");
    if (routes) routes.innerHTML = teams.length ? teams.map(team => {
      const route = team.groupMeEnabled && team.groupMeTested ? `${team.groupMeGroupName || "GroupMe"} → ${team.groupMeTopicName || "Topic"}` : team.groupMeEnabled ? "Enabled · needs successful test" : "Not active";
      const age = Number(String(team.ageGroup || "").replace(/\D/g,"")) || 14;
      const min = age <= 12 ? 6 : 7;
      const rosterReady = Number(team.rosterPlayerCount || 0) >= min;
      return `<article class="live-pilot-route-row" data-state="${team.groupMeEnabled && team.groupMeTested && rosterReady ? "ready" : "attention"}"><div><strong>${escapeHtml(team.teamDisplayLabel || team.teamName || "Team")}</strong><span>${Number(team.rosterPlayerCount || 0)} roster · ${Number(team.scorerEligibleCount || 0)} scorer-eligible</span></div><small>${escapeHtml(route)}</small></article>`;
    }).join("") : '<p class="live-empty-state">No active club teams found.</p>';

    const manual = $("clubPilotManualOpponents");
    if (manual) manual.innerHTML = opponents.length ? opponents.map(row => `<article class="live-pilot-opponent-row"><div><strong>${escapeHtml(row.opponentName || "Unlisted opponent")}</strong><span>${Number(row.gameCount || 0)} game${Number(row.gameCount || 0) === 1 ? "" : "s"}</span></div><small>Preserved raw · review later, never auto-merged</small></article>`).join("") : '<p class="live-empty-state">No unlisted manual opponents need identity review.</p>';
  }

  async function loadClubPilotValidation() {
    if (!backend || !clubWorkspace?.clubId || !canOpenClubOverview()) return;
    const button = $("refreshClubPilotValidationButton");
    if (button) { button.disabled = true; button.textContent = "Checking…"; }
    try {
      const {data,error} = await backend.client.rpc("live_club_pilot_validation_v1", {target_club_id:clubWorkspace.clubId});
      if (error) throw error;
      clubPilotValidation = data || {};
      renderClubPilotValidation();
    } catch (error) {
      clubPilotValidation = null;
      const gateList = $("clubPilotGateList");
      if (gateList) gateList.innerHTML = `<p class="live-empty-state">Pilot evidence could not load: ${escapeHtml(error.message || "Unknown error")}</p>`;
      const nextBox = $("clubPilotNextTest");
      if (nextBox) { nextBox.dataset.state = "attention"; nextBox.innerHTML = `<strong>Validation data unavailable</strong><span>Apply the current WPI Live Supabase migrations, then refresh.</span>`; }
    } finally {
      if (button) { button.disabled = false; button.textContent = "Refresh"; }
    }
  }

  function clubTeamSearchText(team) {
    return [team.teamDisplayLabel,team.teamName,team.ageGroup,team.gender,team.squadLabel,team.competitiveSeason].filter(Boolean).join(" ").toLowerCase();
  }

  function filteredClubTeams() {
    const teams = Array.isArray(clubWorkspace?.teams) ? clubWorkspace.teams : [];
    const query = String(clubTeamFilters.query || "").trim().toLowerCase();
    return teams.filter(team => {
      const issues = clubTeamIssues(team);
      if (query && !clubTeamSearchText(team).includes(query)) return false;
      if (clubTeamFilters.age !== "all" && String(team.ageGroup || "") !== clubTeamFilters.age) return false;
      if (clubTeamFilters.gender !== "all" && String(team.gender || "") !== clubTeamFilters.gender) return false;
      if (clubTeamFilters.status === "ready" && issues.length) return false;
      if (clubTeamFilters.status === "attention" && !issues.length) return false;
      return true;
    });
  }

  function populateClubTeamFilters() {
    const teams = Array.isArray(clubWorkspace?.teams) ? clubWorkspace.teams : [];
    const age = $("clubTeamAgeFilter");
    if (!age) return;
    const ages = [...new Set(teams.map(team => String(team.ageGroup || "").trim()).filter(Boolean))]
      .sort((a,b) => Number(a.replace(/\D/g,"")) - Number(b.replace(/\D/g,"")));
    const selected = clubTeamFilters.age;
    age.innerHTML = '<option value="all">All ages</option>' + ages.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
    age.value = ages.includes(selected) ? selected : "all";
    clubTeamFilters.age = age.value;
  }

  function renderClubTeamGrid() {
    const allTeams = Array.isArray(clubWorkspace?.teams) ? clubWorkspace.teams : [];
    const teams = filteredClubTeams();
    const summary = $("clubTeamFilterSummary");
    if (summary) summary.textContent = `${teams.length} of ${allTeams.length} active team${allTeams.length === 1 ? "" : "s"}`;
    $("clubTeamGrid").innerHTML = teams.length ? teams.map(team => {
      const issues = clubTeamIssues(team);
      const membership = clubTeamMembership(team.teamId);
      const role = membership?.role ? roleLabel(membership.role) : "Club overview only";
      const launchItems = launchChecklistItems(team);
      const readyCount = launchItems.filter(item => item.ready).length;
      const readyCopy = issues.length ? `Needs attention: ${issues.join(" · ")}` : "Profile, roster, scorer access, GroupMe and default starters are launch-ready.";
      const checklist = launchItems.map(item => `<span data-state="${item.ready ? "ready" : "attention"}">${item.ready ? "✓" : "•"} ${escapeHtml(item.label)}</span>`).join("");
      return `<article class="live-club-team-card" data-state="${issues.length ? "attention" : "ready"}">
        <div class="live-club-team-card-heading"><div><small>${escapeHtml(team.competitiveSeason || "Season")} · ${escapeHtml([team.ageGroup,team.gender,team.squadLabel].filter(Boolean).join(" "))}</small><h3>${escapeHtml(team.teamDisplayLabel || team.teamName)}</h3><span>${escapeHtml(role)}</span></div><em>${issues.length ? `${readyCount}/${launchItems.length} ready` : "Launch ready ✓"}</em></div>
        <div class="live-club-team-stats"><span><strong>${Number(team.rosterPlayerCount || 0)}</strong> roster</span><span><strong>${Number(team.memberCount || 0)}</strong> members</span><span><strong>${Number(team.scorerEligibleCount || 0)}</strong> scorers</span><span><strong>${Number(team.upcomingGameCount || 0)}</strong> upcoming</span></div>
        <div class="live-club-launch-checklist" aria-label="Team launch checklist">${checklist}</div>
        <p>${escapeHtml(readyCopy)}</p>
        <div class="live-club-team-actions">${membership ? `<button type="button" data-club-team-jump="${escapeHtml(team.teamId)}">Open team</button><button type="button" data-club-access-jump="${escapeHtml(team.teamId)}">Manage access</button>` : '<button type="button" disabled>Team membership required</button>'}</div>
      </article>`;
    }).join("") : '<p class="live-empty-state">No club teams match those filters.</p>';
  }

  function personSearchText(person) {
    const memberships = Array.isArray(person.memberships) ? person.memberships : [];
    const follows = Array.isArray(person.follows) ? person.follows : [];
    return [person.displayName,person.email,...memberships.flatMap(row => [row.teamDisplayLabel,row.teamName,row.role]),...follows.flatMap(row => [row.teamDisplayLabel,row.teamName])].filter(Boolean).join(" ").toLowerCase();
  }

  function renderClubPeopleAccess() {
    const metrics = clubOperations?.metrics || {};
    if ($("clubPeopleMetricPeople")) $("clubPeopleMetricPeople").textContent = String(metrics.peopleCount ?? "—");
    if ($("clubPeopleMetricMemberships")) $("clubPeopleMetricMemberships").textContent = String(metrics.membershipCount ?? "—");
    if ($("clubPeopleMetricFollows")) $("clubPeopleMetricFollows").textContent = String(metrics.followerCount ?? "—");
    const query = String(clubPeopleFilter || "").trim().toLowerCase();
    const rows = (Array.isArray(clubOperations?.people) ? clubOperations.people : []).filter(person => !query || personSearchText(person).includes(query));
    const target = $("clubPeopleAccessList");
    if (!target) return;
    target.innerHTML = rows.length ? rows.map(person => {
      const memberships = Array.isArray(person.memberships) ? person.memberships : [];
      const follows = Array.isArray(person.follows) ? person.follows : [];
      const memberChips = memberships.map(row => {
        const allowed = clubTeamMembership(row.teamId);
        const label = `${row.teamDisplayLabel || row.teamName || "Team"} · ${roleLabel(row.role)}`;
        return allowed ? `<button type="button" data-club-access-jump="${escapeHtml(row.teamId)}">${escapeHtml(label)}</button>` : `<span>${escapeHtml(label)}</span>`;
      }).join("");
      const followChips = follows.map(row => `<span data-state="following">Following · ${escapeHtml(row.teamDisplayLabel || row.teamName || "Team")}</span>`).join("");
      return `<article class="live-club-person-row"><div class="live-club-person-identity"><strong>${escapeHtml(person.displayName || person.email || "WPI account")}</strong><small>${escapeHtml(person.email || "")}</small></div><div class="live-club-person-teams">${memberChips || '<span>No permanent team membership</span>'}${followChips}</div></article>`;
    }).join("") : '<p class="live-empty-state">No club people match that search.</p>';
  }

  function renderClubIdentityReview() {
    const rows = Array.isArray(clubOperations?.manualOpponents) ? clubOperations.manualOpponents : [];
    const count = $("clubIdentityReviewCount");
    if (count) count.textContent = `${rows.length} name${rows.length === 1 ? "" : "s"}`;
    const target = $("clubIdentityReviewList");
    if (!target) return;
    target.innerHTML = rows.length ? rows.map(row => {
      const teamLabels = Array.isArray(row.teamLabels) ? row.teamLabels.join(" · ") : "";
      const last = row.lastSeenAt ? new Date(row.lastSeenAt).toLocaleDateString([], {month:"short",day:"numeric",year:"numeric"}) : "Date unavailable";
      const membership = clubTeamMembership(row.lastGameTeamId);
      const path = row.lastGameStatus === "final" ? "live-game-recap.html" : "live-game.html";
      const href = membership && row.lastGameId ? teamScopedUrl(path,{game:row.lastGameId,team:row.lastGameTeamId}) : null;
      return `<article class="live-club-identity-row"><div><strong>${escapeHtml(row.opponentName || "Unlisted opponent")}</strong><span>${Number(row.gameCount || 0)} game${Number(row.gameCount || 0) === 1 ? "" : "s"} · ${escapeHtml(teamLabels || "Club game")} · last seen ${escapeHtml(last)}</span><small>Raw name preserved. Map it only when you know the canonical WPI identity.</small></div><div class="live-club-identity-actions">${href ? `<a href="${escapeHtml(href)}">Review latest game</a>` : ""}<button type="button" data-resolve-opponent="${escapeHtml(row.normalizedName || row.opponentName || "")}">Map to WPI…</button></div></article>`;
    }).join("") : '<p class="live-empty-state">No unlisted manual opponents need identity review.</p>';
  }

  async function loadClubLaunchReadiness() {
    if (!backend || !clubWorkspace?.clubId || !canOpenClubOverview()) return;
    try {
      const {data,error} = await backend.client.rpc("live_club_launch_readiness_v1", {target_club_id:clubWorkspace.clubId});
      if (error) throw error;
      clubLaunchReadiness = data || {summary:{},teams:[]};
    } catch (_) {
      clubLaunchReadiness = {summary:{},teams:[]};
    }
    renderClubTeamGrid();
  }

  function identityCatalogRows() {
    const clubRows = gameCatalogClubs.map(club => ({
      key:`club:${club.canonicalClubId || club.slug}`,
      type:"club",
      label:club.displayName || club.club,
      meta:[club.locationLabel,club.region,"Club only"].filter(Boolean).join(" · "),
      canonicalClubId:club.canonicalClubId || (club.slug ? `club-${club.slug}` : null),
      canonicalTeamId:null,
      logo:club.logo || null
    }));
    const teamRows = gameCatalogTeams.map(team => ({
      key:`team:${team.canonicalTeamId || team.slug}`,
      type:"team",
      label:team.team,
      meta:[team.displayClubName || team.club,team.ageGroup,team.gender || team.group].filter(Boolean).join(" · "),
      canonicalClubId:team.canonicalClubId || gameCatalogClubs.find(club => club.slug === team.clubSlug)?.canonicalClubId || (team.clubSlug ? `club-${team.clubSlug}` : null),
      canonicalTeamId:team.canonicalTeamId || null,
      logo:team.logo || null
    }));
    return [...teamRows,...clubRows];
  }

  function renderIdentityResolutionSearch() {
    const target = $("identityResolutionResults");
    if (!target) return;
    const query = normalizedGameTeamName($("identityResolutionSearch")?.value || identityReviewRawName);
    const tokens = query.split(" ").filter(Boolean);
    const rows = identityCatalogRows().map(row => {
      const haystack = normalizedGameTeamName(`${row.label} ${row.meta}`);
      let score = 0;
      if (query && normalizedGameTeamName(row.label) === query) score += 100;
      if (query && haystack.startsWith(query)) score += 40;
      score += tokens.filter(token => haystack.includes(token)).length * 10;
      if (row.type === "team") score += 2;
      return {...row,score};
    }).filter(row => !query || row.score > 2).sort((a,b) => b.score-a.score || a.label.localeCompare(b.label)).slice(0,24);
    target.innerHTML = rows.length ? rows.map(row => `<button type="button" class="live-identity-result" data-identity-result="${escapeHtml(row.key)}" data-selected="${identityReviewSelection?.key === row.key ? "true" : "false"}"><img src="${escapeHtml(safeGameLogo(row.logo))}" alt=""><span><strong>${escapeHtml(row.label)}</strong><small>${escapeHtml(row.meta || (row.type === "club" ? "WPI club" : "WPI team"))}</small></span><em>${row.type === "club" ? "Club" : "Team"}</em></button>`).join("") : '<p class="live-empty-state">No WPI identities match that search. Leave this opponent unlisted until the directory catches up.</p>';
    const selected = $("identityResolutionSelected");
    if (selected) selected.innerHTML = identityReviewSelection ? `<strong>Selected: ${escapeHtml(identityReviewSelection.label)}</strong><span>${escapeHtml(identityReviewSelection.meta || "WPI identity")}</span>` : '<strong>No WPI identity selected</strong><span>Nothing will change until you explicitly confirm a match.</span>';
    if ($("confirmIdentityResolutionButton")) $("confirmIdentityResolutionButton").disabled = !identityReviewSelection;
  }

  async function openIdentityResolution(rawName) {
    await loadGameCatalog();
    identityReviewRawName = String(rawName || "").trim();
    identityReviewSelection = null;
    const row = (clubOperations?.manualOpponents || []).find(item => String(item.normalizedName || item.opponentName || "") === identityReviewRawName)
      || (clubOperations?.manualOpponents || []).find(item => normalizedGameTeamName(item.opponentName) === normalizedGameTeamName(identityReviewRawName));
    $("identityResolutionRawName").textContent = row?.opponentName || rawName || "Unlisted opponent";
    $("identityResolutionImpact").textContent = row ? `${Number(row.gameCount || 0)} unresolved game${Number(row.gameCount || 0) === 1 ? "" : "s"} in this club will receive the canonical WPI link. The raw opponent name stays unchanged.` : "Matching unresolved games in this club will receive the canonical WPI link. The raw opponent name stays unchanged.";
    $("identityResolutionSearch").value = row?.opponentName || rawName || "";
    $("identityResolutionMessage").textContent = "";
    renderIdentityResolutionSearch();
    $("identityResolutionDialog").showModal();
    window.setTimeout(() => $("identityResolutionSearch").focus(),0);
  }

  async function confirmIdentityResolution() {
    if (!identityReviewSelection || !identityReviewRawName || !clubWorkspace?.clubId) return;
    const button = $("confirmIdentityResolutionButton");
    button.disabled = true;
    $("identityResolutionMessage").textContent = "Saving explicit WPI identity mapping…";
    try {
      const {data,error} = await backend.client.rpc("live_resolve_manual_opponent_v1", {
        target_club_id:clubWorkspace.clubId,
        requested_raw_name:identityReviewRawName,
        requested_wpi_team_id:identityReviewSelection.canonicalTeamId || null,
        requested_wpi_club_id:identityReviewSelection.canonicalClubId || null,
        requested_display_name:identityReviewSelection.label || null
      });
      if (error) throw error;
      $("identityResolutionMessage").textContent = `${Number(data?.updatedGames || 0)} game${Number(data?.updatedGames || 0) === 1 ? "" : "s"} mapped. Raw game labels were preserved.`;
      await Promise.all([loadClubOperations(),loadClubPilotValidation()]);
      window.setTimeout(() => $("identityResolutionDialog").close(),550);
    } catch (error) {
      $("identityResolutionMessage").textContent = error.message || "The WPI identity mapping could not be saved.";
    } finally {
      button.disabled = false;
    }
  }

  async function loadClubOperations() {
    if (!backend || !clubWorkspace?.clubId || !canOpenClubOverview()) return;
    const button = $("refreshClubOperationsButton");
    if (button) { button.disabled = true; button.textContent = "Loading…"; }
    try {
      const {data,error} = await backend.client.rpc("live_club_operations_v1", {target_club_id:clubWorkspace.clubId});
      if (error) throw error;
      clubOperations = data || {metrics:{},people:[],manualOpponents:[]};
      renderClubPeopleAccess();
      renderClubIdentityReview();
    } catch (error) {
      clubOperations = {metrics:{},people:[],manualOpponents:[]};
      if ($("clubPeopleAccessList")) $("clubPeopleAccessList").innerHTML = `<p class="live-empty-state">Club access could not load: ${escapeHtml(error.message || "Unknown error")}</p>`;
      if ($("clubIdentityReviewList")) $("clubIdentityReviewList").innerHTML = `<p class="live-empty-state">Identity review could not load: ${escapeHtml(error.message || "Unknown error")}</p>`;
    } finally {
      if (button) { button.disabled = false; button.textContent = "Refresh"; }
    }
  }

  function suggestedTeamIdentity() {
    const club = String(clubWorkspace?.clubName || workspace?.clubName || "Lamorinda").trim();
    const age = String($("newTeamAgeGroup")?.value || "14U").trim();
    const gender = String($("newTeamGender")?.value || "Boys").trim();
    const squad = String($("newTeamSquad")?.value || "").trim();
    return {fullName:[club,squad,age,gender].filter(Boolean).join(" "),label:[age,gender,squad].filter(Boolean).join(" ")};
  }

  function updateSuggestedTeamIdentity({forceName=false} = {}) {
    const suggestion = suggestedTeamIdentity();
    if ($("newTeamSuggestedName")) $("newTeamSuggestedName").textContent = suggestion.fullName;
    if ($("newTeamSuggestedLabel")) $("newTeamSuggestedLabel").textContent = `Workspace label: ${suggestion.label}`;
    if (forceName || !newTeamNameManuallyEdited) $("newTeamName").value = suggestion.fullName;
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
    const launchReadyCount = Number(clubLaunchReadiness?.summary?.readyTeamCount ?? 0);
    const launchSuffix = Array.isArray(clubLaunchReadiness?.teams) && clubLaunchReadiness.teams.length ? ` · ${launchReadyCount}/${teams.length} launch-ready` : "";
    $("clubOverviewSubtitle").textContent = `${teams.length} active team${teams.length === 1 ? "" : "s"}${launchSuffix} · ${clubWorkspace.region || "club workspace"}`;
    $("clubMetricLive").textContent = String(live.length);
    $("clubMetricUpcoming").textContent = String(upcoming.length);
    $("clubMetricScorer").textContent = String(needsScorer.length);
    $("clubMetricAttention").textContent = String(attentionTeams.length);
    populateClubTeamFilters();
    renderClubTeamGrid();
    $("clubLiveGames").innerHTML = live.length ? live.map(game => clubGameRow(game)).join("") : '<p class="live-empty-state">No club teams are live right now.</p>';
    $("clubUpcomingGames").innerHTML = upcoming.length ? upcoming.slice(0,12).map(game => clubGameRow(game)).join("") : '<p class="live-empty-state">No upcoming games are on deck across the club.</p>';
    $("clubRecentFinals").innerHTML = finals.length ? finals.slice(0,10).map(game => clubGameRow(game,{final:true})).join("") : '<p class="live-empty-state">No recent finals yet.</p>';
  }

  function openCreateTeamDialog() {
    $("newTeamAgeGroup").value = workspace?.ageGroup || "14U";
    if ($("newTeamGender")) $("newTeamGender").value = workspace?.gender || "Boys";
    if ($("newTeamSquad")) $("newTeamSquad").value = "";
    $("newTeamSeason").value = workspace?.competitiveSeason || "2026-2027";
    newTeamNameManuallyEdited = false;
    updateSuggestedTeamIdentity({forceName:true});
    $("createTeamMessage").textContent = "";
    $("createTeamDialog").showModal();
    setTimeout(() => $("newTeamAgeGroup").focus(), 0);
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

    $("teamFollowerCount").textContent = `${teamFollowers.length} follower${teamFollowers.length === 1 ? "" : "s"}`;
    $("teamFollowers").innerHTML = teamFollowers.length ? teamFollowers.map(follower => {
      const sources = Array.isArray(follower.sourceMemberships) ? follower.sourceMemberships : [];
      const sourceCopy = sources.length
        ? sources.map(source => `${source.teamDisplayLabel || "Lamorinda team"} · ${roleLabel(source.role || "viewer")}`).join(" | ")
        : "Read-only Lamorinda following";
      return `<article class="live-access-follower" data-follower-user="${escapeHtml(follower.userId)}">
        <div class="live-access-avatar">${escapeHtml(accessInitials(follower))}</div>
        <div class="live-access-identity"><strong>${escapeHtml(follower.displayName || follower.email || "Follower")}</strong><small>${escapeHtml(follower.email || "")}</small></div>
        <div class="live-access-following-detail"><span>Following · read only</span><small>${escapeHtml(sourceCopy)}</small></div>
      </article>`;
    }).join("") : '<p class="live-empty-state">Nobody is following this team yet.</p>';

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
      teamFollowers = [];
      renderTeamAccess();
      return;
    }
    const [{data, error},followers] = await Promise.all([
      backend.client.rpc("live_list_team_access", {target_team_id:workspace.teamId}),
      backend.listTeamFollowers(workspace.teamId).catch(() => [])
    ]);
    if (error) throw error;
    teamAccess = {members:Array.isArray(data?.members) ? data.members : [], invites:Array.isArray(data?.invites) ? data.invites : []};
    teamFollowers = Array.isArray(followers) ? followers : [];
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
    const profileReady = Boolean(String(workspace?.teamName || "").trim() && String(workspace?.teamDisplayLabel || "").trim() && String(workspace?.ageGroup || "").trim() && String(workspace?.gender || "").trim());
    const rosterMinimum = starterMinimum(workspace?.ageGroup);
    const rosterReady = currentRoster.length >= rosterMinimum;
    const groupMeReady = Boolean(destination?.enabled && destination?.last_test_status === "sent");
    const deliveryReady = scoreDeliveryUsesGroupMe() ? groupMeReady : true;
    const deliveryLabel = scoreDeliveryUsesGroupMe() ? (groupMeReady ? "GroupMe active + tested" : "GroupMe needs setup") : "WPI Live only";
    const permanentMembers = Array.isArray(teamAccess.members) ? teamAccess.members : [];
    const scoringMembers = permanentMembers.filter(member => ["owner","admin","scorer"].includes(member.role));
    const accessReady = ["owner","admin","scorer"].includes(workspace?.role) || scoringMembers.length > 0;
    const lineup = defaultLineupModel();
    const defaultLineupReady = lineup.valid;
    const accessLabel = scoringMembers.length
      ? `${scoringMembers.length} scorer${scoringMembers.length === 1 ? "" : "s"} ready`
      : workspace?.role === "viewer" ? "Supporter only" : `${roleLabel(workspace?.role || "viewer")} ready`;
    const steps = [
      {key:"profile", number:"1", id:"readinessProfile", ready:profileReady, label:profileReady ? "Ready" : "Needs setup", title:"Confirm the team profile", copy:"Confirm the team name, workspace label, age group, gender and squad that belong only to this team.", action:"Complete team profile", target:"dashboardTeamProfile", focus:"teamProfileName"},
      {key:"roster", number:"2", id:"readinessRoster", ready:rosterReady, label:rosterReady ? `${currentRoster.length} players` : `${currentRoster.length}/${rosterMinimum} players`, title:"Build the game-day roster", copy:`Add at least ${rosterMinimum} players so WPI can create a valid starting lineup for ${workspace?.ageGroup || "this team"}.`, action:"Set up roster", target:"dashboardRoster", focus:"takeRosterPhotoButton"},
      {key:"access", number:"3", id:"readinessAccess", ready:accessReady, label:accessLabel, title:"Confirm scoring access", copy:"Make sure an Owner, Admin or permanent Scorer can run game day. Temporary scorer handoff remains available during a game.", action:"Review team access", target:"dashboardTeamAccess", focus:"createInviteButton"},
      {key:"groupme", number:"4", id:"readinessGroupMe", ready:deliveryReady, label:deliveryLabel, title:"Choose score delivery", copy:scoreDeliveryUsesGroupMe() ? "WPI Live is already available. Finish the GroupMe route to add external score updates." : "WPI Live only is a complete delivery mode. GroupMe can be added later if this team uses it.", action:"Review score delivery", target:"dashboardGroupMe", focus:"scoreDeliveryWpiOnly"},
      {key:"lineup", number:"5", id:"readinessLineup", ready:defaultLineupReady, label:defaultLineupReady ? `${lineup.expected} starters` : "Needs starters", title:"Set default starters", copy:`Choose the ${lineup.expected} default starters WPI should preselect at game launch. You can still change them at the pool.`, action:"Set default starters", target:"dashboardRoster", focus:"editDefaultLineupButton"}
    ];
    const readyCount = steps.filter(step => step.ready).length;
    return {steps, readyCount, allReady:readyCount === steps.length, rosterMinimum};
  }

  function focusSetupStep(targetId, focusId) {
    const target = $(targetId);
    if (!target) return;
    const disclosure = target.tagName === "DETAILS" ? target : target.closest("details");
    if (disclosure && !disclosure.open) disclosure.open = true;
    window.requestAnimationFrame(() => {
      target.scrollIntoView({behavior:"smooth", block:"start"});
    });
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
      ? "All reusable team checks are ready"
      : `${readyCount} of ${steps.length} readiness checks complete`;
    $("readinessHeadline").textContent = allReady ? "Game-day ready" : `${steps.length - readyCount} item${steps.length - readyCount === 1 ? "" : "s"} need attention`;

    const score = $("teamReadinessScore");
    score.textContent = allReady ? "Ready ✓" : `${readyCount}/${steps.length} ready`;
    score.dataset.state = allReady ? "ready" : "progress";

    const reusableSetupSteps = steps.filter(step => step.key !== "profile");
    const reusableSetupRemaining = reusableSetupSteps.filter(step => !step.ready).length;
    const setupStatus = $("gameDaySetupStatus");
    if (setupStatus) {
      setupStatus.textContent = reusableSetupRemaining ? `${reusableSetupRemaining} need attention` : "Ready ✓";
      setupStatus.dataset.state = reusableSetupRemaining ? "attention" : "ready";
    }

    const next = steps.find(step => !step.ready);
    const nextCard = $("readinessNextCard");
    const nextButton = $("readinessNextButton");
    const canManage = canManageTeam();
    if (allReady) {
      nextCard.dataset.state = "ready";
      $("readinessNextIcon").textContent = "✓";
      $("readinessNextTitle").textContent = "Everything is ready";
      $("readinessNextCopy").textContent = "Profile, roster, scoring access, score delivery and default starters are ready for this team.";
      nextButton.hidden = false;
      nextButton.disabled = !["owner","admin"].includes(workspace.role);
      nextButton.textContent = ["owner","admin"].includes(workspace.role) ? "Go to Game Day" : "Setup complete";
      nextButton.dataset.mode = "game-day";
      nextButton.dataset.target = "dashboardGameDay";
      delete nextButton.dataset.focus;
      $("readinessLaunchSummary").innerHTML = `<strong>Ready</strong><span>${escapeHtml(workspace.teamName)} has the reusable setup it needs for game day.</span>`;
    } else if (!canManage) {
      nextCard.dataset.state = "waiting";
      $("readinessNextIcon").textContent = "…";
      $("readinessNextTitle").textContent = "Team setup needs attention";
      $("readinessNextCopy").textContent = `A Team Owner or Admin needs to finish ${next?.title?.toLowerCase() || "the remaining setup"}. Your ${roleLabel(workspace.role)} access will update automatically.`;
      nextButton.hidden = true;
      $("readinessLaunchSummary").innerHTML = `<strong>${steps.length - readyCount} item${steps.length - readyCount === 1 ? "" : "s"} remaining</strong><span>Permanent setup changes are managed by a Team Owner or Admin.</span>`;
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
      $("readinessLaunchSummary").innerHTML = `<strong>${steps.length - readyCount} item${steps.length - readyCount === 1 ? "" : "s"} remaining</strong><span>Open the item that needs attention; WPI will update readiness automatically.</span>`;
    }

    const sidebarHelp = document.querySelector(".live-dashboard-sidebar-help span");
    if (sidebarHelp) sidebarHelp.textContent = allReady ? "Game-day ready." : `${steps.length - readyCount} readiness item${steps.length - readyCount === 1 ? "" : "s"} need attention.`;
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
    $("teamProfileDisplayLabel").value = workspace.teamDisplayLabel || workspace.teamName || "";
    $("teamProfileAgeGroup").value = workspace.ageGroup || "14U";
    $("teamProfileGender").value = workspace.gender || "";
    $("teamProfileSquad").value = workspace.squadLabel || "";
    $("teamProfileSeason").value = workspace.competitiveSeason || "2026-2027";
    const editable = canManageTeam();
    ["teamProfileName","teamProfileDisplayLabel","teamProfileAgeGroup","teamProfileGender","teamProfileSquad"].forEach(id => { $(id).disabled = !editable; });
    $("saveTeamProfileButton").hidden = !editable;
    $("teamProfileStatus").textContent = editable ? "Team-specific" : "View only";
    updateReadiness();
  }

  async function saveTeamProfile() {
    if (!canManageTeam()) return;
    const name = $("teamProfileName").value.trim();
    const displayLabel = $("teamProfileDisplayLabel").value.trim();
    const ageGroup = $("teamProfileAgeGroup").value;
    const gender = $("teamProfileGender").value || null;
    const squadLabel = $("teamProfileSquad").value.trim() || null;
    if (!name) { $("teamProfileMessage").textContent = "Enter a team name."; return; }
    $("saveTeamProfileButton").disabled = true;
    $("teamProfileMessage").textContent = "Saving this team's profile…";
    try {
      workspace = await backend.updateTeamProfile({
        teamId:workspace.teamId,
        name,
        displayLabel,
        ageGroup,
        gender,
        squadLabel
      });
      await loadTeamMemberships();
      renderWorkspaceHeader();
      $("teamProfileMessage").textContent = "Team profile saved. Other Lamorinda teams were not changed.";
      renderTeamProfile();
    } catch (error) {
      $("teamProfileMessage").textContent = error.message || "Team profile could not be saved.";
    } finally {
      $("saveTeamProfileButton").disabled = false;
    }
  }

  function formatRosterVersionDate(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString([], {month:"short",day:"numeric",year:"numeric"});
  }

  function renderRosterVersions() {
    const versions = Array.isArray(rosterVersions) ? rosterVersions : [];
    $("rosterHistorySummary").textContent = versions.length ? `${versions.length} saved version${versions.length === 1 ? "" : "s"}` : "Current season history";
    $("rosterVersionList").innerHTML = versions.length ? versions.map(version => {
      const current = String(version.rosterId) === String(workspace?.rosterId);
      const date = formatRosterVersionDate(version.activatedAt || version.createdAt);
      return `<div class="live-roster-version-row" data-current="${current ? "true" : "false"}">
        <div><strong>${escapeHtml(version.competitiveSeason || "Season")} · v${Number(version.versionNumber || 1)}</strong><small>${escapeHtml(date || "Saved roster")} · ${Number(version.playerCount || 0)} player${Number(version.playerCount || 0) === 1 ? "" : "s"}</small></div>
        <span>${current ? "Current" : "Preserved"}</span>
      </div>`;
    }).join("") : '<p class="live-empty-state">No roster versions saved yet.</p>';
  }

  function defaultLineupModel() {
    const selectedIds = new Set((workspace?.defaultLineupPlayerIds || []).map(String));
    const goalieId = String(workspace?.defaultGoalieId || "");
    const selected = currentRoster.filter(player => selectedIds.has(String(player.remoteId)));
    const goalie = currentRoster.find(player => String(player.remoteId) === goalieId) || null;
    const expected = starterMinimum(workspace?.ageGroup);
    const valid = Boolean(goalie && selected.length === expected && selected.some(player => String(player.remoteId) === goalieId));
    return {selected,goalie,expected,valid};
  }

  function renderDefaultLineup() {
    const model = defaultLineupModel();
    const button = $("editDefaultLineupButton");
    if (!currentRoster.length) {
      $("defaultLineupSummary").textContent = "Add players before setting default starters.";
      button.textContent = "Set starters";
      button.disabled = true;
      button.hidden = !canManageTeam();
      return;
    }
    button.hidden = !canManageTeam();
    button.disabled = !canManageTeam() || currentRoster.length < model.expected;
    button.textContent = model.valid ? "Edit starters" : "Set starters";
    if (!model.valid) {
      $("defaultLineupSummary").textContent = `No default lineup set · ${model.expected} starters for ${workspace?.ageGroup || "this team"}.`;
      return;
    }
    const fields = model.selected.filter(player => String(player.remoteId) !== String(model.goalie.remoteId));
    $("defaultLineupSummary").textContent = `Goalie #${model.goalie.cap} ${model.goalie.name} · Field: ${fields.map(player => `#${player.cap} ${player.name}`).join(", ")}`;
  }

  function renderCurrentRoster() {
    const count = currentRoster.length;
    const version = Number(workspace?.rosterVersion || 1);
    const season = workspace?.rosterSeason || workspace?.competitiveSeason || "Current season";
    $("dashboardRosterCount").textContent = `${count} player${count === 1 ? "" : "s"}`;
    $("rosterVersionBadge").textContent = `${season} · v${version}`;
    $("currentRosterHelp").textContent = count
      ? `${workspace?.teamDisplayLabel || workspace?.teamName || "This team"} · latest saved roster auto-loaded.`
      : `${workspace?.teamDisplayLabel || workspace?.teamName || "This team"} · no players saved for ${season} yet.`;
    $("currentRosterList").innerHTML = count ? currentRoster.map(player => `
      <div class="live-current-roster-player">
        <strong>#${escapeHtml(player.cap)}</strong>
        <span>${escapeHtml(player.name)}</span>
      </div>`).join("") : '<p class="live-empty-state">Add a roster by photo, image upload, or manual entry.</p>';
    $("editCurrentRosterButton").hidden = !canManageTeam() || !count;
    renderDefaultLineup();
    renderRosterVersions();
    updateReadiness();
  }

  async function loadRoster() {
    const [players,versions] = await Promise.all([
      backend.loadRoster(workspace.rosterId),
      backend.listRosterVersions(workspace.teamId).catch(() => [])
    ]);
    currentRoster = players || [];
    rosterVersions = versions || [];
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
    $("rosterDraftMessage").textContent = "Saving a new roster version…";
    try {
      const existingByCap = new Map(currentRoster.map(player => [normalizedCap(player.cap), player]));
      const existingByName = new Map(currentRoster.map(player => [String(player.name || "").trim().toLowerCase(), player]));
      const players = validation.rows.map((row,index) => {
        const match = (row.remoteId ? currentRoster.find(player => player.remoteId === row.remoteId) : null)
          || existingByCap.get(normalizedCap(row.cap))
          || existingByName.get(String(row.name || "").trim().toLowerCase());
        return {
          clientPlayerId:match?.id || row.id || uid("player"),
          cap:normalizedCap(row.cap),
          name:cleanedRosterName(row.name),
          sortOrder:index
        };
      });
      workspace = await backend.saveRosterVersion({teamId:workspace.teamId,rosterId:workspace.rosterId,players});
      await loadRoster();
      $("rosterDraftMessage").textContent = `Roster v${Number(workspace.rosterVersion || 1)} saved · ${currentRoster.length} player${currentRoster.length === 1 ? "" : "s"}. Prior versions remain preserved.`;
      setTimeout(() => $("rosterImportDialog").close(), 650);
    } catch (error) {
      $("rosterDraftMessage").textContent = error.message || "Roster could not be saved.";
    } finally {
      $("saveRosterDraftButton").disabled = false;
    }
  }

  function openDefaultLineupDialog() {
    if (!canManageTeam() || !currentRoster.length) return;
    const total = starterMinimum(workspace?.ageGroup);
    const fieldCount = Math.max(1,total-1);
    const model = defaultLineupModel();
    $("defaultLineupHelp").textContent = `Choose one goalie and exactly ${fieldCount} field players for ${workspace?.teamDisplayLabel || workspace?.teamName || "this team"}. WPI will preselect them for the first period.`;
    $("defaultLineupGoalie").innerHTML = `<option value="">Select goalie</option>${currentRoster.map(player => `<option value="${escapeHtml(player.remoteId)}">#${escapeHtml(player.cap)} ${escapeHtml(player.name)}</option>`).join("")}`;
    $("defaultLineupGoalie").value = model.valid ? String(model.goalie.remoteId) : "";
    const selected = new Set((model.valid ? model.selected : []).map(player => String(player.remoteId)));
    const goalieId = String($("defaultLineupGoalie").value || "");
    $("defaultLineupPlayers").innerHTML = currentRoster.map(player => {
      const id = String(player.remoteId);
      const checked = selected.has(id) && id !== goalieId;
      return `<label class="live-default-lineup-player"><input type="checkbox" value="${escapeHtml(id)}"${checked ? " checked" : ""}><span><strong>#${escapeHtml(player.cap)}</strong>${escapeHtml(player.name)}</span></label>`;
    }).join("");
    $("defaultLineupMessage").textContent = "";
    updateDefaultLineupDialog();
    $("defaultLineupDialog").showModal();
  }

  function selectedDefaultFieldIds() {
    return Array.from($("defaultLineupPlayers").querySelectorAll('input[type="checkbox"]:checked')).map(input => input.value);
  }

  function updateDefaultLineupDialog() {
    const goalieId = String($("defaultLineupGoalie").value || "");
    const total = starterMinimum(workspace?.ageGroup);
    const fieldTarget = Math.max(1,total-1);
    $("defaultLineupPlayers").querySelectorAll('input[type="checkbox"]').forEach(input => {
      if (input.value === goalieId) {
        input.checked = false;
        input.disabled = Boolean(goalieId);
      } else {
        input.disabled = false;
      }
    });
    const fields = selectedDefaultFieldIds();
    $("defaultLineupCount").textContent = goalieId
      ? `${fields.length}/${fieldTarget} field players selected · goalie selected`
      : `${fields.length}/${fieldTarget} field players selected · choose a goalie`;
    $("saveDefaultLineupButton").disabled = !goalieId || fields.length !== fieldTarget;
  }

  async function saveDefaultLineup() {
    if (!canManageTeam()) return;
    const goalieId = String($("defaultLineupGoalie").value || "");
    const fieldIds = selectedDefaultFieldIds();
    const total = starterMinimum(workspace?.ageGroup);
    if (!goalieId || fieldIds.length !== total-1) {
      $("defaultLineupMessage").textContent = `Choose one goalie and exactly ${total-1} field players.`;
      return;
    }
    $("saveDefaultLineupButton").disabled = true;
    $("defaultLineupMessage").textContent = "Saving team default starters…";
    try {
      workspace = await backend.setDefaultLineup({
        teamId:workspace.teamId,
        rosterId:workspace.rosterId,
        playerIds:[goalieId,...fieldIds],
        goalieId
      });
      renderDefaultLineup();
      $("defaultLineupMessage").textContent = "Default starters saved for this team only.";
      setTimeout(() => $("defaultLineupDialog").close(), 450);
    } catch (error) {
      $("defaultLineupMessage").textContent = error.message || "Default starters could not be saved.";
      updateDefaultLineupDialog();
    }
  }

  async function clearDefaultLineup() {
    if (!canManageTeam()) return;
    $("clearDefaultLineupButton").disabled = true;
    $("defaultLineupMessage").textContent = "Clearing default starters…";
    try {
      workspace = await backend.setDefaultLineup({teamId:workspace.teamId,rosterId:workspace.rosterId,playerIds:[],goalieId:null});
      renderDefaultLineup();
      $("defaultLineupDialog").close();
    } catch (error) {
      $("defaultLineupMessage").textContent = error.message || "Default starters could not be cleared.";
    } finally {
      $("clearDefaultLineupButton").disabled = false;
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
      $("dashboardSubtitle").textContent = "Follow your team and other Lamorinda teams without changing permanent access. Supporter access is read-only.";
    } else if (workspace.role === "scorer") {
      $("dashboardSubtitle").textContent = "Your assigned games and scoring controls, plus read-only Following for other Lamorinda teams.";
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
        await Promise.all([loadClubPilotValidation(),loadClubOperations(),loadClubLaunchReadiness()]);
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
      await Promise.all([loadGames(), loadGroupMe(), loadScoreDelivery(), loadRoster(), loadFollowing()]);
      updateReadiness();
      await autoSyncTournamentSchedule();
      await autoSyncHighSchoolSchedule();
    } catch (error) {
      $("dashboardConnectionLabel").textContent = "Connected setup needs attention";
      $("dashboardConnectionDetail").textContent = error.message;
    }
  }

  document.querySelectorAll('.live-dashboard-sidebar a[href^="#dashboard"], .live-readiness-item[href^="#dashboard"]').forEach(link => {
    link.addEventListener("click", event => {
      const targetId = String(link.getAttribute("href") || "").replace(/^#/, "");
      if (!targetId) return;
      event.preventDefault();
      history.replaceState(null, "", `#${targetId}`);
      focusSetupStep(targetId, null);
    });
  });

  $("readinessNextButton").addEventListener("click", event => {
    const button = event.currentTarget;
    if (button.dataset.mode === "game-day") {
      focusSetupStep("dashboardGameDay", "addGameDayButton");
      return;
    }
    if (button.dataset.target) focusSetupStep(button.dataset.target, button.dataset.focus || null);
  });

  $("addGameDayButton").addEventListener("click", () => openGameDayDialog().catch(error => { $("dashboardConnectionDetail").textContent = error.message; }));
  $("refreshGameDayButton").addEventListener("click", () => loadGames().then(async () => { await syncTournamentSchedule({automatic:true,force:true}); await syncHighSchoolSchedule({automatic:true,force:true}); }).catch(error => { $("dashboardConnectionDetail").textContent = error.message; }));
  $("refreshGameArchiveButton")?.addEventListener("click", () => loadGameSeriesArchive().catch(error => { $("dashboardConnectionDetail").textContent = error.message; }));
  $("refreshClubPilotValidationButton")?.addEventListener("click", () => loadClubPilotValidation());
  $("refreshClubOperationsButton")?.addEventListener("click", () => Promise.all([loadClubOperations(),loadClubLaunchReadiness()]));
  $("clubTeamSearch")?.addEventListener("input", event => { clubTeamFilters.query = event.target.value || ""; renderClubTeamGrid(); });
  $("clubTeamAgeFilter")?.addEventListener("change", event => { clubTeamFilters.age = event.target.value || "all"; renderClubTeamGrid(); });
  $("clubTeamGenderFilter")?.addEventListener("change", event => { clubTeamFilters.gender = event.target.value || "all"; renderClubTeamGrid(); });
  $("clubTeamStatusFilter")?.addEventListener("change", event => { clubTeamFilters.status = event.target.value || "all"; renderClubTeamGrid(); });
  $("clubPeopleSearch")?.addEventListener("input", event => { clubPeopleFilter = event.target.value || ""; renderClubPeopleAccess(); });
  $("clubAddTeamButton")?.addEventListener("click", openCreateTeamDialog);
  $("newTeamAgeGroup")?.addEventListener("change", () => updateSuggestedTeamIdentity());
  $("newTeamGender")?.addEventListener("change", () => updateSuggestedTeamIdentity());
  $("newTeamSquad")?.addEventListener("input", () => updateSuggestedTeamIdentity());
  $("useSuggestedTeamNameButton")?.addEventListener("click", () => { newTeamNameManuallyEdited=false; updateSuggestedTeamIdentity({forceName:true}); $("newTeamName").focus(); });
  $("gameArchiveSeasonFilter")?.addEventListener("change", event => { gameArchiveSeason = event.target.value || "all"; renderGameSeriesArchive(); });
  $("syncWpiScheduleButton").addEventListener("click", () => syncTournamentSchedule({automatic:false,force:true}).catch(error => { $("wpiScheduleSyncMessage").textContent = error.message || "The WPI schedule could not be synced."; }));
  $("gameKindOptions").addEventListener("change", renderGameKindFields);
  $("gameTournamentSelect").addEventListener("change", renderGameKindFields);
  $("gameOpponentName").addEventListener("input", () => { updateGameMatchupPreview(); renderGameDaySafety(); });
  $("gameOpponentName").addEventListener("change", () => { updateGameMatchupPreview(); renderGameDaySafety(); });
  $("gameScheduledAt")?.addEventListener("change", renderGameDaySafety);
  $("gameTournamentOther")?.addEventListener("input", renderGameDaySafety);
  $("gameScrimmageWeekendSelect")?.addEventListener("change", renderGameDaySafety);
  $("gameScrimmageWeekendNew")?.addEventListener("input", renderGameDaySafety);
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
        .then(() => window.location.assign(liveGameLaunchUrl(gameId)))
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

  $("refreshRoleHomeButton").addEventListener("click", () => Promise.all([loadGames(),loadFollowing()]).catch(error => { $("dashboardConnectionDetail").textContent = error.message; }));
  const followClick = event => {
    const button = event.target.closest("[data-follow-team]");
    if (!button) return;
    const next = button.dataset.followNext === "true";
    button.disabled = true;
    toggleTeamFollow(button.dataset.followTeam, next).finally(() => { button.disabled = false; });
  };
  $("followingTeamList")?.addEventListener("click", followClick);
  $("followingCurrent")?.addEventListener("click", followClick);
  $("followingSearch")?.addEventListener("input", renderFollowing);
  $("followingAgeFilter")?.addEventListener("change", renderFollowing);
  $("followingGenderFilter")?.addEventListener("change", renderFollowing);
  $("roleHomeTeamFilters")?.addEventListener("click", event => {
    const button = event.target.closest("[data-role-team-filter]");
    if (!button) return;
    roleHomeTeamFilter = button.dataset.roleTeamFilter || "all";
    renderRoleHome();
    loadGameSeriesArchive().catch(error => { $("dashboardConnectionDetail").textContent = error.message || "The archive could not switch teams."; });
  });

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
      .then(() => window.location.assign(liveGameLaunchUrl(gameId)))
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
  $("dashboardTeamSearch")?.addEventListener("input", event => { teamWorkspaceSearch = event.target.value || ""; renderTeamSwitcher(); });
  $("dashboardWorkspaceType")?.addEventListener("change", event => { teamWorkspaceType = event.target.value || "all"; renderTeamSwitcher(); });
  $("dashboardTeamSearch")?.addEventListener("keydown", event => { if (event.key === "Escape") { teamWorkspaceSearch = ""; event.target.value = ""; renderTeamSwitcher(); } });
  $("clubOverviewPanel")?.addEventListener("click", event => {
    const resolve = event.target.closest("[data-resolve-opponent]");
    if (resolve) { openIdentityResolution(resolve.dataset.resolveOpponent).catch(error => { $("dashboardConnectionDetail").textContent = error.message || "Identity review could not open."; }); return; }
    const access = event.target.closest("[data-club-access-jump]");
    if (access) { switchTeam(access.dataset.clubAccessJump,"dashboardTeamAccess"); return; }
    const button = event.target.closest("[data-club-team-jump]");
    if (button) switchTeam(button.dataset.clubTeamJump);
  });
  $("createTeamButton").addEventListener("click", openCreateTeamDialog);
  $("confirmCreateTeamButton").addEventListener("click", createAdditionalTeam);
  $("newTeamName").addEventListener("input", () => { newTeamNameManuallyEdited = true; });
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
  $("syncHighSchoolScheduleButton")?.addEventListener("click", () => syncHighSchoolSchedule({force:true}).catch(error => { $("highSchoolScheduleSyncMessage").textContent = error.message; }));
  document.querySelectorAll('input[name="scoreDeliveryMode"]').forEach(input => input.addEventListener("change", event => { if (event.target.checked) setScoreDeliveryMode(event.target.value); }));
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
  $("editDefaultLineupButton").addEventListener("click", openDefaultLineupDialog);
  $("defaultLineupGoalie").addEventListener("change", updateDefaultLineupDialog);
  $("defaultLineupPlayers").addEventListener("change", updateDefaultLineupDialog);
  $("saveDefaultLineupButton").addEventListener("click", saveDefaultLineup);
  $("clearDefaultLineupButton").addEventListener("click", clearDefaultLineup);
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
  $("gameScrimmageWeekendSelect")?.addEventListener("change", renderScrimmageWeekendSelection);
  $("gameSeriesArchive")?.addEventListener("click", event => {
    const button = event.target.closest("[data-merge-series]");
    if (button) openEventMergeDialog(button.dataset.mergeSeries);
  });
  $("confirmEventMergeButton")?.addEventListener("click", mergeEventSeries);
  $("identityResolutionSearch")?.addEventListener("input", () => { identityReviewSelection=null; renderIdentityResolutionSearch(); });
  $("identityResolutionResults")?.addEventListener("click", event => {
    const button = event.target.closest("[data-identity-result]");
    if (!button) return;
    identityReviewSelection = identityCatalogRows().find(row => row.key === button.dataset.identityResult) || null;
    renderIdentityResolutionSearch();
  });
  $("confirmIdentityResolutionButton")?.addEventListener("click", confirmIdentityResolution);

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
