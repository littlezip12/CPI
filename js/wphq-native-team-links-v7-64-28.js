/* WPI 7.64.28 — Water Polo HQ native team-link routing.
 * Maps custom-scheme team links into the existing My Teams follow flow.
 * Universal Links remain deferred until the production Water Polo HQ domain is final.
 */
(() => {
  "use strict";

  const RELEASE = "7.64.28";
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const EVENT_NAME = "wphq:native-team-link";
  const PENDING_KEY = "wphq-native-team-link-v7-64-28";

  function isNative() {
    try {
      return window.__WPHQ_NATIVE__ === true ||
        document.documentElement?.dataset?.wphqNativeShell === "true" ||
        window.Capacitor?.isNativePlatform?.() === true;
    } catch (_) { return false; }
  }

  function cleanTeamId(value) {
    const teamId = String(value || "").trim();
    return UUID_RE.test(teamId) ? teamId.toLowerCase() : "";
  }

  function nativeTeamUrl(teamId) {
    const id = cleanTeamId(teamId);
    return id ? `waterpolohq://team/${id}` : "";
  }

  function targetForTeam(teamId) {
    const id = cleanTeamId(teamId);
    if (!id) return "";
    const target = new URL("live-following.html", window.location.href);
    target.searchParams.set("followTeam", id);
    target.searchParams.set("native", "1");
    return `${target.pathname.split("/").pop()}${target.search}`;
  }

  function parse(url) {
    try {
      const parsed = new URL(String(url || ""));
      if (parsed.protocol !== "waterpolohq:") return null;
      let teamId = "";
      if (parsed.hostname === "team") {
        teamId = cleanTeamId(parsed.pathname.replace(/^\/+/, "") || parsed.searchParams.get("team"));
      } else if (parsed.hostname === "follow") {
        teamId = cleanTeamId(parsed.searchParams.get("team") || parsed.searchParams.get("teamId"));
      }
      if (!teamId) return null;
      return { teamId, target: targetForTeam(teamId), url: nativeTeamUrl(teamId) };
    } catch (_) { return null; }
  }

  function route(url) {
    const parsed = parse(url);
    if (!parsed) return false;
    try { localStorage.setItem(PENDING_KEY, JSON.stringify(parsed)); } catch (_) {}
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: parsed }));
    const current = `${window.location.pathname.split("/").pop()}${window.location.search}`;
    if (current !== parsed.target) window.location.assign(parsed.target);
    return true;
  }

  function pending() {
    try {
      const raw = JSON.parse(localStorage.getItem(PENDING_KEY) || "null");
      if (!raw) return null;
      const teamId = cleanTeamId(raw.teamId);
      return teamId ? { teamId, target: targetForTeam(teamId), url: nativeTeamUrl(teamId) } : null;
    } catch (_) { return null; }
  }

  function clearPending() {
    try { localStorage.removeItem(PENDING_KEY); } catch (_) {}
  }

  function attachCapacitorListener(attempt = 0) {
    if (!isNative()) return;
    const App = window.Capacitor?.Plugins?.App;
    if (!App?.addListener || !App?.getLaunchUrl) {
      if (attempt < 40) setTimeout(() => attachCapacitorListener(attempt + 1), 100);
      return;
    }
    if (window.__WPHQ_NATIVE_TEAM_LINK_LISTENER__) return;
    window.__WPHQ_NATIVE_TEAM_LINK_LISTENER__ = true;
    App.addListener("appUrlOpen", event => { if (event?.url) route(event.url); });
    Promise.resolve(App.getLaunchUrl()).then(result => {
      if (result?.url) route(result.url);
    }).catch(() => {});
  }

  window.WPHQNativeTeamLinks = {
    release: RELEASE,
    eventName: EVENT_NAME,
    isNative,
    cleanTeamId,
    nativeTeamUrl,
    targetForTeam,
    parse,
    route,
    pending,
    clearPending
  };

  attachCapacitorListener();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => attachCapacitorListener(), { once: true });
  }
})();
