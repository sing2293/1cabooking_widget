// Proxy → internal /api/hvac/member-check ("Are you a member?", 2026-10-30).
// Forwards only what the lookup reads; the internal tool answers plan names and
// what they cover on this visit, never the customer's record.
import { INTERNAL, configured, internalHeaders, pick } from './_internal.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!configured()) return res.status(500).json({ error: 'internal_api_not_configured' });

  const b = pick(req.body, ['name', 'phone', 'street', 'unit', 'zip', 'equipment', 'day']);
  const upstream = await fetch(`${INTERNAL}/api/hvac/member-check`, { method: 'POST', headers: internalHeaders(req), body: JSON.stringify(b) });

  const json = await upstream.json().catch(() => ({}));
  res.status(upstream.status).json(json);
}
