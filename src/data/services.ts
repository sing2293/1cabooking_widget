export type Lang = 'en' | 'fr';
export type T = Record<Lang, string>;

export interface ScanBanner {
  text: T;
  color: 'purple' | 'green' | 'navy';
}

export interface DryerLocation {
  id: string;
  label: T;
  price: number;
}

export interface ServicePackage {
  id: string;
  name: T;
  price: number;
  priceDisplay?: T;     // overrides the "$X.XX" price render, e.g. "From $199"
  priceLabel?: T;       // e.g. "STARTING AT"
  priceNote?: T;        // e.g. "+ VENTS"
  badge?: { text: T; color: 'purple' | 'green' };
  subtitle?: T;
  description: T;
  bulletPoints?: T[];
  tagline?: T;
  includes: T[];
  whyChoose?: T[];
  scanBanner?: ScanBanner;
  hasVentCount?: boolean;
  unitLabel?: T;        // "furnaces" | "units"
  dryerLocations?: DryerLocation[];
  locationsQuestion?: T; // heading for the dryerLocations rows (defaults to the dryer question)
  image?: string;
}

export interface ServiceCategory {
  id: string;
  name: T;
  description: T;
  icon: 'central-air' | 'wall-unit' | 'dryer' | 'air-exchanger' | 'specialty' | 'carpet';
  mostPopular?: boolean;
  packages: ServicePackage[];
}

