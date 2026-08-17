/* WPI universal site shell — release 7.62.2 */
(function () {
  const navItems = [
    { label: "Home", href: "index.html", matches: path => !path || path === "index.html" },
    { label: "Rankings", href: "rankings.html", matches: path => path === "rankings.html" || /^(12|14|16|18)u-(boys|girls)\.html$/.test(path) },
    { label: "Organizations", href: "organizations.html", matches: path => ["organizations.html", "organization.html", "team-hub.html", "teams.html", "team.html", "team-profile.html", "clubs.html", "club.html"].includes(path) || path.startsWith("club/") },
    { label: "Tournaments", href: "tournaments.html", matches: path => path === "tournaments.html" || path.startsWith("tournaments/") || ["jo-boys.html", "jo-girls.html", "quicksilver-cup-2026.html", "tournament-archive.html"].includes(path) },
    { label: "WPI Live", href: "live-following.html", matches: path => path.startsWith("live-") }
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
    return `<header class="cpi-shell-header" data-cpi-shell="header">
      <div class="cpi-shell-nav">
        <a class="cpi-shell-brand" href="${makeHref("index.html")}" aria-label="Water Polo Index Home">
          <span class="cpi-shell-logo-frame"><img class="cpi-shell-logo cpi-shell-logo--mark" src="${makeHref("assets/branding/wpi-logo-mark.png")}" alt="Water Polo Index"></span>
          <span class="cpi-shell-brand-text">
            <strong>Water Polo Index</strong>
            <em>Rankings. Results. Live water polo.</em>
          </span>
        </a>
        <nav class="cpi-shell-links" aria-label="Primary navigation">${nav}</nav>
        <a class="cpi-shell-search" href="${makeHref("organizations.html")}" data-shell-search aria-label="Search WPI"><span>Search WPI</span></a>
      </div>
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
          <p>Independent and unofficial rankings, results, organization discovery, and live game coverage for youth and high school water polo.</p>
        </div>
        <nav><strong>Explore</strong><a href="${makeHref("rankings.html")}">Rankings</a><a href="${makeHref("organizations.html")}">Organizations</a><a href="${makeHref("live-following.html")}">My Teams</a><a href="${makeHref("tournaments.html")}">Tournaments</a><a href="${makeHref("methodology.html")}">Methodology</a></nav>
        <nav><strong>Age Groups</strong><a href="${makeHref("rankings.html?group=12u-boys")}">12U Boys</a><a href="${makeHref("rankings.html?group=12u-girls")}">12U Girls</a><a href="${makeHref("rankings.html?group=14u-boys")}">14U Boys</a><a href="${makeHref("rankings.html?group=14u-girls")}">14U Girls</a><a href="${makeHref("rankings.html?group=16u-boys")}">16U Boys</a><a href="${makeHref("rankings.html?group=16u-girls")}">16U Girls</a><a href="${makeHref("rankings.html?group=18u-boys")}">18U Boys</a><a href="${makeHref("rankings.html?group=18u-girls")}">18U Girls</a></nav>
        <div class="cpi-shell-footer-about"><strong>About WPI</strong><p>Water Polo Index connects rankings, tournament results, stable team identities, organizations, and WPI Live in one water polo platform.</p><a href="${makeHref("methodology.html")}">Learn more →</a></div>
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
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installShell, { once: true });
  else installShell();
})();
