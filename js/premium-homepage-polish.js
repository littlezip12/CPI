/*
  WPI Release 7.1 — Premium Homepage Polish
  Adds reveal motion and small interaction enhancements.
*/

(function () {
  function isHome() {
    const page = window.location.pathname.split("/").pop() || "index.html";
    return page === "index.html" || page === "";
  }

  function addRevealClasses() {
    const selectors = [
      "#cpi-editorial-feed .cpi-feed-stories",
      "#cpi-editorial-feed .cpi-feed-story-card",
      "#cpi-at-a-glance .cpi-glance-title",
      "#cpi-at-a-glance .cpi-glance-card",
      "#cpi-newsletter-footer .cpi-newsletter-v2",
      "#cpi-newsletter-footer .cpi-footer-v2"
    ];

    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach((el, index) => {
        el.classList.add("cpi-reveal");
        el.style.transitionDelay = `${Math.min(index * 60, 240)}ms`;
      });
    });
  }

  function observeReveal() {
    const items = document.querySelectorAll(".cpi-reveal");
    if (!items.length) return;

    if (!("IntersectionObserver" in window)) {
      items.forEach(el => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });

    items.forEach(el => observer.observe(el));
  }

  function enhanceNewsletter() {
    const form = document.querySelector(".cpi-newsletter-form");
    if (!form || form.dataset.enhanced === "true") return;

    form.dataset.enhanced = "true";
    const button = form.querySelector("button");
    const input = form.querySelector("input");

    if (button) {
      button.addEventListener("click", () => {
        if (!input || !input.value.trim()) {
          if (input) input.focus();
          return;
        }
        button.textContent = "Subscribed";
        button.disabled = true;
        button.classList.add("is-submitted");
      });
    }
  }

  function init() {
    if (!isHome()) return;
    document.body.classList.add("cpi-premium-polish-v71");

    // Small delay lets previous renderers finish.
    window.setTimeout(() => {
      addRevealClasses();
      observeReveal();
      enhanceNewsletter();
    }, 120);

    console.info("WPI Premium Homepage Polish 7.1 loaded");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
