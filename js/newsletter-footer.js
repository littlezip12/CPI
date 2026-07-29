/*
  WPI Release 6.4 — Newsletter + Footer Refresh
*/

(function () {
  function isHome() {
    const page = window.location.pathname.split("/").pop() || "index.html";
    return page === "index.html" || page === "";
  }

  function safe(value, fallback) {
    return value === undefined || value === null || value === "" ? fallback : value;
  }

  async function fetchConfig() {
    try {
      const res = await fetch("data/homepage.json", { cache: "no-store" });
      if (!res.ok) throw new Error("homepage.json not found");
      return await res.json();
    } catch (err) {
      console.warn("WPI Newsletter/Footer: using fallback config.", err);
      return {};
    }
  }

  function removeOldNewsletterFooter() {
    document.querySelectorAll(".premium-subscribe, .cpi-shell-footer, footer").forEach(el => {
      if (!el.closest(".cpi-footer-v2")) el.remove();
    });

    document.querySelectorAll("section, div").forEach(el => {
      const text = (el.textContent || "").trim().toLowerCase();
      if (!text) return;
      if (
        text.includes("stay in the game") ||
        text.includes("get cpi rankings") ||
        text.includes("subscribe")
      ) {
        if (!el.closest(".cpi-newsletter-v2") && !el.closest(".cpi-footer-v2")) {
          const section = el.closest("section") || el;
          if (section && section.parentElement) section.remove();
        }
      }
    });
  }

  function findMount() {
    let mount = document.querySelector("#cpi-newsletter-footer");
    if (mount) return mount;

    mount = document.createElement("div");
    mount.id = "cpi-newsletter-footer";
    mount.className = "cpi-newsletter-footer";

    const glance = document.querySelector("#cpi-at-a-glance");
    if (glance) glance.insertAdjacentElement("afterend", mount);
    else {
      const feed = document.querySelector("#cpi-editorial-feed");
      if (feed) feed.insertAdjacentElement("afterend", mount);
      else document.body.appendChild(mount);
    }

    return mount;
  }

  function renderNewsletter(newsletter) {
    return `
      <section class="cpi-newsletter-v2">
        <div class="cpi-newsletter-icon" aria-hidden="true">
          <span>✉</span>
        </div>
        <div class="cpi-newsletter-copy">
          <h2>${safe(newsletter.title, "Stay in the Game")}</h2>
          <p>${safe(newsletter.summary, "Get WPI rankings, recaps, and stories delivered 1–2 times per month.")}</p>
        </div>
        <form class="cpi-newsletter-form">
          <div>
            <input type="email" placeholder="${safe(newsletter.placeholder, "Enter your email")}" aria-label="Email address">
            <button type="button">${safe(newsletter.button, "Subscribe")}</button>
          </div>
          <small>${safe(newsletter.note, "No spam. Unsubscribe anytime.")}</small>
        </form>
      </section>
    `;
  }

  function renderLinks(links) {
    return (links || []).map(link => `<a href="${safe(link.url, "#")}">${safe(link.label, "Link")}</a>`).join("");
  }

  function renderFooter(footer) {
    const columns = Array.isArray(footer.columns) ? footer.columns : [];
    return `
      <footer class="cpi-footer-v2">
        <div class="cpi-footer-inner">
          <div class="cpi-footer-brand">
            <a class="cpi-footer-logo" href="index.html">
              <span>WPI</span>
              <div>
                <strong>${safe(footer.brand, "Water Polo Index")}</strong>
                <em>${safe(footer.tagline, "Ranked. Respected. Earned.")}</em>
              </div>
            </a>
            <p>${safe(footer.summary, "Independent and unofficial rankings, stories, and club intelligence for California youth water polo.")}</p>
            <div class="cpi-footer-social">
              <span>◎</span>
              <span>𝕏</span>
              <span>▶</span>
            </div>
          </div>

          ${columns.map(column => `
            <nav class="cpi-footer-column">
              <h3>${safe(column.title, "Explore")}</h3>
              ${renderLinks(column.links)}
            </nav>
          `).join("")}

          <div class="cpi-footer-about">
            <h3>${safe(footer.aboutTitle, "About WPI")}</h3>
            <p>${safe(footer.aboutText, "The Water Polo Index is building a comprehensive water polo ranking system for California youth clubs.")}</p>
            <a href="${safe(footer.aboutLink && footer.aboutLink.url, "methodology.html")}">${safe(footer.aboutLink && footer.aboutLink.label, "Learn More")} →</a>
          </div>
        </div>
        <div class="cpi-footer-bottom">
          <span>© ${new Date().getFullYear()} Water Polo Index. All rights reserved.</span>
          <div>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Use</a>
          </div>
        </div>
      </footer>
    `;
  }

  async function init() {
    if (!isHome()) return;

    const config = await fetchConfig();
    const newsletter = config.newsletter || {};
    const footer = config.footer || {};

    removeOldNewsletterFooter();

    const mount = findMount();
    mount.innerHTML = renderNewsletter(newsletter) + renderFooter(footer);

    console.info("WPI Newsletter/Footer v2 loaded");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
