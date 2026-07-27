/*
  CPI 5.3A — Universal Site Shell
*/
(function () {
  const navItems = [
    { label: "Home", href: "index.html", match: ["index.html", ""] },
    { label: "Rankings", href: "rankings.html", match: ["rankings.html"] },
    { label: "Clubs", href: "clubs.html", match: ["clubs.html", "club.html", "/club/"] },
    { label: "Tournaments", href: "tournaments.html", match: ["tournaments.html"] },
    { label: "Stories", href: "stories.html", match: ["stories.html", "/stories/"] },
    { label: "Methodology", href: "methodology.html", match: ["methodology.html"] }
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
    { label: "Clubs", href: "clubs.html" },
    { label: "Methodology", href: "methodology.html" }
  ];

  function depthPrefix() {
    return window.location.pathname.includes("/club/") ? "../" : "";
  }

  function currentFile() {
    const parts = window.location.pathname.split("/");
    return parts[parts.length - 1] || "index.html";
  }

  function makeHref(href) {
    if (/^https?:/.test(href) || href.startsWith("#")) return href;
    return depthPrefix() + href;
  }

  function isActive(item) {
    const current = currentFile();
    const path = window.location.pathname;
    return item.match.some(token => {
      if (token === "") return current === "index.html";
      if (token.startsWith("/")) return path.includes(token);
      return current === token;
    });
  }

  function brandLogo() {
    return `${makeHref("assets/branding/wpi-logo.png")}`;
  }

  function headerHtml() {
    const nav = navItems.map(item =>
      `<a class="cpi-shell-nav-link ${isActive(item) ? "is-active" : ""}" href="${makeHref(item.href)}">${item.label}</a>`
    ).join("");

    const quick = quickLinks.map(item =>
      `<a href="${makeHref(item.href)}">${item.label}</a>`
    ).join("");

    return `<header class="cpi-shell-header" data-cpi-shell="header">
      <div class="cpi-shell-nav">
        <a class="cpi-shell-brand" href="${makeHref("index.html")}" aria-label="Water Polo Index Home">
          <span class="cpi-shell-logo-frame"><img class="cpi-shell-logo" src="${brandLogo()}" alt="Water Polo Index"></span>
          <span class="cpi-shell-brand-text">
            <strong>Water Polo Index</strong>
            <em>Rankings. Results. Club intelligence.</em>
          </span>
        </a>
        <nav class="cpi-shell-links">${nav}</nav>
        <button class="cpi-shell-search" type="button" aria-label="Search WPI"><span>Search WPI</span></button>
      </div>
      <div class="cpi-shell-quick">${quick}</div>
    </header>`;
  }

  function footerHtml() {
    const year = new Date().getFullYear();
    return `<footer class="cpi-shell-footer" data-cpi-shell="footer">
      <div class="cpi-shell-footer-brand">
        <span class="cpi-shell-logo-frame cpi-shell-logo-frame--footer"><img class="cpi-shell-logo" src="${brandLogo()}" alt="Water Polo Index"></span>
        <div>
          <strong>Water Polo Index</strong>
          <p>Independent and unofficial rankings, results, and club intelligence for youth water polo.</p>
        </div>
      </div>
      <nav>
        <a href="${makeHref("rankings.html")}">Rankings</a>
        <a href="${makeHref("clubs.html")}">Clubs</a>
        <a href="${makeHref("tournaments.html")}">Tournaments</a>
        <a href="${makeHref("methodology.html")}">Methodology</a>
      </nav>
      <small>© ${year} WPI</small>
    </footer>`;
  }

  function installShell() {
    if (document.querySelector("[data-cpi-shell='header']")) return;
    document.body.classList.add("cpi-shell-enabled");
    document.querySelectorAll(".site-header").forEach(h => h.classList.add("cpi-legacy-header-hidden"));
    document.body.insertAdjacentHTML("afterbegin", headerHtml());
    document.body.insertAdjacentHTML("beforeend", footerHtml());

    const header = document.querySelector(".cpi-shell-header");
    if (header) {
      const update = () => header.classList.toggle("is-scrolled", window.scrollY > 10);
      update();
      window.addEventListener("scroll", update, { passive: true });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installShell);
  else installShell();
})();
