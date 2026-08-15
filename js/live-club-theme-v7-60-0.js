/* WPI 7.60.0 — Club Branding Platform
 * Data-driven visual theming for the active WPI Live scoring console.
 * Canonical identity is resolved from the generated theme registry; Live activation is explicit.
 * This module does not alter scoring state, game records, permissions, GroupMe delivery,
 * scorer control, roster state, navigation or offline recovery.
 */
(() => {
  "use strict";

  const RELEASE = "7.60.0";
  const body = document.body;
  if (!body) return;

  const registry = window.WPILiveClubThemeRegistry7600 || { clubs: [] };
  const clubs = Array.isArray(registry.clubs) ? registry.clubs : [];
  const normalize = value => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  const boundaryMatch = (value, alias) => {
    const v = normalize(value);
    const a = normalize(alias);
    if (!v || !a) return false;
    if (v === a) return true;
    if (!v.startsWith(a)) return false;
    const next = v.slice(a.length, a.length + 1);
    return !next || /[\s\-–—_/()]/.test(next);
  };

  function context() {
    const setupName = document.getElementById("teamName")?.value;
    const scoreName = document.getElementById("scoreTeamName")?.textContent;
    return {
      teamName: setupName || scoreName || "",
      clubName: body.dataset.liveClubName || "",
      clubId: body.dataset.liveClubId || body.dataset.liveCanonicalClubId || ""
    };
  }

  function identifyClub(nextContext = context()) {
    const requestedId = normalize(nextContext.clubId);
    if (requestedId) {
      const byId = clubs.find(row => normalize(row.clubId) === requestedId);
      if (byId) return byId;
    }
    const clubName = normalize(nextContext.clubName);
    const teamName = normalize(nextContext.teamName);
    let best = null;
    let bestLength = -1;
    for (const row of clubs) {
      const aliases = Array.isArray(row.aliases) ? row.aliases : [];
      for (const alias of aliases) {
        const a = normalize(alias);
        const matched = (clubName && boundaryMatch(clubName, a)) || (teamName && boundaryMatch(teamName, a));
        if (matched && a.length > bestLength) {
          best = row;
          bestLength = a.length;
        }
      }
    }
    return best;
  }

  function resolveTheme(nextContext = context()) {
    const club = identifyClub(nextContext);
    return club && club.liveEnabled ? club : null;
  }

  const cssProps = [
    "--club-primary", "--club-primary-deep", "--club-secondary", "--club-accent",
    "--club-accent-soft", "--club-score-accent", "--club-page-warm", "--club-page-water",
    "--club-surface-warm", "--club-primary-rgb", "--club-secondary-rgb", "--club-accent-rgb",
    "--club-logo-image", "--club-short-label"
  ];

  function clearThemePresentation() {
    delete body.dataset.liveClubTheme;
    delete body.dataset.liveClubThemeId;
    delete body.dataset.liveClubThemeLabel;
    delete body.dataset.liveClubThemeClubId;
    if (body.style?.removeProperty) cssProps.forEach(prop => body.style.removeProperty(prop));
  }

  function applyTheme(nextContext = context()) {
    const identified = identifyClub(nextContext);
    const theme = identified && identified.liveEnabled ? identified : null;
    clearThemePresentation();
    body.dataset.liveClubThemeRelease = RELEASE;
    body.dataset.liveClubIdentityMatch = identified?.clubId || "";
    body.dataset.liveClubThemeState = theme ? "enabled" : (identified ? "known-not-enabled" : "unmatched");
    if (!theme) return null;

    const t = theme.theme || {};
    body.dataset.liveClubTheme = "active";
    body.dataset.liveClubThemeId = theme.slug || theme.clubId;
    body.dataset.liveClubThemeClubId = theme.clubId;
    body.dataset.liveClubThemeLabel = theme.label || theme.slug || theme.clubId;
    if (body.style?.setProperty) {
      const set = (name, value) => { if (value) body.style.setProperty(name, value); };
      set("--club-primary", t.primary);
      set("--club-primary-deep", t.primaryDeep);
      set("--club-secondary", t.secondary);
      set("--club-accent", t.accent);
      set("--club-accent-soft", t.accentSoft);
      set("--club-score-accent", t.scoreAccent || t.accent);
      set("--club-page-warm", t.pageWarm);
      set("--club-page-water", t.pageWater);
      set("--club-surface-warm", t.surfaceWarm);
      set("--club-primary-rgb", t.primaryRgb);
      set("--club-secondary-rgb", t.secondaryRgb);
      set("--club-accent-rgb", t.accentRgb);
      if (theme.logo) set("--club-logo-image", `url("${String(theme.logo).replace(/"/g, "%22")}")`);
      set("--club-short-label", JSON.stringify(` · ${theme.shortLabel || theme.label || "Club"}`));
    }
    return theme.clubId;
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
      new MutationObserver(() => applyTheme()).observe(body, {
        attributes: true,
        attributeFilter: ["class", "data-live-club-name", "data-live-club-id", "data-live-canonical-club-id"]
      });
    }
    applyTheme();
  }

  window.WPILiveClubTheme7600 = {
    release: RELEASE,
    registryRelease: registry.release || null,
    counts: registry.counts || {},
    identifyClub,
    resolveTheme,
    applyTheme,
    enabledThemes: clubs.filter(row => row.liveEnabled).map(row => ({ clubId: row.clubId, slug: row.slug, label: row.label }))
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, { once: true });
  else bind();
})();
