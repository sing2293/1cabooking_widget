import type { T } from './services';

export interface DryerLocation {
  id: string;
  label: T;
  price: number;
}

export interface Extra {
  id: string;
  name: T;
  description: T;
  originalPrice: number;
  bundlePrice: number;
  bundlePricePrefix?: T; // e.g. "Start" for dryer vent
  protectPrice?: number;         // fixed price for the second tier (e.g. rug on-site rate)
  originalProtectPrice?: number; // strikethrough price for protect tier
  protectPct?: number;           // second tier = bundlePrice × (1 + pct), e.g. 0.5 = Scotchgard +50%
  tierLabels?: { clean: T; protect: T }; // custom toggle labels (default Clean / Protect)
  tierNote?: T;                  // recommendation blurb shown under the toggle
  hasQuantity: boolean;
  qtyInput?: boolean;            // editable number input instead of a pure stepper (sq ft, steps, seats)
  unitLabel?: T;                 // quantity unit, e.g. "Sq Ft", "Steps", "Seats"
  defaultQty?: number;           // starting quantity when added (default 1)
  priceUnit?: T;                 // shown after the price, e.g. "/ sq ft"
  priceDisplay?: T;              // overrides the "$X.XX" render, e.g. "Quote on site" (item contributes $0)
  note?: T;                      // info note rendered on the card
  image?: string;
  dryerLocations?: DryerLocation[];
  locationsQuestion?: T;         // heading for the dryerLocations rows (defaults to the dryer question)
  forCategory?: string; // if set, only shown when this service category is selected
  forPackage?: string;  // if set, only shown when this Step-1 package is selected
}

export const TPS_RATE = 0.05;       // 5% federal tax
export const TVQ_RATE = 0.09975;    // 9.975% Quebec provincial tax

