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

  /* Warm up the connection to the widget origin as early as possible so
   * DNS lookup + TLS handshake overlap with the parent page's own load,
   * instead of being sequential after the iframe is attached. */
  (function preconnect() {
    var head = document.head || document.getElementsByTagName('head')[0];
    if (!head) return;
    function addLink(rel, crossorigin) {
      var link = document.createElement('link');
      link.rel = rel;
      link.href = WIDGET_ORIGIN;
      if (crossorigin) link.crossOrigin = 'anonymous';
      head.appendChild(link);
    }
    addLink('dns-prefetch');
    addLink('preconnect');
    addLink('preconnect', true);
  })();

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

  /* ATTRIBUTION FROM THE HOST PAGE (Anuj 2026-09-11). The iframe has its own
   * URL, so the visitor's UTMs / click ids / ?rep= slug and the Meta pixel
   * cookies are invisible to the widget — same-origin policy blocks it from
   * reading the parent's location, and its own cookie jar is a different
   * origin than 1cleanair.ca. So the loader, which DOES run on the host page,
   * copies them onto the iframe URL. Best-effort: attribution must never
   * break the widget. */
  var HOST_PARAMS = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
    'gclid', 'fbclid', 'msclkid', 'rep',
  ];
  /* Click ids and UTMs only exist on the AD LANDING page's URL — one click
   * into the site they're gone, and a returning visitor never has them. Meta
   * survives that via the pixel's _fbp/_fbc cookies; Google had no equivalent
   * here, which is how paid leads kept landing as Organic / 1Cleanair.ca
   * (Anuj 2026-10-02). So any visit that arrives WITH campaign params
   * rewrites a first-party cookie (last non-direct touch, 90 days — the same
   * window as Google's own _gcl_aw), and a bare visit falls back to it.
   * `rep` is deliberately NOT persisted: a rep's personal link credits the
   * rep on that visit only, and a sales-rep UTM trio stays session-only too. */
  var STORE_PARAMS = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
    'gclid', 'fbclid', 'msclkid',
  ];
  var ATTR_COOKIE = '_1ca_attr';
  function hostCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }
  function storedAttribution() {
    try {
      var obj = JSON.parse(hostCookie(ATTR_COOKIE) || '{}');
      return obj && typeof obj === 'object' ? obj : {};
    } catch (e) { return {}; }
  }
  function storeAttribution(map) {
    try {
      var expires = new Date(Date.now() + 90 * 864e5).toUTCString();
      document.cookie = ATTR_COOKIE + '=' + encodeURIComponent(JSON.stringify(map))
        + '; expires=' + expires + '; path=/; SameSite=Lax';
    } catch (e) { /* attribution never breaks the widget */ }
  }
  function hostAttribution() {
    var out = [];
    try {
      var hq = new URLSearchParams(window.location.search || '');
      var fresh = {};
      var hasFresh = false;
      for (var i = 0; i < STORE_PARAMS.length; i++) {
        var v = (hq.get(STORE_PARAMS[i]) || '').slice(0, 200);
        if (v) { fresh[STORE_PARAMS[i]] = v; hasFresh = true; }
      }
      if (hasFresh && fresh.utm_source !== 'sales-rep') storeAttribution(fresh);
      var attr = hasFresh ? fresh : storedAttribution();
      /* gtag's conversion linker already keeps the click id on this domain
       * (_gcl_aw = "GCL.<timestamp>.<gclid>") — covers clicks from before
       * this cookie existed, and sites where only the Google tag runs. */
      if (!attr.gclid) {
        var gcl = hostCookie('_gcl_aw').match(/^GCL\.\d+\.(.+)$/);
        if (gcl) attr.gclid = gcl[1].slice(0, 200);
      }
      for (var p = 0; p < HOST_PARAMS.length; p++) {
        var key = HOST_PARAMS[p];
        var val = key === 'rep' ? (hq.get('rep') || '') : (attr[key] || '');
        val = String(val).slice(0, 200);
        if (val) out.push(key + '=' + encodeURIComponent(val));
      }
      /* The page the visitor is actually on — the widget reports this as
       * event_source_url instead of its own iframe URL, so Meta CAPI and
       * Pipedrive see a real landing page. */
      out.push('page_url=' + encodeURIComponent(window.location.href.slice(0, 500)));
      if (document.referrer) out.push('page_ref=' + encodeURIComponent(document.referrer.slice(0, 500)));
      /* _fbp / _fbc are set by the pixel on the HOST origin. */
      var fbp = hostCookie('_fbp'), fbc = hostCookie('_fbc');
      if (fbp) out.push('fbp=' + encodeURIComponent(fbp.slice(0, 200)));
      if (fbc) out.push('fbc=' + encodeURIComponent(fbc.slice(0, 400)));
    } catch (e) { /* never block the widget over attribution */ }
    return out;
  }

  function attachToTarget(target) {
    if (target.__1caInited) return;
    target.__1caInited = true;

    var maxWidthAttr = target.getAttribute('data-1ca-max-width');
    var minHeight    = parseInt(target.getAttribute('data-1ca-min-height') || '320', 10);

    var iframe = document.createElement('iframe');
    var lang = target.getAttribute('data-1ca-lang') || detectHostLang();
    iframe.src       = WIDGET_URL + '?lang=' + encodeURIComponent(lang)
      + (function (a) { return a.length ? '&' + a.join('&') : ''; })(hostAttribution());
    iframe.title     = '1 Clean Air — Quote Widget';
    /* Above-the-fold widget — load eagerly so it's ready by the time the
     * user scrolls past the page header. Partners who want deferred load
     * can set data-1ca-loading="lazy" on the placeholder. */
    iframe.loading   = target.getAttribute('data-1ca-loading') || 'eager';
    iframe.scrolling = 'no';
    iframe.setAttribute('importance', 'high');
    iframe.setAttribute('fetchpriority', 'high');
    /* `microphone` lets the lead-form voice-to-text feature work when the
     * widget is iframed cross-origin. Host pages also need a permissions
     * policy that allows microphone — most don't restrict it. */
    iframe.setAttribute('allow', 'geolocation; microphone');
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
      } else if (data.type === '1ca-widget-scroll-to' && typeof data.y === 'number') {
        /* Bring the CURRENT question into the middle of the screen (Anuj):
           y = the block's top inside the iframe; park it about a third of
           the way down so the site header never covers it. */
        var top = iframe.getBoundingClientRect().top + window.pageYOffset + data.y;
        var target = Math.max(0, top - Math.round(window.innerHeight * 0.3));
        try { window.scrollTo({ top: target, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, target); }
      } else if (data.type === '1ca-widget-scroll-to-top') {
        try {
          iframe.scrollIntoView({ behavior: 'instant', block: 'start' });
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
