/* WPI 7.58.6 — per-game browser storage scope.
 * A live game gets its own local/offline state key. Drafts are scoped by team.
 * This prevents two simultaneous club games from overwriting one another in
 * localStorage while keeping the legacy key available for one-time migration.
 */
(() => {
  "use strict";
  const PREFIX = "wpi-live-game-v7-58-6";
  const LEGACY_KEY = "wpi-live-sandbox-v7-56-15";
  const clean = value => encodeURIComponent(String(value || "").trim());

  function gameKey(gameId) {
    if (!String(gameId || "").trim()) return `${PREFIX}:draft`;
    return `${PREFIX}:game:${clean(gameId)}`;
  }

  function draftKey(teamId = null) {
    return String(teamId || "").trim()
      ? `${PREFIX}:draft-team:${clean(teamId)}`
      : `${PREFIX}:draft`;
  }

  function routeScope(search = null) {
    const raw = search == null ? (window?.location?.search || "") : String(search || "");
    const params = new URLSearchParams(raw);
    const gameId = params.get("game");
    if (gameId) return gameKey(gameId);
    return draftKey(params.get("team"));
  }

  function isDraftKey(key) {
    return String(key || "").startsWith(`${PREFIX}:draft`);
  }

  window.WPILiveGameStorage7586 = Object.freeze({
    prefix:PREFIX,
    legacyKey:LEGACY_KEY,
    gameKey,
    draftKey,
    routeScope,
    isDraftKey
  });
})();
