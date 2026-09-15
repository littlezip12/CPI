/* WPI 7.64.6 — opponent search context labels and division-first ranking. */
(() => {
  "use strict";
  const input = document.getElementById("gameOpponentName");
  const list = document.getElementById("gameOpponentAutocomplete");
  if (!input || !list) return;

  let directory = [];
  let visible = [];
  let activeIndex = -1;
  let selecting = false;

  const normalize = value => String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));

  function workspaceHints() {
    const text = [
      document.getElementById("dashboardTeamName")?.textContent || "",
      document.getElementById("dashboardClubName")?.textContent || "",
      document.getElementById("gameTeamLockContext")?.textContent || ""
    ].join(" ").toLowerCase();
    const age = text.match(/\b(10u|12u|14u|16u|18u)\b/)?.[1]?.toUpperCase() || "";
    const gender = /\bboys?\b/.test(text) ? "boys"
      : /\bgirls?\b/.test(text) ? "girls"
      : /\bmen'?s?\b/.test(text) ? "men"
      : /\bwom[ae]n'?s?\b/.test(text) ? "women"
      : "";
    const level = /\bjunior varsity\b|\bjv\b/.test(text) ? "JV"
      : /\bvarsity\b/.test(text) ? "Varsity"
      : "";
    const highSchool = Boolean(level || /\bhigh school\b/.test(text));
    return {age,gender,level,highSchool};
  }

  function rowKey(row) {
    return row.canonicalTeamId || row.familyKey || `${row.clubSlug}|${row.slug}|${row.group}|${row.team}`;
  }

  function shortSchoolName(value) {
    return String(value || "").replace(/\s+High School$/i,"").trim();
  }

  function primaryLabel(row) {
    if (row.organizationType === "high_school") {
      return `${shortSchoolName(row.displayClubName || row.club)} ${row.team}`.replace(/\s+/g," ").trim();
    }
    const age = String(row.ageGroup || "").toUpperCase();
    return [age,row.team].filter(Boolean).join(" ").replace(/\s+/g," ").trim();
  }

  function secondaryLabel(row) {
    if (row.organizationType === "high_school") {
      return [row.gender,row.level || row.squadLabel].filter(Boolean).join(" · ");
    }
    const gender = row.gender || String(row.group || "").replace(/^\s*(10U|12U|14U|16U|18U)\s*/i,"").trim();
    return [row.displayClubName || row.club,gender].filter(Boolean).join(" · ");
  }

  function rowLevel(row) {
    const direct = row.level || row.squadLabel || "";
    if (/^jv$/i.test(direct) || /\bjv\b/i.test(row.team || "") || /\bjunior varsity\b/i.test(row.team || "")) return "JV";
    if (/^varsity$/i.test(direct) || /\bvarsity\b/i.test(row.team || "")) return "Varsity";
    return "";
  }

  function normalizedGender(value) {
    const text = String(value || "").toLowerCase();
    if (/\bboys?\b/.test(text)) return "boys";
    if (/\bgirls?\b/.test(text)) return "girls";
    if (/\bmen\b|\bmen'?s\b/.test(text)) return "men";
    if (/\bwomen\b|\bwomen'?s\b/.test(text)) return "women";
    return text;
  }

  function contextRank(row,hints) {
    if (hints.level) {
      const levelMatch = rowLevel(row) === hints.level;
      const genderMatch = !hints.gender || normalizedGender(row.gender || row.group) === hints.gender;
      if (levelMatch && genderMatch) return 0;
      if (levelMatch) return 1;
      if (genderMatch) return 2;
      return 3;
    }
    if (hints.age) {
      const ageMatch = String(row.ageGroup || "").toUpperCase() === hints.age;
      const genderMatch = !hints.gender || normalizedGender(row.gender || row.group) === hints.gender;
      if (ageMatch && genderMatch) return 0;
      if (ageMatch) return 1;
      if (genderMatch) return 2;
      return 3;
    }
    return 0;
  }

  function matchScore(row, query) {
    const team = normalize(row.team);
    const primary = normalize(primaryLabel(row));
    const club = normalize(row.displayClubName || row.club);
    const aliases = (row.aliases || []).map(normalize);
    const combined = normalize(`${row.displayClubName || row.club} ${row.team} ${row.group} ${row.ageGroup} ${row.level || ""} ${aliases.join(" ")}`);
    if (team === query || primary === query || club === query || aliases.includes(query)) return 0;
    if (team.startsWith(query) || primary.startsWith(query)) return 1;
    if (club.startsWith(query) || aliases.some(alias => alias.startsWith(query))) return 2;
    if (team.includes(query) || primary.includes(query)) return 3;
    if (club.includes(query) || aliases.some(alias => alias.includes(query))) return 4;
    if (combined.includes(query)) return 5;
    return null;
  }

  function matchesFor(value) {
    const query = normalize(value);
    if (query.length < 2) return [];
    const hints = workspaceHints();
    return directory.map(row => ({
      row,
      context:contextRank(row,hints),
      score:matchScore(row,query)
    }))
      .filter(item => item.score !== null)
      .sort((a,b) => a.context - b.context
        || a.score - b.score
        || primaryLabel(a.row).localeCompare(primaryLabel(b.row)))
      .slice(0,8).map(item => item.row);
  }

  async function loadDirectory() {
    const hints = workspaceHints();
    const rows = [];
    try {
      const response = await fetch("clubs.json", {cache:"no-store"});
      if (response.ok) {
        const clubs = await response.json();
        rows.push(...(Array.isArray(clubs) ? clubs : []).flatMap(club => (club.teams || []).map(team => ({
          team:team.team || "",
          group:team.group || "",
          ageGroup:team.ageGroup || "",
          gender:team.gender || "",
          squadLabel:team.squadLabel || "",
          level:team.level || "",
          aliases:team.aliases || [],
          slug:team.slug || "",
          canonicalTeamId:team.canonicalTeamId || "",
          club:team.club || club.club || "",
          clubSlug:team.clubSlug || club.slug || "",
          displayClubName:team.displayClubName || club.displayName || club.club || "",
          organizationType:team.organizationType || club.organizationType || "club"
        }))));
      }
    } catch (_) {}

    /* High-school teams stay out of club search while archived. When a JV/Varsity
       workspace is active again, load the stored school directory and rank the
       same level first. */
    if (hints.highSchool) {
      try {
        const response = await fetch("data/live/high-school-directory-v7-61-0.json", {cache:"no-store"});
        if (response.ok) {
          const data = await response.json();
          const orgById = new Map((data.organizations || []).map(org => [org.organizationId,org]));
          rows.push(...(data.teams || []).map(team => {
            const org = orgById.get(team.organizationId) || {};
            const school = org.shortName || team.organizationName || team.clubName || "";
            return {
              team:team.teamName || "",
              inputValue:`${school} ${team.teamName || ""}`.replace(/\s+/g," ").trim(),
              group:[team.gender,team.level].filter(Boolean).join(" "),
              ageGroup:team.ageGroup || "HS",
              gender:team.gender || "",
              squadLabel:team.squadDescriptor || team.level || "",
              level:team.level || team.squadDescriptor || "",
              aliases:[...(team.aliases || []),team.teamName || ""],
              slug:team.familyKey || "",
              familyKey:team.familyKey || "",
              canonicalTeamId:team.familyKey || "",
              club:team.organizationName || team.clubName || school,
              clubSlug:org.slug || "",
              displayClubName:school,
              organizationType:"high_school"
            };
          }));
        }
      } catch (_) {}
    }

    const seen = new Set();
    directory = rows.filter(row => {
      const key = rowKey(row);
      if (!row.team || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
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
      return `<button type="button" class="live-opponent-option" id="gameOpponentOption${index}" role="option" data-index="${index}" aria-selected="false"><strong>${esc(primaryLabel(row))}</strong><small>${esc(secondaryLabel(row))}</small><em>Use team</em></button>`;
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
    selecting = true;
    input.value = row.inputValue || row.team;
    input.dataset.wpiTeamId = row.canonicalTeamId || "";
    input.dataset.wpiTeamGroup = row.group || "";
    input.dataset.wpiDisplayLabel = primaryLabel(row);
    input.dispatchEvent(new Event("input", {bubbles:true}));
    input.dispatchEvent(new Event("change", {bubbles:true}));
    selecting = false;
    closeList();
    const hint = document.getElementById("gameOpponentMatchHint");
    if (hint) {
      hint.textContent = `Selected WPI team: ${primaryLabel(row)}.`;
      hint.dataset.state = "matched";
    }
    input.focus({preventScroll:true});
  }

  input.addEventListener("input", () => {
    if (!selecting) {
      input.dataset.wpiTeamId = "";
      input.dataset.wpiTeamGroup = "";
      input.dataset.wpiDisplayLabel = "";
    }
    render(input.value);
  });
  input.addEventListener("focus", () => render(input.value));
  input.addEventListener("keydown", event => {
    if (list.hidden || !visible.length) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setActive(activeIndex + 1); }
    else if (event.key === "ArrowUp" && visible.length) { event.preventDefault(); setActive(activeIndex <= 0 ? visible.length - 1 : activeIndex - 1); }
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
