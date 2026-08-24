// Proxy → the INTERNAL booking tool /api/book — the widget's ONLY residential
// booking path (no 1cleanairbackend anywhere in this repo, Anuj 2026-08-24).
// bookedBy is forced null — a public visitor never carries dispatcher
// attribution. Env: INTERNAL_API_URL + INTERNAL_API_SECRET.
const INTERNAL = process.env.INTERNAL_API_URL;
const SECRET   = process.env.INTERNAL_API_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!INTERNAL || !SECRET) return res.status(500).json({ error: 'internal_api_not_configured' });

  const upstream = await fetch(`${INTERNAL}/api/book`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-SECRET': SECRET },
    body: JSON.stringify({ ...req.body, bookedBy: null, source: 'external' }),
  });

  const json = await upstream.json().catch(() => ({}));
  res.status(upstream.status).json(json);
}
