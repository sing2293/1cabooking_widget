// Proxy → internal /api/hvac/book. Forces the online-scheduler path and a
// clean public identity: jobPath estimate_online, inbound, no bookedBy — and
// only the fields the pages send (_internal.js).
import { INTERNAL, configured, internalHeaders, pick, HVAC_FIELDS } from './_internal.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!configured()) return res.status(500).json({ error: 'internal_api_not_configured' });

  const body = { ...pick(req.body, HVAC_FIELDS), jobPath: 'estimate_online', callDirection: 'inbound', bookedBy: null, source: 'external' };
  const upstream = await fetch(`${INTERNAL}/api/hvac/book`, { method: 'POST', headers: internalHeaders(req), body: JSON.stringify(body) });

  const json = await upstream.json().catch(() => ({}));
  res.status(upstream.status).json(json);
}
