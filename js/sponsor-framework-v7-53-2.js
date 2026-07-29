/* WPI 7.53.2 — centralized sponsor framework */
(function () {
  "use strict";

  const config = window.WPI_SPONSOR_CONFIG;
  if (!config || !Array.isArray(config.placements) || !Array.isArray(config.campaigns)) return;

  const script = document.currentScript;
  const siteRoot = script?.src ? new URL("../", script.src) : new URL("./", window.location.href);
  const normalize = (value) => String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const cleanText = (value) => String(value || "").trim();
  const asList = (value) => Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
  const valuesMatch = (targets, actual) => {
    const expected = asList(targets).map(normalize).filter(Boolean);
    if (!expected.length) return true;
    const actualValues = asList(actual).map(normalize).filter(Boolean);
    return actualValues.some((value) => expected.includes(value));
  };

  function pageType() {
    const path = window.location.pathname.toLowerCase();
    if (/\/club\.html$/.test(path) || document.body.classList.contains("club-profile-page")) return "club";
    if (/\/team\.html$/.test(path) || document.body.classList.contains("team-profile-page")) return "team";
    if (/\/clubs\.html$/.test(path) || document.body.classList.contains("club-intelligence-page")) return "regions";
    if (/\/rankings\.html$/.test(path) || document.querySelector("#groupHub")) return "rankings";
    if (/\/tournaments\.html$/.test(path)) return "tournaments";
    if (path.includes("/tournaments/") || /quicksilver-cup-2026\.html$/.test(path)) return "tournament";
    return "other";
  }

  function query(name) {
    return new URLSearchParams(window.location.search || "").get(name) || "";
  }

  function resolveTeam(slug) {
    const target = normalize(slug);
    const rankings = Array.isArray(window.CPI_RANKINGS) ? window.CPI_RANKINGS : [];
    const joTeams = Object.values(window.WPI_JO_PROFILES?.teams || {});
    return rankings.find((team) => [team.slug, team.profileSlug, team.teamPage, team.team].some((value) => normalize(value) === target || normalize(String(value || "").split("team=").pop()) === target))
      || joTeams.find((team) => [team.profileSlug, team.participantId, team.teamPage, team.team].some((value) => normalize(value) === target || normalize(String(value || "").split("team=").pop()) === target))
      || null;
  }

  function resolveClub(slug) {
    const target = normalize(slug);
    const clubs = Array.isArray(window.CPI_CLUBS) ? window.CPI_CLUBS : [];
    return clubs.find((club) => [club.slug, club.displayName, club.club, club.name].some((value) => normalize(value) === target)) || null;
  }

  function inferTournament() {
    const path = window.location.pathname.toLowerCase();
    const explicit = query("tournament") || query("event");
    if (explicit) return normalize(explicit);
    const known = [
      ["jo-boys", "2026-jo-boys"],
      ["jo-girls", "2026-jo-girls-coed"],
      ["boys-superfinals", "boys-futures-super-finals"],
      ["girls-club-championships", "girls-us-club-championships"],
      ["quicksilver-cup", "quicksilver-cup"],
      ["quicksilver-cup-2026", "quicksilver-cup"]
    ];
    return known.find(([needle]) => path.includes(needle))?.[1] || (pageType() === "tournaments" ? "tournament-hub" : "");
  }

  function context() {
    const type = pageType();
    const requestedTeam = query("team");
    const requestedClub = query("club");
    const team = requestedTeam ? resolveTeam(requestedTeam) : null;
    const club = requestedClub ? resolveClub(requestedClub) : team?.clubSlug ? resolveClub(team.clubSlug) : null;
    const groupHub = document.querySelector("#groupHub")?.dataset?.group || "";
    const selectedGroup = document.querySelector("#groupFilter")?.value || "";
    const regionFilter = document.querySelector("#regionFilter")?.value || query("region") || "";
    return {
      pageType: type,
      team: normalize(team?.slug || team?.profileSlug || requestedTeam),
      club: normalize(club?.slug || team?.clubSlug || requestedClub),
      region: cleanText(club?.region || team?.region || regionFilter),
      group: cleanText(team?.group || query("group") || selectedGroup || groupHub),
      tournament: inferTournament()
    };
  }

  function dateEligible(campaign) {
    const today = new Date();
    const floor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const start = campaign.startDate ? new Date(`${campaign.startDate}T00:00:00Z`) : null;
    const end = campaign.endDate ? new Date(`${campaign.endDate}T23:59:59Z`) : null;
    return (!start || floor >= start) && (!end || floor <= end);
  }

  function targetingEligible(campaign, ctx) {
    const target = campaign.targeting || {};
    return valuesMatch(target.pageTypes, ctx.pageType)
      && valuesMatch(target.clubs, ctx.club)
      && valuesMatch(target.teams, ctx.team)
      && valuesMatch(target.regions, ctx.region)
      && valuesMatch(target.groups, ctx.group)
      && valuesMatch(target.tournaments, ctx.tournament);
  }

  function campaignFor(placement, ctx) {
    return config.campaigns
      .filter((campaign) => campaign && campaign.status === "active")
      .filter((campaign) => asList(campaign.placements).includes(placement.id))
      .filter(dateEligible)
      .filter((campaign) => targetingEligible(campaign, ctx))
      .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0) || String(a.id || "").localeCompare(String(b.id || "")))[0] || null;
  }

  function resolveAsset(value) {
    const raw = cleanText(value);
    if (!raw) return "";
    try {
      return new URL(raw, /^https?:|^data:|^blob:/.test(raw) ? window.location.href : siteRoot).href;
    } catch (error) {
      return raw;
    }
  }

  function attributedWebsite(campaign, placement) {
    const website = cleanText(campaign.website);
    if (!website) return "";
    try {
      const url = new URL(website, window.location.href);
      const attribution = config.outboundAttribution || {};
      url.searchParams.set("utm_source", attribution.source || "waterpoloindex");
      url.searchParams.set("utm_medium", attribution.medium || "sponsor");
      url.searchParams.set(attribution.campaignParameter || "utm_campaign", campaign.slug || campaign.id || normalize(campaign.name));
      url.searchParams.set(attribution.placementParameter || "utm_content", placement.id);
      return url.href;
    } catch (error) {
      return website;
    }
  }

  function disclosure() {
    return cleanText(config.disclosure) || "Sponsorship never influences WPI rankings or results.";
  }

  function sponsorCard(placement, campaign) {
    const wrapper = document.createElement("aside");
    wrapper.className = `wpi-sponsor wpi-sponsor--${normalize(placement.format || "inline")}`;
    wrapper.dataset.wpiSponsorPlacement = placement.id;
    wrapper.dataset.wpiSponsorCampaign = campaign.id || campaign.slug || "campaign";
    wrapper.setAttribute("aria-label", `${placement.label || "Sponsor"}: ${campaign.name || "WPI partner"}`);

    const link = attributedWebsite(campaign, placement);
    const logo = resolveAsset(campaign.logo);
    const content = `
      <div class="wpi-sponsor__label">${escapeHtml(placement.label || "Sponsor")}</div>
      <div class="wpi-sponsor__content">
        ${logo ? `<span class="wpi-sponsor__logo"><img src="${escapeAttribute(logo)}" alt="${escapeAttribute(campaign.name || "Sponsor")} logo" loading="lazy"></span>` : ""}
        <div class="wpi-sponsor__copy">
          <strong>${escapeHtml(campaign.name || "WPI partner")}</strong>
          ${campaign.message ? `<p>${escapeHtml(campaign.message)}</p>` : ""}
        </div>
        ${link ? `<a class="wpi-sponsor__action" href="${escapeAttribute(link)}" target="_blank" rel="sponsored noopener noreferrer">${escapeHtml(campaign.cta || "Learn more")} <span aria-hidden="true">↗</span></a>` : ""}
      </div>
      <p class="wpi-sponsor__disclosure">${escapeHtml(disclosure())}</p>`;
    wrapper.innerHTML = content;
    return wrapper;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }

  function findMount(placement) {
    const selectors = asList(placement.mount?.selectors || placement.mount?.selector);
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element) return element;
      } catch (error) {
        // Ignore malformed optional selectors and continue to the next fallback.
      }
    }
    return null;
  }

  function insert(card, mount, position) {
    const mode = position || "afterend";
    if (["beforebegin", "afterbegin", "beforeend", "afterend"].includes(mode)) mount.insertAdjacentElement(mode, card);
    else mount.insertAdjacentElement("afterend", card);
  }

  function clear() {
    document.querySelectorAll("[data-wpi-sponsor-placement]").forEach((node) => node.remove());
    document.documentElement.classList.remove("wpi-has-active-sponsors");
  }

  function render() {
    clear();
    const ctx = context();
    const placements = config.placements.filter((placement) => asList(placement.pageTypes).includes(ctx.pageType));
    let count = 0;
    for (const placement of placements) {
      const campaign = campaignFor(placement, ctx);
      if (!campaign) continue;
      const mount = findMount(placement);
      if (!mount) continue;
      insert(sponsorCard(placement, campaign), mount, placement.mount?.position);
      count += 1;
    }
    if (count) document.documentElement.classList.add("wpi-has-active-sponsors");
    document.dispatchEvent(new CustomEvent("wpi:sponsors-rendered", { detail: { count, context: ctx } }));
    return count;
  }

  let scheduled = 0;
  function scheduleRender() {
    window.clearTimeout(scheduled);
    scheduled = window.setTimeout(render, 40);
  }

  window.WPI_SPONSORS = Object.freeze({
    release: config.release,
    render,
    refresh: scheduleRender,
    context,
    activeCampaignCount: () => config.campaigns.filter((campaign) => campaign?.status === "active" && dateEligible(campaign)).length
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scheduleRender, { once: true });
  else scheduleRender();

  ["groupFilter", "regionFilter"].forEach((id) => document.querySelector(`#${id}`)?.addEventListener("change", scheduleRender));
  document.addEventListener("wpi:page-updated", scheduleRender);
})();
