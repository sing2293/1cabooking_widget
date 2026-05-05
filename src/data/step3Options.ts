import type { T } from './services';

export interface SelectOption {
  value: string;
  label: T;
  fee?: number; // for unit location options
}

export const LANGUAGE_PREFERENCES: SelectOption[] = [
  { value: 'english',   label: { en: 'English',    fr: 'Anglais'    } },
  { value: 'french',    label: { en: 'Français',   fr: 'Français'   } },
  { value: 'bilingual', label: { en: 'Bilingual',  fr: 'Bilingue'   } },
];

export const PROVINCES: SelectOption[] = [
  { value: 'Québec',  label: { en: 'Québec',  fr: 'Québec'  } },
  { value: 'Ontario', label: { en: 'Ontario', fr: 'Ontario' } },
];

export const UNIT_LOCATIONS: SelectOption[] = [
  {
    value: 'standard',
    label: {
      en: 'Standard Access (Basement/Garage/Main Floor 6+ ft) - $0.00 Fee',
      fr: 'Accès standard (Sous-sol/Garage/Rez-de-chaussée 6+ pi) - Frais 0,00$',
    },
    fee: 0,
  },
  {
    value: 'restricted',
    label: {
      en: 'Crawl Space — Requires Crouching (<5 ft) - $149.99 Fee',
      fr: 'Vide sanitaire — Nécessite de se baisser (<5 pi) - Frais 149,99$',
    },
    fee: 149.99,
  },
  {
    value: 'attic',
    label: {
      en: 'Attic Location - $149.99 Fee',
      fr: 'Emplacement au grenier - Frais 149,99$',
    },
    fee: 149.99,
  },
  {
    value: 'rooftop',
    label: {
      en: 'Rooftop Location - $149.99 Fee',
      fr: 'Emplacement sur le toit - Frais 149,99$',
    },
    fee: 149.99,
  },
];

export const LAST_CLEANING: SelectOption[] = [
  { value: 'last-year',     label: { en: 'Last Year',      fr: 'L\'an dernier'         } },
  { value: 'last-3-years',  label: { en: 'Last 3 Years',   fr: 'Les 3 dernières années' } },
  { value: 'last-5-years',  label: { en: 'Last 5 Years',   fr: 'Les 5 dernières années' } },
  { value: 'last-10-years', label: { en: 'Last 10 Years',  fr: 'Les 10 dernières années'} },
  { value: 'last-20-years', label: { en: 'Last 20 Years',  fr: 'Les 20 dernières années'} },
  { value: 'never',         label: { en: 'Never Cleaned',  fr: 'Jamais nettoyé'         } },
  { value: 'no-idea',       label: { en: 'I Have No Idea', fr: 'Je ne sais pas'          } },
];

export const RENOVATIONS: SelectOption[] = [
  { value: 'no',  label: { en: 'No',  fr: 'Non' } },
  { value: 'yes', label: { en: 'Yes', fr: 'Oui' } },
];

export const SPECIAL_REQUESTS: SelectOption[] = [
  { value: 'none',          label: { en: 'No special request',                   fr: 'Aucune demande spéciale'            } },
  { value: 'call-before',   label: { en: 'Request a phone call prior to arrival', fr: 'Demander un appel avant l\'arrivée' } },
  { value: 'waitlist',      label: { en: 'Place on waitlist for an earlier date', fr: 'Mettre sur la liste d\'attente'     } },
  { value: 'call-waitlist', label: { en: 'Call before arrival AND add to waitlist', fr: 'Appel avant arrivée ET liste d\'attente' } },
];

export const HOW_DID_YOU_HEAR: SelectOption[] = [
  { value: '',           label: { en: 'Please select an option...', fr: 'Veuillez sélectionner...' } },
  { value: 'past-client', label: { en: 'I\'m a Past Client',       fr: 'Je suis un ancien client'  } },
  { value: 'sticker',     label: { en: 'Sticker on my Furnace',    fr: 'Autocollant sur ma fournaise'} },
  { value: 'truck',       label: { en: 'Saw the Truck',            fr: 'J\'ai vu le camion'          } },
  { value: 'search',      label: { en: 'Search Engine (Google, Bing, etc.)', fr: 'Moteur de recherche (Google, Bing, etc.)' } },
  { value: 'ai',          label: { en: 'AI (ChatGPT, Gemini, etc.)',         fr: 'IA (ChatGPT, Gemini, etc.)'              } },
  { value: 'facebook',    label: { en: 'Facebook / Community Group',         fr: 'Facebook / Groupe communautaire'         } },
  { value: 'referral',    label: { en: 'Referral (Friend, Family, or Pro)',   fr: 'Référence (ami, famille ou pro)'         } },
  { value: 'other',       label: { en: 'Other',                              fr: 'Autre'                                   } },
];

// Province → tax rates
export interface TaxInfo {
  lines: { label: string; rate: number }[];
}

export const PROVINCE_TAXES: Record<string, TaxInfo> = {
  'Québec':                    { lines: [{ label: 'TPS (5%)', rate: 0.05 }, { label: 'TVQ (9.975%)', rate: 0.09975 }] },
  'Ontario':                   { lines: [{ label: 'HST (13%)', rate: 0.13 }] },
  'British Columbia':          { lines: [{ label: 'GST (5%)', rate: 0.05 }, { label: 'PST (7%)', rate: 0.07 }] },
  'Alberta':                   { lines: [{ label: 'GST (5%)', rate: 0.05 }] },
  'Manitoba':                  { lines: [{ label: 'GST (5%)', rate: 0.05 }, { label: 'PST (7%)', rate: 0.07 }] },
  'Saskatchewan':              { lines: [{ label: 'GST (5%)', rate: 0.05 }, { label: 'PST (6%)', rate: 0.06 }] },
  'Nova Scotia':               { lines: [{ label: 'HST (15%)', rate: 0.15 }] },
  'New Brunswick':             { lines: [{ label: 'HST (15%)', rate: 0.15 }] },
  'Newfoundland and Labrador': { lines: [{ label: 'HST (15%)', rate: 0.15 }] },
  'Prince Edward Island':      { lines: [{ label: 'HST (15%)', rate: 0.15 }] },
};

export const SHORT_TO_PROVINCE: Record<string, string> = {
  QC: 'Québec', ON: 'Ontario', BC: 'British Columbia', AB: 'Alberta',
  MB: 'Manitoba', SK: 'Saskatchewan', NS: 'Nova Scotia', NB: 'New Brunswick',
  NL: 'Newfoundland and Labrador', PE: 'Prince Edward Island',
  YT: 'Yukon', NT: 'Northwest Territories', NU: 'Nunavut',
};
