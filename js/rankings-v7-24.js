/* WPI Release 7.24 — simplified rankings page with Top 25 / View More */
(function () {
  const rankings = Array.isArray(window.CPI_RANKINGS) ? window.CPI_RANKINGS : [];
  const state = { visibleCount: 25 };

  const els = {
    search: document.querySelector("#search"),
    group: document.querySelector("#groupFilter"),
    count: document.querySelector("#count"),
    list: document.querySelector("#rankingsBody"),
    featureGrid: document.querySelector("#rankingsFeatureGrid"),
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

  function teamUrl(team) {
    return team.teamPage || `team.html?team=${encodeURIComponent(team.slug || team.team || "")}`;
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
      els.pills.innerHTML = groups.map(group => `<button class="rankings-pill-v724${group === selected ? " is-active" : ""}" type="button" data-group="${escapeHtml(group)}">${escapeHtml(group)}</button>`).join("");
      els.pills.querySelectorAll("button[data-group]").forEach(button => {
        button.addEventListener("click", () => {
          if (els.group) els.group.value = button.dataset.group || "";
          state.visibleCount = 25;
          updateUrl(els.group?.value || "");
          render();
        });
      });
    }
    if (els.heroGroup) els.heroGroup.textContent = selected || "No rankings available";
    if (els.heroTeams) els.heroTeams.textContent = selected ? rankings.filter(item => item.group === selected).length.toLocaleString() : "0";
  }

  function currentFilteredRankings() {
    const query = (els.search?.value || "").trim().toLowerCase();
    const group = els.group?.value || groupOptions()[0] || "";
    return rankings
      .filter(item => {
        const haystack = [item.team, item.club, item.displayClubName, item.group, item.region]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return item.group === group && (!query || haystack.includes(query));
      })
      .sort((a, b) => safeNumber(a.postRank, 9999) - safeNumber(b.postRank, 9999));
  }

  function renderFeatureCards() {
    if (els.featureGrid) els.featureGrid.innerHTML = "";
  }

  function rankingRow(team) {
    const move = movementClass(team.movement);
    const cpi = safeNumber(team.postCPI).toFixed(1);
    const logo = team.logo || "assets/logos/cpi-logo-fallback.svg";
    const record = team.latestTournamentRecord || `${team.gamesLatest || "—"} games`;
    return `
      <article class="ranking-row" style="--team-primary:${escapeHtml(team.primaryColor || "#126dff")}">
        <div class="ranking-rank">#${escapeHtml(team.postRank || "—")}</div>
        <div class="ranking-team">
          <img class="ranking-logo" src="${escapeHtml(logo)}" alt="${escapeHtml(clubLabel(team))} logo" loading="lazy" onerror="this.src='assets/logos/cpi-logo-fallback.svg'">
          <a href="${escapeHtml(teamUrl(team))}">
            <strong>${escapeHtml(team.team)}</strong>
            <span>${escapeHtml(clubLabel(team))}${team.region ? ` · ${escapeHtml(team.region)}` : ""}</span>
          </a>
        </div>
        <div class="ranking-group"><span class="ranking-pill">${escapeHtml(team.group || "—")}</span></div>
        <div class="ranking-cpi"><span class="ranking-detail-label">WPI</span><strong>${cpi}</strong></div>
        <div class="ranking-movement"><span class="ranking-move ${move}">${escapeHtml(movementLabel(team.movement))}</span></div>
        <div class="ranking-tournament"><span class="ranking-detail-label">Latest</span><strong>${escapeHtml(team.latestTournament || "—")}</strong><span>${escapeHtml(record)}</span></div>
        <div class="ranking-best-win"><span class="ranking-detail-label">Best win</span><strong>${escapeHtml(team.bestWinClean || "—")}</strong><span>${escapeHtml(team.gamesTracked || team.gamesLatest || "—")} tracked games</span></div>
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
      ${remaining > 0 ? `<button class="primary" type="button" data-action="more">View next ${Math.min(25, remaining)}</button>` : ""}
      ${shown < total ? `<button type="button" data-action="all">Show all ${total}</button>` : `<button type="button" data-action="top">Back to top 25</button>`}
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
      els.count.textContent = `${shown.toLocaleString()} of ${items.length.toLocaleString()} ${group} teams shown`;
    }
    if (els.heroGroup) els.heroGroup.textContent = group || "No rankings available";
    if (els.heroTeams) els.heroTeams.textContent = items.length.toLocaleString();
    updatePills();
    renderFeatureCards(items);

    if (!els.list) return;
    if (!items.length) {
      els.list.innerHTML = `<div class="rankings-empty">No ranked teams match the selected age/gender group.</div>`;
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
