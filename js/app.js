
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
  const hp=window.CPI_HOMEPAGE||{}, hero=hp.hero||{}, headlines=hp.headlines||[], recap=hp.weekendRecap||{}, stories=hp.storyCards||[], fg=hp.featuredGroup||{}, clubs=hp.trendingClubs||[], events=hp.upcomingTournaments||[];
  shell.innerHTML=`<section class="home-hero-2 photo-edition"><article class="photo-hero" style="--hero-image:url('${hero.image}')"><span class="hero-category solid">${hero.label}</span><h1>${hero.title}</h1><p>${hero.summary}</p><div class="hero-actions"><a class="btn" href="${hero.primaryUrl}">${hero.primaryCta} →</a><a class="btn secondary" href="${hero.secondaryUrl}">${hero.secondaryCta}</a></div></article><aside class="photo-headlines"><h2>Latest Headlines</h2>${headlines.map(h=>`<a class="photo-headline" href="${h.url||"#"}"><span class="headline-icon">${h.icon||"•"}</span><span class="headline-tag">${h.tag||"CPI"}</span><strong>${h.title}</strong><span class="arrow">›</span></a>`).join("")}<a class="read-link" href="rankings.html">View all headlines →</a></aside></section><main class="home-shell"><section class="photo-section-grid"><article class="photo-module"><div class="photo-module-title"><div><h2>Weekend Recap</h2><p class="subtle">${recap.event||""}</p></div><a href="tournaments.html">View full recap →</a></div><div class="recap-card-grid">${(recap.cards||[]).map(c=>`<a class="recap-photo-card" href="${c.url||"#"}"><span>${c.division}</span><img src="${c.image}" alt="${c.division}"><div><small>Champion</small><strong>${c.champion}</strong><small>Runner-up</small><em>${c.runnerUp}</em></div></a>`).join("")}</div></article><article class="photo-module"><div class="photo-module-title"><h2>Stories Worth Celebrating</h2><a href="tournaments.html">View all stories</a></div><div class="story-photo-grid">${stories.map(s=>`<a class="story-photo-card" href="${s.url||"#"}"><img src="${s.image}" alt="${s.title}"><div class="story-photo-body"><span>${s.eyebrow}</span><h3>${s.title}</h3><p>${s.summary}</p><b class="read-link">Read Story →</b></div></a>`).join("")}</div></article></section><section class="bottom-dashboard"><article class="photo-module"><div class="photo-module-title"><h2>Featured Group</h2><a href="${fg.url||"14u-boys.html"}">View Hub</a></div><div class="featured-photo-card"><img src="${fg.image}" alt="${fg.name}"><div><h2>${fg.name}</h2><p class="subtle">${fg.summary}</p></div></div><div class="feature-actions"><a href="${fg.url}">🏆<br>Top 5 Teams</a><a href="rankings.html">☷<br>Rankings</a><a href="tournaments.html">▣<br>Tournaments</a><a href="rankings.html">↗<br>Biggest Movers</a></div></article><article class="photo-module"><div class="photo-module-title"><h2>Trending Clubs</h2><a href="clubs.html">View all clubs</a></div><div class="trend-list">${clubs.map(c=>`<a class="trend-row" href="${c.url||"#"}"><img src="${c.logo||"assets/media/frontpage-champions.svg"}" alt="${c.displayName||c.club}"><div><strong>${c.displayName||c.club}</strong><span>${c.rankedTeams||0} ranked teams · Highest: #${c.bestRank||"—"}</span></div><b>${c.positiveMovement? "▲ "+c.positiveMovement : "—"}</b></a>`).join("")}</div></article><article class="photo-module"><div class="photo-module-title"><h2>Upcoming Tournaments</h2><a href="tournaments.html">View all tournaments</a></div><div class="event-list">${events.map(e=>`<a class="event-row" href="${e.url||"#"}"><img src="${e.image}" alt="${e.name}"><div><strong>${e.name}</strong><span>${e.date}</span><span>${e.location}</span></div><div><span class="tier">${e.tier}</span><span>${e.teams}</span></div><span class="preview">Preview →</span></a>`).join("")}</div></article></section></main>`;
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
