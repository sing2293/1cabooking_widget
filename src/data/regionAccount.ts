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
// Montreal's J codes: every one on 1CA's Montreal zone map (Rive-Sud, Rive-Nord,
// Vaudreuil, Lanaudière) — the internal tool's mtlZones list; its H codes match
// below. Only H codes counted before, so these customers were told "we don't
// service that area": 9 of 10 visitors with one of these codes since Sep 1
// (mapping audit C2, 2026-10-28). Keep in step with the internal fsaRegions.
const MONTREAL_J = new Set([
  'J0L', 'J0N', 'J0P', 'J0S',
  'J2W', 'J2Y',
  'J3E', 'J3L', 'J3N', 'J3V', 'J3X', 'J3Y', 'J3Z',
  'J4B', 'J4G', 'J4H', 'J4J', 'J4K', 'J4L', 'J4M', 'J4N', 'J4P', 'J4R', 'J4S', 'J4T', 'J4V', 'J4W', 'J4X', 'J4Y', 'J4Z',
  'J5A', 'J5B', 'J5C', 'J5J', 'J5L', 'J5M', 'J5N', 'J5R', 'J5W', 'J5Y', 'J5Z',
  'J6A', 'J6J', 'J6K', 'J6N', 'J6R', 'J6V', 'J6W', 'J6X', 'J6Y', 'J6Z',
  'J7A', 'J7B', 'J7C', 'J7E', 'J7G', 'J7H', 'J7J', 'J7K', 'J7L', 'J7M', 'J7N', 'J7P', 'J7R', 'J7T', 'J7V', 'J7W', 'J7Y', 'J7Z',
]);
// The same towns by name, for an address with no postal code (no accents).
const MONTREAL_TOWNS = /montreal|laval|longueuil|brossard|terrebonne|repentigny|blainville|boisbriand|saint-eustache|mirabel|deux-montagnes|sainte-therese|rosemere|mascouche|lachenaie|saint-jerome|vaudreuil|pointe-claire|dorval|beaconsfield|kirkland|saint-jean-sur-richelieu|chambly|saint-lambert|la ?prairie|boucherville|varennes|sainte-julie|saint-bruno|saint-basile-le-grand|saint-hubert|greenfield park|carignan|candiac|delson|saint-constant|chateauguay|mercier|ile-perrot|pincourt|saint-lazare|hudson|les cedres|bois-des-filion|lorraine|sainte-anne-des-plaines|la plaine|charlemagne|assomption|saint-lin/;

/** The town in an address line, lower-case without accents: "12 Rue X,
 *  Saint-Sauveur, Québec J0R 1R0, Canada" → "saint-sauveur". The names are
 *  matched against the town only — on the whole line, the province "Québec"
 *  read as Quebec City (mapping audit A4). A lone "Québec" is the city. */
function townOf(text: string): string {
  const parts = text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/\b(qc|que|quebec|on|ont|ontario)\s+(?=[a-z]\d[a-z])/g, ' ')
    .split(',')
    .map((p) => p.replace(/\b[a-z]\d[a-z](?:\s?\d[a-z]\d)?\b/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  // The country, then ONE province: in "…, Québec, QC" the first is the city.
  if (parts.length > 1 && parts[parts.length - 1] === 'canada') parts.pop();
  if (parts.length > 1 && /^(qc|que|pq|quebec|on|ont|ontario)$/.test(parts[parts.length - 1])) parts.pop();
  if (!parts.length) return '';
  const town = parts[parts.length - 1];
  return parts.length === 1 ? town.replace(/\s(qc|que|on|ont|ontario|canada)$/, '').trim() : town;
}

/** Region for a free-text address / postal. null = undetermined. */
export function regionOfAddress(text: string | null | undefined): DispatchRegion | null {
  const cleaned = String(text || '').toUpperCase();
  const fsa = cleaned.replace(/\s+/g, ' ').match(/\b[A-Z]\d[A-Z]\b|\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/)?.[0]?.replace(/\s/g, '').slice(0, 3) ?? null;
  if (fsa) {
    if (BKC_ONLY.has(fsa)) return 'bkc';
    if (OTTAWA_BELT.has(fsa) || GATINEAU.has(fsa) || /^K[124]/.test(fsa)) return 'ottawa';
    if (/^H/.test(fsa) || MONTREAL_J.has(fsa)) return 'montreal';
    if (/^G[123]/.test(fsa)) return 'quebec';
  }
  const t = townOf(String(text || ''));
  if (/kingston|brockville|cornwall|napanee|gananoque|hawkesbury/.test(t)) return 'bkc';
  if (MONTREAL_TOWNS.test(t)) return 'montreal';
  if (/quebec|sainte-foy|beauport|charlesbourg|levis/.test(t)) return 'quebec';
  if (/ottawa|gatineau|kanata|orleans|nepean|barrhaven/.test(t)) return 'ottawa';
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
