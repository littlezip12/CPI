/* CPI Release 7.50.2 — canonical logo delivery/cache hotfix */
(function () {
  const FALLBACK = "assets/logos/cpi-logo-fallback.svg";
  const CANONICAL_PREFIX = "assets/logos/canonical/";
  const CACHE_VERSION = "7.50.2";

  function slugify(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function withCacheBuster(src) {
    if (!src || src.startsWith("data:") || src.startsWith("http")) return src;
    if (!src.includes("assets/logos/")) return src;
    const hashIndex = src.indexOf("#");
    const hash = hashIndex >= 0 ? src.slice(hashIndex) : "";
    let path = hashIndex >= 0 ? src.slice(0, hashIndex) : src;
    if (/([?&])v=[^&]*/.test(path)) {
      path = path.replace(/([?&])v=[^&]*/, `$1v=${CACHE_VERSION}`);
    } else {
      path += `${path.includes("?") ? "&" : "?"}v=${CACHE_VERSION}`;
    }
    return `${path}${hash}`;
  }

  function fallbackForImage(img) {
    const alt = img.getAttribute("alt") || "";
    const slug = slugify(alt.replace(/\s+logo$/i, ""));
    if (slug && !img.dataset.cpiTriedSlug) {
      img.dataset.cpiTriedSlug = "1";
      img.src = `${CANONICAL_PREFIX}${slug}.webp?v=${CACHE_VERSION}`;
      return;
    }
    if (!img.dataset.cpiTriedFallback) {
      img.dataset.cpiTriedFallback = "1";
      img.src = `${FALLBACK}?v=${CACHE_VERSION}`;
      return;
    }
    img.style.visibility = "hidden";
  }

  function hardenLogo(img) {
    if (!img || img.dataset.cpiLogoHardened === "1") return;
    const src = img.getAttribute("src") || "";
    const isLogo = src.includes("assets/logos/") || /\blogo\b/i.test(img.className || "") || /\blogo\b/i.test(img.alt || "");
    if (!isLogo) return;

    img.dataset.cpiLogoHardened = "1";
    img.decoding = img.decoding || "async";
    img.loading = img.loading || "lazy";

    const busted = withCacheBuster(src);
    if (busted && busted !== src) img.setAttribute("src", busted);

    img.addEventListener("error", () => fallbackForImage(img));
  }

  function scan() {
    document.querySelectorAll("img").forEach(hardenLogo);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scan);
  } else {
    scan();
  }

  // Rankings/team/club pages render logos after data.js executes.
  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
