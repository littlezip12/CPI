
const rankings = window.CPI_RANKINGS || [];
const clubs = window.CPI_CLUBS || [];
const tournaments = window.CPI_TOURNAMENTS || [];

function moveLabel(m){return m>0?`▲ +${m}`:m<0?`▼ ${m}`:"—"}
function moveClass(m){return m>0?"up":m<0?"down":"flat"}
function getParam(n){return new URLSearchParams(window.location.search).get(n)}
function safe(s){return String(s ?? "")}
function heroStyle(o){
  const logoUrl = o.logo ? `url('${o.logo}')` : "none";
  return `style="--club-primary:${o.primaryColor};--club-secondary:${o.secondaryColor};--club-accent:${o.secondaryColor};--club-watermark:${logoUrl};"`
}
function logo(o,c="logo-md"){
  return `<span class="logo-wrap"><img class="${c}" src="${o.logo}" alt="${o.club||o.displayName||o.team} logo"></span>`
}
function teamCard(r){
  return `<article class="team-card" ${heroStyle(r)}>
    ${logo(r)}
    <div>
      <div><span class="rank">#${r.postRank}</span> <span class="movement ${moveClass(r.movement)}">${moveLabel(r.movement)}</span></div>
      <h3><a href="${r.teamPage}">${r.team}</a></h3>
      <span class="card-stat-label">Latest Tournament</span>
      <span class="card-stat-value">${r.latestTournamentRecord}</span>
      <p class="small">Best win: ${r.bestWinClean}</p>
    </div>
  </article>`
}

function renderCards(){
  const top = document.querySelector("#topCards");
  if(top) top.innerHTML = rankings.slice(0,8).map(teamCard).join("");

  const clubCards = document.querySelector("#clubCards");
  if(clubCards) {
    clubCards.innerHTML = clubs
      .filter(c=>c.logoStatus==="verified_by_user")
      .sort((a,b)=>a.bestRank-b.bestRank)
      .slice(0,8)
      .map(c=>`<a class="club-card" ${heroStyle(c)} href="${c.clubPage}">
        ${logo(c)}
        <strong>${c.displayName}</strong>
        <span>${c.teamCount} ranked team(s) · best rank #${c.bestRank}</span>
        <span class="club-pill">${c.region || "Region TBD"}</span>
      </a>`).join("");
  }

  const allClubCards = document.querySelector("#allClubCards");
  if(allClubCards) {
    allClubCards.innerHTML = clubs.map(c=>`<a class="club-card" ${heroStyle(c)} href="${c.clubPage}">
      ${logo(c)}
      <strong>${c.displayName || c.club}</strong>
      <span>${c.teamCount} ranked team(s) · best rank #${c.bestRank}</span>
      <span class="club-pill">${c.logoStatus==="verified_by_user"?"Verified branding":"Placeholder branding"}</span>
    </a>`).join("");
  }

  const tournamentCards = document.querySelector("#tournamentCards");
  if(tournamentCards) tournamentCards.innerHTML = tournaments.map(t=>`<article class="story-card"><h3>${t.name}</h3><p class="subtle">${t.status} · ${t.weightTier}</p><p>${t.notes}</p></article>`).join("");
}

function renderGroupOptions(){
  const filter = document.querySelector("#groupFilter");
  if(!filter) return;
  const groups = [...new Set(rankings.map(r=>r.group))].sort();
  filter.innerHTML = `<option value="">All groups</option>` + groups.map(g=>`<option value="${g}">${g}</option>`).join("");
}

function row(r){
  return `<tr>
    <td><strong class="rank">#${r.postRank}</strong></td>
    <td><a class="team-cell" href="${r.teamPage}">${logo(r,"logo-sm")}${r.team}</a></td>
    <td><a href="${r.clubPage}">${r.displayClubName || r.club}</a></td>
    <td>${r.group}</td>
    <td>${Number(r.postCPI).toFixed(1)}</td>
    <td><span class="movement ${moveClass(r.movement)}">${moveLabel(r.movement)}</span></td>
    <td>${r.latestTournamentRecord}</td>
    <td>${r.bestWinClean}</td>
  </tr>`;
}

function renderRankings(){
  const body = document.querySelector("#rankingsBody");
  if(!body) return;
  const q = (document.querySelector("#search")?.value || "").toLowerCase();
  const g = document.querySelector("#groupFilter")?.value || "";
  const filtered = rankings.filter(r => `${r.team} ${r.club} ${r.displayClubName||""}`.toLowerCase().includes(q) && (!g || r.group === g));
  body.innerHTML = filtered.map(row).join("");
  const count = document.querySelector("#count");
  if(count) count.textContent = `${filtered.length} teams`;
}

