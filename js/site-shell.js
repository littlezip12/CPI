/* WPI universal site shell — release 7.53.3 */
(function () {
  const navItems = [
    { label: "Home", href: "index.html", matches: path => !path || path === "index.html" },
    { label: "Rankings", href: "rankings.html", matches: path => path === "rankings.html" || /^(12|14|16|18)u-(boys|girls)\.html$/.test(path) },
    { label: "Teams", href: "index.html#find-a-team", matches: path => path === "team.html" || path === "team-profile.html" },
    { label: "Clubs", href: "clubs.html", matches: path => path === "clubs.html" || path === "club.html" || path.startsWith("club/") },
    { label: "Tournaments", href: "tournaments.html", matches: path => path === "tournaments.html" || path.startsWith("tournaments/") || ["jo-boys.html", "jo-girls.html", "quicksilver-cup-2026.html", "tournament-archive.html"].includes(path) },
    { label: "Methodology", href: "methodology.html", matches: path => path === "methodology.html" }
  ];

  const quickLinks = [
    { label: "12U Boys", href: "rankings.html?group=12u-boys" },
    { label: "12U Girls", href: "rankings.html?group=12u-girls" },
    { label: "14U Boys", href: "rankings.html?group=14u-boys" },
    { label: "14U Girls", href: "rankings.html?group=14u-girls" },
    { label: "16U Boys", href: "rankings.html?group=16u-boys" },
    { label: "16U Girls", href: "rankings.html?group=16u-girls" },
    { label: "18U Boys", href: "rankings.html?group=18u-boys" },
    { label: "18U Girls", href: "rankings.html?group=18u-girls" },
    { label: "JO Results", href: "tournaments.html#jo-results" },
    { label: "Find a Team", href: "index.html#find-a-team" }
  ];

  function shellScriptUrl() {
    const scripts = Array.from(document.scripts);
    const script = document.currentScript || scripts.find(item => /\/js\/site-shell\.js(?:\?|$)/.test(item.src));
    return script ? new URL(script.src, window.location.href) : new URL("js/site-shell.js", window.location.href);
  }

  const siteRoot = new URL("../", shellScriptUrl());

  function makeHref(href) {
    if (/^(?:https?:|mailto:|tel:|#)/.test(href)) return href;
    return new URL(href, siteRoot).href;
  }

  function currentPath() {
    const page = new URL(window.location.href);
    const rootPath = siteRoot.pathname.endsWith("/") ? siteRoot.pathname : `${siteRoot.pathname}/`;
    let path = page.pathname;
    if (path.startsWith(rootPath)) path = path.slice(rootPath.length);
    path = path.replace(/^\/+/, "");
    if (!path || path.endsWith("/")) path += "index.html";
    return decodeURIComponent(path);
  }

  function headerHtml() {
    const path = currentPath();
    const nav = navItems.map(item =>
      `<a class="cpi-shell-nav-link ${item.matches(path) ? "is-active" : ""}" href="${makeHref(item.href)}">${item.label}</a>`
    ).join("");
    const quick = quickLinks.map(item => `<a href="${makeHref(item.href)}">${item.label}</a>`).join("");

    return `<header class="cpi-shell-header" data-cpi-shell="header">
      <div class="cpi-shell-nav">
        <a class="cpi-shell-brand" href="${makeHref("index.html")}" aria-label="Water Polo Index Home">
          <span class="cpi-shell-logo-frame"><img class="cpi-shell-logo cpi-shell-logo--mark" src="${makeHref("assets/branding/wpi-logo-mark.png")}" alt="Water Polo Index"></span>
          <span class="cpi-shell-brand-text">
            <strong>Water Polo Index</strong>
            <em>Rankings. Results. Club intelligence.</em>
          </span>
        </a>
        <nav class="cpi-shell-links" aria-label="Primary navigation">${nav}</nav>
        <a class="cpi-shell-search" href="${makeHref("index.html#find-a-team")}" data-shell-search><span>Find a team</span></a>
      </div>
      <div class="cpi-shell-quick" aria-label="Quick ranking links">${quick}</div>
    </header>`;
  }

  function footerHtml() {
    const year = new Date().getFullYear();
    return `<footer class="cpi-shell-footer" data-cpi-shell="footer">
      <div class="cpi-shell-footer-grid">
        <div class="cpi-shell-footer-brand">
          <a href="${makeHref("index.html")}" aria-label="Water Polo Index Home">
            <span class="cpi-shell-logo-frame cpi-shell-logo-frame--footer"><img class="cpi-shell-logo cpi-shell-logo--full" src="${makeHref("assets/branding/wpi-logo-full.png")}" alt="Water Polo Index"></span>
          </a>
          <p>Independent and unofficial rankings, results, and club intelligence for youth water polo.</p>
        </div>
        <nav><strong>Explore</strong><a href="${makeHref("rankings.html")}">Rankings</a><a href="${makeHref("index.html#find-a-team")}">Teams</a><a href="${makeHref("clubs.html")}">Clubs</a><a href="${makeHref("tournaments.html")}">Tournaments</a><a href="${makeHref("methodology.html")}">Methodology</a></nav>
        <nav><strong>Age Groups</strong><a href="${makeHref("rankings.html?group=12u-boys")}">12U Boys</a><a href="${makeHref("rankings.html?group=12u-girls")}">12U Girls</a><a href="${makeHref("rankings.html?group=14u-boys")}">14U Boys</a><a href="${makeHref("rankings.html?group=14u-girls")}">14U Girls</a><a href="${makeHref("rankings.html?group=16u-boys")}">16U Boys</a><a href="${makeHref("rankings.html?group=16u-girls")}">16U Girls</a><a href="${makeHref("rankings.html?group=18u-boys")}">18U Boys</a><a href="${makeHref("rankings.html?group=18u-girls")}">18U Girls</a></nav>
        <div class="cpi-shell-footer-about"><strong>About WPI</strong><p>Water Polo Index connects rankings, tournament results, team profiles, and club information in one youth water polo platform.</p><a href="${makeHref("methodology.html")}">Learn more →</a></div>
      </div>
      <div class="cpi-shell-footer-bottom">© ${year} Water Polo Index. All rights reserved.</div>
    </footer>`;
  }

  function hideLegacyShell() {
    Array.from(document.body.children).forEach(element => {
      if ((element.tagName === "HEADER" || element.tagName === "FOOTER") && !element.hasAttribute("data-cpi-shell")) {
        element.classList.add("cpi-legacy-shell-hidden");
        element.setAttribute("aria-hidden", "true");
      }
    });
  }

  function focusHomepageSearch() {
    const form = document.getElementById("wpiHomeSearch");
    const type = document.getElementById("wpiSearchType");
    const input = document.getElementById("wpiSearchInput");
    if (!form || !input) return false;
    if (type) type.value = "teams";
    form.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => input.focus(), 320);
    return true;
  }

  function installShell() {
    if (!document.body || document.querySelector("[data-cpi-shell='header']")) return;
    document.body.classList.add("cpi-shell-enabled");
    hideLegacyShell();
    document.body.insertAdjacentHTML("afterbegin", headerHtml());
    document.body.insertAdjacentHTML("beforeend", footerHtml());

    const header = document.querySelector(".cpi-shell-header");
    if (header) {
      const update = () => header.classList.toggle("is-scrolled", window.scrollY > 10);
      update();
      window.addEventListener("scroll", update, { passive: true });
    }

    document.querySelector("[data-shell-search]")?.addEventListener("click", event => {
      if (currentPath() === "index.html" && focusHomepageSearch()) event.preventDefault();
    });
    if (currentPath() === "index.html" && window.location.hash === "#find-a-team") focusHomepageSearch();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installShell, { once: true });
  else installShell();
})();
