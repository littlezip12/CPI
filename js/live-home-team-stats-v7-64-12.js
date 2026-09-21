/* WPI 7.64.12 — Team Stats landing-page entry. */
(() => {
  "use strict";
  const RELEASE = "7.64.12";
  const config = window.WPI_LIVE_SANDBOX_CONFIG || {};
  const button = document.getElementById("publicTeamStatsButton");
  if (!button) return;

  const myTeamsHref = "live-following.html?stats=1";
  const signInHref = "live-login.html?follow=1";
  button.href = myTeamsHref;
  button.dataset.release = RELEASE;

  async function resolveTeamStatsDestination() {
    try {
      if (!window.WPILiveBackend?.isConfigured(config)) return;
      const backend = await window.WPILiveBackend.connect(config);
      const session = await backend.session();
      if (!session || backend.isAnonymousUser(session.user)) {
        button.href = signInHref;
        button.title = "Sign in to open your team stats";
        return;
      }

      const { data, error } = await backend.client.rpc("live_following_overview_v2");
      if (error) throw error;
      const uniqueTeamIds = [...new Set((Array.isArray(data?.teams) ? data.teams : [])
        .filter(row => row?.teamId && (row.isMember || row.isFollowing))
        .map(row => String(row.teamId)))];

      if (uniqueTeamIds.length === 1) {
        button.href = `live-team-insights.html?team=${encodeURIComponent(uniqueTeamIds[0])}`;
        button.title = "Open Team Stats";
      } else {
        button.href = myTeamsHref;
        button.title = uniqueTeamIds.length > 1 ? "Choose a team to view stats" : "Choose or follow a team to view stats";
      }
    } catch (_) {
      button.href = myTeamsHref;
      button.title = "Choose a team to view stats";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", resolveTeamStatsDestination, { once: true });
  } else {
    resolveTeamStatsDestination();
  }
})();
