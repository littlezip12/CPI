/*
  CPI 5.3B — Smart Club Cards

  Uses data/club-intelligence.json when available.
  Enhances the Clubs landing page into a richer, ESPN-style club discovery page.
*/

(function () {
  async function loadClubIntelligence() {
    try {
      const res = await fetch("data/club-intelligence.json", { cache: "no-store" });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  function moveClass(value) {
    const n = Number(value || 0);
    if (n > 0) return "up";
    if (n < 0) return "down";
    return "neutral";
  }

  function moveLabel(value) {
    const n = Number(value || 0);
    if (n > 0) return `▲ ${n}`;
    if (n < 0) return `▼ ${Math.abs(n)}`;
    return "—";
  }

  function safeLogo(path) {
    return path || "assets/cpi-logo-fallback.svg";
  }

  function clubScore(club) {
    const best = Number(club.bestRank || 999);
    const teams = Number(club.rankedTeams || 0);
    const avg = Number(club.averageCPI || 0);
    const move = Number(club.totalMovement || 0);
    return (1000 - best) + (teams * 20) + avg + move;
  }

  function renderSmartClubPage(clubs) {
    const target =
      document.querySelector("#clubs-root") ||
      document.querySelector("#clubs") ||
      document.querySelector("main") ||
      document.body;

    if (!target) return;

    const sorted = Object.values(clubs)
      .sort((a, b) => clubScore(b) - clubScore(a));

    const top = sorted.slice(0, 6);
    const rising = [...sorted]
      .sort((a, b) => Number(b.totalMovement || 0) - Number(a.totalMovement || 0))
      .slice(0, 6);

    const cards = sorted.map(club => {
      const topTeam = club.topTeam || {};
      const mover = club.biggestMover || {};
      const href = `club/${club.slug}.html`;
      const move = moveClass(club.totalMovement);

      return `<a class="smart-club-card" href="${href}">
        <div class="smart-club-card-top">
          <span class="smart-club-rank">#${club.bestRank || "—"}</span>
          <img src="${safeLogo(club.logo)}" alt="${club.displayName} logo">
        </div>
        <div class="smart-club-card-body">
          <span class="smart-club-region">${club.region || "Region TBD"}</span>
          <h3>${club.displayName}</h3>
          <div class="smart-club-meta">
            <span>${club.rankedTeams || 0} ranked teams</span>
            <span>Avg CPI ${club.averageCPI || "—"}</span>
          </div>
          <div class="smart-club-highlight">
            <small>Highest Ranked</small>
            <strong>${topTeam.team || "No ranked team yet"}</strong>
            <em>${topTeam.rank ? `#${topTeam.rank}` : "—"}${topTeam.cpi ? ` · ${topTeam.cpi} CPI` : ""}</em>
          </div>
          <div class="smart-club-footer">
            <span class="smart-club-move ${move}">${moveLabel(club.totalMovement)}</span>
            <span>View Club →</span>
          </div>
        </div>
      </a>`;
    }).join("");

    const topRows = top.map(club => {
      return `<a href="club/${club.slug}.html" class="smart-club-row">
        <img src="${safeLogo(club.logo)}" alt="${club.displayName} logo">
        <div>
          <strong>${club.displayName}</strong>
          <span>${club.rankedTeams || 0} teams · best rank #${club.bestRank || "—"}</span>
        </div>
        <b>${club.averageCPI || "—"}</b>
      </a>`;
    }).join("");

    const risingRows = rising.map(club => {
      const move = moveClass(club.totalMovement);
      return `<a href="club/${club.slug}.html" class="smart-club-row">
        <img src="${safeLogo(club.logo)}" alt="${club.displayName} logo">
        <div>
          <strong>${club.displayName}</strong>
          <span>${club.region || "Region TBD"}</span>
        </div>
        <b class="${move}">${moveLabel(club.totalMovement)}</b>
      </a>`;
    }).join("");

    target.innerHTML = `<main class="smart-clubs-page">
      <section class="smart-clubs-hero">
        <div>
          <span class="smart-eyebrow">Club Intelligence</span>
          <h1>California water polo clubs, ranked and connected.</h1>
          <p>Explore every CPI club by ranked teams, best current team, movement, region, and overall momentum.</p>
        </div>
      </section>

      <section class="smart-clubs-dashboard">
        <article class="smart-panel">
          <div class="smart-panel-title">
            <h2>Top Club Signals</h2>
            <span>${sorted.length} clubs tracked</span>
          </div>
          <div class="smart-club-list">${topRows}</div>
        </article>

        <article class="smart-panel">
          <div class="smart-panel-title">
            <h2>Rising Clubs</h2>
            <span>Based on CPI movement</span>
          </div>
          <div class="smart-club-list">${risingRows}</div>
        </article>
      </section>

      <section class="smart-clubs-grid-section">
        <div class="smart-panel-title">
          <h2>All Clubs</h2>
          <span>Click any card for a full club profile</span>
        </div>
        <div class="smart-clubs-grid">${cards}</div>
      </section>
    </main>`;
  }

  async function initSmartClubs() {
    const page = window.location.pathname.split("/").pop() || "index.html";
    if (page !== "clubs.html") return;

    const data = await loadClubIntelligence();
    if (!data || !data.clubs) return;

    renderSmartClubPage(data.clubs);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSmartClubs);
  } else {
    initSmartClubs();
  }
})();
