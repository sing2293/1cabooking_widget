import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, CheckCircle2, Home, Building2, Flame, Sparkles, Wind, Shirt, Snowflake, Sofa, Layers, Shield, Biohazard, Wrench, ThermometerSun, Heater, Droplets, Fan, Replace, Factory, SprayCan, BrickWall, Truck, Phone, Mail, Paperclip, X, MapPin, User, CalendarDays, ClipboardCheck, PackagePlus, CalendarCheck, AirVent, Thermometer, type LucideIcon } from 'lucide-react';
import HvacMini, { type HvacMode } from './components/step1/HvacMini';
import AddressAutocomplete, { type AddressParts } from './components/step3/AddressAutocomplete';
import SlotPicker from './components/SlotPicker';
import { HOW_DID_YOU_HEAR, PROVINCE_TAXES } from './data/step3Options';
import { useLang } from './context/LanguageContext';
import { brand } from './brand';
import { SERVICES } from './data/services';
import { useInternalCatalog, useInternalQuestions, biText, priceNumOf, INTERNAL_URL, type InternalItem } from './data/internalCatalog';
import { regionOfAddress, accountForRegion } from './data/regionAccount';
import { fetchGreenSlots, type GreenSlot } from './greenSlots';
import { CARPET_GROUP_MINS, AREA_RUG_MIN, RUG_RATES } from './data/extras';

/* ── /new — the QUESTION-BASED customer flow (Anuj 2026-08-24) ──
   Built for someone who doesn't know HVAC terms or what they need: the info
   form first (address → region → real slots), then Residential / Commercial,
   then Heating & Cooling / Cleaning, then a short list of plain services,
   then plain-language questions that pick the right package or item. No
   catalog is ever shown; prices appear on the duct recommendation (as
   designed) and itemized on the final Review after the time slot is chosen.
   Wired to the same machinery as the main funnel: journey visit/lead
   (Slack + Pipedrive), the internal tool's green slots, SM/ST booking. */

type Sector = 'residential' | 'commercial';
type Category = 'hc' | 'cleaning' | 'other';
type Stage = 'where' | 'oos' | 'oosdone' | 'info' | 'sector' | 'category' | 'service' | 'hvac' | 'quest' | 'recommend' | 'addons' | 'slots' | 'review' | 'done';
type PkgId = 'basic' | 'preferred' | 'healthy-home';
type Bi = { en: string; fr: string };

const PAGE = 'bg-slate-100';
const CARD = 'bg-white ring-1 ring-slate-200';
const PILL = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-500 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/25';
const CHIP_ON = 'border-sky-600 bg-sky-50 text-sky-900 ring-1 ring-sky-600';
const CHIP = 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50';
/* step footer — sticks to the bottom of the screen on tall steps (Anuj) */
const FOOT = 'sticky bottom-0 z-10 -mx-4 mt-6 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6';
const LBL = 'mb-1 block text-sm font-semibold text-slate-800';
const BACK_BTN = 'rounded-md bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200';

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

const DUCT_PACKAGES = SERVICES.find((s) => s.id === 'central-air')?.packages ?? [];

/* ── services per sector/category — plain names, no catalog ── */
interface Svc {
  key: string; en: string; fr: string;
  /** ST HVAC flow; repair=true unlocks Repair / Maintenance modes */
  hvac?: boolean; repair?: boolean;
  /** SM free-estimate item (booked on the estimate trucks) */
  estimate?: string;
  /** Slack/Pipedrive routing bucket */
  dealType: 'Cleaning' | 'HVAC' | 'Insulation' | 'Aeroseal' | 'Mold';
}
const HC_RES: Svc[] = [
];
const CLEAN_RES: Svc[] = [
  { key: 'airduct', en: 'Air Duct Cleaning', fr: 'Nettoyage de conduits d’air', dealType: 'Cleaning' },
  { key: 'dryer', en: 'Dryer Vent Cleaning', fr: 'Nettoyage du conduit de sécheuse', dealType: 'Cleaning' },
  { key: 'wallac', en: 'Wall AC / Mini-Split Cleaning', fr: 'Nettoyage de climatiseur mural', dealType: 'Cleaning' },
  { key: 'carpet', en: 'Carpet, Rug & Upholstery', fr: 'Tapis, carpettes et rembourrage', dealType: 'Cleaning' },
];
/* Commercial / industrial always quotes as a FREE on-site estimate (internal rule). */
interface Q { id: string; q: Bi; opts: Bi[] }
const HC_COM: Svc[] = [];
/* Insulation / Aeroseal / Mold sit on the "What do you need help with?" row for
   BOTH sectors (Anuj) — a tap goes straight to that service. */
const OTHER_RES: Svc[] = [
  { key: 'insulation', en: 'Insulation', fr: 'Isolation', estimate: 'Attic Insulation Estimate', dealType: 'Insulation' },
  { key: 'aeroseal', en: 'Aeroseal Duct Sealing', fr: 'Scellement Aeroseal', estimate: 'Aeroseal Estimate', dealType: 'Aeroseal' },
  { key: 'mold', en: 'Mold Remediation', fr: 'Moisissure', estimate: 'Mold Inspection', dealType: 'Mold' },
];
const OTHER_COM: Svc[] = [
  { key: 'c-insulation', en: 'Insulation', fr: 'Isolation', estimate: 'Commercial Insulation', dealType: 'Insulation' },
  { key: 'c-aeroseal', en: 'Aeroseal Duct Sealing', fr: 'Scellement Aeroseal', estimate: 'Commercial Aeroseal', dealType: 'Aeroseal' },
  { key: 'c-mold', en: 'Mold Remediation', fr: 'Moisissure', estimate: 'Commercial Mold Remediation', dealType: 'Mold' },
];

/* Heating & Cooling asks two questions instead of listing ten tiles (Anuj):
   what do you need (new / not working / maintenance) → which equipment. */
type HvacIntent = 'new' | 'repair' | 'maint';
const HVAC_INTENTS: { key: HvacIntent; en: string; fr: string; mode: 'estimate' | 'repair' | 'maintenance'; icon: LucideIcon }[] = [
  { key: 'new', en: 'I need new equipment', fr: 'J’ai besoin d’un nouvel équipement', mode: 'estimate', icon: PackagePlus },
  { key: 'repair', en: 'My equipment isn’t working', fr: 'Mon équipement ne fonctionne pas', mode: 'repair', icon: Wrench },
  { key: 'maint', en: 'My equipment needs maintenance', fr: 'Mon équipement a besoin d’entretien', mode: 'maintenance', icon: CalendarCheck },
];
const HVAC_EQUIP: { key: string; en: string; fr: string; installOnly?: boolean; icon: LucideIcon; clean?: boolean }[] = [
  { key: 'ac', en: 'Air Conditioner', fr: 'Climatiseur', icon: Snowflake },
  { key: 'furnace', en: 'Furnace', fr: 'Fournaise', icon: Flame },
  { key: 'heatpump', en: 'Heat Pump', fr: 'Thermopompe', icon: ThermometerSun },
  { key: 'ductless', en: 'Ductless / Mini-Split', fr: 'Sans conduit / mini-split', icon: Fan },
  { key: 'boiler', en: 'Boiler', fr: 'Chaudière', icon: Heater },
  { key: 'water-heater', en: 'Water Heater', fr: 'Chauffe-eau', icon: Droplets },
  { key: 'thermostat', en: 'Thermostat', fr: 'Thermostat', icon: Thermometer },
  { key: 'duct-replace', en: 'Duct Replacement', fr: 'Remplacement de conduits', installOnly: true, icon: AirVent },
  /* Wall AC cleaning sits with Heating & Cooling (Anuj) but is a CLEANING job — booked in SM via its own questions */
  { key: 'wallac', en: 'Wall AC / Mini-Split Cleaning', fr: 'Nettoyage climatiseur mural', icon: Snowflake, clean: true },
];
/* two more HVAC questions (Anuj) — asked with the equipment, ride in the notes */
const HVAC_QS: Q[] = [
  { id: 'hvac-working', q: { en: 'Is your heating/cooling system working properly at this time?', fr: 'Votre système de chauffage/climatisation fonctionne-t-il correctement en ce moment?' }, opts: [{ en: 'Yes', fr: 'Oui' }, { en: 'No', fr: 'Non' }] },
  { id: 'hvac-age', q: { en: 'What is the approximate age of your system?', fr: 'Quel est l’âge approximatif de votre système?' }, opts: [{ en: 'Less than 5 years old', fr: 'Moins de 5 ans' }, { en: '6 to 9 years old', fr: '6 à 9 ans' }, { en: '10 to 15 years old', fr: '10 à 15 ans' }, { en: 'Over 15 years old', fr: 'Plus de 15 ans' }, { en: 'Not sure', fr: 'Pas certain' }] },
];
/* Same 11 services as the classic commercial list (Anuj), same order and names. */
const CLEAN_COM: Svc[] = [
  { key: 'c-adc', en: 'Commercial Air Duct Cleaning', fr: 'Conduits commerciaux', estimate: 'Commercial Air Duct Cleaning', dealType: 'Cleaning' },
  { key: 'c-highrise', en: 'High Rise Building Air Duct Cleaning', fr: 'Tour d’habitation', estimate: 'High Rise Building Air Duct Cleaning', dealType: 'Cleaning' },
  { key: 'c-dust', en: 'Commercial Dust Cleaning', fr: 'Dépoussiérage commercial', estimate: 'Commercial Dust Cleaning', dealType: 'Cleaning' },
  { key: 'c-dryer', en: 'Dryer Vent Cleaning', fr: 'Conduits de sécheuse', estimate: 'Commercial Dryer Vent Cleaning - (INT)', dealType: 'Cleaning' },
  { key: 'c-exhaust', en: 'Industrial Plant Exhaust Cleaning', fr: 'Évacuation industrielle', estimate: 'Industrial Plant Exhaust Cleaning', dealType: 'Cleaning' },
  { key: 'c-deep', en: 'Industrial Plant Deep Cleaning', fr: 'Nettoyage industriel', estimate: 'Industrial Plant Deep Cleaning', dealType: 'Cleaning' },
  { key: 'c-wall', en: 'Industrial Wall Cleaning', fr: 'Murs industriels', estimate: 'Industrial Wall Cleaning', dealType: 'Cleaning' },
  { key: 'c-carpet', en: 'Commercial Carpet Cleaning', fr: 'Tapis commerciaux', estimate: 'Commercial Carpet Cleaning - (INT)', dealType: 'Cleaning' },
];

/* ── the Air Duct questions (Anuj's table) ── */
const DUCT_QS: Q[] = [
  { id: 'last', q: { en: 'When were your ducts last professionally cleaned?', fr: 'Quand vos conduits ont-ils été nettoyés par un professionnel?' },
    opts: [{ en: 'Less than 2 years', fr: 'Moins de 2 ans' }, { en: '2–5 years', fr: '2 à 5 ans' }, { en: '5+ years', fr: '5 ans et plus' }, { en: 'Never', fr: 'Jamais' }, { en: 'Not sure', fr: 'Pas certain' }] },
  { id: 'why', q: { en: 'What made you look into duct cleaning?', fr: 'Pourquoi pensez-vous au nettoyage de conduits?' },
    opts: [{ en: 'Dust', fr: 'Poussière' }, { en: 'Allergies', fr: 'Allergies' }, { en: 'Odours', fr: 'Odeurs' }, { en: 'Recent renovation', fr: 'Rénovation récente' }, { en: 'Pets', fr: 'Animaux' }, { en: 'Routine cleaning', fr: 'Entretien courant' }] },
  { id: 'pets', q: { en: 'Do you have pets in the home?', fr: 'Avez-vous des animaux à la maison?' }, opts: [{ en: 'Yes', fr: 'Oui' }, { en: 'No', fr: 'Non' }] },
  { id: 'reno', q: { en: 'Has the home recently been renovated?', fr: 'La maison a-t-elle été rénovée récemment?' }, opts: [{ en: 'Yes', fr: 'Oui' }, { en: 'No', fr: 'Non' }] },
  { id: 'dust', q: { en: 'Do you notice dust coming from your vents?', fr: 'Remarquez-vous de la poussière sortant des bouches?' }, opts: [{ en: 'Yes', fr: 'Oui' }, { en: 'No', fr: 'Non' }, { en: 'Not sure', fr: 'Pas certain' }] },
  { id: 'vents', q: { en: 'Approximately how many vents do you have?', fr: 'Environ combien de bouches avez-vous?' },
    opts: [{ en: '1–10', fr: '1 à 10' }, { en: '11–15', fr: '11 à 15' }, { en: '16–20', fr: '16 à 20' }, { en: '20+', fr: '20 et plus' }, { en: 'Not sure', fr: 'Pas certain' }, { en: 'I know the exact number', fr: 'Je connais le nombre exact' }] },
];
/* Recommendation (Anuj): routine + recently cleaned → Basic; 3–5+ years /
   dust / pets / heavier buildup → Performance; allergies / odours / heavy
   contamination → Healthy Home. */
function recommendPkg(a: Record<string, number>): { id: PkgId; why: Bi } {
  const why = a.why ?? -1;
  if (why === 1 || why === 2) {
    return { id: 'healthy-home', why: { en: 'Allergies or odours usually mean contamination inside the system — the complete treatment clears it.', fr: 'Allergies ou odeurs signifient souvent une contamination dans le système — le traitement complet la corrige.' } };
  }
  let score = 0;
  score += [0, 2, 3, 3, 1][a.last ?? 4] ?? 1;
  score += [2, 3, 3, 2, 2, 0][why] ?? 0;
  if (a.pets === 0) score += 1;
  if (a.reno === 0) score += 1;
  if (a.dust === 0) score += 1;
  if (score >= 3) {
    return { id: 'preferred', why: { en: 'Your home appears to need more than a standard maintenance cleaning.', fr: 'Votre maison semble avoir besoin de plus qu’un nettoyage d’entretien standard.' } };
  }
  return { id: 'basic', why: { en: 'A recently maintained system just needs a good standard cleaning.', fr: 'Un système entretenu récemment n’a besoin que d’un bon nettoyage standard.' } };
}
/* vents answer → approximate count (the final count is done on arrival) */
const VENT_COUNT = [10, 13, 18, 22, 0, 0]; // index 5 = exact number typed in

/* ── other plain questions (answers ride the notes; some price an item) ── */
const DRYER_LOCS: { key: string; re: RegExp; en: string; fr: string }[] = [
  { key: 'first', re: /dryer vent.*1st/i, en: 'Ground floor / basement', fr: 'Rez-de-chaussée / sous-sol' },
  { key: 'second', re: /dryer vent.*2nd/i, en: '2nd or 3rd floor', fr: '2e ou 3e étage' },
  { key: 'roof', re: /dryer vent.*roof/i, en: 'Through the roof', fr: 'Par le toit' },
  { key: 'condo', re: /dryer vent.*condo/i, en: 'Condo / apartment building', fr: 'Condo / immeuble' },
];
const WALL_TIERS: { k: 'u8' | 'm12' | 'o12'; en: string; fr: string; add: number }[] = [
  { k: 'u8', en: '8 feet and under', fr: '8 pieds et moins', add: 0 },
  { k: 'm12', en: 'Between 8 and 12 feet', fr: 'Entre 8 et 12 pieds', add: 50 },
  { k: 'o12', en: 'Over 12 feet', fr: 'Plus de 12 pieds', add: 100 },
];
const SOFT_QS: Record<string, Q> = {
  insulation: { id: 'soft', q: { en: 'Where do you think insulation is needed?', fr: 'Où pensez-vous que l’isolation est nécessaire?' }, opts: [{ en: 'Attic', fr: 'Grenier' }, { en: 'Walls', fr: 'Murs' }, { en: 'Basement', fr: 'Sous-sol' }, { en: 'Not sure — please advise', fr: 'Pas certain — conseillez-moi' }] },
  aeroseal: { id: 'soft', q: { en: 'What are you noticing?', fr: 'Que remarquez-vous?' }, opts: [{ en: 'Some rooms never get comfortable', fr: 'Certaines pièces ne sont jamais confortables' }, { en: 'High energy bills', fr: 'Factures d’énergie élevées' }, { en: 'Dust keeps coming back', fr: 'La poussière revient toujours' }, { en: 'Just curious about sealing', fr: 'Simplement curieux' }] },
  mold: { id: 'soft', q: { en: 'Where do you see or smell mold?', fr: 'Où voyez-vous ou sentez-vous la moisissure?' }, opts: [{ en: 'Attic', fr: 'Grenier' }, { en: 'Basement', fr: 'Sous-sol' }, { en: 'Bathroom / kitchen', fr: 'Salle de bain / cuisine' }, { en: 'Not sure — I smell it', fr: 'Pas certain — je la sens' }] },
  highdust: { id: 'soft', q: { en: 'What needs dusting?', fr: 'Que faut-il dépoussiérer?' }, opts: [{ en: 'High ceilings & beams', fr: 'Plafonds hauts et poutres' }, { en: 'Light fixtures & fans', fr: 'Luminaires et ventilateurs' }, { en: 'Whole house', fr: 'Toute la maison' }, { en: 'Other', fr: 'Autre' }] },
};
const softKey = (k: string) => k.replace(/^c-/, '').replace(/^dust$/, 'highdust').replace(/^adc$/, '');

