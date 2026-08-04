/* WPI 7.55.7 — dedicated live-scoring access gateway. */
(() => {
  "use strict";

  const config = window.WPI_LIVE_SANDBOX_CONFIG || {};
  const AUTH_KEY = "wpi-live-auth-v7-55-7";
  const LEGACY_AUTH_KEYS = ["wpi-live-auth-v7-55-6", "wpi-live-auth-v7-55-5", "wpi-live-auth-v7-55-4", "wpi-live-auth-v7-55-3"];
  const $ = id => document.getElementById(id);
  let mode = "signin";
  let supabase = null;

  function setMode(nextMode) {
    mode = nextMode;
    const signingUp = mode === "signup";
    $("signInTab").setAttribute("aria-selected", String(!signingUp));
    $("signUpTab").setAttribute("aria-selected", String(signingUp));
    $("confirmPasswordLabel").hidden = !signingUp;
    $("confirmPassword").required = signingUp;
    $("loginSubmit").textContent = signingUp ? "Create account" : "Sign in";
    $("loginHeading").textContent = signingUp ? "Create a team account" : "Open the scoring console";
    $("loginExplanation").textContent = signingUp
      ? "Create an account now. A Team Owner will assign your scoring role after the connected backend is activated."
      : "Use the team account assigned to you.";
    $("loginMessage").textContent = "";
  }

  function enterDemo() {
    for (const key of LEGACY_AUTH_KEYS) localStorage.removeItem(key);
    localStorage.setItem(AUTH_KEY, JSON.stringify({
      environment: "sandbox",
      mode: "demo",
      createdAt: new Date().toISOString()
    }));
    window.location.assign("live-sandbox.html");
  }

  async function initConnectedMode() {
    const connected = config.mode === "connected" && config.supabaseUrl && config.supabasePublishableKey;
    if (!connected) {
      $("demoAccess").hidden = false;
      $("loginForm").hidden = true;
      $("signInTab").hidden = true;
      $("signUpTab").hidden = true;
      $("loginHeading").textContent = "Open the local sandbox";
      $("loginExplanation").textContent = "Secure team accounts become active when the team-owned Supabase project is connected.";
      return;
    }

    try {
      const module = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.8/+esm");
      supabase = module.createClient(config.supabaseUrl, config.supabasePublishableKey);
      const {data} = await supabase.auth.getSession();
      if (data.session) window.location.replace("live-sandbox.html");
    } catch (error) {
      $("loginMessage").textContent = `Connection failed: ${error.message}`;
    }
  }

  async function submitAuth(event) {
    event.preventDefault();
    if (!supabase) return;

    const email = $("loginEmail").value.trim();
    const password = $("loginPassword").value;
    const confirmPassword = $("confirmPassword").value;

    if (mode === "signup" && password !== confirmPassword) {
      $("loginMessage").textContent = "Passwords do not match.";
      return;
    }

    $("loginSubmit").disabled = true;
    $("loginMessage").textContent = mode === "signup" ? "Creating account…" : "Signing in…";

    const result = mode === "signup"
      ? await supabase.auth.signUp({email, password})
      : await supabase.auth.signInWithPassword({email, password});

    $("loginSubmit").disabled = false;
    if (result.error) {
      $("loginMessage").textContent = result.error.message;
      return;
    }

    if (mode === "signup" && !result.data.session) {
      $("loginMessage").textContent = "Account created. Check your email to confirm access, then return to sign in.";
      setMode("signin");
      return;
    }

    window.location.assign("live-sandbox.html");
  }

  function init() {
    $("signInTab").addEventListener("click", () => setMode("signin"));
    $("signUpTab").addEventListener("click", () => setMode("signup"));
    $("continueDemoButton").addEventListener("click", enterDemo);
    $("loginForm").addEventListener("submit", submitAuth);
    setMode("signin");
    initConnectedMode();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
