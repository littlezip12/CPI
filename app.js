
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
  const shell=document.querySelector("#homepage2"); if(!shell) return;
  const hp=window.CPI_HOMEPAGE||{}, hero=hp.hero||{}, headlines=hp.headlines||[], mediaCards=hp.mediaCards||[], championStrip=hp.championStrip||[], tournament=hp.tournamentSpotlight||{}, fg=hp.featuredGroup||{}, topTeams=fg.topTeams||rankings.slice(0,5), trending=hp.trendingClubs||[], movers=hp.biggestMovers||[];
  shell.innerHTML=`
    <section class="champion-strip"><div class="champion-strip-inner"><div class="champion-label">Latest Champions</div>${championStrip.map(c=>`<a class="champion-item" href="${c.url||"#"}"><span>${c.division}</span><strong>${c.team}</strong></a>`).join("")}</div></section>
    <section class="home-hero-2 editorial">
      <article class="hero-lead-card media-hero editorial-hero" style="--hero-image:url('${hero.image||"assets/media/frontpage-superfinals.svg"}')">
        <div><span class="hero-category">${hero.label||"This Week in California Water Polo"}</span><h1>${hero.title||"California youth water polo has a new home"}</h1><p>${hero.summary||"Rankings, tournament coverage, club profiles, and stories."}</p><div class="editorial-meta"><span>Every Match Matters</span><span>Every Team Has a Story</span><span>Post-Super Finals</span></div><div class="hero-actions"><a class="btn" href="${hero.primaryUrl||"rankings.html"}">${hero.primaryCta||"View Rankings"}</a><a class="btn secondary" href="${hero.secondaryUrl||"tournaments.html"}">${hero.secondaryCta||"Tournament Center"}</a></div></div>
        <div><div class="club-pill">The front page of California youth water polo.</div><div class="image-credit">${hero.imageCredit||"CPI generated artwork"}</div></div>
      </article>
      <aside class="headlines-panel editorial-feed"><h2>Latest Headlines</h2><div class="headline-list">${headlines.map(h=>`<a class="headline-item" href="${h.url||"#"}"><span class="headline-tag">${h.tag||"CPI"}</span><span class="headline-title">${h.title}<em class="headline-time">${h.time||""}</em></span></a>`).join("")}</div></aside>
    </section>
    <main class="home-shell">
      <section class="media-grid">${mediaCards.map(m=>`<a class="media-card" href="${m.url||"#"}"><div class="media-card-image" style="background-image:url('${m.image}')"></div><div class="media-card-body"><span class="media-eyebrow">${m.eyebrow||"CPI Story"}</span><h3>${m.title}</h3><p>${m.summary}</p><div class="image-credit">${m.imageCredit||"CPI generated artwork"}</div></div></a>`).join("")}</section>
      <section class="tournament-spotlight"><div class="tournament-visual"></div><article class="module-card"><span class="hero-category">${tournament.label||"Tournament Spotlight"}</span><h2>${tournament.name||"Tournament Center"}</h2><p class="subtle">${tournament.summary||"Champions, upsets, movers, and recap modules are coming next."}</p><div class="tournament-stats"><div class="tournament-stat"><span>Champion</span><strong>${tournament.champion||"Coming soon"}</strong></div><div class="tournament-stat"><span>Division Story</span><strong>${tournament.divisionStory||"Every bracket matters"}</strong></div><div class="tournament-stat"><span>Biggest Mover</span><strong>${tournament.biggestMover||"Coming soon"}</strong></div><div class="tournament-stat"><span>Next Step</span><strong>Tournament Hub</strong></div></div><div class="hero-actions"><a class="btn" href="${tournament.url||"tournaments.html"}">Read Tournament →</a></div></article></section>
      <section class="module-card featured-group-panel"><div class="section-head" style="margin:0 0 10px;"><div><h2>Featured Group: ${fg.name||"14U Boys"}</h2><p class="subtle">${fg.summary||"Live rankings group."}</p></div><a class="btn" href="rankings.html">Full Rankings</a></div><div class="stat-strip"><div class="stat"><strong>${fg.teamsTracked||rankings.length}</strong><span>Teams tracked</span></div><div class="stat"><strong>${fg.clubsTracked||""}</strong><span>Clubs represented</span></div><div class="stat"><strong>${topTeams[0]?.team||"—"}</strong><span>Current #1</span></div><div class="stat"><strong>Post SF</strong><span>Latest update</span></div></div><div class="rank-strip">${topTeams.slice(0,5).map(r=>`<a class="rank-tile" href="${r.teamPage||"#"}"><span class="rank">#${r.postRank}</span><strong>${r.team}</strong><p class="small">CPI ${Number(r.postCPI||0).toFixed(1)}</p></a>`).join("")}</div></section>
      <section class="home-grid-2"><article class="module-card"><h2>Trending Clubs</h2><div class="trending-club-list">${trending.map(c=>`<a class="trending-club" href="${c.url||"#"}"><img src="${c.logo}" alt="${c.club} logo"><div><strong>${c.club}</strong><span>${c.region||"Region TBD"} · ${c.detail||""}</span></div></a>`).join("")}</div></article><article class="module-card"><h2>Biggest Movers</h2><p class="subtle">Movement tells the story of who is breaking through.</p><div class="mover-list">${movers.map(m=>`<a class="mover-item" href="${m.url||"#"}"><strong>${m.team}<small class="small"> · ${m.club||""}</small></strong><span>▲ +${m.movement}</span></a>`).join("")}</div></article></section>
    </main>`;
}
renderHomepage2();


