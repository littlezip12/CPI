/* WPI 7.64.26 — Water Polo HQ native authentication bridge.
 * Handles Capacitor custom-scheme auth returns without changing the web auth path.
 */
(() => {
  "use strict";

  const RELEASE = "7.64.26";
  const CALLBACK_URL = "waterpolohq://auth/callback";
  const URL_KEY = "wphq-native-auth-url-v7-64-26";
  const TARGET_KEY = "wphq-native-auth-target-v7-64-26";
  const EVENT_NAME = "wphq:native-auth-url";

  function isNative() {
    try {
      return window.__WPHQ_NATIVE__ === true ||
        document.documentElement?.dataset?.wphqNativeShell === "true" ||
        window.Capacitor?.isNativePlatform?.() === true;
    } catch (_) { return false; }
  }

  function sanitizeTarget(value) {
    const raw = String(value || "").trim();
    if (/^live-following\.html(?:\?.*)?$/.test(raw)) return raw;
    return "live-following.html";
  }

  function prepareRedirect(target) {
    if (!isNative()) return "";
    try { localStorage.setItem(TARGET_KEY, sanitizeTarget(target)); } catch (_) {}
    return CALLBACK_URL;
  }

  function pendingTarget() {
    try { return sanitizeTarget(localStorage.getItem(TARGET_KEY)); }
    catch (_) { return "live-following.html"; }
  }

  function authParams(url) {
    const parsed = new URL(url);
    const params = new URLSearchParams(parsed.search);
    const hash = new URLSearchParams((parsed.hash || "").replace(/^#/, ""));
    hash.forEach((value, key) => { if (!params.has(key)) params.set(key, value); });
    return params;
  }

  function isAuthCallback(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "waterpolohq:" && parsed.hostname === "auth" && parsed.pathname === "/callback";
    } catch (_) { return false; }
  }

  function loginUrl() {
    try { return new URL("/live-login.html?follow=1&nativeAuth=1", window.location.origin).href; }
    catch (_) { return "live-login.html?follow=1&nativeAuth=1"; }
  }

  function receive(url) {
    if (!isAuthCallback(url)) return false;
    try { localStorage.setItem(URL_KEY, String(url)); } catch (_) {}
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { url: String(url) } }));
    if (!/\/live-login\.html$/.test(window.location.pathname)) window.location.assign(loginUrl());
    return true;
  }

  async function completePending(client) {
    if (!isNative() || !client) return { completed: false, target: pendingTarget() };
    let raw = "";
    try { raw = localStorage.getItem(URL_KEY) || ""; } catch (_) {}
    if (!raw) return { completed: false, target: pendingTarget() };

    const params = authParams(raw);
    const errorDescription = params.get("error_description") || params.get("error");
    if (errorDescription) throw new Error(decodeURIComponent(errorDescription.replace(/\+/g, " ")));

    let completed = false;
    const code = params.get("code");
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const tokenHash = params.get("token_hash");
    const type = params.get("type") || "email";

    if (code && typeof client.auth.exchangeCodeForSession === "function") {
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (error) throw error;
      completed = true;
    } else if (accessToken && refreshToken) {
      const { error } = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      if (error) throw error;
      completed = true;
    } else if (tokenHash && typeof client.auth.verifyOtp === "function") {
      const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type });
      if (error) throw error;
      completed = true;
    } else {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      completed = Boolean(data?.session);
    }

    if (!completed) throw new Error("Water Polo HQ could not complete the secure sign-in return.");
    const target = pendingTarget();
    try {
      localStorage.removeItem(URL_KEY);
      localStorage.removeItem(TARGET_KEY);
    } catch (_) {}
    return { completed: true, target };
  }

  function attachCapacitorListener(attempt = 0) {
    if (!isNative()) return;
    const App = window.Capacitor?.Plugins?.App;
    if (!App?.addListener || !App?.getLaunchUrl) {
      if (attempt < 40) setTimeout(() => attachCapacitorListener(attempt + 1), 100);
      return;
    }
    if (window.__WPHQ_NATIVE_AUTH_LISTENER__) return;
    window.__WPHQ_NATIVE_AUTH_LISTENER__ = true;
    App.addListener("appUrlOpen", event => { if (event?.url) receive(event.url); });
    Promise.resolve(App.getLaunchUrl()).then(result => {
      if (result?.url) receive(result.url);
    }).catch(() => {});
  }

  window.WPHQNativeAuth = {
    release: RELEASE,
    callbackUrl: CALLBACK_URL,
    eventName: EVENT_NAME,
    isNative,
    prepareRedirect,
    pendingTarget,
    receive,
    completePending
  };

  attachCapacitorListener();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => attachCapacitorListener(), { once: true });
})();
