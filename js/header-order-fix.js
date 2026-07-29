/* WPI header order fix */
(function () {
  function fixHeaderOrder() {
    const header = document.querySelector('.cpi-shell-header');
    const hero = document.querySelector('.cpi-hero-v2');

    if (!header || !hero) return;

    if (header.nextElementSibling !== hero) {
      document.body.insertBefore(header, hero);
    }

    document.body.classList.add('cpi-header-order-fixed');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixHeaderOrder);
  } else {
    fixHeaderOrder();
  }
})();
