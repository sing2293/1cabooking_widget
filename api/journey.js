// Journey tracking → the INTERNAL tool's /api/external-journey. The /admin
// funnel reports 'visit' (funnel opened) and 'lead' (step-2 form done → Slack
// lead post). 'booked' is stamped server-side by the internal book routes.
// Fire-and-forget: tracking being down must never block a visitor.
const INTERNAL = process.env.INTERNAL_API_URL;
const SECRET   = process.env.INTERNAL_API_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!INTERNAL || !SECRET) return res.status(200).json({ ok: false, reason: 'internal_api_not_configured' });
  try {
    await fetch(`${INTERNAL}/api/external-journey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-SECRET': SECRET },
      body: JSON.stringify(req.body),
    });
  } catch (e) { /* never block the flow */ }
  res.status(200).json({ ok: true });
}
