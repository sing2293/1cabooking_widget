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
 *        data-1ca-max-width="640"   (default 720)
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

  function attachToTarget(target) {
    if (target.__1caInited) return;
    target.__1caInited = true;

    var maxWidth  = parseInt(target.getAttribute('data-1ca-max-width')  || '720', 10);
    var minHeight = parseInt(target.getAttribute('data-1ca-min-height') || '320', 10);

    var iframe = document.createElement('iframe');
    iframe.src      = WIDGET_URL;
    iframe.title    = '1 Clean Air — Quote Widget';
    iframe.loading  = 'lazy';
    iframe.scrolling = 'no';
    iframe.setAttribute('allow', 'geolocation');
    iframe.style.cssText = [
      'width:100%',
      'max-width:' + maxWidth + 'px',
      'height:' + minHeight + 'px',
      'border:0',
      'display:block',
      'margin:0 auto',
      'background:transparent',
    ].join(';');
    target.appendChild(iframe);

    /* Resize the iframe whenever the widget reports a new content height. */
    window.addEventListener('message', function (e) {
      if (e.origin !== WIDGET_ORIGIN) return;
      if (e.source !== iframe.contentWindow) return;
      var data = e.data || {};
      if (data.type === '1ca-widget-resize' && typeof data.height === 'number') {
        var h = Math.max(data.height, minHeight);
        if (iframe.style.height !== h + 'px') iframe.style.height = h + 'px';
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