function renderTeamPage(){
  const root = document.querySelector("#teamProfile");
  if(!root) return;
  const r = rankings.find(x=>x.slug===getParam("team"));
  if(!r){root.innerHTML="<main><section class='panel'><h2>Team not found</h2></section></main>";return;}
  const c = clubs.find(x=>x.slug===r.clubSlug);
  root.innerHTML = `<section class="hero">
    <div>
      <p class="kicker">Team Profile · ${r.group}</p>
      <h1>${r.team}</h1>
      <p><a href="${r.clubPage}">${c?.displayName||r.club}</a> profile with CPI rank and tournament context.</p>
      <span class="club-pill">${c?.region || "Region TBD"}</span>
    </div>
    <aside class="hero-visual" ${heroStyle(r)}>
      <div class="profile-hero-lockup">${logo(r,"logo-xl")}
        <div><div class="profile-rank">#${r.postRank}</div><div class="visual-tag"><span>CPI ${Number(r.postCPI).toFixed(1)}</span><span>${moveLabel(r.movement)}</span></div></div>
      </div>
    </aside>
  </section>
  <main>
    <section class="panel">
      <h2>Latest Tournament</h2>
      <div class="profile-kpi-grid">
        <div class="profile-kpi"><strong>${r.latestTournamentRecord}</strong><span>${r.latestTournament} record</span></div>
        <div class="profile-kpi"><strong>${r.bestWinClean}</strong><span>Best win</span></div>
        <div class="profile-kpi"><strong>${Number(r.postCPI).toFixed(1)}</strong><span>CPI Rating</span></div>
        <div class="profile-kpi"><strong>${moveLabel(r.movement)}</strong><span>Movement</span></div>
      </div>
    </section>
  </main>`;
}

function renderClubPage(){
  const root = document.querySelector("#clubProfile");
  if(!root) return;
  const c = clubs.find(x=>x.slug===getParam("club"));
  if(!c){root.innerHTML="<main><section class='panel'><h2>Club not found</h2></section></main>";return;}
  const rows = c.teams.map(t=>`<tr>
    <td><strong class="rank">#${t.postRank}</strong></td>
    <td><a class="team-cell" href="${t.teamPage}">${logo({...t, logo:c.logo},"logo-sm")}${t.team}</a></td>
    <td>${t.group}</td>
    <td>${Number(t.postCPI).toFixed(1)}</td>
    <td><span class="movement ${moveClass(t.movement)}">${moveLabel(t.movement)}</span></td>
    <td>${t.latestTournamentRecord}</td>
    <td>${t.bestWinClean}</td>
  </tr>`).join("");
  root.innerHTML = `<section class="hero">
    <div>
      <p class="kicker">Club Profile</p>
      <h1>${c.displayName||c.club}</h1>
      <p>${c.region||"Region TBD"} ${c.website?`· <a href="${c.website}">Official website</a>`:""}</p>
      <span class="club-pill">${c.logoStatus==="verified_by_user"?"Verified branding":"Placeholder branding"}</span>
    </div>
    <aside class="hero-visual" ${heroStyle(c)}>
      <div class="profile-hero-lockup">${logo(c,"logo-xl")}
        <div class="visual-tag"><span>${c.teamCount} Ranked Team(s)</span><span class="blue">Best Rank</span><span class="gold">#${c.bestRank}</span></div>
      </div>
    </aside>
  </section>
  <main>
    <section class="panel">
      <div class="table-wrap"><table><thead><tr><th>Rank</th><th>Team</th><th>Group</th><th>CPI</th><th>Move</th><th>Latest Tournament</th><th>Best Win</th></tr></thead><tbody>${rows}</tbody></table></div>
    </section>
  </main>`;
}

renderGroupOptions();
document.querySelector("#search")?.addEventListener("input", renderRankings);
document.querySelector("#groupFilter")?.addEventListener("change", renderRankings);
renderCards();
renderRankings();
renderTeamPage();
renderClubPage();



