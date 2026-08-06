/* WPI 7.56.5 — connected email password reset. */
(() => {
  "use strict";
  const config = window.WPI_LIVE_SANDBOX_CONFIG || {};
  const form = document.getElementById("passwordResetForm");
  const message = document.getElementById("passwordResetMessage");
  let backend = null;

  async function init() {
    if (!window.WPILiveBackend?.isConfigured(config)) {
      message.textContent = "Password reset becomes active after Supabase is connected.";
      form.querySelector("button").disabled = true;
      return;
    }
    backend = await window.WPILiveBackend.connect(config);
    const session = await backend.waitForHealthySession(6);
    if (!session) {
      message.textContent = "This password-reset link is invalid or has expired. Request a new link from WPI Live sign in.";
      form.querySelector("button").disabled = true;
    }
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const password = document.getElementById("newPassword").value;
    const confirm = document.getElementById("confirmNewPassword").value;
    if (password !== confirm) { message.textContent = "Passwords do not match."; return; }
    try {
      message.textContent = "Saving…";
      await backend.updatePassword(password);
      message.textContent = "Password updated. Returning to WPI Live…";
      setTimeout(() => window.location.assign("live-dashboard.html"), 700);
    } catch (error) { message.textContent = error.message; }
  });

  init().catch(error => { message.textContent = error.message; });
})();
