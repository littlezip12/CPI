/*
  WPI Release 6.3 — At-a-Glance Dashboard
  Replaces the old dashboard cards with reusable, data-aware homepage widgets.
*/

(function () {
  function isHome() {
    const page = window.location.pathname.split("/").pop() || "index.html";
    return page === "index.html" || page === "";
  }

  function safe(value, fallback) {
    return value === undefined || value === null || value === "" ? fallback : value;
  }

  async function fetchJson(path) {
    try {
      const res = await fetch(path, { cache: "no-store" });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  function rankingData() {
    return Array.isArray(window.CPI_RANKINGS) ? window.CPI_RANKINGS : [];
  }

  function getTopRanked() {
    const rows = rankingData()
      .filter(row => row && row.team)
      .sort((a, b) => Number(a.postRank || 999) - Number(b.postRank || 999))
      .slice(0, 5);

    if (rows.length) return rows.map(row => ({
      rank: row.postRank || "—",
      title: row.team,
      meta: row.group || "",
      url: row.teamPage || "rankings.html",
      logo: row.logo || ""
    }));

    return [
      { rank: 1, title: "La Jolla United A", meta: "#1 14U Boys", url: "14u-boys.html" },
      { rank: 2, title: "NorCal A", meta: "#2 14U Boys", url: "rankings.html" },
      { rank: 3, title: "Mission A", meta: "#3 14U Boys", url: "rankings.html" },
      { rank: 4, title: "LA Premier A", meta: "#4 14U Boys", url: "rankings.html" },
      { rank: 5, title: "SD Dons A", meta: "#5 14U Boys", url: "rankings.html" }
    ];
  }

  function getBiggestMovers() {
    const rows = rankingData()
      .filter(row => row && row.team)
      .sort((a, b) => Number(b.movement || 0) - Number(a.movement || 0))
      .slice(0, 5);

    if (rows.length) return rows.map(row => ({
      movement: Number(row.movement || 0),
      title: row.team,
      meta: row.group || "",
      url: row.teamPage || "rankings.html",
      logo: row.logo || ""
    }));

    return [
      { movement: 17, title: "Skip A", meta: "14U Boys", url: "rankings.html" },
      { movement: 11, title: "Rancho Tsunami A", meta: "16U Boys", url: "rankings.html" },
      { movement: 11, title: "Devils Gate A", meta: "14U Girls", url: "rankings.html" },
      { movement: 8, title: "Vanguard A", meta: "12U Boys", url: "rankings.html" },
      { movement: 7, title: "South Coast A", meta: "16U Girls", url: "rankings.html" }
    ];
  }

  function getTrendingClubs() {
    const clubs = new Map();

    rankingData().forEach(row => {
      const key = row.clubSlug || row.club || row.displayClubName;
      if (!key) return;

      const current = clubs.get(key) || {
        title: row.displayClubName || row.club || key,
        slug: row.clubSlug || key,
        movement: 0,
        rankedTeams: 0,
        bestRank: 999,
        logo: row.logo || ""
      };

      current.movement += Number(row.movement || 0);
      current.rankedTeams += 1;
      current.bestRank = Math.min(current.bestRank, Number(row.postRank || 999));
      current.logo = current.logo || row.logo || "";

      clubs.set(key, current);
    });

    const rows = Array.from(clubs.values())
      .sort((a, b) => b.movement - a.movement)
      .slice(0, 5);

    if (rows.length) return rows.map(row => ({
      title: row.title,
      movement: row.movement,
      meta: `${row.rankedTeams} ranked team${row.rankedTeams === 1 ? "" : "s"} · Best #${row.bestRank}`,
      url: `club/${row.slug}.html`,
      logo: row.logo
    }));

    return [
      { title: "Skip", movement: 17, meta: "1 ranked team · Best #42", url: "club/skip.html" },
      { title: "Rancho Tsunami", movement: 11, meta: "1 ranked team · Best #15", url: "club/rancho-tsunami.html" },
      { title: "Devils Gate", movement: 11, meta: "1 ranked team · Best #29", url: "club/devils-gate.html" },
      { title: "Vegas Renegades", movement: 11, meta: "1 ranked team · Best #40", url: "club/vegas-renegades.html" },
      { title: "NorCal Aquatics", movement: 10, meta: "3 ranked teams · Best #2", url: "club/norcal.html" }
    ];
  }

  function getUpcoming(config) {
    const configured = config && config.atAGlance && config.atAGlance.cards && config.atAGlance.cards.upcomingTournaments && config.atAGlance.cards.upcomingTournaments.items;
    if (Array.isArray(configured) && configured.length) return configured.slice(0, 5);
    return [
      { date: "Jun 13–15", title: "Junior Olympics", url: "tournaments.html" },
      { date: "Jun 20–22", title: "KAP7 SoCal Invite", url: "tournaments.html" },
      { date: "Jun 27–29", title: "Rose Bowl Classic", url: "tournaments.html" },
      { date: "Jul 11–13", title: "Far Westerns", url: "tournaments.html" },
      { date: "Jul 25–27", title: "Super Finals", url: "tournaments.html" }
    ];
  }

  function removeOldGlanceSections() {
    document.querySelectorAll("section, article, div").forEach(el => {
      const text = (el.textContent || "").trim().toLowerCase();
      if (!text) return;

      const looksLikeOldGlance =
        text.includes("at a glance") ||
        (text.includes("top ranked clubs") && text.includes("biggest movers") && text.includes("upcoming tournaments"));

      if (looksLikeOldGlance && !el.closest(".cpi-at-a-glance") && !el.closest(".cpi-hero-v2")) {
        const section = el.closest("section") || el;
        if (section && section.parentElement) section.remove();
      }
    });
  }

  function findMount() {
    let mount = document.querySelector("#cpi-at-a-glance");
    if (mount) return mount;

    mount = document.createElement("section");
    mount.id = "cpi-at-a-glance";
    mount.className = "cpi-at-a-glance";

    const feed = document.querySelector("#cpi-editorial-feed");
    if (feed) feed.insertAdjacentElement("afterend", mount);
    else {
      const hero = document.querySelector(".cpi-hero-v2");
      if (hero) hero.insertAdjacentElement("afterend", mount);
      else document.body.appendChild(mount);
    }

    return mount;
  }

  function logoMarkup(item) {
    if (!item.logo) return "";
    return `<img class="cpi-glance-logo" src="${item.logo}" alt="">`;
  }

  function renderTopRanked(items) {
    return items.map((item, index) => `
      <a class="cpi-glance-row cpi-glance-ranked-row" href="${safe(item.url, "rankings.html")}">
        <span class="cpi-glance-rank">${safe(item.rank, index + 1)}</span>
        ${logoMarkup(item)}
        <strong>${safe(item.title, "Team TBD")}</strong>
        <em>${safe(item.meta, "")}</em>
      </a>
    `).join("");
  }

  function renderMovers(items) {
    return items.map(item => {
      const movement = Number(item.movement || 0);
      const direction = movement >= 0 ? "up" : "down";
      return `
        <a class="cpi-glance-row cpi-glance-mover-row" href="${safe(item.url, "rankings.html")}">
          <span class="cpi-glance-move ${direction}">${movement >= 0 ? "▲" : "▼"} ${Math.abs(movement)}</span>
          ${logoMarkup(item)}
          <strong>${safe(item.title, "Team TBD")}</strong>
          <em>${safe(item.meta, "")}</em>
        </a>
      `;
    }).join("");
  }

  function renderTrending(items) {
    return items.map(item => `
      <a class="cpi-glance-row cpi-glance-trending-row" href="${safe(item.url, "clubs.html")}">
        <span class="cpi-glance-fire">🔥</span>
        ${logoMarkup(item)}
        <strong>${safe(item.title, "Club TBD")}</strong>
        <em>▲ ${safe(item.movement, 0)}</em>
      </a>
    `).join("");
  }

  function renderUpcoming(items) {
    return items.map(item => `
      <a class="cpi-glance-event-row" href="${safe(item.url, "tournaments.html")}">
        <span>${safe(item.date, "TBD")}</span>
        <strong>${safe(item.title, "Tournament TBD")}</strong>
      </a>
    `).join("");
  }

  function card(title, icon, action, rows) {
    return `
      <article class="cpi-glance-card">
        <div class="cpi-glance-card-head">
          <span class="cpi-glance-icon">${icon}</span>
          <h3>${title}</h3>
          <a href="${safe(action && action.url, "#")}">View All →</a>
        </div>
        <div class="cpi-glance-card-body">${rows}</div>
        <a class="cpi-glance-card-cta" href="${safe(action && action.url, "#")}">${safe(action && action.label, "View More")}</a>
      </article>
    `;
  }

  async function init() {
    if (!isHome()) return;

    const config = await fetchJson("data/homepage.json") || {};
    const cards = config.atAGlance && config.atAGlance.cards ? config.atAGlance.cards : {};
    const title = safe(config.atAGlance && config.atAGlance.title, "At a Glance");

    removeOldGlanceSections();

    const topRanked = getTopRanked();
    const movers = getBiggestMovers();
    const trending = getTrendingClubs();
    const upcoming = getUpcoming(config);

    const mount = findMount();
    mount.innerHTML = `
      <div class="cpi-glance-title">
        <h2>${title}</h2>
      </div>
      <div class="cpi-glance-grid">
        ${card(safe(cards.topRanked && cards.topRanked.title, "Top Ranked Clubs"), safe(cards.topRanked && cards.topRanked.icon, "🏆"), cards.topRanked && cards.topRanked.cta, renderTopRanked(topRanked))}
        ${card(safe(cards.biggestMovers && cards.biggestMovers.title, "Biggest Movers"), safe(cards.biggestMovers && cards.biggestMovers.icon, "📈"), cards.biggestMovers && cards.biggestMovers.cta, renderMovers(movers))}
        ${card(safe(cards.trendingClubs && cards.trendingClubs.title, "Trending Clubs"), safe(cards.trendingClubs && cards.trendingClubs.icon, "🔥"), cards.trendingClubs && cards.trendingClubs.cta, renderTrending(trending))}
        ${card(safe(cards.upcomingTournaments && cards.upcomingTournaments.title, "Upcoming Tournaments"), safe(cards.upcomingTournaments && cards.upcomingTournaments.icon, "📅"), cards.upcomingTournaments && cards.upcomingTournaments.cta, renderUpcoming(upcoming))}
      </div>
    `;

    console.info("WPI At-a-Glance dashboard loaded", {
      topRanked: topRanked.length,
      movers: movers.length,
      trending: trending.length,
      upcoming: upcoming.length
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
