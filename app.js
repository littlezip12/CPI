
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
  const hp=window.CPI_HOMEPAGE||{}, hero=hp.hero||{}, headlines=hp.headlines||[], storyCards=hp.storyCards||[], championStrip=hp.championStrip||[], recap=hp.weekendRecap||{}, fg=hp.featuredGroup||{}, trending=hp.trendingClubs||[], movers=hp.biggestMovers||[], tournament=hp.tournamentSpotlight||{};
  const art=(s)=> s.imageType==="generated" ? `<div class="dynamic-story-art generated" style="background-image:url('${s.image||"assets/media/frontpage-champions.svg"}')"></div>` : `<div class="dynamic-story-art"><img src="${s.logo||"assets/media/frontpage-champions.svg"}" alt="${s.title}"></div>`;
  shell.innerHTML=`
    <section class="champion-strip"><div class="champion-strip-inner"><div class="champion-label">Latest Signals</div>${championStrip.map(c=>`<a class="champion-item" href="${c.url||"#"}"><span>${c.division}</span><strong>${c.team}</strong></a>`).join("")}</div></section>

    <section class="home-hero-2 editorial">
      <article class="hero-lead-card media-hero editorial-hero" style="--hero-image:url('${hero.image||"assets/media/frontpage-superfinals.svg"}')">
        <div><span class="hero-category">${hero.label||"Dynamic Homepage"}</span><h1>${hero.title||"CPI turns rankings into stories"}</h1><p>${hero.summary||""}</p><div class="editorial-meta"><span>Every Match Matters</span><span>Every Team Has a Story</span><span>Data-driven</span></div><div class="hero-actions"><a class="btn" href="${hero.primaryUrl||"rankings.html"}">${hero.primaryCta||"View Rankings"}</a><a class="btn secondary" href="${hero.secondaryUrl||"tournaments.html"}">${hero.secondaryCta||"Tournament Center"}</a></div></div>
        <div><div class="club-pill">Stories now generated from rankings, movement, and club momentum.</div><div class="image-credit">${hero.imageCredit||"CPI generated artwork"}</div></div>
      </article>
      <aside class="headlines-panel editorial-feed"><h2>Latest Headlines</h2><div class="headline-list">${headlines.map(h=>`<a class="headline-item" href="${h.url||"#"}"><span class="headline-tag">${h.tag||"CPI"}</span><span class="headline-title">${h.title}<em class="headline-time">${h.time||""}</em></span></a>`).join("")}</div></aside>
    </section>

    <main class="home-shell">
      <section class="dynamic-story-grid">${storyCards.map(s=>`<a class="dynamic-story-card" href="${s.url||"#"}">${art(s)}<div class="dynamic-story-body"><span class="dynamic-tag">${s.eyebrow||s.tag||"Story"}</span><h3>${s.title}</h3><p>${s.summary}</p></div></a>`).join("")}</section>

      <section class="home-grid-2">
        <article class="module-card"><h2>Weekend Recap</h2><p class="subtle">${recap.event||"Latest Tournament"} · ${recap.primaryGroup||""}</p><div class="recap-modern"><div class="recap-modern-card"><h3>Boys Recap</h3><div class="recap-stat"><span>Champion</span><strong>${recap.boys?.champion||"Coming soon"}</strong></div><div class="recap-stat"><span>Runner-up</span><strong>${recap.boys?.runnerUp||"To be updated"}</strong></div><div class="recap-stat"><span>MVP</span><strong>${recap.boys?.mvp||"Coming soon"}</strong></div><div class="recap-stat"><span>Biggest mover</span><strong>${recap.boys?.biggestMover||"Coming soon"}</strong></div></div><div class="recap-modern-card"><h3>Girls Recap</h3><div class="recap-stat"><span>Champion</span><strong>${recap.girls?.champion||"Coming soon"}</strong></div><div class="recap-stat"><span>Runner-up</span><strong>${recap.girls?.runnerUp||"Coming soon"}</strong></div><div class="recap-stat"><span>MVP</span><strong>${recap.girls?.mvp||"Coming soon"}</strong></div><div class="recap-stat"><span>Biggest mover</span><strong>${recap.girls?.biggestMover||"Coming soon"}</strong></div></div></div></article>
        <article class="module-card"><span class="hero-category">${tournament.label||"Tournament Spotlight"}</span><h2>${tournament.name||"Tournament Center"}</h2><p class="subtle">${tournament.summary||""}</p><div class="tournament-stats"><div class="tournament-stat"><span>Champion</span><strong>${tournament.champion||"Pending"}</strong></div><div class="tournament-stat"><span>Division Story</span><strong>${tournament.divisionStory||"Pending"}</strong></div><div class="tournament-stat"><span>Biggest Mover</span><strong>${tournament.biggestMover||"Pending"}</strong></div><div class="tournament-stat"><span>Next</span><strong>Tournament Hub</strong></div></div><div class="hero-actions"><a class="btn" href="${tournament.url||"tournaments.html"}">Read Tournament →</a></div></article>
      </section>

      <section class="module-card featured-group-panel"><div class="section-head" style="margin:0 0 10px;"><div><h2>Featured Group: ${fg.name||"14U Boys"}</h2><p class="subtle">${fg.summary||""}</p></div><a class="btn" href="${fg.url||"rankings.html"}">Open Hub</a></div><div class="featured-split"><div class="featured-metrics"><div class="featured-metric"><strong>${fg.teamsTracked||0}</strong><span>Teams tracked</span></div><div class="featured-metric"><strong>${fg.clubsTracked||0}</strong><span>Clubs represented</span></div><div class="featured-metric"><strong>${fg.currentOne||"—"}</strong><span>Current #1</span></div><div class="featured-metric"><strong>${(fg.biggestMovers||[])[0]?.team||"—"}</strong><span>Top mover</span></div></div><div class="rank-strip">${(fg.topTeams||[]).slice(0,5).map(r=>`<a class="rank-tile" href="${r.teamPage||"#"}"><span class="rank">#${r.postRank}</span><strong>${r.team}</strong><p class="small">CPI ${Number(r.postCPI||0).toFixed(1)}</p></a>`).join("")}</div></div></section>

      <section class="home-grid-2">
        <article class="module-card"><h2>Trending Clubs</h2><div class="trending-club-list">${trending.map(c=>`<a class="club-insight" href="${c.url||"#"}"><img src="${c.logo||"assets/media/frontpage-champions.svg"}" alt="${c.displayName||c.club}"><div><strong>${c.displayName||c.club}</strong><span>${c.story||""}</span></div><b>${c.rankedTeams||0} teams</b></a>`).join("")}</div></article>
        <article class="module-card"><h2>Biggest Movers</h2><p class="subtle">Movement tells the story of who is breaking through.</p><div class="mover-list">${movers.map(m=>`<a class="mover-item" href="${m.url||"#"}"><strong>${m.team}<small class="small"> · ${m.club||""}</small></strong><span>▲ +${m.movement}</span></a>`).join("")}</div></article>
      </section>
    </main>`;
}
renderHomepage2();





function renderGroupHub(){
  const root=document.querySelector("#groupHub"); if(!root) return;
  const group=root.dataset.group, hubs=window.CPI_GROUP_HUBS||[], hub=hubs.find(h=>h.group===group)||hubs[0];
  if(!hub){root.innerHTML="<main><section class='panel'><h2>Group hub unavailable</h2></section></main>";return;}
  const allLinks=hubs.map(h=>`<a class="group-nav-card" href="${h.file}"><strong>${h.group}</strong><span>${h.status}</span></a>`).join("");
  const modules=(hub.modules||[]).map(m=>`<div class="profile-kpi"><strong>${m.value}</strong><span>${m.label}</span></div>`).join("");
  const top=(hub.topTeams||[]).slice(0,10).map(t=>`<a class="hub-list-item" href="${t.teamPage||"rankings.html"}"><div><strong>${t.team}</strong><span>${t.club||""} · CPI ${Number(t.postCPI||0).toFixed(1)}</span></div><b class="hub-rank">#${t.postRank}</b></a>`).join("");
  const movers=(hub.biggestMovers||[]).slice(0,6).map(t=>`<a class="hub-list-item" href="${t.teamPage||"rankings.html"}"><div><strong>${t.team}</strong><span>${t.club||""}</span></div><b class="movement up">▲ +${t.movement||0}</b></a>`).join("");
  root.innerHTML=`<section class="group-hub-hero"><article class="group-hub-hero-card"><div><span class="hero-category">${hub.heroLabel}</span><h1>${hub.heroTitle}</h1><p>${hub.heroSummary}</p><div class="hero-actions"><a class="btn" href="rankings.html">View Rankings</a><a class="btn secondary" href="clubs.html">Explore Clubs</a></div></div><div class="club-pill">Group-specific coverage for the teams you care about most.</div></article><aside class="module-card"><h2>Group Snapshot</h2><div class="profile-kpi-grid">${modules}</div></aside></section><section class="group-nav-grid">${allLinks}</section><main class="hub-shell"><section class="hub-grid"><article class="hub-story-card"><span class="hero-category">${hub.topStory?.eyebrow||"Top Story"}</span><h2>${hub.topStory?.title||hub.group}</h2><p class="subtle">${hub.topStory?.summary||""}</p><div class="hero-actions"><a class="btn" href="${hub.topStory?.url||"rankings.html"}">Read More →</a></div></article><article class="module-card"><h2>Biggest Movers</h2><div class="hub-list">${movers||"<p class='subtle'>Movers will populate when rankings data is available.</p>"}</div></article></section><section class="module-card featured-group-panel"><div class="section-head" style="margin:0 0 10px;"><div><h2>${hub.group} Top 10</h2><p class="subtle">A group-specific view keeps families, players, and coaches focused on the division they care about.</p></div><a class="btn" href="rankings.html">All Rankings</a></div><div class="hub-list">${top||"<p class='subtle'>Rankings will populate when this group is loaded.</p>"}</div></section></main>`;
}
renderGroupHub();
