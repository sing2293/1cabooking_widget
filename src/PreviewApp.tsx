import { useEffect, useMemo, useState } from 'react';
import { Check, CheckCircle2, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import HvacMini from './components/step1/HvacMini';
import { rowIcon } from './components/step1/rowIcon';
import { HOW_DID_YOU_HEAR, PROVINCE_TAXES } from './data/step3Options';
import { useLang } from './context/LanguageContext';
import { brand } from './brand';
import { SERVICES } from './data/services';
import { useInternalCatalog, useInternalQuestions, biText, priceNumOf, type InternalItem, INTERNAL_URL } from './data/internalCatalog';
import { EXTRAS, type Extra } from './data/extras';
import { regionOfAddress, accountForRegion, type DispatchRegion } from './data/regionAccount';
import { planForSelection, funnelSectorOf } from './funnelBridge';
import type { CapturedLead } from './components/LeadForm';

/* ── The main 1cabooking funnel, WIDGET EDITION (ported from PreviewApp) ──
   The widget's own lead form (steps 1+2 combined, unchanged) hands over a
   CapturedLead; this component starts straight on step 3 with everything
   seeded: 3 details per chosen service (live internal prices; HVAC books via
   ST), 4 green slots & book — same dark layout as the main funnel. All slots
   and bookings come from the INTERNAL tool only (no 1cleanairbackend). */

type StepN = 1 | 2 | 3 | 4;
type Sector = 'residential' | 'commercial';

/* palette */
const PAGE = 'bg-[#0c2137]';
const CARD = 'bg-[#15304f]';

/* tile icon paths (24×24 stroke) */
const P: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5M9 21v-6h6v6',
  building: 'M3 21h18M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M9 8h2M9 12h2M9 16h2M15 21v-8h4v8',
  combo: 'M4 6h9M4 12h9M4 18h9M17 4c-1.5 2-1.5 3 0 5s1.5 3 0 5',
  duct: 'M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2',
  dryer: 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z',
  snow: 'M12 2v20M17 5l-5 4-5-4M17 19l-5-4-5 4M2 12h20M5 7l4 5-4 5M19 7l-4 5 4 5',
  carpet: 'M2 6h20v12H2zM2 12h20M6 6v12M18 6v12',
  dust: 'M9.59 4.59A2 2 0 1 1 11 8H2m14 4h6M2 12h8m2 6h8M2 18h6',
  layers: 'M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  shield: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z',
  bug: 'M12 20a8 8 0 0 0 8-8H4a8 8 0 0 0 8 8zM12 12V4M8 8l4-4 4 4',
  q: 'M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10zM9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01',
  wrench: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
  flame: 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z',
  heat: 'M12 3v9M9 6l3-3 3 3M8 14a4 4 0 1 0 8 0M5 21h14',
  boiler: 'M7 3h10a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM10 7h4M10 11h4M12 15v2',
  drop: 'M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z',
  mini: 'M3 5h18v6H3zM6 8h8M17 8h1M7 14c0 2-1 2-1 4m6-4c0 2-1 2-1 4m6-4c0 2-1 2-1 4',
  replace: 'M4 7h10a4 4 0 0 1 0 8H8M8 11l-4 4 4 4M20 4v6h-6',
  factory: 'M2 20h20M4 20V9l5 3.5V9l5 3.5V9l5 3.5V4h3v16',
  spray: 'M3 3h.01M7 5h.01M11 3h.01M15 5h.01M5 8h6a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM14 15c3 0 5-2 5-5',
  sofa: 'M5 9V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2M3 11a2 2 0 0 1 2 2v3h14v-3a2 2 0 0 1 4 0v5a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2z',
  bed: 'M2 9V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2zM4 18v2M20 18v2',
  car: 'M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63a6 6 0 0 0-.64 2.67V16h3M6.5 16.5m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0M16.5 16.5m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0',
  box: 'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.3 7 12 12l8.7-5M12 22V12',
};
const Icon = ({ d, cls = 'h-6 w-6' }: { d: string; cls?: string }) => (
  <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);

/* ── the MOCK's tiles (previous view), wired to the internal machinery ── */
interface Tile {
  key: string; icon: string; en: string; fr: string;
  group: 'cleaning' | 'hvac';
  /** internal /services categories this tile reveals at step 3 */
  cats?: string[];
  /** optional 2-col layout: each entry is one grid cell, its cats stacked */
  catGroups?: string[][];
  /** shows the duct-package strip in its reveal */
  packages?: boolean;
  /** free-estimate tile → books this internal estimate item */
  estimate?: string;
  /** ST HVAC flow (the whole HVAC group) */
  hvac?: boolean;
}
const TILES: Tile[] = [
  { key: 'duct-dryer', icon: 'combo', en: 'Air Duct + Dryer Vent', fr: 'Conduits + sécheuse', group: 'cleaning', cats: ['Air Duct', 'Dryer Vent'], packages: true },
  { key: 'airduct', icon: 'duct', en: 'Air Duct Cleaning', fr: 'Nettoyage de conduits', group: 'cleaning', cats: ['Air Duct'], packages: true },
  { key: 'dryer', icon: 'dryer', en: 'Dryer Vent Cleaning', fr: 'Conduit de sécheuse', group: 'cleaning', cats: ['Dryer Vent'] },
  { key: 'wallac', icon: 'snow', en: 'Wall AC / Mini-Split Cleaning', fr: 'Nettoyage AC mural', group: 'cleaning', cats: ['A/C'] },
  { key: 'carpet', icon: 'carpet', en: 'Carpet, Rug & Upholstery', fr: 'Tapis et rembourrage', group: 'cleaning', cats: ['Carpet', 'Upholstery', 'Area Rug', 'Mattress', 'Vehicle / Boat / RV'],
    // two-column layout (Anuj): Carpet | Mattress, then Upholstery+Rug | Vehicle
    catGroups: [['Carpet'], ['Mattress'], ['Upholstery', 'Area Rug'], ['Vehicle / Boat / RV']] },
  { key: 'highdust', icon: 'dust', en: 'High Dusting', fr: 'Dépoussiérage en hauteur', group: 'cleaning', estimate: 'Inspection (Custom Inspection)' },
  { key: 'insulation', icon: 'layers', en: 'Insulation', fr: 'Isolation', group: 'cleaning', estimate: 'Attic Insulation Estimate' },
  { key: 'aeroseal', icon: 'shield', en: 'Aeroseal Sealing', fr: 'Scellement Aeroseal', group: 'cleaning', estimate: 'Aeroseal Estimate' },
  { key: 'mold', icon: 'bug', en: 'Mold Remediation', fr: 'Moisissure', group: 'cleaning', estimate: 'Mold Inspection' },
  { key: 'other', icon: 'q', en: 'Other', fr: 'Autre', group: 'cleaning', estimate: 'Inspection (Custom Inspection)' },
];

/* Commercial / Industrial sector → the INTERNAL tool's commercial list
   (all free on-site estimates, same design). */
const COMMERCIAL_TILES: Tile[] = [
  { key: 'c-adc', icon: 'duct', en: 'Commercial Air Duct Cleaning', fr: 'Conduits commerciaux', group: 'cleaning', estimate: 'Commercial Air Duct Cleaning' },
  { key: 'c-highrise', icon: 'building', en: 'High Rise Building Air Duct Cleaning', fr: 'Tour d’habitation', group: 'cleaning', estimate: 'High Rise Building Air Duct Cleaning' },
  { key: 'c-dust', icon: 'dust', en: 'Commercial Dust Cleaning', fr: 'Dépoussiérage commercial', group: 'cleaning', estimate: 'Commercial Dust Cleaning' },
  { key: 'c-dryer', icon: 'dryer', en: 'Dryer Vent Cleaning', fr: 'Conduits de sécheuse', group: 'cleaning', estimate: 'Commercial Dryer Vent Cleaning - (INT)' },
  { key: 'c-mold', icon: 'bug', en: 'Mold Remediation', fr: 'Moisissure', group: 'cleaning', estimate: 'Commercial Mold Remediation' },
  { key: 'c-aeroseal', icon: 'shield', en: 'Aeroseal', fr: 'Aeroseal', group: 'cleaning', estimate: 'Commercial Aeroseal' },
  { key: 'c-insulation', icon: 'layers', en: 'Insulation', fr: 'Isolation', group: 'cleaning', estimate: 'Commercial Insulation' },
  { key: 'c-exhaust', icon: 'factory', en: 'Industrial Plant Exhaust Cleaning', fr: 'Évacuation industrielle', group: 'cleaning', estimate: 'Industrial Plant Exhaust Cleaning' },
  { key: 'c-deep', icon: 'spray', en: 'Industrial Plant Deep Cleaning', fr: 'Nettoyage industriel', group: 'cleaning', estimate: 'Industrial Plant Deep Cleaning' },
  { key: 'c-wall', icon: 'factory', en: 'Industrial Wall Cleaning', fr: 'Murs industriels', group: 'cleaning', estimate: 'Industrial Wall Cleaning' },
  { key: 'c-carpet', icon: 'carpet', en: 'Commercial Carpet Cleaning', fr: 'Tapis commerciaux', group: 'cleaning', estimate: 'Commercial Carpet Cleaning - (INT)' },
];

