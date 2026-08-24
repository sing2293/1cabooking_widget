// Proxy → internal /api/hvac/availability (the ST online-scheduler slots).
const INTERNAL = process.env.INTERNAL_API_URL;
const SECRET   = process.env.INTERNAL_API_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!INTERNAL || !SECRET) return res.status(500).json({ error: 'internal_api_not_configured' });

  const upstream = await fetch(`${INTERNAL}/api/hvac/availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-SECRET': SECRET },
    body: JSON.stringify(req.body),
  });

  const json = await upstream.json().catch(() => ({}));
  res.status(upstream.status).json(json);
}
