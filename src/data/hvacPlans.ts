// The HVAC maintenance plans we offer — 1-Unit, 2-Unit and 3-Unit (Anuj
// 2026-09-24: the older plans and the commercial ones are no longer offered).
//
// THIS FILE EXISTS THREE TIMES, identical: the internal tool
// (src/data/hvacPlans.ts), the customer website and the widget (each in its
// own src/data/hvacPlans.ts). Change one, change all three.
//
// Prices: monthly, or the year upfront at 11 × monthly — "1 month free".
// stId is the ServiceTitan membership type the internal tool sells; ST holds
// the same prices (checked 2026-09-24), but the tool quotes these.
export interface Bi { en: string; fr: string }
export interface HvacPlanInfo {
  key: '1u' | '2u' | '3u';
  stId: number;
  name: Bi;
  tagline: Bi;
  monthly: number;
  annual: number;
  /** The "POPULAR STARTER PLAN" badge. */
  popular?: boolean;
  /** Rings in the plan's icon, outer → inner. */
  rings: 1 | 2 | 3;
  highlights: Bi[];
  /** The one-line pitch — also what a booker can read out. */
  quote: Bi;
  included: { title: Bi; items: Bi[] }[];
}

const TEN_OFF: Bi = { en: '10% off repairs, service & parts', fr: '10 % de rabais sur les réparations, le service et les pièces' };
const IAQ_FIVE: Bi = { en: '5% off eligible indoor air quality products', fr: '5 % de rabais sur les produits admissibles de qualité de l’air intérieur' };
const TPR_VALVE: Bi = { en: 'Temperature & pressure-relief valve check', fr: 'Vérification de la soupape de sûreté (température et pression)' };
const TANK_DRAIN: Bi = { en: 'Partial tank drain to reduce sediment (where accessible)', fr: 'Vidange partielle du réservoir pour réduire les sédiments (si accessible)' };

