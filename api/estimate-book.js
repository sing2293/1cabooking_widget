// Proxy → internal booking tool /api/book (estimate mode). The tool books a
// free estimate only when every line is an estimate service.
import { INTERNAL, configured, internalHeaders, pick, BOOKING_FIELDS } from './_internal.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!configured()) return res.status(500).json({ error: 'internal_api_not_configured' });

  const body = { ...pick(req.body, BOOKING_FIELDS), estimate: true, jobType: 'Estimate', bookedBy: null, source: 'external' };
  const upstream = await fetch(`${INTERNAL}/api/book`, { method: 'POST', headers: internalHeaders(req), body: JSON.stringify(body) });

  const json = await upstream.json().catch(() => ({}));
  res.status(upstream.status).json(json);
}
