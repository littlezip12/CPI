/* WPI 7.64.33 — Account Sign-Up & Login UX. (Water Polo HQ consumer copy)
 * Makes email/password the default permanent-account flow for supporters and
 * preserves Magic Link as an optional existing-account sign-in path.
 */
(() => {
  "use strict";

  const config = window.WPI_LIVE_SANDBOX_CONFIG || {};
  const $ = id => document.getElementById(id);
  let mode = "signin";
  let backend = null;
  let signupAllowed = true;
  let captchaToken = "";
  const params = new URLSearchParams(window.location.search);
  const onboarding = params.get("onboard") === "1";
  const following = params.get("follow") === "1";
  const followTeam = String(params.get("followTeam") || "").trim();

  function nativeAuth() { return window.WPHQNativeAuth || null; }
  function isNativeAuth() { return Boolean(nativeAuth()?.isNative?.()); }

  function friendlyAuthError(error) {
    const raw = String(error?.message || error || "").trim();
    const msg = raw.toLowerCase();
    if (msg.includes("invalid login credentials")) return "Email or password is incorrect. Try again, reset your password, or use a one-time sign-in link.";
    if (msg.includes("email not confirmed")) return "Confirm your email before logging in. Check your inbox for the Water Polo HQ verification email.";
    if (msg.includes("user already registered") || msg.includes("already registered")) return "An account already exists for this email. Choose “Log in”.";
    if (msg.includes("password") && (msg.includes("short") || msg.includes("least") || msg.includes("characters"))) return "Use a password with at least 12 characters.";
    if (msg.includes("email rate limit exceeded") || msg.includes("rate limit")) return "Too many authentication emails were requested. Please wait a few minutes, then try again.";
    if (msg.includes("captcha") && msg.includes("captcha_token")) return "Security verification is required before we can continue. Please try again in a moment.";
    if (msg.includes("expired") || msg.includes("invalid") || msg.includes("token")) return "This secure email link is invalid or has expired. Request a new link and try again.";
    if (msg.includes("network") || msg.includes("fetch")) return "Water Polo HQ could not reach the sign-in service. Check your connection and try again.";
    return raw || "Water Polo HQ could not complete authentication. Please try again.";
  }

  async function completeNativeAuthIfPresent() {
    const bridge = nativeAuth();
    if (!bridge || !backend) return false;
    const result = await bridge.completePending(backend.client);
    if (!result?.completed) return false;
    window.location.replace(result.target || followingTarget());
    return true;
  }

  function baseUrl(file) {
    return new URL(file, window.location.href).href;
  }

  function followingTarget() {
    const url = new URL("live-following.html", window.location.href);
    if (followTeam) url.searchParams.set("followTeam", followTeam);
    return `${url.pathname.split("/").pop()}${url.search}`;
  }

  function authTarget() {
    const invite = params.get("invite");
    if (onboarding) return "live-club-onboarding.html";
    if (following) return followingTarget();
    return `live-dashboard.html${invite ? `?invite=${encodeURIComponent(invite)}` : ""}`;
  }

  function nativeRedirectForAuth() {
    if (!isNativeAuth() || !following) return "";
    return nativeAuth().prepareRedirect(followingTarget());
  }

  async function initTurnstile() {
    const siteKey = String(config.turnstileSiteKey || "").trim();
    const container = $("turnstileContainer");
    if (!siteKey || !container) return;
    container.hidden = false;
    await new Promise((resolve, reject) => {
      if (window.turnstile) { resolve(); return; }
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    window.turnstile.render(container, {
      sitekey: siteKey,
      callback: token => { captchaToken = token || ""; },
      "expired-callback": () => { captchaToken = ""; }
    });
  }

  function authRedirect() {
    const invite = params.get("invite");
    const redirect = new URL(onboarding ? "live-club-onboarding.html" : (following ? "live-following.html" : "live-dashboard.html"), window.location.href);
    if (following && followTeam) redirect.searchParams.set("followTeam", followTeam);
    if (invite && !onboarding && !following) redirect.searchParams.set("invite", invite);
    return redirect;
  }

  function setMode(nextMode) {
    if (nextMode === "signup" && !signupAllowed) {
      $("loginMessage").textContent = onboarding
        ? "Create an account to submit a club onboarding request."
        : (following ? "Create a read-only supporter account to follow Water Polo HQ teams." : "New team accounts require a private team invitation.");
      return;
    }

    mode = nextMode;
    const signingUp = mode === "signup";
    $("signInTab").setAttribute("aria-selected", String(!signingUp));
    $("signUpTab").setAttribute("aria-selected", String(signingUp));
    $("confirmPasswordLabel").hidden = !signingUp;
    $("confirmPassword").required = signingUp;
    $("loginPassword").minLength = signingUp ? 12 : 1;
    $("loginPassword").setAttribute("autocomplete", signingUp ? "new-password" : "current-password");
    $("displayNameLabel").hidden = !signingUp;
    $("displayName").required = signingUp;
    $("forgotPasswordButton").hidden = signingUp;
    if ($("magicLinkButton")) $("magicLinkButton").hidden = signingUp;
    if ($("signupDataNotice")) $("signupDataNotice").hidden = !signingUp;
    $("loginSubmit").textContent = signingUp ? "Sign up" : "Log in";
    $("loginHeading").textContent = signingUp ? "Create your Water Polo HQ account" : "Log in to Water Polo HQ";
    $("loginExplanation").textContent = signingUp
      ? (onboarding
        ? "Create a verified account to request a new club workspace. This account receives no team or club authority until the request is approved."
        : (following
          ? "Create a verified read-only supporter account. Following teams never grants membership, scoring or admin access."
          : "Use your own email and password. New team members join as Supporter; a Team Owner or Admin can grant Scorer access after you join."))
      : (onboarding
        ? "Log in with your email and password to submit or review a club onboarding request."
        : (following
          ? "Log in with your email and password to open My Teams and your read-only Water Polo HQ game feed."
          : "Log in once, then choose any team workspace your account can access."));
    $("loginMessage").textContent = "";
  }

  async function initConnectedMode() {
    if (!window.WPILiveBackend?.isConfigured(config)) {
      $("loginForm").hidden = true;
      $("signInTab").hidden = true;
      $("signUpTab").hidden = true;
      $("loginHeading").textContent = "Water Polo HQ is unavailable";
      $("loginExplanation").textContent = "The connected Water Polo HQ service is not configured on this deployment.";
      return;
    }

    try {
      backend = await window.WPILiveBackend.connect(config);
      if (await completeNativeAuthIfPresent()) return;
      const session = await backend.session();
      const invite = params.get("invite");
      if (session && backend.isAnonymousUser(session.user)) {
        await backend.signOut();
      } else if (session) {
        window.location.replace(onboarding ? "live-club-onboarding.html" : (following ? followingTarget() : `live-dashboard.html${invite ? `?invite=${encodeURIComponent(invite)}` : ""}`));
        return;
      }

      // Account creation is always available. Creating an account never grants
      // team membership, scorer access, admin access, or club ownership; those
      // privileges remain controlled by the existing invitation/onboarding flows.
      signupAllowed = true;
      $("signUpTab").hidden = false;
      if (onboarding || following) {
        setMode("signup");
      } else {
        setMode("signin");
      }
      initTurnstile().catch(() => {});
    } catch (error) {
      $("loginMessage").textContent = friendlyAuthError(error);
    }
  }

  async function submitAuth(event) {
    event.preventDefault();
    if (!backend) return;
    const email = $("loginEmail").value.trim();
    const password = $("loginPassword").value;
    const confirmPassword = $("confirmPassword").value;
    const displayName = $("displayName").value.trim();

    if (mode === "signup" && password.length < 12) {
      $("loginMessage").textContent = "Use at least 12 characters for your password.";
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      $("loginMessage").textContent = "Passwords do not match.";
      return;
    }

    $("loginSubmit").disabled = true;
    $("loginMessage").textContent = mode === "signup" ? "Creating account…" : "Logging in…";
    try {
      const redirect = authRedirect();
      let data;
      if (mode === "signup") {
        const nativeRedirect = nativeRedirectForAuth();
        const options = {
          emailRedirectTo: nativeRedirect || redirect.href,
          data: { display_name: displayName }
        };
        if (captchaToken) options.captchaToken = captchaToken;
        const { data: signupData, error } = await backend.client.auth.signUp({ email, password, options });
        if (error) throw error;
        data = signupData;
      } else {
        data = await backend.signIn(email, password);
      }

      if (mode === "signup" && !data.session) {
        setMode("signin");
        $("loginEmail").value = email;
        $("loginMessage").textContent = isNativeAuth()
          ? "Account created. Check your email to verify it, then open the verification link on this iPhone to return to Water Polo HQ."
          : (onboarding
            ? "Account created. Check your email to verify it, then return to Club onboarding to log in."
            : (following
              ? "Account created. Check your email to verify it, then return to My Teams to log in."
              : "Account created. Check your email to verify it, then return here to log in."));
        return;
      }

      window.location.assign(authTarget());
    } catch (error) {
      $("loginMessage").textContent = friendlyAuthError(error);
    } finally {
      $("loginSubmit").disabled = false;
    }
  }

  async function sendMagicLink() {
    if (!backend) return;
    const email = $("loginEmail").value.trim();
    if (!email) {
      $("loginMessage").textContent = "Enter your email address first.";
      return;
    }

    const button = $("magicLinkButton");
    if (button) button.disabled = true;
    $("loginMessage").textContent = "Sending one-time sign-in link…";
    try {
      const redirect = authRedirect();
      const nativeRedirect = nativeRedirectForAuth();
      const options = {
        shouldCreateUser: false,
        emailRedirectTo: nativeRedirect || redirect.href
      };
      if (captchaToken) options.captchaToken = captchaToken;
      const { error } = await backend.client.auth.signInWithOtp({ email, options });
      if (error) throw error;
      $("loginMessage").textContent = isNativeAuth()
        ? "Check your email, then open the one-time sign-in link on this iPhone to return to Water Polo HQ."
        : "Check your email for your one-time Water Polo HQ sign-in link.";
    } catch (error) {
      $("loginMessage").textContent = friendlyAuthError(error);
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function forgotPassword() {
    if (!backend) return;
    const email = $("loginEmail").value.trim();
    if (!email) {
      $("loginMessage").textContent = "Enter your email address first.";
      return;
    }
    try {
      $("loginMessage").textContent = "Sending password-reset email…";
      await backend.requestPasswordReset(email, baseUrl("live-password-reset.html"));
      $("loginMessage").textContent = "Password-reset email sent. Check your inbox.";
    } catch (error) {
      $("loginMessage").textContent = friendlyAuthError(error);
    }
  }

  function init() {
    $("signInTab").addEventListener("click", () => setMode("signin"));
    $("signUpTab").addEventListener("click", () => setMode("signup"));
    $("forgotPasswordButton").addEventListener("click", forgotPassword);
    if ($("magicLinkButton")) $("magicLinkButton").addEventListener("click", sendMagicLink);
    $("loginForm").addEventListener("submit", submitAuth);
    window.addEventListener("wphq:native-auth-url", () => {
      if (backend) completeNativeAuthIfPresent().catch(error => {
        if ($("loginMessage")) $("loginMessage").textContent = friendlyAuthError(error);
      });
    });
    setMode("signin");
    initConnectedMode();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
