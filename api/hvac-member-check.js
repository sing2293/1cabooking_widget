// Proxy → internal /api/hvac/member-check ("Are you a member?", 2026-10-30).
// Forwards only what the lookup reads; the internal tool answers plan names and
// what they cover on this visit, never the customer's record.
const INTERNAL = process.env.INTERNAL_API_URL;
const SECRET   = process.env.INTERNAL_API_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!INTERNAL || !SECRET) return res.status(500).json({ error: 'internal_api_not_configured' });

  const b = req.body && typeof req.body === 'object' ? req.body : {};
  const upstream = await fetch(`${INTERNAL}/api/hvac/member-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-SECRET': SECRET },
    body: JSON.stringify({ name: b.name, phone: b.phone, street: b.street, unit: b.unit, zip: b.zip, equipment: b.equipment, day: b.day }),
  });

  const json = await upstream.json().catch(() => ({}));
  res.status(upstream.status).json(json);
}
