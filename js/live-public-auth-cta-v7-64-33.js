/* WPHQ 7.64.33 — signed-out Live Scores login CTA. */
(() => {
  "use strict";
  const RELEASE = "7.64.33";
  const config = window.WPI_LIVE_SANDBOX_CONFIG || {};
  const button = document.getElementById("publicLoginButton");
  if (!button) return;

  // Signed-out is the safe default: the login path should remain visible even
  // if auth status cannot be resolved. Permanent signed-in users do not need it.
  button.dataset.release = RELEASE;
  button.style.display = "";

  async function syncLoginCta() {
    try {
      if (!window.WPILiveBackend?.isConfigured(config)) return;
      const backend = await window.WPILiveBackend.connect(config);
      const session = await backend.session();
      const signedIn = Boolean(session && session.user && !backend.isAnonymousUser(session.user));
      button.style.display = signedIn ? "none" : "";
      button.setAttribute("aria-hidden", signedIn ? "true" : "false");
      if (signedIn) button.setAttribute("tabindex", "-1");
      else button.removeAttribute("tabindex");
    } catch (_) {
      button.style.display = "";
      button.setAttribute("aria-hidden", "false");
      button.removeAttribute("tabindex");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncLoginCta, { once: true });
  } else {
    syncLoginCta();
  }
})();
