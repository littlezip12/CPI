/* CPI Release 7.23.6 — logo display/cache hotfix */
(function () {
  const FALLBACK = "assets/logos/cpi-logo-fallback.svg";
  const CANONICAL_PREFIX = "assets/logos/canonical/";

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
    if (src.includes("?")) return src;
    if (src.includes("assets/logos/")) return `${src}?v=7.23.6`;
    return src;
  }

  function fallbackForImage(img) {
    const alt = img.getAttribute("alt") || "";
    const slug = slugify(alt.replace(/\s+logo$/i, ""));
    if (slug && !img.dataset.cpiTriedSlug) {
      img.dataset.cpiTriedSlug = "1";
      img.src = `${CANONICAL_PREFIX}${slug}.webp?v=7.23.6`;
      return;
    }
    if (!img.dataset.cpiTriedFallback) {
      img.dataset.cpiTriedFallback = "1";
      img.src = `${FALLBACK}?v=7.23.6`;
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
