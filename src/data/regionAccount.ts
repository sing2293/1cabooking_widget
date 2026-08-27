// Address → dispatch region → SM ACCOUNT, mirroring the internal tool's
// fsaRegions (postal-first). The funnel's rule (Anuj): Ottawa/Gatineau,
// Montreal and Quebec City book on 1 Clean Air; the BKC belt (Brockville /
// Kingston / Cornwall) cross-books to Enviro automatically.

export type DispatchRegion = 'ottawa' | 'montreal' | 'quebec' | 'bkc';

// BKC-only FSAs (Kingston / Brockville / Cornwall & Hawkesbury panels).
const BKC_ONLY = new Set([
  'K7K', 'K7L', 'K7M', 'K7N', 'K7P', 'K7G', 'K7R', 'K0H',
  'K6T', 'K6V', 'K0E',
  'K6H', 'K6J', 'K6K', 'K0C', 'K6A', 'K0B',
]);
// Ottawa belt (served by both — the funnel books them as Ottawa/1CA).
const OTTAWA_BELT = new Set(['K7S', 'K7C', 'K7A', 'K7H', 'K0A', 'K0G', 'K4B', 'K4C', 'K4K', 'K4R']);
// Gatineau side (dispatched as Ottawa).
const GATINEAU = new Set(['J8L', 'J8M', 'J8N', 'J8P', 'J8R', 'J8T', 'J8V', 'J8X', 'J8Y', 'J8Z', 'J9A', 'J9B', 'J9H', 'J9J']);

/** Region for a free-text address / postal. null = undetermined. */
export function regionOfAddress(text: string | null | undefined): DispatchRegion | null {
  const cleaned = String(text || '').toUpperCase();
  const fsa = cleaned.replace(/\s+/g, ' ').match(/\b[A-Z]\d[A-Z]\b|\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/)?.[0]?.replace(/\s/g, '').slice(0, 3) ?? null;
  if (fsa) {
    if (BKC_ONLY.has(fsa)) return 'bkc';
    if (OTTAWA_BELT.has(fsa) || GATINEAU.has(fsa) || /^K[124]/.test(fsa)) return 'ottawa';
    if (/^H/.test(fsa)) return 'montreal';
    if (/^G[123]/.test(fsa)) return 'quebec';
  }
  const t = cleaned.toLowerCase();
  if (/kingston|brockville|cornwall|napanee|gananoque|hawkesbury/.test(t)) return 'bkc';
  if (/montreal|montréal|laval|longueuil|brossard/.test(t)) return 'montreal';
  if (/quebec|québec|sainte-foy|beauport|charlesbourg|levis|lévis/.test(t)) return 'quebec';
  if (/ottawa|gatineau|kanata|orleans|orléans|nepean|barrhaven/.test(t)) return 'ottawa';
  return null;
}

/** Which company's account the booking should land on. */
export function accountForRegion(region: DispatchRegion | null): 'main' | 'enviroduct' {
  /* Like the internal booking app (Anuj 2026-08-27): the account is ALWAYS
     1 Clean Air. A Kingston/Brockville/Cornwall job books on the ENV dummy
     truck in the main account and the interbooking creates the task in the
     Enviro account — we never book into Enviro directly. */
  void region;
  return 'main';
}

export const REGION_COMPANY_LABEL: Record<string, string> = {
  main: '1 Clean Air',
  enviroduct: 'Enviro Duct Cleaning',
};
