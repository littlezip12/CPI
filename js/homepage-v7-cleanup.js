/*
  WPI Release 7.0.1 — Homepage Cleanup

  Purpose:
  - Retires old homepage sections.
  - Keeps the homepage sequence clean:
    Hero → Top Stories → At a Glance → Newsletter → Footer
  - Does not change other site pages.
*/

(function () {
  function isHome() {
    const page = window.location.pathname.split("/").pop() || "index.html";
    return page === "index.html" || page === "";
  }

  const KEEP_SELECTORS = [
    ".cpi-shell-header",
    ".cpi-shell-quick",
    ".cpi-hero-v2",
    "#cpi-editorial-feed",
    "#cpi-at-a-glance",
    "#cpi-newsletter-footer",
    ".cpi-newsletter-v2",
    ".cpi-footer-v2",
    ".cpi-command-overlay"
  ];

  const OLD_SECTION_TEXT = [
    "latest headlines",
    "featured group",
    "weekend recap",
    "stories worth celebrating",
    "upcoming tournaments",
    "view all headlines",
    "view full recap"
  ];

  const OLD_SELECTORS = [
    ".latest-headlines",
    ".featured-group",
    ".weekend-recap",
    ".stories-worth-celebrating",
    ".upcoming-tournaments",
    ".home-modules",
    ".home-grid",
    ".homepage-grid",
    ".bottom-dashboard",
    ".photo-section-grid",
    ".premium-home",
    ".premium-stories",
    ".premium-glance",
    ".premium-subscribe"
  ];

  function shouldKeep(el) {
    return KEEP_SELECTORS.some(selector => el.matches(selector) || el.closest(selector));
  }

  function removeKnownOldSelectors() {
    OLD_SELECTORS.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (!shouldKeep(el)) el.remove();
      });
    });
  }

  function removeOldTextSections() {
    document.querySelectorAll("section, article, aside, div").forEach(el => {
      if (shouldKeep(el)) return;

      const text = (el.textContent || "").trim().toLowerCase();
      if (!text) return;

      const isOld = OLD_SECTION_TEXT.some(term => text.includes(term));
      if (!isOld) return;

      const section = el.closest("section, article, aside") || el;
      if (section && section.parentElement && !shouldKeep(section)) {
        section.remove();
      }
    });
  }

  function removeEmptyContainers() {
    document.querySelectorAll("main, section, div").forEach(el => {
      if (shouldKeep(el)) return;
      if (el.id === "app") return;

      const text = (el.textContent || "").trim();
      if (!text && el.children.length === 0) {
        el.remove();
      }
    });
  }

  function orderHomepageSections() {
    const hero = document.querySelector(".cpi-hero-v2");
    const feed = document.querySelector("#cpi-editorial-feed");
    const glance = document.querySelector("#cpi-at-a-glance");
    const newsletterFooter = document.querySelector("#cpi-newsletter-footer");

    if (!hero) return;

    if (feed && feed.previousElementSibling !== hero) {
      hero.insertAdjacentElement("afterend", feed);
    }

    if (glance && feed && glance.previousElementSibling !== feed) {
      feed.insertAdjacentElement("afterend", glance);
    } else if (glance && !feed && glance.previousElementSibling !== hero) {
      hero.insertAdjacentElement("afterend", glance);
    }

    if (newsletterFooter && glance && newsletterFooter.previousElementSibling !== glance) {
      glance.insertAdjacentElement("afterend", newsletterFooter);
    } else if (newsletterFooter && feed && !glance && newsletterFooter.previousElementSibling !== feed) {
      feed.insertAdjacentElement("afterend", newsletterFooter);
    }
  }

  function init() {
    if (!isHome()) return;

    document.body.classList.add("cpi-homepage-v7");

    removeKnownOldSelectors();
    removeOldTextSections();
    removeEmptyContainers();
    orderHomepageSections();

    console.info("WPI Homepage v7 cleanup loaded");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