function renderHomepage2(){
  const shell=document.querySelector("#homepage2");
  if(!shell) return;
  const hp=window.CPI_HOMEPAGE||{};
  const hero=hp.hero||{};
  const headlines=hp.headlines||[];
  const recaps=hp.recaps||[];
  const celebrations=hp.celebrations||[];
  const mediaCards=hp.mediaCards||[];
  const topFive=rankings.slice(0,5);
  const trending=clubs.filter(c=>c.logoStatus==="verified_by_user").sort((a,b)=>a.bestRank-b.bestRank).slice(0,5);
  shell.innerHTML=`
    <section class="home-hero-2">
      <article class="hero-lead-card media-hero" style="--hero-image:url('${hero.image||"assets/media/hero-superfinals.svg"}')">
        <div>
          <span class="hero-category">${hero.label||"This Week in California Water Polo"}</span>
          <h1>${hero.title||"California youth water polo has a new home"}</h1>
          <p>${hero.summary||"Rankings, tournament coverage, club profiles, and the stories that deserve to be remembered."}</p>
          <div class="hero-actions"><a class="btn" href="${hero.primaryUrl||"rankings.html"}">${hero.primaryCta||"View Rankings"}</a><a class="btn secondary" href="${hero.secondaryUrl||"clubs.html"}">${hero.secondaryCta||"Explore Clubs"}</a></div>
        </div>
        <div><div class="club-pill">Every team has a chance to be the story.</div><div class="image-credit">${hero.imageCredit||"CPI generated artwork"}</div></div>
      </article>
      <aside class="headlines-panel"><h2>Latest Headlines</h2><div class="headline-list">${headlines.map(h=>`<a class="headline-item" href="${h.url||"#"}"><span class="headline-tag">${h.tag||"CPI"}</span><span class="headline-title">${h.title}</span></a>`).join("")}</div></aside>
    </section>
    <main class="home-shell">
      <section class="media-grid">${mediaCards.map(m=>`<a class="media-card" href="${m.url||"#"}"><div class="media-card-image" style="background-image:url('${m.image}')"></div><div class="media-card-body"><span class="media-eyebrow">${m.eyebrow||"CPI Story"}</span><h3>${m.title}</h3><p>${m.summary}</p><div class="image-credit">${m.imageCredit||"CPI generated artwork"}</div></div></a>`).join("")}</section>
      <section class="home-grid-2">
        <article class="module-card"><h2>Weekend Recap</h2><p class="subtle">One boys recap and one girls recap, built to expand as new data is loaded.</p><div class="recap-grid">${recaps.map(r=>`<div class="recap-card"><strong>${r.title}</strong><p class="subtle">${r.event}</p><div class="recap-line"><span>Champion</span><b>${r.champion}</b></div><div class="recap-line"><span>Runner-up</span><b>${r.runnerUp}</b></div><p class="small">${r.story}</p></div>`).join("")}</div></article>
        <article class="module-card"><h2>Stories Worth Celebrating</h2><p class="subtle">Not just the top division. CPI highlights meaningful performances across every bracket.</p><div class="story-stack">${celebrations.map(s=>`<div class="story-mini"><span>${s.award}</span><strong>${s.team}</strong><p class="small">${s.detail}</p></div>`).join("")}</div></article>
      </section>
      <section class="module-card featured-group-panel"><div class="section-head" style="margin:0 0 10px;"><div><h2>Featured Group</h2><p class="subtle">14U Boys is live now. This can rotate by age/gender as data expands.</p></div><a class="btn" href="rankings.html">Full Rankings</a></div><div class="rank-strip">${topFive.map(r=>`<a class="rank-tile" href="${r.teamPage}"><span class="rank">#${r.postRank}</span><strong>${r.team}</strong><p class="small">CPI ${Number(r.postCPI).toFixed(1)}</p></a>`).join("")}</div></section>
      <section class="home-grid-2">
        <article class="module-card"><h2>Trending Clubs</h2><div class="trending-club-list">${trending.map(c=>`<a class="trending-club" href="${c.clubPage}"><img src="${c.logo}" alt="${c.displayName||c.club} logo"><div><strong>${c.displayName||c.club}</strong><span>${c.region||"Region TBD"} · Best rank #${c.bestRank}</span></div></a>`).join("")}</div></article>
        <article class="module-card"><h2>Upcoming Tournaments</h2><div class="story-stack">${(tournaments||[]).map(t=>`<div class="story-mini"><span>${t.weightTier||"Tournament"}</span><strong>${t.name}</strong><p class="small">${t.notes||t.status}</p></div>`).join("")}</div></article>
      </section>
    </main>`;
}
renderHomepage2();

