(function () {
  const data = window.CPI_TOURNAMENT_REVIEW || { counts: {}, rankingReview: [], identityReview: [] };
  const rankingList = document.querySelector("#rankingReviewList");
  const identityList = document.querySelector("#identityReviewList");
  const groupSelect = document.querySelector("#evidenceGroup");
  const statusSelect = document.querySelector("#evidenceStatus");
  const searchInput = document.querySelector("#evidenceSearch");

  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function record(summary = {}) {
    if (!Number(summary.finalGames || 0)) return `${Number(summary.scheduledGames || 0)} scheduled`;
    return `${Number(summary.wins || 0)}-${Number(summary.losses || 0)}${Number(summary.ties || 0) ? `-${Number(summary.ties || 0)}` : ""}`;
  }

  function renderStats() {
    const counts = data.counts || {};
    document.querySelector("#evidenceStats").innerHTML = [
      ["Ranking items", counts.rankingItems || 0],
      ["Ready for review", counts.readyForRankingReview || 0],
      ["Schedule only", counts.scheduleOnly || 0],
      ["Identity review", counts.identityReviewItems || 0],
    ].map(([label, value]) => `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join("");
  }

  function populateGroups() {
    const groups = [...new Set((data.rankingReview || []).map((item) => item.group).filter(Boolean))].sort();
    groupSelect.insertAdjacentHTML("beforeend", groups.map((group) => `<option value="${escapeHtml(group)}">${escapeHtml(group)}</option>`).join(""));
  }

  function matches(item) {
    const group = groupSelect.value;
    const status = statusSelect.value;
    const query = searchInput.value.trim().toLowerCase();
    if (group !== "all" && item.group !== group) return false;
    if (status !== "all" && item.status !== status) return false;
    if (!query) return true;
    const haystack = `${item.name || ""} ${item.group || ""} ${(item.appearances || []).map((x) => `${x.eventName} ${x.divisionLabel}`).join(" ")}`.toLowerCase();
    return haystack.includes(query);
  }

  function renderRanking() {
    const items = (data.rankingReview || []).filter(matches);
    document.querySelector("#rankingCount").textContent = `${items.length} shown`;
    rankingList.innerHTML = items.length ? items.map((item) => {
      const appearances = item.appearances || [];
      return `<article class="evidence-review-card ${item.status === "ready_for_ranking_review" ? "is-ready" : "is-schedule"}">
        <div class="review-card-head"><div><span>${escapeHtml(item.group)}</span><h3>${escapeHtml(item.name)}</h3></div><b>${item.status === "ready_for_ranking_review" ? "Review results" : "Schedule banked"}</b></div>
        <div class="review-card-summary"><strong>${escapeHtml(record(item.summary))}</strong><span>${Number(item.summary?.games || 0)} banked game${Number(item.summary?.games || 0) === 1 ? "" : "s"}</span></div>
        <div class="review-appearances">${appearances.map((appearance) => `<div><span>${escapeHtml(appearance.divisionLabel || appearance.divisionId)}</span><strong>${appearance.seed != null ? `Seed #${escapeHtml(appearance.seed)}` : "Seed pending"}</strong><em>${escapeHtml(record(appearance))}</em></div>`).join("")}</div>
        ${item.seedRankGaps?.length ? `<p class="review-flag">Seed/CPI gap: ${item.seedRankGaps.map((gap) => `#${gap.seed} seed vs #${gap.cpiRank} CPI`).join(" · ")}</p>` : ""}
        <a href="${escapeHtml(item.teamPage || "rankings.html")}">Open team profile →</a>
      </article>`;
    }).join("") : `<p class="empty-review">No ranking-review items match these filters.</p>`;
  }

  function renderIdentity() {
    const query = searchInput.value.trim().toLowerCase();
    const items = (data.identityReview || []).filter((item) => !query || `${item.name} ${item.group} ${(item.aliases || []).join(" ")}`.toLowerCase().includes(query));
    document.querySelector("#identityCount").textContent = `${items.length} shown`;
    identityList.innerHTML = items.length ? items.map((item) => `<article>
      <span>${escapeHtml(item.group)}</span>
      <strong>${escapeHtml(item.name)}</strong>
      <em>${item.canonicalClubId ? "Canonical club linked" : "Tournament-only club"}</em>
      <small>${escapeHtml((item.aliases || []).join(" · "))}</small>
    </article>`).join("") : `<p class="empty-review">No tournament-only identities match this search.</p>`;
  }

  function render() {
    renderRanking();
    renderIdentity();
  }

  renderStats();
  populateGroups();
  [groupSelect, statusSelect].forEach((element) => element.addEventListener("change", render));
  searchInput.addEventListener("input", render);
  render();
})();