/* ── Carpet & upholstery sub-service minimum charges (per price list) ── */
export const CARPET_GROUP_MINS: Record<string, number> = {
  'carpet-wall': 199,
  'area-rug':    179,
  'mattress':    149,
  'upholstery':  149,
  'vehicle':     0, // all vehicle items priced above any minimum
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/* Whether the card shows the two-option toggle */
export function hasTierToggle(e: Extra): boolean {
  return e.protectPrice != null || e.protectPct != null;
}

/* Unit price for an extra at a given tier — single source of truth */
export function extraPrice(e: Extra, tier?: 'clean' | 'protect'): number {
  if (tier === 'protect') {
    if (e.protectPct != null) return round2(e.bundlePrice * (1 + e.protectPct));
    if (e.protectPrice != null) return e.protectPrice;
  }
  return e.bundlePrice;
}

/* Highest minimum among sub-services that have selected items
   (rugs count toward the area-rug minimum when any rug has a real size) */
export function carpetRequiredMin(selected: Record<string, number>, rugs: RugEntry[] = []): number {
  let min = 0;
  for (const [id, qty] of Object.entries(selected)) {
    if (qty <= 0) continue;
    const e = EXTRAS.find((x) => x.id === id);
    const m = e?.forPackage ? (CARPET_GROUP_MINS[e.forPackage] ?? 0) : 0;
    if (m > min) min = m;
  }
  if (rugs.some((r) => rugSqft(r) > 0) && AREA_RUG_MIN > min) min = AREA_RUG_MIN;
  return min;
}

/* ══════════════════════════════════════════════════════════════════
   Area rugs — entered per rug with real dimensions. Priced per sq ft;
   the $179 pickup minimum gates the Next button (like the other
   sub-service minimums) rather than being billed as an adjustment.
   ══════════════════════════════════════════════════════════════════ */
export const AREA_RUG_MIN = 179;

export interface RugEntry {
  id: string;                       // client-generated key
  type: 'synthetic' | 'wool';
  lengthFt: number;
  widthFt: number;
  location: 'in-shop' | 'on-site';  // on-site is half price
  protection: boolean;              // +$0.99 / sq ft
}

export const RUG_RATES = {
  synthetic: { 'in-shop': 2.05, 'on-site': 1.03 },
  wool:      { 'in-shop': 3.00, 'on-site': 1.50 },
} as const;

export const RUG_PROTECTION_RATE = 0.99;

/* Billable area — rounded up to the next whole sq ft */
export function rugSqft(rug: RugEntry): number {
  return Math.ceil(Math.max(0, rug.lengthFt) * Math.max(0, rug.widthFt));
}

export function rugLinePrice(rug: RugEntry): number {
  const rate = RUG_RATES[rug.type][rug.location] + (rug.protection ? RUG_PROTECTION_RATE : 0);
  return round2(rugSqft(rug) * rate);
}

export function rugsSubtotal(rugs: RugEntry[]): number {
  return round2(rugs.reduce((sum, r) => sum + rugLinePrice(r), 0));
}

/* ── Extras with per-row quantities (dryer vent locations, wall-unit heights) ── */

/* Total for one row-based extra */
export function extraRowsTotal(extraId: string, rowQtys: Record<string, number>): number {
  const ex = EXTRAS.find((e) => e.id === extraId);
  if (!ex?.dryerLocations) return 0;
  return ex.dryerLocations.reduce((sum, loc) => sum + loc.price * (rowQtys[loc.id] ?? 0), 0);
}

/* Combined total across every row-based extra */
export function allRowExtrasTotal(rowQtys: Record<string, number>): number {
  return EXTRAS.filter((e) => e.dryerLocations)
    .reduce((sum, e) => sum + extraRowsTotal(e.id, rowQtys), 0);
}

export const EXTRAS: Extra[] = [
  {
    id: 'extra-bathroom-fan',
    name: { en: 'Bathroom Exhaust Fan Cleaning', fr: 'Nettoyage ventilateur salle de bain' },
    description: {
      en: 'Restores proper airflow to prevent mold and moisture buildup. We use compressed air and brushing to clean the fan assembly and housing for quiet, efficient operation.',
      fr: 'Restaure une circulation d\'air adéquate pour prévenir les moisissures et l\'humidité. Nous utilisons de l\'air comprimé et des brosses pour nettoyer l\'ensemble du ventilateur.',
    },
    originalPrice: 199,
    bundlePrice: 35,
    hasQuantity: true,
    image: '/images/bathroom-fan.jpg',
  },
  {
    id: 'extra-indoor-coil',
    name: { en: 'Indoor Unit Coil (Internal System Cleaning)', fr: 'Bobine unité intérieure (nettoyage système interne)' },
    description: {
      en: 'We clean this internal "radiator" because it acts as a primary dust trap for your entire home. Since all heated and cooled air must pass through these fins, removing the buildup at the source is essential for maintaining superior air quality and unrestricted airflow.',
      fr: 'Nous nettoyons ce "radiateur" interne car il agit comme un piège à poussière principal pour toute votre maison.',
    },
    originalPrice: 249,
    bundlePrice: 49,
    hasQuantity: true,
    image: '/images/indoor-coil.jpg',
  },
  {
    id: 'extra-dryer-vent',
    name: { en: 'Dryer Vent Cleaning', fr: 'Nettoyage conduit sécheuse' },
    description: {
      en: 'Complete Fire Safety: We clean the entire vent line exclusively from the exterior using specialized, non-abrasive technology. This process reaches the dryer wall to safely eliminate hidden lint hazards.',
      fr: 'Sécurité incendie complète: Nous nettoyons toute la conduite depuis l\'extérieur avec une technologie spécialisée non abrasive pour éliminer les risques de peluches cachées.',
    },
    originalPrice: 199,
    bundlePrice: 79,
    bundlePricePrefix: { en: 'Start', fr: 'À partir' },
    hasQuantity: false,
    image: '/images/dryer-vent.png',
    dryerLocations: [
      { id: 'first-floor',    label: { en: '1st Floor',                        fr: '1er étage'                          }, price: 79  },
      { id: 'floor-2-3',      label: { en: '2nd or 3rd Floor',                 fr: '2e ou 3e étage'                     }, price: 129 },
      { id: 'roof-soffit',    label: { en: 'Roof / Soffit',                    fr: 'Toit / Soffite'                     }, price: 199 },
      { id: 'condo-building', label: { en: 'Condo or Apartment Building',      fr: 'Immeuble condo ou appartements'     }, price: 100 },
      { id: 'inside-only',    label: { en: 'Inside Only – No Exterior Access', fr: 'Intérieur seulement – Sans accès ext.' }, price: 79 },
    ],
  },
  {
    id: 'extra-dryer-cover',
    name: { en: 'Dryer Cover & Cage Installation', fr: 'Installation de couvercle/cage de sécheuse' },
    description: {
      en: 'Protective exterior vent cover or cage installed to keep out birds, rodents and debris while maintaining proper airflow. Bundle rate applies with any cleaning service.',
      fr: 'Couvercle ou cage de ventilation extérieure installé pour bloquer oiseaux, rongeurs et débris tout en maintenant une bonne circulation d\'air. Tarif forfait avec tout service de nettoyage.',
    },
    originalPrice: 349,
    bundlePrice: 149,
    bundlePricePrefix: { en: 'Start', fr: 'À partir' },
    hasQuantity: false,
    locationsQuestion: {
      en: 'Which cover/cage would you like installed?',
      fr: 'Quel couvercle/cage souhaitez-vous faire installer?',
    },
    dryerLocations: [
      { id: 'cover-plastic-white', label: { en: 'Plastic cover/cage (white)',         fr: 'Couvercle/cage en plastique (blanc)' }, price: 149 },
      { id: 'cover-plastic-black', label: { en: 'Plastic cover/cage (black-painted)', fr: 'Couvercle/cage en plastique (noir)'  }, price: 149 },
      { id: 'cover-metal-white',   label: { en: 'Metal cover/cage (white)',           fr: 'Couvercle/cage en métal (blanc)'     }, price: 199 },
      { id: 'cover-metal-black',   label: { en: 'Metal cover/cage (black-painted)',   fr: 'Couvercle/cage en métal (noir)'      }, price: 199 },
    ],
    // image: '/images/dryer-cover.jpg', — add when photo is ready
  },
  {
    id: 'extra-camera-inspection',
    name: { en: 'Vent(s) Camera Inspection', fr: 'Inspection par caméra des conduits' },
    description: {
      en: 'Video camera inspection of your duct system — verify cleanliness, locate blockages and document the condition of your vents. Up to 5 vents included, $30 per additional vent.',
      fr: 'Inspection par caméra vidéo de votre système de conduits — vérifiez la propreté, localisez les blocages et documentez l\'état de vos conduits. Jusqu\'à 5 conduits inclus, 30$ par conduit supplémentaire.',
    },
    originalPrice: 299,
    bundlePrice: 150,
    bundlePricePrefix: { en: 'Start', fr: 'À partir' },
    hasQuantity: false,
    locationsQuestion: {
      en: 'Add a camera inspection:',
      fr: 'Ajouter une inspection par caméra:',
    },
    dryerLocations: [
      { id: 'cam-base',       label: { en: 'Camera Inspection (up to 5 vents)', fr: 'Inspection caméra (jusqu\'à 5 conduits)' }, price: 150 },
      { id: 'cam-extra-vent', label: { en: 'Additional vent (each)',            fr: 'Conduit supplémentaire (chacun)'         }, price: 30  },
    ],
    // image: '/images/camera-inspection.jpg', — add when photo is ready
  },
  {
    id: 'extra-benefect',
    name: { en: 'Benefect Disinfectant', fr: 'Désinfectant Benefect' },
    description: {
      en: 'Hospital-grade botanical disinfectant fogged through your duct system. Kills bacteria, viruses, and mold spores while leaving a fresh eucalyptus scent. Safe for children, pets, and allergy sufferers.',
      fr: 'Désinfectant botanique de qualité hospitalière diffusé dans votre système de conduits. Élimine bactéries, virus et spores de moisissures avec un parfum d\'eucalyptus naturel. Sécuritaire pour enfants, animaux et personnes allergiques.',
    },
    originalPrice: 149,
    bundlePrice: 99,
    hasQuantity: false,
    image: '/images/benefect.jpg',
  },
  {
    id: 'extra-furnace-blower',
    name: { en: 'Furnace / Air Handling Unit (Blower & Motor Cleaning)', fr: 'Fournaise / Unité de traitement d\'air (nettoyage soufflante et moteur)' },
    description: {
      en: 'We use a dual Brush & Air Wash method to strip away settled dust and allergens from the blower and motor housing. By removing these contaminants at the source, we ensure they aren\'t recirculated into your home, providing you with the cleanest air possible.',
      fr: 'Nous utilisons une méthode double brosse et lavage à l\'air pour éliminer la poussière et les allergènes du logement de la soufflante et du moteur.',
    },
    originalPrice: 249,
    bundlePrice: 89,
    hasQuantity: true,
    image: '/images/furnace-blower.jpg',
  },
  {
    id: 'extra-air-exchanger',
    name: { en: 'Air Exchanger Cleaning (HRV/ERV)', fr: 'Nettoyage échangeur d\'air (VRC/VRE)' },
    description: {
      en: 'Cleaning of the HRV/ERV cabinet, motors and fans — blower, interior and exterior. Ideal for homes with electric heating.',
      fr: 'Nettoyage du cabinet VRC/VRE, des moteurs et ventilateurs — soufflante, intérieur et extérieur. Idéal pour les maisons avec chauffage électrique.',
    },
    originalPrice: 249,
    bundlePrice: 149,
    hasQuantity: true,
    image: '/images/air-exchanger.jpg',
  },
  {
    id: 'extra-outdoor-heat-pump',
    name: { en: 'Outdoor Heat Pump & Condenser Cleaning', fr: 'Nettoyage pompe à chaleur extérieure et condenseur' },
    description: {
      en: 'We deep-clean the exterior heat pump fins to remove dirt, pollen, and debris that block heat transfer. Since this unit is responsible for releasing or absorbing heat for your entire home, keeping these coils clear is essential for maximizing energy efficiency and preventing system strain.',
      fr: 'Nous nettoyons en profondeur les ailettes de la pompe à chaleur extérieure pour éliminer la saleté, le pollen et les débris qui bloquent le transfert de chaleur.',
    },
    originalPrice: 249,
    bundlePrice: 149,
    hasQuantity: true,
    image: '/images/outdoor-heat-pump.jpg',
  },
  {
    id: 'extra-wall-unit',
    name: { en: 'Wall Unit (Mini-Split)', fr: 'Unité murale (Mini-Split)' },
    description: {
      en: 'Eliminate hidden mold and restore peak efficiency. This specialized deep cleaning service uses foaming antimicrobial agents to sanitize the coil and remove biological buildup from the internal scroll fan.',
      fr: 'Éliminez les moisissures cachées et restaurez l\'efficacité maximale. Ce service utilise des agents antimicrobiens moussants pour assainir la bobine et éliminer les dépôts biologiques.',
    },
    originalPrice: 249,
    bundlePrice: 199,
    bundlePricePrefix: { en: 'Start', fr: 'À partir' },
    hasQuantity: false,
    locationsQuestion: {
      en: 'How many wall-mounted units? Select by indoor unit height:',
      fr: 'Combien d\'unités murales? Sélectionnez selon la hauteur de l\'unité intérieure:',
    },
    dryerLocations: [
      { id: 'wall-x-under-8', label: { en: '8 feet and under',             fr: '8 pieds et moins'           }, price: 199 },
      { id: 'wall-x-8-12',    label: { en: 'Between 8 and 12 feet (+$50)', fr: 'Entre 8 et 12 pieds (+50$)' }, price: 249 },
      { id: 'wall-x-over-12', label: { en: 'Over 12 feet (+$100)',         fr: 'Plus de 12 pieds (+100$)'   }, price: 299 },
    ],
    image: '/images/wall-unit.jpg',
  },
  {
    id: 'extra-uvc',
    name: { en: 'UV-C Light Kit & Installation', fr: 'Kit lumière UV-C et installation' },
    description: {
      en: 'UV-C Sanitization Kit Standard cleaning removes dust; our UV-C Sanitization Kit kills what you can\'t see. This medical-grade system continuously sterilizes your air and prevents mold growth, keeping your home smelling fresh and "Certified Clean" 24/7. Includes professional installation and the Duct Masters warranty.',
      fr: 'Le nettoyage standard élimine la poussière; notre kit UV-C tue ce que vous ne voyez pas. Ce système médical stérilise en continu votre air et prévient les moisissures, gardant votre maison fraîche et "certifiée propre" 24h/24.',
    },
    originalPrice: 475,
    bundlePrice: 349,
    hasQuantity: false,
    image: '/images/uvc.jpg',
  },

  /* ══════════════════════════════════════════════════════════════════
     Carpet & Upholstery items — grouped by Step-1 sub-package.
     Prices from the 1 Clean Air price list (wall-to-wall min $199,
     area rug min $179, mattress min $149, upholstery min $149).
     ══════════════════════════════════════════════════════════════════ */

  /* ── Wall-to-Wall Carpet (forPackage: carpet-wall) ── */
  {
    id: 'cw-rooms-1-3',
    name: { en: '1–3 Rooms (up to 200 sq ft each)', fr: '1–3 pièces (jusqu\'à 200 pi² chacune)' },
    description: {
      en: 'Wall-to-wall carpet cleaning for up to three rooms — hot water extraction with pre-treatment for stains and high-traffic areas.',
      fr: 'Nettoyage de tapis mur à mur pour jusqu\'à trois pièces — extraction à l\'eau chaude avec pré-traitement des taches et zones passantes.',
    },
    originalPrice: 199, bundlePrice: 199, hasQuantity: false,
    protectPct: 0.4,
    tierLabels: { clean: { en: '🧹 Clean', fr: '🧹 Nettoyer' }, protect: { en: '🛡️ + Disinfectant', fr: '🛡️ + Désinfectant' } },
    tierNote: {
      en: 'We recommend adding disinfectant — it helps eliminate bacteria, mold & viruses, sanitizes fibers, and reduces allergens (+40%).',
      fr: 'Nous recommandons le désinfectant — il aide à éliminer bactéries, moisissures et virus, assainit les fibres et réduit les allergènes (+40%).',
    },
    forCategory: 'carpet', forPackage: 'carpet-wall',
    image: '/images/room.jpg',
  },
  {
    id: 'cw-stairs-only',
    name: { en: 'Stairs Only (up to 49 steps)', fr: 'Escaliers seulement (jusqu\'à 49 marches)' },
    description: {
      en: 'Stairs-only carpet cleaning — covers up to 49 steps in the home.',
      fr: 'Nettoyage de tapis d\'escaliers seulement — couvre jusqu\'à 49 marches.',
    },
    originalPrice: 199, bundlePrice: 199, hasQuantity: false,
    protectPct: 0.4,
    tierLabels: { clean: { en: '🧹 Clean', fr: '🧹 Nettoyer' }, protect: { en: '🛡️ + Disinfectant', fr: '🛡️ + Désinfectant' } },
    forCategory: 'carpet', forPackage: 'carpet-wall',
    image: '/images/staircase.jpg',
  },
  {
    id: 'cw-extra-room',
    name: { en: 'Extra Room (up to 200 sq ft)', fr: 'Pièce supplémentaire (jusqu\'à 200 pi²)' },
    description: {
      en: 'Each additional room beyond the first three, up to 200 sq ft each.',
      fr: 'Chaque pièce supplémentaire au-delà des trois premières, jusqu\'à 200 pi² chacune.',
    },
    originalPrice: 40, bundlePrice: 40, hasQuantity: true,
    protectPct: 0.4,
    tierLabels: { clean: { en: '🧹 Clean', fr: '🧹 Nettoyer' }, protect: { en: '🛡️ + Disinfectant', fr: '🛡️ + Désinfectant' } },
    forCategory: 'carpet', forPackage: 'carpet-wall',
    image: '/images/room.jpg',
  },
  {
    id: 'cw-hallway',
    name: { en: 'Hallway (up to 100 sq ft)', fr: 'Couloir (jusqu\'à 100 pi²)' },
    description: {
      en: 'Hallway carpet cleaning, up to 100 sq ft each.',
      fr: 'Nettoyage de tapis de couloir, jusqu\'à 100 pi² chacun.',
    },
    originalPrice: 25, bundlePrice: 25, hasQuantity: true,
    protectPct: 0.4,
    tierLabels: { clean: { en: '🧹 Clean', fr: '🧹 Nettoyer' }, protect: { en: '🛡️ + Disinfectant', fr: '🛡️ + Désinfectant' } },
    forCategory: 'carpet', forPackage: 'carpet-wall',
    image: '/images/entry.jpg',
  },
  {
    id: 'cw-steps',
    name: { en: 'Stairs / Landing Steps', fr: 'Marches d\'escalier / palier' },
    description: {
      en: 'Add stair or landing steps to a room cleaning — priced per step.',
      fr: 'Ajoutez des marches d\'escalier ou de palier à un nettoyage de pièces — prix par marche.',
    },
    originalPrice: 4, bundlePrice: 4, hasQuantity: true, qtyInput: true,
    unitLabel: { en: 'Steps', fr: 'Marches' },
    priceUnit: { en: '/ step', fr: '/ marche' },
    protectPct: 0.4,
    tierLabels: { clean: { en: '🧹 Clean', fr: '🧹 Nettoyer' }, protect: { en: '🛡️ + Disinfectant', fr: '🛡️ + Désinfectant' } },
    forCategory: 'carpet', forPackage: 'carpet-wall',
    image: '/images/staircase.jpg',
  },

  /* ── Area Rug Cleaning (forPackage: area-rug) — handled by the RugBuilder
        component in Step 2 (per-rug dimensions, auto minimum), not by extras. ── */

  /* ── Mattress Cleaning (forPackage: mattress) — no memory foam ── */
  {
    id: 'mat-crib',
    name: { en: 'Crib Mattress (half a single)', fr: 'Matelas de lit de bébé (demi-simple)' },
    description: {
      en: 'Deep cleaning and extraction for crib mattresses. No memory foam.',
      fr: 'Nettoyage en profondeur et extraction pour matelas de lit de bébé. Pas de mousse mémoire.',
    },
    originalPrice: 99, bundlePrice: 99, hasQuantity: true,
    protectPct: 0.5,
    tierLabels: { clean: { en: '🧹 Clean', fr: '🧹 Nettoyer' }, protect: { en: '🛡️ + Scotchgard', fr: '🛡️ + Scotchgard' } },
    tierNote: {
      en: 'Add Scotchgard Protector to guard against future stains and spills (+50%).',
      fr: 'Ajoutez le protecteur Scotchgard pour prévenir les taches et dégâts futurs (+50%).',
    },
    forCategory: 'carpet', forPackage: 'mattress',
    image: '/images/additions/crib.webp',
  },
  {
    id: 'mat-single-double',
    name: { en: 'Single / Double Mattress', fr: 'Matelas simple / double' },
    description: {
      en: 'Deep cleaning and extraction for single or double mattresses. No memory foam.',
      fr: 'Nettoyage en profondeur et extraction pour matelas simple ou double. Pas de mousse mémoire.',
    },
    originalPrice: 149, bundlePrice: 149, hasQuantity: true,
    protectPct: 0.5,
    tierLabels: { clean: { en: '🧹 Clean', fr: '🧹 Nettoyer' }, protect: { en: '🛡️ + Scotchgard', fr: '🛡️ + Scotchgard' } },
    forCategory: 'carpet', forPackage: 'mattress',
    image: '/images/additions/single-double.webp',
  },
  {
    id: 'mat-queen-king',
    name: { en: 'Queen / King Mattress', fr: 'Matelas queen / king' },
    description: {
      en: 'Deep cleaning and extraction for queen or king mattresses. No memory foam.',
      fr: 'Nettoyage en profondeur et extraction pour matelas queen ou king. Pas de mousse mémoire.',
    },
    originalPrice: 199, bundlePrice: 199, hasQuantity: true,
    protectPct: 0.5,
    tierLabels: { clean: { en: '🧹 Clean', fr: '🧹 Nettoyer' }, protect: { en: '🛡️ + Scotchgard', fr: '🛡️ + Scotchgard' } },
    forCategory: 'carpet', forPackage: 'mattress',
    image: '/images/additions/king-queen.webp',
  },
  {
    id: 'mat-2-single-special',
    name: { en: '2 Single/Double Special', fr: 'Spécial 2 matelas simple/double' },
    description: {
      en: 'Two single or double mattresses cleaned together — save $99 vs individual pricing. No memory foam.',
      fr: 'Deux matelas simples ou doubles nettoyés ensemble — économisez 99$ par rapport au prix individuel. Pas de mousse mémoire.',
    },
    originalPrice: 298, bundlePrice: 199, hasQuantity: true,
    protectPct: 0.5,
    tierLabels: { clean: { en: '🧹 Clean', fr: '🧹 Nettoyer' }, protect: { en: '🛡️ + Scotchgard', fr: '🛡️ + Scotchgard' } },
    forCategory: 'carpet', forPackage: 'mattress',
    image: '/images/additions/single-double.webp',
  },

  /* ── Upholstery & Furniture (forPackage: upholstery) — no leather / memory foam ── */
  {
    id: 'uph-seat',
    name: { en: 'Upholstery Cleaning (per seat/chair)', fr: 'Nettoyage de meubles (par place/chaise)' },
    description: {
      en: 'Seat & back cushions — count each seat cushion on your sofas, sectionals, loveseats and chairs. No real/fake leather or memory foam.',
      fr: 'Coussins d\'assise et de dossier — comptez chaque place de vos sofas, sectionnels, causeuses et chaises. Pas de cuir (vrai/faux) ni de mousse mémoire.',
    },
    originalPrice: 40, bundlePrice: 40, hasQuantity: true, qtyInput: true, defaultQty: 4,
    unitLabel: { en: 'Seats', fr: 'Places' },
    priceUnit: { en: '/ seat', fr: '/ place' },
    protectPct: 0.5,
    tierLabels: { clean: { en: '🧹 Clean', fr: '🧹 Nettoyer' }, protect: { en: '🛡️ + Scotchgard', fr: '🛡️ + Scotchgard' } },
    tierNote: {
      en: 'Add Scotchgard Protector to guard your furniture against future stains and spills (+50%).',
      fr: 'Ajoutez le protecteur Scotchgard pour protéger vos meubles contre les taches futures (+50%).',
    },
    note: {
      en: 'Minimum charge $149 for upholstery cleaning.',
      fr: 'Frais minimum de 149$ pour le nettoyage de meubles.',
    },
    forCategory: 'carpet', forPackage: 'upholstery',
    image: '/images/sofa.jpg',
  },
  {
    id: 'uph-disinfectant',
    name: { en: 'Upholstery Disinfectant (per seat)', fr: 'Désinfectant pour meubles (par place)' },
    description: {
      en: 'Benefect botanical disinfectant treatment applied to each cleaned seat — kills bacteria, viruses and mold spores.',
      fr: 'Traitement désinfectant botanique Benefect appliqué sur chaque place nettoyée — élimine bactéries, virus et moisissures.',
    },
    originalPrice: 16, bundlePrice: 16, hasQuantity: true, qtyInput: true, defaultQty: 4,
    unitLabel: { en: 'Seats', fr: 'Places' },
    priceUnit: { en: '/ seat', fr: '/ place' },
    forCategory: 'carpet', forPackage: 'upholstery',
    image: '/images/benefect.jpg',
  },

  /* ── Car, Boat & RV (forPackage: vehicle) — April to October only ── */
  {
    id: 'veh-car',
    name: { en: 'Car (4–6 seats)', fr: 'Voiture (4–6 places)' },
    description: {
      en: 'Full interior shampoo and extraction for cars with 4–6 seats.',
      fr: 'Shampooing intérieur complet et extraction pour voitures de 4 à 6 places.',
    },
    originalPrice: 249, bundlePrice: 249, hasQuantity: true,
    note: {
      en: 'Vehicle cleaning is offered April to October only. Boat & RV cleaning: quote on site.',
      fr: 'Le nettoyage de véhicules est offert d\'avril à octobre seulement. Bateau et VR: soumission sur place.',
    },
    forCategory: 'carpet', forPackage: 'vehicle',
    image: '/images/additions/car.webp',
  },
  {
    id: 'veh-suv',
    name: { en: 'SUV (4–7 seats)', fr: 'VUS (4–7 places)' },
    description: {
      en: 'Full interior shampoo and extraction for SUVs with 4–7 seats.',
      fr: 'Shampooing intérieur complet et extraction pour VUS de 4 à 7 places.',
    },
    originalPrice: 275, bundlePrice: 275, hasQuantity: true,
    note: {
      en: 'Vehicle cleaning is offered April to October only. Boat & RV cleaning: quote on site.',
      fr: 'Le nettoyage de véhicules est offert d\'avril à octobre seulement. Bateau et VR: soumission sur place.',
    },
    forCategory: 'carpet', forPackage: 'vehicle',
    image: '/images/additions/suv.webp',
  },
  {
    id: 'veh-truck',
    name: { en: 'Truck', fr: 'Camion' },
    description: {
      en: 'Full interior shampoo and extraction for trucks.',
      fr: 'Shampooing intérieur complet et extraction pour camions.',
    },
    originalPrice: 289, bundlePrice: 289, hasQuantity: true,
    note: {
      en: 'Vehicle cleaning is offered April to October only. Boat & RV cleaning: quote on site.',
      fr: 'Le nettoyage de véhicules est offert d\'avril à octobre seulement. Bateau et VR: soumission sur place.',
    },
    forCategory: 'carpet', forPackage: 'vehicle',
    image: '/images/additions/truck.webp',
  },
  {
    id: 'veh-boat',
    name: { en: 'Boat', fr: 'Bateau' },
    description: {
      en: 'Boat interior cleaning — our technician will assess the size and condition and quote the price on site.',
      fr: 'Nettoyage intérieur de bateau — notre technicien évaluera la taille et l\'état et fournira une soumission sur place.',
    },
    originalPrice: 0, bundlePrice: 0, hasQuantity: false,
    priceDisplay: { en: 'Quote on site', fr: 'Soumission sur place' },
    note: {
      en: 'Vehicle cleaning is offered April to October only. Price quoted by the technician on site.',
      fr: 'Le nettoyage de véhicules est offert d\'avril à octobre seulement. Prix soumis par le technicien sur place.',
    },
    forCategory: 'carpet', forPackage: 'vehicle',
    image: '/images/additions/boat.webp',
  },
  {
    id: 'veh-rv',
    name: { en: 'RV / Motorhome', fr: 'VR / Autocaravane' },
    description: {
      en: 'RV interior cleaning — our technician will assess the size and condition and quote the price on site.',
      fr: 'Nettoyage intérieur de VR — notre technicien évaluera la taille et l\'état et fournira une soumission sur place.',
    },
    originalPrice: 0, bundlePrice: 0, hasQuantity: false,
    priceDisplay: { en: 'Quote on site', fr: 'Soumission sur place' },
    note: {
      en: 'Vehicle cleaning is offered April to October only. Price quoted by the technician on site.',
      fr: 'Le nettoyage de véhicules est offert d\'avril à octobre seulement. Prix soumis par le technicien sur place.',
    },
    forCategory: 'carpet', forPackage: 'vehicle',
    image: '/images/additions/rv.webp',
  },
];
