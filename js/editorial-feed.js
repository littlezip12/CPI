/*
  WPI Release 6.2 — Editorial Homepage Feed
  Replaces old middle homepage content with a cleaner publication-style feed.
*/

(function () {
  const FALLBACK = {
    editorialFeed: {
      sections: []
    }
  };

  function isHome() {
    const page = window.location.pathname.split("/").pop() || "index.html";
    return page === "index.html" || page === "";
  }

  function safe(value, fallback) {
    return value === undefined || value === null || value === "" ? fallback : value;
  }

  async function loadConfig() {
    try {
      const response = await fetch("data/homepage.json", { cache: "no-store" });
      if (!response.ok) throw new Error("homepage.json not found");
      return await response.json();
    } catch (error) {
      console.warn("WPI Editorial Feed: using fallback config.", error);
      return FALLBACK;
    }
  }

  function removeOldHomepageSections() {
    const candidates = [
      ".weekend-recap",
      ".stories-worth-celebrating",
      ".featured-group",
      ".trending-clubs",
      ".upcoming-tournaments",
      ".home-modules",
      ".home-grid",
      ".content-grid",
      ".homepage-grid",
      ".photo-module"
    ];

    candidates.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (!el.closest(".cpi-hero-v2")) el.remove();
      });
    });

    document.querySelectorAll("section, article").forEach(el => {
      const text = (el.textContent || "").trim().toLowerCase();
      if (
        text.includes("weekend recap") ||
        text.includes("stories worth celebrating") ||
        text.includes("featured group") ||
        text.includes("upcoming tournaments")
      ) {
        if (!el.closest(".cpi-hero-v2") && !el.closest(".cpi-editorial-feed")) el.remove();
      }
    });
  }

  function findMount() {
    let mount = document.querySelector("#cpi-editorial-feed");
    if (mount) return mount;

    mount = document.createElement("main");
    mount.id = "cpi-editorial-feed";
    mount.className = "cpi-editorial-feed";

    const hero = document.querySelector(".cpi-hero-v2");
    if (hero) hero.insertAdjacentElement("afterend", mount);
    else {
      const main = document.querySelector("main");
      if (main) main.insertAdjacentElement("afterbegin", mount);
      else document.body.appendChild(mount);
    }

    return mount;
  }

  function renderWeekendRecap(section) {
    const image = safe(section.image, "assets/photos/editorial/polo-team-photo.jpg");
    const cta = section.cta || {};
    return `
      <section class="cpi-feed-recap">
        <div class="cpi-feed-recap-copy">
          <span>${safe(section.eyebrow, "Weekend Recap")}</span>
          <h2>${safe(section.title, "This Week in California Polo")}</h2>
          <p>${safe(section.summary, "The latest WPI update brings new movement, new storylines, and new clubs to watch.")}</p>
          <a href="${safe(cta.url, "tournaments.html")}">${safe(cta.label, "View Full Recap")} →</a>
        </div>
        <div class="cpi-feed-recap-image">
          <img src="${image}" alt="${safe(section.title, "Weekend recap")}">
        </div>
      </section>
    `;
  }

  function renderStoryGrid(section) {
    const items = Array.isArray(section.items) ? section.items : [];
    const cta = section.cta || {};
    const cards = items.map(item => `
      <a class="cpi-feed-story-card" href="${safe(item.url, "tournaments.html")}">
        <img src="${safe(item.image, "assets/photos/editorial/polo-attacker-poolwide.jpg")}" alt="${safe(item.title, "WPI story")}">
        <div>
          <span>${safe(item.category, "Story")}</span>
          <h3>${safe(item.title, "WPI Story")}</h3>
          <p>${safe(item.summary, "Follow the latest WPI movement and California water polo storylines.")}</p>
          <small>${safe(item.meta, "2 min read")}</small>
        </div>
      </a>
    `).join("");

    return `
      <section class="cpi-feed-stories">
        <div class="cpi-feed-section-title">
          <h2>${safe(section.title, "Stories Worth Following")}</h2>
          <a href="${safe(cta.url, "tournaments.html")}">${safe(cta.label, "View All Stories")} →</a>
        </div>
        <div class="cpi-feed-story-grid">${cards}</div>
      </section>
    `;
  }

  function renderSection(section) {
    if (!section || !section.type) return "";
    if (section.type === "weekendRecap") return renderWeekendRecap(section);
    if (section.type === "storyGrid") return renderStoryGrid(section);
    return "";
  }

  async function init() {
    if (!isHome()) return;

    const config = await loadConfig();
    const feed = config.editorialFeed || FALLBACK.editorialFeed;
    const sections = Array.isArray(feed.sections) ? feed.sections : [];

    removeOldHomepageSections();

    const mount = findMount();
    mount.innerHTML = sections.map(renderSection).join("");

    console.info("WPI Editorial Feed loaded", { sections: sections.length });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