const HVAC_TILES: Tile[] = [
  { key: 'hvac-install', icon: 'wrench', en: 'HVAC Installation', fr: 'Installation CVC', group: 'hvac', hvac: true },
  { key: 'ac-install', icon: 'snow', en: 'AC Installation', fr: 'Installation AC', group: 'hvac', hvac: true },
  { key: 'ac-repair', icon: 'snow', en: 'AC Repair', fr: 'Réparation AC', group: 'hvac', hvac: true },
  { key: 'furnace-install', icon: 'flame', en: 'Furnace Installation', fr: 'Installation fournaise', group: 'hvac', hvac: true },
  { key: 'furnace-repair', icon: 'flame', en: 'Furnace Repair', fr: 'Réparation fournaise', group: 'hvac', hvac: true },
  { key: 'heatpump', icon: 'heat', en: 'Heat Pump Installation', fr: 'Installation thermopompe', group: 'hvac', hvac: true },
  { key: 'boiler', icon: 'boiler', en: 'Boiler', fr: 'Chaudière', group: 'hvac', hvac: true },
  { key: 'water-heater', icon: 'drop', en: 'Water Heater', fr: 'Chauffe-eau', group: 'hvac', hvac: true },
  { key: 'minisplit', icon: 'mini', en: 'Mini-Split / Ductless', fr: 'Mini-split / sans conduit', group: 'hvac', hvac: true },
  { key: 'duct-replace', icon: 'replace', en: 'Duct Replacement', fr: 'Remplacement de conduits', group: 'hvac', hvac: true },
];

/* Sub-category headers for the step-3 reveals — pretty, like the internal
   combined rails. */
const SUBCAT: Record<string, { icon: string; en: string; fr: string }> = {
  'Air Duct': { icon: 'duct', en: 'Air Duct', fr: 'Conduits d’air' },
  'Dryer Vent': { icon: 'dryer', en: 'Dryer Vent', fr: 'Sécheuse' },
  'A/C': { icon: 'snow', en: 'Wall A/C', fr: 'Climatiseur mural' },
  'Odor Treatment': { icon: 'spray', en: 'Odor Treatment', fr: 'Odeurs' },
  Carpet: { icon: 'carpet', en: 'Carpet', fr: 'Tapis' },
  Upholstery: { icon: 'sofa', en: 'Upholstery', fr: 'Rembourrage' },
  'Area Rug': { icon: 'carpet', en: 'Area Rug', fr: 'Carpette' },
  Mattress: { icon: 'bed', en: 'Mattress', fr: 'Matelas' },
  'Vehicle / Boat / RV': { icon: 'car', en: 'Vehicle / Boat / RV', fr: 'Véhicule / bateau / VR' },
};
const HIDE = /^(included vents|extra vent|standard duct cleaning|condo \/ apartment building duct|two furnaces|travel fees|disclaimer|seasonal discount)|fee\b|minimum|charge\b|drywall|attic|crawl|extra camera|add dryer|access panel|filtration|repair|installation|cover|cage|height adjustment|extra wall|scotchgard|protection\b/i;

/* The three duct bundles (prices mirror the internal sheet). */
const DUCT_PACKAGES = SERVICES.find((s) => s.id === 'central-air')?.packages ?? [];

/* Service info (description + photo) from the classic funnel's EXTRAS,
   matched by keywords against the internal catalog's row names. */
const INFO_MATCH: [RegExp, string][] = [
  [/furnace blower/i, 'extra-furnace-blower'],
  [/evaporator coil|indoor.*coil/i, 'extra-indoor-coil'],
  [/camera/i, 'extra-camera-inspection'],
  [/dryer vent/i, 'extra-dryer-vent'],
  [/bathroom|hood fan|exhaust vent/i, 'extra-bathroom-fan'],
  [/hrv|air exchanger/i, 'extra-air-exchanger'],
  [/wall-?mount|mini-?split|wall unit/i, 'extra-wall-unit'],
  [/heat pump|condenser/i, 'extra-outdoor-heat-pump'],
  [/uv-?c/i, 'extra-uvc'],
  [/benefect|disinfectant/i, 'extra-benefect'],
  [/cover|cage/i, 'extra-dryer-cover'],
  [/crib/i, 'mat-crib'],
  [/two single|2 single/i, 'mat-2-single-special'],
  [/single \/ double|single\/double/i, 'mat-single-double'],
  [/queen|king/i, 'mat-queen-king'],
  [/per seat|seat \/ chair/i, 'uph-seat'],
  [/1[–-]3 rooms/i, 'cw-rooms-1-3'],
  [/stairs (only|up to)/i, 'cw-stairs-only'],
  [/extra room/i, 'cw-extra-room'],
  [/hallway/i, 'cw-hallway'],
  [/landing step/i, 'cw-steps'],
];
const infoOf = (name: string): Extra | null => {
  for (const [re, id] of INFO_MATCH) if (re.test(name)) return EXTRAS.find((e) => e.id === id) ?? null;
  return null;
};

const fmt = (n: number) => '$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatPhone = (v: string) => {
  let d = v.replace(/\D/g, '');
  if (d.length === 11 && d[0] === '1') d = d.slice(1);
  d = d.slice(0, 10);
  if (!d) return '';
  if (d.length < 4) return `(${d}`;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};

interface GreenSlot { date: string; start: string; end: string; label: string; quality: 'green' | 'ok'; truck?: string }

/* Slot prefetch: the 62-day green-slot computation server-side takes seconds,
   so the fetch starts while the customer is still typing their details and the
   Time step consumes the same in-flight promise instead of starting cold.
   Failures aren't cached (arriving on the step retries); entries expire so a
   long-idle tab doesn't offer windows someone else booked meanwhile. */
