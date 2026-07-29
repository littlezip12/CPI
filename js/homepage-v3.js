
(function () {
  let config = {};
  let heroIndex = 0;
  let heroTimer = null;

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

  function rankings() {
    return Array.isArray(window.CPI_RANKINGS) ? window.CPI_RANKINGS : [];
  }

  function header() {
    return `
      <header class="cpi-v3-header">
        <div class="cpi-v3-header-inner">
          <a class="cpi-v3-brand" href="index.html">
            <span>WPI</span>
            <div><strong>Water Polo Index</strong><em>Ranked. Respected. Earned.</em></div>
          </a>
          <nav class="cpi-v3-nav">
            <a href="index.html">Home</a><a href="rankings.html">Rankings</a><a href="clubs.html">Clubs</a><a href="tournaments.html">Tournaments</a><a href="methodology.html">Methodology</a>
          </nav>
          <button class="cpi-shell-search cpi-v3-search" type="button">Search WPI</button>
        </div>
      </header>`;
  }

  function currentSlide() {
    const slides = config.hero && Array.isArray(config.hero.slides) ? config.hero.slides : [];
    return slides[heroIndex] || {
      tag: "Featured Story", title: "Water Polo Index",
      summary: "Rankings, stories, and club intelligence for California youth water polo.",
      image: "assets/photos/editorial/polo-shooter-close.jpg",
      primaryCta: { label: "View Rankings", url: "rankings.html" },
      secondaryCta: { label: "Explore Clubs", url: "clubs.html" }
    };
  }

  function hero() {
    const slides = config.hero && Array.isArray(config.hero.slides) ? config.hero.slides : [];
    const s = currentSlide();
    const dots = slides.map((_, i) => `<button class="cpi-v3-dot ${i === heroIndex ? "is-active" : ""}" data-hero-dot="${i}" aria-label="Go to slide ${i + 1}"></button>`).join("");
    return `
      <section class="cpi-v3-hero">
        <div class="cpi-v3-hero-bg" style="background-image:url('${safe(s.image, "assets/photos/editorial/polo-shooter-close.jpg")}')"></div>
        <div class="cpi-v3-hero-overlay"></div>
        <button class="cpi-v3-arrow cpi-v3-prev" type="button">‹</button>
        <div class="cpi-v3-hero-inner">
          <div class="cpi-v3-hero-copy">
            <span>${safe(s.tag, "Featured Story")}</span>
            <h1>${safe(s.title, "Water Polo Index")}</h1>
            <p>${safe(s.summary, "Rankings, stories, and club intelligence for California youth water polo.")}</p>
            <div class="cpi-v3-actions">
              <a class="primary" href="${safe(s.primaryCta && s.primaryCta.url, "rankings.html")}">${safe(s.primaryCta && s.primaryCta.label, "View Rankings")} →</a>
              <a class="secondary" href="${safe(s.secondaryCta && s.secondaryCta.url, "clubs.html")}">${safe(s.secondaryCta && s.secondaryCta.label, "Explore Clubs")}</a>
            </div>
          </div>
        </div>
        <button class="cpi-v3-arrow cpi-v3-next" type="button">›</button>
        <div class="cpi-v3-dots">${dots}</div>
      </section>`;
  }

  function stories() {
    const items = Array.isArray(config.stories) ? config.stories.slice(0, 3) : [];
    return `
      <section class="cpi-v3-section cpi-v3-stories">
        <div class="cpi-v3-section-title"><h2>Top Stories</h2><a href="tournaments.html">View All Stories →</a></div>
        <div class="cpi-v3-story-grid">
          ${items.map(story => `
            <a class="cpi-v3-story-card" href="${safe(story.url, "tournaments.html")}">
              <img src="${safe(story.image, "assets/photos/editorial/polo-attacker-poolwide.jpg")}" alt="${safe(story.title, "WPI story")}">
              <div><span>${safe(story.category, "Story")}</span><h3>${safe(story.title, "WPI Story")}</h3><p>${safe(story.summary, "Follow the latest WPI storylines.")}</p><small>${safe(story.meta, "2 min read")}</small></div>
            </a>`).join("")}
        </div>
      </section>`;
  }

  function topRanked() {
    const rows = rankings().filter(r => r && r.team).sort((a,b) => Number(a.postRank || 999) - Number(b.postRank || 999)).slice(0,5);
    if (rows.length) return rows.map(r => ({ rank: r.postRank, title: r.team, meta: r.group || "", url: r.teamPage || "rankings.html", logo: r.logo || "" }));
    return [
      { rank: 1, title: "La Jolla United A", meta: "#1 14U Boys", url: "14u-boys.html" },
      { rank: 2, title: "NorCal A", meta: "#2 14U Boys", url: "rankings.html" },
      { rank: 3, title: "Mission A", meta: "#3 14U Boys", url: "rankings.html" },
      { rank: 4, title: "LA Premier A", meta: "#4 14U Boys", url: "rankings.html" },
      { rank: 5, title: "SD Dons A", meta: "#5 14U Boys", url: "rankings.html" }
    ];
  }

  function movers() {
    const rows = rankings().filter(r => r && r.team).sort((a,b) => Number(b.movement || 0) - Number(a.movement || 0)).slice(0,5);
    if (rows.length) return rows.map(r => ({ movement: r.movement || 0, title: r.team, meta: r.group || "", url: r.teamPage || "rankings.html", logo: r.logo || "" }));
    return [
      { movement: 17, title: "Skip A", meta: "14U Boys", url: "rankings.html" },
      { movement: 11, title: "Rancho Tsunami A", meta: "16U Boys", url: "rankings.html" },
      { movement: 10, title: "Devils Gate A", meta: "14U Girls", url: "rankings.html" },
      { movement: 8, title: "Vanguard A", meta: "12U Boys", url: "rankings.html" },
      { movement: 7, title: "South Coast A", meta: "16U Girls", url: "rankings.html" }
    ];
  }

  function trending() {
    const map = new Map();
    rankings().forEach(r => {
      const key = r.clubSlug || r.club || r.displayClubName;
      if (!key) return;
      const cur = map.get(key) || { title: r.displayClubName || r.club || key, slug: r.clubSlug || key, movement: 0, teams: 0, best: 999, logo: r.logo || "" };
      cur.movement += Number(r.movement || 0); cur.teams += 1; cur.best = Math.min(cur.best, Number(r.postRank || 999)); cur.logo = cur.logo || r.logo || "";
      map.set(key, cur);
    });
    const rows = Array.from(map.values()).sort((a,b) => b.movement - a.movement).slice(0,5);
    if (rows.length) return rows.map(r => ({ title: r.title, meta: `${r.teams} ranked team${r.teams === 1 ? "" : "s"} · Best #${r.best}`, movement: r.movement, url: `club/${r.slug}.html`, logo: r.logo }));
    return [
      { title: "Skip", movement: 17, meta: "1 ranked team · Best #42", url: "club/skip.html" },
      { title: "Rancho Tsunami", movement: 11, meta: "1 ranked team · Best #15", url: "club/rancho-tsunami.html" },
      { title: "Devils Gate", movement: 10, meta: "1 ranked team · Best #29", url: "club/devils-gate.html" },
      { title: "NorCal Aquatics", movement: 10, meta: "3 ranked teams · Best #2", url: "club/norcal.html" },
      { title: "Vegas Renegades", movement: 9, meta: "1 ranked team · Best #40", url: "club/vegas-renegades.html" }
    ];
  }

  function logo(item) { return item.logo ? `<img src="${item.logo}" alt="">` : `<span class="cpi-v3-logo-fallback"></span>`; }
  function rankedRows(items) { return items.map((item, i) => `<a class="cpi-v3-row" href="${safe(item.url, "rankings.html")}"><b>${safe(item.rank, i+1)}</b>${logo(item)}<strong>${safe(item.title, "Team TBD")}</strong><em>${safe(item.meta, "")}</em></a>`).join(""); }
  function moverRows(items) { return items.map(item => `<a class="cpi-v3-row" href="${safe(item.url, "rankings.html")}"><b class="move">▲ ${safe(item.movement, 0)}</b>${logo(item)}<strong>${safe(item.title, "Team TBD")}</strong><em>${safe(item.meta, "")}</em></a>`).join(""); }
  function trendingRows(items) { return items.map(item => `<a class="cpi-v3-row" href="${safe(item.url, "clubs.html")}"><b>🔥</b>${logo(item)}<strong>${safe(item.title, "Club TBD")}</strong><em>▲ ${safe(item.movement, 0)}</em></a>`).join(""); }
  function eventRows(items) { return items.slice(0,5).map(item => `<a class="cpi-v3-event" href="${safe(item.url, "tournaments.html")}"><b>${safe(item.date, "TBD")}</b><strong>${safe(item.title, "Tournament TBD")}</strong></a>`).join(""); }
  function glanceCard(title, icon, rows, ctaUrl, ctaLabel) { return `<article class="cpi-v3-glance-card"><div class="head"><span>${icon}</span><h3>${title}</h3><a href="${ctaUrl}">View All →</a></div><div class="body">${rows}</div><a class="cta" href="${ctaUrl}">${ctaLabel}</a></article>`; }

  function glance() {
    const events = Array.isArray(config.tournaments) ? config.tournaments : [];
    return `<section class="cpi-v3-section cpi-v3-glance"><div class="cpi-v3-section-title"><h2>At a Glance</h2></div><div class="cpi-v3-glance-grid">${glanceCard("Top Ranked Clubs","🏆",rankedRows(topRanked()),"rankings.html","Full Club Rankings")}${glanceCard("Biggest Movers","📈",moverRows(movers()),"rankings.html","Full Movers List")}${glanceCard("Trending Clubs","🔥",trendingRows(trending()),"clubs.html","Explore Clubs")}${glanceCard("Upcoming Tournaments","📅",eventRows(events),"tournaments.html","Tournament Calendar")}</div></section>`;
  }

  function newsletter() {
    const n = config.newsletter || {};
    return `<section class="cpi-v3-newsletter"><div class="icon">✉</div><div><h2>${safe(n.title,"Stay in the Game")}</h2><p>${safe(n.summary,"Get WPI rankings, recaps, and stories delivered 1–2 times per month.")}</p></div><form><input type="email" placeholder="${safe(n.placeholder,"Enter your email")}"><button type="button">${safe(n.button,"Subscribe")}</button></form></section>`;
  }

  function footer() {
    return `<footer class="cpi-v3-footer"><div class="inner"><div class="brand"><a href="index.html"><span>WPI</span><div><strong>Water Polo Index</strong><em>Ranked. Respected. Earned.</em></div></a><p>Independent and unofficial rankings, stories, and club intelligence for California youth water polo.</p></div><nav><h3>Explore</h3><a href="rankings.html">Rankings</a><a href="clubs.html">Clubs</a><a href="tournaments.html">Tournaments</a><a href="methodology.html">Methodology</a></nav><nav><h3>Age Groups</h3><a href="12u-boys.html">12U</a><a href="14u-boys.html">14U Boys</a><a href="14u-girls.html">14U Girls</a><a href="16u-boys.html">16U Boys</a><a href="16u-girls.html">16U Girls</a></nav><div><h3>About WPI</h3><p>The Water Polo Index is building a comprehensive water polo ranking system for California youth clubs.</p><a href="methodology.html">Learn More →</a></div></div><div class="bottom">© ${new Date().getFullYear()} Water Polo Index. All rights reserved.</div></footer>`;
  }

  function render() {
    document.body.className = "cpi-v3-body";
    document.body.innerHTML = `${header()}<main id="cpi-home-root" class="cpi-v3-root">${hero()}${stories()}${glance()}${newsletter()}</main>${footer()}`;
    bindHero();
  }

  function bindHero() {
    const slides = config.hero && Array.isArray(config.hero.slides) ? config.hero.slides : [];
    const redraw = () => { const oldHero = document.querySelector(".cpi-v3-hero"); const temp = document.createElement("div"); temp.innerHTML = hero().trim(); if (oldHero) oldHero.replaceWith(temp.firstElementChild); bindHero(); };
    const next = document.querySelector(".cpi-v3-next"); const prev = document.querySelector(".cpi-v3-prev");
    if (next) next.onclick = () => { heroIndex = (heroIndex + 1) % slides.length; redraw(); };
    if (prev) prev.onclick = () => { heroIndex = (heroIndex - 1 + slides.length) % slides.length; redraw(); };
    document.querySelectorAll("[data-hero-dot]").forEach(btn => btn.onclick = () => { heroIndex = Number(btn.dataset.heroDot); redraw(); });
    clearInterval(heroTimer);
    if (slides.length > 1) heroTimer = setInterval(() => { heroIndex = (heroIndex + 1) % slides.length; redraw(); }, 6500);
  }

  async function init() {
    if (!isHome()) return;
    config = await fetchJson("data/homepage.json") || {};
    render();
    console.info("WPI Homepage V3 rendered");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
