// Journey tracking → the INTERNAL tool's /api/external-journey. The funnel
// reports 'visit' (funnel opened) and 'lead' (step-2 form done → Slack lead
// post). 'booked' is stamped server-side by the internal book routes.
// Fire-and-forget for the VISITOR (always 200, never blocks) — but not blind:
// Sep 28–30 2026 the internal pipeline was broken for two days and this relay
// swallowed every failure silently. A failed forward now retries once and, if
// it still fails, logs the FULL payload (journey_relay_failed) so the lead is
// recoverable from the Vercel function logs.
// Security audit 2026-10-29: only 'visit' and 'lead' go on, and never a deal
// number (dnum) — it let a visitor overwrite any Pipedrive deal.
import { INTERNAL, configured, internalHeaders } from './_internal.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!configured()) return res.status(200).json({ ok: false, reason: 'internal_api_not_configured' });

  const src = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  if (src.op !== 'visit' && src.op !== 'lead') return res.status(200).json({ ok: false, reason: 'unknown_op' });
  const rest = { ...src };
  delete rest.dnum;
  const body = JSON.stringify(rest);
  const forward = () => fetch(`${INTERNAL}/api/external-journey`, {
    method: 'POST',
    headers: internalHeaders(req),
    body,
  });

  try {
    let r = await forward().catch(() => null);
    if (!r || !r.ok) {
      await new Promise((ok) => setTimeout(ok, 500));
      r = await forward().catch(() => null);
    }
    if (!r || !r.ok) {
      console.error('journey_relay_failed', r ? `HTTP ${r.status}` : 'fetch_failed', body);
    }
  } catch (e) { console.error('journey_relay_failed', String((e && e.message) || e), body); }
  res.status(200).json({ ok: true });
}
