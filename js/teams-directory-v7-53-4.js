/* WPI 7.55.1 — season-aware connected team directory */
(() => {
  "use strict";
  const rankings = Array.isArray(window.CPI_RANKINGS) ? window.CPI_RANKINGS : [];
  const season = window.WPISeason?.resolve("teams") || { id:"2025-2026", label:"2025–2026", rankingStatus:"final" };
  const finalSeason = window.WPISeason?.get(window.WPI_SEASON_INDEX?.finalRankingSeasonId || "2025-2026") || { id:"2025-2026", label:"2025–2026" };
  const seasonHref = href => window.WPISeason?.withSeason(href, season.id) || href;
  const clubs = Array.isArray(window.CPI_CLUBS) ? window.CPI_CLUBS : [];
  const joProfiles = window.WPI_JO_PROFILES?.teams || {};
  const fallbackLogo = "assets/logos/cpi-logo-fallback.svg?v=7.53.6";
  const FEATURED_LIMIT = 25;
  const FEATURED_MAX_RANK = 50;
  const clubBySlug = new Map(clubs.map(club => [club.slug, club]));
  const groupOrder = ["10U Boys","10U Girls","10U Coed","12U Boys","12U Girls","12U Coed","14U Boys","14U Girls","16U Boys","16U Girls","18U Boys","18U Girls"];
  const escapeHtml = value => String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const normalize = value => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();

  function groupContext(group) {
    const [ageGroup = "", gender = ""] = String(group || "").split(/\s+/, 2);
    return { season: "2026", ageGroup, gender };
  }

  function resolveClubIdentity(team) {
    const resolver = window.CPIIdentity;
    if (!resolver) return null;
    const teamName = team.displayTeamName || team.team || team.clubName || "";
    const resolvedTeam = resolver.resolveTeam?.(teamName, groupContext(team.group));
    if (resolvedTeam?.club) return resolvedTeam.club;
    return resolver.resolveClub?.(team.clubName || "")
      || resolver.resolveClub?.(teamName)
      || null;
  }

  const rankedBySlug = new Map(rankings.map(team => [team.slug, team]));
  const records = rankings.map(team => ({
    slug: team.slug,
    name: team.team,
    group: team.group,
    club: team.displayClubName || team.club,
    clubSlug: team.clubSlug,
    clubKey: team.canonicalClubId || team.clubSlug || normalize(team.displayClubName || team.club),
    logo: team.logo || clubBySlug.get(team.clubSlug)?.logo || fallbackLogo,
    rank: Number(team.postRank) || null,
    rating: Number(team.postCPI) || null,
    record: team.latestTournamentRecord || "",
    placement: team.joDivisionFinish ? `${team.joDivision || "JO"} · ${team.joDivisionFinish}${ordinalSuffix(team.joDivisionFinish)}` : "",
    page: seasonHref(team.teamPage || `team.html?team=${encodeURIComponent(team.slug)}`),
    primaryColor: team.primaryColor || clubBySlug.get(team.clubSlug)?.primaryColor || "#126dff",
    secondaryColor: team.secondaryColor || clubBySlug.get(team.clubSlug)?.secondaryColor || "#2bd7f3",
    source: "ranked"
  }));

  Object.values(joProfiles).forEach(team => {
    if (!team?.profileSlug || rankedBySlug.has(team.profileSlug)) return;
    const duplicate = records.some(item => item.group === team.group && normalize(item.name) === normalize(team.displayTeamName || team.team));
    if (duplicate) return;
    const identityClub = resolveClubIdentity(team);
    const club = clubBySlug.get(team.clubSlug) || clubBySlug.get(identityClub?.slug) || identityClub;
    records.push({
      slug: team.profileSlug,
      name: team.displayTeamName || team.team,
      group: team.group,
      club: club?.displayName || team.clubName || "Tournament team",
      clubSlug: team.clubSlug || club?.slug || "",
      clubKey: team.canonicalClubId || club?.id || team.clubSlug || club?.slug || normalize(club?.displayName || team.clubName),
      logo: team.logo || club?.logo || fallbackLogo,
      rank: null,
      rating: null,
      record: formatRecord(team.recordSummary) || team.record || "",
      placement: [team.division, team.divisionPlaceLabel].filter(Boolean).join(" · "),
      page: seasonHref(team.teamPage || `team.html?team=${encodeURIComponent(team.profileSlug)}`),
      primaryColor: team.primaryColor || club?.primaryColor || "#126dff",
      secondaryColor: team.secondaryColor || club?.secondaryColor || "#2bd7f3",
      source: "tournament"
    });
  });

  function ordinalSuffix(number) {
    const n = Number(number);
    if (!Number.isFinite(n)) return "";
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 13) return "th";
    return ({1:"st",2:"nd",3:"rd"})[n % 10] || "th";
  }
  function formatRecord(record) {
    if (!record || record.games == null) return "";
    const parts = [record.wins ?? 0, record.losses ?? 0];
    if (Number(record.ties || 0) > 0) parts.push(record.ties);
    return parts.join("-");
  }
  function sortRecords(a,b) {
    const ga = groupOrder.indexOf(a.group), gb = groupOrder.indexOf(b.group);
    if (ga !== gb) return (ga < 0 ? 999 : ga) - (gb < 0 ? 999 : gb);
    if ((a.rank || 999) !== (b.rank || 999)) return (a.rank || 999) - (b.rank || 999);
    return a.name.localeCompare(b.name);
  }
  function isoWeekSeed(date = new Date()) {
    const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = utc.getUTCDay() || 7;
    utc.setUTCDate(utc.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
    return `${utc.getUTCFullYear()}-W${String(week).padStart(2,"0")}`;
  }
  function hashScore(value) {
    let hash = 2166136261;
    for (const char of String(value)) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }
  function buildFeaturedRecords(source, seed = isoWeekSeed()) {
    const candidates = source.filter(team => team.source === "ranked" && team.rank && team.rank <= FEATURED_MAX_RANK);
    const grouped = new Map();
    for (const team of candidates) {
      if (!grouped.has(team.group)) grouped.set(team.group, []);
      grouped.get(team.group).push(team);
    }
    for (const [label, items] of grouped) {
      items.sort((a,b) => hashScore(`${seed}|${label}|${a.slug}`) - hashScore(`${seed}|${label}|${b.slug}`));
    }
    const groups = [...grouped.keys()].sort((a,b) => hashScore(`${seed}|${a}`) - hashScore(`${seed}|${b}`));
    const selected = [];
    const usedClubs = new Set();
    let added = true;
    while (selected.length < FEATURED_LIMIT && added) {
      added = false;
      for (const label of groups) {
        const items = grouped.get(label) || [];
        while (items.length) {
          const team = items.shift();
          if (usedClubs.has(team.clubKey)) continue;
          selected.push(team);
          usedClubs.add(team.clubKey);
          added = true;
          break;
        }
        if (selected.length >= FEATURED_LIMIT) break;
      }
    }
    if (selected.length < FEATURED_LIMIT) {
      const fallback = candidates
        .filter(team => !usedClubs.has(team.clubKey))
        .sort((a,b) => hashScore(`${seed}|fallback|${a.slug}`) - hashScore(`${seed}|fallback|${b.slug}`));
      for (const team of fallback) {
        if (usedClubs.has(team.clubKey)) continue;
        selected.push(team);
        usedClubs.add(team.clubKey);
        if (selected.length >= FEATURED_LIMIT) break;
      }
    }
    return selected;
  }
  records.sort(sortRecords);
  const featuredRecords = buildFeaturedRecords(records);

  const search = document.getElementById("teamSearch");
  const group = document.getElementById("teamGroupFilter");
  const type = document.getElementById("teamTypeFilter");
  const grid = document.getElementById("teamDirectoryGrid");
  const count = document.getElementById("teamDirectoryCount");
  const title = document.getElementById("teamDirectoryTitle");
  const eyebrow = document.getElementById("teamDirectoryEyebrow");
  const loadMore = document.getElementById("teamLoadMore");
  let visible = 48;

  [...new Set(records.map(team => team.group).filter(Boolean))]
    .sort((a,b) => groupOrder.indexOf(a) - groupOrder.indexOf(b))
    .forEach(label => group.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(label)}">${escapeHtml(label)}</option>`));

  function filtered() {
    const q = normalize(search.value);
    const selectedGroup = group.value;
    const selectedType = type.value;
    return records.filter(team => {
      if (selectedGroup !== "all" && team.group !== selectedGroup) return false;
      if (selectedType !== "all" && team.source !== selectedType) return false;
      return !q || normalize(`${team.name} ${team.club} ${team.group}`).includes(q);
    });
  }
  function isFeaturedView() {
    return !normalize(search.value) && group.value === "all" && type.value === "all";
  }

  function card(team) {
    const ranking = team.rank
      ? (season.rankingStatus === "final" ? `Final #${team.rank}` : `${finalSeason.label} final #${team.rank}`)
      : "Tournament profile";
    const rating = team.rating
      ? (season.rankingStatus === "final" ? `Final WPI ${team.rating.toFixed(1)}` : `${finalSeason.label} WPI ${team.rating.toFixed(1)}`)
      : "Tournament connected";
    return `<a class="team-directory-card" href="${escapeHtml(team.page)}" style="--team-primary:${escapeHtml(team.primaryColor)};--team-secondary:${escapeHtml(team.secondaryColor)}">
      <div class="team-directory-card-head">
        <img class="team-directory-logo" src="${escapeHtml(team.logo)}" alt="${escapeHtml(team.club)} logo" loading="lazy">
        <span>${escapeHtml(team.group)}</span>
      </div>
      <h3>${escapeHtml(team.name)}</h3>
      <p class="team-directory-club">${escapeHtml(team.club)}</p>
      <div class="team-directory-meta">
        <span>${escapeHtml(ranking)}</span>
        ${team.record ? `<span>${escapeHtml(team.record)}</span>` : ""}
        ${team.placement ? `<span>${escapeHtml(team.placement)}</span>` : ""}
      </div>
      <div class="team-directory-card-footer"><strong>${escapeHtml(rating)}</strong><span>View profile →</span></div>
    </a>`;
  }

  function render(reset=false) {
    if (reset) visible = 48;
    if (isFeaturedView()) {
      eyebrow.textContent = "Featured teams";
      title.textContent = season.rankingStatus === "final" ? "25 final-season teams to explore" : "Team identities with prior-season context";
      count.textContent = `${featuredRecords.length} ${finalSeason.label} final top-50 teams · ${new Set(featuredRecords.map(team => team.clubKey)).size} clubs · rotates weekly`;
      grid.innerHTML = featuredRecords.map(card).join("");
      loadMore.hidden = true;
      return;
    }
    const items = filtered();
    eyebrow.textContent = "Team directory";
    title.textContent = "Search results";
    count.textContent = `${items.length.toLocaleString()} team profile${items.length === 1 ? "" : "s"}`;
    grid.innerHTML = items.length ? items.slice(0,visible).map(card).join("") : `<div class="teams-empty"><h3>No teams matched</h3><p>Try a different club, team name, age group, or profile type.</p></div>`;
    loadMore.hidden = visible >= items.length;
  }

  search.addEventListener("input", () => render(true));
  group.addEventListener("change", () => render(true));
  type.addEventListener("change", () => render(true));
  loadMore.addEventListener("click", () => { visible += 48; render(); });
  if (location.hash === "#team-directory") setTimeout(() => search.focus(), 250);
  render();
})();
