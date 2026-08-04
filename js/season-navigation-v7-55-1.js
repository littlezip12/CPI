/* WPI 7.55.1 — shared competitive-season selector and profile states */
(() => {
  "use strict";
  const api = window.WPISeason;
  if (!api) return;
  const page = api.pageName();
  const season = api.resolve(page);
  const FINAL_ID = api.index.finalRankingSeasonId;
  const ACTIVE_ID = api.index.activeSeasonId;
  const finalSeason = api.get(FINAL_ID);
  const isActive = season.id === ACTIVE_ID;
  const eligible = new Set(["rankings", "teams", "team", "clubs", "club"]);
  if (!eligible.has(page)) return;

  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const query = new URLSearchParams(location.search);
  const main = document.querySelector("main");
  if (!main) return;

  document.body.classList.toggle("wpi-active-ranking-season", isActive);
  document.body.dataset.wpiSeason = season.id;

  function seasonDescription() {
    if (isActive) {
      return page === "teams" || page === "clubs"
        ? "Results gathering is underway. Directory identities remain available; any rank shown is clearly retained as 2025–2026 final-season context."
        : "No preseason rankings are being fabricated. Verified 2026–2027 results will be collected before reviewed rankings are published.";
    }
    return "Completed-season rankings and profiles are frozen as an immutable historical record and will not change when the next season begins.";
  }

  const context = document.createElement("section");
  context.className = "wpi-season-context";
  context.setAttribute("aria-label", "Competitive season selection");
  context.innerHTML = `<div class="wpi-season-context-inner">
    <div class="wpi-season-context-copy"><span>${esc(season.status === "final" ? "Final season" : "Current season")}</span><strong>${esc(season.label)}${season.rankingStatus === "final" ? " Final Rankings" : " · Results gathering in progress"}</strong><p>${esc(seasonDescription())}</p></div>
    <div class="wpi-season-control"><label for="wpiSeasonSelect">Competitive season</label><select id="wpiSeasonSelect">${api.index.seasons.map(item => `<option value="${esc(item.id)}"${item.id === season.id ? " selected" : ""}>${esc(item.label)}${item.status === "final" ? " — Final" : " — Current"}</option>`).join("")}</select></div>
  </div>`;
  main.parentNode.insertBefore(context, main);
  context.querySelector("select")?.addEventListener("change", event => {
    const url = new URL(location.href);
    url.searchParams.set("season", event.target.value);
    location.href = url.toString();
  });

  function updateLink(anchor) {
    if (!anchor || anchor.dataset.wpiSeasonLink === season.id) return;
    const href = anchor.getAttribute("href") || "";
    if (!/^(?:rankings|teams|team|clubs|club)\.html(?:[?#]|$)/.test(href)) return;
    anchor.setAttribute("href", api.withSeason(href, season.id));
    anchor.dataset.wpiSeasonLink = season.id;
  }

  function updateLinks(root = document) {
    root.querySelectorAll?.("a[href]").forEach(updateLink);
  }
  updateLinks();
  const observer = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
    if (node.nodeType !== 1) return;
    if (node.matches?.("a[href]")) updateLink(node);
    updateLinks(node);
  })));
  observer.observe(main, { childList:true, subtree:true });

  function replaceExactText(root, replacements) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const trimmed = node.nodeValue.trim();
      if (!Object.prototype.hasOwnProperty.call(replacements, trimmed)) return;
      node.nodeValue = node.nodeValue.replace(trimmed, replacements[trimmed]);
    });
  }

  function teamIdentity() {
    const requested = query.get("team") || "";
    const rankings = Array.isArray(window.CPI_RANKINGS) ? window.CPI_RANKINGS : [];
    const normalized = value => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const team = rankings.find(item => item.slug === requested || normalized(item.team) === normalized(requested));
    const renderedName = main.querySelector("h1")?.textContent?.trim();
    return {
      name: team?.team || renderedName || requested || "Team",
      subtitle: [team?.displayClubName || team?.club, team?.group].filter(Boolean).join(" · ") || "Team profile",
      logo: team?.logo || "assets/logos/cpi-logo-fallback.svg",
    };
  }

  function clubIdentity() {
    const requested = query.get("club") || "";
    const clubs = Array.isArray(window.CPI_CLUBS) ? window.CPI_CLUBS : [];
    const club = clubs.find(item => item.slug === requested || item.canonicalClubId === requested);
    const renderedName = main.querySelector("h1")?.textContent?.trim();
    return {
      name: club?.displayName || club?.club || renderedName || requested || "Club",
      subtitle: [club?.locationLabel || club?.region, "Club profile"].filter(Boolean).join(" · "),
      logo: club?.logo || "assets/logos/cpi-logo-fallback.svg",
    };
  }

  function renderActiveProfile(kind) {
    const identity = kind === "team" ? teamIdentity() : clubIdentity();
    const entityParam = kind === "team" ? "team" : "club";
    const entityValue = query.get(entityParam) || "";
    const finalUrl = new URL(`${kind}.html`, location.href);
    if (entityValue) finalUrl.searchParams.set(entityParam, entityValue);
    finalUrl.searchParams.set("season", FINAL_ID);
    main.innerHTML = `<section class="wpi-active-season-profile">
      <div class="wpi-active-season-profile-head"><img class="wpi-active-season-profile-logo" src="${esc(identity.logo)}" alt=""><div><span class="season-kicker">${esc(season.label)} ${esc(kind)} profile</span><h1>${esc(identity.name)}</h1><p class="season-subtitle">${esc(identity.subtitle)}</p></div></div>
      <div class="wpi-active-season-profile-status"><strong>Results gathering in progress</strong><p>WPI has not published ${esc(season.label)} rankings or automatically aged teams into new groups. This profile will activate as verified tournament evidence is connected and reviewed.</p></div>
      <div class="wpi-active-season-profile-actions"><a href="${esc(finalUrl.pathname.split('/').pop() + finalUrl.search)}">View the ${esc(finalSeason.label)} final profile</a><a class="secondary" href="tournaments.html?season=${esc(ACTIVE_ID)}">Follow ${esc(season.label)} tournaments</a></div>
    </section>`;
    updateLinks(main);
  }

  if (isActive && (page === "team" || page === "club")) {
    renderActiveProfile(page);
  } else if (!isActive && page === "team") {
    replaceExactText(main, {
      "Current Rank":"Final Rank",
      "Current rankings":"2025–2026 final rankings",
      "Current WPI portfolio":"2025–2026 final portfolio",
    });
  } else if (!isActive && page === "club") {
    replaceExactText(main, {
      "Best current rank":"Best final rank",
      "Current rankings":"2025–2026 final rankings",
      "Current WPI portfolio":"2025–2026 final portfolio",
    });
  }
})();
