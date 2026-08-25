// Lead-capture hook → n8n. Fired by the /admin flow the moment step 2 is
// completed (contact + address + chosen services) so a visitor who never
// finishes still lands in the automation; a completed booking fires again
// with stage 'booked'. Fire-and-forget: n8n being down must never block.
const URL = process.env.N8N_LEAD_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!URL) return res.status(200).json({ ok: false, reason: 'no_webhook_configured' });
  try {
    await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: '1cabooking-admin-preview', receivedAt: new Date().toISOString(), ...req.body }),
    });
  } catch (e) { /* never block the flow */ }
  res.status(200).json({ ok: true });
}
