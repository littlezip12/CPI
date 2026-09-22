(() => {
  "use strict";
  let deferredInstallPrompt = null;
  const installButtons = () => Array.from(document.querySelectorAll("[data-wpi-install-app]"));
  const isStandalone = () => window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

  function setInstallVisibility(show) {
    installButtons().forEach(button => { button.hidden = !show; });
  }

  function showIosInstructions() {
    window.alert("To install Water Polo HQ on iPhone or iPad: tap the Share button in Safari, then choose ‘Add to Home Screen’. Water Polo HQ will open from your Home Screen like an app.");
  }

  async function installWaterPoloHq(event) {
    event?.preventDefault();
    if (isStandalone()) return;
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      try { await deferredInstallPrompt.userChoice; } catch (_) {}
      deferredInstallPrompt = null;
      setInstallVisibility(false);
      return;
    }
    if (isIos()) { showIosInstructions(); return; }
    window.alert("Use your browser’s Install app or Add to Home Screen option to install Water Polo HQ.");
  }

  document.addEventListener("DOMContentLoaded", () => {
    installButtons().forEach(button => button.addEventListener("click", installWaterPoloHq));
    setInstallVisibility(!isStandalone() && isIos());
  });

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    setInstallVisibility(!isStandalone());
  });
  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    setInstallVisibility(false);
  });

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw-v7-64-19.js", { scope: "./" }).catch(() => {});
    });
  }
})();
