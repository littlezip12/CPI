(function(){
  const TEAM_DATA = window.CPI_TEAM_PAGES_2026_14U_BOYS || {};
  const RANK_DATA = window.CPI_QA_RANKINGS_2026_14U_BOYS || {};
  const BRANDING = window.CPI_CLUB_BRANDING || {};
  const $ = (id) => document.getElementById(id);

  const slugify = (v) => String(v || "").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || "unknown";
  const fmt = (v) => (v === null || v === undefined || v === "" ? "—" : v);
  const number = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const initials = (name) => {
    const parts = String(name || "CPI").match(/[A-Za-z0-9]+/g) || ["CPI"];
    return (parts.length === 1 ? parts[0].slice(0,3) : parts.slice(0,3).map(p=>p[0]).join("")).toUpperCase();
  };

  const rankings = RANK_DATA.rankings || RANK_DATA.top100 || [];
  const rankBySlug = {};
  rankings.forEach(r => {
    const slug = r.slug || slugify(r.team);
    rankBySlug[slug] = r;
  });

  function teamIndex(){
    return TEAM_DATA.teamIndex || {};
  }

  function allTeams(){
    const seen = new Map();
    Object.values(teamIndex()).forEach(t => {
      if(!t || !t.team) return;
      const slug = t.slug || slugify(t.team);
      if(seen.has(slug)) return;
      const r = rankBySlug[slug] || t.ranking || {};
      seen.set(slug, {
        slug,
        team: t.team,
        club: t.club || clubFromTeam(t.team),
        rank: r.rank || t.qa_rank || null,
        cpi: r.cpi || t.qa_cpi || null
      });
    });
    return Array.from(seen.values()).sort((a,b)=>(a.rank || 9999) - (b.rank || 9999) || a.team.localeCompare(b.team));
  }

  function clubFromTeam(team){
    return String(team || "").replace(/\s+[ABCD]$/,"").trim();
  }

  function clubKey(team, club){
    const raw = String(club || clubFromTeam(team) || "").toLowerCase();
    const teamRaw = String(team || "").toLowerCase();
    if(raw.includes("lamorinda")) return "lamorinda";
    if(raw.includes("alameda")) return "alameda";
    if(raw.includes("la jolla")) return "la-jolla-united";
    if(raw.includes("mission")) return "mission-wpc";
    if(raw.includes("norcal")) return "norcal";
    if(raw.includes("san diego dons") || raw.includes("sd dons")) return "sd-dons";
    if(raw.includes("la premier")) return "la-premier";
    if(raw.includes("newport")) return "newport-beach";
    if(raw.includes("patriot")) return "patriot";
    if(raw.includes("vanguard")) return "vanguard";
    if(raw.includes("commerce")) return "commerce";
    if(raw.includes("stanford")) return "stanford";
    if(raw.includes("908")) return "908";
    if(raw.includes("ovac")) return "ovac";
    if(raw.includes("channel islands") || raw.includes("ciu")) return "channel-islands-united";
    if(raw.includes("cc united")) return "cc-united";
    if(raw.includes("shore") || raw.includes("sd shores")) return "sd-shores";
    if(raw.includes("north irvine")) return "north-irvine";
    if(raw.includes("south coast")) return "south-coast";
    if(raw.includes("diablo")) return "diablo-alliance";
    if(raw.includes("cdm")) return "cdm";
    if(raw.includes("san clemente")) return "san-clemente";
    if(raw.includes("680") || teamRaw.startsWith("680")) return "680";
    return slugify(raw) || "default";
  }

  function brandingFor(team){
    const key = clubKey(team.team, team.club);
    return BRANDING[key] || BRANDING.default || {primary:"#08264f", secondary:"#ffc72c", accent:"#ffffff", region:"California", website:"Club Website"};
  }

  function rankingFor(team){
    const slug = team.slug || slugify(team.team);
    return rankBySlug[slug] || team.ranking || team.quality_record || {};
  }

  function getTeam(key){
    const idx = teamIndex();
    const direct = idx[key] || idx[String(key).toLowerCase()] || idx[slugify(key)];
    if(direct) return direct;
    return idx["la-jolla-united-a"] || Object.values(idx)[0];
  }

  function recordFromGames(games){
    let w=0,l=0,t=0;
    games.forEach(g => { if(g.result==="W") w++; else if(g.result==="L") l++; else t++; });
    return `${w}-${l}${t ? "-" + t : ""}`;
  }

  function teamRecord(team, ranking){
    return ranking.record || team.record || recordFromGames(team.games_list || []);
  }

  function groupEvents(games){
    const map = new Map();
    (games || []).forEach(g => {
      const name = g.event || "Unknown Event";
      if(!map.has(name)) map.set(name, []);
      map.get(name).push(g);
    });
    return Array.from(map.entries()).map(([event, items]) => {
      items.sort((a,b)=>(b.sort_key||0)-(a.sort_key||0));
      const w = items.filter(g=>g.result==="W").length;
      const l = items.filter(g=>g.result==="L").length;
      const t = items.filter(g=>g.result==="T").length;
      return {
        event,
        items,
        record: `${w}-${l}${t ? "-" + t : ""}`,
        count: items.length,
        latest: Math.max(...items.map(g=>g.sort_key||0),0)
      };
    }).sort((a,b)=>b.latest-a.latest);
  }

  function contextText(g){
    if(g.overall_context) return g.overall_context;
    const tier = Number(g.tier_num || 0);
    if(tier === 1) return "Top overall field";
    if(tier === 2) return "Second overall field context";
    if(tier >= 3) return "Lower overall field context";
    return "Overall field context";
  }

  function bestWin(team, ranking){
    if(ranking.best_win) return ranking.best_win;
    if(ranking.bestWin) return ranking.bestWin;
    if(Array.isArray(ranking.best_wins) && ranking.best_wins.length){
      const b = ranking.best_wins[0];
      return `${b.opponent || "Opponent"} ${b.score || ""}`.trim();
    }
    const wins = (team.games_list || []).filter(g => g.result === "W");
    if(wins.length){
      const g = wins[0];
      return `${g.opponent} ${g.score}`;
    }
    return "—";
  }

  function latestEvent(events){
    return events[0] || null;
  }

  function setBrandVars(brand){
    document.documentElement.style.setProperty("--brand-primary", brand.primary || "#08264f");
    document.documentElement.style.setProperty("--brand-secondary", brand.secondary || "#ffc72c");
    document.documentElement.style.setProperty("--brand-accent", brand.accent || "#ffffff");
  }

  function logoCandidates(team, brand){
    const teamSlug = team.slug || slugify(team.team);
    const clubSlug = clubKey(team.team, team.club);
    return [
      team.logo,
      team.logo_url,
      `assets/logos/${teamSlug}.png`,
      `assets/logos/${clubSlug}.png`,
      `logos/${teamSlug}.png`,
      `logos/${clubSlug}.png`,
      `images/logos/${teamSlug}.png`,
      `images/logos/${clubSlug}.png`
    ].filter(Boolean);
  }

  function setLogo(team, brand){
    const wrap = $("teamLogo");
    const candidates = logoCandidates(team, brand);
    let i = 0;
    function tryNext(){
      if(i >= candidates.length){
        wrap.innerHTML = `<div class="logo-fallback">${initials(team.team)}</div>`;
        return;
      }
      const src = candidates[i++];
      const img = new Image();
      img.onload = () => { wrap.innerHTML = `<img src="${src}" alt="${team.team} logo">`; };
      img.onerror = tryNext;
      img.src = src;
    }
    tryNext();
  }

  function fillDropdown(currentSlug){
    const teams = allTeams();
    $("teamSelect").innerHTML = teams.map(t => `<option value="${t.slug}" ${t.slug===currentSlug ? "selected" : ""}>${t.rank ? "#" + t.rank + " — " : ""}${t.team}</option>`).join("");
    $("teamSelect").onchange = (e) => {
      location.href = `team.html?team=${encodeURIComponent(e.target.value)}`;
    };
  }

  function fillRankNav(currentSlug){
    const ranked = allTeams().filter(t => t.rank);
    const i = ranked.findIndex(t => t.slug === currentSlug);
    const nav = $("rankNav");
    if(i < 0){ nav.innerHTML = ""; return; }
    const prev = ranked[i-1], cur = ranked[i], next = ranked[i+1];
    nav.innerHTML = `
      ${prev ? `<a class="prev" href="team.html?team=${prev.slug}">← #${prev.rank} ${prev.team}</a>` : "<span></span>"}
      <span class="current">#${cur.rank} ${cur.team}</span>
      ${next ? `<a class="next" href="team.html?team=${next.slug}">#${next.rank} ${next.team} →</a>` : "<span></span>"}
    `;
  }

  function fillSnapshot(team, ranking, events){
    const latest = latestEvent(events);
    const cells = [
      [ranking.rank ? "#" + ranking.rank : "—", "California Rank<br>In 14U Boys"],
      [fmt(ranking.cpi || ranking.qa_cpi), "CPI Rating"],
      [latest ? latest.record : teamRecord(team, ranking), "Latest Tournament<br>Record"],
      [fmt(ranking.vs_top25), "Top 25 Record"],
      [fmt(ranking.overall_finish || ranking.finish || "—"), "Overall Finish"],
      [fmt(ranking.move || ranking.movement || "—"), "Change Since<br>Last Update"]
    ];
    $("snapshotGrid").innerHTML = cells.map(([value,label]) => `<div class="snapshot-cell"><strong>${value}</strong><span>${label}</span></div>`).join("");
  }

  function fillLatest(team, events){
    const latest = latestEvent(events);
    $("latestTitle").textContent = latest ? latest.event : "No verified tournament";
    $("latestMeta").textContent = "California";
    $("latestStats").innerHTML = [
      ["Record", latest ? latest.record : "—"],
      ["Finish", "—"],
      ["Games", latest ? latest.count : "—"]
    ].map(([label,value]) => `<div class="latest-stat"><span>${label}</span><strong>${value}</strong></div>`).join("");
  }

  function fillClubContext(team, brand){
    const club = team.club || clubFromTeam(team.team);
    const sameClub = allTeams().filter(t => clubKey(t.team, t.club) === clubKey(team.team, team.club));
    const highest = sameClub.filter(t=>t.rank).sort((a,b)=>a.rank-b.rank)[0];
    $("clubContextRows").innerHTML = `
      <div class="context-row"><span>Teams Ranked</span><strong>${sameClub.filter(t=>t.rank).length || sameClub.length} Teams ›</strong></div>
      <div class="context-row"><span>Highest Ranked Team</span><strong>${highest ? highest.team + " — #" + highest.rank : "—"} ›</strong></div>
      <div class="context-row"><span>Club Website</span><strong>${brand.website || "Club Website"} ↗</strong></div>
    `;
  }

  function fillSeason(team, ranking, events){
    const games = team.games_list || [];
    const gfga = games.reduce((acc,g) => {
      const parts = String(g.score || "").split("-").map(Number);
      if(parts.length === 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])){
        acc.gf += parts[0]; acc.ga += parts[1];
      }
      return acc;
    }, {gf:0, ga:0});
    const rec = recordFromGames(games);
    const total = games.length || 1;
    const wins = games.filter(g=>g.result==="W").length;
    const rows = [
      ["Overall Record", rec],
      ["Events Played", events.length],
      ["Games Played", games.length],
      ["Win %", games.length ? Math.round((wins/games.length)*1000)/10 + "%" : "—"],
      ["Avg Goals Scored", games.length ? (gfga.gf/total).toFixed(1) : "—"],
      ["Avg Goals Allowed", games.length ? (gfga.ga/total).toFixed(1) : "—"],
      ["Goal Differential", games.length ? ((gfga.gf-gfga.ga)/total >= 0 ? "+" : "") + ((gfga.gf-gfga.ga)/total).toFixed(1) : "—"],
      ["Quality Wins", ranking.quality_score ?? ranking.qualityWins ?? "—"]
    ];
    $("seasonRows").innerHTML = rows.map(([label,value]) => `<div class="season-row"><span>${label}</span><strong>${value}</strong></div>`).join("");
  }

  function renderTimeline(events){
    $("timeline").innerHTML = events.map((ev, idx) => `
      <div class="timeline-block ${idx === 0 ? "open" : ""}">
        <button class="timeline-head" type="button">
          <div class="date-badge">${idx === 0 ? "Latest" : "Event"}</div>
          <div class="timeline-title"><strong>${ev.event}</strong><span>California</span></div>
          <div class="timeline-record"><strong>${ev.record}</strong><span>Record</span></div>
          <div class="timeline-finish"><strong>—</strong><span>Finish</span></div>
          <div class="chev">›</div>
        </button>
        <div class="timeline-games">
          ${ev.items.map(g => `
            <div class="game-row">
              <div class="game-date">${g.date || ""}</div>
              <div>${g.result === "W" ? "vs." : g.result === "L" ? "vs." : "vs."} <a href="team.html?team=${slugify(g.opponent)}">${g.opponent || "Opponent"}</a></div>
              <div><span class="result-dot ${g.result || "T"}">${g.result || "T"}</span></div>
              <div class="game-score">${g.score || ""}</div>
              <div class="game-context">${contextText(g)}</div>
            </div>
          `).join("")}
        </div>
      </div>
    `).join("");
    document.querySelectorAll(".timeline-head").forEach(btn => {
      btn.addEventListener("click", () => btn.closest(".timeline-block").classList.toggle("open"));
    });
    $("expandAll").onclick = () => {
      const blocks = Array.from(document.querySelectorAll(".timeline-block"));
      const shouldOpen = blocks.some(b => !b.classList.contains("open"));
      blocks.forEach(b => b.classList.toggle("open", shouldOpen));
    };
  }

  function fillFullResults(games){
    $("fullResultsTable").innerHTML = (games || []).map(g => `
      <tr>
        <td>${g.event || ""}</td>
        <td><a href="team.html?team=${slugify(g.opponent)}">${g.opponent || ""}</a></td>
        <td><span class="result-dot ${g.result || "T"}">${g.result || "T"}</span></td>
        <td><strong>${g.score || ""}</strong></td>
        <td>${contextText(g)}</td>
      </tr>
    `).join("");
  }

  function render(){
    const key = new URLSearchParams(location.search).get("team") || "la-jolla-united-a";
    const team = getTeam(key);
    if(!team) return;
    team.slug = team.slug || slugify(team.team);
    const brand = brandingFor(team);
    const ranking = rankingFor(team);
    const events = groupEvents(team.games_list || []);
    const latest = latestEvent(events);
    const cpi = number(ranking.cpi || ranking.qa_cpi);

    setBrandVars(brand);
    setLogo(team, brand);

    document.title = `${team.team} | CPI`;
    $("teamName").textContent = team.team;
    $("ageGroup").textContent = `${team.age_group || "14U"} ${team.gender || "Boys"}`;
    $("clubName").textContent = team.club || brand.name || clubFromTeam(team.team);
    $("chipClub").textContent = team.club || brand.name || clubFromTeam(team.team);
    $("chipRegion").textContent = brand.region || "California";
    $("chipWebsite").textContent = brand.website || "Club Website";

    $("heroRank").textContent = ranking.rank ? "#" + ranking.rank : "—";
    $("rankGroup").textContent = `In ${team.age_group || "14U"} ${team.gender || "Boys"}`;
    $("heroCpi").textContent = cpi ? cpi.toFixed(cpi % 1 === 0 ? 0 : 1) : "—";
    $("heroRecord").textContent = latest ? latest.record : teamRecord(team, ranking);
    $("latestGames").textContent = latest ? `${latest.count} game${latest.count === 1 ? "" : "s"}` : "Verified games";
    $("latestFinish").textContent = ranking.overall_finish || ranking.finish || "—";
    $("movement").textContent = ranking.move || ranking.movement || "—";

    if(cpi){
      const pct = Math.max(0, Math.min(100, ((cpi - 1200) / 850) * 100));
      $("meterFill").style.width = pct + "%";
      $("meterKnob").style.left = pct + "%";
      $("ratingLabel").textContent = cpi >= 2000 ? "Elite in California" : cpi >= 1800 ? "Top tier in California" : cpi >= 1600 ? "Strong in California" : "California rating";
    }

    fillDropdown(team.slug);
    fillRankNav(team.slug);
    fillSnapshot(team, ranking, events);
    fillLatest(team, events);
    fillClubContext(team, brand);
    fillSeason(team, ranking, events);
    renderTimeline(events);
    fillFullResults(team.games_list || []);
  }

  render();
})();
