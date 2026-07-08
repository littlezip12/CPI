/*
  CPI Release 7.0.2 — Hero Polish
  Adds pause-on-hover, swipe gestures, keyboard hero navigation,
  and lightweight next-image preloading for Hero v2.
*/

(function () {
  function isHome() {
    const page = window.location.pathname.split("/").pop() || "index.html";
    return page === "index.html" || page === "";
  }

  function preloadHeroImages() {
    fetch("data/homepage.json", { cache: "no-store" })
      .then(res => res.ok ? res.json() : null)
      .then(config => {
        const slides = config && config.hero && Array.isArray(config.hero.slides) ? config.hero.slides : [];
        slides.forEach(slide => {
          if (!slide.image) return;
          const img = new Image();
          img.src = slide.image;
        });
      })
      .catch(() => {});
  }

  function clickHero(direction) {
    const selector = direction === "next" ? ".cpi-hero-v2-next" : ".cpi-hero-v2-prev";
    const btn = document.querySelector(selector);
    if (btn) btn.click();
  }

  function installPolish() {
    const hero = document.querySelector(".cpi-hero-v2");
    if (!hero || hero.dataset.polished === "true") return;
    hero.dataset.polished = "true";

    hero.addEventListener("mouseenter", () => {
      hero.classList.add("is-paused");
      const activeDot = hero.querySelector(".cpi-hero-dot.is-active");
      if (activeDot) activeDot.focus({ preventScroll: true });
    });

    hero.addEventListener("mouseleave", () => {
      hero.classList.remove("is-paused");
    });

    let startX = 0;
    let startY = 0;

    hero.addEventListener("touchstart", event => {
      const t = event.touches[0];
      startX = t.clientX;
      startY = t.clientY;
    }, { passive: true });

    hero.addEventListener("touchend", event => {
      const t = event.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
      if (dx < 0) clickHero("next");
      else clickHero("prev");
    }, { passive: true });
  }

  function installKeyboardNavigation() {
    document.addEventListener("keydown", event => {
      if (!isHome()) return;
      const active = document.activeElement;
      const typing = active && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName);
      if (typing) return;

      if (event.key === "ArrowRight") clickHero("next");
      if (event.key === "ArrowLeft") clickHero("prev");
    });
  }

  function watchHero() {
    const observer = new MutationObserver(() => installPolish());
    observer.observe(document.body, { childList: true, subtree: true });
    installPolish();
  }

  function init() {
    if (!isHome()) return;
    document.body.classList.add("cpi-hero-polish-v702");
    preloadHeroImages();
    installKeyboardNavigation();
    watchHero();
    console.info("CPI Hero Polish 7.0.2 loaded");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
