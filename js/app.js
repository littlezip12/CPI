
const rankings=window.CPI_RANKINGS||[],clubs=window.CPI_CLUBS||[],tournaments=window.CPI_TOURNAMENTS||[];
function moveLabel(m){return m>0?`▲ +${m}`:m<0?`▼ ${m}`:"—"}function moveClass(m){return m>0?"up":m<0?"down":"flat"}function getParam(n){return new URLSearchParams(window.location.search).get(n)}
function heroStyle(o){const logoUrl=o.logo?`url('${o.logo}')`:"none";return `style="--club-primary:${o.primaryColor};--club-secondary:${o.secondaryColor};--club-accent:${o.secondaryColor};--club-watermark:${logoUrl};"`}
function logo(o,c="logo-md"){const wrap=c.includes('sm')?'logo-wrap-sm':c.includes('xl')?'logo-wrap-xl':'logo-wrap-md';return `<span class="logo-wrap ${wrap}"><img class="${c}" src="${o.logo}" alt="${o.club||o.displayName||o.team} logo"></span>`}
function teamCard(r){return `<article class="team-card" ${heroStyle(r)}>${logo(r)}<div><div><span class="rank">#${r.postRank}</span> <span class="movement ${moveClass(r.movement)}">${moveLabel(r.movement)}</span></div><h3><a href="${r.teamPage}">${r.team}</a></h3><span class="card-stat-label">Latest Tournament</span><span class="card-stat-value">${r.latestTournamentRecord}</span><p class="small">Best win: ${r.bestWinClean}</p></div></article>`}
function renderCards(){const top=document.querySelector('#topCards');if(top)top.innerHTML=rankings.slice(0,8).map(teamCard).join('');const cc=document.querySelector('#clubCards');if(cc)cc.innerHTML=clubs.filter(c=>c.logoStatus==='verified_by_user').sort((a,b)=>a.bestRank-b.bestRank).slice(0,8).map(c=>`<a class="club-card" ${heroStyle(c)} href="${c.clubPage}">${logo(c)}<strong>${c.displayName}</strong><span>${c.teamCount} ranked team(s) · best rank #${c.bestRank}</span><span class="club-pill">${c.region||'Region TBD'}</span></a>`).join('');const ac=document.querySelector('#allClubCards');if(ac)ac.innerHTML=clubs.map(c=>`<a class="club-card" ${heroStyle(c)} href="${c.clubPage}">${logo(c)}<strong>${c.displayName||c.club}</strong><span>${c.teamCount} ranked team(s) · best rank #${c.bestRank}</span><span class="club-pill">${c.logoStatus==='verified_by_user'?'Verified branding':'Placeholder branding'}</span></a>`).join('');const tc=document.querySelector('#tournamentCards');if(tc)tc.innerHTML=tournaments.map(t=>`<article class="story-card"><h3>${t.name}</h3><p class="subtle">${t.status} · ${t.weightTier}</p><p>${t.notes}</p></article>`).join('')}
function renderGroupOptions(){const f=document.querySelector('#groupFilter');if(!f)return;const gs=[...new Set(rankings.map(r=>r.group))].sort();f.innerHTML=`<option value="">All groups</option>`+gs.map(g=>`<option value="${g}">${g}</option>`).join('')}
function row(r){return `<tr><td><strong class="rank">#${r.postRank}</strong></td><td><a class="team-cell" href="${r.teamPage}">${logo(r,'logo-sm')}${r.team}</a></td><td><a href="${r.clubPage}">${r.displayClubName||r.club}</a></td><td>${r.group}</td><td>${Number(r.postCPI).toFixed(1)}</td><td><span class="movement ${moveClass(r.movement)}">${moveLabel(r.movement)}</span></td><td>${r.latestTournamentRecord}</td><td>${r.bestWinClean}</td></tr>`}
function renderRankings(){const b=document.querySelector('#rankingsBody');if(!b)return;const q=(document.querySelector('#search')?.value||'').toLowerCase(),g=document.querySelector('#groupFilter')?.value||'';const f=rankings.filter(r=>`${r.team} ${r.club} ${r.displayClubName||''}`.toLowerCase().includes(q)&&(!g||r.group===g));b.innerHTML=f.map(row).join('');const c=document.querySelector('#count');if(c)c.textContent=`${f.length} teams`}
function renderTeamPage(){const root=document.querySelector('#teamProfile');if(!root)return;const r=rankings.find(x=>x.slug===getParam('team'));if(!r){root.innerHTML="<main><section class='panel'><h2>Team not found</h2></section></main>";return}const c=clubs.find(x=>x.slug===r.clubSlug);root.innerHTML=`<section class="hero"><div><p class="kicker">Team Profile · ${r.group}</p><h1>${r.team}</h1><p><a href="${r.clubPage}">${c?.displayName||r.club}</a> profile with CPI rank and tournament context.</p><span class="club-pill">${c?.region||'Region TBD'}</span></div><aside class="hero-visual" ${heroStyle(r)}><div class="profile-hero-lockup">${logo(r,'logo-xl')}<div><div class="profile-rank">#${r.postRank}</div><div class="visual-tag"><span>CPI ${Number(r.postCPI).toFixed(1)}</span><span>${moveLabel(r.movement)}</span></div></div></div></aside></section><main><section class="panel"><h2>Latest Tournament</h2><div class="profile-kpi-grid"><div class="profile-kpi"><strong>${r.latestTournamentRecord}</strong><span>${r.latestTournament} record</span></div><div class="profile-kpi"><strong>${r.bestWinClean}</strong><span>Best win</span></div><div class="profile-kpi"><strong>${Number(r.postCPI).toFixed(1)}</strong><span>CPI Rating</span></div><div class="profile-kpi"><strong>${moveLabel(r.movement)}</strong><span>Movement</span></div></div></section></main>`}
function renderClubPage(){
  const root = document.querySelector("#clubProfile");
  if(!root) return;
  const c = clubs.find(x=>x.slug===getParam("club"));
  if(!c){root.innerHTML="<main><section class='panel'><h2>Club not found</h2></section></main>";return;}

  const teams = [...c.teams].sort((a,b)=>a.postRank-b.postRank);
  const bestTeam = teams[0];
  const avgCpi = Number(c.avgCPI || (teams.reduce((sum,t)=>sum+Number(t.postCPI||0),0)/Math.max(teams.length,1))).toFixed(1);
  const tournamentRecords = teams.map(t=>t.latestTournamentRecord).filter(Boolean);
  const rankedCards = teams.slice(0,6).map(t=>`<a class="club-team-card" ${heroStyle(c)} href="${t.teamPage}">
    <span class="rank">#${t.postRank}</span>
    <span class="club-team-card-title">${t.team}</span>
    <span class="club-team-card-meta">${t.group} · CPI ${Number(t.postCPI).toFixed(1)}</span>
    <span class="club-team-card-meta">Latest tournament: ${t.latestTournamentRecord}</span>
  </a>`).join("");

  const rows = teams.map(t=>`<tr>
    <td><strong class="rank">#${t.postRank}</strong></td>
    <td><a class="team-cell" href="${t.teamPage}">${logo({...t, logo:c.logo},"logo-sm")}${t.team}</a></td>
    <td>${t.group}</td>
    <td>${Number(t.postCPI).toFixed(1)}</td>
    <td><span class="movement ${moveClass(t.movement)}">${moveLabel(t.movement)}</span></td>
    <td>${t.latestTournamentRecord}</td>
    <td>${t.bestWinClean}</td>
  </tr>`).join("");

  root.innerHTML = `<section class="hero">
    <div class="club-title-lockup">
      <p class="kicker">Club Experience</p>
      <h1>${c.displayName||c.club}</h1>
      <div class="club-title-small">${c.region||"California"} Water Polo</div>
      <p>Current CPI profile for ${c.displayName||c.club}, including ranked teams, latest tournament context, and club-level navigation.</p>
      <div class="club-meta-row">
        <span class="club-meta-chip">${c.region||"Region TBD"}</span>
        <span class="club-meta-chip">${c.logoStatus==="verified_by_user"?"Verified Branding":"Placeholder Branding"}</span>
        ${c.website?`<a class="club-meta-chip" href="${c.website}">Official Website →</a>`:""}
      </div>
    </div>
    <aside class="hero-visual" ${heroStyle(c)}>
      <div class="club-hero-logo-stack">
        ${logo(c,"logo-xl")}
        <div>
          <div class="club-hero-stat">#${c.bestRank}</div>
          <span class="club-hero-stat-label">Highest Ranked Team</span>
          <div class="visual-tag" style="margin-top:18px;"><span>${c.teamCount} Ranked Team(s)</span><span class="gold">Avg CPI ${avgCpi}</span></div>
        </div>
      </div>
    </aside>
  </section>

  <nav class="club-quick-nav">
    <a href="#snapshot">Snapshot</a>
    <a href="#teams">Teams</a>
    <a href="#tournament">Tournament</a>
    <a href="#details">Details</a>
  </nav>

  <main class="club-experience-main">
    <section id="snapshot" class="panel" ${heroStyle(c)}>
      <div class="section-head" style="margin-top:0;">
        <div>
          <h2>Club Snapshot</h2>
          <p class="subtle">A quick read on the club's current CPI footprint.</p>
        </div>
      </div>
      <div class="club-snapshot-grid">
        <div class="club-snapshot-card"><span>Ranked Teams</span><strong>${c.teamCount}</strong></div>
        <div class="club-snapshot-card"><span>Highest Ranked</span><strong>#${c.bestRank}</strong></div>
        <div class="club-snapshot-card"><span>Best Team</span><strong>${bestTeam ? bestTeam.team : "—"}</strong></div>
        <div class="club-snapshot-card"><span>Average CPI</span><strong>${avgCpi}</strong></div>
      </div>
    </section>

    <div class="club-section-grid" style="margin-top:18px;">
      <section id="teams" class="panel" ${heroStyle(c)}>
        <div class="section-head" style="margin-top:0;">
          <div>
            <h2>Current Ranked Teams</h2>
            <p class="subtle">Teams currently represented in the CPI dataset.</p>
          </div>
        </div>
        <div class="club-team-grid">${rankedCards || "<p>No ranked teams available.</p>"}</div>
      </section>

      <aside id="details" class="club-feature-panel" ${heroStyle(c)}>
        <h3>Club Details</h3>
        <div class="club-feature-list">
          <div class="club-feature-item"><span>Region</span><strong>${c.region||"Region TBD"}</strong></div>
          <div class="club-feature-item"><span>Branding</span><strong>${c.logoStatus==="verified_by_user"?"Verified":"Placeholder"}</strong></div>
          <div class="club-feature-item"><span>Website</span><strong>${c.website?`<a href="${c.website}">Open</a>`:"—"}</strong></div>
          <div class="club-feature-item"><span>Primary / Secondary</span><strong>${c.primaryColor} / ${c.secondaryColor}</strong></div>
        </div>
        <div class="club-color-dots">
          <span class="club-color-dot" style="background:${c.primaryColor}"></span>
          <span class="club-color-dot" style="background:${c.secondaryColor}"></span>
        </div>
      </aside>
    </div>

    <section id="tournament" class="club-feature-panel club-table-panel" ${heroStyle(c)}>
      <h3>Latest Tournament Context</h3>
      <div class="club-feature-list">
        <div class="club-feature-item"><span>Tracked Event</span><strong>${bestTeam ? bestTeam.latestTournament : "—"}</strong></div>
        <div class="club-feature-item"><span>Top Current Team</span><strong>${bestTeam ? `${bestTeam.team} (#${bestTeam.postRank})` : "—"}</strong></div>
        <div class="club-feature-item"><span>Records Represented</span><strong>${tournamentRecords.length ? tournamentRecords.join(", ") : "—"}</strong></div>
      </div>
    </section>

    <section class="panel club-table-panel">
      <div class="section-head" style="margin-top:0;">
        <div>
          <h2>All Ranked Teams</h2>
          <p class="subtle">Full current CPI table for this club.</p>
        </div>
      </div>
      <div class="table-wrap"><table><thead><tr><th>Rank</th><th>Team</th><th>Group</th><th>CPI</th><th>Move</th><th>Latest Tournament</th><th>Best Win</th></tr></thead><tbody>${rows}</tbody></table></div>
    </section>
  </main>`;
}

function initCPI(){
  try {
    console.log("CPI app.js loaded — Sprint B.1 render reset");
    renderGroupOptions();
    document.querySelector("#search")?.addEventListener("input", renderRankings);
    document.querySelector("#groupFilter")?.addEventListener("change", renderRankings);
    renderCards();
    renderRankings();
    renderTeamPage();
    renderClubPage();
  } catch (err) {
    console.error("CPI render failed", err);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCPI);
} else {
  initCPI();
}
