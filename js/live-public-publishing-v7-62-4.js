/**
 * WPI 7.62.4 — Public Game Publishing & Sharing
 * Presentation-only companion for game audience clarity and share links.
 * Does not write game state or modify scorer authority.
 */
(() => {
  "use strict";

  const qs = (id) => document.getElementById(id);

  function currentGameId() {
    try {
      return new URLSearchParams(window.location.search).get("game") || "";
    } catch (_) {
      return "";
    }
  }

  function absolutePublicScoreUrl(gameId) {
    const url = new URL("live-score.html", window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("game", gameId);
    return url.toString();
  }

  async function copyText(text, statusEl) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        area.remove();
      }
      if (statusEl) statusEl.textContent = "Game link copied.";
    } catch (_) {
      if (statusEl) statusEl.textContent = "Could not copy automatically. Open the public score page and copy the address.";
    }
  }

  function setupGamePublishingControls() {
    const visibility = qs("visibility");
    const help = qs("visibilityHelp");
    const panel = qs("publicGameSharePanel");
    const open = qs("publicGameShareOpen");
    const copy = qs("publicGameShareCopy");
    const status = qs("publicGameShareStatus");
    if (!visibility || !help || !panel || !open || !copy) return;

    const descriptions = {
      team_private: "Team + followers can watch through their signed-in WPI experience. The game does not appear on the public WPI Live scoreboard.",
      private_only: "Only team members can watch this game in WPI. It does not appear to followers or on the public scoreboard.",
      public_team: "Anyone with WPI can see the score and game state on WPI Live. Rosters, player events, scorer identity and delivery data remain private."
    };

    function render() {
      const value = visibility.value || "team_private";
      help.textContent = descriptions[value] || descriptions.team_private;
      const isPublic = value === "public_team";
      panel.hidden = !isPublic;
      if (!isPublic) return;

      const gameId = currentGameId();
      if (gameId) {
        const href = absolutePublicScoreUrl(gameId);
        open.href = href;
        open.removeAttribute("aria-disabled");
        copy.disabled = false;
        qs("publicGameShareHelp").textContent = "This game has a public score-only link. WPI keeps roster, player-event, scorer and delivery detail private.";
        status.textContent = "";
      } else {
        open.href = "live.html";
        open.setAttribute("aria-disabled", "true");
        copy.disabled = true;
        qs("publicGameShareHelp").textContent = "Save this game first. WPI will then create a public score-only link for sharing.";
        status.textContent = "Public link available after the game is saved.";
      }
    }

    visibility.addEventListener("change", render);
    copy.addEventListener("click", () => {
      const gameId = currentGameId();
      if (!gameId) return;
      copyText(absolutePublicScoreUrl(gameId), status);
    });
    render();
  }

  function setupPublicScoreShare() {
    const button = qs("publicScoreShareButton");
    const status = qs("publicScoreShareStatus");
    if (!button) return;
    button.addEventListener("click", () => copyText(window.location.href, status));
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupGamePublishingControls();
    setupPublicScoreShare();
  });
})();
