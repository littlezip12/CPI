
const rankings = Array.isArray(window.CPI_RANKINGS) ? window.CPI_RANKINGS : [];
const clubs = Array.isArray(window.CPI_CLUBS) ? window.CPI_CLUBS : [];

function moveLabel(m) {
  if (m > 0) return `▲ +${m}`;
  if (m < 0) return `▼ ${m}`;
  return "—";
}
function moveClass(m) {
  return m > 0 ? "up" : m < 0 ? "down" : "flat";
}
function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}
function logo(obj, cls = "logo-md") {
  return `<img class="${cls}" src="${obj.logo}" alt="${obj.club || obj.team} badge" loading="lazy">`;
}
function heroStyle(obj) {
  return `style="--club-primary:${obj.primaryColor};--club-secondary:${obj.secondaryColor};"`;
}

function teamCard(r) {
  return `<article class="team-card">
    ${logo(r)}
    <div>
      <div class="rank-row">
        <span class="rank">#${r.postRank}</span>
        <span class="movement ${moveClass(r.movement)}">${moveLabel(r.movement)}</span>
      </div>
      <h3><a href="${r.teamPage}">${r.team}</a></h3>
      <p class="meta">CPI ${Number(r.postCPI).toFixed(1)} · Latest tournament ${r.latestTournamentRecord || "—"}</p>
      <p class="small">Best win: ${r.bestWinClean || "—"}</p>
    </div>
  </article>`;
}
function renderCards() {
  const topCards = document.querySelector("#topCards");
  if (topCards) topCards.innerHTML = rankings.slice(0, 8).map(teamCard).join("");

  const boysTopCards = document.querySelector("#boysTopCards");
  if (boysTopCards) boysTopCards.innerHTML = rankings.slice(0, 8).map(teamCard).join("");

  const clubCards = document.querySelector("#clubCards");
  if (clubCards) {
    clubCards.innerHTML = clubs.slice(0, 6).map(c => `
      <a class="club-card" href="${c.clubPage}">
        ${logo(c)}
        <strong>${c.club}</strong>
        <span>${c.teamCount} ranked team(s) · best rank #${c.bestRank}</span>
        <span class="go">Open club →</span>
      </a>
    `).join("");
  }

  const allClubCards = document.querySelector("#allClubCards");
  if (allClubCards) {
    allClubCards.innerHTML = clubs.map(c => `
      <a class="club-card" href="${c.clubPage}">
        ${logo(c)}
        <strong>${c.club}</strong>
        <span>${c.teamCount} ranked team(s) · best rank #${c.bestRank}</span>
        <span class="go">Open club →</span>
      </a>
    `).join("");
  }

  const risers = document.querySelector("#risers");
  if (risers) {
    risers.innerHTML = rankings.filter(r => r.movement > 0).sort((a,b) => b.movement - a.movement).slice(0,6)
      .map(r => `<div class="story-item"><span>${r.team}</span><strong class="movement up">${moveLabel(r.movement)}</strong></div>`).join("");
  }
  const fallers = document.querySelector("#fallers");
  if (fallers) {
    fallers.innerHTML = rankings.filter(r => r.movement < 0).sort((a,b) => a.movement - b.movement).slice(0,6)
      .map(r => `<div class="story-item"><span>${r.team}</span><strong class="movement down">${moveLabel(r.movement)}</strong></div>`).join("");
  }
  const gainers = document.querySelector("#gainers");
  if (gainers) {
    gainers.innerHTML = rankings.filter(r => r.gamesLatest > 0).sort((a,b) => b.cpiChange - a.cpiChange).slice(0,6)
      .map(r => `<div class="story-item"><span>${r.team}</span><strong>+${Number(r.cpiChange).toFixed(1)}</strong></div>`).join("");
  }
}

function rowTemplate(r) {
  return `<tr>
    <td><strong class="rank">#${r.postRank}</strong></td>
    <td><a class="team-cell" href="${r.teamPage}">${logo(r, "logo-sm")}${r.team}</a></td>
    <td><a href="${r.clubPage}">${r.club}</a></td>
    <td>${Number(r.postCPI).toFixed(1)}</td>
    <td><span class="movement ${moveClass(r.movement)}">${moveLabel(r.movement)}</span></td>
    <td>${r.preRank ? "#" + r.preRank : "—"}</td>
    <td>${r.latestTournamentRecord || "—"}</td>
    <td>${r.bestWinClean || "—"}</td>
  </tr>`;
}
function renderRankings() {
  const table = document.querySelector("#rankingsBody");
  if (!table) return;
  const q = (document.querySelector("#search")?.value || "").toLowerCase();
  const filtered = rankings.filter(r => `${r.team} ${r.club}`.toLowerCase().includes(q));
  table.innerHTML = filtered.length ? filtered.map(rowTemplate).join("") : `<tr><td colspan="8">No teams match that search.</td></tr>`;
  const count = document.querySelector("#count");
  if (count) count.textContent = `${filtered.length} teams`;
}

