/* WPI Release 7.22 — small public-readiness helpers */
(function () {
  function currentFile() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    return path;
  }

  function normalizeHref(href) {
    try {
      const url = new URL(href, window.location.href);
      return url.pathname.split('/').pop() || 'index.html';
    } catch (error) {
      return String(href || '').split('?')[0].split('#')[0];
    }
  }

  function markActiveNav() {
    const file = currentFile();
    document.querySelectorAll('.cpi-v8-nav a, .cpi-shell-links a').forEach((link) => {
      const target = normalizeHref(link.getAttribute('href'));
      const active = target === file || (file === 'club.html' && target === 'clubs.html') || (file === 'team.html' && target === 'rankings.html');
      if (active) {
        link.classList.add('is-current');
        if (!link.hasAttribute('aria-current')) link.setAttribute('aria-current', 'page');
      }
    });
  }

  function addHeaderState() {
    const headers = document.querySelectorAll('.cpi-v8-header, .cpi-shell-header');
    if (!headers.length) return;
    const update = () => headers.forEach((header) => header.classList.toggle('is-scrolled', window.scrollY > 8));
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  function hardenLogos() {
    document.querySelectorAll('img').forEach((img) => {
      if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
      if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
    });
  }

  function annotateExternalLinks() {
    document.querySelectorAll('a[href^="http"]').forEach((link) => {
      const href = link.getAttribute('href') || '';
      if (!href.includes(location.hostname)) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener');
      }
    });
  }

  function init() {
    markActiveNav();
    addHeaderState();
    hardenLogos();
    annotateExternalLinks();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
