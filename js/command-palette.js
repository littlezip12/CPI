/*
  WPI 7.62.2 — Universal Organization + Team Search
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

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function add(type, title, subtitle, url, keywords, priority) {
    searchIndex.push({
      type: type || "Result",
      title: title || "",
      subtitle: subtitle || "",
      url: url || "#",
      priority: Number(priority || 0),
      keywords: [title, subtitle, ...(keywords || [])].filter(Boolean).join(" ").toLowerCase()
    });
  }

  function organizationTypeLabel(type) {
    return type === "high_school" ? "High School" : "Club";
  }

  async function buildIndex() {
    if (searchIndex.length) return;

    add("Page", "Home", "Water Polo Index front page", makeHref("index.html"), ["wpi"], 100);
    add("Page", "Rankings", "Current WPI youth club rankings", makeHref("rankings.html"), ["top teams"], 100);
    add("Page", "Organizations", "Find clubs, high schools, and teams", makeHref("organizations.html"), ["clubs", "schools", "directory"], 100);
    add("Page", "My Teams", "Follow teams and view WPI Live activity", makeHref("live-following.html"), ["following", "supporter", "live"], 95);
    add("Page", "WPI Live", "Live games, upcoming games, and finals", makeHref("live-following.html"), ["scores", "games"], 95);
    add("Page", "Tournaments", "Tournament recaps and events", makeHref("tournaments.html"), ["recap", "events"], 90);
    add("Page", "Methodology", "How WPI rankings work", makeHref("methodology.html"), ["algorithm"], 80);

    ["12u-boys","12u-girls","14u-boys","14u-girls","16u-boys","16u-girls","18u-boys","18u-girls"].forEach(slug => {
      add("Age Group", slug.replaceAll("-", " ").toUpperCase(), "Age group hub", makeHref(slug + ".html"), [slug], 70);
    });

    const directory = await fetchJson(makeHref("data/live/organization-directory-v7-62-1.json?v=7.62.2"));
    if (directory) {
      const orgs = Array.isArray(directory.organizations) ? directory.organizations : [];
      const teams = Array.isArray(directory.teams) ? directory.teams : [];
      const teamCount = new Map();
      teams.forEach(team => teamCount.set(team.organizationId, (teamCount.get(team.organizationId) || 0) + 1));

      orgs.forEach(org => {
        const count = teamCount.get(org.organizationId) || 0;
        const type = organizationTypeLabel(org.organizationType);
        add(
          type,
          org.name,
          `${type} · ${org.locationLabel || org.region || "WPI organization"} · ${count} team${count === 1 ? "" : "s"}`,
          makeHref(org.profileHref || `organization.html?organization=${encodeURIComponent(org.organizationId)}`),
          [org.shortName, org.slug, org.city, org.state, org.country, org.region, org.organizationType],
          60
        );
      });

      teams.forEach(team => {
        const metadata = team.organizationType === "high_school"
          ? [team.gender, team.squadDescriptor].filter(Boolean).join(" · ")
          : [team.group || [team.ageGroup, team.gender].filter(Boolean).join(" "), team.squadDescriptor].filter(Boolean).join(" · ");
        add(
          "Team",
          `${team.organizationName} · ${team.teamName}`,
          metadata || "WPI team",
          makeHref(team.teamHubHref || team.profileHref || "organizations.html"),
          [team.teamName, team.organizationName, team.ageGroup, team.gender, team.squadDescriptor, team.group, team.familyKey, ...(team.aliases || [])],
          50
        );
      });
    }

    const tournaments = window.CPI_TOURNAMENTS || [];
    tournaments.forEach(t => {
      add("Tournament", t.name || t.title, t.date || t.location || "Tournament", makeHref(t.url || "tournaments.html"), [t.location, t.tier], 40);
    });
  }

  function ensurePalette() {
    if (document.querySelector(".cpi-command-overlay")) return;

    document.body.insertAdjacentHTML("beforeend", `
      <div class="cpi-command-overlay" role="dialog" aria-modal="true" aria-label="Search WPI">
        <div class="cpi-command">
          <div class="cpi-command-top">
            <span class="cpi-command-icon">⌘K</span>
            <input class="cpi-command-input" type="search" placeholder="Search teams, clubs, high schools..." autocomplete="off">
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

  function score(item, q, parts) {
    if (!q) return item.priority;
    const title = item.title.toLowerCase();
    let value = item.priority;
    if (title === q) value += 500;
    else if (title.startsWith(q)) value += 300;
    else if (title.includes(q)) value += 150;
    parts.forEach(part => {
      if (title.includes(part)) value += 30;
    });
    return value;
  }

  function getResults() {
    const q = query();
    if (!q) return searchIndex.slice().sort((a, b) => b.priority - a.priority).slice(0, 12);
    const parts = q.split(/\s+/).filter(Boolean);
    return searchIndex
      .filter(item => parts.every(part => item.keywords.includes(part)))
      .map(item => ({ item, score: score(item, q, parts) }))
      .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
      .slice(0, 12)
      .map(entry => entry.item);
  }

  function renderResults() {
    const results = getResults();
    const box = document.querySelector(".cpi-command-results");
    if (!box) return;

    activeIndex = Math.min(activeIndex, Math.max(results.length - 1, 0));

    if (!results.length) {
      box.innerHTML = '<div class="cpi-command-empty">No teams, clubs, high schools, or pages match that search.</div>';
      return;
    }

    box.innerHTML = results.map((item, i) => `
      <a class="cpi-command-result ${i === activeIndex ? "is-active" : ""}" href="${esc(item.url)}">
        <span class="cpi-command-type">${esc(item.type)}</span>
        <span class="cpi-command-main">
          <strong>${esc(item.title)}</strong>
          <em>${esc(item.subtitle)}</em>
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