function renderTeamPage() {
  const root = document.querySelector("#teamProfile");
  if (!root) return;
  const r = rankings.find(x => x.slug === getParam("team"));
  if (!r) {
    root.innerHTML = `<main><section class="panel"><h2>Team not found</h2><p>No team matches this link.</p></section></main>`;
    return;
  }
  document.title = `${r.team} | California Polo Index`;
  root.innerHTML = `
    <section class="hero">
      <div>
        <p class="kicker">Team Profile · 14U Boys</p>
        <h1>${r.team}</h1>
        <p><a href="${r.clubPage}">${r.club}</a> profile with CPI rank, latest tournament record, and tournament highlight.</p>
      </div>
      <aside class="hero-visual" ${heroStyle(r)}>
        <div class="profile-hero-lockup">
          ${logo(r, "logo-xl")}
          <div>
            <div class="profile-rank">#${r.postRank}</div>
            <div class="visual-tag"><span>CPI ${Number(r.postCPI).toFixed(1)}</span><span>${moveLabel(r.movement)}</span></div>
          </div>
        </div>
      </aside>
    </section>
    <main>
      <section class="panel">
        <h2>Latest Tournament</h2>
        <div class="profile-kpi-grid">
          <div class="profile-kpi"><strong>${r.latestTournamentRecord || "—"}</strong><span>Futures Super Finals record</span></div>
          <div class="profile-kpi"><strong>${r.bestWinClean || "—"}</strong><span>Best win</span></div>
          <div class="profile-kpi"><strong>${Number(r.postCPI).toFixed(1)}</strong><span>CPI Rating</span></div>
          <div class="profile-kpi"><strong>${moveLabel(r.movement)}</strong><span>Movement</span></div>
        </div>
      </section>
      <div class="section-head">
        <div><h2>Club</h2><p class="subtle">All current ranked teams for this club.</p></div>
        <a class="btn" href="${r.clubPage}">View ${r.club}</a>
      </div>
    </main>`;
}

function renderClubPage() {
  const root = document.querySelector("#clubProfile");
  if (!root) return;
  const c = clubs.find(x => x.slug === getParam("club"));
  if (!c) {
    root.innerHTML = `<main><section class="panel"><h2>Club not found</h2><p>No club matches this link.</p></section></main>`;
    return;
  }
  document.title = `${c.club} | California Polo Index`;
  const rows = c.teams.map(t => `<tr>
    <td><strong class="rank">#${t.postRank}</strong></td>
    <td><a class="team-cell" href="${t.teamPage}">${logo(t, "logo-sm")}${t.team}</a></td>
    <td>${Number(t.postCPI).toFixed(1)}</td>
    <td><span class="movement ${moveClass(t.movement)}">${moveLabel(t.movement)}</span></td>
    <td>${t.latestTournamentRecord || "—"}</td>
    <td>${t.bestWinClean || "—"}</td>
  </tr>`).join("");
  root.innerHTML = `
    <section class="hero">
      <div>
        <p class="kicker">Club Profile · 14U Boys</p>
        <h1>${c.club}</h1>
        <p>All currently ranked 14U Boys teams for ${c.club} in the California Polo Index.</p>
      </div>
      <aside class="hero-visual" ${heroStyle(c)}>
        <div class="profile-hero-lockup">
          ${logo(c, "logo-xl")}
          <div>
            <div class="visual-tag"><span>${c.teamCount} Ranked Team(s)</span><span class="blue">Best Rank</span><span class="gold">#${c.bestRank}</span></div>
          </div>
        </div>
      </aside>
    </section>
    <main>
      <section class="panel">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Rank</th><th>Team</th><th>CPI</th><th>Move</th><th>Latest Tournament</th><th>Best Win</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>
    </main>`;
}

document.querySelector("#search")?.addEventListener("input", renderRankings);
renderCards();
renderRankings();
renderTeamPage();
renderClubPage();
