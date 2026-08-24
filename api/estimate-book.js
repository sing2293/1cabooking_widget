// Proxy → internal booking tool /api/book (estimate mode).
const INTERNAL = process.env.INTERNAL_API_URL;
const SECRET   = process.env.INTERNAL_API_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!INTERNAL || !SECRET) {
    return res.status(500).json({ error: 'internal_api_not_configured' });
  }

  const upstream = await fetch(`${INTERNAL}/api/book`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-SECRET': SECRET },
    // Force estimate booking server-side; never accept a bookedBy from the public page
    body: JSON.stringify({ ...req.body, estimate: true, jobType: 'Estimate', bookedBy: null, source: 'external' }),
  });

  const json = await upstream.json().catch(() => ({}));
  res.status(upstream.status).json(json);
}
