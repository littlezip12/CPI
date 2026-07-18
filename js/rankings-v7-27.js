/* CPI Release 7.27 — rankings page polish and top-25 browsing UX */
(function () {
  const rankings = Array.isArray(window.CPI_RANKINGS) ? window.CPI_RANKINGS : [];
  const LOGO_CACHE_VERSION = "7.50.2";
  const LOGO_FALLBACK = `assets/logos/cpi-logo-fallback.svg?v=${LOGO_CACHE_VERSION}`;
  function versionLogo(src) {
    const value = String(src || "assets/logos/cpi-logo-fallback.svg");
    if (!value.includes("assets/logos/")) return value;
    if (/([?&])v=/.test(value)) return value.replace(/([?&])v=[^&]*/, `$1v=${LOGO_CACHE_VERSION}`);
    return `${value}${value.includes("?") ? "&" : "?"}v=${LOGO_CACHE_VERSION}`;
  }
  const state = { visibleCount: 25 };

  const els = {
    search: document.querySelector("#search"),
    group: document.querySelector("#groupFilter"),
    count: document.querySelector("#count"),
    list: document.querySelector("#rankingsBody"),
    podium: document.querySelector("#rankingsPodium"),
    heroGroup: document.querySelector("#heroGroup"),
    heroTeams: document.querySelector("#heroTeams"),
    pills: document.querySelector("#rankingsGroupPills"),
    more: document.querySelector("#rankingsLoadMore")
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function slugify(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function groupFromSlug(slug, groups) {
    return groups.find(group => slugify(group) === slug) || "";
  }

  function movementClass(value) {
    const movement = safeNumber(value);
    if (movement > 0) return "up";
    if (movement < 0) return "down";
    return "flat";
  }

  function movementLabel(value) {
    const movement = safeNumber(value);
    if (movement > 0) return `▲ +${movement}`;
    if (movement < 0) return `▼ ${Math.abs(movement)}`;
    return "—";
  }

  function movementTitle(value) {
    const movement = safeNumber(value);
    if (movement > 0) return `Moved up ${movement} spots since prior CPI snapshot`;
    if (movement < 0) return `Moved down ${Math.abs(movement)} spots since prior CPI snapshot`;
    return "No movement since prior CPI snapshot";
  }

  function teamUrl(team) {
    return team.teamPage || `team.html?team=${encodeURIComponent(team.slug || team.team || "")}`;
  }

  function clubUrl(team) {
    return team.clubPage || `club.html?club=${encodeURIComponent(team.clubSlug || team.club || "")}`;
  }

  function clubLabel(team) {
    return team.displayClubName || team.club || "Unknown club";
  }

  function groupOptions() {
    const order = ["12U Boys", "12U Girls", "14U Boys", "14U Girls", "16U Boys", "16U Girls", "18U Boys", "18U Girls"];
    const groups = [...new Set(rankings.map(item => item.group).filter(Boolean))];
    return groups.sort((a, b) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      return a.localeCompare(b);
    });
  }

  function selectedGroupFromUrl(groups) {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("group") || params.get("age") || "";
    return groupFromSlug(requested, groups) || groups[0] || "";
  }

  function populateFilters() {
    const groups = groupOptions();
    const selected = selectedGroupFromUrl(groups);
    if (els.group) {
      els.group.innerHTML = groups.map(group => `<option value="${escapeHtml(group)}">${escapeHtml(group)}</option>`).join("");
      els.group.value = selected;
    }
    if (els.pills) {
      els.pills.innerHTML = groups.map(group => `<button class="rankings-pill-v724 rankings-pill-v727${group === selected ? " is-active" : ""}" type="button" data-group="${escapeHtml(group)}">${escapeHtml(group)}</button>`).join("");
      els.pills.querySelectorAll("button[data-group]").forEach(button => {
        button.addEventListener("click", () => {
          if (els.group) els.group.value = button.dataset.group || "";
          state.visibleCount = 25;
          updateUrl(els.group?.value || "");
          render();
        });
      });
    }
  }

  function currentFilteredRankings() {
    const query = (els.search?.value || "").trim().toLowerCase();
    const group = els.group?.value || groupOptions()[0] || "";
    return rankings
      .filter(item => {
        const haystack = [item.team, item.club, item.displayClubName, item.group, item.region, item.latestTournament]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return item.group === group && (!query || haystack.includes(query));
      })
      .sort((a, b) => safeNumber(a.postRank, 9999) - safeNumber(b.postRank, 9999));
  }

  function evidenceLabel(team) {
    const pieces = [];
    if (team.latestTournament) pieces.push(team.latestTournament);
    if (team.latestTournamentRecord) pieces.push(team.latestTournamentRecord);
    const games = team.gamesTracked || team.gamesLatest;
    if (games) pieces.push(`${games} tracked games`);
    return pieces.join(" · ") || "Evidence pending";
  }

  function topTeamCard(team, index) {
    const logo = versionLogo(team.logo);
    return `
      <a class="podium-card-v727 podium-${index + 1}" href="${escapeHtml(teamUrl(team))}" style="--team-primary:${escapeHtml(team.primaryColor || "#126dff")}">
        <span class="podium-rank-v727">#${escapeHtml(team.postRank || index + 1)}</span>
        <img src="${escapeHtml(logo)}" alt="${escapeHtml(clubLabel(team))} logo" loading="lazy" onerror="this.onerror=null;this.src='assets/logos/cpi-logo-fallback.svg?v=7.50.2'">
        <strong>${escapeHtml(team.team || "Team")}</strong>
        <em>${escapeHtml(clubLabel(team))}${team.region ? ` · ${escapeHtml(team.region)}` : ""}</em>
        <b>${safeNumber(team.postCPI).toFixed(1)} CPI</b>
      </a>
    `;
  }

  function renderPodium(items) {
    if (!els.podium) return;
    const query = (els.search?.value || "").trim();
    if (query || items.length < 3) {
      els.podium.innerHTML = "";
      els.podium.hidden = true;
      return;
    }
    els.podium.hidden = false;
    const leaders = items.slice(0, 3);
    els.podium.innerHTML = `
      <div class="podium-copy-v727">
        <span>Top of board</span>
        <strong>${escapeHtml(els.group?.value || "Selected group")}</strong>
        <p>Quick view of the current top three. Full board starts below.</p>
      </div>
      ${leaders.map(topTeamCard).join("")}
    `;
  }

  function rankingRow(team) {
    const move = movementClass(team.movement);
    const cpi = safeNumber(team.postCPI).toFixed(1);
    const logo = versionLogo(team.logo);
    const record = team.latestTournamentRecord || `${team.gamesLatest || "—"} games`;
    return `
      <article class="ranking-row ranking-row-v727" style="--team-primary:${escapeHtml(team.primaryColor || "#126dff")}">
        <div class="ranking-rank ranking-rank-v727">#${escapeHtml(team.postRank || "—")}</div>
        <div class="ranking-team ranking-team-v727">
          <img class="ranking-logo ranking-logo-v727" src="${escapeHtml(logo)}" alt="${escapeHtml(clubLabel(team))} logo" loading="lazy" onerror="this.onerror=null;this.src='assets/logos/cpi-logo-fallback.svg?v=7.50.2'">
          <div>
            <a href="${escapeHtml(teamUrl(team))}"><strong>${escapeHtml(team.team)}</strong></a>
            <span><a href="${escapeHtml(clubUrl(team))}">${escapeHtml(clubLabel(team))}</a>${team.region ? ` · ${escapeHtml(team.region)}` : ""}</span>
          </div>
        </div>
        <div class="ranking-cpi ranking-cpi-v727"><span class="ranking-detail-label">CPI</span><strong>${cpi}</strong></div>
        <div class="ranking-movement ranking-movement-v727"><span class="ranking-detail-label">Move</span><span class="ranking-move ${move}" title="${escapeHtml(movementTitle(team.movement))}">${escapeHtml(movementLabel(team.movement))}</span></div>
        <div class="ranking-tournament ranking-tournament-v727"><span class="ranking-detail-label">Latest</span><strong>${escapeHtml(team.latestTournament || "—")}</strong><span>${escapeHtml(record)}</span></div>
        <div class="ranking-best-win ranking-evidence-v727"><span class="ranking-detail-label">Evidence</span><strong>${escapeHtml(team.bestWinClean || "—")}</strong><span>${escapeHtml(evidenceLabel(team))}</span></div>
      </article>
    `;
  }

  function updateUrl(group) {
    if (!group || !window.history?.replaceState) return;
    const url = new URL(window.location.href);
    url.searchParams.set("group", slugify(group));
    window.history.replaceState({}, "", url);
  }

  function updatePills() {
    if (!els.pills) return;
    const group = els.group?.value || "";
    els.pills.querySelectorAll("button[data-group]").forEach(button => {
      button.classList.toggle("is-active", button.dataset.group === group);
    });
  }

  function renderLoadMore(total, shown) {
    if (!els.more) return;
    if (total <= 25) {
      els.more.innerHTML = "";
      return;
    }
    const remaining = Math.max(0, total - shown);
    els.more.innerHTML = `
      <div class="rankings-load-summary-v727">Showing <strong>${shown.toLocaleString()}</strong> of <strong>${total.toLocaleString()}</strong> ranked teams.</div>
      <div class="rankings-load-actions-v727">
        ${remaining > 0 ? `<button class="primary" type="button" data-action="more">View next ${Math.min(25, remaining)}</button>` : ""}
        ${shown < total ? `<button type="button" data-action="all">Show all ${total}</button>` : `<button type="button" data-action="top">Back to top 25</button>`}
      </div>
    `;
    els.more.querySelector('[data-action="more"]')?.addEventListener("click", () => {
      state.visibleCount = Math.min(total, state.visibleCount + 25);
      render();
    });
    els.more.querySelector('[data-action="all"]')?.addEventListener("click", () => {
      state.visibleCount = total;
      render();
    });
    els.more.querySelector('[data-action="top"]')?.addEventListener("click", () => {
      state.visibleCount = 25;
      render();
      document.querySelector("#rankings-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function render() {
    const items = currentFilteredRankings();
    const group = els.group?.value || "";
    const shownItems = items.slice(0, state.visibleCount);
    if (els.count) {
      const shown = Math.min(shownItems.length, items.length);
      els.count.textContent = `${shown.toLocaleString()} of ${items.length.toLocaleString()} teams shown`;
    }
    if (els.heroGroup) els.heroGroup.textContent = group || "No rankings available";
    if (els.heroTeams) els.heroTeams.textContent = items.length.toLocaleString();
    updatePills();
    renderPodium(items);

    if (!els.list) return;
    if (!items.length) {
      els.list.innerHTML = `<div class="rankings-empty">No ranked teams match this search and age/gender group.</div>`;
      renderLoadMore(0, 0);
      return;
    }
    els.list.innerHTML = shownItems.map(rankingRow).join("");
    renderLoadMore(items.length, shownItems.length);
  }

  populateFilters();
  els.search?.addEventListener("input", () => { state.visibleCount = 25; render(); });
  els.group?.addEventListener("change", () => {
    state.visibleCount = 25;
    updateUrl(els.group.value);
    render();
  });
  render();
})();
