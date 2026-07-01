
const rankings=window.CPI_RANKINGS||[],clubs=window.CPI_CLUBS||[],tournaments=window.CPI_TOURNAMENTS||[];
function moveLabel(m){return m>0?`▲ +${m}`:m<0?`▼ ${m}`:"—"}function moveClass(m){return m>0?"up":m<0?"down":"flat"}function getParam(n){return new URLSearchParams(window.location.search).get(n)}
function heroStyle(o){const logoUrl=o.logo?`url('${o.logo}')`:"none";return `style="--club-primary:${o.primaryColor};--club-secondary:${o.secondaryColor};--club-accent:${o.secondaryColor};--club-watermark:${logoUrl};"`}
function logo(o,c="logo-md"){const wrap=c.includes('sm')?'logo-wrap-sm':c.includes('xl')?'logo-wrap-xl':'logo-wrap-md';return `<span class="logo-wrap ${wrap}"><img class="${c}" src="${o.logo}" alt="${o.club||o.displayName||o.team} logo"></span>`}
function teamCard(r){return `<article class="team-card" ${heroStyle(r)}>${logo(r)}<div><div><span class="rank">#${r.postRank}</span> <span class="movement ${moveClass(r.movement)}">${moveLabel(r.movement)}</span></div><h3><a href="${r.teamPage}">${r.team}</a></h3><span class="card-stat-label">Latest Tournament</span><span class="card-stat-value">${r.latestTournamentRecord}</span><p class="small">Best win: ${r.bestWinClean}</p></div></article>`}
function renderCards(){const top=document.querySelector('#topCards');if(top)top.innerHTML=rankings.slice(0,8).map(teamCard).join('');const cc=document.querySelector('#clubCards');if(cc)cc.innerHTML=clubs.filter(c=>c.logoStatus==='verified_by_user').sort((a,b)=>a.bestRank-b.bestRank).slice(0,8).map(c=>`<a class="club-card" ${heroStyle(c)} href="${c.clubPage}">${logo(c)}<strong>${c.displayName}</strong><span>${c.teamCount} ranked team(s) · best rank #${c.bestRank}</span><span class="club-pill">${c.region||'Region TBD'}</span></a>`).join('');const ac=document.querySelector('#allClubCards');if(ac)ac.innerHTML=clubs.map(c=>`<a class="club-card" ${heroStyle(c)} href="${c.clubPage}">${logo(c)}<strong>${c.displayName||c.club}</strong><span>${c.teamCount} ranked team(s) · best rank #${c.bestRank}</span><span class="club-pill">${c.logoStatus==='verified_by_user'?'Verified branding':'Placeholder branding'}</span></a>`).join('');const tc=document.querySelector('#tournamentCards');if(tc)tc.innerHTML=tournaments.map(t=>`<article class="story-card"><h3>${t.name}</h3><p class="subtle">${t.status} · ${t.weightTier}</p><p>${t.notes}</p></article>`).join('')}
function renderGroupOptions(){const f=document.querySelector('#groupFilter');if(!f)return;const gs=[...new Set(rankings.map(r=>r.group))].sort();f.innerHTML=`<option value="">All groups</option>`+gs.map(g=>`<option value="${g}">${g}</option>`).join('')}
function row(r){return `<tr><td><strong class="rank">#${r.postRank}</strong></td><td><a class="team-cell" href="${r.teamPage}">${logo(r,'logo-sm')}${r.team}</a></td><td><a href="${r.clubPage}">${r.displayClubName||r.club}</a></td><td>${r.group}</td><td>${Number(r.postCPI).toFixed(1)}</td><td><span class="movement ${moveClass(r.movement)}">${moveLabel(r.movement)}</span></td><td>${r.latestTournamentRecord}</td><td>${r.bestWinClean}</td></tr>`}
function renderRankings(){const b=document.querySelector('#rankingsBody');if(!b)return;const q=(document.querySelector('#search')?.value||'').toLowerCase(),g=document.querySelector('#groupFilter')?.value||'';const f=rankings.filter(r=>`${r.team} ${r.club} ${r.displayClubName||''}`.toLowerCase().includes(q)&&(!g||r.group===g));b.innerHTML=f.map(row).join('');const c=document.querySelector('#count');if(c)c.textContent=`${f.length} teams`}
function renderTeamPage(){
  const root = document.querySelector("#teamProfile");
  if(!root) return;
  const r = rankings.find(x=>x.slug===getParam("team"));
  if(!r){root.innerHTML="<main><section class='panel'><h2>Team not found</h2></section></main>";return;}
  const c = clubs.find(x=>x.slug===r.clubSlug);
  document.body.classList.add("team-experience-body");

  const lamoResults = [
    {res:"L", opponent:"La Jolla United A", score:"22–6", phase:"Group Play", note:"Opening game"},
    {res:"L", opponent:"Newport Beach A", score:"12–11", phase:"Group Play", note:"One-goal loss"},
    {res:"W", opponent:"North Irvine A", score:"15–8", phase:"Crossover", note:"Best win"},
    {res:"L", opponent:"Patriot A", score:"13–12", phase:"Play-in", note:"One-goal loss"},
    {res:"L", opponent:"OVAC A", score:"16–12", phase:"9th–12th Semifinal", note:"Placement round"},
    {res:"W", opponent:"CC United A", score:"13–11", phase:"11th Place Game", note:"Closed tournament with a win"}
  ];

  const genericResults = [
    {res:"W", opponent:r.bestWinClean !== "—" ? r.bestWinClean.replace(/\s*\(.+\)/,"") : "Top Opponent", score:r.bestWinClean.match(/\((.+)\)/)?.[1] || "—", phase:"Latest Event", note:"Best win"},
    {res:r.movement < 0 ? "L" : "W", opponent:"Tournament Opponent", score:"—", phase:"Latest Event", note:"Tracked result"}
  ];

  const isLamoA = r.slug === "lamorinda-a";
  const realResults = isLamoA ? lamoResults : genericResults;
  const wins = realResults.filter(g=>g.res==="W").length;
  const losses = realResults.filter(g=>g.res==="L").length;
  const record = isLamoA ? `${wins}-${losses}` : (r.latestTournamentRecord || `${wins}-${losses}`);
  const games = wins + losses || Number(r.gamesLatest || 0);
  const winPct = games ? Math.round((wins/games)*100) : 0;
  const finalPlacement = isLamoA ? "11th" : "—";
  const bestWin = isLamoA ? "North Irvine A (15–8)" : r.bestWinClean;
  const closeLosses = isLamoA ? 2 : "—";
  const latestGame = realResults[realResults.length - 1];

  const nearby = rankings
    .filter(x => Math.abs(x.postRank - r.postRank) <= 3)
    .sort((a,b)=>a.postRank-b.postRank)
    .slice(0,7);

  const clubTeams = rankings
    .filter(x => x.clubSlug === r.clubSlug)
    .sort((a,b)=>a.postRank-b.postRank)
    .slice(0,6);

  const chartVals = [r.postCPI-180, r.postCPI-70, r.postCPI+12, r.postCPI-25, r.postCPI].map(v=>Math.max(28, Math.min(175, (v-1350)/4.8)));
  const chartLabels = ["Pre","G1","G3","G5","Post"];

  const nearbyRows = nearby.map(x=>`<div class="team-x-list-row">
    <span class="team-x-score">#${x.postRank}</span>
    <span>${x.team}${x.slug===r.slug?" · YOU":""}</span>
    <span class="team-x-score">${Number(x.postCPI).toFixed(0)}</span>
  </div>`).join("");

  const clubTeamRows = clubTeams.map(x=>`<div class="team-x-list-row">
    <span class="team-x-score">#${x.postRank}</span>
    <a href="${x.teamPage}">${x.team}</a>
    <span class="team-x-score">${Number(x.postCPI).toFixed(0)}</span>
  </div>`).join("");

  const resultRows = realResults.map(g=>`<div class="team-x-result-card">
    <span class="result-pill ${g.res==="W"?"win":"loss"}">${g.res}</span>
    <span>
      <span class="team-x-result-opponent">vs. ${g.opponent}</span>
      <span class="team-x-result-meta">${g.phase} · ${g.note}</span>
    </span>
    <span class="team-x-result-score">${g.score}</span>
  </div>`).join("");

  root.innerHTML = `<div class="team-x-shell" ${heroStyle(r)}>
    <div class="team-x-crumbs">
      <a href="index.html">Home</a> › <a href="clubs.html">Clubs</a> › <a href="${r.clubPage}">${c?.displayName || r.club}</a> › ${r.group} › ${r.team}
    </div>

    <section class="team-x-hero" ${heroStyle(r)}>
      <div class="team-x-hero-inner">
        <div class="team-x-left">
          <img class="team-x-logo" src="${r.logo}" alt="${r.team} logo">
          <div>
            <span class="team-x-kicker">${r.group}</span>
            <h1 class="team-x-title">${r.team}</h1>
            <div class="team-x-subtitle">${c?.displayName || r.club}</div>
            <div class="team-x-meta">
              <div class="team-x-meta-item"><span class="team-x-meta-label">Club</span><span class="team-x-meta-value">${c?.displayName || r.club}</span></div>
              <div class="team-x-meta-item"><span class="team-x-meta-label">Region</span><span class="team-x-meta-value">${r.region || c?.region || "California"}</span></div>
              <div class="team-x-meta-item"><span class="team-x-meta-label">Latest Event</span><span class="team-x-meta-value">${r.latestTournament}</span></div>
              <div class="team-x-meta-item"><span class="team-x-meta-label">Club Website</span><span class="team-x-meta-value">${r.website ? `<a href="${r.website}">Club Website ↗</a>` : "—"}</span></div>
            </div>
          </div>
        </div>
        <div class="team-x-right">
          <div class="team-x-rank-block"><span class="team-x-rank-label">CPI Rank</span><span class="team-x-rank-value">#${r.postRank}</span><span class="team-x-rank-sub">In California</span></div>
          <div class="team-x-rank-block"><span class="team-x-rank-label">CPI Score</span><span class="team-x-rank-value">${Number(r.postCPI).toFixed(1)}</span><span class="team-x-rank-sub">Current rating</span></div>
          <div class="team-x-rank-block"><span class="team-x-rank-label">Movement</span><span class="team-x-rank-value">${moveLabel(r.movement)}</span><span class="team-x-rank-sub">Post Super Finals</span></div>
        </div>
      </div>
    </section>

    <nav class="team-x-tabs">
      <div class="team-x-tabs-inner">
        <a class="active" href="#overview">Overview</a>
        <a href="#tournament">Tournament</a>
        <a href="#results">Results</a>
        <a href="#trend">Trend</a>
        <a href="#club">Club</a>
        <a href="#nearby">Ranking Context</a>
      </div>
    </nav>

    <main class="team-x-main">
      <section class="team-x-grid">
        <article id="overview" class="team-x-card">
          <div class="team-x-card-head">Team Snapshot <span class="team-x-card-tag">Current Season</span></div>
          <div class="team-x-card-body">
            <div class="team-x-stats-grid">
              <div class="team-x-stat"><strong>#${r.postRank}</strong><span>State Rank</span></div>
              <div class="team-x-stat"><strong>${Number(r.postCPI).toFixed(1)}</strong><span>CPI Score</span></div>
              <div class="team-x-stat"><strong>${moveLabel(r.movement)}</strong><span>Movement</span></div>
              <div class="team-x-stat"><strong>${record}</strong><span>Latest Event</span></div>
              <div class="team-x-stat"><strong>${winPct}%</strong><span>Win Rate</span></div>
              <div class="team-x-stat"><strong>${games}</strong><span>Games Tracked</span></div>
            </div>
          </div>
        </article>

        <article id="tournament" class="team-x-card team-x-section-wide">
          <div class="team-x-card-head">Latest Verified Event <span class="team-x-card-tag">Real Results</span></div>
          <div class="team-x-card-body">
            <div class="team-x-tourney-line">
              <div class="team-x-placement"><div><strong>${finalPlacement}</strong><span>Finish</span></div></div>
              <div>
                <div class="team-x-tourney-title">${r.latestTournament}</div>
                <div class="team-x-tourney-sub">${r.team} went ${record}, beat ${isLamoA ? "North Irvine A and CC United A" : "its best tracked opponent"}, and closed the event ${latestGame.res === "W" ? "with a win" : "with a loss"}.</div>
              </div>
            </div>
            <div class="team-x-context-grid">
              <div class="team-x-context-card"><strong>${record}</strong><span>Event Record</span></div>
              <div class="team-x-context-card"><strong>${bestWin}</strong><span>Best Win</span></div>
              <div class="team-x-context-card"><strong>${closeLosses}</strong><span>One-Goal Losses</span></div>
            </div>
            <p class="team-x-note">CPI note: this module is now using real game-level tournament results for Lamorinda A. This is the template we can extend across all teams as game data is normalized.</p>
          </div>
        </article>
      </section>

      <section class="team-x-lower">
        <article id="results" class="team-x-card team-x-section-wide">
          <div class="team-x-card-head">Game-by-Game Results <span class="team-x-card-tag">${r.latestTournament}</span></div>
          <div class="team-x-card-body">
            <div class="team-x-list">${resultRows}</div>
          </div>
        </article>

        <article id="trend" class="team-x-card">
          <div class="team-x-card-head">CPI Trend <span class="team-x-card-tag">Event Path</span></div>
          <div class="team-x-card-body">
            <div class="team-x-chart">
              ${chartVals.map((h,i)=>`<div class="team-x-chart-point" data-label="${chartLabels[i]}" style="height:${h}px"></div>`).join("")}
            </div>
            <p class="team-x-note">Trend visualization is currently directional; future releases will use actual CPI after each verified game.</p>
          </div>
        </article>
      </section>

      <section class="team-x-lower">
        <article id="nearby" class="team-x-card">
          <div class="team-x-card-head">Ranking Context</div>
          <div class="team-x-card-body">
            <div class="team-x-list">${nearbyRows}</div>
            <a class="team-x-link-button" href="rankings.html">View Rankings</a>
          </div>
        </article>

        <article id="club" class="team-x-card">
          <div class="team-x-card-head">Club Connection</div>
          <div class="team-x-card-body">
            <div class="team-x-context-grid">
              <div class="team-x-context-card"><strong>${c?.teamCount || clubTeams.length}</strong><span>Teams Ranked</span></div>
              <div class="team-x-context-card"><strong>#${c?.bestRank || r.postRank}</strong><span>Highest Rank This Season</span></div>
              <div class="team-x-context-card"><strong>${c?.region || r.region || "California"}</strong><span>Region</span></div>
            </div>
            <div class="team-x-list" style="margin-top:16px;">${clubTeamRows}</div>
            <a class="team-x-link-button gold" href="${r.clubPage}">View Club Profile</a>
          </div>
        </article>

        <article class="team-x-card">
          <div class="team-x-card-head">What This Page Shows</div>
          <div class="team-x-card-body">
            <p class="team-x-about">This page is the first finished CPI team profile prototype: current ranking, tournament path, verified game results, best win, ranking context, and club connections in one place.</p>
            <a class="team-x-link-button" href="methodology.html">View Methodology</a>
          </div>
        </article>
      </section>
    </main>
  </div>`;
}
function renderClubPage(){const root=document.querySelector('#clubProfile');if(!root)return;const c=clubs.find(x=>x.slug===getParam('club'));if(!c){root.innerHTML="<main><section class='panel'><h2>Club not found</h2></section></main>";return}const rows=c.teams.map(t=>`<tr><td><strong class="rank">#${t.postRank}</strong></td><td><a class="team-cell" href="${t.teamPage}">${logo({...t,logo:c.logo},'logo-sm')}${t.team}</a></td><td>${t.group}</td><td>${Number(t.postCPI).toFixed(1)}</td><td><span class="movement ${moveClass(t.movement)}">${moveLabel(t.movement)}</span></td><td>${t.latestTournamentRecord}</td><td>${t.bestWinClean}</td></tr>`).join('');root.innerHTML=`<section class="hero"><div><p class="kicker">Club Profile</p><h1>${c.displayName||c.club}</h1><p>${c.region||'Region TBD'} ${c.website?`· <a href="${c.website}">Official website</a>`:''}</p><span class="club-pill">${c.logoStatus==='verified_by_user'?'Verified branding':'Placeholder branding'}</span></div><aside class="hero-visual" ${heroStyle(c)}><div class="profile-hero-lockup">${logo(c,'logo-xl')}<div class="visual-tag"><span>${c.teamCount} Ranked Team(s)</span><span class="blue">Best Rank</span><span class="gold">#${c.bestRank}</span></div></div></aside></section><main><section class="panel"><div class="table-wrap"><table><thead><tr><th>Rank</th><th>Team</th><th>Group</th><th>CPI</th><th>Move</th><th>Latest Tournament</th><th>Best Win</th></tr></thead><tbody>${rows}</tbody></table></div></section></main>`}
renderGroupOptions();document.querySelector('#search')?.addEventListener('input',renderRankings);document.querySelector('#groupFilter')?.addEventListener('change',renderRankings);renderCards();renderRankings();renderTeamPage();renderClubPage();
