/*
  CPI 5.4 — Premium Homepage
*/
(function () {
  function isHomePage() {
    const page = window.location.pathname.split("/").pop() || "index.html";
    return page === "index.html" || page === "";
  }

  function safe(value, fallback) {
    return value === undefined || value === null || value === "" ? fallback : value;
  }

  function rankings() {
    return Array.isArray(window.CPI_RANKINGS) ? window.CPI_RANKINGS : [];
  }

  function topTeams() {
    return rankings().slice().sort((a, b) => (a.postRank || 999) - (b.postRank || 999)).slice(0, 5);
  }

  function biggestMovers() {
    return rankings().slice().sort((a, b) => (b.movement || 0) - (a.movement || 0)).slice(0, 5);
  }

  function trendingClubs() {
    const map = new Map();
    rankings().forEach(r => {
      const slug = r.clubSlug || r.club || r.displayClubName || "unknown";
      const current = map.get(slug) || {
        name: r.displayClubName || r.club || slug,
        slug: r.clubSlug || slug,
        movement: 0,
        rankedTeams: 0,
        bestRank: 999,
        logo: r.logo
      };
      current.movement += Number(r.movement || 0);
      current.rankedTeams += 1;
      current.bestRank = Math.min(current.bestRank, Number(r.postRank || 999));
      current.logo = current.logo || r.logo;
      map.set(slug, current);
    });
    return Array.from(map.values()).sort((a, b) => b.movement - a.movement).slice(0, 5);
  }

  function renderTeamRows() {
    const teams = topTeams();
    if (!teams.length) {
      return `<li><span>1</span><strong>La Jolla United</strong><em>#1 14U Boys</em></li>
              <li><span>2</span><strong>Skip</strong><em>#1 16U Boys</em></li>
              <li><span>3</span><strong>NorCal</strong><em>#2 16U Boys</em></li>
              <li><span>4</span><strong>Rose Bowl</strong><em>#2 14U Girls</em></li>
              <li><span>5</span><strong>SET</strong><em>#3 18U Boys</em></li>`;
    }
    return teams.map((t, i) => `
      <li><span>${i + 1}</span><strong>${safe(t.team, "Team TBD")}</strong><em>#${safe(t.postRank, "—")} ${safe(t.group, "")}</em></li>
    `).join("");
  }

  function renderMoverRows() {
    const movers = biggestMovers();
    if (!movers.length) {
      return `<li><span class="up">▲ 17</span><strong>Skip</strong><em>14U Boys</em></li>
              <li><span class="up">▲ 11</span><strong>Rancho Tsunami</strong><em>16U Boys</em></li>
              <li><span class="up">▲ 10</span><strong>Devils Gate</strong><em>14U Girls</em></li>`;
    }
    return movers.map(t => `
      <li><span class="up">▲ ${safe(t.movement, 0)}</span><strong>${safe(t.team, "Team TBD")}</strong><em>${safe(t.group, "")}</em></li>
    `).join("");
  }

  function renderTrendingRows() {
    const clubs = trendingClubs();
    if (!clubs.length) {
      return `<li><span>🔥</span><strong>Skip</strong><em>▲ 17</em></li>
              <li><span>🔥</span><strong>Rancho Tsunami</strong><em>▲ 11</em></li>
              <li><span>🔥</span><strong>Devils Gate</strong><em>▲ 10</em></li>
              <li><span>🔥</span><strong>NorCal Aquatics</strong><em>▲ 8</em></li>
              <li><span>🔥</span><strong>La Jolla United</strong><em>▲ 7</em></li>`;
    }
    return clubs.map(c => `
      <li><span>🔥</span><strong>${safe(c.name, "Club TBD")}</strong><em>▲ ${safe(c.movement, 0)}</em></li>
    `).join("");
  }

  function renderHomepage() {
    const existingShell = document.querySelector(".cpi-shell-header");
    const target = document.querySelector("main") || document.querySelector("#app") || document.body;
    const heroImage = "assets/photos/editorial/polo-shooter-close.jpg";
    const storyOne = "assets/photos/editorial/polo-attacker-poolwide.jpg";
    const storyTwo = "assets/photos/editorial/polo-medal-team.jpg";
    const storyThree = "assets/photos/editorial/polo-team-huddle.jpg";

    target.innerHTML = `
      <main class="premium-home">
        <section class="premium-hero" style="--hero-image:url('${heroImage}')">
          <button class="premium-arrow left" type="button" aria-label="Previous story">‹</button>
          <div class="premium-hero-content">
            <span class="premium-eyebrow">Featured Story</span>
            <h1>Skip Water Polo Captures D3 Title in Dominant Run</h1>
            <p>Behind a balanced attack and lockdown defense, Skip secures the D3 championship and cements its place among California’s elite.</p>
            <a class="premium-btn" href="tournaments.html">Read Full Story →</a>
          </div>
          <button class="premium-arrow right" type="button" aria-label="Next story">›</button>
          <div class="premium-dots" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>
        </section>

        <section class="premium-section premium-stories">
          <div class="premium-section-title">
            <h2>Top Stories</h2>
            <a href="tournaments.html">View All Stories →</a>
          </div>
          <div class="premium-story-grid">
            <article class="premium-story-card">
              <img src="${storyOne}" alt="Water polo action">
              <div><span>Rankings</span><h3>La Jolla United A Holds #1 Spot in 14U Boys</h3><p>The latest CPI update keeps La Jolla United A on top after a strong weekend performance.</p><small>May 24, 2026 · 2 min read</small></div>
            </article>
            <article class="premium-story-card">
              <img src="${storyTwo}" alt="Tournament celebration">
              <div><span>Tournament Recap</span><h3>Super Finals Delivers Another Rankings Shakeup</h3><p>Top clubs from across the state battled it out in one of California’s most important events.</p><small>May 23, 2026 · 3 min read</small></div>
            </article>
            <article class="premium-story-card">
              <img src="${storyThree}" alt="Water polo team huddle">
              <div><span>Club Spotlight</span><h3>Trending Clubs Are Turning Movement Into Stories</h3><p>Momentum, depth, and tournament results are beginning to define the CPI club landscape.</p><small>May 22, 2026 · 4 min read</small></div>
            </article>
          </div>
        </section>

        <section class="premium-section premium-glance">
          <div class="premium-section-title"><h2>At a Glance</h2></div>
          <div class="premium-glance-grid">
            <article class="premium-data-card">
              <div class="premium-card-title"><span>🏆</span><strong>Top Ranked Clubs</strong><a href="rankings.html">View All →</a></div>
              <ol>${renderTeamRows()}</ol>
              <a class="premium-outline" href="rankings.html">Full Club Rankings</a>
            </article>
            <article class="premium-data-card">
              <div class="premium-card-title"><span>📈</span><strong>Biggest Movers</strong><a href="rankings.html#biggest-movers">View All →</a></div>
              <ol class="premium-movers">${renderMoverRows()}</ol>
              <a class="premium-outline" href="rankings.html">Full Movers List</a>
            </article>
            <article class="premium-data-card">
              <div class="premium-card-title"><span>🔥</span><strong>Trending Clubs</strong><a href="clubs.html">View All →</a></div>
              <ol class="premium-trending">${renderTrendingRows()}</ol>
              <a class="premium-outline" href="clubs.html">Explore Clubs</a>
            </article>
            <article class="premium-data-card">
              <div class="premium-card-title"><span>📅</span><strong>Upcoming Tournaments</strong><a href="tournaments.html">View All →</a></div>
              <ol class="premium-events">
                <li><span>Jun<br>13–15</span><strong>Junior Olympics</strong></li>
                <li><span>Jun<br>20–22</span><strong>KAP7 SoCal Invite</strong></li>
                <li><span>Jun<br>27–29</span><strong>Rose Bowl Classic</strong></li>
                <li><span>Jul<br>11–13</span><strong>Far Westerns</strong></li>
                <li><span>Jul<br>25–27</span><strong>Super Finals</strong></li>
              </ol>
              <a class="premium-outline" href="tournaments.html">Tournament Calendar</a>
            </article>
          </div>
        </section>

        <section class="premium-subscribe">
          <div class="premium-mail-icon">✉</div>
          <div><h2>Stay in the Game</h2><p>Get CPI rankings, recaps, and stories delivered 1–2 times per month.</p></div>
          <form><input type="email" placeholder="Enter your email" aria-label="Email address"><button type="button">Subscribe</button></form>
        </section>
      </main>
    `;
  }

  function init() {
    if (!isHomePage()) return;
    renderHomepage();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
