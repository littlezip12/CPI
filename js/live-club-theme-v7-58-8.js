/* WPI 7.58.8 — Club-Branded Game Experience
 * Theme resolver only. It does not alter scoring state, game records, permissions,
 * GroupMe delivery, scorer control or navigation.
 */
(() => {
  "use strict";

  const RELEASE = "7.58.8";
  const body = document.body;
  if (!body) return;

  const normalize = value => String(value || "").trim().toLowerCase();

  const THEMES = [
    {
      id: "lamorinda",
      label: "Lamorinda Water Polo",
      matches({ teamName, clubName }) {
        const team = normalize(teamName);
        const club = normalize(clubName);
        return team.startsWith("lamorinda") || club.includes("lamorinda");
      }
    }
  ];

  function context() {
    const setupName = document.getElementById("teamName")?.value;
    const scoreName = document.getElementById("scoreTeamName")?.textContent;
    const teamName = setupName || scoreName || "";
    const clubName = body.dataset.liveClubName || "";
    return { teamName, clubName };
  }

  function resolveTheme(nextContext = context()) {
    return THEMES.find(theme => theme.matches(nextContext)) || null;
  }

  function applyTheme(nextContext = context()) {
    const theme = resolveTheme(nextContext);
    if (theme) {
      body.dataset.liveClubTheme = theme.id;
      body.dataset.liveClubThemeRelease = RELEASE;
      body.dataset.liveClubThemeLabel = theme.label;
    } else {
      delete body.dataset.liveClubTheme;
      delete body.dataset.liveClubThemeLabel;
      body.dataset.liveClubThemeRelease = RELEASE;
    }
    return theme?.id || null;
  }

  function bind() {
    const teamInput = document.getElementById("teamName");
    if (teamInput) {
      teamInput.addEventListener("input", () => applyTheme());
      teamInput.addEventListener("change", () => applyTheme());
    }

    const scoreName = document.getElementById("scoreTeamName");
    if (scoreName && "MutationObserver" in window) {
      new MutationObserver(() => applyTheme()).observe(scoreName, { childList: true, characterData: true, subtree: true });
    }

    if ("MutationObserver" in window) {
      new MutationObserver(() => applyTheme()).observe(body, { attributes: true, attributeFilter: ["class", "data-live-club-name"] });
    }

    applyTheme();
  }

  window.WPILiveClubTheme7588 = {
    release: RELEASE,
    themes: THEMES.map(({ id, label }) => ({ id, label })),
    resolveTheme,
    applyTheme
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, { once: true });
  else bind();
})();
