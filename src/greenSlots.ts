// Green booking windows from the INTERNAL tool's public slot engine — shared
// by the quote funnel (PreviewApp) and the question flow (/new).
import { INTERNAL_URL } from './data/internalCatalog';

export interface GreenSlot { date: string; start: string; end: string; label: string; quality: 'green' | 'ok'; truck?: string }

/* Slot prefetch: the 62-day green-slot computation server-side takes seconds,
   so the fetch starts while the customer is still typing their details and the
   Time step consumes the same in-flight promise instead of starting cold.
   Failures aren't cached (arriving on the step retries); entries expire so a
   long-idle tab doesn't offer windows someone else booked meanwhile. */
const SLOT_CACHE_TTL_MS = 120_000;
const slotCache = new Map<string, { at: number; p: Promise<GreenSlot[]> }>();
export const fetchGreenSlots = (body: Record<string, unknown>): Promise<GreenSlot[]> => {
  const key = JSON.stringify(body);
  const hit = slotCache.get(key);
  if (hit && Date.now() - hit.at < SLOT_CACHE_TTL_MS) return hit.p;
  const p = fetch(`${INTERNAL_URL}/api/public/slots`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
    .then((r) => r.json())
    .then((j) => (j?.ok && Array.isArray(j.slots) ? (j.slots as GreenSlot[]) : []))
    .catch(() => { slotCache.delete(key); return []; });
  slotCache.set(key, { at: Date.now(), p });
  if (slotCache.size > 8) slotCache.delete(slotCache.keys().next().value as string);
  return p;
};
