// Proxy → the INTERNAL booking tool /api/book — the booking path for every
// non-estimate ServiceMonster job from NewFlow (and the old funnel at /admin,
// /old2). Only the fields the pages send go on (_internal.js); never an
// estimate (that's /api/estimate-book) and never a booker.
import { INTERNAL, configured, internalHeaders, pick, BOOKING_FIELDS } from './_internal.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!configured()) return res.status(500).json({ error: 'internal_api_not_configured' });

  const body = { ...pick(req.body, BOOKING_FIELDS), bookedBy: null, source: 'external' };
  const upstream = await fetch(`${INTERNAL}/api/book`, { method: 'POST', headers: internalHeaders(req), body: JSON.stringify(body) });

  const json = await upstream.json().catch(() => ({}));
  res.status(upstream.status).json(json);
}
