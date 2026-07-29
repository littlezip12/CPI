/* WPI 7.53.6 — connected team directory with canonical club logo resolution */
(() => {
  "use strict";
  const rankings = Array.isArray(window.CPI_RANKINGS) ? window.CPI_RANKINGS : [];
  const clubs = Array.isArray(window.CPI_CLUBS) ? window.CPI_CLUBS : [];
  const joProfiles = window.WPI_JO_PROFILES?.teams || {};
  const fallbackLogo = "assets/logos/cpi-logo-fallback.svg?v=7.53.6";
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
    logo: team.logo || clubBySlug.get(team.clubSlug)?.logo || fallbackLogo,
    rank: Number(team.postRank) || null,
    rating: Number(team.postCPI) || null,
    record: team.latestTournamentRecord || "",
    placement: team.joDivisionFinish ? `${team.joDivision || "JO"} · ${team.joDivisionFinish}${ordinalSuffix(team.joDivisionFinish)}` : "",
    page: team.teamPage || `team.html?team=${encodeURIComponent(team.slug)}`,
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
      logo: team.logo || club?.logo || fallbackLogo,
      rank: null,
      rating: null,
      record: formatRecord(team.recordSummary) || team.record || "",
      placement: [team.division, team.divisionPlaceLabel].filter(Boolean).join(" · "),
      page: team.teamPage || `team.html?team=${encodeURIComponent(team.profileSlug)}`,
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
  records.sort(sortRecords);

  const search = document.getElementById("teamSearch");
  const group = document.getElementById("teamGroupFilter");
  const type = document.getElementById("teamTypeFilter");
  const grid = document.getElementById("teamDirectoryGrid");
  const count = document.getElementById("teamDirectoryCount");
  const loadMore = document.getElementById("teamLoadMore");
  let visible = 48;

  [...new Set(records.map(team => team.group).filter(Boolean))]
    .sort((a,b) => groupOrder.indexOf(a) - groupOrder.indexOf(b))
    .forEach(label => group.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(label)}">${escapeHtml(label)}</option>`));

  const statRanked = document.getElementById("teamsRankedCount");
  const statProfiles = document.getElementById("teamsProfileCount");
  const statClubs = document.getElementById("teamsClubCount");
  const statGroups = document.getElementById("teamsGroupCount");
  if (statRanked) statRanked.textContent = rankings.length.toLocaleString();
  if (statProfiles) statProfiles.textContent = records.length.toLocaleString();
  if (statClubs) statClubs.textContent = new Set(records.map(team => team.clubSlug || normalize(team.club))).size.toLocaleString();
  if (statGroups) statGroups.textContent = new Set(records.map(team => team.group)).size.toLocaleString();

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

  function card(team) {
    const ranking = team.rank ? `#${team.rank}` : "JO profile";
    const rating = team.rating ? `WPI ${team.rating.toFixed(1)}` : "Tournament connected";
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
    const items = filtered();
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
