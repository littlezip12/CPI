/* WPI 7.56.5 — connected email/password gateway. */
(() => {
  "use strict";

  const config = window.WPI_LIVE_SANDBOX_CONFIG || {};
  const AUTH_KEY = "wpi-live-auth-v7-56-5";
  const LEGACY_AUTH_KEYS = ["wpi-live-auth-v7-56-3","wpi-live-auth-v7-56-2","wpi-live-auth-v7-56-1","wpi-live-auth-v7-56-0","wpi-live-auth-v7-55-9","wpi-live-auth-v7-55-8","wpi-live-auth-v7-55-7","wpi-live-auth-v7-55-6","wpi-live-auth-v7-55-5","wpi-live-auth-v7-55-4","wpi-live-auth-v7-55-3"];
  const $ = id => document.getElementById(id);
  let mode = "signin";
  let backend = null;
  let signupAllowed = true;

  function baseUrl(file) {
    return new URL(file, window.location.href).href;
  }

  function setMode(nextMode) {
    if (nextMode === "signup" && !signupAllowed) {
      $("loginMessage").textContent = "New accounts require a private team invitation.";
      return;
    }
    mode = nextMode;
    const signingUp = mode === "signup";
    $("signInTab").setAttribute("aria-selected", String(!signingUp));
    $("signUpTab").setAttribute("aria-selected", String(signingUp));
    $("confirmPasswordLabel").hidden = !signingUp;
    $("confirmPassword").required = signingUp;
    $("displayNameLabel").hidden = !signingUp;
    $("displayName").required = signingUp;
    $("forgotPasswordButton").hidden = signingUp;
    $("loginSubmit").textContent = signingUp ? "Create account" : "Sign in";
    $("loginHeading").textContent = signingUp ? "Create your WPI Live account" : "Open your team workspace";
    $("loginExplanation").textContent = signingUp
      ? "Use your own email and password. Access to a team is controlled by Owner, Admin, Scorer, and Viewer roles."
      : "Sign in with the email assigned to your team workspace.";
    $("loginMessage").textContent = "";
  }

  function enterDemo() {
    for (const key of LEGACY_AUTH_KEYS) localStorage.removeItem(key);
    localStorage.setItem(AUTH_KEY, JSON.stringify({environment:"sandbox",mode:"demo",createdAt:new Date().toISOString()}));
    window.location.assign("live-dashboard.html");
  }

  async function initConnectedMode() {
    if (!window.WPILiveBackend?.isConfigured(config)) {
      $("demoAccess").hidden = false;
      if (!config.allowLocalDemo) $("continueDemoButton").hidden = true;
      $("loginForm").hidden = true;
      $("signInTab").hidden = true;
      $("signUpTab").hidden = true;
      $("loginHeading").textContent = "Open the local sandbox";
      $("loginExplanation").textContent = "Connected accounts activate after the team-owned Supabase project is configured.";
      return;
    }

    try {
      backend = await window.WPILiveBackend.connect(config);
      const session = await backend.session();
      const invite = new URLSearchParams(window.location.search).get("invite");
      if (session) {
        window.location.replace(`live-dashboard.html${invite ? `?invite=${encodeURIComponent(invite)}` : ""}`);
        return;
      }
      const registration = await backend.registrationStatus();
      signupAllowed = Boolean(invite || registration.bootstrapAvailable);
      $("signUpTab").hidden = !signupAllowed;
      if (!signupAllowed) {
        $("loginExplanation").textContent = "Sign in with an existing account. New accounts require a private Team Owner or Admin invitation.";
      }
    } catch (error) {
      $("loginMessage").textContent = `Connection failed: ${error.message}`;
    }
  }

  async function submitAuth(event) {
    event.preventDefault();
    if (!backend) return;
    const email = $("loginEmail").value.trim();
    const password = $("loginPassword").value;
    const confirmPassword = $("confirmPassword").value;
    const displayName = $("displayName").value.trim();

    if (mode === "signup" && password !== confirmPassword) {
      $("loginMessage").textContent = "Passwords do not match.";
      return;
    }

    $("loginSubmit").disabled = true;
    $("loginMessage").textContent = mode === "signup" ? "Creating account…" : "Signing in…";
    try {
      const invite = new URLSearchParams(window.location.search).get("invite");
      const dashboardRedirect = new URL("live-dashboard.html", window.location.href);
      if (invite) dashboardRedirect.searchParams.set("invite", invite);
      const data = mode === "signup"
        ? await backend.signUp(email, password, {displayName, emailRedirectTo:dashboardRedirect.href})
        : await backend.signIn(email, password);

      if (mode === "signup" && !data.session) {
        $("loginMessage").textContent = "Account created. Check your email to confirm it, then return here to sign in.";
        setMode("signin");
        return;
      }
      window.location.assign(`live-dashboard.html${invite ? `?invite=${encodeURIComponent(invite)}` : ""}`);
    } catch (error) {
      $("loginMessage").textContent = error.message;
    } finally {
      $("loginSubmit").disabled = false;
    }
  }

  async function forgotPassword() {
    if (!backend) return;
    const email = $("loginEmail").value.trim();
    if (!email) { $("loginMessage").textContent = "Enter your email address first."; return; }
    try {
      $("loginMessage").textContent = "Sending password-reset email…";
      await backend.requestPasswordReset(email, baseUrl("live-password-reset.html"));
      $("loginMessage").textContent = "Password-reset email sent. Check your inbox.";
    } catch (error) { $("loginMessage").textContent = error.message; }
  }

  function init() {
    $("signInTab").addEventListener("click", () => setMode("signin"));
    $("signUpTab").addEventListener("click", () => setMode("signup"));
    $("continueDemoButton").addEventListener("click", enterDemo);
    $("forgotPasswordButton").addEventListener("click", forgotPassword);
    $("loginForm").addEventListener("submit", submitAuth);
    setMode("signin");
    initConnectedMode();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