/* every tile carries an icon (Anuj) */
const ICONS: Record<string, LucideIcon> = {
  airduct: Wind, adc: Wind, dryer: Shirt, wallac: Snowflake, carpet: Sofa, highdust: Sparkles, dust: Sparkles,
  insulation: Layers, aeroseal: Shield, mold: Biohazard,
  'hvac-install': Wrench, 'ac-install': Snowflake, 'ac-repair': Snowflake, 'furnace-install': Flame, 'furnace-repair': Flame,
  heatpump: ThermometerSun, boiler: Heater, 'water-heater': Droplets, minisplit: Fan, 'duct-replace': Replace,
  highrise: Building2, exhaust: Factory, deep: SprayCan, wall: BrickWall,
};
const iconFor = (key: string): LucideIcon => ICONS[key] ?? ICONS[key.replace(/^c-/, '')] ?? Sparkles;

/* Less text (Anuj): Basic lists everything; each higher package shows only
   what it ADDS over the one below — "Everything in Basic, plus…". */
const pkgDelta = (id: string): { base: Bi | null; adds: Bi[] } => {
  const idx = DUCT_PACKAGES.findIndex((p) => p.id === id);
  const p = DUCT_PACKAGES[idx];
  if (!p) return { base: null, adds: [] };
  if (idx === 0) return { base: null, adds: p.includes };
  const below = DUCT_PACKAGES[idx - 1];
  const norm = (x: string) => x.toLowerCase().replace(/furnace/g, '').replace(/[^a-z0-9]/g, '');
  const had = new Set(below.includes.map((i) => norm(i.en)));
  return { base: below.name, adds: p.includes.filter((i) => !had.has(norm(i.en))) };
};

/* Out-of-service-area lead form (Anuj): the address isn't in coverage, so
   we take the lead — name / phone / email, what they need, a message — and
   thank them. No booking. */
const OOS_SERVICES: { key: string; en: string; fr: string; icon: LucideIcon; deal: 'Cleaning' | 'HVAC' | 'Insulation' | 'Aeroseal' | 'Mold' }[] = [
  { key: 'airduct', en: 'Air Duct Cleaning', fr: 'Nettoyage de conduits', icon: Wind, deal: 'Cleaning' },
  { key: 'dryer', en: 'Dryer Vent Cleaning', fr: 'Conduit de sécheuse', icon: Shirt, deal: 'Cleaning' },
  { key: 'wallac', en: 'Wall AC / Mini-Split Cleaning', fr: 'Climatiseur mural', icon: Snowflake, deal: 'Cleaning' },
  { key: 'carpet', en: 'Carpet, Rug & Upholstery', fr: 'Tapis et rembourrage', icon: Sofa, deal: 'Cleaning' },
  { key: 'hvac', en: 'Heating & Cooling', fr: 'Chauffage et climatisation', icon: Flame, deal: 'HVAC' },
  { key: 'insulation', en: 'Insulation', fr: 'Isolation', icon: Layers, deal: 'Insulation' },
  { key: 'aeroseal', en: 'Aeroseal Duct Sealing', fr: 'Scellement Aeroseal', icon: Shield, deal: 'Aeroseal' },
  { key: 'mold', en: 'Mold Remediation', fr: 'Moisissure', icon: Biohazard, deal: 'Mold' },
];

/* Francis-style choice tile: icon in a bordered square, label underneath (Anuj) */
const IconTile = ({ icon: I, label, on, onClick, title, check }: { icon: LucideIcon; label: string; on: boolean; onClick: () => void; title?: string; check?: boolean }) => (
  <button type="button" onClick={onClick} title={title} className="group flex flex-col items-center gap-2">
    <span className={`nf-tile relative flex h-16 w-full items-center justify-center rounded-md border ${on ? 'border-sky-600 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-700 group-hover:border-sky-400 group-hover:bg-slate-50'}`}>
      <I className="h-7 w-7" strokeWidth={1.5} />
      {check && on && <span className="nf-pop absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-white"><Check className="h-3 w-3" strokeWidth={3.5} /></span>}
    </span>
    <span className={`text-center text-xs font-medium leading-tight ${on ? 'text-slate-900' : 'text-slate-600'}`}>{label}</span>
  </button>
);
const TILE_GRID = 'grid grid-cols-4 gap-2 sm:grid-cols-5 sm:gap-3';

/* Embedded in an iframe, scrollIntoView scrolls the HOST page and yanks the
   widget away (Anuj) — inside the frame we never auto-scroll; the frame grows
   and the visitor stays where they are. Standalone (/old2 previews) keeps it. */
const revealEl = (id: string) => { if (window.parent !== window) return; document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); };

const Money = ({ n }: { n: number }) => <span className="font-semibold tabular-nums">{fmt(n)}</span>;

