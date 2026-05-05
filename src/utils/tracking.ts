/** Read a URL query parameter from the current page URL */
export function getParam(name: string): string {
  return new URLSearchParams(window.location.search).get(name) ?? '';
}

/** Read a cookie by name */
function getCookie(name: string): string {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : '';
}

/** Set a cookie (session-scoped by default) */
function setCookie(name: string, value: string, days = 180) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

/**
 * Returns the existing _fbp cookie or creates a new one in the
 * standard Facebook format: fb.1.<timestamp>.<random>
 */
export function getOrCreateFbp(): string {
  let fbp = getCookie('_fbp');
  if (!fbp) {
    fbp = `fb.1.${Date.now()}.${Math.floor(Math.random() * 1e10)}`;
    setCookie('_fbp', fbp);
  }
  return fbp;
}

/**
 * Returns the existing _fbc cookie or creates one from the fbclid URL param.
 * Format: fb.1.<timestamp>.<fbclid>
 */
export function getOrCreateFbc(): string {
  const fbclid = getParam('fbclid');
  if (fbclid) {
    const fbc = `fb.1.${Date.now()}.${fbclid}`;
    setCookie('_fbc', fbc);
    return fbc;
  }
  return getCookie('_fbc');
}

/** Snapshot all tracking fields at call time */
export function captureTrackingData() {
  return {
    fbp:               getOrCreateFbp(),
    fbc:               getOrCreateFbc(),
    event_source_url:  window.location.href,
    utm_source:        getParam('utm_source'),
    utm_campaign:      getParam('utm_campaign'),
    utm_medium:        getParam('utm_medium'),
    utm_content:       getParam('utm_content'),
    utm_term:          getParam('utm_term'),
    utm_id:            getParam('utm_id'),
  };
}

/** Generate a unique event ID for Meta Conversions API deduplication */
export function generateEventId(): string {
  return `lead_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
}
