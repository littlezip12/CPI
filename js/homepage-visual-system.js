/*
  CPI Release 6.5 — Homepage Visual System
  Adds small homepage-only polish classes and removes leftover empty legacy wrappers.
*/

(function () {
  function isHome() {
    const page = window.location.pathname.split("/").pop() || "index.html";
    return page === "index.html" || page === "";
  }

  function removeEmptyLegacyContainers() {
    [".home-shell", ".bottom-dashboard", ".photo-section-grid", ".home-grid", ".homepage-grid"].forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if ((el.textContent || "").trim() === "" && el.children.length === 0) {
          el.remove();
        }
      });
    });
  }

  function init() {
    if (!isHome()) return;
    document.body.classList.add("cpi-homepage-visual-system");
    removeEmptyLegacyContainers();
    console.info("CPI Homepage Visual System loaded");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
