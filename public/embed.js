/* 1 Clean Air — embeddable lead-capture widget loader.
 *
 * Drop this on a partner site:
 *   <div data-1ca-widget></div>
 *   <script src="https://YOUR-WIDGET.vercel.app/embed.js" async></script>
 *
 * The loader:
 *   1. Discovers any <div data-1ca-widget> on the page and injects an iframe.
 *   2. Listens for postMessages from the widget and resizes the iframe to
 *      match its content height — no internal scrollbar, the iframe feels
 *      like part of the host page.
 *   3. Optional attributes on the placeholder:
 *        data-1ca-max-width="640"   (default: none — fills parent container)
 *        data-1ca-min-height="320"  (default 320)
 */
(function () {
  'use strict';

  var script = document.currentScript || (function () {
    var s = document.getElementsByTagName('script');
    return s[s.length - 1];
  })();
  if (!script || !script.src) return;

  var WIDGET_ORIGIN = new URL(script.src).origin;
  var WIDGET_URL    = WIDGET_ORIGIN + '/';

  /* Detect the host page's language so the widget loads in the same one.
   *   /fr, /fr/, /fr-ca/...  → 'fr'
   *   /en, /en/, /en-ca/...  → 'en'
   *   otherwise: check <html lang="..."> attribute
   *   default: 'en' */
  function detectHostLang() {
    var path = (window.location.pathname || '').toLowerCase();
    if (/^\/fr([-/]|$)/.test(path)) return 'fr';
    if (/^\/en([-/]|$)/.test(path)) return 'en';
    var htmlLang = (document.documentElement.lang || '').toLowerCase();
    if (htmlLang.indexOf('fr') === 0) return 'fr';
    if (htmlLang.indexOf('en') === 0) return 'en';
    return 'en';
  }

  function attachToTarget(target) {
    if (target.__1caInited) return;
    target.__1caInited = true;

    var maxWidthAttr = target.getAttribute('data-1ca-max-width');
    var minHeight    = parseInt(target.getAttribute('data-1ca-min-height') || '320', 10);

    var iframe = document.createElement('iframe');
    var lang = target.getAttribute('data-1ca-lang') || detectHostLang();
    iframe.src      = WIDGET_URL + '?lang=' + encodeURIComponent(lang);
    iframe.title    = '1 Clean Air — Quote Widget';
    iframe.loading  = 'lazy';
    iframe.scrolling = 'no';
    iframe.setAttribute('allow', 'geolocation');
    var styles = [
      'width:100%',
      'height:' + minHeight + 'px',
      'border:0',
      'display:block',
      'margin:0 auto',
      'background:transparent',
    ];
    if (maxWidthAttr) styles.push('max-width:' + parseInt(maxWidthAttr, 10) + 'px');
    iframe.style.cssText = styles.join(';');
    target.appendChild(iframe);

    /* Listen for messages the widget posts back to the host page. */
    window.addEventListener('message', function (e) {
      if (e.origin !== WIDGET_ORIGIN) return;
      if (e.source !== iframe.contentWindow) return;
      var data = e.data || {};
      if (data.type === '1ca-widget-resize' && typeof data.height === 'number') {
        var h = Math.max(data.height, minHeight);
        if (iframe.style.height !== h + 'px') iframe.style.height = h + 'px';
      } else if (data.type === '1ca-widget-scroll-to-top') {
        try {
          iframe.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (_) {
          iframe.scrollIntoView();
        }
      }
    });
  }

  function init() {
    var targets = document.querySelectorAll('[data-1ca-widget]');
    for (var i = 0; i < targets.length; i++) attachToTarget(targets[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
