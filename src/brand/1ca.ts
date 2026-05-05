import type { BrandConfig } from './types';

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

export const brand1ca: BrandConfig = {
  id: '1ca',
  name: '1 Clean Air',
  logo: '/1CleanAir_LogoBilingue.png',
  pageTitle: '1 Clean Air Booking',
  phoneDigits: '6136124828',
  phoneDisplay: '(613)-612-4828',
  privacyUrl: 'https://1cleanair.ca/privacy-policy/',

  cities: {
    ottawa: [
      'ottawa',
      'arnprior', 'carleton place', 'smiths falls', 'perth',
      'kemptville', 'manotick', 'embrun', 'russell', 'casselman',
      'rockland', 'clarence-rockland',
    ].map(normalize),

    bkc: [
      'kingston', 'bath', 'amherstview', 'loyalist', 'sydenham',
      'verona', 'harrowsmith', 'odessa', 'westport',
      'brockville', 'prescott', 'cardinal', 'iroquois',
      'mallorytown', 'lansdowne', 'athens', 'delta',
      'cornwall', 'long sault', 'ingleside', 'lancaster',
      'williamstown', 'alexandria', 'chesterville', 'winchester',
      'south stormont', 'south dundas', 'north dundas',
      'gananoque', 'napanee', 'greater napanee', 'morrisburg',
      'south glengarry', 'north glengarry',
    ].map(normalize),

    gatineau: [
      'gatineau', 'hull', 'aylmer', 'buckingham', 'chelsea',
      'wakefield', 'cantley', 'pontiac', 'la peche',
    ].map(normalize),

    montreal: [
      'montreal',
      'laval', 'terrebonne', 'repentigny', 'blainville', 'boisbriand',
      'saint-eustache', 'mirabel', 'deux-montagnes', 'sainte-therese',
      'rosemere', 'mascouche', 'lachenaie', 'saint-jerome',
      'vaudreuil-dorion', 'pointe-claire', 'dorval', 'beaconsfield', 'kirkland',
      'brossard', 'longueuil', 'saint-jean-sur-richelieu', 'chambly',
      'saint-lambert', 'laprairie',
    ].map(normalize),
  },

  hiddenCategoriesByRegion: {
    montreal: ['carpet'],
    bkc: ['carpet'],
  },
};
