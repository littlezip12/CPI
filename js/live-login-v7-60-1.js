/* WPI 7.60.1 — Self-Service Club Onboarding Auth Entry.
 * Preserves invite-only team registration while allowing a no-authority account
 * to be created specifically for reviewed club onboarding.
 */
(() => {
  "use strict";

  const config = window.WPI_LIVE_SANDBOX_CONFIG || {};
  const AUTH_KEY = "wpi-live-auth-v7-56-8";
  const LEGACY_AUTH_KEYS = ["wpi-live-auth-v7-56-3","wpi-live-auth-v7-56-2","wpi-live-auth-v7-56-1","wpi-live-auth-v7-56-0","wpi-live-auth-v7-55-9","wpi-live-auth-v7-55-8","wpi-live-auth-v7-55-7","wpi-live-auth-v7-55-6","wpi-live-auth-v7-55-5","wpi-live-auth-v7-55-4","wpi-live-auth-v7-55-3"];
  const $ = id => document.getElementById(id);
  let mode = "signin";
  let backend = null;
  let signupAllowed = true;
  const params = new URLSearchParams(window.location.search);
  const onboarding = params.get("onboard") === "1";

  function baseUrl(file) {
    return new URL(file, window.location.href).href;
  }

  function setMode(nextMode) {
    if (nextMode === "signup" && !signupAllowed) {
      $("loginMessage").textContent = onboarding ? "Create an account to submit a club onboarding request." : "New team accounts require a private team invitation.";
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
    if ($("signupDataNotice")) $("signupDataNotice").hidden = !signingUp;
    $("loginSubmit").textContent = signingUp ? "Create account" : "Sign in";
    $("loginHeading").textContent = signingUp ? "Create your WPI Live account" : "Open WPI Live";
    $("loginExplanation").textContent = signingUp
      ? (onboarding ? "Create a verified account to request a new club workspace. This account receives no team or club authority until the request is approved." : "Use your own email and password. New team members join as Supporter; a Team Owner or Admin can grant Scorer access after you join.")
      : (onboarding ? "Sign in to submit or review a club onboarding request." : "Sign in once, then choose any team workspace your account can access.");
    $("loginMessage").textContent = "";
  }

  async function initConnectedMode() {
    if (!window.WPILiveBackend?.isConfigured(config)) {
      $("loginForm").hidden = true;
      $("signInTab").hidden = true;
      $("signUpTab").hidden = true;
      $("loginHeading").textContent = "WPI Live is unavailable";
      $("loginExplanation").textContent = "The connected WPI Live service is not configured on this deployment.";
      return;
    }

    try {
      backend = await window.WPILiveBackend.connect(config);
      const session = await backend.session();
      const invite = params.get("invite");
      if (session && backend.isAnonymousUser(session.user)) {
        await backend.signOut();
      } else if (session) {
        window.location.replace(onboarding ? "live-club-onboarding.html" : `live-dashboard.html${invite ? `?invite=${encodeURIComponent(invite)}` : ""}`);
        return;
      }
      const registration = await backend.registrationStatus();
      signupAllowed = Boolean(onboarding || invite || registration.bootstrapAvailable);
      $("signUpTab").hidden = !signupAllowed;
      if (!signupAllowed) {
        $("loginExplanation").textContent = "Sign in with an existing account. New team accounts require a private invitation; club organizers can use Club onboarding below.";
      } else if (onboarding) {
        setMode("signup");
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
      const invite = params.get("invite");
      const dashboardRedirect = new URL(onboarding ? "live-club-onboarding.html" : "live-dashboard.html", window.location.href);
      if (invite && !onboarding) dashboardRedirect.searchParams.set("invite", invite);
      const data = mode === "signup"
        ? await backend.signUp(email, password, {displayName, emailRedirectTo:dashboardRedirect.href})
        : await backend.signIn(email, password);

      if (mode === "signup" && !data.session) {
        setMode("signin");
        $("loginMessage").textContent = onboarding
          ? "Account created. Check your email to confirm it, then return to Club onboarding to sign in."
          : "Account created. Check your email to confirm it, then return here to sign in.";
        return;
      }
      window.location.assign(onboarding ? "live-club-onboarding.html" : `live-dashboard.html${invite ? `?invite=${encodeURIComponent(invite)}` : ""}`);
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
    $("forgotPasswordButton").addEventListener("click", forgotPassword);
    $("loginForm").addEventListener("submit", submitAuth);
    setMode("signin");
    initConnectedMode();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
