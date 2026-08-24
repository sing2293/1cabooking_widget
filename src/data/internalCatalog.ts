// LIVE catalog + prices from the internal tool (/api/public/services) — the
// same figures the internal booking flow charges (Anuj: "make prices follow
// these ones there too"). Cached per region for the session; every consumer
// falls back to the funnel's hard-coded numbers when the fetch fails.
import { useEffect, useState } from 'react';

export const INTERNAL_URL = (import.meta.env.VITE_INTERNAL_PUBLIC_URL as string | undefined) ?? 'https://internal.1cleanair.app';

export interface InternalItem {
  id: string;
  name: string;
  condition?: string;
  unit?: string;
  hours?: string;
  estimate: boolean;
  price?: string;                                   // 'On its own' figure, e.g. "$199"
  priceWith?: string;                               // 'With other cleaning' figure
  labels?: { label: string; price: string }[];      // Single/Double, Pickup/In-home …
}
export interface InternalCategory { name: string; estimate: boolean; items: InternalItem[] }

/* The tool's "Job details" questions (per /services category). An option can
   auto-add items (itemIds reference catalog item ids) and/or ask for an
   appointment type — always live from the tool, never hard-coded here. */
export interface InternalQuestionOption { label: string; itemIds: string[]; apptType?: string }
export interface InternalQuestion { id: string; category: string; question: string; options: InternalQuestionOption[] }

const cache: Record<string, InternalCategory[] | undefined> = {};
const qCache: Record<string, InternalQuestion[] | undefined> = {};

const fetchP: Record<string, Promise<void> | undefined> = {};
const load = (key: string) => (fetchP[key] ??= fetch(`${INTERNAL_URL}/api/public/services?region=${key}`)
  .then((r) => r.json())
  .then((j) => {
    if (!j?.ok) return;
    if (Array.isArray(j.categories)) cache[key] = j.categories;
    qCache[key] = Array.isArray(j.questions) ? j.questions : [];
  })
  .catch(() => { /* fall back to hard-coded prices */ }));

const keyOf = (region: string) => (['ottawa', 'montreal', 'quebec', 'bkc'].includes(region) ? region : 'ottawa');

/** Warm the catalog for a region ahead of the funnel mounting — called from
 *  the lead form the moment an address resolves, so step 3 paints its rows
 *  instantly instead of after a round-trip. Idempotent (one fetch per key). */
export function prefetchInternalCatalog(region: string): void {
  void load(keyOf(region));
}

export function useInternalCatalog(region: string) {
  const key = keyOf(region);
  const [categories, setCategories] = useState<InternalCategory[] | null>(cache[key] ?? null);
  useEffect(() => {
    if (cache[key]) { setCategories(cache[key]!); return; }
    let cancelled = false;
    load(key).then(() => { if (!cancelled && cache[key]) setCategories(cache[key]!); });
    return () => { cancelled = true; };
  }, [key]);
  return categories;
}

export function useInternalQuestions(region: string) {
  const key = keyOf(region);
  const [questions, setQuestions] = useState<InternalQuestion[] | null>(qCache[key] ?? null);
  useEffect(() => {
    if (qCache[key]) { setQuestions(qCache[key]!); return; }
    let cancelled = false;
    load(key).then(() => { if (!cancelled && qCache[key]) setQuestions(qCache[key]!); });
    return () => { cancelled = true; };
  }, [key]);
  return questions;
}

/** The catalog's bilingual single-field convention: "English / Français". */
export const biText = (s: string, fr: boolean): string => {
  const parts = String(s || '').split(' / ');
  return ((fr ? parts[1] || parts[0] : parts[0]) || '').trim();
};

/** "$199" / "$2.05" → number; anything unpriceable → null. */
export const priceNumOf = (s: string | undefined): number | null => {
  const m = String(s ?? '').replace(/[, ]/g, '').match(/^-?\$?(-?\d+(?:\.\d+)?)$/);
  return m ? Number(m[1]) : null;
};

/** Funnel entity id → the internal item name whose price it follows. */
export const PRICE_FOLLOW: Record<string, string> = {
  'first-floor': 'Dryer Vent Cleaning-1st',
  'floor-2-3': 'Dryer Vent Cleaning-2nd',
  'roof-soffit': 'Dryer Vent Cleaning-Roof',
  'condo-building': 'Dryer Vent Cleaning-Condo/Apartment',
  'wall-unit-cleaning': 'Wall-Mount A/C Cleaning - Standard / Alone',
  'air-exchanger-cleaning': 'HRV / Air Exchanger Cleaning',
  'camera-inspection': 'Camera Inspection, 5 Vents',
  'furnace-blower': 'Furnace Blower Cleaning',
  'indoor-coil': 'Evaporator Coil Cleaning',
};

/** name (lowercased) → item across all fetched categories. */
export function itemIndex(categories: InternalCategory[] | null): Map<string, InternalItem> {
  const m = new Map<string, InternalItem>();
  for (const c of categories ?? []) for (const i of c.items) m.set(i.name.trim().toLowerCase(), i);
  return m;
}

/** The internal 'alone' price for a funnel entity — null when not followed /
 *  not fetched / not a clean number. */
export function followedPrice(id: string, index: Map<string, InternalItem>): number | null {
  const name = PRICE_FOLLOW[id];
  if (!name) return null;
  return priceNumOf(index.get(name.toLowerCase())?.price);
}
