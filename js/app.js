
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

  const isLamoA = r.slug === "lamorinda-a";
  const tournamentSourceUrl = r.tournamentSourceUrl || "https://docs.google.com/spreadsheets/d/1zawp4l5ElRiVjjkZwT2WFRnTXKLm7wVZA_cO0dxLAX4/edit?gid=326721462#gid=326721462";
  const record = isLamoA ? "2-4" : (r.latestTournamentRecord || "—");
  const eventRecordDisplay = isLamoA ? "2-4" : record;
  const finalFinish = isLamoA ? "11th" : "—";
  const division = isLamoA ? "Gold Division" : "";
  const bestWin = isLamoA ? "North Irvine A" : (r.bestWinClean || "—");
  const bestWinScore = isLamoA ? "15-8" : (r.bestWinClean?.match(/\((.+)\)/)?.[1] || "");
  const highestOpponent = isLamoA ? "La Jolla United A" : "—";
  const highestOpponentRank = isLamoA ? "#1" : "—";
  const opponentCpi = isLamoA ? "2161.0" : "—";
  const avgOpponentCpi = isLamoA ? "1848.0" : "—";
  const cpiTrend = isLamoA ? "-2" : r.movement;

  const lamoResults = [
    {res:"L", opponent:"La Jolla United A", score:"6 - 22", date:"May 16, 2025", event:"Super Finals", logo:"assets/logos/la-jolla-united.png"},
    {res:"L", opponent:"Newport Beach A", score:"11 - 12", date:"May 16, 2025", event:"Super Finals", logo:"assets/logos/newport-beach.png"},
    {res:"W", opponent:"North Irvine A", score:"15 - 8", date:"May 17, 2025", event:"Super Finals", logo:"assets/logos/north-irvine.png"},
    {res:"L", opponent:"Patriot A", score:"12 - 13", date:"May 17, 2025", event:"Super Finals", logo:"assets/logos/patriot.png"},
    {res:"L", opponent:"OVAC A", score:"12 - 16", date:"May 18, 2025", event:"Super Finals", logo:"assets/logos/ovac.png"},
    {res:"W", opponent:"CC United A", score:"13 - 11", date:"May 18, 2025", event:"Super Finals", logo:"assets/logos/cc-united.png"}
  ];
  const fallbackResults = [
    {res:"W", opponent:bestWin, score:bestWinScore || "—", date:"Latest", event:r.latestTournament, logo:r.logo}
  ];
  const results = isLamoA ? lamoResults : fallbackResults;

  const nearby = rankings
    .filter(x => Math.abs(x.postRank - r.postRank) <= 3)
    .sort((a,b)=>a.postRank-b.postRank)
    .slice(0,6);

  const clubTeams = rankings
    .filter(x => x.clubSlug === r.clubSlug)
    .sort((a,b)=>a.postRank-b.postRank);

  const resultRows = results.map(g=>`<div class="team-pro-result-row">
    <span class="result-pill ${g.res==="W"?"win":"loss"}">${g.res}</span>
    <img class="team-pro-mini-logo" src="${g.logo}" alt="">
    <span class="team-pro-result-team">vs. ${g.opponent}</span>
    <span class="team-pro-result-score ${g.res==="L"?"loss":""}">${g.score}</span>
    <span class="team-pro-result-date">${g.date}<br>${g.event}</span>
  </div>`).join("");

  const rankingRows = nearby.map(x=>`<div class="team-pro-rank-row ${x.slug===r.slug?"current":""}">
    <span class="team-pro-rank-num">${x.postRank}</span>
    <img class="team-pro-mini-logo" src="${x.logo}" alt="">
    <span class="team-pro-rank-team">${x.team}</span>
    <span class="team-pro-rank-cpi">${Number(x.postCPI).toFixed(1)}</span>
    <span class="team-pro-rank-move">${x.movement>0?`<span class="team-pro-up">▲ ${x.movement}</span>`:x.movement<0?`<span class="team-pro-down">▼ ${Math.abs(x.movement)}</span>`:"—"}</span>
  </div>`).join("");

  root.innerHTML = `<div class="team-pro-shell" ${heroStyle(r)}>
    <section class="team-pro-hero" ${heroStyle(r)}>
      <div class="team-pro-inner">
        <div class="team-pro-crumbs">
          <a href="index.html">Home</a> › <a href="clubs.html">Clubs</a> › <a href="${r.clubPage}">${c?.displayName || r.club}</a> › ${r.group} › ${r.team}
        </div>

        <div class="team-pro-hero-grid">
          <img class="team-pro-logo" src="${r.logo}" alt="${r.team} logo">

          <div>
            <h1 class="team-pro-title">${r.team}</h1>
            <div class="team-pro-age">${r.group}</div>

            <div class="team-pro-meta">
              <div class="team-pro-meta-item"><span class="team-pro-icon">C</span><span><span class="team-pro-meta-label">Club</span><span class="team-pro-meta-value">${c?.displayName || r.club}</span></span></div>
              <div class="team-pro-meta-item"><span class="team-pro-icon">📍</span><span><span class="team-pro-meta-label">Region</span><span class="team-pro-meta-value">${r.region || c?.region || "California"}</span></span></div>
              <div class="team-pro-meta-item"><span class="team-pro-icon">↗</span><span><span class="team-pro-meta-label">Club Website</span><span class="team-pro-meta-value">${r.website ? `<a href="${r.website}">Club Website</a>` : "—"}</span></span></div>
            </div>

            <div class="team-pro-update">
              <span>✓ All rankings updated after Futures Super Finals</span>
              
            </div>
          </div>

          <div class="team-pro-metrics">
            <div class="team-pro-metric">
              <span class="team-pro-metric-main">#${r.postRank}</span>
              <span class="team-pro-metric-label">California Rank</span>
              <span class="team-pro-metric-sub">In ${r.group}</span>
              <div class="team-pro-move ${r.movement>0?'up':r.movement<0?'down':'flat'}">${r.movement>0?"▲":r.movement<0?"▼":"—"} ${Math.abs(r.movement || 0)}</div>
              <span class="team-pro-metric-sub">Since Last Update</span>
            </div>

            <div class="team-pro-metric">
              <span class="team-pro-metric-main">${Number(r.postCPI).toFixed(1)}</span>
              <span class="team-pro-metric-label">CPI Rating</span>
              <span class="team-pro-metric-sub">Top tier in California</span>
              <div class="team-pro-rating-bar"><div class="team-pro-rating-fill"></div><div class="team-pro-rating-dot"></div></div>
              <div class="team-pro-scale"><span>1200</span><span>1600</span><span>2000+</span></div>
            </div>

            <div class="team-pro-metric">
              <span class="team-pro-metric-main">${eventRecordDisplay}</span>
              <span class="team-pro-metric-label">Super Finals Record</span>
              <span class="team-pro-metric-sub">(${results.length} Games)</span>
              <span class="team-pro-metric-main" style="font-size:40px;margin-top:20px;">${finalFinish}</span>
              <span class="team-pro-metric-label">Super Finals Finish</span>
              <span class="team-pro-metric-sub">${division}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <nav class="team-pro-tabs">
      <div class="team-pro-tabs-inner">
        <a class="active" href="#overview">Overview</a>
        <a href="#schedule">Schedule</a>
        <a href="#results">Results</a>
        <a href="#statistics">Statistics</a>
        <a href="#roster">Roster</a>
        <a href="#rankings">Rankings</a>
      </div>
    </nav>

    <main class="team-pro-main">
      <section class="team-pro-grid">
        <article id="overview" class="team-pro-card">
          <div class="team-pro-card-head">Team Snapshot</div>
          <div class="team-pro-card-body">
            <div class="team-pro-snapshot-grid">
              <div class="team-pro-stat"><strong>#${r.postRank}</strong><span>California Rank<br>In ${r.group}</span></div>
              <div class="team-pro-stat"><strong>${Number(r.postCPI).toFixed(1)}</strong><span>CPI Rating</span></div>
              <div class="team-pro-stat"><strong>${eventRecordDisplay}</strong><span>Super Finals Record<br>(${results.length} Games)</span></div>
              <div class="team-pro-stat"><strong>${finalFinish}</strong><span>Super Finals Finish<br>${division}</span></div>
              <div class="team-pro-stat"><strong>${avgOpponentCpi}</strong><span>Avg Opponent CPI</span></div>
              <div class="team-pro-stat"><strong>${cpiTrend}</strong><span>CPI Trend<br>Last Update</span></div>
            </div>
          </div>
        </article>

        <article class="team-pro-card">
          <div class="team-pro-card-head">Latest Tournament</div>
          <div class="team-pro-card-body">
            <div class="team-pro-event">
              <div class="team-pro-event-logo">SUPER<br>FINALS</div>
              <div>
                <div class="team-pro-event-title">Futures Super Finals</div>
                <div class="team-pro-event-meta">May 16 - 18, 2025 · Irvine, CA</div>
              </div>
              <span class="team-pro-status">Completed</span>
            </div>

            <div class="team-pro-event-stats">
              <div class="team-pro-event-stat"><strong>${eventRecordDisplay}</strong><span>Record</span></div>
              <div class="team-pro-event-stat"><strong>${finalFinish}</strong><span>Finish<br>${division}</span></div>
              <div class="team-pro-event-stat"><strong>${bestWin}</strong><span>Best Win<br>${bestWinScore}</span></div>
              <div class="team-pro-event-stat"><strong>${highestOpponentRank} ${highestOpponent}</strong><span>Highest Opponent<br>CPI ${opponentCpi}</span></div>
            </div>
            <a class="team-pro-button" href="${tournamentSourceUrl}" target="_blank" rel="noopener noreferrer">View Tournament Details</a>
          </div>
        </article>

        <article class="team-pro-card">
          <div class="team-pro-card-head">Club Context</div>
          <div class="team-pro-card-body">
            <div class="team-pro-context-list">
              <div class="team-pro-context-row"><span class="team-pro-context-label">Teams Ranked (2025)</span><span class="team-pro-context-value">${c?.teamCount || clubTeams.length} Teams</span><span class="team-pro-context-arrow">›</span></div>
              <div class="team-pro-context-row"><span class="team-pro-context-label">Highest Ranked Team (2025)</span><span class="team-pro-context-value">${c?.teams?.[0]?.team || r.team} – #${c?.bestRank || r.postRank}</span><span class="team-pro-context-arrow">›</span></div>
              <div class="team-pro-context-row"><span class="team-pro-context-label">Club Website</span><span class="team-pro-context-value">${r.website ? `<a href="${r.website}">Club Website ↗</a>` : "—"}</span><span class="team-pro-context-arrow">↗</span></div>
            </div>
            <a class="team-pro-outline-button" href="${r.clubPage}">View Club Profile</a>
          </div>
        </article>
      </section>

      <section class="team-pro-lower">
        <article id="results" class="team-pro-card">
          <div class="team-pro-card-head">Recent Results <a href="#">View All Results</a></div>
          <div class="team-pro-card-body">
            <div class="team-pro-result-list">${resultRows}</div>
          </div>
        </article>

        <article id="rankings" class="team-pro-card">
          <div class="team-pro-card-head">Ranking Context (${r.group}) <a href="rankings.html">View Full Rankings</a></div>
          <div class="team-pro-card-body">
            <div class="team-pro-rank-list">${rankingRows}</div>
          </div>
        </article>
      </section>

      <div class="team-pro-footer-note">
        <span>✓ All rankings updated after Futures Super Finals</span>
        
      </div>
    </main>
  </div>`;
}
function renderClubPage(){const root=document.querySelector('#clubProfile');if(!root)return;const c=clubs.find(x=>x.slug===getParam('club'));if(!c){root.innerHTML="<main><section class='panel'><h2>Club not found</h2></section></main>";return}const rows=c.teams.map(t=>`<tr><td><strong class="rank">#${t.postRank}</strong></td><td><a class="team-cell" href="${t.teamPage}">${logo({...t,logo:c.logo},'logo-sm')}${t.team}</a></td><td>${t.group}</td><td>${Number(t.postCPI).toFixed(1)}</td><td><span class="movement ${moveClass(t.movement)}">${moveLabel(t.movement)}</span></td><td>${t.latestTournamentRecord}</td><td>${t.bestWinClean}</td></tr>`).join('');root.innerHTML=`<section class="hero"><div><p class="kicker">Club Profile</p><h1>${c.displayName||c.club}</h1><p>${c.region||'Region TBD'} ${c.website?`· <a href="${c.website}">Official website</a>`:''}</p><span class="club-pill">${c.logoStatus==='verified_by_user'?'Verified branding':'Placeholder branding'}</span></div><aside class="hero-visual" ${heroStyle(c)}><div class="profile-hero-lockup">${logo(c,'logo-xl')}<div class="visual-tag"><span>${c.teamCount} Ranked Team(s)</span><span class="blue">Best Rank</span><span class="gold">#${c.bestRank}</span></div></div></aside></section><main><section class="panel"><div class="table-wrap"><table><thead><tr><th>Rank</th><th>Team</th><th>Group</th><th>CPI</th><th>Move</th><th>Latest Tournament</th><th>Best Win</th></tr></thead><tbody>${rows}</tbody></table></div></section></main>`}
renderGroupOptions();document.querySelector('#search')?.addEventListener('input',renderRankings);document.querySelector('#groupFilter')?.addEventListener('change',renderRankings);renderCards();renderRankings();renderTeamPage();renderClubPage();
