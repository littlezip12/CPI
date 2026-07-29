
/*
  WPI Release 7.35 — Public Link + CTA Completion
  Gives public CTAs a destination and makes the static subscribe page honest/useful.
*/
(function () {
  function params() {
    return new URLSearchParams(window.location.search || "");
  }

  function cleanEmail(value) {
    return (value || "").trim();
  }

  function initHomepageSubscribe() {
    document.querySelectorAll("[data-cpi-subscribe-form]").forEach(form => {
      const input = form.querySelector('input[name="email"]');
      form.addEventListener("submit", event => {
        const email = input ? cleanEmail(input.value) : "";
        if (!email) {
          event.preventDefault();
          if (input) input.focus();
        }
      });
    });
  }

  function initSubscribePage() {
    const form = document.querySelector("[data-cpi-subscribe-page-form]");
    if (!form) return;

    const input = form.querySelector('input[name="email"]');
    const result = document.querySelector("[data-cpi-subscribe-result]");
    const email = cleanEmail(params().get("email"));

    if (email && input) input.value = email;

    if (email && result) {
      result.hidden = false;
      result.textContent = "Preview captured: " + email + ". Connect a newsletter provider later to store signups.";
    }

    form.addEventListener("submit", event => {
      const value = input ? cleanEmail(input.value) : "";
      if (!value) {
        event.preventDefault();
        if (input) input.focus();
        return;
      }

      if (result) {
        event.preventDefault();
        result.hidden = false;
        result.textContent = "Preview captured: " + value + ". This static page is wired; add the final newsletter endpoint when ready.";
        try { window.localStorage.setItem("cpi_subscribe_preview_email", value); } catch {}
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initHomepageSubscribe();
      initSubscribePage();
    });
  } else {
    initHomepageSubscribe();
    initSubscribePage();
  }
})();
