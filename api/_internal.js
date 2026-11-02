// Shared by the relays to the internal booking tool. Vercel makes no
// function of a file whose name starts with "_" — this one is only imported.
//
// Security audit 2026-10-29: the relays called the tool with its master key
// (also public in browser code) and forwarded the visitor's whole request, so
// a visitor could book with staff powers — pick the truck, attach any
// customer, book an "estimate" at $0. Now (2026-11-02):
//  - they use the customer apps' OWN key, INTERNAL_APP_KEY (the tool's
//    CUSTOMER_APP_SECRET): it opens only the routes these relays call, and
//    only as a customer. Until it is set here, the old INTERNAL_API_SECRET.
//  - they pass on only the fields the pages send (the tool keeps the same
//    list, lib/customerApps, and decides the rest);
//  - they name the visitor's IP (X-Visitor-IP) so the tool can limit
//    booking attempts per visitor — Vercel's own IP is every visitor's.
export const INTERNAL = process.env.INTERNAL_API_URL;
const KEY = process.env.INTERNAL_APP_KEY || process.env.INTERNAL_API_SECRET;

export const configured = () => !!(INTERNAL && KEY);

export function internalHeaders(req, json = true) {
  const ip = String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    'X-API-SECRET': KEY,
    ...(ip ? { 'X-Visitor-IP': ip } : {}),
  };
}

/** Only `keys` from the visitor's body. */
export function pick(body, keys) {
  const src = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const out = {};
  for (const k of keys) if (src[k] !== undefined) out[k] = src[k];
  return out;
}

/** What NewFlow (and the old funnel) send to /api/book. Never the truck, an
 *  existing customer, print style, sub group, sales rep, lead source id,
 *  billing, home show, totals or a deal number — those are the internal
 *  form's. `estimate` is set by the relay itself. `items` is the /estimate
 *  page's (SM lines; the tool holds them to the catalog). */
export const BOOKING_FIELDS = [
  'account', 'region', 'start', 'end', 'province',
  'firstName', 'lastName', 'phone', 'email',
  'address1', 'address2', 'unit', 'city', 'state', 'zip', 'addressRaw',
  'commercial', 'jobType', 'techNote', 'adminNote', 'notes', 'summary',
  'howDidYouHear', 'leadSourceNote', 'leadEventId', 'eventId', 'lead',
  'cart', 'items', 'dateLabel', 'timeLabel',
  'rep', 'repSlug', 'rep_slug', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid',
];

/** What NewFlow and HvacMini send to /api/hvac/book. The deal number
 *  (HvacMini's ?dnum=) stays out: no website journey has ever carried one. */
export const HVAC_FIELDS = [
  'mode', 'category', 'date', 'time', 'units', 'visitMinutes', 'wallUnits',
  'name', 'phone', 'email', 'street', 'unit', 'city', 'state', 'zip', 'addressRaw',
  'additionalDetails', 'customerType', 'member', 'equipment', 'webPlan',
  'images', 'fileNames', 'leadEventId', 'lead',
];
