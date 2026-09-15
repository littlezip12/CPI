/* WPI 7.64.5 — visible opponent autocomplete for mobile and desktop game creation. */
(() => {
  "use strict";
  const input = document.getElementById("gameOpponentName");
  const list = document.getElementById("gameOpponentAutocomplete");
  if (!input || !list) return;

  let directory = [];
  let visible = [];
  let activeIndex = -1;

  const normalize = value => String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));

  function workspaceHints() {
    const text = `${document.getElementById("dashboardTeamName")?.textContent || ""} ${document.getElementById("dashboardClubName")?.textContent || ""}`.toLowerCase();
    const age = text.match(/\b(10u|12u|14u|16u|18u)\b/)?.[1]?.toUpperCase() || "";
    const gender = /\bboys?\b/.test(text) ? "boys" : /\bgirls?\b/.test(text) ? "girls" : "";
    return {age,gender};
  }

  function rowKey(row) {
    return row.canonicalTeamId || `${row.clubSlug}|${row.slug}|${row.group}|${row.team}`;
  }

  async function loadDirectory() {
    try {
      const response = await fetch("clubs.json", {cache:"no-store"});
      if (!response.ok) return;
      const clubs = await response.json();
      const seen = new Set();
      directory = (Array.isArray(clubs) ? clubs : []).flatMap(club => (club.teams || []).map(team => ({
        team:team.team || "",
        group:team.group || "",
        ageGroup:team.ageGroup || "",
        gender:team.gender || "",
        slug:team.slug || "",
        canonicalTeamId:team.canonicalTeamId || "",
        club:team.club || club.club || "",
        clubSlug:team.clubSlug || club.slug || "",
        displayClubName:team.displayClubName || club.displayName || club.club || ""
      }))).filter(row => {
        const key = rowKey(row);
        if (!row.team || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    } catch (_) {
      directory = [];
    }
  }

  function scoreRow(row, query, hints) {
    const team = normalize(row.team);
    const club = normalize(row.displayClubName || row.club);
    const combined = normalize(`${row.displayClubName || row.club} ${row.team} ${row.group}`);
    let score = 99;
    if (team === query || club === query) score = 0;
    else if (team.startsWith(query)) score = 1;
    else if (club.startsWith(query)) score = 2;
    else if (team.includes(query)) score = 3;
    else if (club.includes(query)) score = 4;
    else if (combined.includes(query)) score = 5;
    if (score === 99) return null;
    const ageMatch = !hints.age || String(row.ageGroup || "").toUpperCase() === hints.age;
    const genderMatch = !hints.gender || String(row.gender || row.group || "").toLowerCase().includes(hints.gender);
    const contextPenalty = ageMatch && genderMatch ? 0 : ageMatch || genderMatch ? 10 : 20;
    return score + contextPenalty;
  }

  function matchesFor(value) {
    const query = normalize(value);
    if (query.length < 2) return [];
    const hints = workspaceHints();
    return directory.map(row => ({row,score:scoreRow(row,query,hints)}))
      .filter(item => item.score !== null)
      .sort((a,b) => a.score - b.score
        || String(a.row.displayClubName || a.row.club).localeCompare(String(b.row.displayClubName || b.row.club))
        || String(a.row.group).localeCompare(String(b.row.group))
        || String(a.row.team).localeCompare(String(b.row.team)))
      .slice(0,8).map(item => item.row);
  }

  function closeList() {
    visible = [];
    activeIndex = -1;
    list.hidden = true;
    list.innerHTML = "";
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }

  function render(value) {
    const query = normalize(value);
    if (query.length < 2) { closeList(); return; }
    visible = matchesFor(value);
    activeIndex = -1;
    input.setAttribute("aria-expanded", "true");
    list.hidden = false;
    if (!visible.length) {
      list.innerHTML = '<div class="live-opponent-empty">No WPI team match yet. Keep typing, or use the name as a manual opponent.</div>';
      return;
    }
    list.innerHTML = visible.map((row,index) => {
      const club = row.displayClubName || row.club || "WPI team";
      const detail = [club,row.group].filter(Boolean).join(" · ");
      return `<button type="button" class="live-opponent-option" id="gameOpponentOption${index}" role="option" data-index="${index}" aria-selected="false"><strong>${esc(row.team)}</strong><small>${esc(detail)}</small><em>Use team</em></button>`;
    }).join("");
  }

  function setActive(index) {
    if (!visible.length) return;
    activeIndex = Math.max(0,Math.min(index,visible.length-1));
    list.querySelectorAll(".live-opponent-option").forEach((button,i) => {
      const active = i === activeIndex;
      button.dataset.active = active ? "true" : "false";
      button.setAttribute("aria-selected", active ? "true" : "false");
      if (active) {
        input.setAttribute("aria-activedescendant", button.id);
        button.scrollIntoView({block:"nearest"});
      }
    });
  }

  function choose(index) {
    const row = visible[index];
    if (!row) return;
    input.value = row.team;
    input.dataset.wpiTeamId = row.canonicalTeamId || "";
    input.dataset.wpiTeamGroup = row.group || "";
    input.dispatchEvent(new Event("input", {bubbles:true}));
    input.dispatchEvent(new Event("change", {bubbles:true}));
    closeList();
    input.focus({preventScroll:true});
  }

  input.addEventListener("input", () => {
    input.dataset.wpiTeamId = "";
    input.dataset.wpiTeamGroup = "";
    render(input.value);
  });
  input.addEventListener("focus", () => render(input.value));
  input.addEventListener("keydown", event => {
    if (list.hidden || !visible.length) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setActive(activeIndex + 1); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive(activeIndex <= 0 ? visible.length - 1 : activeIndex - 1); }
    else if (event.key === "Enter" && activeIndex >= 0) { event.preventDefault(); choose(activeIndex); }
    else if (event.key === "Escape") { event.preventDefault(); closeList(); }
  });
  list.addEventListener("pointerdown", event => {
    const button = event.target.closest(".live-opponent-option");
    if (!button) return;
    event.preventDefault();
    choose(Number(button.dataset.index));
  });
  document.addEventListener("pointerdown", event => {
    if (event.target !== input && !list.contains(event.target)) closeList();
  });
  document.getElementById("gameDayDialog")?.addEventListener("close", closeList);

  loadDirectory().then(() => { if (document.activeElement === input) render(input.value); });
})();