export default function NewFlow() {
  const { lang, setLang } = useLang();
  const t = (b: Bi) => (lang === 'fr' ? b.fr : b.en);

  const [stage, setStage] = useState<Stage>('where');
  const [history, setHistory] = useState<Stage[]>([]);
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd');
  const [callOpen, setCallOpen] = useState(false);
  const go = (s: Stage) => { setDir('fwd'); setHistory((h) => [...h, stage]); setStage(s); if (window.parent !== window) window.parent.postMessage({ type: '1ca-widget-scroll-to-top' }, '*'); else window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const back = () => { const h = [...history]; const prev = h.pop(); if (prev) { setDir('back'); setHistory(h); setStage(prev); } };

  /* 1 · info (the first form — the address gives the region and the real slots) */
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [addrText, setAddrText] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');
  const [message, setMessage] = useState('');
  const [howHeard, setHowHeard] = useState('');
  const [agree, setAgree] = useState(false);   // owner / contact consent (required)
  const [smsOk, setSmsOk] = useState(false);   // text-message opt-in (optional; expands the disclosure)
  const [privacyOk, setPrivacyOk] = useState(false); // privacy-policy agreement on Review (required to book)
  const [oosSector, setOosSector] = useState<Sector | null>(null);
  const [oosPicks, setOosPicks] = useState<string[]>([]);
  const [oosHvacIntent, setOosHvacIntent] = useState<HvacIntent | null>(null);
  const [oosHvacEquip, setOosHvacEquip] = useState<string[]>([]);
  const [oosState, setOosState] = useState<'idle' | 'sending'>('idle');
  const oosSent = useRef(false);
  const [hl, setHl] = useState(false);
  const addressText = addrText || [street, city, zip].filter(Boolean).join(', ');
  const region = useMemo(() => regionOfAddress(addressText), [addressText]);
  /* A postal code alone is enough to check coverage on step 1 — but not to
     book: Review & book asks for the full street address (Anuj). */
  const [addrParts, setAddrParts] = useState<AddressParts | null>(null);
  const addressComplete = !!addrParts?.streetNumber && !!addrParts?.route && !!addrParts?.city && !!addrParts?.zip;
  const account = accountForRegion(region);
  const infoOk = firstName.trim() !== '' && lastName.trim() !== '' && phone.replace(/\D/g, '').length === 10
    && /\S+@\S+\.\S+/.test(email.trim()) && addressText.trim() !== '' && region !== null && agree;
  const miss = (bad: boolean) => (hl && bad ? ' ring-2 ring-rose-400' : '');

  /* 2–4 · sector → category → service */
  const [sector, setSector] = useState<Sector | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [svcKey, setSvcKey] = useState<string | null>(null);
  const [hvacIntent, setHvacIntent] = useState<HvacIntent | null>(null);
  const [hvacEquip, setHvacEquip] = useState<string[]>([]);
  /* HVAC attachments (Anuj — like the internal tool): up to 5 files, images
     downscaled in the browser so the request stays well under Vercel's limit. */
  const [files, setFiles] = useState<{ name: string; dataURI: string; size: number }[]>([]);
  const MAX_FILES = 5, MAX_BYTES = 3 * 1024 * 1024, MAX_TOTAL = 3.8 * 1024 * 1024;
  const readFile = (f: File): Promise<{ name: string; dataURI: string; size: number } | null> => new Promise((res) => {
    const done = (dataURI: string) => res({ name: f.name, dataURI, size: Math.round(dataURI.length * 0.75) });
    if (f.type.startsWith('image/') && f.type !== 'image/gif') {
      const img = new Image(); const url = URL.createObjectURL(f);
      img.onload = () => { const max = 1600; const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); done(c.toDataURL('image/jpeg', 0.82)); };
      img.onerror = () => { URL.revokeObjectURL(url); res(null); };
      img.src = url; return;
    }
    if (f.size > MAX_BYTES) { res(null); return; }
    const r = new FileReader(); r.onload = () => done(String(r.result || '')); r.onerror = () => res(null); r.readAsDataURL(f);
  });
  const addFiles = async (list: FileList | null) => {
    if (!list) return;
    const room = MAX_FILES - files.length;
    const picked = (await Promise.all(Array.from(list).slice(0, room).map(readFile))).filter(Boolean) as { name: string; dataURI: string; size: number }[];
    setFiles((cur) => { const out = [...cur]; let total = cur.reduce((a, f) => a + f.size, 0); for (const f of picked) { if (total + f.size > MAX_TOTAL) break; out.push(f); total += f.size; } return out; });
  };
  const [hvacPick, setHvacPick] = useState<{ date: string; time: string; label: string; mode: HvacMode } | null>(null);
  const commercial = sector === 'commercial';
  const svcList: Svc[] = sector === 'commercial' ? (category === 'hc' ? HC_COM : category === 'other' ? OTHER_COM : CLEAN_COM) : (category === 'hc' ? HC_RES : category === 'other' ? OTHER_RES : CLEAN_RES);
  const hvacSvc: Svc | null = (() => {
    const it = HVAC_INTENTS.find((i) => i.key === hvacIntent); const eqs = HVAC_EQUIP.filter((e) => !e.clean && hvacEquip.includes(e.key));
    return it && eqs.length ? { key: `hvac-${eqs.map((e) => e.key).join('+')}`, en: `${eqs.map((e) => e.en).join(', ')} — ${it.en}`, fr: `${eqs.map((e) => e.fr).join(', ')} — ${it.fr}`, hvac: true, repair: it.key !== 'new', dealType: 'HVAC' } : null;
  })();
  const hvacMode = HVAC_INTENTS.find((i) => i.key === hvacIntent)?.mode ?? 'estimate';
  const svc = svcList.find((s) => s.key === svcKey) ?? (svcKey?.startsWith('hvac-') ? hvacSvc : null);
  const estimatesOnly = !!svc?.estimate || !!svc?.hvac;
  const softQ = svc ? SOFT_QS[softKey(svc.key)] ?? null : null;

  /* 5 · answers */
  const [ans, setAns] = useState<Record<string, number>>({});
  const [ventExact, setVentExact] = useState<number>(10); // "I know the exact number" — starts at the 10 included; extras only if they raise it
  const [pkg, setPkg] = useState<PkgId | null>(null);
  const [compare, setCompare] = useState(false);
  const [dryerAdd, setDryerAdd] = useState<'ask' | 'no' | string>('ask'); // duct add-on: dryer location key
  const [benefect, setBenefect] = useState<'ask' | boolean>('ask');
  const [dryerLoc, setDryerLoc] = useState<string | null>(null);          // standalone dryer vent
  const [wallUnits, setWallUnits] = useState<Record<'u8' | 'm12' | 'o12', number>>({ u8: 1, m12: 0, o12: 0 });
  /* carpet family — question by question, gated by the price-list minimums */
  interface CarpetAns { kinds: string[]; rooms: number; steps: number; hallway: boolean | null; rugs: number; rugType: 'synthetic' | 'wool' | null; rugSize: number | null; rugWhere: 'in-shop' | 'on-site' | null; seats: number; matSD: number; matQK: number; matCrib: number; vehicle: string | null }
  const [cp, setCp] = useState<CarpetAns>({ kinds: [], rooms: 3, steps: 0, hallway: null, rugs: 1, rugType: null, rugSize: null, rugWhere: null, seats: 4, matSD: 1, matQK: 0, matCrib: 0, vehicle: null });
  const cpSet = (patch: Partial<CarpetAns>) => setCp((c) => ({ ...c, ...patch }));
  const dryerAddOn = dryerAdd !== 'ask' && dryerAdd !== 'no';
  const benefectIncluded = pkg === 'healthy-home';

  /* live catalog (prices + the REAL item names the internal tool books) */
  const catalog = useInternalCatalog(region ?? 'ottawa');
  /* Job details under the duct package (Anuj): the internal tool's Air Duct
     questions — unit location (crawl space / attic / rooftop…), parking,
     3rd floor. An answer auto-adds its option's services to the quote. */
  const questionsAll = useInternalQuestions(region ?? 'ottawa');
  const [jd, setJd] = useState<Record<string, number>>({});
  const jobQs = useMemo(() => {
    const seen = new Set<string>();
    return (questionsAll ?? []).filter((q) => {
      if (q.category !== 'Air Duct') return false;
      const key = `${q.question.trim().toLowerCase()}|${q.options.map((o) => o.label.trim().toLowerCase()).join('|')}`;
      if (seen.has(key)) return false; seen.add(key); return true;
    });
  }, [questionsAll]);
  const itemById = useMemo(() => { const m = new Map<string, InternalItem>(); for (const c of catalog ?? []) for (const i of c.items) m.set(i.id, i); return m; }, [catalog]);
  const jdItems: InternalItem[] = jobQs.flatMap((q) => { const o = q.options[jd[q.id]]; return o ? (o.itemIds.map((id) => itemById.get(id)).filter(Boolean) as InternalItem[]) : []; });
  const rowBy = (re: RegExp, cat?: RegExp): InternalItem | null => {
    for (const c of catalog ?? []) {
      if (cat && !cat.test(c.name)) continue;
      for (const i of c.items) if (re.test(i.name)) return i;
    }
    return null;
  };
  const priceOf = (i: InternalItem | null, withOther: boolean, fallback: number) =>
    (withOther ? priceNumOf(i?.priceWith) ?? priceNumOf(i?.price) : priceNumOf(i?.price)) ?? fallback;
  const extraVentPrice = priceNumOf(rowBy(/^extra vent/i)?.price) ?? 15;
  const benefectRow = rowBy(/benefect/i);
  /* Seasonal promo, shown the way the internal tool books it (Anuj): the
     package at its LIST price, then "Seasonal Discount" and the disclaimer
     line. The internal tool adds those two SM lines itself (promo bundle), so
     here they're display-only — never sent as items. */
  const seasonalAmt = Math.abs(priceNumOf(rowBy(/seasonal discount/i)?.price) ?? 100);
  const listPrice = (p: number) => p + seasonalAmt;
  const wallRow = rowBy(/wall-?mount.*(standard|alone)/i);
  const wallBase = priceNumOf(wallRow?.price) ?? 299;
  const wallHeightRow = (k: string) => (k === 'm12' ? rowBy(/height adjustment.*8.?12/i, /a\/c/i) : k === 'o12' ? rowBy(/height adjustment.*over 12/i, /a\/c/i) : null);
  /* the internal tool's dryer rows — fallback names/prices if the catalog hasn't loaded */
  const DRYER_FALLBACK: Record<string, { name: string; price: number; with: number }> = { first: { name: 'Dryer Vent Cleaning-1st', price: 199, with: 79 }, second: { name: 'Dryer Vent Cleaning-2nd', price: 219, with: 129 }, roof: { name: 'Dryer Vent Cleaning-Roof', price: 299, with: 199 }, condo: { name: 'Dryer Vent Cleaning-Condo/Apartment', price: 349, with: 100 } };
  const dryerRow = (key: string): InternalItem | null => { const l = DRYER_LOCS.find((d) => d.key === key); const r = l ? rowBy(l.re, /dryer/i) : null; if (r) return r; const f = DRYER_FALLBACK[key]; return f ? ({ id: `fallback-${key}`, name: f.name, price: `$${f.price}`, priceWith: `$${f.with}` } as InternalItem) : null; };
  const roomsRow = rowBy(/1[–-]3 rooms/i);
  const extraRoomRow = rowBy(/^extra room/i);
  const hallRow = rowBy(/hallway/i);
  const stairsOnlyRow = rowBy(/stairs (only|up to)/i);
  const stepsRow = rowBy(/landing|per step/i);
  const seatRow = rowBy(/per seat|seat \/ chair/i);
  const matSDRow = rowBy(/single \/ double|single\/double/i, /mattress/i);
  const matQKRow = rowBy(/queen|king/i, /mattress/i);
  const matCribRow = rowBy(/crib/i);
  const vehRow = (k: string) => rowBy(k === 'car' ? /^car\b/i : k === 'suv' ? /suv/i : k === 'truck' ? /truck/i : k === 'boat' ? /boat/i : /rv\b|motorhome/i, /vehicle/i);
  const rugRow = rowBy(cp.rugType === 'wool' ? /wool/i : /synthetic|polyester/i, /rug/i);
  const RUG_SIZES = [{ en: 'Small (about 4×6 ft)', fr: 'Petit (env. 4×6 pi)', sqft: 24 }, { en: 'Medium (about 6×9 ft)', fr: 'Moyen (env. 6×9 pi)', sqft: 54 }, { en: 'Large (about 8×10 ft)', fr: 'Grand (env. 8×10 pi)', sqft: 80 }, { en: 'Extra large (9×12 ft+)', fr: 'Très grand (9×12 pi+)', sqft: 108 }];

  /* travel charge for the address (billed like the funnel; estimates only note it) */
  const [travel, setTravel] = useState<{ fsa: string; charge: string; amount: number } | null>(null);
  useEffect(() => {
    setTravel(null);
    if (account === 'enviroduct' || (!zip.trim() && !city.trim())) return;
    const ctrl = new AbortController();
    fetch(`${INTERNAL_URL}/api/public/travel?postal=${encodeURIComponent(zip)}&city=${encodeURIComponent(city)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => { if (j?.ok && j.charge) { const n = Number(String(j.charge).replace(/[^0-9.]/g, '')); setTravel({ fsa: j.fsa || '', charge: j.charge, amount: Number.isFinite(n) ? n : 0 }); } })
      .catch(() => {});
    return () => ctrl.abort();
  }, [zip, city, account]);

  /* ── the cart, derived from the answers ── */
  const pkgPicked = pkg ? DUCT_PACKAGES.find((p) => p.id === pkg) ?? null : null;
  const ventCount = ans.vents === 5 ? Math.max(1, ventExact) : (VENT_COUNT[ans.vents ?? 4] ?? 0);
  /* Only an EXACT count prices extra vents (Anuj): ranges / not sure ride the
     Extra Vent line at qty 0 and the tech declares the count on arrival. */
  const ventsExact = ans.vents === 5;
  const extraVents = ventsExact && ventCount > 10 ? ventCount - 10 : 0;
  const ventsTbd = svc?.key === 'airduct' && !ventsExact;
  interface Line { label: string; amount: number; name?: string; qty?: number; note?: string; text?: string; unit?: number }
  const lines: Line[] = [];
  const serviceNames: string[] = [];
  if (svc && !estimatesOnly) {
    if (svc.key === 'airduct' && pkgPicked) {
      lines.push({ label: t(pkgPicked.name), amount: listPrice(pkgPicked.price) });
      lines.push({ label: lang === 'en' ? 'Seasonal Discount' : 'Rabais saisonnier', amount: -seasonalAmt });
      lines.push({ label: lang === 'en' ? 'Disclaimer' : 'Avis', amount: 0, text: lang === 'en' ? 'Promo valid only if ALL vents are cleaned' : 'Promo valide seulement si TOUTES les bouches sont nettoyées' });
      serviceNames.push('Standard Duct Cleaning');
      if (extraVents > 0) lines.push({ label: `${lang === 'en' ? 'Extra vents' : 'Bouches supplémentaires'} × ${extraVents}`, note: lang === 'en' ? `$${extraVentPrice} each beyond the 10 included` : `${extraVentPrice} $ chacune au-delà des 10 incluses`, amount: extraVents * extraVentPrice, name: 'Extra Vent', qty: extraVents });
      else if (ventsTbd) lines.push({ label: lang === 'en' ? 'Extra vents' : 'Bouches supplémentaires', amount: 0, name: 'Extra Vent', qty: 0, unit: extraVentPrice, text: lang === 'en' ? `Count declared on arrival · $${extraVentPrice} each beyond 10` : `Compte déclaré à l’arrivée · ${extraVentPrice} $ chacune au-delà de 10` });
      if (dryerAddOn) {
        const r = dryerRow(dryerAdd);
        if (r) { lines.push({ label: r.name, amount: priceOf(r, true, 99), name: r.name, qty: 1 }); serviceNames.push(r.name); }
      }
      if (benefect === true && !benefectIncluded) { const bn = benefectRow?.name ?? 'Benefect Disinfectant Add-On'; lines.push({ label: bn, amount: priceOf(benefectRow, true, 99), name: bn, qty: 1 }); serviceNames.push(bn); }
      for (const it of jdItems) if (!serviceNames.includes(it.name)) { lines.push({ label: biText(it.name, lang === 'fr'), amount: priceOf(it, false, 0), name: it.name, qty: 1 }); serviceNames.push(it.name); }
    }
    if (svc.key === 'dryer' && dryerLoc) {
      const r = dryerRow(dryerLoc);
      if (r) { lines.push({ label: r.name, amount: priceOf(r, false, 149), name: r.name, qty: 1 }); serviceNames.push(r.name); }
    }
    if (svc.key === 'wallac') {
      for (const tr of WALL_TIERS) if (wallUnits[tr.k] > 0) {
        /* two catalog items, like the internal tool: the cleaning + the height adjustment */
        lines.push({ label: `${lang === 'en' ? 'Wall unit' : 'Unité murale'} · ${t(tr)} × ${wallUnits[tr.k]}`, amount: wallUnits[tr.k] * wallBase, name: wallRow?.name ?? 'Wall-Mount A/C Cleaning - Standard / Alone', qty: wallUnits[tr.k] });
        if (tr.add > 0) { const hr = wallHeightRow(tr.k); lines.push({ label: `${lang === 'en' ? 'Height adjustment' : 'Ajustement en hauteur'} · ${t(tr)} × ${wallUnits[tr.k]}`, amount: wallUnits[tr.k] * priceOf(hr, false, tr.add), name: hr?.name ?? (tr.k === 'm12' ? 'Wall-Mount Height Adjustment - 8–12 ft' : 'Wall-Mount Height Adjustment - Over 12 ft'), qty: wallUnits[tr.k] }); }
      }
      if (wallRow) serviceNames.push(wallRow.name);
    }
    if (svc.key === 'carpet') {
      const k = cp.kinds;
      const add = (label: string, amount: number, name?: string, qty = 1) => { lines.push({ label, amount, name, qty }); if (name && !serviceNames.includes(name)) serviceNames.push(name); };
      if (k.includes('carpet')) {
        if (cp.rooms > 0) {
          add(roomsRow?.name ?? '1–3 Rooms', priceOf(roomsRow, false, 199), roomsRow?.name ?? '1–3 Rooms');
          if (cp.rooms > 3) add(`${extraRoomRow?.name ?? 'Extra Room'} × ${cp.rooms - 3}`, (cp.rooms - 3) * priceOf(extraRoomRow, false, 40), extraRoomRow?.name ?? 'Extra Room', cp.rooms - 3);
          if (cp.steps > 0) add(`${stepsRow?.name ?? 'Stairs / Landing Steps'} × ${cp.steps}`, cp.steps * priceOf(stepsRow, false, 4), stepsRow?.name ?? 'Stair / Landing Step', cp.steps);
        } else if (cp.steps > 0) add(stairsOnlyRow?.name ?? 'Stairs up to 49', priceOf(stairsOnlyRow, false, 199), stairsOnlyRow?.name ?? 'Stairs up to 49');
        if (cp.hallway) add(hallRow?.name ?? 'Hallway', priceOf(hallRow, false, 25), hallRow?.name ?? 'Hallway');
      }
      if (k.includes('rugs') && cp.rugType && cp.rugSize !== null && cp.rugWhere) {
        const sq = RUG_SIZES[cp.rugSize].sqft * cp.rugs;
        add(`${lang === 'en' ? 'Area rugs' : 'Carpettes'} × ${cp.rugs} · ${t(RUG_SIZES[cp.rugSize])} · ${cp.rugWhere === 'in-shop' ? (lang === 'en' ? 'in our shop' : 'en atelier') : (lang === 'en' ? 'on site' : 'sur place')}`, Math.round(sq * RUG_RATES[cp.rugType][cp.rugWhere] * 100) / 100, rugRow?.name ?? (cp.rugType === 'wool' ? 'Wool / Specialty Rug' : 'Polyester / Synthetic Rug'), cp.rugs);
      }
      if (k.includes('upholstery') && cp.seats > 0) add(`${seatRow?.name ?? 'Upholstery Cleaning (per seat)'} × ${cp.seats}`, cp.seats * priceOf(seatRow, false, 40), seatRow?.name ?? 'Per Seat / Chair', cp.seats);
      if (k.includes('mattress')) {
        if (cp.matSD > 0) add(`${matSDRow?.name ?? 'Single / Double Mattress'} × ${cp.matSD}`, cp.matSD * priceOf(matSDRow, false, 149), matSDRow?.name ?? 'Single / Double Mattress', cp.matSD);
        if (cp.matQK > 0) add(`${matQKRow?.name ?? 'Queen / King Mattress'} × ${cp.matQK}`, cp.matQK * priceOf(matQKRow, false, 199), matQKRow?.name ?? 'Queen Mattress', cp.matQK);
        if (cp.matCrib > 0) add(`${matCribRow?.name ?? 'Crib Mattress'} × ${cp.matCrib}`, cp.matCrib * priceOf(matCribRow, false, 99), matCribRow?.name ?? 'Crib Mattress', cp.matCrib);
      }
      if (k.includes('vehicle') && cp.vehicle) {
        const r = vehRow(cp.vehicle);
        const fb: Record<string, number> = { car: 249, suv: 275, truck: 289, boat: 0, rv: 0 };
        add(r?.name ?? cp.vehicle.toUpperCase(), priceOf(r, false, fb[cp.vehicle] ?? 0), r?.name ?? cp.vehicle.toUpperCase());
      }
      if (!serviceNames.length && lines.length) serviceNames.push(roomsRow?.name ?? '1–3 Rooms');
    }
  }
  if (svc?.hvac) {
    const m = hvacPick?.mode ?? hvacMode;
    lines.push({ label: t(svc), amount: 0, text: m === 'repair' ? (lang === 'en' ? 'Repair visit — $169 dispatch fee, billed on the visit' : 'Réparation — 169 $ de déplacement, facturé sur place') : m === 'maintenance' ? (lang === 'en' ? 'Maintenance / tune-up visit' : 'Visite d’entretien') : (lang === 'en' ? 'Free on-site / phone quote' : 'Soumission gratuite sur place / par téléphone') });
  }
  if (svc?.estimate) {
    /* estimates (HVAC & co.): one plain line, then whether a travel charge applies (Anuj) */
    lines.push({ label: t(svc), amount: 0, name: svc.estimate, qty: 1, text: lang === 'en' ? 'Free on-site estimate' : 'Estimation gratuite sur place' }); serviceNames.push(svc.estimate);
  }
  if (svc?.estimate || svc?.hvac) {
    if (travel && travel.amount > 0) lines.push({ label: lang === 'en' ? 'Travel charge' : 'Frais de déplacement', amount: 0, text: `${travel.charge} (${travel.fsa}) — ${lang === 'en' ? 'noted, not billed (estimate)' : 'noté, non facturé (estimation)'}` });
  }
  if (travel && travel.amount > 0 && !estimatesOnly && lines.length) lines.push({ label: `${lang === 'en' ? 'Travel charge' : 'Frais de déplacement'} (${travel.fsa})`, amount: travel.amount });
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  /* Carpet-family minimum (price list): the HIGHEST minimum among the picked
     sub-services must be met — under it we say no, never auto-top-up (Anuj). */
  const carpetMin = svc?.key === 'carpet' ? Math.max(0, ...cp.kinds.map((k) => k === 'carpet' ? CARPET_GROUP_MINS['carpet-wall'] : k === 'rugs' ? AREA_RUG_MIN : k === 'upholstery' ? CARPET_GROUP_MINS.upholstery : k === 'mattress' ? CARPET_GROUP_MINS.mattress : 0)) : 0;
  const carpetSub = svc?.key === 'carpet' ? lines.filter((l) => !/travel|déplacement/i.test(l.label)).reduce((a, l) => a + l.amount, 0) : 0;
  const underMin = svc?.key === 'carpet' && lines.length > 0 && carpetSub < carpetMin;
  const provinceName = region === 'montreal' || region === 'quebec' ? 'Québec' : 'Ontario';
  const taxLines = estimatesOnly || subtotal === 0 ? [] : (PROVINCE_TAXES[provinceName]?.lines ?? []).map((tl) => ({ label: tl.label, amount: subtotal * tl.rate }));
  const tax = taxLines.reduce((s, tl) => s + tl.amount, 0);
  const total = subtotal + tax;
  const durationMinutes = estimatesOnly ? 90 : svc?.key === 'dryer' ? 60 : svc?.key === 'carpet' ? 90 : 120;
  const jobType = estimatesOnly ? 'Estimate'
    : svc?.key === 'airduct' ? (dryerAddOn ? 'Duct & Dryer' : 'Air Duct')
    : svc?.key === 'dryer' ? 'Dryer Vent' : svc?.key === 'carpet' ? 'Carpet' : svc?.key === 'wallac' ? 'Wall Mount A/C' : 'Work';

  /* answers as readable notes (dispatch + Pipedrive) */
  const qaNotes = (): string[] => {
    const out: string[] = [];
    if (svc?.key === 'airduct') for (const q of DUCT_QS) if (ans[q.id] !== undefined) out.push(`${q.q.en}: ${q.opts[ans[q.id]].en}${q.id === 'vents' && ans.vents === 5 ? ` — ${ventCount}` : ''}`);
    if (svc?.hvac) for (const q of HVAC_QS) if (ans[q.id] !== undefined) out.push(`${q.q.en}: ${q.opts[ans[q.id]].en}`);
    if (svc?.key === 'airduct') for (const q of jobQs) if (jd[q.id] !== undefined) out.push(`${biText(q.question, false)}: ${biText(q.options[jd[q.id]]?.label ?? '', false)}`);
    if (softQ && ans.soft !== undefined) out.push(`${softQ.q.en}: ${softQ.opts[ans.soft].en}`);
    if (svc?.key === 'carpet') out.push(`Carpet family picks: ${cp.kinds.join(', ') || '—'}${cp.kinds.includes('rugs') ? ` · rugs: ${cp.rugs} ${cp.rugType ?? ''} ${cp.rugSize !== null ? RUG_SIZES[cp.rugSize].en : ''} ${cp.rugWhere ?? ''}` : ''}`);
    return out;
  };

  /* ── slots ── */
  const [slots, setSlots] = useState<GreenSlot[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slot, setSlot] = useState<GreenSlot | null>(null);
  const slotsBody = () => ({ account, address: addressText, services: serviceNames, days: 62, estimate: estimatesOnly || undefined, durationMinutes });
  useEffect(() => { // warm as soon as the cart is known
    if (!addressText || region === null || !serviceNames.length || stage === 'info' || stage === 'where') return;
    const tm = setTimeout(() => { fetchGreenSlots(slotsBody()); }, 700);
    return () => clearTimeout(tm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, addressText, region, serviceNames.join('|'), durationMinutes, estimatesOnly]);
  useEffect(() => {
    if (stage !== 'slots' || !addressText || !serviceNames.length) return;
    let gone = false;
    setSlotsLoading(true); setSlots(null); setSlot(null);
    fetchGreenSlots(slotsBody()).then((s) => { if (!gone) setSlots(s); }).finally(() => { if (!gone) setSlotsLoading(false); });
    return () => { gone = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  /* ── journey + lead (same fan-out as the funnel) ── */
  const [leadEventId] = useState(() => `lead_${Date.now()}_${Math.floor(Math.random() * 1e9)}`);
  const leadSnapshot = () => {
    const q = new URLSearchParams(window.location.search);
    const cookie = (n: string) => document.cookie.match(new RegExp(`(?:^|; )${n}=([^;]*)`))?.[1] ?? '';
    return {
      event_id: leadEventId, dnum: null, lead_type: 'new_quote', brand: brand.id, source: 'widget', flow: 'question-flow',
      customer_name: `${firstName.trim()} ${lastName.trim()}`.trim(), first_name: firstName.trim(), last_name: lastName.trim(),
      email: email.trim(), phone: phone.replace(/\D/g, ''), address: street.trim(), formatted_address: addressText,
      city, state: region === 'montreal' || region === 'quebec' ? 'QC' : 'ON', zip, region: region ?? '',
      sector: oosPicks.length ? (oosSector === 'commercial' || oosPicks.includes('commercial') ? 'Commercial' : 'Residential') : (commercial ? 'Commercial' : 'Residential'),
      category: oosPicks.length ? (oosPicks.includes('hvac') ? 'hvac' : 'cleaning') : (svc?.hvac ? 'hvac' : 'cleaning'),
      deal_type: oosPicks.length ? (['HVAC', 'Insulation', 'Aeroseal', 'Mold', 'Cleaning'].find((d) => oosPicks.some((k) => OOS_SERVICES.find((o) => o.key === k)?.deal === d)) ?? 'Cleaning') : (svc?.dealType ?? 'Cleaning'),
      services: oosPicks.length ? OOS_SERVICES.filter((o) => oosPicks.includes(o.key)).map((o) => o.key === 'hvac' && (oosHvacIntent || oosHvacEquip.length) ? `Heating & Cooling — ${HVAC_INTENTS.find((i) => i.key === oosHvacIntent)?.en ?? ''}${oosHvacEquip.length ? `: ${HVAC_EQUIP.filter((e) => !e.clean && oosHvacEquip.includes(e.key)).map((e) => e.en).join(', ')}` : ''}`.replace(/ — $/, '') : o.en) : (svc ? [svc.en] : []),
      service_ids: oosPicks.length ? oosPicks : (svc ? [svc.key] : []),
      other_service_description: '',
      how_did_you_hear: HOW_DID_YOU_HEAR.find((o) => o.value === howHeard)?.label.en ?? howHeard,
      how_did_you_hear_id: howHeard,
      /* Slack shows `message` — the customer's own words only; the journey
         (left at, answers, quote, time) rides `journey_summary` for the
         Pipedrive note (Anuj 2026-08-25) */
      message: message.trim(),
      journey_summary: journeySummary(), journey: journeyDetail(), stage_reached: stage,
      recording_url: '', sms_opt_in: smsOk, agreed_to_policy: agree, privacy_policy_agreed: privacyOk,
      proceed_to_booking: region !== null, ineligibility_reasons: region === null ? ['out_of_area'] : [],
      fbp: cookie('_fbp'), fbc: cookie('_fbc'), event_source_url: window.location.href,
      utm_source: q.get('utm_source') ?? '', utm_campaign: q.get('utm_campaign') ?? '', utm_medium: q.get('utm_medium') ?? '',
      utm_content: q.get('utm_content') ?? '', utm_term: q.get('utm_term') ?? '', utm_id: q.get('utm_id') ?? '',
      submitted_at: new Date().toISOString(),
    };
  };
  /* Everything the visitor picked so far — for the lead that fires only when
     they leave without booking (Anuj): stage reached + every answer. */
  const STAGE_LABEL: Record<Stage, string> = { where: 'Address', oos: 'Out-of-area form', oosdone: 'Out-of-area lead sent', info: 'Contact details', sector: 'Residential / Commercial', category: 'Category', service: 'Service', hvac: 'HVAC time', quest: 'Questions', recommend: 'Package', addons: 'Add-ons', slots: 'Appointment', review: 'Review & book', done: 'Booked' };
  const journeyDetail = () => ({
    stage: stage, stage_label: STAGE_LABEL[stage],
    sector: sector ?? '', category: category ?? '', service: svc?.en ?? '',
    hvac_intent: hvacIntent ?? '', hvac_equipment: HVAC_EQUIP.filter((e) => hvacEquip.includes(e.key)).map((e) => e.en),
    package: pkgPicked?.name.en ?? '', extra_vents: extraVents, vents: ventCount || null,
    dryer_addon: dryerAdd, benefect: benefect === 'ask' ? '' : benefect,
    answers: qaNotes(),
    lines: lines.map((l) => `${l.label}: ${l.text ?? fmt(l.amount)}`),
    total: estimatesOnly ? 'Free estimate' : fmt(total),
    slot: slot ? `${slot.date} ${slot.label}` : hvacPick ? `${hvacPick.date} ${hvacPick.label}` : '',
  });
  const journeySummary = () => {
    const j = journeyDetail();
    return [
      `Left at: ${j.stage_label}`,
      j.sector ? `Sector: ${j.sector}` : '', j.service ? `Service: ${j.service}` : '',
      j.hvac_intent ? `HVAC: ${HVAC_INTENTS.find((i) => i.key === j.hvac_intent)?.en ?? j.hvac_intent}${j.hvac_equipment.length ? ` — ${j.hvac_equipment.join(', ')}` : ''}` : '',
      j.package ? `Package: ${j.package}${j.extra_vents ? ` (+${j.extra_vents} extra vents)` : ''}` : '',
      ...j.answers.map((a) => `Q&A: ${a}`),
      ...(j.lines.length ? [`Quote so far: ${j.total}`, ...j.lines.map((l) => ` - ${l}`)] : []),
      j.slot ? `Time picked: ${j.slot}` : '',
    ].filter(Boolean).join('\n');
  };
  /* Leave-lead: fires ONCE when the visitor leaves without booking — never
     while they're still on the page, never after a booking (the booking
     message covers it). Needs the minimum: name, phone, email, address. */
  const [bookState, setBookState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const latest = useRef<{ ok: boolean; payload: Record<string, unknown> }>({ ok: false, payload: {} });
  latest.current = { ok: infoOk && stage !== 'where' && stage !== 'info' && stage !== 'oos' && stage !== 'oosdone' && bookState !== 'done' && !oosSent.current, payload: leadSnapshot() };
  /* Re-sends on every later leave IF the journey moved on (iOS fires pagehide
     on a mere tab switch, so a once-only send froze the lead at the first
     path). Same event id → the internal tool updates the row, the Slack
     message and the deal instead of creating new ones. */
  const lastLeadKey = useRef('');
  useEffect(() => {
    const fire = () => {
      if (!latest.current.ok) return;
      const pl = latest.current.payload as Record<string, unknown>;
      const key = JSON.stringify({ st: pl.stage_reached, j: pl.journey, m: pl.customer_message, h: pl.how_did_you_hear_id });
      if (key === lastLeadKey.current) return;
      lastLeadKey.current = key;
      const body = JSON.stringify({ ...pl, lead_type: 'abandoned', abandoned: true, submitted_at: new Date().toISOString() });
      const post = (url: string, b: string) => { if (!(navigator.sendBeacon && navigator.sendBeacon(url, new Blob([b], { type: 'application/json' })))) fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: b, keepalive: true }).catch(() => {}); };
      post('/api/lead', body);
      post('/api/journey', JSON.stringify({ op: 'lead', ...JSON.parse(body) }));
    };
    let hiddenTimer: ReturnType<typeof setTimeout> | null = null;
    const onVis = () => {
      if (document.visibilityState === 'hidden') { hiddenTimer = setTimeout(fire, 15 * 60 * 1000); } // gone 15 min = left
      else if (hiddenTimer) { clearTimeout(hiddenTimer); hiddenTimer = null; }
    };
    window.addEventListener('pagehide', fire);
    window.addEventListener('beforeunload', fire);
    document.addEventListener('visibilitychange', onVis);
    return () => { window.removeEventListener('pagehide', fire); window.removeEventListener('beforeunload', fire); document.removeEventListener('visibilitychange', onVis); if (hiddenTimer) clearTimeout(hiddenTimer); };
  }, []);
  const visitSent = useRef(false);
  useEffect(() => {
    if (visitSent.current) return;
    visitSent.current = true;
    fetch('/api/journey', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'visit', ...leadSnapshot() }) }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── out-of-area lead submit: journey (Slack + Pipedrive) + n8n, then thanks ── */
  const oosOk = firstName.trim() !== '' && lastName.trim() !== '' && phone.replace(/\D/g, '').length === 10 && /\S+@\S+\.\S+/.test(email.trim()) && oosPicks.length > 0 && agree;
  const submitOos = async () => {
    if (!oosOk) { setHl(true); return; }
    if (oosState === 'sending') return;
    setOosState('sending'); setHl(false);
    const payload = { ...leadSnapshot(), lead_type: 'out_of_area', leadOnly: true, reason: 'out_of_area', submitted_at: new Date().toISOString() };
    const body = JSON.stringify(payload);
    try {
      await Promise.allSettled([
        fetch('/api/journey', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'lead', ...payload }), keepalive: true }),
        fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }),
      ]);
    } catch { /* never block the visitor */ }
    oosSent.current = true;
    setOosState('idle');
    go('oosdone');
  };

  /* ── booking ── */
  const [bookError, setBookError] = useState('');
  const book = async () => {
    if ((!slot && !hvacPick) || !svc || bookState === 'loading') return;
    if (howHeard === '' || !addressComplete || !privacyOk) { setHl(true); return; }
    setBookState('loading'); setBookError('');
    try {
      const heard = HOW_DID_YOU_HEAR.find((o) => o.value === howHeard)?.label.en || howHeard;
      const adminNote = [
        `ONLINE BOOKING (${commercial ? 'COMMERCIAL/INDUSTRIAL' : 'residential'} — question flow /new)`,
        `Requested: ${svc.en}`,
        ...lines.map((l) => ` - ${l.label}: ${l.text ?? fmt(l.amount)}${l.note ? ` (${l.note})` : ''}`),
        `TOTAL: ${fmt(subtotal)}`,
        travel && travel.amount > 0 ? `Travel charge ${travel.charge} (${travel.fsa})${estimatesOnly ? ' — noted, not billed (estimate)' : ' — included above'}` : '',
        svc.key === 'airduct' ? `Vents: ${ventsExact ? `${ventCount} exact${extraVents ? ` (${extraVents} extra × $${extraVentPrice})` : ' (included)'}` : `customer said "${ans.vents !== undefined ? DUCT_QS.find((q) => q.id === 'vents')?.opts[ans.vents]?.en ?? 'not sure' : 'not sure'}" — 10 included, Extra Vent at qty 0: COUNT ON ARRIVAL, $${extraVentPrice} each beyond 10`}` : '',
        ...qaNotes().map((l) => `Q&A: ${l}`),
        howHeard ? `How did you hear: ${heard}` : '',
        svc.hvac && membership !== null ? `Membership (Maintenance Plan): ${membership ? 'INTERESTED — follow up with next steps' : 'not interested'}` : '',
        message.trim() ? `Customer message: ${message.trim()}` : '',
      ].filter(Boolean).join('\n');
      /* Tech note = only what matters on site (Anuj): the job, vents, add-ons,
         the job-details answers (unit location / parking / floor) and the
         customer's message. The admin note keeps the full picture. */
      const jdAnswers = svc.key === 'airduct' ? jobQs.filter((q) => jd[q.id] !== undefined).map((q) => `${biText(q.question, false)}: ${biText(q.options[jd[q.id]]?.label ?? '', false)}`) : [];
      const techNote = [
        `${svc.en}${pkgPicked ? ` — ${pkgPicked.name.en}` : ''}`,
        svc.key === 'airduct' ? `Vents: ${ventsExact ? `${ventCount} exact${extraVents ? ` (${extraVents} extra)` : ''}` : `COUNT ON ARRIVAL (customer said "${ans.vents !== undefined ? DUCT_QS.find((q) => q.id === 'vents')?.opts[ans.vents]?.en ?? 'not sure' : 'not sure'}")`}` : '',
        svc.key === 'airduct' && dryerAddOn ? `Dryer vent add-on: ${DRYER_LOCS.find((d) => d.key === dryerAdd)?.en ?? dryerAdd}` : '',
        svc.key === 'airduct' && (benefect === true || benefectIncluded) ? 'Benefect disinfection: yes' : '',
        ...jdAnswers,
        ...lines.filter((l) => l.name && !/package|extra vent/i.test(l.label)).map((l) => `Item: ${l.label}${l.text ? ` (${l.text})` : ''}`),
        svc.key === 'dryer' && dryerLoc ? `Dryer vent exits: ${DRYER_LOCS.find((d) => d.key === dryerLoc)?.en ?? dryerLoc}` : '',
        message.trim() ? `Customer message: ${message.trim()}` : '',
      ].filter(Boolean).join('\n');
      if (svc.hvac && hvacPick) {
        /* HVAC (ServiceTitan) — same call the HVAC panel makes, now from Review & book */
        const r = await fetch('/api/hvac-book', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: hvacPick.mode, category: hvacPick.mode === 'maintenance' ? 'maintenance' : '',
            date: hvacPick.date, time: hvacPick.time,
            name: `${firstName.trim()} ${lastName.trim()}`.trim(), phone: phone.replace(/\D/g, ''), email: email.trim(),
            street: street.trim(), city: city.trim(), state: region === 'montreal' || region === 'quebec' ? 'QC' : 'ON', zip: zip.trim(),
            additionalDetails: adminNote, customerType: commercial ? 'Commercial' : 'Residential',
            images: files.map((f) => f.dataURI), fileNames: files.map((f) => f.name),
            leadEventId: leadEventId || undefined, lead: leadSnapshot(),
          }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j?.error) throw new Error(j?.message || j?.error || `Booking failed (${r.status})`);
        setBookState('done'); go('done'); return;
      }
      const r = await fetch(estimatesOnly ? '/api/estimate-book' : '/api/internal-book', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account, region: region ?? 'ottawa', start: slot!.start, end: slot!.end,
          /* drives the SM order's tax (QC vs HST) and print style — QC addresses get the QC ones (Anuj 2026-08-26) */
          province: region === 'montreal' || region === 'quebec' ? 'Québec' : 'Ontario',
          firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.replace(/\D/g, ''), email: email.trim(),
          address1: street.trim(), city: city.trim(), state: region === 'montreal' || region === 'quebec' ? 'QC' : 'ON', zip: zip.trim(),
          commercial, jobType, techNote, adminNote, notes: adminNote,
          // SM lead source: mapped server-side from the how-did-you-hear key ('other' → 1CleanAir website)
          howDidYouHear: howHeard, leadSourceNote: heard, leadEventId,
          cart: {
            package: pkgPicked && !commercial ? { name: { basic: 'Standard Duct Package', preferred: 'Performance Duct Package', 'healthy-home': 'Healthy Home Duct Package' }[pkgPicked.id] ?? pkgPicked.name.en, qty: 1 } : undefined,
            extraVents: pkgPicked && !commercial ? extraVents : 0,
            /* priced extra vents ride cart.extraVents (the internal cart builder adds the SM line) — sending them as an item too doubled the line (Anuj 2026-08-26); the qty-0 count-on-arrival line stays an item */
            items: lines.filter((l) => l.name && !(l.name === 'Extra Vent' && (l.qty ?? 1) > 0)).map((l) => ({ name: l.name!, qty: l.qty ?? 1, price: l.unit ?? ((l.qty ?? 1) > 1 ? l.amount / (l.qty ?? 1) : l.amount) })),
            travel: !estimatesOnly && travel && travel.amount > 0 ? travel.amount : 0,
          },
          lead: leadSnapshot(),
          summary: [...lines.map((l) => `${l.label}: ${fmt(l.amount)}`), ...(estimatesOnly ? ['Total: Free estimate'] : [`Subtotal: ${fmt(subtotal)}`, ...taxLines.map((tl) => `${tl.label}: ${fmt(tl.amount)}`), `Total: ${fmt(total)}`])],
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.error) throw new Error(j?.message || j?.error || `Booking failed (${r.status})`);
      setBookState('done'); go('done');
    } catch (e) { setBookState('error'); setBookError((e as Error).message); }
  };

  /* ── flow helpers ── */
  const pickService = (s: Svc) => {
    setSvcKey(s.key); setHvacIntent(null); setHvacEquip([]); setAns({}); setJd({}); setHvacPick(null); setFiles([]); setPkg(null); setCompare(false); setDryerAdd('ask'); setBenefect('ask'); setDryerLoc(null); setSlot(null);
    setPkgConfirmed(false); setMembership(null);
    go('quest');
  };
  const questDone = svc?.key === 'airduct' ? DUCT_QS.every((q) => ans[q.id] !== undefined)
    : svc?.key === 'dryer' ? dryerLoc !== null
    : svc?.key === 'wallac' ? WALL_TIERS.some((tr) => wallUnits[tr.k] > 0)
    : svc?.key === 'carpet' ? (cp.kinds.length > 0 && lines.length > 0 && !underMin
        && (!cp.kinds.includes('carpet') || cp.hallway !== null)
        && (!cp.kinds.includes('rugs') || (cp.rugType !== null && cp.rugSize !== null && cp.rugWhere !== null))
        && (!cp.kinds.includes('vehicle') || cp.vehicle !== null))
    : softQ ? ans.soft !== undefined : true;
  useEffect(() => { if (svc?.key === 'airduct' && questDone && !pkg) setPkg(recommendPkg(ans).id); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [svc?.key, questDone]);
  const addonsDone = dryerAdd !== 'ask' && (benefect !== 'ask' || benefectIncluded);
  /* The Service tab is TWO screens that each reveal downwards (Anuj — "what
     feels ideal for the flow"): PICK (home/business → category → service,
     HVAC questions inline) and DETAILS (questions → package → add-ons). */
  const PICK_PAGE = stage === 'sector' || stage === 'service';
  const DETAIL_PAGE = stage === 'quest' || stage === 'recommend' || stage === 'addons';
  const [pkgConfirmed, setPkgConfirmed] = useState(false);
  const [membership, setMembership] = useState<boolean | null>(null); // HVAC: interested in the maintenance plan?
  const reveal = (id: string) => setTimeout(() => revealEl(id), 80);
  const hvacReady = hvacEquip.length > 0 && !!hvacIntent && HVAC_QS.every((q) => ans[q.id] !== undefined);
  const detailReady = !svc ? false
    : svc.estimate ? (softQ ? ans.soft !== undefined : true)
    : svc.key === 'airduct' ? (questDone && pkgConfirmed && addonsDone)
    : questDone;

  /* Step strip (Anuj — like the Francis widget): five stops, each an icon; a
     stop already passed is clickable and jumps straight back to it. */
  type StepKey = 'location' | 'contact' | 'service' | 'schedule' | 'review';
  const STEPS: { key: StepKey; en: string; fr: string; icon: LucideIcon; stages: Stage[]; goTo: Stage }[] = [
    { key: 'location', en: 'Location', fr: 'Adresse', icon: MapPin, stages: ['where'], goTo: 'where' },
    { key: 'contact', en: 'Contact', fr: 'Contact', icon: User, stages: ['info', 'oos'], goTo: 'info' },
    { key: 'service', en: 'Service', fr: 'Service', icon: Wrench, stages: ['sector', 'category', 'service', 'quest', 'recommend', 'addons'], goTo: 'sector' },
    { key: 'schedule', en: 'Schedule', fr: 'Horaire', icon: CalendarDays, stages: ['slots', 'hvac'], goTo: 'slots' },
    { key: 'review', en: 'Review', fr: 'Réserver', icon: ClipboardCheck, stages: ['review', 'done', 'oosdone'], goTo: 'review' },
  ];
  const stepIdx = Math.max(0, STEPS.findIndex((st) => st.stages.includes(stage)));
  const jumpTo = (i: number) => {
    if (i >= stepIdx || stage === 'done' || stage === 'oosdone' || bookState === 'loading') return;
    const st = STEPS[i];
    go(st.key === 'schedule' && svc?.hvac ? 'hvac' : st.goTo); setDir('back');
  };

  const chips = (q: Q, cur: number | undefined, on: (i: number) => void) => (
    <div key={q.id} id={`q-${q.id}`} className="nf-rise">
      <p className="mb-2 text-[15px] font-semibold text-slate-900">{t(q.q)}</p>
      <div className="flex flex-wrap gap-2">
        {q.opts.map((o, i) => (
          <button key={i} onClick={() => on(i)} className={`rounded border px-3 py-1.5 text-[13px] font-medium transition-all ${cur === i ? CHIP_ON : CHIP}`}>{t(o)}</button>
        ))}
      </div>
    </div>
  );
  const counter = (v: number, set: (n: number) => void, min = 0) => (
    <span className="flex items-center gap-2">
      <button onClick={() => set(Math.max(min, v - 1))} className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-sm font-semibold text-slate-800 hover:bg-slate-50">−</button>
      <span className="w-8 text-center text-sm font-bold tabular-nums text-slate-900">{v}</span>
      <button onClick={() => set(v + 1)} className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-sm font-semibold text-slate-800 hover:bg-slate-50">+</button>
    </span>
  );
  const NextBtn = ({ ok, label, onClick }: { ok: boolean; label?: string; onClick: () => void }) => (
    <button onClick={onClick} disabled={!ok}
      className={`nf-press rounded-md px-4 py-2 text-sm font-semibold transition-colors ${ok ? 'bg-sky-600 text-white hover:bg-sky-700' : 'cursor-not-allowed bg-sky-300 text-white'}`}>
      {label ?? (lang === 'en' ? 'Continue →' : 'Continuer →')}
    </button>
  );
  const BackBtn = () => <button onClick={back} className={BACK_BTN}>{lang === 'en' ? 'Back' : 'Retour'}</button>;

  /* ── confirmation ── */
  if (stage === 'done') {
    return (
      <div className={`flex items-center justify-center ${PAGE} px-3 py-10`}>
        <div className="newflow mx-auto flex w-full max-w-md flex-col items-center rounded-lg bg-white px-6 py-12 text-center shadow-xl ring-1 ring-slate-200">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 ring-4 ring-emerald-400/30"><Check className="nf-check h-10 w-10 text-emerald-400" strokeWidth={2.5} /></div>
          <h2 className="mt-5 text-2xl font-bold text-slate-900">{lang === 'en' ? 'Booking confirmed!' : 'Réservation confirmée!'}</h2>
          <p className="mt-2 text-sm text-slate-600">{(slot ?? hvacPick) && `${(slot ?? hvacPick)!.date} · ${(slot ?? hvacPick)!.label}`} — {lang === 'en' ? "we'll be in touch to confirm the details." : 'nous vous contacterons pour confirmer.'}</p>
          <div className={`mt-6 w-full rounded-lg ${CARD} p-4 text-left`}>
            {lines.map((l, i) => <div key={i} className="flex justify-between py-0.5 text-sm text-slate-700"><span>{l.label}</span><Money n={l.amount} /></div>)}
            <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900"><span>Total</span><span>{estimatesOnly ? (lang === 'en' ? 'Free' : 'Gratuit') : fmt(total)}</span></div>
          </div>
          <a href={`tel:${brand.phoneDigits}`} className="mt-5 text-sm font-bold text-sky-600">{brand.phoneDisplay}</a>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex justify-center ${PAGE} px-2 py-3 sm:px-3 sm:py-6`}>
      <div className="nf-bg nf-bg-embed" aria-hidden />
      <div className="newflow relative z-10 mx-auto w-full max-w-2xl overflow-clip rounded-lg bg-white shadow-xl ring-1 ring-slate-200">
      <div className="sticky top-0 z-20 bg-white shadow-[0_6px_12px_-10px_rgba(15,23,42,0.25)]">
      {/* brand bar like the widget (Anuj): small-caps brand + title up-left, EN/FR right */}
      <div className="flex items-center justify-between gap-3 bg-sky-700 px-4 py-3 text-white sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {/* white logo on the coloured bar (Anuj) */}
          <img src="/1CleanAir_Logo_White.png" alt={brand.name} className="h-8 w-auto shrink-0 sm:h-9" />
          <div className="min-w-0 border-l border-white/30 pl-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-sky-100">{brand.name}</p>
            <h1 className="text-base font-bold leading-tight tracking-tight sm:text-lg">{lang === 'en' ? 'Book online now' : 'Réservez en ligne'}</h1>
          </div>
        </div>
        <div className="flex shrink-0 overflow-hidden rounded-md border border-white/40 text-xs font-bold">
          {(['en', 'fr'] as const).map((l) => <button key={l} onClick={() => setLang(l)} className={`px-3 py-1.5 ${lang === l ? 'bg-white text-sky-800' : 'text-white hover:bg-white/10'}`}>{l.toUpperCase()}</button>)}
        </div>
      </div>
      <div className="mx-4 flex items-start pb-2 pt-3 sm:mx-6 sm:pb-3">
        {STEPS.map((st, i) => { const I = st.icon; const done = i < stepIdx; const cur = i === stepIdx; return (
          <div key={st.key} className="flex flex-1 items-start">
            <button type="button" onClick={() => jumpTo(i)} disabled={!done} className={`flex w-full flex-col items-center gap-1 ${done ? 'cursor-pointer' : 'cursor-default'}`} title={done ? (lang === 'en' ? `Back to ${st.en}` : `Retour à ${st.fr}`) : undefined}>
              <span className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition ${cur ? 'nf-step-cur border-sky-500 bg-sky-500 text-white' : done ? 'border-sky-500 bg-white text-sky-600 hover:bg-sky-50' : 'border-slate-200 bg-white text-slate-400'}`}><I className="h-4 w-4" /></span>
              <span className={`hidden text-[11px] font-semibold sm:block ${cur ? 'text-sky-700' : done ? 'text-slate-700' : 'text-slate-400'}`}>{lang === 'en' ? st.en : st.fr}</span>
            </button>
            {i < STEPS.length - 1 && <span className={`mt-[15px] h-px w-6 shrink-0 transition-colors duration-300 sm:w-10 ${i < stepIdx ? 'bg-sky-500' : 'bg-slate-200'}`} />}
          </div>); })}
      </div>
      </div>

      {callOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setCallOpen(false)}>
          <div role="dialog" aria-modal="true" className="nf-rise w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
              <p className="text-lg font-bold text-slate-900">{lang === 'en' ? 'Call Us Now' : 'Appelez-nous'}</p>
              <button type="button" onClick={() => setCallOpen(false)} className="rounded p-1 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <p className="border-b border-slate-200 px-5 py-5 text-center text-base text-slate-800">{lang === 'en' ? 'Please contact us at ' : 'Veuillez nous joindre au '}<a href={`tel:${brand.phoneDisplay.replace(/[^0-9+]/g, '')}`} className="font-bold text-sky-700 underline underline-offset-2">{brand.phoneDisplay}</a>.</p>
            <div className="flex justify-center gap-2 px-5 py-4">
              <a href={`tel:${brand.phoneDisplay.replace(/[^0-9+]/g, '')}`} className="nf-press inline-flex items-center gap-2 rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"><Phone className="h-4 w-4" /> {lang === 'en' ? 'Call' : 'Appeler'}</a>
              <button type="button" onClick={() => setCallOpen(false)} className={BACK_BTN}>{lang === 'en' ? 'Close' : 'Fermer'}</button>
            </div>
          </div>
        </div>
      )}
      <main className="px-4 py-5 sm:px-6 sm:py-6">
      <div key={stage} className={dir === 'fwd' ? 'nf-enter-fwd' : 'nf-enter-back'}>
        {/* ── 0 · WHERE ARE YOU (address first — the map pops up as soon as it's picked) ── */}
        {stage === 'where' && (
          <div>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sky-50 text-sky-600"><Truck className="nf-truck h-8 w-8" strokeWidth={1.75} /></div>
            <h1 className="mt-3 text-center text-lg font-bold text-slate-900">{lang === 'en' ? 'Where are you?' : 'Où êtes-vous?'}</h1>
            <p className="mt-1 text-center text-sm text-slate-600">{lang === 'en' ? 'Enter your address so we can check if we service your area.' : 'Entrez votre adresse pour vérifier si nous desservons votre secteur.'}</p>
            <div className="mt-5">
              <p className="mb-1 text-sm font-semibold text-slate-800">{lang === 'en' ? 'Address or postal code' : 'Adresse ou code postal'}<span className="text-red-500">*</span></p>
              <AddressAutocomplete value={addrText} onChange={(address, _p, parts?: AddressParts) => { setAddrText(address); setAddrParts(parts ?? null); setStreet(parts?.address ?? address); if (parts) { setCity(parts.city); setZip(parts.zip); } }}
                placeholder={lang === 'en' ? 'Start typing…' : 'Commencez à taper…'} className={`${PILL}${miss(!addressText.trim() || region === null)}`} />
              {addressText && (region
                ? <p className="nf-rise mt-3 text-sm font-bold text-emerald-600">✓ {lang === 'en' ? `We service ${city.trim() || 'your area'}!` : `Nous desservons ${city.trim() || 'votre secteur'}!`}</p>
                : null)}
            </div>
            <div className={FOOT}>
              {/* first step only (Anuj): an emergency tap-to-call, like the classic widget */}
              <button type="button" onClick={() => setCallOpen(true)} className="nf-press inline-flex items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"><Phone className="h-4 w-4" /> {lang === 'en' ? 'Emergency' : 'Urgence'}</button>
              <NextBtn ok={true} label={lang === 'en' ? 'Continue' : 'Continuer'} onClick={() => { if (!addressText.trim()) { setHl(true); return; } setHl(false); go(region === null ? 'oos' : 'info'); }} />
            </div>
          </div>
        )}

        {/* ── OUT OF SERVICE AREA — lead form, then thanks (no booking) ── */}
        {stage === 'oos' && (
          <div>
            <h1 className="text-lg font-bold text-slate-900 sm:text-xl">{lang === 'en' ? 'Tell us about your request' : 'Parlez-nous de votre demande'}</h1>
            <p className="mt-1 text-sm text-slate-600">{lang === 'en' ? 'Leave your details and our team will get back to you shortly.' : 'Laissez vos coordonnées et notre équipe vous reviendra sous peu.'}</p>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid grid-cols-2 gap-3 sm:col-span-2">
                <label className="block"><span className={LBL}>{lang === 'en' ? 'First Name' : 'Prénom'}<span className="text-red-500">*</span></span><input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Alex" className={`${PILL}${miss(!firstName.trim())}`} /></label>
                <label className="block"><span className={LBL}>{lang === 'en' ? 'Last Name' : 'Nom'}<span className="text-red-500">*</span></span><input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Taylor" className={`${PILL}${miss(!lastName.trim())}`} /></label>
              </div>
              <label className="block"><span className={LBL}>{lang === 'en' ? 'Phone' : 'Téléphone'}<span className="text-red-500">*</span></span><input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} inputMode="tel" placeholder="(123) 456-7890" className={`${PILL}${miss(phone.replace(/\D/g, '').length !== 10)}`} /></label>
              <label className="block"><span className={LBL}>{lang === 'en' ? 'Email' : 'Courriel'}<span className="text-red-500">*</span></span><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" className={`${PILL}${miss(!/\S+@\S+\.\S+/.test(email.trim()))}`} /></label>
            </div>
            <div className="mt-5">
              <p className="mb-2 text-[15px] font-semibold text-slate-900">{lang === 'en' ? 'Is this for your home or a business?' : 'Est-ce pour votre maison ou une entreprise?'}</p>
              <div className="flex flex-wrap gap-2">{([['residential', { en: 'Residential', fr: 'Résidentiel' }], ['commercial', { en: 'Commercial', fr: 'Commercial' }]] as [Sector, Bi][]).map(([id, l]) => <button key={id} type="button" onClick={() => setOosSector(id)} className={`nf-press rounded border px-3 py-1.5 text-[13px] font-medium ${oosSector === id ? CHIP_ON : CHIP}`}>{t(l)}</button>)}</div>
            </div>
            <div className="mt-5">
              <p className="mb-2 text-[15px] font-semibold text-slate-900">{lang === 'en' ? 'What do you need?' : 'De quoi avez-vous besoin?'} <span className="text-xs font-normal text-slate-500">{lang === 'en' ? '— pick everything that applies' : '— cochez tout ce qui s’applique'}</span></p>
              <div className={`${TILE_GRID}${hl && !oosPicks.length ? ' rounded-md ring-2 ring-rose-400 ring-offset-2' : ''}`}>{OOS_SERVICES.map((o) => { const on = oosPicks.includes(o.key); return <IconTile key={o.key} icon={o.icon} label={t(o)} on={on} check onClick={() => setOosPicks(on ? oosPicks.filter((k) => k !== o.key) : [...oosPicks, o.key])} />; })}</div>
            </div>
            {oosPicks.includes('hvac') && (
              <div className="nf-rise mt-5 space-y-4">
                <div>
                  <p className="mb-2 text-[15px] font-semibold text-slate-900">{lang === 'en' ? 'Heating & Cooling — what do you need?' : 'Chauffage et climatisation — que vous faut-il?'}</p>
                  <div className="flex flex-wrap gap-2">{HVAC_INTENTS.map((i) => <button key={i.key} type="button" onClick={() => setOosHvacIntent(oosHvacIntent === i.key ? null : i.key)} className={`nf-press rounded border px-3 py-1.5 text-[13px] font-medium ${oosHvacIntent === i.key ? CHIP_ON : CHIP}`}>{t(i)}</button>)}</div>
                </div>
                <div>
                  <p className="mb-2 text-[15px] font-semibold text-slate-900">{lang === 'en' ? 'Which equipment?' : 'Quel équipement?'} <span className="text-xs font-normal text-slate-500">{lang === 'en' ? '— optional' : '— facultatif'}</span></p>
                  <div className={TILE_GRID}>{HVAC_EQUIP.filter((e) => !e.clean).map((e) => { const on = oosHvacEquip.includes(e.key); return <IconTile key={e.key} icon={e.icon} label={t(e)} on={on} check onClick={() => setOosHvacEquip(on ? oosHvacEquip.filter((k) => k !== e.key) : [...oosHvacEquip, e.key])} />; })}</div>
                </div>
              </div>
            )}
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder={lang === 'en' ? 'Tell us a bit about the job (optional)' : 'Parlez-nous un peu du travail (facultatif)'} className={`${PILL} mt-5 resize-y`} />
            <label className={`mt-4 flex cursor-pointer items-start gap-2.5 rounded-md p-1 -m-1${hl && !agree ? ' ring-2 ring-rose-400' : ''}`}>
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-sky-600" />
              <span className="text-sm leading-snug text-slate-800">{lang === 'en' ? 'I agree to be contacted about my request and understand my information will be used in accordance with the ' : 'J’accepte d’être contacté(e) au sujet de ma demande et je comprends que mes renseignements seront utilisés conformément à la '}<a href={brand.privacyUrl} target="_blank" rel="noreferrer" className="font-semibold text-sky-700 underline underline-offset-2">{lang === 'en' ? 'privacy policy' : 'politique de confidentialité'}</a>.<span className="text-red-500">*</span></span>
            </label>
            <div className={FOOT}><BackBtn /><NextBtn ok={oosState !== 'sending'} label={oosState === 'sending' ? (lang === 'en' ? 'Sending…' : 'Envoi…') : (lang === 'en' ? 'Send request' : 'Envoyer la demande')} onClick={() => { void submitOos(); }} /></div>
          </div>
        )}
        {stage === 'oosdone' && (
          <div className="py-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50"><Check className="nf-check h-8 w-8 text-emerald-500" strokeWidth={2.5} /></div>
            <h1 className="mt-4 text-lg font-bold text-slate-900 sm:text-xl">{lang === 'en' ? `Thanks${firstName.trim() ? `, ${firstName.trim()}` : ''}!` : `Merci${firstName.trim() ? `, ${firstName.trim()}` : ''}!`}</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{lang === 'en' ? 'We’ve received your request — our team will get in touch shortly to discuss your project and next steps.' : 'Nous avons reçu votre demande — notre équipe vous contactera sous peu pour discuter de votre projet et des prochaines étapes.'}</p>
            <p className="mt-5 text-[11px] font-bold uppercase tracking-wider text-slate-500">{lang === 'en' ? 'Need us sooner?' : 'Besoin de nous plus tôt?'}</p>
            <a href={`tel:${brand.phoneDisplay.replace(/[^0-9+]/g, '')}`} className="nf-press mt-2 inline-flex items-center gap-2 rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"><Phone className="h-4 w-4" /> {brand.phoneDisplay}</a>
          </div>
        )}

        {/* ── 1 · YOUR INFO ── */}
        {stage === 'info' && (
          <div>
            <h1 className="text-lg font-bold text-slate-900 sm:text-xl">{lang === 'en' ? 'Now, a bit about you' : 'Maintenant, un peu sur vous'}</h1>
            <p className="mt-1 text-sm text-slate-600">{lang === 'en' ? 'So we can confirm your booking and reach you on the day.' : 'Pour confirmer votre réservation et vous joindre le jour même.'}</p>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* first + last side by side, even on phones (Anuj) */}
              <div className="grid grid-cols-2 gap-3 sm:col-span-2">
                <label className="block"><span className={LBL}>{lang === 'en' ? 'First Name' : 'Prénom'}<span className="text-red-500">*</span></span><input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Alex" className={`${PILL}${miss(!firstName.trim())}`} /></label>
                <label className="block"><span className={LBL}>{lang === 'en' ? 'Last Name' : 'Nom'}<span className="text-red-500">*</span></span><input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Taylor" className={`${PILL}${miss(!lastName.trim())}`} /></label>
              </div>
              <label className="block"><span className={LBL}>{lang === 'en' ? 'Phone' : 'Téléphone'}<span className="text-red-500">*</span></span><input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} inputMode="tel" placeholder="(123) 456-7890" className={`${PILL}${miss(phone.replace(/\D/g, '').length !== 10)}`} /></label>
              <label className="block"><span className={LBL}>{lang === 'en' ? 'Email' : 'Courriel'}<span className="text-red-500">*</span></span><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" className={`${PILL}${miss(!/\S+@\S+\.\S+/.test(email.trim()))}`} /></label>
            </div>
            {/* consent (required) + SMS opt-in that opens up its disclosure when ticked (Anuj) */}
            <div className="mt-4 space-y-3">
              <label className={`flex cursor-pointer items-start gap-2.5 rounded-md p-1 -m-1${hl && !agree ? ' ring-2 ring-rose-400' : ''}`}>
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-sky-600" />
                <span className="text-sm leading-snug text-slate-800">{commercial
                  ? (lang === 'en' ? 'I am authorized to request service for this property and I agree to be contacted about my service request.' : 'Je suis autorisé(e) à demander un service pour cette propriété et j’accepte d’être contacté(e) au sujet de ma demande.')
                  : (lang === 'en' ? 'I am the owner of this residential property and I agree to be contacted about my service request.' : 'Je suis propriétaire de cette résidence et j’accepte d’être contacté(e) au sujet de ma demande.')}<span className="text-red-500">*</span></span>
              </label>
              <label className="flex cursor-pointer items-start gap-2.5">
                <input type="checkbox" checked={smsOk} onChange={(e) => setSmsOk(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-sky-600" />
                <span className="min-w-0">
                  <span className="block text-sm leading-snug text-slate-800">{lang === 'en' ? 'Receive text messages about appointment' : 'Recevoir des textos au sujet du rendez-vous'}</span>
                  {smsOk && <span className="nf-rise mt-1 block text-[13px] leading-snug text-slate-500">{lang === 'en'
                    ? `By checking this box, you agree to receive text messages at the number provided related to your request, appointment updates and notifications, including messages sent by the autodialer. Consent is not a condition of purchase. Message and Data Rates may apply. Message frequency varies. You may unsubscribe to stop receiving further messages at any time by replying STOP. Text HELP for customer care information.`
                    : `En cochant cette case, vous acceptez de recevoir des textos au numéro fourni concernant votre demande, les mises à jour et notifications de rendez-vous, y compris des messages envoyés par composeur automatique. Le consentement n’est pas une condition d’achat. Des frais de messagerie et de données peuvent s’appliquer. La fréquence des messages varie. Répondez STOP pour ne plus recevoir de messages, ou HELP pour de l’aide.`}</span>}
                </span>
              </label>
            </div>
            <div className={FOOT}><BackBtn /><NextBtn ok={true} onClick={() => { if (!infoOk) { setHl(true); return; } go('sector'); }} /></div>
          </div>
        )}

        {/* ── 2 · RESIDENTIAL / COMMERCIAL ── */}
        {PICK_PAGE && (
          <div>
            <h1 className="text-lg font-bold text-slate-900 sm:text-xl">{lang === 'en' ? 'Is this for your home or a business?' : 'Est-ce pour votre maison ou une entreprise?'}</h1>
            <div className={`mt-5 ${TILE_GRID}`}>
              {([['residential', { en: 'Residential', fr: 'Résidentiel' }, { en: 'House, condo, apartment', fr: 'Maison, condo, appartement' }, Home], ['commercial', { en: 'Commercial', fr: 'Commercial' }, { en: 'Office, building, industrial', fr: 'Bureau, immeuble, industriel' }, Building2]] as [Sector, Bi, Bi, LucideIcon][]).map(([id, l, sub, I]) => (
                <IconTile key={id} icon={I} label={t(l)} title={t(sub)} on={sector === id} onClick={() => { setSector(id); setCategory(null); setSvcKey(null); reveal('cat-block'); }} />
              ))}
            </div>
            {/* the next question reveals right below (Anuj) */}
            {sector && (
              <div id="cat-block" className="mt-8 nf-rise">
                <h2 className="text-lg font-bold text-slate-900">{lang === 'en' ? 'What do you need help with?' : 'De quoi avez-vous besoin?'}</h2>
                <div className={`mt-4 ${TILE_GRID}`}>
                  <IconTile icon={Flame} label={lang === 'en' ? 'Heating & Cooling' : 'Chauffage et climatisation'} title={lang === 'en' ? 'Furnace, AC, heat pump, wall AC…' : 'Fournaise, climatiseur, thermopompe…'} on={category === 'hc'} onClick={() => { setCategory('hc'); setSvcKey(null); reveal('svc-block'); }} />
                  {/* the cleaning services sit right here (Anuj — no "Cleaning" tile); wall AC lives under Heating & Cooling */}
                  {(sector === 'commercial' ? CLEAN_COM : CLEAN_RES).filter((x) => x.key !== 'wallac' && !/carpet/i.test(x.key)).map((c) => (
                    <IconTile key={c.key} icon={iconFor(c.key)} label={t(c)} on={category === 'cleaning' && svcKey === c.key} onClick={() => { setCategory('cleaning'); pickService(c); }} />
                  ))}
                  {(sector === 'commercial' ? OTHER_COM : OTHER_RES).map((o) => (
                    <IconTile key={o.key} icon={iconFor(o.key)} label={t(o)} on={category === 'other' && svcKey === o.key} onClick={() => { setCategory('other'); setSvcKey(o.key); setHvacIntent(null); setHvacEquip([]); setAns({}); setJd({}); setHvacPick(null); setFiles([]); setPkg(null); setCompare(false); setDryerAdd('ask'); setBenefect('ask'); setDryerLoc(null); setSlot(null); setPkgConfirmed(false); setMembership(null); reveal('other-block'); }} />
                  ))}
                  {(sector === 'commercial' ? CLEAN_COM : CLEAN_RES).filter((x) => /carpet/i.test(x.key)).map((c) => (
                    <IconTile key={c.key} icon={iconFor(c.key)} label={t(c)} on={category === 'cleaning' && svcKey === c.key} onClick={() => { setCategory('cleaning'); pickService(c); }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 4 · SERVICE ── */}
        {PICK_PAGE && category === 'other' && svc && (
          <div id="other-block" className="mt-8 space-y-4 nf-rise">
            <h2 className="text-lg font-bold text-slate-900">{t(svc)}</h2>
            {softQ && chips(softQ, ans.soft, (i) => setAns((a) => ({ ...a, soft: i })))}
            <p className="rounded-md border border-pink-400/40 bg-pink-50 px-3.5 py-2.5 text-sm text-pink-700">{lang === 'en' ? "We'll come take a look — no charge, no obligation. Pick a time at the next step." : 'Nous viendrons voir — sans frais, sans obligation. Choisissez une plage à l’étape suivante.'}</p>
          </div>
        )}
        {PICK_PAGE && category === 'hc' && (
          <div id="svc-block" className="mt-8 nf-rise">
            <h2 className="text-lg font-bold text-slate-900">{lang === 'en' ? 'Heating & Cooling' : 'Chauffage et climatisation'}</h2>
            <p className="mt-1 text-sm text-slate-600">{lang === 'en' ? 'Not sure? Pick your best guess — we’ll ask a couple of simple questions next.' : 'Pas certain? Choisissez au mieux — quelques questions simples suivront.'}</p>
            {category === 'hc' && (
              <div className="mt-5 space-y-5">
                {/* equipment FIRST, then what's needed for it (Anuj) */}
                <div>
                  <p className="mb-2 text-[15px] font-semibold text-slate-900">{lang === 'en' ? 'What equipment do you need help with?' : 'Quel équipement est concerné?'}</p>
                  <div className={TILE_GRID}>{HVAC_EQUIP.map((e) => { const on = hvacEquip.includes(e.key); if (e.clean) { const wall = CLEAN_RES.find((x) => x.key === 'wallac'); return <IconTile key={e.key} icon={e.icon} label={t(e)} on={svcKey === 'wallac'} onClick={() => { if (!wall) return; setCategory('cleaning'); setHvacIntent(null); setHvacEquip([]); pickService(wall); }} />; } return <IconTile key={e.key} icon={e.icon} label={t(e)} on={on} check onClick={() => { const next = on ? hvacEquip.filter((k) => k !== e.key) : [...hvacEquip, e.key]; setHvacEquip(next); setSvcKey(next.length ? `hvac-${next.join('+')}` : null); setSlot(null); setHvacPick(null); if (next.length && next.every((k) => HVAC_EQUIP.find((x) => x.key === k)?.installOnly)) setHvacIntent('new'); if (!on && next.length === 1) setTimeout(() => revealEl('q-hvac-intent'), 60); }} />; })}</div>
                  <p className="mt-2 text-xs text-slate-500">{lang === 'en' ? 'Pick everything that applies.' : 'Cochez tout ce qui s’applique.'}</p>
                </div>
                {hvacEquip.length > 0 && (() => { const installOnly = hvacEquip.every((k) => HVAC_EQUIP.find((x) => x.key === k)?.installOnly); return (
                  <div id="q-hvac-intent" className="nf-rise">
                    <p className="mb-2 text-[15px] font-semibold text-slate-900">{lang === 'en' ? 'Please select your service' : 'Choisissez votre service'}</p>
                    <div className="flex flex-wrap gap-2">{HVAC_INTENTS.filter((i) => !installOnly || i.key === 'new').map((i) => <button key={i.key} type="button" className={`nf-press rounded border px-3 py-1.5 text-[13px] font-medium ${hvacIntent === i.key ? CHIP_ON : CHIP}`} onClick={() => { setHvacIntent(i.key); setHvacPick(null); setTimeout(() => revealEl('q-hvac-more'), 60); }}>{t(i)}</button>)}</div>
                  </div>); })()}
                {hvacEquip.length > 0 && hvacIntent && (
                  <div id="q-hvac-more" className="nf-rise">
                    <div className="space-y-5">{HVAC_QS.map((q) => chips(q, ans[q.id], (i) => setAns((a) => ({ ...a, [q.id]: i }))))}</div>
                  </div>
                )}
                {svcList.length > 0 && <p className="pt-1 text-xs font-bold uppercase tracking-widest text-slate-400">{lang === 'en' ? 'Or another service' : 'Ou un autre service'}</p>}
              </div>
            )}
            <div className={`${TILE_GRID} ${category === 'hc' ? 'mt-2' : 'mt-5'}`}>
              {svcList.map((s) => <IconTile key={s.key} icon={iconFor(s.key)} label={t(s)} on={svcKey === s.key} onClick={() => pickService(s)} />)}
            </div>
          </div>
        )}
        {/* the pick page's one footer — Continue for HVAC and the estimate services; cleaning tiles advance on tap */}
        {PICK_PAGE && <div className={FOOT}><BackBtn />{category === 'hc' ? <NextBtn ok={hvacReady} label={lang === 'en' ? 'Continue' : 'Continuer'} onClick={() => { if (hvacReady) go('hvac'); }} /> : category === 'other' && svc ? <NextBtn ok={softQ ? ans.soft !== undefined : true} label={lang === 'en' ? 'Continue' : 'Continuer'} onClick={() => { if (!softQ || ans.soft !== undefined) go('slots'); }} /> : <span />}</div>}

        {/* ── HVAC (ServiceTitan) — the panel IS the question: estimate / repair / maintenance ── */}
        {stage === 'hvac' && svc && (
          <div>
            <h1 className="mb-4 text-lg font-bold text-slate-900 sm:text-xl">{lang === 'en' ? 'When do you need us?' : 'Quand avez-vous besoin de nous?'}</h1>
            <HvacMini
              leadEventId={leadEventId}
              leadInfo={leadSnapshot()}
              prefill={{ name: `${firstName.trim()} ${lastName.trim()}`.trim(), phone, email, street, city, zip, details: message }}
              initialMode={hvacMode}
              allowedModes={[hvacMode]}
              picks={[t(svc)]}
              onBack={back}
              light
              onContinue={(p, m) => { setHvacPick({ ...p, mode: m }); go('review'); }}
            />
          </div>
        )}

        {/* ── 5 · QUESTIONS ── */}
        {DETAIL_PAGE && svc && (
          <div className="space-y-5">
            <h1 className="text-lg font-bold text-slate-900 sm:text-xl">{t(svc)}</h1>
            {svc.key === 'airduct' && DUCT_QS.map((q, qi) => (qi === 0 || ans[DUCT_QS[qi - 1].id] !== undefined)
              ? chips(q, ans[q.id], (i) => { setAns((a) => ({ ...a, [q.id]: i })); const nx = DUCT_QS[qi + 1]; if (nx) setTimeout(() => revealEl(`q-${nx.id}`), 60); })
              : null)}
            {svc.key === 'airduct' && ans.vents === 5 && (
              <div id="q-vents-exact" className={`rounded-lg ${CARD} p-4 nf-rise`}>
                <div className="flex items-center justify-between gap-3"><p className="text-sm font-bold text-slate-900">{lang === 'en' ? 'How many vents exactly?' : 'Combien de bouches exactement?'}</p>{counter(ventExact, setVentExact, 1)}</div>
              </div>
            )}
            {svc.key === 'dryer' && (
              <div>
                <p className="mb-2 text-[15px] font-semibold text-slate-900">{lang === 'en' ? 'Where does your dryer vent exit the home?' : 'Où le conduit de sécheuse sort-il de la maison?'}</p>
                <div className="flex flex-wrap gap-2">{DRYER_LOCS.map((d) => <button key={d.key} onClick={() => setDryerLoc(d.key)} className={`nf-press rounded border px-3 py-1.5 text-[13px] font-medium ${dryerLoc === d.key ? CHIP_ON : CHIP}`}>{t(d)}</button>)}</div>
                <p className="mt-2 text-xs text-slate-500">{lang === 'en' ? 'Not sure? Pick your best guess — the technician confirms on arrival.' : 'Pas certain? Choisissez au mieux — le technicien confirme à l’arrivée.'}</p>
              </div>
            )}
            {svc.key === 'wallac' && (
              <div className={`rounded-lg ${CARD} p-4`}>
                <p className="text-sm font-bold text-slate-900">{lang === 'en' ? 'How many wall-mounted units, by how high they’re installed?' : 'Combien d’unités murales, selon leur hauteur?'}</p>
                <div className="mt-3 space-y-2">{WALL_TIERS.map((tr) => <div key={tr.k} className="flex items-center justify-between"><span className="text-sm text-slate-700">{t(tr)}</span>{counter(wallUnits[tr.k], (n) => setWallUnits((w) => ({ ...w, [tr.k]: n })))}</div>)}</div>
              </div>
            )}
            {svc.key === 'carpet' && (() => {
              const K = [['carpet', { en: 'Wall-to-wall carpet', fr: 'Tapis mur à mur' }], ['rugs', { en: 'Area rugs', fr: 'Carpettes' }], ['upholstery', { en: 'Sofas & chairs', fr: 'Sofas et fauteuils' }], ['mattress', { en: 'Mattress', fr: 'Matelas' }], ['vehicle', { en: 'Vehicle', fr: 'Véhicule' }]] as [string, Bi][];
              const on = (k: string) => cp.kinds.includes(k);
              const yn = (v: boolean | null, set: (b: boolean) => void) => <div className="flex gap-2"><button onClick={() => set(true)} className={`nf-press rounded border px-3 py-1.5 text-[13px] font-medium ${v === true ? CHIP_ON : CHIP}`}>{lang === 'en' ? 'Yes' : 'Oui'}</button><button onClick={() => set(false)} className={`nf-press rounded border px-3 py-1.5 text-[13px] font-medium ${v === false ? CHIP_ON : CHIP}`}>{lang === 'en' ? 'No' : 'Non'}</button></div>;
              const block = (title: Bi, body: ReactNode) => <div className={`rounded-lg ${CARD} p-4`}><p className="mb-3 text-sm font-bold text-slate-900">{t(title)}</p>{body}</div>;
              return (<>
                <div>
                  <p className="mb-2 text-[15px] font-semibold text-slate-900">{lang === 'en' ? 'What do we need to clean? Pick all that apply.' : 'Que devons-nous nettoyer? Cochez tout ce qui s’applique.'}</p>
                  <div className="flex flex-wrap gap-2">{K.map(([k, l]) => <button key={k} onClick={() => cpSet({ kinds: on(k) ? cp.kinds.filter((x) => x !== k) : [...cp.kinds, k] })} className={`nf-press rounded border px-3 py-1.5 text-[13px] font-medium ${on(k) ? CHIP_ON : CHIP}`}>{t(l)}</button>)}</div>
                </div>
                {on('carpet') && block({ en: 'Wall-to-wall carpet', fr: 'Tapis mur à mur' }, <div className="space-y-3">
                  <div className="flex items-center justify-between"><span className="text-sm text-slate-700">{lang === 'en' ? 'How many rooms? (up to 200 sq ft each)' : 'Combien de pièces? (jusqu’à 200 pi² chacune)'}</span>{counter(cp.rooms, (n) => cpSet({ rooms: n }), 0)}</div>
                  <div className="flex items-center justify-between"><span className="text-sm text-slate-700">{lang === 'en' ? 'Stair steps? (a flight is about 13)' : 'Marches d’escalier? (un étage ≈ 13)'}</span>{counter(cp.steps, (n) => cpSet({ steps: n }), 0)}</div>
                  <div className="flex items-center justify-between gap-3"><span className="text-sm text-slate-700">{lang === 'en' ? 'A hallway too?' : 'Un couloir aussi?'}</span>{yn(cp.hallway, (b) => cpSet({ hallway: b }))}</div>
                </div>)}
                {on('rugs') && block({ en: 'Area rugs', fr: 'Carpettes' }, <div className="space-y-3">
                  <div className="flex items-center justify-between"><span className="text-sm text-slate-700">{lang === 'en' ? 'How many rugs?' : 'Combien de carpettes?'}</span>{counter(cp.rugs, (n) => cpSet({ rugs: n }), 1)}</div>
                  <div><p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">{lang === 'en' ? 'Material' : 'Matière'}</p><div className="flex gap-2">{(['synthetic', 'wool'] as const).map((m) => <button key={m} onClick={() => cpSet({ rugType: m })} className={`nf-press rounded border px-3 py-1.5 text-[13px] font-medium ${cp.rugType === m ? CHIP_ON : CHIP}`}>{m === 'wool' ? (lang === 'en' ? 'Wool' : 'Laine') : (lang === 'en' ? 'Synthetic / not sure' : 'Synthétique / pas certain')}</button>)}</div></div>
                  {cp.rugType && <div><p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">{lang === 'en' ? 'About what size?' : 'Quelle taille environ?'}</p><div className="flex flex-wrap gap-2">{RUG_SIZES.map((z, i) => <button key={i} onClick={() => cpSet({ rugSize: i })} className={`nf-press rounded border px-3 py-1.5 text-[13px] font-medium ${cp.rugSize === i ? CHIP_ON : CHIP}`}>{t(z)}</button>)}</div></div>}
                  {cp.rugSize !== null && <div><p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">{lang === 'en' ? 'Where should we clean them?' : 'Où les nettoyer?'}</p><div className="flex flex-wrap gap-2">{([['in-shop', { en: 'Pick up & clean in our shop (best result)', fr: 'Ramassage et nettoyage en atelier (meilleur résultat)' }], ['on-site', { en: 'At my home', fr: 'Chez moi' }]] as ['in-shop' | 'on-site', Bi][]).map(([w, l]) => <button key={w} onClick={() => cpSet({ rugWhere: w })} className={`nf-press rounded border px-3 py-1.5 text-[13px] font-medium ${cp.rugWhere === w ? CHIP_ON : CHIP}`}>{t(l)}</button>)}</div></div>}
                </div>)}
                {on('upholstery') && block({ en: 'Sofas & chairs', fr: 'Sofas et fauteuils' }, <div className="flex items-center justify-between gap-3"><span className="text-sm text-slate-700">{lang === 'en' ? 'How many seats in total? (sofa ≈ 3, loveseat 2, chair 1)' : 'Combien de places au total? (sofa ≈ 3, causeuse 2, fauteuil 1)'}</span>{counter(cp.seats, (n) => cpSet({ seats: n }), 1)}</div>)}
                {on('mattress') && block({ en: 'Mattress', fr: 'Matelas' }, <div className="space-y-2">
                  <div className="flex items-center justify-between"><span className="text-sm text-slate-700">{lang === 'en' ? 'Single / double' : 'Simple / double'}</span>{counter(cp.matSD, (n) => cpSet({ matSD: n }), 0)}</div>
                  <div className="flex items-center justify-between"><span className="text-sm text-slate-700">Queen / king</span>{counter(cp.matQK, (n) => cpSet({ matQK: n }), 0)}</div>
                  <div className="flex items-center justify-between"><span className="text-sm text-slate-700">{lang === 'en' ? 'Crib' : 'Lit de bébé'}</span>{counter(cp.matCrib, (n) => cpSet({ matCrib: n }), 0)}</div>
                </div>)}
                {on('vehicle') && block({ en: 'Vehicle', fr: 'Véhicule' }, <div className="flex flex-wrap gap-2">{([['car', { en: 'Car', fr: 'Voiture' }], ['suv', { en: 'SUV', fr: 'VUS' }], ['truck', { en: 'Truck', fr: 'Camion' }], ['boat', { en: 'Boat (quoted on site)', fr: 'Bateau (prix sur place)' }], ['rv', { en: 'RV (quoted on site)', fr: 'VR (prix sur place)' }]] as [string, Bi][]).map(([v, l]) => <button key={v} onClick={() => cpSet({ vehicle: v })} className={`nf-press rounded border px-3 py-1.5 text-[13px] font-medium ${cp.vehicle === v ? CHIP_ON : CHIP}`}>{t(l)}</button>)}</div>)}
                {underMin && (
                  <p className="rounded-md border border-rose-300 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
                    {lang === 'en'
                      ? <>Unfortunately we can't book this yet — this service needs a minimum of <b>{fmt(carpetMin)}</b> per visit. Add a few more items, or call <span className="font-bold">{brand.phoneDisplay}</span>.</>
                      : <>Malheureusement, nous ne pouvons pas encore réserver — ce service exige un minimum de <b>{fmt(carpetMin)}</b> par visite. Ajoutez quelques articles, ou appelez le <span className="font-bold">{brand.phoneDisplay}</span>.</>}
                  </p>
                )}
              </>);
            })()}
            {softQ && !['airduct', 'dryer', 'wallac', 'carpet'].includes(svc.key) && chips(softQ, ans.soft, (i) => setAns((a) => ({ ...a, soft: i })))}
            {svc.estimate && <p className="rounded-md border border-pink-400/40 bg-pink-50 px-3.5 py-2.5 text-sm text-pink-700">{lang === 'en' ? "We'll come take a look — no charge, no obligation. Pick a time at the next step." : 'Nous viendrons évaluer — sans frais, sans obligation. Choisissez une plage à l’étape suivante.'}</p>}
          </div>
        )}

        {/* ── RECOMMENDATION (air duct) ── */}
        {DETAIL_PAGE && svc?.key === 'airduct' && questDone && pkgPicked && (() => {
          const rec = recommendPkg(ans);
          const recPkg = DUCT_PACKAGES.find((p) => p.id === rec.id)!;
          return (
            <div id="rec-block" className="mt-8 space-y-4 nf-rise">
              <h2 className="text-lg font-bold text-slate-900">{lang === 'en' ? 'Our recommendation' : 'Notre recommandation'}</h2>
              {!compare ? (
                <div className={`rounded-lg ${CARD} p-5 ring-2 ring-sky-400`}>
                  <p className="text-xs font-bold uppercase tracking-widest text-sky-600">🏠 {t(recPkg.name)}{rec.id === 'preferred' ? ` · ${lang === 'en' ? 'Most popular' : 'Plus populaire'}` : ''}</p>
                  <p className="mt-2 text-sm text-slate-700">{t(rec.why)}</p>
                  <p className="mt-3 text-3xl font-bold text-slate-900"><span className="mr-2 text-lg font-semibold text-slate-400 line-through">{fmt(listPrice(recPkg.price))}</span>{fmt(recPkg.price)} <span className="text-xs font-semibold text-slate-500">{lang === 'en' ? `10 vents included · $${extraVentPrice} each extra` : `10 bouches incluses · ${extraVentPrice} $ par bouche en plus`}</span></p>
                  <p className="text-xs font-semibold text-emerald-600">{lang === 'en' ? `Seasonal discount of $${seasonalAmt} already applied` : `Rabais saisonnier de ${seasonalAmt} $ déjà appliqué`}</p>
                  {(() => { const d = pkgDelta(recPkg.id); return <ul className="mt-3 space-y-1">{d.base && <li className="text-xs font-bold text-slate-700">✓ {lang === 'en' ? `Everything in ${d.base.en}, plus:` : `Tout le forfait ${d.base.fr}, plus :`}</li>}{d.adds.map((inc, i) => <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />{t(inc)}</li>)}</ul>; })()}
                  <button onClick={() => setCompare(true)} className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-sky-600 hover:underline">{lang === 'en' ? 'Compare all packages →' : 'Comparer tous les forfaits →'}</button>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {DUCT_PACKAGES.map((p, pi) => {
                      const on = pkg === p.id;
                      return (
                        <button key={p.id} onClick={() => setPkg(p.id as PkgId)} className={`relative flex flex-col rounded-lg p-4 pt-5 text-left transition-all ${on ? 'bg-gradient-to-br from-sky-50 to-blue-50 ring-2 ring-sky-400' : 'bg-white ring-1 ring-slate-200 hover:bg-slate-100'}`}>
                          {pi === 1 && <span className="absolute -top-2 left-3 rounded-full bg-emerald-400/90 px-2 py-0.5 text-[9px] font-bold text-emerald-950">{lang === 'en' ? 'MOST POPULAR' : 'PLUS POPULAIRE'}</span>}
                          {p.id === rec.id && <span className="absolute -top-2 right-3 rounded-full bg-sky-400 px-2 py-0.5 text-[9px] font-bold text-white">{lang === 'en' ? 'RECOMMENDED' : 'RECOMMANDÉ'}</span>}
                          <p className="text-sm font-bold text-slate-900">{t(p.name)}</p>
                          <p className="mt-1 text-2xl font-bold text-slate-900"><span className="mr-1.5 text-sm font-semibold text-slate-400 line-through">{fmt(listPrice(p.price))}</span>{fmt(p.price)}</p>
                          <p className="text-[11px] font-semibold text-emerald-600">{lang === 'en' ? 'Seasonal discount applied' : 'Rabais saisonnier appliqué'}</p>
                          {p.tagline && <p className="mt-1 text-[11px] leading-snug text-slate-500">{t(p.tagline)}</p>}
                          {(() => { const d = pkgDelta(p.id); return <ul className="mb-3 mt-3 space-y-1">{d.adds.map((inc, i) => <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-600"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />{t(inc)}</li>)}</ul>; })()}
                          {(() => { const d = pkgDelta(p.id); return d.base ? <p className="mt-auto border-t border-slate-200/70 pt-3 pr-7 text-[11px] font-bold text-slate-700">✓ {lang === 'en' ? `Everything in ${d.base.en}` : `Tout le forfait ${d.base.fr}`}</p> : null; })()}
                          {on && <span className="absolute bottom-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-sky-400 text-white"><Check className="h-3.5 w-3.5" strokeWidth={3.5} /></span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {jobQs.length > 0 && (
                <div className={`rounded-lg ${CARD} p-4 sm:p-5`}>
                  <p className="text-sm font-bold text-slate-900">{lang === 'en' ? 'Job details' : 'Détails de la tâche'}</p>
                  <p className="mb-3 text-xs text-slate-500">{lang === 'en' ? 'Optional — an answer can add the right services to the order automatically.' : 'Facultatif — une réponse peut ajouter automatiquement les bons services.'}</p>
                  <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                    {jobQs.map((q) => (
                      <div key={q.id} className={q.options.length > 3 ? 'sm:col-span-2' : ''}>
                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">{biText(q.question, lang === 'fr')}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {q.options.map((o, i) => { const on = jd[q.id] === i; return <button key={i} onClick={() => setJd((prev) => { const n = { ...prev }; if (on) delete n[q.id]; else n[q.id] = i; return n; })} className={`rounded border px-3 py-1.5 text-[13px] font-medium transition-all ${on ? CHIP_ON : CHIP}`}>{biText(o.label, lang === 'fr')}</button>; })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                {compare ? <button onClick={() => setCompare(false)} className={BACK_BTN}>{lang === 'en' ? 'Back to recommendation' : 'Retour à la recommandation'}</button> : <span />}
                <NextBtn ok={compare ? !!pkg : true} label={pkgConfirmed ? (lang === 'en' ? 'Package selected ✓' : 'Forfait choisi ✓') : (lang === 'en' ? 'Book this package' : 'Réserver ce forfait')} onClick={() => { if (!compare) setPkg(rec.id); if (compare && !pkg) return; setPkgConfirmed(true); reveal('addons-block'); }} />
              </div>
            </div>
          );
        })()}

        {/* ── ADD-ONS (air duct): dryer vent + Benefect, plain yes/no ── */}
        {DETAIL_PAGE && svc?.key === 'airduct' && pkgConfirmed && (
          <div id="addons-block" className="mt-8 space-y-5 nf-rise">
            <h2 className="text-lg font-bold text-slate-900">{lang === 'en' ? 'While we’re there…' : 'Pendant que nous y sommes…'}</h2>
            <div className={`rounded-lg ${CARD} p-4`}>
              <p className="text-sm font-bold text-slate-900">{lang === 'en' ? 'Should we also clean your dryer vent? Lint buildup is a fire risk and slows drying.' : 'Devons-nous aussi nettoyer votre conduit de sécheuse? La charpie est un risque d’incendie et ralentit le séchage.'}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => setDryerAdd('first')} className={`nf-press rounded border px-3 py-1.5 text-[13px] font-medium ${dryerAddOn ? CHIP_ON : CHIP}`}>{lang === 'en' ? 'Yes, add it' : 'Oui, ajoutez-le'}</button>
                <button onClick={() => setDryerAdd('no')} className={`nf-press rounded border px-3 py-1.5 text-[13px] font-medium ${dryerAdd === 'no' ? CHIP_ON : CHIP}`}>{lang === 'en' ? 'No thanks' : 'Non merci'}</button>
              </div>
              {dryerAddOn && (
                <div className="mt-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{lang === 'en' ? 'Where does the dryer vent exit?' : 'Où sort le conduit?'}</p>
                  <div className="flex flex-wrap gap-2">{DRYER_LOCS.map((d) => <button key={d.key} onClick={() => setDryerAdd(d.key)} className={`rounded-md px-3 py-2 text-xs font-bold ${dryerAdd === d.key ? CHIP_ON : CHIP}`}>{t(d)}</button>)}</div>
                </div>
              )}
            </div>
            {!benefectIncluded && (dryerAdd === 'no' || DRYER_LOCS.some((d) => d.key === dryerAdd)) && <div className={`rounded-lg ${CARD} p-4`}>
              <p className="text-sm font-bold text-slate-900">{lang === 'en' ? 'Add a Benefect botanical disinfectant treatment? It kills mold, bacteria and viruses in the ducts — no harsh chemicals.' : 'Ajouter un traitement désinfectant botanique Benefect? Il élimine moisissures, bactéries et virus dans les conduits — sans produits agressifs.'}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => setBenefect(true)} className={`nf-press rounded border px-3 py-1.5 text-[13px] font-medium ${benefect === true ? CHIP_ON : CHIP}`}>{lang === 'en' ? 'Yes, add it' : 'Oui, ajoutez-le'}</button>
                <button onClick={() => setBenefect(false)} className={`nf-press rounded border px-3 py-1.5 text-[13px] font-medium ${benefect === false ? CHIP_ON : CHIP}`}>{lang === 'en' ? 'No thanks' : 'Non merci'}</button>
              </div>
            </div>}
          </div>
        )}
        {/* the ONE footer of the details screen */}
        {DETAIL_PAGE && svc && <div className={FOOT}><BackBtn /><NextBtn ok={detailReady} label={lang === 'en' ? 'Continue' : 'Continuer'} onClick={() => { if (detailReady) go('slots'); }} /></div>}

        {/* ── SLOTS — the internal tool's green windows ── */}
        {stage === 'slots' && (() => {
          const greens = (slots ?? []).filter((s) => s.quality === 'green');
          const offered = greens.length ? greens : (slots ?? []);
          const byDate = offered.reduce<Record<string, GreenSlot[]>>((m, s) => { (m[s.date] = m[s.date] || []).push(s); return m; }, {});
          const days = Object.keys(byDate).sort().map((d) => ({ date: d, slots: byDate[d].map((s) => ({ key: s.start, label: s.label })) }));
          return (
            <div>
              <h1 className="mb-4 text-lg font-bold text-slate-900 sm:text-xl">{lang === 'en' ? 'When do you need us?' : 'Quand avez-vous besoin de nous?'}</h1>
              <SlotPicker days={days} value={slot?.start ?? null} lang={lang} loading={slotsLoading}
                onPick={(_d, ps) => setSlot(ps ? offered.find((s) => s.start === ps.key) ?? null : null)}
                empty={<p className="rounded-md border border-amber-400/40 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">{lang === 'en' ? <>No openings found — call <span className="font-bold">{brand.phoneDisplay}</span>.</> : <>Aucune plage — appelez le <span className="font-bold">{brand.phoneDisplay}</span>.</>}</p>} />
              <div className={FOOT}><BackBtn /><NextBtn ok={slot !== null} label={lang === 'en' ? 'Continue' : 'Continuer'} onClick={() => go('review')} /></div>
            </div>
          );
        })()}

        {/* ── REVIEW & BOOK — the pricing reveal ── */}
        {stage === 'review' && svc && (slot || hvacPick) && (() => {
          const appt = slot ? { date: slot.date, label: slot.label } : hvacPick!;
          const mode = hvacPick?.mode ?? (svc.hvac ? hvacMode : 'estimate');
          const totalText = estimatesOnly
            ? (mode === 'repair' ? (lang === 'en' ? '$169 dispatch fee' : '169 $ de déplacement') : mode === 'maintenance' ? (lang === 'en' ? 'Quoted on site' : 'Prix sur place') : (lang === 'en' ? 'Free estimate' : 'Estimation gratuite'))
            : fmt(total);
          const tags = qaNotes().map((q) => q.split(': ').slice(1).join(': ')).filter(Boolean);
          const SvcIcon = svc.hvac ? Wrench : iconFor(svc.key);
          const H = ({ children }: { children: React.ReactNode }) => <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{children}</p>;
          const Row = ({ icon: I, children }: { icon: LucideIcon; children: React.ReactNode }) => <p className="flex items-center gap-2 text-sm text-slate-700"><I className="h-4 w-4 shrink-0 text-slate-400" />{children}</p>;
          return (
          <div className="space-y-5">
            <div>
              <H>{lang === 'en' ? 'Contact info' : 'Coordonnées'}</H>
              <p className="text-base font-bold text-slate-900">{firstName} {lastName}</p>
              <div className="mt-1.5 space-y-1.5">
                <Row icon={Phone}>{phone}</Row>
                <Row icon={Mail}>{email}</Row>
                <Row icon={MapPin}>{addressText}</Row>
              </div>
            </div>
            <div className="border-t border-slate-200 pt-4">
              <H>{lang === 'en' ? 'Summary' : 'Résumé'}</H>
              <div className="flex items-start gap-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-sky-700"><SvcIcon className="h-7 w-7" strokeWidth={1.5} /></span>
                <div className="min-w-0">
                  <p className="text-base font-bold text-slate-900">{t(svc)}</p>
                  {tags.length > 0 && <div className="mt-1 flex flex-wrap gap-1.5">{tags.map((x, i) => <span key={i} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{x}</span>)}</div>}
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                <Row icon={CalendarDays}>{new Date(appt.date + 'T12:00:00').toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', { weekday: 'short', month: 'short', day: 'numeric' })}, {appt.label}</Row>
                <Row icon={MapPin}>{[city, region === 'montreal' || region === 'quebec' ? 'QC' : 'ON', zip].filter(Boolean).join(', ')}</Row>
              </div>
              <div className="mt-3 rounded-md border border-slate-200">
                {lines.map((l, i) => <div key={i} className={`flex justify-between px-3 py-1.5 text-sm text-slate-700 ${i ? 'border-t border-slate-100' : ''}`}><span className="pr-2">{l.label}{l.note ? <span className="ml-1 text-xs text-slate-500">({l.note})</span> : null}</span>{l.text ? <span className="text-right text-xs text-slate-600">{l.text}</span> : <Money n={l.amount} />}</div>)}
                {!estimatesOnly && <>
                  <div className="flex justify-between border-t border-slate-200 px-3 py-1.5 text-sm text-slate-500"><span>{lang === 'en' ? 'Subtotal' : 'Sous-total'}</span><span className="tabular-nums">{fmt(subtotal)}</span></div>
                  {taxLines.map((tl) => <div key={tl.label} className="flex justify-between px-3 py-1 text-sm text-slate-500"><span>{tl.label}</span><span className="tabular-nums">{fmt(tl.amount)}</span></div>)}
                </>}
                <div className="flex items-baseline justify-between border-t border-slate-200 bg-slate-50 px-3 py-2"><span className="text-sm font-bold text-slate-900">Total</span><span className="text-base font-bold text-slate-900 tabular-nums">{totalText}</span></div>
              </div>
            </div>
            <div className="border-t border-slate-200 pt-4">
              <p className="text-base font-bold text-slate-900">{lang === 'en' ? 'How did you hear about us?' : 'Comment avez-vous entendu parler de nous?'}<span className="text-red-500">*</span></p>
              <select value={howHeard} onChange={(e) => setHowHeard(e.target.value)} className={`${PILL} mt-3 appearance-none${miss(howHeard === '')}`}>
                {HOW_DID_YOU_HEAR.map((o) => <option key={o.value} value={o.value}>{lang === 'en' ? o.label.en : o.label.fr}</option>)}
              </select>
            </div>
            <div className="border-t border-slate-200 pt-4">
              <p className="text-base font-bold text-slate-900">{lang === 'en' ? 'Additional details' : 'Détails supplémentaires'}</p>
              {!addressComplete && (
                <div className="mt-3">
                  <p className="mb-1 text-sm font-semibold text-slate-800">{lang === 'en' ? 'Full street address' : 'Adresse complète'} <span className="font-normal text-slate-500">— {lang === 'en' ? 'we need the number, street and city to book' : 'il nous faut le numéro, la rue et la ville pour réserver'}</span></p>
                  <AddressAutocomplete value={addrText} onChange={(address, _p, parts?: AddressParts) => { setAddrText(address); setAddrParts(parts ?? null); setStreet(parts?.address ?? address); if (parts) { setCity(parts.city); setZip(parts.zip); } }}
                    placeholder={lang === 'en' ? 'Street number and name, city*' : 'Numéro et rue, ville*'} className={`${PILL}${miss(!addressComplete)}`} />
                  {hl && !addressComplete && <p className="nf-rise mt-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{lang === 'en' ? <>Kindly enter your full street address (number, street and city) and pick it from the list — or call us at <a href={`tel:${brand.phoneDisplay.replace(/[^0-9+]/g, '')}`} className="font-bold underline">{brand.phoneDisplay}</a>.</> : <>Veuillez entrer votre adresse complète (numéro, rue et ville) et la choisir dans la liste — ou appelez-nous au <a href={`tel:${brand.phoneDisplay.replace(/[^0-9+]/g, '')}`} className="font-bold underline">{brand.phoneDisplay}</a>.</>}</p>}
                </div>
              )}
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder={lang === 'en' ? 'Provide any details here (optional)' : 'Ajoutez des détails ici (facultatif)'} className={`${PILL} mt-2 resize-y`} />
              {svc.hvac && (
                <div className="mt-3">
                  {files.length > 0 && <div className="mb-2 flex flex-wrap gap-2">{files.map((f, i) => (
                    <span key={i} className="flex items-center gap-1.5 rounded border border-slate-200 bg-slate-50 py-1 pl-1.5 pr-1 text-xs text-slate-700">
                      {f.dataURI.startsWith('data:image/') ? <img src={f.dataURI} alt="" className="h-8 w-8 rounded object-cover" /> : <Paperclip className="h-4 w-4 text-slate-400" />}
                      <span className="max-w-[140px] truncate">{f.name}</span>
                      <button type="button" onClick={() => setFiles((cur) => cur.filter((_, j) => j !== i))} className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"><X className="h-3.5 w-3.5" /></button>
                    </span>))}</div>}
                  {files.length < MAX_FILES && (
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200">
                      <Paperclip className="h-4 w-4" /> {lang === 'en' ? 'Upload Files' : 'Téléverser des fichiers'}
                      <input type="file" multiple accept="image/*,video/mp4,video/quicktime,application/pdf,.heic,.webp,.webm" className="hidden" onChange={(e) => { void addFiles(e.target.files); e.target.value = ''; }} />
                    </label>
                  )}
                  <p className="mt-1.5 text-[11px] text-slate-500">{lang === 'en' ? `Allowed file types: jpg/jpeg, png, mp4, mov, pdf, heic, webp, webm — up to ${MAX_FILES} files.` : `Types acceptés : jpg/jpeg, png, mp4, mov, pdf, heic, webp, webm — jusqu’à ${MAX_FILES} fichiers.`}</p>
                </div>
              )}
              {svc.hvac && (
                <div className="mt-5 border-t border-slate-200 pt-4">
                  <p className="text-base font-bold text-slate-900">{lang === 'en' ? 'Membership' : 'Adhésion'}</p>
                  <p className="text-sm text-slate-600">{lang === 'en' ? 'Are you interested in signing up for a membership?' : 'Souhaitez-vous adhérer à un plan d’entretien?'}</p>
                  <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-4">
                    <p className="flex items-center gap-2 text-base font-bold text-slate-900"><CalendarCheck className="h-5 w-5 text-sky-700" /> {lang === 'en' ? 'Maintenance Plan' : 'Plan d’entretien'}</p>
                    <ul className="mt-2 space-y-0.5 text-sm text-slate-700">
                      <li>{lang === 'en' ? '50% off diagnostic fees,' : '50 % de rabais sur les frais de diagnostic,'}</li>
                      <li>{lang === 'en' ? '20% off repairs,' : '20 % de rabais sur les réparations,'}</li>
                      <li>{lang === 'en' ? '20% off duct cleaning,' : '20 % de rabais sur le nettoyage de conduits,'}</li>
                      <li>{lang === 'en' ? '20% off filters and accessories.' : '20 % de rabais sur les filtres et accessoires.'}</li>
                    </ul>
                    <div className="mt-3 flex justify-center gap-2">
                      <button type="button" onClick={() => setMembership(membership === true ? null : true)} className={`nf-press rounded border px-4 py-2 text-sm font-semibold ${membership === true ? CHIP_ON : CHIP}`}>{membership === true ? '✓ ' : ''}{lang === 'en' ? 'I’m Interested' : 'Ça m’intéresse'}</button>
                      <button type="button" onClick={() => setMembership(membership === false ? null : false)} className={`nf-press rounded border px-4 py-2 text-sm font-semibold ${membership === false ? CHIP_ON : CHIP}`}>{lang === 'en' ? 'Not now' : 'Pas maintenant'}</button>
                    </div>
                  </div>
                  {membership === true && <p className="nf-rise mt-2 text-sm text-slate-800">{lang === 'en' ? 'Great! We’ll get back to you with next steps.' : 'Super! Nous vous reviendrons avec les prochaines étapes.'}</p>}
                </div>
              )}
            </div>
            <label className={`flex cursor-pointer items-start gap-2.5 rounded-md p-1 -m-1${hl && !privacyOk ? ' ring-2 ring-rose-400' : ''}`}>
              <input type="checkbox" checked={privacyOk} onChange={(e) => setPrivacyOk(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-sky-600" />
              <span className="text-sm leading-snug text-slate-800">{lang === 'en' ? <>I agree and understand that my information will be used in accordance with the company’s <a href={brand.privacyUrl} target="_blank" rel="noreferrer" className="font-semibold text-sky-700 underline underline-offset-2">privacy policy</a>.</> : <>J’accepte et je comprends que mes renseignements seront utilisés conformément à la <a href={brand.privacyUrl} target="_blank" rel="noreferrer" className="font-semibold text-sky-700 underline underline-offset-2">politique de confidentialité</a> de l’entreprise.</>}<span className="text-red-500">*</span></span>
            </label>
            {bookState === 'error' && <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">⚠ {bookError}</p>}
            <div className={FOOT}>
              <BackBtn />
              <button onClick={book} disabled={bookState === 'loading'} className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60">{bookState === 'loading' ? (lang === 'en' ? 'Booking…' : 'Réservation…') : (lang === 'en' ? 'Finish Booking' : 'Terminer la réservation')}</button>
            </div>
          </div>
        ); })()}
      </div>
      </main>
      </div>
    </div>
  );
}