const SLOT_CACHE_TTL_MS = 120_000;
const slotCache = new Map<string, { at: number; p: Promise<GreenSlot[]> }>();
const fetchGreenSlots = (body: Record<string, unknown>): Promise<GreenSlot[]> => {
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

/* No ?dnum= prefill links on the widget — the lead form is the only entry. */
const DNUM = '';

export default function PreviewApp({ lead }: { lead: CapturedLead }) {
  const { lang } = useLang();
  const [step, setStep] = useState<StepN>(3); // the widget's form IS steps 1+2
  const [sector] = useState<Sector>(funnelSectorOf(lead.sector));
  const [sel] = useState<Set<string>>(
    () => new Set(planForSelection(lead.sector, lead.preselectedServices ?? []).keys),
  );
  // info — seeded from the widget's lead form (no step-2 form here)
  const [firstName] = useState(lead.firstName);
  const [lastName] = useState(lead.lastName);
  const [phone] = useState(formatPhone(lead.phone));
  const [email] = useState(lead.email);
  const [addrText] = useState(lead.formattedAddress);
  const [street] = useState(lead.address1);
  const [city] = useState(lead.city);
  const [zip] = useState(lead.zip);
  const [message] = useState(lead.message ?? '');
  const [howHeard] = useState(lead.howDidYouHear);
  // add-ons picked at step 3
  const [extras, setExtras] = useState<Record<string, InternalItem>>({});
  // time
  const [slots, setSlots] = useState<GreenSlot[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slot, setSlot] = useState<GreenSlot | null>(null);
  const [bookState, setBookState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [bookError, setBookError] = useState('');

  const addressText = addrText || [street, city, zip].filter(Boolean).join(', ');
  /* FSA-first like the funnel; the widget's own city-name gate is the backup
     so an address the form accepted never dead-ends here. */
  const region = useMemo(
    () => regionOfAddress(addressText) ?? ((lead.region as DispatchRegion) || null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addressText],
  );
  const account = accountForRegion(region);
  const catalog = useInternalCatalog(region ?? 'ottawa');
  /* Travel charge — the internal Travel tab's per-FSA figure for this
     address; billed like the internal flow (estimates only note it). */
  const [travel, setTravel] = useState<{ fsa: string; charge: string; amount: number } | null>(null);
  useEffect(() => {
    setTravel(null);
    // Enviro never bills travel (Anuj 2026-08-21) — BKC addresses book
    // through enviroduct, so skip the lookup entirely.
    if (account === 'enviroduct') return;
    if (!zip.trim() && !city.trim()) return;
    const ctrl = new AbortController();
    fetch(`${INTERNAL_URL}/api/public/travel?postal=${encodeURIComponent(zip)}&city=${encodeURIComponent(city)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => {
        if (!j?.ok || !j.charge) return;
        const n = Number(String(j.charge).replace(/[^0-9.]/g, ''));
        setTravel({ fsa: j.fsa || '', charge: j.charge, amount: Number.isFinite(n) ? n : 0 });
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [zip, city]);

  const [ductPkg, setDuctPkg] = useState<string | null>(null);
  const ALL_TILES = [...(sector === 'commercial' ? COMMERCIAL_TILES : TILES), ...HVAC_TILES];
  const picked = ALL_TILES.filter((t) => sel.has(t.key));
  const catPicks = picked.filter((t) => t.cats || t.packages);
  const estimatePicks = picked.filter((t) => t.estimate);
  const hvacPicks = picked.filter((t) => t.hvac);
  const hvacPicked = hvacPicks.length > 0;
  // Combos the automated flow can't finish online (Anuj): HVAC mixed with
  // cleaning, or the High Dusting / Other tiles (alone or paired) — those
  // send the step-2 info to n8n and stop at a thank-you.
  const mixedHvac = hvacPicked && (catPicks.length > 0 || estimatePicks.length > 0);
  const oddPick = picked.some((t) => t.key === 'highdust' || t.key === 'other');
  // Bookable + estimate mixes are gated LEAD-ONLY by the widget's form
  // (funnelBridge) — mirrored here so the payload flags stay truthful.
  const mixedEstimate = catPicks.length > 0 && estimatePicks.length > 0;
  const leadOnly = mixedHvac || oddPick || mixedEstimate;
  // HVAC-only carts book INSIDE the step-3 panel (ST) — no Time step at all.
  const hvacOnly = hvacPicked && catPicks.length === 0 && estimatePicks.length === 0;
  // "Other" picked → the visitor spelled it out on the widget's lead form.
  const [otherText] = useState(lead.otherServiceText ?? '');
  // Job-details answers: questionId → picked option index (absent = unanswered).
  const [qa, setQa] = useState<Record<string, number>>({});
  // Exact-quote controls under the duct packages (the classic funnel widget):
  // vents count on arrival vs known (10 included, extras billed), and how many
  // furnaces/systems the home has (package price multiplies).
  const [ventMode, setVentMode] = useState<'arrival' | 'known'>('arrival');
  const [ventCount, setVentCount] = useState(10);
  const [furnaces, setFurnaces] = useState(1);
  // package-details modal (the classic image + includes view) via the ⓘ icon
  /* Anchored to the tapped ⓘ: inside the auto-resized embed iframe,
     "fixed + centered" means the middle of the WHOLE iframe (thousands of px
     on mobile), far from the tap — so the card opens at the click's Y. */
  const [infoPkg, setInfoPkg] = useState<{ id: string; y: number } | null>(null);
  // A package or add-on can't outlive the tile that revealed it — an HVAC-only
  // cart was still carrying (and billing) an earlier duct pick.
  const pkgTileOn = picked.some((t) => t.packages);
  // A "With Duct" companion keeps the package alive too — it's picked from
  // the bottom reveal on tiles that have no packages strip of their own.
  const ductCompanionOn = Object.values(extras).some((i) => /with duct/i.test(`${i.name} ${i.condition ?? ''}`));
  useEffect(() => { if (!pkgTileOn && !ductCompanionOn) setDuctPkg(null); }, [pkgTileOn, ductCompanionOn]);
  useEffect(() => { if (catPicks.length === 0) setExtras({}); }, [catPicks.length]);
  const commercial = sector === 'commercial';
  // Commercial/industrial work always quotes as an estimate (internal rule).
  const estimatesOnly = commercial || (estimatePicks.length > 0 && !ductPkg && !Object.keys(extras).length);

  // desktop info panel follows the LAST-selected row that has info
  const [infoRow, setInfoRow] = useState<InternalItem | null>(null);
  const toggleExtra = (i: InternalItem) => {
    const removing = !!extras[i.id];
    setExtras((prev) => {
      const n = { ...prev };
      if (n[i.id]) delete n[i.id]; else n[i.id] = i;
      return n;
    });
    if (removing) { if (infoRow?.id === i.id) setInfoRow(null); }
    else if (infoOf(i.name)) setInfoRow(i);
  };
  useEffect(() => { if (infoRow && !extras[infoRow.id]) setInfoRow(null); }, [extras, infoRow]);

  /* prices + lines */
  const pkgPicked = ductPkg ? DUCT_PACKAGES.find((p) => p.id === ductPkg) : null;
  // The internal with/alone math: a split-cell add-on charges its 'With other
  // cleaning' figure whenever the cart pairs it with the package or another
  // paid add-on — only a solo add-on pays the 'On its own' price.
  const withOther = (i: InternalItem) =>
    !!pkgPicked || Object.values(extras).some((o) => o.id !== i.id && !o.estimate);
  const withApplied = (i: InternalItem) =>
    !i.estimate && !commercial && withOther(i) && priceNumOf(i.priceWith) !== null;
  const extraAmount = (i: InternalItem) =>
    i.estimate || commercial ? 0
    : withApplied(i) ? (priceNumOf(i.priceWith) ?? 0)
    : (priceNumOf(i.price) ?? 0);

  /* Standalone wall-unit (Mini-Split) — the classic height question: unit
     counts by indoor height, priced base / +$50 / +$100 off the catalog. */
  const wallAloneOf = (i: InternalItem) => /^wall-?mount(ed)? a\/c/i.test(i.name) && /standard|alone/i.test(i.name);
  const wallAlone = Object.values(extras).find(wallAloneOf) ?? null;
  const [wallUnits, setWallUnits] = useState<Record<'u8' | 'm12' | 'o12', number>>({ u8: 1, m12: 0, o12: 0 });
  useEffect(() => { if (!wallAlone) setWallUnits({ u8: 1, m12: 0, o12: 0 }); }, [!wallAlone]);
  const wallBase = wallAlone ? (priceNumOf(wallAlone.price) ?? 299) : 299;
  const WALL_TIERS: { k: 'u8' | 'm12' | 'o12'; en: string; fr: string; add: number }[] = [
    { k: 'u8', en: '8 feet and under', fr: '8 pieds et moins', add: 0 },
    { k: 'm12', en: 'Between 8 and 12 feet (+$50)', fr: 'Entre 8 et 12 pieds (+50$)', add: 50 },
    { k: 'o12', en: 'Over 12 feet (+$100)', fr: 'Plus de 12 pieds (+100$)', add: 100 },
  ];

  /* Job details — the tool's /services Questions for the cart's categories,
     always live from the internal tool (new assignments show up here with no
     funnel change). An answer auto-adds its option's services to the quote. */
  const questionsAll = useInternalQuestions(region ?? 'ottawa');
  // Categories actually IN THE CART (internal-tool parity): the picked duct
  // package plus each selected add-on's OWN catalog category — never the
  // tile's potential categories. Dryer-vent-only picks inside the combo tile
  // were still surfacing the Air Duct questions (and their price impact).
  const cartCats = useMemo(() => {
    const catOf = new Map<string, string>();
    for (const c of catalog ?? []) for (const i of c.items) catOf.set(i.id, c.name);
    const s = new Set<string>();
    for (const id of Object.keys(extras)) { const cn = catOf.get(id); if (cn) s.add(cn); }
    if (ductPkg) s.add('Air Duct');
    return s;
  }, [extras, ductPkg, catalog]);
  // Only an Air Duct cart (alone or combined) gets the card (Anuj). Questions
  // copied across categories on the tool dedupe by text — one card, one copy.
  const visibleQs = useMemo(() => {
    if (!cartCats.has('Air Duct')) return [];
    const seen = new Set<string>();
    return (questionsAll ?? []).filter((q) => {
      if (!cartCats.has(q.category)) return false;
      const key = `${q.question.trim().toLowerCase()}|${q.options.map((o) => o.label.trim().toLowerCase()).join('|')}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [questionsAll, cartCats]);
  useEffect(() => { // an answer whose question left the cart is dropped
    const vis = new Set(visibleQs.map((q) => q.id));
    const stale = Object.keys(qa).filter((id) => !vis.has(id));
    if (stale.length) setQa((prev) => { const n = { ...prev }; for (const id of stale) delete n[id]; return n; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleQs]);
  const itemById = useMemo(() => {
    const m = new Map<string, InternalItem>();
    for (const c of catalog ?? []) for (const i of c.items) m.set(i.id, i);
    return m;
  }, [catalog]);
  // The catalog's Extra Vent figure (beyond the package's 10 included).
  const extraVentPrice = useMemo(() => {
    for (const c of catalog ?? []) for (const i of c.items) {
      if (/^extra vent/i.test(i.name)) { const n = priceNumOf(i.price); if (n != null) return n; }
    }
    return 15;
  }, [catalog]);
  const extraVents = ventMode === 'known' ? Math.max(0, ventCount - 10) : 0;
  const qaLines = visibleQs.flatMap((q) => {
    const o = q.options[qa[q.id]];
    return o ? (o.itemIds.map((id) => itemById.get(id)).filter(Boolean) as InternalItem[]) : [];
  });
  const jdNotes = visibleQs
    .filter((q) => qa[q.id] !== undefined)
    .map((q) => `${biText(q.question, false)}: ${biText(q.options[qa[q.id]]?.label ?? '', false)}`);
  const qaAppt = visibleQs.map((q) => q.options[qa[q.id] ?? -1]?.apptType).filter(Boolean).pop();

  const summaryLines = [
    ...(pkgPicked ? [{
      label: `${lang === 'en' ? pkgPicked.name.en : pkgPicked.name.fr}${furnaces > 1 ? ` × ${furnaces}` : ''}`,
      amount: commercial ? 0 : pkgPicked.price * furnaces,
    }] : []),
    ...(pkgPicked && !commercial && extraVents > 0
      ? [{ label: `${lang === 'en' ? 'Extra Vents' : 'Bouches supplémentaires'} × ${extraVents}`, amount: extraVents * extraVentPrice }]
      : []),
    ...Object.values(extras).filter((i) => !wallAloneOf(i)).map((i) => ({
      label: `${i.name}${withApplied(i) ? (lang === 'en' ? ' — with other cleaning' : ' — avec autre nettoyage') : ''}`,
      amount: extraAmount(i),
    })),
    ...(wallAlone && !commercial
      ? WALL_TIERS.filter((tr) => wallUnits[tr.k] > 0).map((tr) => ({
          label: `${lang === 'en' ? 'Wall unit' : 'Unité murale'} ${lang === 'en' ? tr.en : tr.fr} × ${wallUnits[tr.k]}`,
          amount: wallUnits[tr.k] * (wallBase + tr.add),
        }))
      : wallAlone ? [{ label: wallAlone.name, amount: 0 }] : []),
    ...qaLines.map((i) => ({ label: i.name, amount: extraAmount(i) })),
    ...estimatePicks.map((t) => ({ label: `${lang === 'en' ? t.en : t.fr} (${lang === 'en' ? 'free estimate' : 'estimation gratuite'})`, amount: 0 })),
  ];
  if (travel && travel.amount > 0 && !estimatesOnly && !hvacOnly) {
    summaryLines.push({ label: `${lang === 'en' ? 'Travel charge' : 'Frais de déplacement'} (${travel.fsa})`, amount: travel.amount });
  }
  const total = summaryLines.reduce((s, l) => s + l.amount, 0);
  const [coupon, setCoupon] = useState('');
  const provinceName = region === 'montreal' || region === 'quebec' ? 'Québec' : 'Ontario';
  const taxLines = estimatesOnly || total === 0 ? [] : (PROVINCE_TAXES[provinceName]?.lines ?? []).map((tl) => ({ label: tl.label, amount: total * tl.rate }));
  const tax = taxLines.reduce((s, tl) => s + tl.amount, 0);
  const grandTotal = total + tax;
  // slot-page mini calendar month (YYYY-MM), seeded from the first offer
  const [calMonth, setCalMonth] = useState<string | null>(null);
  const serviceNames = [...new Set([
    ...(pkgPicked ? ['Standard Duct Cleaning'] : []),
    ...Object.values(extras).map((i) => i.name),
    ...qaLines.map((i) => i.name),
    ...estimatePicks.map((t) => t.estimate!).filter(Boolean),
  ])];

  /* Booked hours by cart type (Anuj 2026-08-21): dryer-vent-only carts book
     1 h; carpet-family-only carts and SM estimates 1.5 h; everything else
     2 h. HVAC books through its own panel with the internal ST rules. */
  const durationMinutes = useMemo(() => {
    if (estimatesOnly) return 90;
    const cats = [...cartCats];
    if (!cats.length) return 120;
    const CARPET = new Set(['Carpet', 'Upholstery', 'Area Rug', 'Mattress', 'Vehicle / Boat / RV']);
    if (cats.every((c) => c === 'Dryer Vent')) return 60;
    if (cats.every((c) => CARPET.has(c))) return 90;
    return 120;
  }, [estimatesOnly, cartCats]);

  /* SM-estimate carts skip the Time step: the slot picker renders straight on
     step 3 and Next books (Anuj 2026-08-21) — like the HVAC 3-step flow. */
  const slotStep: StepN = estimatesOnly ? 3 : 4;

  const slotsBody = () => ({ account, address: addressText, services: serviceNames, days: 62, estimate: estimatesOnly || undefined, durationMinutes });

  /* warm the slot fetch on the steps BEFORE the slot step (address is known
     from Details on) — debounced so mid-typing address edits don't spam it */
  useEffect(() => {
    if (step < 2 || step >= slotStep || !addressText || region === null || !serviceNames.length) return;
    const t = setTimeout(() => { fetchGreenSlots(slotsBody()); }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, slotStep, addressText, region, account, serviceNames.join('|'), durationMinutes, estimatesOnly]);

  /* green slots on the slot step — usually already in flight (or done) above */
  useEffect(() => {
    if (step !== slotStep || !addressText || !serviceNames.length) return;
    let gone = false;
    setSlotsLoading(true); setSlots(null); setSlot(null); setCalMonth(null);
    fetchGreenSlots(slotsBody())
      .then((s) => { if (!gone) setSlots(s); })
      .finally(() => { if (!gone) setSlotsLoading(false); });
    return () => { gone = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, slotStep, addressText, account, serviceNames.join('|'), durationMinutes]);

  const book = async () => {
    if (!slot || bookState === 'loading') return;
    setBookState('loading'); setBookError('');
    try {
      const has = (k: string) => sel.has(k);
      const jobType = estimatesOnly ? 'Estimate'
        : (has('duct-dryer') || (has('airduct') && has('dryer'))) ? 'Duct & Dryer'
        : has('airduct') || has('duct-dryer') ? 'Air Duct'
        : has('dryer') ? 'Dryer Vent'
        : has('carpet') ? 'Carpet'
        : has('wallac') ? 'Wall Mount A/C'
        : 'Work';
      const heardLabel = HOW_DID_YOU_HEAR.find((o) => o.value === howHeard)?.label.en || howHeard;
      const techNote = [
        `ONLINE BOOKING (${sector === 'commercial' ? 'COMMERCIAL/INDUSTRIAL' : 'residential'} — customer funnel)`,
        ...summaryLines.map((l) => ` - ${l.label}: ${fmt(l.amount)}`),
        `TOTAL: ${fmt(total)}`,
        travel && travel.amount > 0 ? `Travel charge ${travel.charge} (${travel.fsa})${estimatesOnly ? ' — noted, not billed (estimate)' : ' — included above'}` : '',
        pkgPicked ? `Vents: ${ventMode === 'arrival' ? 'Count on Arrival (TBD)' : `${ventCount}${extraVents > 0 ? ` (${extraVents} extra × $${extraVentPrice})` : ' (included)'}`}` : '',
        pkgPicked && furnaces > 1 ? `Furnaces / Systems: ${furnaces}` : '',
        ...jdNotes.map((l) => `Q&A: ${l}`),
        qaAppt ? `Appt type (from answers): ${qaAppt}` : '',
        howHeard ? `How did you hear: ${heardLabel}` : '',
        message.trim() ? `Customer message: ${message.trim()}` : '',
      ].filter(Boolean).join('\n');
      const r = await fetch(estimatesOnly ? '/api/estimate-book' : '/api/internal-book', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account, region: region ?? 'ottawa',
          start: slot.start, end: slot.end,
          firstName: firstName.trim(), lastName: lastName.trim(),
          phone: phone.replace(/\D/g, ''), email: email.trim(),
          address1: street.trim(), city: city.trim(),
          state: region === 'montreal' || region === 'quebec' ? 'QC' : 'ON', zip: zip.trim(),
          // notes → the SM ORDER's Note field (what internal bookings do);
          // techNote stays on the job for dispatch; the same summary goes to
          // the job's Admin Note too (Anuj: office reads that tab).
          commercial, jobType: qaAppt || jobType, techNote, adminNote: techNote, notes: techNote, leadEventId, dnum: DNUM || undefined,
          // The high-level cart — the INTERNAL tool builds the real SM order
          // lines from this server-side (package expansion, SM ids, prices,
          // travel), so the order carries items and truck capabilities apply.
          cart: {
            package: pkgPicked && !commercial
              ? { name: { basic: 'Standard Duct Package', preferred: 'Performance Duct Package', 'healthy-home': 'Healthy Home Duct Package' }[pkgPicked.id] ?? pkgPicked.name.en, qty: furnaces }
              : undefined,
            extraVents: pkgPicked && !commercial && ventMode === 'known' ? extraVents : 0,
            items: [
              ...Object.values(extras).filter((i) => !wallAloneOf(i)).map((i) => ({ name: i.name, qty: 1, price: extraAmount(i) })),
              ...(wallAlone && !commercial
                ? WALL_TIERS.filter((tr) => wallUnits[tr.k] > 0).map((tr) => ({ name: wallAlone.name, qty: wallUnits[tr.k], price: wallBase + tr.add }))
                : []),
              ...qaLines.map((i) => ({ name: i.name, qty: 1, price: extraAmount(i) })),
              ...estimatePicks.map((t) => ({ name: t.estimate!, qty: 1, price: 0 })),
            ],
            travel: !estimatesOnly && !hvacOnly && travel && travel.amount > 0 ? travel.amount : 0,
          },
          // webhook #2 additions (Anuj): the whole step-2 lead payload + the
          // Service Summary, line by line, totals included.
          lead: leadSnapshot(),
          summary: [
            ...summaryLines.map((l) => `${l.label}: ${fmt(l.amount)}`),
            ...(estimatesOnly
              ? ['Total: Free estimate']
              : [
                  `Subtotal: ${fmt(total)}`,
                  ...taxLines.map((tl) => `${tl.label}: ${fmt(tl.amount)}`),
                  `Total: ${fmt(grandTotal)}`,
                ]),
          ],
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.error) throw new Error(j?.message || j?.error || `Booking failed (${r.status})`);
      // final-booking webhooks fire from the INTERNAL tool (it does the SM/ST
      // write) — the funnel only sends the step-2 lead.
      setBookState('done');
    } catch (e) {
      setBookState('error');
      setBookError((e as Error).message);
    }
  };

  /* One id per visitor journey — MINTED BY THE WIDGET's lead form (its
     journey lead already posted to Slack/Pipedrive); it rides the booking
     bodies so the internal tool flips that journey to BOOKED. */
  const leadEventId = lead.eventId;
  /* The full lead payload — the widget-form fields in the funnel's shape.
     Forwarded whole in the booking bodies (webhooks #2 and #3, Anuj). */
  const leadSnapshot = () => {
    // category = which side ('both' when mixed); deal_type = the CRM routing
    // bucket, widget priority EXTENDED with Mold and Other (the widget folds
    // those into Cleaning — Anuj wants them separate):
    // HVAC > Insulation > Aeroseal > Mold > Other > Cleaning.
    const category: 'cleaning' | 'hvac' | 'both' =
      hvacPicked && (catPicks.length || estimatePicks.length) ? 'both' : hvacPicked ? 'hvac' : 'cleaning';
    const dealType = hvacPicked ? 'HVAC'
      : sel.has('insulation') ? 'Insulation'
      : sel.has('aeroseal') ? 'Aeroseal'
      : sel.has('mold') ? 'Mold'
      : sel.has('other') ? 'Other'
      : 'Cleaning';
    const q = new URLSearchParams(window.location.search);
    const cookie = (n: string) => document.cookie.match(new RegExp(`(?:^|; )${n}=([^;]*)`))?.[1] ?? '';
    const reasons = leadOnly ? [mixedHvac ? 'hvac_plus_cleaning' : 'needs_review'] : [];
    return {
      event_id: leadEventId,
      dnum: DNUM || null,
      lead_type: 'widget_quote',
      brand: brand.id,
      source: 'widget', // → "Website Lead" / "Website Direct Book" labels
      customer_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      phone: phone.replace(/\D/g, ''),
      address: street.trim(),
      formatted_address: addressText,
      city, state: region === 'montreal' || region === 'quebec' ? 'QC' : 'ON', zip,
      region: region ?? '',
      sector: lead.sector, // 'Residential' | 'Commercial' | 'Industrial' — Industrial ROUTES as Commercial server-side
      category,
      deal_type: dealType,
      services: picked.map((t) => (t.key === 'other' && otherText.trim() ? `Other services: ${otherText.trim()}` : t.en)),
      service_ids: [...sel],
      other_service_description: sel.has('other') ? otherText.trim() : '',
      how_did_you_hear: HOW_DID_YOU_HEAR.find((o) => o.value === howHeard)?.label.en ?? howHeard,
      how_did_you_hear_id: howHeard,
      message: message.trim(),
      recording_url: lead.recordingUrl ?? '',
      sms_opt_in: true,      // the widget form requires both consents
      agreed_to_policy: true,
      proceed_to_booking: !leadOnly,
      ineligibility_reasons: reasons,
      fbp: cookie('_fbp'),
      fbc: cookie('_fbc'),
      event_source_url: window.location.href,
      utm_source: q.get('utm_source') ?? '',
      utm_campaign: q.get('utm_campaign') ?? '',
      utm_medium: q.get('utm_medium') ?? '',
      utm_content: q.get('utm_content') ?? '',
      utm_term: q.get('utm_term') ?? '',
      utm_id: q.get('utm_id') ?? '',
      submitted_at: new Date().toISOString(),
    };
  };
  /* The widget's lead form already posted 'visit' and 'lead' to /api/journey
     with this event id — nothing to re-send here; the internal book routes
     stamp 'booked' server-side. */

  const canNext = slot !== null;

  // "With Duct …" companions can't book alone — they ride duct cleaning; a
  // "With Service" row just needs any other real service in the cart.
  const needDuct = Object.values(extras).filter((i) => /with duct/i.test(`${i.name} ${i.condition ?? ''}`));
  const needSvc = Object.values(extras).filter((i) => /with service/i.test(i.condition ?? ''));
  const hasOtherSvc = !!pkgPicked || Object.values(extras).some((i) => !/with (duct|service)/i.test(`${i.name} ${i.condition ?? ''}`));
  // No packages strip on this tile → the picker reveals at the bottom instead.
  const pkgStripBelow = needDuct.length > 0 && !catPicks.some((t) => t.packages) && !commercial;
  const companionBlock = commercial ? ''
    : needDuct.length && !pkgPicked
      ? (lang === 'en'
        ? `Add duct cleaning to book: ${needDuct.map((i) => i.name).join(', ')} — select a duct package ${pkgStripBelow ? 'below' : 'above'}.`
        : `Ajoutez le nettoyage de conduits pour réserver : ${needDuct.map((i) => i.name).join(', ')} — choisissez un forfait ${pkgStripBelow ? 'ci-dessous' : 'ci-dessus'}.`)
    : needSvc.length && !hasOtherSvc
      ? (lang === 'en'
        ? `${needSvc.map((i) => i.name).join(', ')} books with another service — add duct cleaning or another cleaning first.`
        : `${needSvc.map((i) => i.name).join(', ')} se réserve avec un autre service — ajoutez d’abord un nettoyage.`)
    : '';
  const canNext3 = serviceNames.length > 0 && !companionBlock; // hvac-only carts book inside the HVAC panel

  const STEPS: Record<StepN, { en: string; fr: string }> = {
    1: { en: 'Services', fr: 'Services' },
    2: { en: 'Your info', fr: 'Vos infos' },
    3: { en: 'Details', fr: 'Détails' },
    4: { en: 'Time', fr: 'Horaire' },
  };

  /* ── confirmation ── */
  if (bookState === 'done') {
    return (
      <div className={`min-h-screen ${PAGE}`}>
        <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 ring-4 ring-emerald-400/30">
            <Check className="h-10 w-10 text-emerald-400" strokeWidth={2.5} />
          </div>
          <h2 className="mt-5 text-2xl font-bold text-white">{lang === 'en' ? 'Booking confirmed!' : 'Réservation confirmée!'}</h2>
          <p className="mt-2 text-sm text-slate-300">
            {slot && `${slot.date} · ${slot.label}`} — {lang === 'en' ? "we'll be in touch to confirm the details." : 'nous vous contacterons pour confirmer.'}
          </p>
          <div className={`mt-6 w-full rounded-2xl ${CARD} p-4 text-left`}>
            {summaryLines.map((l, i) => (
              <div key={i} className="flex justify-between py-0.5 text-sm text-slate-200"><span>{l.label}</span><span className="font-semibold tabular-nums">{fmt(l.amount)}</span></div>
            ))}
            <div className="mt-2 flex justify-between border-t border-white/10 pt-2 text-base font-bold text-white"><span>Total</span><span>{fmt(total)}</span></div>
          </div>
          <a href={`tel:${brand.phoneDigits}`} className="mt-5 text-sm font-bold text-sky-400">{brand.phoneDisplay}</a>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${PAGE} pb-28`}>
      <h1 className="mt-14 text-center text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
        {lang === 'en' ? 'Get a quote & book online!' : 'Obtenez une soumission et réservez en ligne!'}
      </h1>

      {/* step chips (dark) */}
      <div className="mx-auto mt-4 flex max-w-5xl items-center justify-center gap-1.5 overflow-x-auto px-4">
        {((hvacOnly || estimatesOnly ? [1, 2, 3] : [1, 2, 3, 4]) as StepN[]).map((n) => (
          <span key={n} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold tracking-wide ${
            n === step ? 'bg-sky-500 text-white' : n < step ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-slate-400'
          }`}>
            {n < step ? <Check className="h-3 w-3" strokeWidth={3} /> : <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${n === step ? 'bg-white/25' : 'bg-white/10'}`}>{n}</span>}
            {n === 3 && (hvacOnly || estimatesOnly) ? (lang === 'en' ? 'Book' : 'Réserver') : STEPS[n][lang]}
          </span>
        ))}
      </div>

      <main className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        {/* steps 3-4 ride a two-column layout: content + Service Summary */}
        <div className={step >= 3 ? 'flex flex-col gap-5 lg:flex-row lg:items-start' : ''}>
        <div className={step >= 3 ? 'min-w-0 flex-1' : ''}>
        {/* ── 3 · DETAILS per pick ── */}
        {step === 3 && (
          <div className="space-y-4">
            {commercial && (
              <p className="rounded-xl border border-pink-400/40 bg-pink-500/10 px-3.5 py-2.5 text-sm text-pink-300">
                {lang === 'en' ? 'Commercial & industrial work books as a FREE on-site estimate — our team quotes on location.' : 'Le travail commercial et industriel passe en estimation gratuite sur place.'}
              </p>
            )}
            {/* the duct-package strip — Air Duct / combo / Packages picks */}
            {catPicks.some((t) => t.packages) && !commercial && (
              <section className={`rounded-2xl ${CARD} p-4 sm:p-5`}>
                <h3 className="mb-4 flex items-center gap-2.5">
                  <span className="rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 p-1.5 text-white shadow-sm"><Icon d={P.box} cls="h-4 w-4" /></span>
                  <span className="text-sm font-bold uppercase tracking-wider text-white">{lang === 'en' ? 'Duct cleaning packages' : 'Forfaits de conduits'}</span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-slate-300">{lang === 'en' ? '10 vents included · pick one' : '10 bouches incluses · choisissez-en un'}</span>
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {DUCT_PACKAGES.map((p, pi) => {
                    const on = ductPkg === p.id;
                    const badge = pi === 1 ? { txt: lang === 'en' ? 'MOST POPULAR' : 'PLUS POPULAIRE', cls: 'bg-emerald-400/90 text-emerald-950' }
                      : pi === 2 ? { txt: lang === 'en' ? 'BEST VALUE' : 'MEILLEURE VALEUR', cls: 'bg-amber-400/90 text-amber-950' } : null;
                    return (
                      <button key={p.id} onClick={() => setDuctPkg(on ? null : p.id)}
                        className={`group relative rounded-2xl p-4 pt-5 text-left transition-all duration-200 ${
                          on
                            ? 'bg-gradient-to-br from-sky-500/25 to-blue-600/10 ring-2 ring-sky-400 shadow-lg shadow-sky-500/10'
                            : 'bg-white/5 ring-1 ring-white/10 hover:-translate-y-0.5 hover:bg-white/10 hover:ring-sky-400/50'
                        }`}>
                        {badge && <span className={`absolute -top-2 left-3 rounded-full px-2 py-0.5 text-[9px] font-extrabold tracking-wide ${badge.cls}`}>{badge.txt}</span>}
                        {on && <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-sky-400 text-[#0c2137]"><Check className="h-3.5 w-3.5" strokeWidth={3.5} /></span>}
                        <span role="button" title={lang === 'en' ? 'Package details' : 'Détails du forfait'}
                          onClick={(e) => { e.stopPropagation(); setInfoPkg({ id: p.id, y: e.clientY }); }}
                          className={`absolute top-3 z-10 ${on ? 'right-10' : 'right-3'}`}>
                          <span className="relative flex h-5 w-5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-40" style={{ animationDuration: '2.2s' }} />
                            <Info className="relative h-5 w-5 text-sky-300 transition-colors hover:text-white" />
                          </span>
                        </span>
                        <p className="text-sm font-bold text-white">{lang === 'en' ? p.name.en : p.name.fr}</p>
                        <p className="mt-1.5 text-2xl font-extrabold tabular-nums text-white">
                          {fmt(p.price)}
                          <span className="ml-1 text-[10px] font-semibold text-slate-400">{lang === 'en' ? '+ vents' : '+ bouches'}</span>
                        </p>
                        {p.tagline && <p className="mt-1 text-[11px] leading-snug text-slate-300">{lang === 'en' ? p.tagline.en : p.tagline.fr}</p>}
                      </button>
                    );
                  })}
                </div>

                {/* exact-quote controls (the classic funnel widget) */}
                {pkgPicked && (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl bg-white/5 p-3.5 ring-1 ring-white/10">
                      <p className="text-xs font-bold uppercase tracking-wider text-white">{lang === 'en' ? 'Want a more exact quote?' : 'Voulez-vous un devis plus précis?'}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {([
                          { v: 'arrival' as const, en: 'Count on Arrival (Recommended)', fr: 'Compter à l’arrivée (recommandé)' },
                          { v: 'known' as const, en: 'I know my vent count', fr: 'Je connais mon nombre de bouches' },
                        ]).map((m) => (
                          <button key={m.v} onClick={() => setVentMode(m.v)}
                            className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                              ventMode === m.v
                                ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/20'
                                : 'bg-white/5 text-slate-200 ring-1 ring-white/10 hover:bg-white/10 hover:ring-sky-400/50'
                            }`}>
                            {lang === 'en' ? m.en : m.fr}
                          </button>
                        ))}
                      </div>
                      <p className="mt-1.5 text-[11px] italic text-slate-400">
                        {lang === 'en'
                          ? "Don't worry if you're unsure — our technicians will do an official count with you upon arrival."
                          : 'Ne vous inquiétez pas si vous n’êtes pas sûr — nos techniciens feront un compte officiel à l’arrivée.'}
                      </p>
                      {ventMode === 'known' && (
                        <div className="mt-2 flex items-center gap-2.5">
                          <span className="text-xs font-semibold text-slate-300">{lang === 'en' ? 'Number of vents:' : 'Nombre de bouches :'}</span>
                          <button onClick={() => setVentCount((v) => Math.max(1, v - 1))} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-sm font-bold text-white hover:bg-white/20">−</button>
                          <span className="w-8 text-center text-sm font-bold tabular-nums text-white">{ventCount}</span>
                          <button onClick={() => setVentCount((v) => v + 1)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-sm font-bold text-white hover:bg-white/20">+</button>
                          {extraVents > 0 && <span className="text-[11px] font-semibold text-sky-300">{extraVents} {lang === 'en' ? 'extra' : 'suppl.'} × {fmt(extraVentPrice)}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-white/5 p-3.5 ring-1 ring-white/10">
                      <p className="text-xs font-bold uppercase tracking-wider text-white">{lang === 'en' ? 'How many furnaces does this home have?' : 'Combien de fournaises dans cette maison?'}</p>
                      <div className="flex items-center gap-2.5">
                        <button onClick={() => setFurnaces((v) => Math.max(1, v - 1))} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-sm font-bold text-white hover:bg-white/20">−</button>
                        <span className="w-8 text-center text-sm font-bold tabular-nums text-white">{furnaces}</span>
                        <button onClick={() => setFurnaces((v) => v + 1)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-sm font-bold text-white hover:bg-white/20">+</button>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* per-tile reveals — PRETTY sub-categories like the internal rail */}
            {catPicks.filter((t) => t.cats?.length).map((t) => (
              <section key={t.key} className={`rounded-2xl ${CARD} p-4 sm:p-5`}>
                <h3 className="mb-3 flex flex-wrap items-center gap-2.5">
                  <span className="rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 p-1.5 text-white shadow-sm"><Icon d={P[t.icon]} cls="h-4 w-4" /></span>
                  <span className="text-sm font-bold uppercase tracking-wider text-white">{lang === 'en' ? t.en : t.fr}</span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-slate-300">{lang === 'en' ? 'optional add-ons · select any' : 'options en sus · au choix'}</span>
                </h3>
                <div className={`grid items-start gap-4 ${(t.cats!.length > 1) ? 'md:grid-cols-2' : ''}`}>
                  {(t.catGroups ?? t.cats!.map((c) => [c])).map((grp) => (
                  <div key={grp.join('|')} className="space-y-4">
                  {grp.map((cat) => {
                    const meta = SUBCAT[cat] ?? { icon: t.icon, en: cat, fr: cat };
                    // "With Duct Only" rows book alongside duct cleaning, so
                    // they live under Air Duct wherever the tool filed them —
                    // and stay out of tiles that don't include Air Duct.
                    const ductOnly = (i: InternalItem) => /with duct only/i.test(i.condition ?? '');
                    const items = (catalog ?? [])
                      .filter((c) => !c.estimate && (c.name === cat || cat === 'Air Duct'))
                      .flatMap((c) => c.items.filter((i) => (c.name === cat ? !ductOnly(i) || cat === 'Air Duct' : ductOnly(i))))
                      .filter((i) => !HIDE.test(i.name));
                    if (!items.length) return null;
                    return (
                      <div key={cat}>
                        {t.cats!.length > 1 && (
                          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-300">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 text-slate-200"><Icon d={P[meta.icon]} cls="h-3.5 w-3.5" /></span>
                            {lang === 'en' ? meta.en : meta.fr}
                          </p>
                        )}
                        <div className={`grid grid-cols-1 content-start gap-2 ${t.cats!.length === 1 ? 'sm:grid-cols-2' : ''}`}>
                          {items.map((i) => {
                            const on = !!extras[i.id];
                            const inf = infoOf(i.name);
                            return (
                              <div key={i.id}>
                              <button onClick={() => toggleExtra(i)}
                                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all duration-150 ${
                                  on
                                    ? 'bg-sky-500/15 ring-2 ring-sky-400 shadow-md shadow-sky-500/10'
                                    : 'bg-white/5 ring-1 ring-white/10 hover:-translate-y-px hover:bg-white/10 hover:ring-sky-400/40'
                                }`}>
                                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${on ? 'bg-gradient-to-br from-sky-400 to-blue-500 text-white shadow-sm' : 'bg-white/10 text-slate-200'}`}>{rowIcon(i.name, 'h-[18px] w-[18px]')}</span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-xs font-bold leading-tight text-white">{i.name}</span>
                                  {i.condition && <span className="block truncate text-[10px] leading-tight text-slate-400">{i.condition}</span>}
                                </span>
                                <span className={`shrink-0 rounded-lg px-2 py-1 text-right text-xs font-bold tabular-nums ${on ? 'bg-sky-400/20 text-sky-200' : 'bg-white/5 text-slate-200'}`}>
                                  {commercial ? (lang === 'en' ? 'quote' : 'soumission')
                                    : i.labels?.length ? i.labels.map((l) => `${l.label} ${l.price}`).join(' · ')
                                    // split cells pick their with/alone figure silently from the cart
                                    : i.priceWith && withOther(i) ? i.priceWith
                                    : i.price ?? '—'}
                                </span>
                                {on && <Check className="h-3.5 w-3.5 shrink-0 text-sky-400" strokeWidth={3} />}
                              </button>
                              {/* phone: the info reveals right under the selected row */}
                              {on && inf && (
                                <div className="mt-2 overflow-hidden rounded-xl bg-white/5 ring-1 ring-sky-400/30 lg:hidden">
                                  {inf.image && <img src={inf.image} alt={i.name} className="h-32 w-full object-cover" loading="lazy" />}
                                  <p className="p-3 text-xs leading-relaxed text-slate-300">{lang === 'en' ? inf.description.en : inf.description.fr}</p>
                                </div>
                              )}
                              </div>
                            );
                          })}
                        </div>
                        {/* standalone wall unit → the classic height question */}
                        {cat === 'A/C' && wallAlone && !commercial && (
                          <div className="mt-3 rounded-xl bg-white/5 p-3.5 ring-1 ring-white/10">
                            <p className="text-xs font-bold text-white">
                              {lang === 'en'
                                ? 'How many wall-mounted units does the home have? Select by indoor unit height:'
                                : 'Combien d’unités murales cette maison possède-t-elle? Sélectionnez selon la hauteur de l’unité intérieure :'}
                            </p>
                            <div className="mt-2 space-y-2">
                              {WALL_TIERS.map((tr) => (
                                <div key={tr.k} className="flex items-center justify-between gap-3">
                                  <span className="text-xs font-semibold text-slate-300">
                                    {lang === 'en' ? tr.en : tr.fr} <span className="text-sky-300">({fmt(wallBase + tr.add)})</span>
                                  </span>
                                  <span className="flex items-center gap-2">
                                    <button
                                      onClick={() => setWallUnits((prev) => {
                                        const next = { ...prev, [tr.k]: Math.max(0, prev[tr.k] - 1) };
                                        return next.u8 + next.m12 + next.o12 >= 1 ? next : prev;
                                      })}
                                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-sm font-bold text-white hover:bg-white/20">−</button>
                                    <span className="w-7 text-center text-sm font-bold tabular-nums text-white">{wallUnits[tr.k]}</span>
                                    <button
                                      onClick={() => setWallUnits((prev) => ({ ...prev, [tr.k]: prev[tr.k] + 1 }))}
                                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-sm font-bold text-white hover:bg-white/20">+</button>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  </div>
                  ))}
                </div>
              </section>
            ))}

            {/* "With Duct" companion on a tile without the packages strip →
                the duct-package picker reveals down here. */}
            {pkgStripBelow && (
              <section className={`rounded-2xl ${CARD} p-4 sm:p-5`}>
                <h3 className="mb-3 flex items-center gap-2.5">
                  <span className="rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 p-1.5 text-white shadow-sm"><Icon d={P.box} cls="h-4 w-4" /></span>
                  <span className="text-sm font-bold uppercase tracking-wider text-white">{lang === 'en' ? 'Select a duct package with this' : 'Choisissez un forfait de conduits avec ceci'}</span>
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {DUCT_PACKAGES.map((p) => {
                    const on = ductPkg === p.id;
                    return (
                      <button key={p.id} onClick={() => setDuctPkg(on ? null : p.id)}
                        className={`rounded-2xl p-4 text-left transition-all duration-200 ${
                          on
                            ? 'bg-gradient-to-br from-sky-500/25 to-blue-600/10 ring-2 ring-sky-400 shadow-lg shadow-sky-500/10'
                            : 'bg-white/5 ring-1 ring-white/10 hover:-translate-y-0.5 hover:bg-white/10 hover:ring-sky-400/50'
                        }`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-white">{lang === 'en' ? p.name.en : p.name.fr}</p>
                          <span className="flex items-center gap-1.5">
                            <span role="button" title={lang === 'en' ? 'Package details' : 'Détails du forfait'}
                              onClick={(e) => { e.stopPropagation(); setInfoPkg({ id: p.id, y: e.clientY }); }}
                              className="relative flex h-5 w-5 shrink-0">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-40" style={{ animationDuration: '2.2s' }} />
                              <Info className="relative h-5 w-5 text-sky-300 transition-colors hover:text-white" />
                            </span>
                            {on && <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-400 text-[#0c2137]"><Check className="h-3.5 w-3.5" strokeWidth={3.5} /></span>}
                          </span>
                        </div>
                        <p className="mt-1 text-xl font-extrabold tabular-nums text-white">
                          {fmt(p.price)}
                          <span className="ml-1 text-[10px] font-semibold text-slate-400">{lang === 'en' ? '+ vents' : '+ bouches'}</span>
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Job details — the tool's Questions for the cart's categories;
                answers can auto-add services to the quote (mirrors internal). */}
            {!commercial && visibleQs.length > 0 && (
              <section className={`rounded-2xl ${CARD} p-4 sm:p-5`}>
                <h3 className="mb-3 flex items-center gap-2.5">
                  <span className="rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 p-1.5 text-white shadow-sm"><Icon d={P.home} cls="h-4 w-4" /></span>
                  <span className="text-sm font-bold uppercase tracking-wider text-white">{lang === 'en' ? 'Job details' : 'Détails de la tâche'}</span>
                </h3>
                <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
                  {visibleQs.map((q) => {
                    const wide = q.options.length > 3;
                    return (
                      <div key={q.id} className={wide ? 'md:col-span-2' : ''}>
                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">{biText(q.question, lang === 'fr')}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {q.options.map((o, i) => {
                            const on = qa[q.id] === i;
                            return (
                              <button key={i}
                                onClick={() => setQa((prev) => { const n = { ...prev }; if (on) delete n[q.id]; else n[q.id] = i; return n; })}
                                title={on ? (lang === 'en' ? 'Click again to clear' : 'Cliquez encore pour effacer') : undefined}
                                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                                  on
                                    ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/20'
                                    : 'bg-white/5 text-slate-200 ring-1 ring-white/10 hover:bg-white/10 hover:ring-sky-400/50'
                                }`}>
                                {biText(o.label, lang === 'fr')}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* free-estimate picks */}
            {estimatePicks.map((t) => (
              <section key={t.key} className={`rounded-2xl ${CARD} p-4 sm:p-5`}>
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-sky-400">
                  <Icon d={P[t.icon]} cls="h-4 w-4" /> {lang === 'en' ? t.en : t.fr}
                  <span className="rounded-full bg-pink-500/20 px-2 py-0.5 text-[10px] font-bold normal-case tracking-normal text-pink-300">{lang === 'en' ? 'Free estimate' : 'Estimation gratuite'}</span>
                </h3>
                <p className="mt-1.5 text-sm text-slate-300">{lang === 'en' ? "We'll come take a look — no charge, no obligation. Pick a time at the next step." : 'Nous viendrons évaluer — sans frais, sans obligation. Choisissez une plage à l’étape suivante.'}</p>
              </section>
            ))}

            {hvacPicked && (
              <section>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-sky-400">
                  <Icon d={P.wrench} cls="h-4 w-4" /> HVAC — {hvacPicks.map((t) => (lang === 'en' ? t.en : t.fr)).join(', ')}
                </h3>
                <HvacMini
                  leadEventId={leadEventId}
                  dnum={DNUM || undefined}
                  leadInfo={leadSnapshot()}
                  prefill={{ name: `${firstName.trim()} ${lastName.trim()}`.trim(), phone, email, street, city, zip, details: message }}
                  initialMode={hvacPicks.some((t) => t.key.includes('repair')) && !hvacPicks.some((t) => !t.key.includes('repair')) ? 'repair' : 'estimate'}
                  allowedModes={[
                    ...(hvacPicks.some((t) => !t.key.includes('repair')) ? ['estimate' as const] : []),
                    ...(hvacPicks.some((t) => t.key.includes('repair')) ? ['repair' as const, 'maintenance' as const] : []),
                  ]}
                  picks={hvacPicks.map((t) => (lang === 'en' ? t.en : t.fr))}
                />
                {(catPicks.length > 0 || estimatePicks.length > 0) && (
                  <p className="mt-1.5 text-[11px] text-slate-400">{lang === 'en' ? 'HVAC books separately above — your other services continue.' : 'Le CVC se réserve séparément — vos autres services continuent.'}</p>
                )}
              </section>
            )}
          </div>
        )}

        {/* ── 4 · TIME & BOOK ── */}
        {/* ── 4 · TIME: classic layout — mini calendar + day cards ── */}
        {step === slotStep && (() => {
          // Only the BEST (green) windows — low extra driving or a 1st-book
          // day, the internal tool's full rulebook. Plain open slots appear
          // only when not a single green exists (never brick the booking).
          const greens = (slots ?? []).filter((sl) => sl.quality === 'green');
          const offered = greens.length ? greens : (slots ?? []);
          const byDate = offered.reduce<Record<string, GreenSlot[]>>((m, sl) => { (m[sl.date] = m[sl.date] || []).push(sl); return m; }, {});
          const dates = Object.keys(byDate).sort();
          const month = calMonth ?? dates[0]?.slice(0, 7) ?? new Date().toISOString().slice(0, 7);
          const [my, mm] = month.split('-').map(Number);
          const first = new Date(my, mm - 1, 1);
          const daysInMonth = new Date(my, mm, 0).getDate();
          const lead = first.getDay();
          const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)];
          const todayIso = new Date().toLocaleDateString('en-CA');
          const shiftMonth = (n: number) => { const d = new Date(my, mm - 1 + n, 1); setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); };
          const monthLabel = first.toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', { month: 'long', year: 'numeric' });
          const dows = lang === 'fr' ? ['DI', 'LU', 'MA', 'ME', 'JE', 'VE', 'SA'] : ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
          return (
            <div>
              <h2 className="mb-4 text-xl font-bold text-white">{lang === 'en' ? '4. Select an Available Appointment' : '4. Choisissez un rendez-vous disponible'}</h2>
              {slotsLoading ? (
                <p className={`rounded-2xl ${CARD} py-10 text-center text-sm text-slate-400`}>{lang === 'en' ? 'Finding the best windows…' : 'Recherche des plages…'}</p>
              ) : !slots || slots.length === 0 ? (
                <p className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-3.5 py-2.5 text-sm text-amber-300">
                  {lang === 'en' ? <>No openings found — call <span className="font-bold">{brand.phoneDisplay}</span>.</> : <>Aucune plage — appelez le <span className="font-bold">{brand.phoneDisplay}</span>.</>}
                </p>
              ) : (
                <div className="flex flex-col gap-4 md:flex-row md:items-start">
                  {/* mini month calendar */}
                  <div className={`w-full shrink-0 rounded-2xl ${CARD} p-4 md:w-64`}>
                    <div className="mb-2 flex items-center justify-between">
                      <button onClick={() => shiftMonth(-1)} className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"><ChevronLeft className="h-4 w-4" /></button>
                      <p className="text-sm font-bold text-white">{monthLabel}</p>
                      <button onClick={() => shiftMonth(1)} className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"><ChevronRight className="h-4 w-4" /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {dows.map((d) => <span key={d} className="text-[9px] font-bold tracking-wide text-slate-500">{d}</span>)}
                      {cells.map((d, i) => {
                        if (!d) return <span key={`x${i}`} />;
                        const has = !!byDate[d];
                        const isToday = d === todayIso;
                        const isSel = slot?.date === d;
                        return (
                          <button
                            key={d}
                            disabled={!has}
                            onClick={() => document.getElementById(`day-${d}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                            className={`rounded-md py-1 text-xs font-semibold ${
                              isSel ? 'bg-sky-500 text-white'
                              : has ? 'text-white hover:bg-white/10'
                              : isToday ? 'text-red-400'
                              : 'text-slate-600'
                            }`}
                          >
                            {Number(d.slice(8))}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* day cards */}
                  <div className="max-h-[520px] min-w-0 flex-1 space-y-3 overflow-y-auto pr-1">
                    {dates.map((d) => (
                      <div key={d} id={`day-${d}`} className={`rounded-2xl ${CARD} p-4 scroll-mt-2`}>
                        <div className="mb-3 flex items-center gap-2">
                          <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-slate-300">
                            {new Date(d + 'T12:00:00').toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', { weekday: 'short' }).toUpperCase()}
                          </span>
                          <p className="text-sm font-bold text-white">
                            {new Date(d + 'T12:00:00').toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                          </p>
                          <span className="ml-auto text-[10px] font-bold tracking-wider text-slate-500">{lang === 'en' ? 'STANDARD SLOTS' : 'PLAGES STANDARDS'}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {byDate[d].map((sl) => {
                            const on = slot?.start === sl.start && slot?.date === sl.date;
                            return (
                              <button key={sl.start} onClick={() => setSlot(on ? null : sl)}
                                className={`rounded-lg px-2 py-2.5 text-sm font-semibold transition ${
                                  on ? 'bg-sky-500 text-white'
                                  : sl.quality === 'green' ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/40 hover:bg-emerald-500/20'
                                  : 'bg-white/5 text-slate-200 ring-1 ring-white/10 hover:bg-white/10'
                                }`}>
                                {sl.label.split(' - ')[0]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {bookState === 'error' && <p className="mt-3 rounded-xl border border-red-400/40 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">⚠ {bookError}</p>}
            </div>
          );
        })()}
        </div>

        {/* ── Service Summary (the classic white card) ── */}
        {step >= 3 && (
          <div className="w-full shrink-0 space-y-4 lg:sticky lg:top-4 lg:w-80">
          <aside className="w-full rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="mb-3 border-b border-gray-200 pb-3 text-base font-bold text-slate-900">{lang === 'en' ? 'Service Summary' : 'Résumé du service'}</h3>
            {pkgPicked ? (
              <div className="mb-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-bold uppercase tracking-wide text-blue-800">{lang === 'en' ? pkgPicked.name.en : pkgPicked.name.fr}{furnaces > 1 ? ` × ${furnaces}` : ''}</span>
                  <span className="text-sm font-bold text-slate-900">{fmt(commercial ? 0 : pkgPicked.price * furnaces)}</span>
                </div>
                <ul className="mt-2 space-y-1">
                  {pkgPicked.includes.map((inc, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
                      {lang === 'en' ? inc.en : inc.fr}
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex items-baseline justify-between text-xs">
                  <span className="text-slate-500">· {lang === 'en' ? 'Vents' : 'Bouches'}</span>
                  <span className="font-bold text-blue-700">
                    {ventMode === 'known'
                      ? `${ventCount}${extraVents > 0 ? ` (${extraVents} ${lang === 'en' ? 'extra' : 'suppl.'} × ${fmt(extraVentPrice)})` : lang === 'en' ? ' (included)' : ' (incluses)'}`
                      : lang === 'en' ? 'Plus Vents (TBD)' : 'Plus bouches (à confirmer)'}
                  </span>
                </div>
              </div>
            ) : null}
            {hvacPicked && (
              <div className="mb-3 rounded-lg bg-sky-50 px-3 py-2.5">
                <p className="text-xs font-bold uppercase tracking-wide text-sky-800">HVAC — {lang === 'en' ? 'books separately' : 'réservé séparément'}</p>
                <p className="mt-0.5 text-xs text-slate-600">{hvacPicks.map((t) => (lang === 'en' ? t.en : t.fr)).join(' · ')}</p>
                <p className="mt-0.5 text-[11px] font-semibold text-sky-700">
                  {hvacPicks.some((t) => t.key.includes('repair'))
                    ? (lang === 'en' ? 'Repair/maintenance visit — $169 dispatch fee on the HVAC invoice' : 'Visite de réparation/entretien — 169 $ de frais de déplacement')
                    : (lang === 'en' ? 'Free on-site estimate' : 'Estimation gratuite sur place')}
                </p>
              </div>
            )}
            {estimatesOnly && travel && travel.amount > 0 && (
              <p className="mb-2 text-[11px] text-slate-500">{lang === 'en' ? `Travel charge ${travel.charge} (${travel.fsa}) noted for the estimate — not billed.` : `Frais de déplacement ${travel.charge} (${travel.fsa}) notés pour l’estimation — non facturés.`}</p>
            )}
            {summaryLines.filter((l) => !pkgPicked || !l.label.startsWith(lang === 'en' ? pkgPicked.name.en : pkgPicked.name.fr)).map((l, i) => (
              <div key={i} className="flex justify-between py-0.5 text-sm text-slate-700">
                <span className="pr-2">{l.label}</span>
                <span className="font-medium tabular-nums">{fmt(l.amount)}</span>
              </div>
            ))}
            <div className="mt-3 border-t border-gray-200 pt-3">
              {!hvacOnly && <>
                <div className="flex justify-between text-sm text-slate-500"><span>{lang === 'en' ? 'Subtotal' : 'Sous-total'}</span><span className="tabular-nums">{fmt(total)}</span></div>
                {taxLines.map((tl) => (
                  <div key={tl.label} className="flex justify-between text-sm text-slate-500"><span>{tl.label}</span><span className="tabular-nums">{fmt(tl.amount)}</span></div>
                ))}
                <p className="mt-3 mb-1 text-sm font-bold text-slate-800">{lang === 'en' ? 'Coupon Code' : 'Code promo'}</p>
                <div className="flex gap-2">
                  <input value={coupon} onChange={(e) => setCoupon(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400" />
                  <button className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">{lang === 'en' ? 'Apply' : 'Appliquer'}</button>
                </div>
              </>}
              <div className="mt-3 flex items-baseline justify-between border-t border-gray-200 pt-3">
                <span className="text-base font-bold text-blue-800">Total</span>
                <span className="text-xl font-bold text-blue-800 tabular-nums">{estimatesOnly || hvacOnly ? (lang === 'en' ? 'Free' : 'Gratuit') : fmt(grandTotal)}</span>
              </div>
            </div>
          </aside>

          {/* desktop: info about the last-selected service, under the summary */}
          {step === 3 && infoRow && (() => {
            const inf = infoOf(infoRow.name);
            if (!inf) return null;
            return (
              <div className={`hidden overflow-hidden rounded-2xl ${CARD} ring-1 ring-white/10 lg:block`}>
                {inf.image && <img src={inf.image} alt={infoRow.name} className="h-36 w-full object-cover" loading="lazy" />}
                <div className="p-4">
                  <p className="text-sm font-bold text-white">{infoRow.name}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{lang === 'en' ? inf.description.en : inf.description.fr}</p>
                </div>
              </div>
            );
          })()}
          </div>
        )}
        </div>

        {/* universal trust strip — every step (the packages' "why choose") */}
        <div className="mt-8 border-t border-white/10 pt-4">
          <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">{lang === 'en' ? 'Why choose 1 Clean Air' : 'Pourquoi choisir 1 Clean Air'}</p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5">
            {([
              { en: 'Over 35 years of experience', fr: 'Plus de 35 ans d’expérience' },
              { en: 'NADCA-certified technicians', fr: 'Techniciens certifiés NADCA' },
              { en: 'Award-winning company – Consumer Choice Award', fr: 'Entreprise primée – Prix du choix des consommateurs' },
              { en: '30-day satisfaction guarantee', fr: 'Garantie de satisfaction 30 jours' },
            ]).map((w, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 text-xs text-slate-300">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                {lang === 'en' ? w.en : w.fr}
              </span>
            ))}
          </div>
        </div>
      </main>

      {/* ── package-details modal (image + includes, the classic view) ── */}
      {(() => {
        const p = infoPkg ? DUCT_PACKAGES.find((x) => x.id === infoPkg.id) : null;
        if (!p) return null;
        return (
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={() => setInfoPkg(null)}>
            <div className="absolute left-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 overflow-y-auto rounded-2xl bg-[#15304f] shadow-2xl ring-1 ring-white/10" style={{ top: Math.max(8, infoPkg!.y - 48), maxHeight: 560 }} onClick={(e) => e.stopPropagation()}>
              {p.image && <img src={p.image} alt={lang === 'en' ? p.name.en : p.name.fr} className="h-44 w-full rounded-t-2xl object-cover" />}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-bold text-white">{lang === 'en' ? p.name.en : p.name.fr}</h4>
                    {p.subtitle && <p className="mt-0.5 text-xs font-semibold text-sky-400">{lang === 'en' ? p.subtitle.en : p.subtitle.fr}</p>}
                  </div>
                  <p className="shrink-0 text-2xl font-extrabold tabular-nums text-white">
                    {fmt(p.price)}
                    <span className="ml-1 text-[10px] font-semibold text-slate-400">{lang === 'en' ? '+ vents' : '+ bouches'}</span>
                  </p>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{lang === 'en' ? p.description.en : p.description.fr}</p>
                <p className="mt-4 text-xs font-bold uppercase tracking-widest text-white">{lang === 'en' ? 'Package includes:' : 'Le forfait comprend :'}</p>
                <div className="mt-2 grid gap-x-5 gap-y-1.5 sm:grid-cols-2">
                  {p.includes.map((inc, i) => (
                    <span key={i} className="flex items-start gap-1.5 text-xs text-slate-200">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      {lang === 'en' ? inc.en : inc.fr}
                    </span>
                  ))}
                </div>
                <div className="mt-5 flex gap-2">
                  <button onClick={() => { setDuctPkg(p.id); setInfoPkg(null); }}
                    className="flex-1 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-sky-400">
                    {ductPkg === p.id ? (lang === 'en' ? 'Selected ✓' : 'Sélectionné ✓') : (lang === 'en' ? 'Select this package' : 'Choisir ce forfait')}
                  </button>
                  <button onClick={() => setInfoPkg(null)}
                    className="rounded-xl bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-200 ring-1 ring-white/10 transition hover:bg-white/10">
                    {lang === 'en' ? 'Close' : 'Fermer'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── sticky action bar (dark) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#0a1c30]/95 backdrop-blur">
        {step === 3 && companionBlock && (
          <div className="border-b border-amber-400/30 bg-amber-500/10">
            <p className="mx-auto max-w-6xl px-4 py-2 text-xs font-semibold text-amber-300 sm:px-6">⚠ {companionBlock}</p>
          </div>
        )}
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total</p>
            <p className="text-lg font-bold text-white sm:text-2xl">{estimatesOnly || hvacOnly ? (lang === 'en' ? 'Free estimate' : 'Estimation gratuite') : fmt(grandTotal)}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {step > 3 && (
              <button onClick={() => setStep((s) => (s - 1) as StepN)}
                className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10 sm:px-6 sm:py-3">
                {lang === 'en' ? 'Back' : 'Retour'}
              </button>
            )}
            {!(step === 3 && hvacOnly) && (() => {
              const atBook = step === slotStep;
              const blocked = (atBook ? slot === null : step === 3 ? !canNext3 : !canNext) || bookState === 'loading';
              return <button
              onClick={() => { if (step === slotStep) { book(); return; } setStep((s) => (s + 1) as StepN); }}
              disabled={blocked}
              className={`flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold transition-colors sm:px-8 sm:py-3 ${
                blocked
                  ? 'cursor-not-allowed bg-white/10 text-slate-500'
                  : atBook
                  ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                  : 'bg-sky-500 text-white hover:bg-sky-400'
              }`}
            >
              {atBook
                ? (bookState === 'loading' ? (lang === 'en' ? 'Booking…' : 'Réservation…') : (lang === 'en' ? 'Book now' : 'Réserver'))
                : (lang === 'en' ? 'Next' : 'Suivant')}
              {!atBook && <span>→</span>}
            </button>;
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
