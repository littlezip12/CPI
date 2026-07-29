/*
  WPI 5.3C — Command Palette Search
  Opens with Cmd+K / Ctrl+K or by clicking Search WPI.
*/
(function () {
  let searchIndex = [];
  let activeIndex = 0;

  async function fetchJson(path) {
    try {
      const res = await fetch(path, { cache: "no-store" });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  function paletteScriptUrl() {
    const scripts = Array.from(document.scripts);
    const script = document.currentScript || scripts.find(item => /\/js\/command-palette\.js(?:\?|$)/.test(item.src));
    return script ? new URL(script.src, window.location.href) : new URL("js/command-palette.js", window.location.href);
  }

  const siteRoot = new URL("../", paletteScriptUrl());

  function makeHref(path) {
    if (/^(?:https?:|mailto:|tel:|#)/.test(path)) return path;
    return new URL(path, siteRoot).href;
  }

  function add(type, title, subtitle, url, keywords) {
    searchIndex.push({
      type: type || "Result",
      title: title || "",
      subtitle: subtitle || "",
      url: url || "#",
      keywords: [title, subtitle, ...(keywords || [])].filter(Boolean).join(" ").toLowerCase()
    });
  }

  async function buildIndex() {
    if (searchIndex.length) return;

    add("Page", "Home", "Water Polo Index front page", makeHref("index.html"), ["wpi", "cpi"]);
    add("Page", "Rankings", "Current WPI rankings", makeHref("rankings.html"), ["top 25 teams"]);
    add("Page", "Clubs", "Club intelligence and profiles", makeHref("clubs.html"), ["club profiles"]);
    add("Page", "Tournaments", "Tournament recaps and events", makeHref("tournaments.html"), ["recap"]);
    add("Page", "Methodology", "How WPI rankings work", makeHref("methodology.html"), ["algorithm"]);
    ["12u-boys","12u-girls","14u-boys","14u-girls","16u-boys","16u-girls","18u-boys","18u-girls"].forEach(slug => {
      add("Age Group", slug.replaceAll("-", " ").toUpperCase(), "Age group hub", makeHref(slug + ".html"), [slug]);
    });

    const clubIntel = await fetchJson(makeHref("data/club-intelligence.json"));
    if (clubIntel && clubIntel.clubs) {
      Object.values(clubIntel.clubs).forEach(club => {
        add("Club", club.displayName, `${club.rankedTeams || 0} ranked teams · best rank #${club.bestRank || "—"}`, makeHref(`club.html?club=${encodeURIComponent(club.slug)}`), [club.region, club.slug]);
        (club.teams || []).forEach(team => {
          add("Team", team.team, `${team.group || team.ageGroup || "Team"} · #${team.rank || "—"} · ${team.cpi || "—"} WPI`, makeHref(team.page || "rankings.html"), [club.displayName, team.group, team.latestTournament, team.record]);
        });
      });
    }

    const rankings = window.CPI_RANKINGS || [];
    rankings.forEach(team => {
      if (!team.team) return;
      add("Team", team.team, `${team.group || ""} · #${team.postRank || "—"} · ${team.club || ""}`, makeHref(team.teamPage || "rankings.html"), [team.club, team.group, team.latestTournament]);
    });

    const tournaments = window.CPI_TOURNAMENTS || [];
    tournaments.forEach(t => {
      add("Tournament", t.name || t.title, t.date || t.location || "Tournament", makeHref(t.url || "tournaments.html"), [t.location, t.tier]);
    });
  }

  function ensurePalette() {
    if (document.querySelector(".cpi-command-overlay")) return;

    document.body.insertAdjacentHTML("beforeend", `
      <div class="cpi-command-overlay" role="dialog" aria-modal="true" aria-label="Search WPI">
        <div class="cpi-command">
          <div class="cpi-command-top">
            <span class="cpi-command-icon">⌘K</span>
            <input class="cpi-command-input" type="search" placeholder="Search clubs, teams, rankings..." autocomplete="off">
            <button class="cpi-command-close" type="button" aria-label="Close">×</button>
          </div>
          <div class="cpi-command-results"></div>
          <div class="cpi-command-help">
            <span>↑↓ Navigate</span>
            <span>Enter Open</span>
            <span>Esc Close</span>
          </div>
        </div>
      </div>
    `);

    document.querySelector(".cpi-command-close").addEventListener("click", closePalette);
    document.querySelector(".cpi-command-input").addEventListener("input", () => { activeIndex = 0; renderResults(); });
    document.querySelector(".cpi-command-input").addEventListener("keydown", onKeyDown);
    document.querySelector(".cpi-command-overlay").addEventListener("click", e => {
      if (e.target.classList.contains("cpi-command-overlay")) closePalette();
    });
  }

  function query() {
    const input = document.querySelector(".cpi-command-input");
    return input ? input.value.trim().toLowerCase() : "";
  }

  function getResults() {
    const q = query();
    if (!q) return searchIndex.slice(0, 12);
    const parts = q.split(/\s+/);
    return searchIndex.filter(item => parts.every(part => item.keywords.includes(part))).slice(0, 12);
  }

  function renderResults() {
    const results = getResults();
    const box = document.querySelector(".cpi-command-results");
    if (!box) return;

    activeIndex = Math.min(activeIndex, Math.max(results.length - 1, 0));

    if (!results.length) {
      box.innerHTML = '<div class="cpi-command-empty">No results found.</div>';
      return;
    }

    box.innerHTML = results.map((item, i) => `
      <a class="cpi-command-result ${i === activeIndex ? "is-active" : ""}" href="${item.url}">
        <span class="cpi-command-type">${item.type}</span>
        <span class="cpi-command-main">
          <strong>${item.title}</strong>
          <em>${item.subtitle}</em>
        </span>
        <span class="cpi-command-arrow">↵</span>
      </a>
    `).join("");
  }

  function onKeyDown(e) {
    const results = getResults();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, results.length - 1);
      renderResults();
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      renderResults();
    }
    if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      window.location.href = results[activeIndex].url;
    }
    if (e.key === "Escape") closePalette();
  }

  async function openPalette() {
    await buildIndex();
    ensurePalette();
    activeIndex = 0;
    document.body.classList.add("cpi-command-open");
    document.querySelector(".cpi-command-overlay").classList.add("is-open");
    const input = document.querySelector(".cpi-command-input");
    input.value = "";
    renderResults();
    setTimeout(() => input.focus(), 0);
  }

  function closePalette() {
    const overlay = document.querySelector(".cpi-command-overlay");
    if (overlay) overlay.classList.remove("is-open");
    document.body.classList.remove("cpi-command-open");
  }

  function installTriggers() {
    document.addEventListener("keydown", e => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const hotkey = isMac ? e.metaKey && e.key.toLowerCase() === "k" : e.ctrlKey && e.key.toLowerCase() === "k";
      if (hotkey) {
        e.preventDefault();
        openPalette();
      }
    });

    document.addEventListener("click", e => {
      const button = e.target.closest(".cpi-shell-search");
      if (button) {
        e.preventDefault();
        openPalette();
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installTriggers);
  else installTriggers();
})();
