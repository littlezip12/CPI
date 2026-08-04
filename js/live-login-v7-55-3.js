/* WPI 7.55.3 — live-scoring authentication gateway. */
(() => {
  "use strict";

  const config = window.WPI_LIVE_SANDBOX_CONFIG || {};
  const DEMO_SESSION_KEY = "wpi-live-demo-session-v7-55-3";
  const $ = id => document.getElementById(id);
  let supabase = null;

  function targetUrl() {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next") || "live-sandbox.html";
    return /^live-sandbox\.html(?:[?#].*)?$/.test(next) ? next : "live-sandbox.html";
  }

  function showTab(mode) {
    const signIn = mode === "signin";
    $("signInTab").setAttribute("aria-selected", String(signIn));
    $("signUpTab").setAttribute("aria-selected", String(!signIn));
    $("signInForm").hidden = !signIn;
    $("signUpForm").hidden = signIn;
    $("authMessage").textContent = "";
    const focusTarget = signIn ? $("signInEmail") : $("signUpName");
    window.setTimeout(() => focusTarget.focus(), 50);
  }

  function showMessage(message, kind = "info") {
    const node = $("authMessage");
    node.textContent = message;
    node.dataset.kind = kind;
  }

  function redirectToGame() {
    window.location.assign(targetUrl());
  }

  async function initConnectedAuth() {
    const connected = config.mode === "connected" && config.supabaseUrl && config.supabasePublishableKey;
    if (!connected) {
      $("demoAccessPanel").hidden = false;
      return;
    }

    $("demoAccessPanel").hidden = true;
    try {
      const module = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.8/+esm");
      supabase = module.createClient(config.supabaseUrl, config.supabasePublishableKey);
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (data.session) redirectToGame();
    } catch (error) {
      showMessage(`Secure login connection failed: ${error.message}`, "error");
      $("demoAccessPanel").hidden = false;
    }
  }

  async function signIn(event) {
    event.preventDefault();
    if (!supabase) {
      showMessage("Secure accounts are not connected yet. Use the local sandbox button below for interface testing.", "notice");
      return;
    }
    showMessage("Signing in…");
    const { error } = await supabase.auth.signInWithPassword({
      email: $("signInEmail").value.trim(),
      password: $("signInPassword").value
    });
    if (error) {
      showMessage(error.message, "error");
      return;
    }
    redirectToGame();
  }

  async function signUp(event) {
    event.preventDefault();
    const password = $("signUpPassword").value;
    const confirmation = $("signUpPasswordConfirm").value;
    if (password !== confirmation) {
      showMessage("The passwords do not match.", "error");
      return;
    }
    if (!supabase) {
      showMessage("Account creation becomes active when the team-owned Supabase project is connected. Use the local sandbox for now.", "notice");
      return;
    }

    showMessage("Creating account…");
    const { data, error } = await supabase.auth.signUp({
      email: $("signUpEmail").value.trim(),
      password,
      options: {
        data: { display_name: $("signUpName").value.trim() },
        emailRedirectTo: new URL(targetUrl(), window.location.href).href
      }
    });
    if (error) {
      showMessage(error.message, "error");
      return;
    }
    if (data.session) {
      redirectToGame();
      return;
    }
    showMessage("Account created. Check your email to confirm the address, then return here to sign in.", "success");
    showTab("signin");
    $("signInEmail").value = $("signUpEmail").value.trim();
  }

  function continueDemo() {
    sessionStorage.setItem(DEMO_SESSION_KEY, "active");
    redirectToGame();
  }

  function init() {
    $("signInTab").addEventListener("click", () => showTab("signin"));
    $("signUpTab").addEventListener("click", () => showTab("signup"));
    $("signInForm").addEventListener("submit", signIn);
    $("signUpForm").addEventListener("submit", signUp);
    $("continueDemoButton").addEventListener("click", continueDemo);
    showTab("signin");
    initConnectedAuth();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
