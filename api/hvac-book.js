// Proxy → internal /api/hvac/book. Forces the online-scheduler path and a
// clean public identity: jobPath estimate_online, inbound, no bookedBy.
const INTERNAL = process.env.INTERNAL_API_URL;
const SECRET   = process.env.INTERNAL_API_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!INTERNAL || !SECRET) return res.status(500).json({ error: 'internal_api_not_configured' });

  const upstream = await fetch(`${INTERNAL}/api/hvac/book`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-SECRET': SECRET },
    body: JSON.stringify({ ...req.body, jobPath: 'estimate_online', callDirection: 'inbound', bookedBy: null, source: 'external' }),
  });

  const json = await upstream.json().catch(() => ({}));
  res.status(upstream.status).json(json);
}
