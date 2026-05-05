const BACKEND = 'https://1cleanairbackend.vercel.app';
const SECRET  = '1cleanAir_2026_dispatch_secure_X9d83jsk29DKL';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const upstream = await fetch(`${BACKEND}/api/availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-SECRET': SECRET },
    body: JSON.stringify(req.body),
  });

  const json = await upstream.json().catch(() => ({}));
  res.status(upstream.status).json(json);
}
