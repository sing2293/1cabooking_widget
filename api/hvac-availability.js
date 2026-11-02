// Proxy → internal /api/hvac/availability (the ST online-scheduler slots).
import { INTERNAL, configured, internalHeaders } from './_internal.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!configured()) return res.status(500).json({ error: 'internal_api_not_configured' });

  const upstream = await fetch(`${INTERNAL}/api/hvac/availability`, { method: 'POST', headers: internalHeaders(req), body: JSON.stringify(req.body) });

  const json = await upstream.json().catch(() => ({}));
  res.status(upstream.status).json(json);
}
