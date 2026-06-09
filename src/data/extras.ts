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
  protectPrice?: number;         // "Protect & Disinfect" tier price
  originalProtectPrice?: number; // strikethrough price for protect tier
  hasQuantity: boolean;
  image?: string;
  dryerLocations?: DryerLocation[];
  forCategory?: string; // if set, only shown when this service category is selected
}

export const TPS_RATE = 0.05;       // 5% federal tax
export const TVQ_RATE = 0.09975;    // 9.975% Quebec provincial tax

export const EXTRAS: Extra[] = [
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
      { id: 'ground',       label: { en: 'Ground level (No ladder)',                    fr: 'Niveau du sol (sans échelle)'            }, price: 79  },
      { id: 'under-deck',   label: { en: "Under Deck (3' min clearance)",               fr: "Sous la terrasse (3' min)"               }, price: 129 },
      { id: 'small-ladder', label: { en: 'Small Ladder (14 foot)',                      fr: 'Petite échelle (14 pieds)'               }, price: 129 },
      { id: 'big-ladder',   label: { en: 'Big Ladder (22 foot)',                        fr: 'Grande échelle (22 pieds)'               }, price: 199 },
      { id: 'rooftop',      label: { en: 'Rooftop / Difficult Access (Access Provided)',fr: 'Toit / Accès difficile (accès fourni)'   }, price: 129 },
      { id: 'inside-only',  label: { en: 'Inside Only – No Exterior Access',            fr: 'Intérieur seulement – Sans accès ext.'   }, price: 79  },
    ],
  },
  {
    id: 'extra-bathroom-fan',
    name: { en: 'Bathroom Exhaust Fan Cleaning', fr: 'Nettoyage ventilateur salle de bain' },
    description: {
      en: 'Restores proper airflow to prevent mold and moisture buildup. We use compressed air and brushing to clean the fan assembly and housing for quiet, efficient operation.',
      fr: 'Restaure une circulation d\'air adéquate pour prévenir les moisissures et l\'humidité. Nous utilisons de l\'air comprimé et des brosses pour nettoyer l\'ensemble du ventilateur.',
    },
    originalPrice: 199,
    bundlePrice: 30,
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
    name: { en: 'Air Exchanger Cleaning', fr: 'Nettoyage échangeur d\'air' },
    description: {
      en: 'Standalone cleaning for HRV/ERV units and dedicated ducts. Ideal for homes with electric heating.',
      fr: 'Nettoyage autonome pour les unités VRC/VRE et les conduits dédiés. Idéal pour les maisons avec chauffage électrique.',
    },
    originalPrice: 349,
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
    hasQuantity: true,
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

  /* ── Carpet & Upholstery items (only shown for carpet category) ── */
  {
    id: 'carpet-room',
    name: { en: 'Room (up to 200 sq ft)', fr: 'Pièce (jusqu\'à 200 pi²)' },
    description: { en: 'Standard room carpet cleaning up to 200 sq ft.', fr: 'Nettoyage de tapis pour pièce standard jusqu\'à 200 pi².' },
    originalPrice: 59, bundlePrice: 49, protectPrice: 61, originalProtectPrice: 71, hasQuantity: true, forCategory: 'carpet',
    image: '/images/room.jpg',
  },
  {
    id: 'carpet-bath-laundry',
    name: { en: 'Bath / Laundry', fr: 'Bain / Buanderie' },
    description: { en: 'Carpet or mat cleaning in bathroom or laundry room.', fr: 'Nettoyage tapis salle de bain ou buanderie.' },
    originalPrice: 36, bundlePrice: 26, protectPrice: 32, originalProtectPrice: 42, hasQuantity: true, forCategory: 'carpet',
    image: '/images/bath.jpg',
  },
  {
    id: 'carpet-entry-hall',
    name: { en: 'Entry / Hall', fr: 'Entrée / Couloir' },
    description: { en: 'Entryway or hallway carpet cleaning.', fr: 'Nettoyage tapis d\'entrée ou couloir.' },
    originalPrice: 36, bundlePrice: 26, protectPrice: 32, originalProtectPrice: 42, hasQuantity: true, forCategory: 'carpet',
    image: '/images/entry.jpg',
  },
  {
    id: 'carpet-staircase',
    name: { en: 'Staircase', fr: 'Escalier' },
    description: { en: 'Full staircase carpet cleaning.', fr: 'Nettoyage complet du tapis d\'escalier.' },
    originalPrice: 66, bundlePrice: 56, protectPrice: 69, originalProtectPrice: 79, hasQuantity: true, forCategory: 'carpet',
    image: '/images/staircase.jpg',
  },
  {
    id: 'carpet-sofa',
    name: { en: 'Sofa', fr: 'Sofa' },
    description: { en: 'Upholstery cleaning for a standard sofa.', fr: 'Nettoyage tissu pour sofa standard.' },
    originalPrice: 99, bundlePrice: 89, protectPrice: 115, originalProtectPrice: 125, hasQuantity: true, forCategory: 'carpet',
    image: '/images/sofa.jpg',
  },
  {
    id: 'carpet-sofa-large',
    name: { en: 'Sofa (Over 7ft)', fr: 'Sofa (Plus de 7 pi)' },
    description: { en: 'Upholstery cleaning for an oversized sofa over 7ft.', fr: 'Nettoyage tissu pour grand sofa de plus de 7 pi.' },
    originalPrice: 137, bundlePrice: 127, protectPrice: 155, originalProtectPrice: 165, hasQuantity: true, forCategory: 'carpet',
    image: '/images/sofa_big.jpg',
  },
  {
    id: 'carpet-sectional',
    name: { en: 'Sectional', fr: 'Sectionnel' },
    description: { en: 'Full sectional sofa upholstery cleaning.', fr: 'Nettoyage tissu pour sofa sectionnel complet.' },
    originalPrice: 205, bundlePrice: 195, protectPrice: 265, originalProtectPrice: 275, hasQuantity: true, forCategory: 'carpet',
    image: '/images/sectional.jpg',
  },
  {
    id: 'carpet-sectional-large',
    name: { en: 'Sectional (Over 12ft)', fr: 'Sectionnel (Plus de 12 pi)' },
    description: { en: 'Upholstery cleaning for oversized sectional over 12ft.', fr: 'Nettoyage tissu pour grand sectionnel de plus de 12 pi.' },
    originalPrice: 265, bundlePrice: 255, protectPrice: 295, originalProtectPrice: 305, hasQuantity: true, forCategory: 'carpet',
    image: '/images/sectional_big.jpg',
  },
  {
    id: 'carpet-loveseat',
    name: { en: 'Loveseat (2 seats)', fr: 'Causeuse (2 places)' },
    description: { en: 'Upholstery cleaning for a loveseat.', fr: 'Nettoyage tissu pour causeuse.' },
    originalPrice: 99, bundlePrice: 89, protectPrice: 115, originalProtectPrice: 125, hasQuantity: true, forCategory: 'carpet',
    image: '/images/loveseat.jpg',
  },
  {
    id: 'carpet-chair',
    name: { en: 'Chair', fr: 'Chaise' },
    description: { en: 'Upholstery cleaning for an armchair.', fr: 'Nettoyage tissu pour fauteuil.' },
    originalPrice: 59, bundlePrice: 49, protectPrice: 61, originalProtectPrice: 71, hasQuantity: true, forCategory: 'carpet',
    image: '/images/chair.jpg',
  },
  {
    id: 'carpet-ottoman',
    name: { en: 'Ottoman', fr: 'Pouf' },
    description: { en: 'Upholstery cleaning for an ottoman.', fr: 'Nettoyage tissu pour pouf.' },
    originalPrice: 24, bundlePrice: 14, protectPrice: 18, originalProtectPrice: 28, hasQuantity: true, forCategory: 'carpet',
    image: '/images/ottoman.jpg',
  },
  {
    id: 'carpet-dining-chair',
    name: { en: 'Dining Room Chair', fr: 'Chaise de salle à manger' },
    description: { en: 'Upholstery cleaning for a dining room chair.', fr: 'Nettoyage tissu pour chaise de salle à manger.' },
    originalPrice: 41, bundlePrice: 31, protectPrice: 39, originalProtectPrice: 49, hasQuantity: true, forCategory: 'carpet',
    image: '/images/dining.jpg',
  },
  {
    id: 'carpet-chaise',
    name: { en: 'Chaise', fr: 'Chaise longue' },
    description: { en: 'Upholstery cleaning for a chaise lounge.', fr: 'Nettoyage tissu pour chaise longue.' },
    originalPrice: 69, bundlePrice: 59, protectPrice: 71, originalProtectPrice: 81, hasQuantity: true, forCategory: 'carpet',
    image: '/images/chaise.jpg',
  },
];