export const SERVICES: ServiceCategory[] = [
  {
    id: 'central-air',
    name: { en: 'Air Duct Cleaning – Central System (Furnace)', fr: 'Nettoyage des conduits d\'air – Système central (fournaise)' },
    description: { en: 'Improve air quality and system efficiency throughout your home.', fr: 'Améliorez la qualité de l\'air et l\'efficacité de votre système dans toute la maison.' },
    icon: 'central-air',
    mostPopular: true,
    packages: [
      {
        id: 'basic',
        name: { en: 'Basic Package', fr: 'Forfait de base' },
        subtitle: { en: 'Air duct cleaning', fr: 'Nettoyage des conduits d\'air' },
        price: 249,
        priceNote: { en: '+ VENTS', fr: '+ BOUCHES' },
        description: {
          en: 'A simple and effective solution to clean your ducts and improve airflow.',
          fr: 'Une solution simple et efficace pour nettoyer vos conduits et améliorer la circulation d\'air.',
        },
        bulletPoints: [
          { en: 'Cleaning of main ducts', fr: 'Nettoyage des conduits principaux' },
          { en: 'Removes accumulated dust', fr: 'Élimine la poussière accumulée' },
          { en: 'Improves airflow', fr: 'Améliore la circulation d\'air' },
        ],
        tagline: { en: 'Ideal for regular maintenance', fr: 'Idéal pour l\'entretien régulier' },
        includes: [
          { en: 'Compressed air duct cleaning (push/pull method)', fr: 'Nettoyage des conduits à air comprimé (méthode poussée/traction)' },
          { en: 'Mechanical brushing and agitation of each duct to remove contaminants', fr: 'Brossage mécanique et agitation de chaque conduit pour éliminer les contaminants' },
          { en: 'High-powered equipment with HEPA-filtered vacuum (15,000 CFM)', fr: 'Équipement haute puissance avec aspirateur à filtre HEPA (15 000 PCM)' },
          { en: 'Main supply & return ducts cleaned', fr: 'Conduits d\'alimentation et de retour principaux nettoyés' },
          { en: '10 vents included ($15 per additional vent)', fr: '10 bouches incluses (15$ par bouche supplémentaire)' },
          { en: 'Before & after photos of the main duct', fr: 'Photos avant et après du conduit principal' },
        ],
        whyChoose: [
          { en: 'Over 35 years of experience', fr: 'Plus de 35 ans d\'expérience' },
          { en: 'NADCA-certified technicians', fr: 'Techniciens certifiés NADCA' },
          { en: 'Award-winning company – Consumer Choice Award', fr: 'Entreprise primée – Prix du choix des consommateurs' },
          { en: '30-day satisfaction guarantee', fr: 'Garantie de satisfaction 30 jours' },
        ],
        hasVentCount: true,
        unitLabel: { en: 'furnaces', fr: 'fournaises' },
        image: '/images/basic.jpg',
      },
      {
        id: 'preferred',
        name: { en: 'Performance Package', fr: 'Forfait Performance' },
        subtitle: { en: 'Air duct cleaning + key system components', fr: 'Nettoyage des conduits + composants clés du système' },
        price: 338,
        priceNote: { en: '+ VENTS', fr: '+ BOUCHES' },
        description: {
          en: 'Includes air duct cleaning plus deep cleaning of key components like the blower and motor. Improves efficiency, extends system life, and enhances air quality.',
          fr: 'Comprend le nettoyage des conduits plus le nettoyage en profondeur des composants clés comme la soufflante et le moteur. Améliore l\'efficacité, prolonge la durée de vie du système et améliore la qualité de l\'air.',
        },
        bulletPoints: [
          { en: 'Complete duct cleaning (push/pull method)', fr: 'Nettoyage complet des conduits (méthode pousser/tirer)' },
          { en: 'Blower and motor cleaning', fr: 'Nettoyage soufflante et moteur' },
          { en: 'Boosts performance and lifespan', fr: 'Améliore la performance et la durée de vie' },
        ],
        tagline: { en: 'Better performance and protection than basic duct cleaning', fr: 'Meilleure performance et protection que le nettoyage de base' },
        includes: [
          { en: 'Compressed air duct cleaning (push/pull method)', fr: 'Nettoyage des conduits à air comprimé (méthode poussée/traction)' },
          { en: 'Mechanical brushing and agitation of each duct to remove contaminants', fr: 'Brossage mécanique et agitation de chaque conduit pour éliminer les contaminants' },
          { en: 'High-powered equipment with HEPA-filtered vacuum (15,000 CFM)', fr: 'Équipement haute puissance avec aspirateur à filtre HEPA (15 000 PCM)' },
          { en: 'Main supply & return ducts cleaned', fr: 'Conduits d\'alimentation et de retour principaux nettoyés' },
          { en: '10 vents included ($15 per additional vent)', fr: '10 bouches incluses (15$ par bouche supplémentaire)' },
          { en: 'Blower, motor, and furnace cabinet cleaning', fr: 'Nettoyage de la soufflante, du moteur et du cabinet de fournaise' },
          { en: 'Dust & Air Flow Test Scan (Value $100)', fr: 'Analyse poussière et test débit d\'air (valeur 100$)' },
          { en: 'Before & after photos of the main duct', fr: 'Photos avant et après du conduit principal' },
        ],
        whyChoose: [
          { en: 'Over 35 years of experience', fr: 'Plus de 35 ans d\'expérience' },
          { en: 'NADCA-certified technicians', fr: 'Techniciens certifiés NADCA' },
          { en: 'Award-winning company – Consumer Choice Award', fr: 'Entreprise primée – Prix du choix des consommateurs' },
          { en: '30-day satisfaction guarantee', fr: 'Garantie de satisfaction 30 jours' },
        ],
        scanBanner: {
          text: { en: 'DUST LEVEL + AIR FLOW TEST SCAN INCLUDED ($100 VALUE)', fr: 'ANALYSE POUSSIÈRE + TEST DÉBIT D\'AIR INCLUSE (VALEUR 100$)' },
          color: 'navy',
        },
        hasVentCount: true,
        unitLabel: { en: 'furnaces', fr: 'fournaises' },
        image: '/images/preferred.jpg',
      },
      {
        id: 'healthy-home',
        name: { en: 'Healthy Home Package', fr: 'Forfait Maison Saine' },
        subtitle: { en: 'Complete HVAC System Cleaning (Best Value & Protection)', fr: 'Nettoyage complet du système CVAC (meilleure valeur et protection)' },
        price: 486,
        priceNote: { en: '+ VENTS', fr: '+ BOUCHES' },
        badge: {
          text: { en: 'RECOMMENDED', fr: 'RECOMMANDÉ' },
          color: 'green',
        },
        description: {
          en: 'Full system cleaning (ducts, blower, coils) plus deep ventilation cleaning with natural disinfectant. Delivers cleaner air, better performance, and maximum protection.',
          fr: 'Nettoyage complet du système (conduits, soufflante, bobines) plus nettoyage en profondeur de la ventilation avec désinfectant naturel. Un air plus propre, de meilleures performances et une protection maximale.',
        },
        bulletPoints: [
          { en: 'Complete duct cleaning (push/pull method)', fr: 'Nettoyage complet des conduits (méthode pousser/tirer)' },
          { en: 'Blower, motor, and cabinet cleaning', fr: 'Nettoyage soufflante, moteur et cabinet' },
          { en: 'Coil (evaporator) cleaning', fr: 'Nettoyage de la bobine (évaporateur)' },
          { en: 'Dust analysis + airflow test included', fr: 'Analyse de poussière + test de débit d\'air inclus' },
        ],
        tagline: { en: 'Our most complete solution for health, safety, and performance — best value overall', fr: 'Notre solution la plus complète pour la santé, la sécurité et la performance — meilleure valeur globale' },
        includes: [
          { en: 'Compressed air duct cleaning (push/pull method)', fr: 'Nettoyage des conduits à air comprimé (méthode poussée/traction)' },
          { en: 'Mechanical brushing and agitation of each duct to remove contaminants', fr: 'Brossage mécanique et agitation de chaque conduit pour éliminer les contaminants' },
          { en: 'High-powered equipment with HEPA-filtered vacuum (15,000 CFM)', fr: 'Équipement haute puissance avec aspirateur à filtre HEPA (15 000 PCM)' },
          { en: 'Main supply & return ducts cleaned', fr: 'Conduits d\'alimentation et de retour principaux nettoyés' },
          { en: '10 vents included ($15 per additional vent)', fr: '10 bouches incluses (15$ par bouche supplémentaire)' },
          { en: 'Blower, motor, and cabinet cleaning', fr: 'Nettoyage de la soufflante, du moteur et du cabinet' },
          { en: 'Coil (evaporator) cleaning', fr: 'Nettoyage de la bobine (évaporateur)' },
          { en: 'Benefect disinfection included (Value $100)', fr: 'Désinfection Benefect incluse (valeur 100$)' },
          { en: 'Dust & Air Flow Test Scan (Value $100)', fr: 'Analyse poussière et test débit d\'air (valeur 100$)' },
          { en: 'Before & after photos of the main duct', fr: 'Photos avant et après du conduit principal' },
        ],
        whyChoose: [
          { en: 'Over 35 years of experience', fr: 'Plus de 35 ans d\'expérience' },
          { en: 'NADCA-certified technicians', fr: 'Techniciens certifiés NADCA' },
          { en: 'Award-winning company – Consumer Choice Award', fr: 'Entreprise primée – Prix du choix des consommateurs' },
          { en: '30-day satisfaction guarantee', fr: 'Garantie de satisfaction 30 jours' },
        ],
        scanBanner: {
          text: { en: 'DUST LEVEL + AIR FLOW TEST SCAN INCLUDED ($100 VALUE)', fr: 'ANALYSE POUSSIÈRE + TEST DÉBIT D\'AIR INCLUSE (VALEUR 100$)' },
          color: 'green',
        },
        hasVentCount: true,
        unitLabel: { en: 'furnaces', fr: 'fournaises' },
        image: '/images/healthy-home.jpg',
      },
    ],
  },
  {
    id: 'dryer-vent',
    name: { en: 'Dryer Vent Cleaning', fr: 'Nettoyage de conduit de sécheuse' },
    description: { en: 'Reduce fire hazards and improve your dryer\'s performance.', fr: 'Réduisez les risques d\'incendie et améliorez la performance de votre sécheuse.' },
    icon: 'dryer',
    packages: [
      {
        id: 'dryer-vent-cleaning',
        name: { en: 'Dryer Vent Cleaning', fr: 'Nettoyage conduit sécheuse' },
        price: 199,
        priceLabel: { en: 'STARTING AT', fr: 'À PARTIR DE' },
        description: {
          en: 'Complete Fire Safety: We clean the entire vent line exclusively from the exterior using specialized, non-abrasive technology. This process reaches the dryer wall to safely eliminate hidden lint hazards.',
          fr: 'Sécurité incendie complète: Nous nettoyons toute la conduite de ventilation depuis l\'extérieur avec une technologie spécialisée et non abrasive. Ce processus atteint le mur du sécheuse pour éliminer les risques de peluches cachées.',
        },
        includes: [
          { en: 'Entire Duct Line Cleaned (From exterior to dryer wall)', fr: 'Toute la conduite nettoyée (de l\'extérieur jusqu\'au mur)' },
          { en: 'Exterior Vent Cover Cleaning', fr: 'Nettoyage de la grille d\'aération extérieure' },
        ],
        dryerLocations: [
          { id: 'first-floor',    label: { en: '1st Floor',                        fr: '1er étage'                          }, price: 199 },
          { id: 'floor-2-3',      label: { en: '2nd or 3rd Floor',                 fr: '2e ou 3e étage'                     }, price: 219 },
          { id: 'roof-soffit',    label: { en: 'Roof / Soffit',                    fr: 'Toit / Soffite'                     }, price: 299 },
          { id: 'condo-building', label: { en: 'Condo or Apartment Building',      fr: 'Immeuble condo ou appartements'     }, price: 349 },
          { id: 'inside-only',    label: { en: 'Inside Only – No Exterior Access', fr: 'Intérieur seulement – Sans accès ext.' }, price: 199 },
        ],
        image: '/images/dryer-vent.webp',
      },
      {
        id: 'dryer-cover-install',
        name: { en: 'Dryer Cover & Cage Installation', fr: 'Installation de couvercle/cage de sécheuse' },
        price: 349,
        priceLabel: { en: 'STARTING AT', fr: 'À PARTIR DE' },
        description: {
          en: 'Standalone installation of a protective exterior vent cover or cage — keeps out birds, rodents and debris while maintaining proper airflow. Bundle it with any cleaning service for a better rate.',
          fr: 'Installation autonome d\'un couvercle ou d\'une cage de ventilation extérieure — bloque oiseaux, rongeurs et débris tout en maintenant une bonne circulation d\'air. Combinez avec un service de nettoyage pour un meilleur tarif.',
        },
        includes: [
          { en: 'Professional installation included', fr: 'Installation professionnelle incluse' },
          { en: 'Keeps out birds, rodents & debris', fr: 'Bloque oiseaux, rongeurs et débris' },
        ],
        locationsQuestion: {
          en: 'Which cover/cage would you like installed?',
          fr: 'Quel couvercle/cage souhaitez-vous faire installer?',
        },
        dryerLocations: [
          { id: 'cover-only-plastic-white', label: { en: 'Plastic cover/cage (white)',            fr: 'Couvercle/cage en plastique (blanc)' }, price: 349 },
          { id: 'cover-only-plastic-black', label: { en: 'Plastic cover/cage (black-painted)',    fr: 'Couvercle/cage en plastique (noir)'  }, price: 349 },
          { id: 'cover-only-metal-white',   label: { en: 'Metal cover/cage (white)',              fr: 'Couvercle/cage en métal (blanc)'     }, price: 399 },
          { id: 'cover-only-metal-black',   label: { en: 'Metal cover/cage (black-painted)',      fr: 'Couvercle/cage en métal (noir)'      }, price: 399 },
          { id: 'cover-only-roof-extra',    label: { en: 'Roof/Soffit installation (extra)',      fr: 'Installation toit/soffite (suppl.)'  }, price: 200 },
        ],
        // image: '/images/dryer-cover.jpg', — add when photo is ready
      },
    ],
  },
  {
    id: 'carpet',
    name: { en: 'Carpet & Upholstery Cleaning', fr: 'Nettoyage de tapis, meubles et carpettes' },
    description: { en: 'Deep steam cleaning for carpets, rugs & furniture.', fr: 'Nettoyage vapeur en profondeur pour tapis et meubles.' },
    icon: 'carpet',
    packages: [
      {
        id: 'carpet-wall',
        name: { en: 'Wall-to-Wall Carpet Cleaning', fr: 'Nettoyage de tapis mur à mur' },
        price: 0,
        priceDisplay: { en: 'From $199', fr: 'Dès 199$' },
        priceLabel: { en: 'MINIMUM CHARGE', fr: 'FRAIS MINIMUM' },
        description: {
          en: 'Hot water extraction for wall-to-wall carpet — rooms, hallways and stairs. Minimum charge $199. Select your rooms and areas at the next step.',
          fr: 'Extraction à l\'eau chaude pour tapis mur à mur — pièces, couloirs et escaliers. Frais minimum de 199$. Sélectionnez vos pièces à l\'étape suivante.',
        },
        includes: [
          { en: 'Hot Water Extraction (Steam Cleaning)', fr: 'Extraction à l\'eau chaude (nettoyage vapeur)' },
          { en: 'Pre-treatment for stains & high-traffic areas', fr: 'Pré-traitement des taches et zones à fort passage' },
          { en: 'Deodorizing treatment included', fr: 'Traitement désodorisant inclus' },
          { en: '30-Day Satisfaction Guarantee', fr: 'Garantie de satisfaction 30 jours' },
        ],
        image: '/images/room.jpg',
      },
      {
        id: 'area-rug',
        name: { en: 'Area Rug Cleaning', fr: 'Nettoyage de carpettes' },
        price: 0,
        priceDisplay: { en: 'From $179', fr: 'Dès 179$' },
        priceLabel: { en: 'MINIMUM CHARGE', fr: 'FRAIS MINIMUM' },
        description: {
          en: 'Priced per sq ft — polyester/synthetic or wool/specialty rugs. In-shop cleaning includes pickup & delivery; on-site cleaning is half price. Minimum charge $179 per pickup.',
          fr: 'Prix au pi² — carpettes synthétiques ou de laine/spécialité. Le nettoyage en atelier inclut cueillette et livraison; sur place à moitié prix. Frais minimum de 179$ par cueillette.',
        },
        includes: [
          { en: 'Pickup & delivery included (in-shop)', fr: 'Cueillette et livraison incluses (atelier)' },
          { en: 'On-site cleaning available at half price', fr: 'Nettoyage sur place disponible à moitié prix' },
          { en: 'Optional protective treatment ($0.99/sq ft)', fr: 'Traitement protecteur optionnel (0,99$/pi²)' },
          { en: '30-Day Satisfaction Guarantee', fr: 'Garantie de satisfaction 30 jours' },
        ],
        image: '/images/additions/rug.webp',
      },
      {
        id: 'mattress',
        name: { en: 'Mattress Cleaning', fr: 'Nettoyage de matelas' },
        price: 0,
        priceDisplay: { en: 'From $149', fr: 'Dès 149$' },
        priceLabel: { en: 'MINIMUM CHARGE', fr: 'FRAIS MINIMUM' },
        description: {
          en: 'Deep cleaning and extraction for crib, single/double and queen/king mattresses. No memory foam. Minimum charge $149.',
          fr: 'Nettoyage en profondeur et extraction pour matelas de bébé, simple/double et queen/king. Pas de mousse mémoire. Frais minimum de 149$.',
        },
        includes: [
          { en: 'Deep extraction cleaning', fr: 'Nettoyage par extraction en profondeur' },
          { en: 'Optional Scotchgard Protector (+50%)', fr: 'Protecteur Scotchgard optionnel (+50%)' },
          { en: '2 Single/Double Special — save $99', fr: 'Spécial 2 simples/doubles — économisez 99$' },
          { en: '30-Day Satisfaction Guarantee', fr: 'Garantie de satisfaction 30 jours' },
        ],
        image: '/images/additions/king-queen.webp',
      },
      {
        id: 'upholstery',
        name: { en: 'Upholstery & Furniture Cleaning', fr: 'Nettoyage de meubles rembourrés' },
        price: 0,
        priceDisplay: { en: 'From $149', fr: 'Dès 149$' },
        priceLabel: { en: 'MINIMUM CHARGE', fr: 'FRAIS MINIMUM' },
        description: {
          en: 'Sofas, sectionals, loveseats and chairs — priced at $40 per seat (seat & back cushions). No real/fake leather or memory foam. Minimum charge $149.',
          fr: 'Sofas, sectionnels, causeuses et chaises — 40$ par place (coussins d\'assise et de dossier). Pas de cuir ni de mousse mémoire. Frais minimum de 149$.',
        },
        includes: [
          { en: 'Hot Water Extraction (Steam Cleaning)', fr: 'Extraction à l\'eau chaude (nettoyage vapeur)' },
          { en: 'Optional Scotchgard Protector (+50%)', fr: 'Protecteur Scotchgard optionnel (+50%)' },
          { en: 'Optional Benefect disinfectant per seat', fr: 'Désinfectant Benefect optionnel par place' },
          { en: '30-Day Satisfaction Guarantee', fr: 'Garantie de satisfaction 30 jours' },
        ],
        image: '/images/sofa.jpg',
      },
      {
        id: 'vehicle',
        name: { en: 'Car, Boat & RV Cleaning', fr: 'Nettoyage de voiture, bateau et VR' },
        price: 0,
        priceDisplay: { en: 'From $249', fr: 'Dès 249$' },
        priceLabel: { en: 'APRIL – OCTOBER', fr: 'AVRIL – OCTOBRE' },
        description: {
          en: 'Full interior shampoo and extraction for cars, SUVs and trucks. Offered April to October only. Boat & RV cleaning quoted on site.',
          fr: 'Shampooing intérieur complet et extraction pour voitures, VUS et camions. Offert d\'avril à octobre seulement. Bateau et VR: soumission sur place.',
        },
        includes: [
          { en: 'Full interior shampoo & extraction', fr: 'Shampooing intérieur complet et extraction' },
          { en: 'Car (4–6 seats) — $249', fr: 'Voiture (4–6 places) — 249$' },
          { en: 'SUV (4–7 seats) — $275 · Truck — $289', fr: 'VUS (4–7 places) — 275$ · Camion — 289$' },
          { en: 'Boat & RV — quote on site', fr: 'Bateau et VR — soumission sur place' },
        ],
        image: '/images/additions/car.webp',
      },
    ],
  },
  {
    id: 'wall-unit',
    name: { en: 'Wall-Mounted AC Cleaning (Mini-Split)', fr: 'Nettoyage de climatiseur mural (mini-split)' },
    description: { en: 'Eliminate mold, odors, and bacteria for healthier air.', fr: 'Éliminez moisissures, odeurs et bactéries pour un air plus sain.' },
    icon: 'wall-unit',
    packages: [
      {
        id: 'wall-unit-cleaning',
        name: { en: 'Wall Unit (Mini-Split)', fr: 'Unité murale (Mini-Split)' },
        price: 299,
        priceLabel: { en: 'STARTING AT', fr: 'À PARTIR DE' },
        description: {
          en: 'Eliminate hidden mold and restore peak efficiency. This specialized deep cleaning service uses foaming antimicrobial agents to sanitize the coil and remove biological buildup from the internal scroll fan.',
          fr: 'Éliminez les moisissures cachées et restaurez l\'efficacité maximale. Ce service de nettoyage en profondeur utilise des agents antimicrobiens moussants pour assainir la bobine et éliminer les dépôts biologiques.',
        },
        includes: [
          { en: 'Full Non-Invasive Disassembly', fr: 'Démontage complet non invasif' },
          { en: 'Deep Coil Restoration (Non-Corrosive Wash)', fr: 'Restauration profonde de la bobine (lavage non corrosif)' },
          { en: 'Cabinet Casing, Fan, and Drain Pan Cleaned', fr: 'Boîtier, ventilateur et bac d\'égouttement nettoyés' },
          { en: 'Filter Disinfection', fr: 'Désinfection du filtre' },
          { en: 'Exterior Condenser Unit Cleaned', fr: 'Unité condensatrice extérieure nettoyée' },
          { en: 'Air Flow Test (Value $100)', fr: 'Test débit d\'air (valeur 100$)' },
        ],
        locationsQuestion: {
          en: 'How many wall-mounted units does the home have? Select by indoor unit height:',
          fr: 'Combien d\'unités murales cette maison possède-t-elle? Sélectionnez selon la hauteur de l\'unité intérieure:',
        },
        dryerLocations: [
          { id: 'wall-under-8', label: { en: '8 feet and under',        fr: '8 pieds et moins'    }, price: 299 },
          { id: 'wall-8-12',    label: { en: 'Between 8 and 12 feet (+$50)', fr: 'Entre 8 et 12 pieds (+50$)' }, price: 349 },
          { id: 'wall-over-12', label: { en: 'Over 12 feet (+$100)',    fr: 'Plus de 12 pieds (+100$)' }, price: 399 },
        ],
        image: '/images/wall-unit.jpg',
      },
    ],
  },
  {
    id: 'air-exchanger',
    name: { en: 'Air Exchanger Cleaning (HRV/ERV)', fr: 'Nettoyage d\'échangeur d\'air (HRV/ERV)' },
    description: { en: 'Ensure clean, fresh air circulation and optimal performance.', fr: 'Assurez une circulation d\'air frais propre et efficace.' },
    icon: 'air-exchanger',
    packages: [
      {
        id: 'air-exchanger-cleaning',
        name: { en: 'Air Exchanger Cleaning', fr: 'Nettoyage échangeur d\'air' },
        price: 249,
        priceNote: { en: '+ VENTS', fr: '+ BOUCHES' },
        description: {
          en: 'Standalone cleaning for HRV/ERV units and dedicated ducts. Ideal for homes with electric heating.',
          fr: 'Nettoyage autonome pour les unités VRC/VRE et les conduits dédiés. Idéal pour les maisons avec chauffage électrique.',
        },
        includes: [
          { en: 'Cleaning of HRV/ERV Cabinet', fr: 'Nettoyage du cabinet VRC/VRE' },
          { en: 'Disinfection of Cabinet interior', fr: 'Désinfection de l\'intérieur du cabinet' },
          { en: 'Cleaning of Motor(s) and Fan(s)', fr: 'Nettoyage du/des moteur(s) et ventilateur(s)' },
          { en: 'Duct Cleaning (Supply/Return) - $5/ea', fr: 'Nettoyage des conduits (alimentation/retour) - 5$/ch' },
          { en: 'Core and Filter cleaning (Air-dusting only)', fr: 'Nettoyage du noyau et du filtre (dépoussiérage seulement)' },
          { en: 'Free Dust Scan (1 Room, Value $100)', fr: 'Analyse de poussière gratuite (1 pièce, valeur 100$)' },
        ],
        scanBanner: {
          text: { en: 'AIR FLOW CHECK INCLUDED ($100 VALUE)', fr: 'VÉRIFICATION DU DÉBIT D\'AIR INCLUSE (VALEUR 100$)' },
          color: 'navy',
        },
        hasVentCount: true,
        unitLabel: { en: 'units', fr: 'unités' },
        image: '/images/air-exchanger.jpg',
      },
    ],
  },
  {
    id: 'specialty',
    name: { en: 'Specialty', fr: 'Spécialité' },
    description: { en: 'Specific component cleaning.', fr: 'Nettoyage de composants spécifiques.' },
    icon: 'specialty',
    packages: [
      {
        id: 'camera-inspection',
        name: { en: 'Vent(s) Camera Inspection', fr: 'Inspection par caméra des conduits' },
        price: 299,
        priceLabel: { en: 'STARTING AT', fr: 'À PARTIR DE' },
        description: {
          en: 'Video camera inspection of your duct system — verify cleanliness, locate blockages and document the condition of your vents. Up to 5 vents included, $30 per additional vent.',
          fr: 'Inspection par caméra vidéo de votre système de conduits — vérifiez la propreté, localisez les blocages et documentez l\'état de vos conduits. Jusqu\'à 5 conduits inclus, 30$ par conduit supplémentaire.',
        },
        includes: [
          { en: 'Up to 5 vents included', fr: 'Jusqu\'à 5 conduits inclus' },
          { en: 'Video documentation of duct condition', fr: 'Documentation vidéo de l\'état des conduits' },
          { en: 'Blockage & damage detection', fr: 'Détection des blocages et dommages' },
        ],
        locationsQuestion: {
          en: 'Camera inspection:',
          fr: 'Inspection par caméra:',
        },
        dryerLocations: [
          { id: 'cam-only-base',       label: { en: 'Camera Inspection (up to 5 vents)', fr: 'Inspection caméra (jusqu\'à 5 conduits)' }, price: 299 },
          { id: 'cam-only-extra-vent', label: { en: 'Additional vent (each)',            fr: 'Conduit supplémentaire (chacun)'         }, price: 30  },
        ],
        // image: '/images/camera-inspection.jpg', — add when photo is ready
      },
      {
        id: 'uvc-light',
        name: { en: 'UV-C Air Purification System (Installation Included)', fr: 'Système de purification d\'air UV-C (installation incluse)' },
        price: 475,
        description: {
          en: 'Kills bacteria, mold, and viruses — for cleaner, healthier air 24/7.',
          fr: 'Tue les bactéries, moisissures et virus — pour un air plus propre et plus sain 24h/24.',
        },
        bulletPoints: [
          { en: 'Medical-grade air sterilization', fr: 'Stérilisation de l\'air de qualité médicale' },
          { en: 'Prevents mold growth & odors', fr: 'Prévient la croissance des moisissures et les odeurs' },
          { en: 'Includes professional installation & warranty', fr: 'Inclut l\'installation professionnelle et la garantie' },
        ],
        includes: [
          { en: '36W UV-C Sterilization: Neutralizes 99.9% of airborne viruses and bacteria', fr: 'Stérilisation UV-C 36W: neutralise 99,9% des virus et bactéries' },
          { en: 'Odor Elimination: Stops "Dirty Sock Syndrome" by preventing mold on wet AC coils', fr: 'Élimination des odeurs: stoppe le "syndrome de la chaussette sale"' },
          { en: 'Precision Install: Professionally drilled, mounted, and airtight-sealed', fr: 'Installation précise: percé, monté et scellé hermétiquement' },
          { en: 'Auto-Safety Sensors: Built-in shutoff for 100% safe operation', fr: 'Capteurs de sécurité automatiques: arrêt intégré pour une opération 100% sûre' },
          { en: 'System Status Light: LED indicator for easy 24/7 monitoring', fr: 'Voyant de statut: indicateur LED pour surveillance facile 24h/24' },
          { en: 'Duct Masters Guarantee: 90-day labor coverage + 1-year limited defect warranty', fr: 'Garantie Duct Masters: 90 jours main-d\'œuvre + 1 an pièces défectueuses' },
        ],
        unitLabel: { en: 'units', fr: 'unités' },
        image: '/images/uvc.jpg',
      },
      {
        id: 'furnace-blower',
        name: { en: 'Furnace / Air Handler Cleaning (Blower & Motor)', fr: 'Nettoyage fournaise / unité de traitement d\'air (soufflante et moteur)' },
        price: 249,
        description: {
          en: 'Remove built-up dust and allergens at the source.',
          fr: 'Éliminez la poussière et les allergènes accumulés à la source.',
        },
        bulletPoints: [
          { en: 'Deep cleaning of blower & motor', fr: 'Nettoyage en profondeur de la soufflante et du moteur' },
          { en: 'Reduces dust circulation in your home', fr: 'Réduit la circulation de poussière dans votre maison' },
          { en: 'Improves airflow and system efficiency', fr: 'Améliore la circulation d\'air et l\'efficacité du système' },
        ],
        includes: [
          { en: 'Blower Wheel Deep Cleaning', fr: 'Nettoyage en profondeur de la roue de soufflante' },
          { en: 'Motor Housing Air Wash', fr: 'Lavage à l\'air du logement du moteur' },
          { en: 'In-Place or Detailed Unit Extraction', fr: 'Extraction de l\'unité en place ou détaillée' },
        ],
        unitLabel: { en: 'units', fr: 'unités' },
        image: '/images/furnace-blower.jpg',
      },
      {
        id: 'indoor-coil',
        name: { en: 'Indoor Coil Cleaning (Evaporator Coil)', fr: 'Nettoyage de la bobine intérieure (évaporateur)' },
        price: 249,
        description: {
          en: 'Restore airflow and improve air quality.',
          fr: 'Restaurez la circulation d\'air et améliorez la qualité de l\'air.',
        },
        bulletPoints: [
          { en: 'Removes dust buildup inside your system', fr: 'Élimine l\'accumulation de poussière dans votre système' },
          { en: 'Improves heating & cooling efficiency', fr: 'Améliore l\'efficacité du chauffage et de la climatisation' },
          { en: 'Helps prevent odors and contamination', fr: 'Aide à prévenir les odeurs et la contamination' },
        ],
        includes: [
          { en: 'Coil Fin Cleaning', fr: 'Nettoyage des ailettes de la bobine' },
          { en: 'Airflow Path Restoration', fr: 'Restauration du chemin de flux d\'air' },
          { en: 'Safe Dry Process', fr: 'Processus sec sécuritaire' },
          { en: 'Source Removal', fr: 'Élimination à la source' },
        ],
        unitLabel: { en: 'units', fr: 'unités' },
        image: '/images/indoor-coil.jpg',
      },
      {
        id: 'outdoor-heat-pump',
        name: { en: 'Outdoor Unit Cleaning (Heat Pump / Condenser)', fr: 'Nettoyage unité extérieure (pompe à chaleur / condenseur)' },
        price: 249,
        description: {
          en: 'Boost performance and extend system lifespan.',
          fr: 'Améliorez la performance et prolongez la durée de vie du système.',
        },
        bulletPoints: [
          { en: 'Removes dirt, pollen, and debris', fr: 'Élimine la saleté, le pollen et les débris' },
          { en: 'Improves heat transfer efficiency', fr: 'Améliore l\'efficacité du transfert de chaleur' },
          { en: 'Reduces strain on your system', fr: 'Réduit la pression sur votre système' },
        ],
        includes: [
          { en: 'Coil Fin Cleaning', fr: 'Nettoyage des ailettes de la bobine' },
          { en: 'Airflow Path Restoration', fr: 'Restauration du chemin de flux d\'air' },
          { en: 'Safe Wet & Dry Process', fr: 'Processus humide et sec sécuritaire' },
          { en: 'Source Removal', fr: 'Élimination à la source' },
        ],
        unitLabel: { en: 'units', fr: 'unités' },
        image: '/images/outdoor-heat-pump.jpg',
      },
    ],
  },
];
