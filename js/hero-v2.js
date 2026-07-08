/*
  CPI Release 6.1.1 — Editorial Hero Component
*/
(function () {
  const DEFAULT_HERO = {
    slides: [{
      id: "fallback",
      tag: "Featured Story",
      title: "California Polo Index",
      summary: "Rankings, stories, and club intelligence for California youth water polo.",
      image: "assets/photos/editorial/polo-shooter-close.jpg",
      primaryCta: { label: "View Rankings", url: "rankings.html" },
      secondaryCta: { label: "Explore Clubs", url: "clubs.html" }
    }],
    autoplay: true,
    intervalMs: 6500
  };

  let state = { slides: [], current: 0, timer: null, autoplay: true, intervalMs: 6500 };

  function isHome() {
    const page = window.location.pathname.split("/").pop() || "index.html";
    return page === "index.html" || page === "";
  }

  function safe(value, fallback) {
    return value === undefined || value === null || value === "" ? fallback : value;
  }

  async function loadHomepageConfig() {
    try {
      const response = await fetch("data/homepage.json", { cache: "no-store" });
      if (!response.ok) throw new Error("homepage.json not found");
      const config = await response.json();
      return config && config.hero ? config.hero : DEFAULT_HERO;
    } catch (error) {
      console.warn("CPI Hero: using fallback hero config.", error);
      return DEFAULT_HERO;
    }
  }

  function normalizeSlide(slide, index) {
    return {
      id: safe(slide.id, `hero-${index}`),
      tag: safe(slide.tag, "Featured Story"),
      title: safe(slide.title, "California Polo Index"),
      summary: safe(slide.summary, "Rankings, stories, and club intelligence for California youth water polo."),
      image: safe(slide.image, "assets/photos/editorial/polo-shooter-close.jpg"),
      primaryCta: {
        label: safe(slide.primaryCta && slide.primaryCta.label, "View Rankings"),
        url: safe(slide.primaryCta && slide.primaryCta.url, "rankings.html")
      },
      secondaryCta: {
        label: safe(slide.secondaryCta && slide.secondaryCta.label, "Explore Clubs"),
        url: safe(slide.secondaryCta && slide.secondaryCta.url, "clubs.html")
      }
    };
  }

  function findHeroMount() {
    let mount = document.querySelector("#cpi-hero-v2");
    if (mount) return mount;

    const oldHero =
      document.querySelector(".photo-hero") ||
      document.querySelector(".home-hero-2") ||
      document.querySelector("section.hero") ||
      document.querySelector(".hero");

    mount = document.createElement("section");
    mount.id = "cpi-hero-v2";

    if (oldHero) {
      const section = oldHero.closest("section") || oldHero;
      section.replaceWith(mount);
    } else {
      const main = document.querySelector("main");
      if (main) main.insertAdjacentElement("afterbegin", mount);
      else document.body.insertAdjacentElement("afterbegin", mount);
    }

    return mount;
  }

  function heroTemplate(slide) {
    const dots = state.slides.map((_, index) => {
      const active = index === state.current ? "is-active" : "";
      return `<button class="cpi-hero-dot ${active}" type="button" aria-label="Go to hero slide ${index + 1}" data-hero-dot="${index}"></button>`;
    }).join("");

    const controls = state.slides.length > 1;

    return `
      <div class="cpi-hero-v2-bg" style="background-image:url('${slide.image}')"></div>
      <div class="cpi-hero-v2-overlay"></div>
      ${controls ? `<button class="cpi-hero-v2-arrow cpi-hero-v2-prev" type="button" aria-label="Previous featured story">‹</button>` : ""}
      <div class="cpi-hero-v2-inner">
        <div class="cpi-hero-v2-copy">
          <span class="cpi-hero-v2-tag">${slide.tag}</span>
          <h1>${slide.title}</h1>
          <p>${slide.summary}</p>
          <div class="cpi-hero-v2-actions">
            <a class="cpi-hero-v2-primary" href="${slide.primaryCta.url}">${slide.primaryCta.label} →</a>
            <a class="cpi-hero-v2-secondary" href="${slide.secondaryCta.url}">${slide.secondaryCta.label}</a>
          </div>
        </div>
      </div>
      ${controls ? `<button class="cpi-hero-v2-arrow cpi-hero-v2-next" type="button" aria-label="Next featured story">›</button>` : ""}
      ${controls ? `<div class="cpi-hero-v2-dots">${dots}</div>` : ""}
    `;
  }

  function renderHero() {
    const mount = findHeroMount();
    const slide = state.slides[state.current] || normalizeSlide(DEFAULT_HERO.slides[0], 0);
    mount.className = "cpi-hero-v2";
    mount.innerHTML = heroTemplate(slide);

    const prev = mount.querySelector(".cpi-hero-v2-prev");
    const next = mount.querySelector(".cpi-hero-v2-next");

    if (prev) prev.addEventListener("click", () => goToSlide(state.current - 1, true));
    if (next) next.addEventListener("click", () => goToSlide(state.current + 1, true));

    mount.querySelectorAll("[data-hero-dot]").forEach(button => {
      button.addEventListener("click", () => goToSlide(Number(button.dataset.heroDot), true));
    });
  }

  function goToSlide(index, userInitiated) {
    if (!state.slides.length) return;
    if (index < 0) index = state.slides.length - 1;
    if (index >= state.slides.length) index = 0;
    state.current = index;
    renderHero();
    if (userInitiated) restartAutoplay();
  }

  function startAutoplay() {
    stopAutoplay();
    if (!state.autoplay || state.slides.length < 2) return;
    state.timer = window.setInterval(() => goToSlide(state.current + 1, false), state.intervalMs);
  }

  function stopAutoplay() {
    if (state.timer) {
      window.clearInterval(state.timer);
      state.timer = null;
    }
  }

  function restartAutoplay() {
    stopAutoplay();
    startAutoplay();
  }

  async function init() {
    if (!isHome()) return;
    const heroConfig = await loadHomepageConfig();
    const rawSlides = Array.isArray(heroConfig.slides) && heroConfig.slides.length ? heroConfig.slides : DEFAULT_HERO.slides;

    state.slides = rawSlides.map(normalizeSlide);
    state.autoplay = heroConfig.autoplay !== false;
    state.intervalMs = Number(heroConfig.intervalMs || 6500);
    state.current = 0;

    renderHero();
    startAutoplay();

    console.info("CPI Hero v2 loaded", {
      slides: state.slides.length,
      autoplay: state.autoplay,
      intervalMs: state.intervalMs
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