export const HVAC_PLANS: HvacPlanInfo[] = [
  {
    key: '1u',
    stId: 15853021,
    name: { en: '1-Unit Maintenance Plan', fr: 'Plan d’entretien 1 unité' },
    tagline: { en: 'For furnace-only homes', fr: 'Pour les maisons avec fournaise seulement' },
    monthly: 14.95,
    annual: 164.45,
    rings: 1,
    highlights: [
      { en: 'One full annual furnace tune-up', fr: 'Une mise au point complète de la fournaise chaque année' },
      { en: 'Carbon monoxide & safety testing', fr: 'Test de monoxyde de carbone et de sécurité' },
      TEN_OFF,
      { en: 'Priority scheduling', fr: 'Rendez-vous prioritaires' },
    ],
    quote: {
      en: 'For about $15 a month, we maintain your furnace every year and give you 10% off if it ever needs service.',
      fr: 'Pour environ 15 $ par mois, nous entretenons votre fournaise chaque année et vous obtenez 10 % de rabais si elle a besoin de service.',
    },
    included: [
      {
        title: { en: 'Member benefits', fr: 'Avantages membres' },
        items: [
          { en: 'Automatic annual maintenance reminders', fr: 'Rappels d’entretien annuels automatiques' },
          { en: 'Digital system-condition report', fr: 'Rapport numérique sur l’état du système' },
        ],
      },
      {
        title: { en: 'Furnace tune-up covers', fr: 'La mise au point de la fournaise comprend' },
        items: [
          { en: 'Thermostat inspection & testing', fr: 'Inspection et test du thermostat' },
          { en: 'Burner & flame sensor inspection', fr: 'Inspection du brûleur et du détecteur de flamme' },
          { en: 'Blower motor & amperage check', fr: 'Vérification du moteur de la soufflante et de l’ampérage' },
          { en: 'Filter inspection/replacement (customer-supplied filter)', fr: 'Inspection/remplacement du filtre (filtre fourni par le client)' },
          { en: 'Gas piping, venting & condensate inspection', fr: 'Inspection de la tuyauterie de gaz, de l’évacuation et du condensat' },
          { en: 'Electrical connection inspection', fr: 'Inspection des connexions électriques' },
          { en: 'Cleaning & adjustment as needed', fr: 'Nettoyage et ajustements au besoin' },
        ],
      },
    ],
  },
  {
    key: '2u',
    stId: 15845480,
    name: { en: '2-Unit Maintenance Plan', fr: 'Plan d’entretien 2 unités' },
    tagline: { en: 'Furnace + A/C, covered year-round', fr: 'Fournaise + climatiseur, couverts toute l’année' },
    monthly: 24.95,
    annual: 274.45,
    popular: true,
    rings: 2,
    highlights: [
      { en: 'Annual furnace and A/C tune-up', fr: 'Mise au point annuelle de la fournaise et du climatiseur' },
      TEN_OFF,
      { en: '10% off air duct cleaning', fr: '10 % de rabais sur le nettoyage des conduits d’air' },
      { en: 'Priority booking ahead of non-members', fr: 'Réservation prioritaire avant les non-membres' },
    ],
    quote: {
      en: 'For about $25 a month, both your furnace and A/C are maintained every year, with priority service and member pricing whenever you need us.',
      fr: 'Pour environ 25 $ par mois, votre fournaise et votre climatiseur sont entretenus chaque année, avec service prioritaire et prix membres chaque fois que vous avez besoin de nous.',
    },
    included: [
      {
        title: { en: 'Everything in the 1-Unit Maintenance Plan, plus', fr: 'Tout ce que comprend le plan 1 unité, plus' },
        items: [
          IAQ_FIVE,
          { en: 'Seasonal reminders for heating & cooling', fr: 'Rappels saisonniers pour le chauffage et la climatisation' },
        ],
      },
      {
        title: { en: 'Cooling tune-up covers', fr: 'La mise au point de la climatisation comprend' },
        items: [
          { en: 'Refrigerant-performance check', fr: 'Vérification de la performance du réfrigérant' },
          { en: 'Condenser coil visual inspection', fr: 'Inspection visuelle du serpentin du condenseur' },
          { en: 'Drain & condensate inspection', fr: 'Inspection du drain et du condensat' },
          { en: 'Electrical component & capacitor testing', fr: 'Test des composants électriques et du condensateur' },
        ],
      },
    ],
  },
  {
    key: '3u',
    stId: 16275289,
    name: { en: '3-Unit Maintenance Plan', fr: 'Plan d’entretien 3 unités' },
    tagline: { en: 'Furnace, A/C & water heater', fr: 'Fournaise, climatiseur et chauffe-eau' },
    monthly: 29.95,
    annual: 329.45,
    rings: 3,
    highlights: [
      { en: 'Everything in the 2-Unit Maintenance Plan', fr: 'Tout ce que comprend le plan 2 unités' },
      { en: 'Annual water heater maintenance & safety inspection', fr: 'Entretien annuel et inspection de sécurité du chauffe-eau' },
      TANK_DRAIN,
      TPR_VALVE,
    ],
    quote: {
      en: 'For about $30 a month, we look after your furnace, A/C and water heater — with priority service and member pricing whenever you need us.',
      fr: 'Pour environ 30 $ par mois, nous prenons soin de votre fournaise, de votre climatiseur et de votre chauffe-eau — avec service prioritaire et prix membres chaque fois que vous avez besoin de nous.',
    },
    included: [
      {
        title: { en: 'Water heater check covers', fr: 'La vérification du chauffe-eau comprend' },
        items: [
          { en: 'Venting & visible connection inspection', fr: 'Inspection de l’évacuation et des raccords visibles' },
          TPR_VALVE,
          TANK_DRAIN,
        ],
      },
      {
        title: { en: 'Also included', fr: 'Aussi inclus' },
        items: [
          IAQ_FIVE,
          { en: 'Annual whole-home comfort & air-quality review', fr: 'Bilan annuel du confort et de la qualité de l’air de toute la maison' },
        ],
      },
    ],
  },
];

export const hvacPlanByStId = (id: number): HvacPlanInfo | null => HVAC_PLANS.find((p) => p.stId === id) || null;
export const hvacPlanByKey = (key: string): HvacPlanInfo | null => HVAC_PLANS.find((p) => p.key === key) || null;
/** The annual price as a monthly figure — what the "Annually" view shows. */
export const annualPerMonth = (p: HvacPlanInfo): number => Math.round((p.annual / 12) * 100) / 100;
