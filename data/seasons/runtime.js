(() => {
  "use strict";
  const index = {"schemaVersion":1,"release":"7.55.1","model":"competitive_year_range","displayConvention":"startYear–endYear","activeSeasonId":"2026-2027","finalRankingSeasonId":"2025-2026","pageDefaults":{"rankings":"2025-2026","teams":"2025-2026","team":"2025-2026","clubs":"2025-2026","club":"2025-2026","tournaments":"2025-2026"},"seasons":[{"id":"2026-2027","label":"2026–2027","status":"active","startDate":"2026-10-03","endDate":null,"openingEventId":"2026-evan-cousineau-memorial-cup","rankingStatus":"results_gathering","publicRankingLabel":"Results gathering in progress","manifestPath":"data/seasons/2026-2027/manifest.json","rankingsPath":null,"clubsPath":null},{"id":"2025-2026","label":"2025–2026","status":"final","startDate":"2025-10-04","endDate":"2026-08-02","openingEventId":"2025-evan-cousineau-memorial-cup","closingEventId":"2026-junior-olympics","rankingStatus":"final","publicRankingLabel":"2025–2026 Final Rankings","manifestPath":"data/seasons/2025-2026/manifest.json","rankingsPath":"data/seasons/2025-2026/rankings.json","clubsPath":"data/seasons/2025-2026/clubs.json","teamsPath":"data/seasons/2025-2026/teams.json","tournamentsPath":"data/seasons/2025-2026/tournaments.json"}]};
  const aliases = new Map(index.seasons.map(season => [season.id, season]));
  const pageName = () => {
    const name = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/,'');
    return name || 'index';
  };
  const defaultSeasonId = (page = pageName()) => index.pageDefaults[page] || index.finalRankingSeasonId;
  const resolve = (page = pageName()) => {
    const requested = new URLSearchParams(location.search).get('season');
    return aliases.get(requested) || aliases.get(defaultSeasonId(page)) || index.seasons[0];
  };
  const withSeason = (href, seasonId = resolve().id) => {
    if (!href || href.startsWith('#') || /^(?:https?:|mailto:|tel:)/i.test(href)) return href;
    const [raw, hash = ''] = href.split('#', 2);
    const base = new URL(raw, location.href);
    base.searchParams.set('season', seasonId);
    const relative = `${base.pathname.split('/').pop()}${base.search}`;
    return hash ? `${relative}#${hash}` : relative;
  };
  window.WPI_SEASON_INDEX = index;
  window.WPISeason = { index, pageName, defaultSeasonId, resolve, withSeason, get: id => aliases.get(id) || null };
})();
