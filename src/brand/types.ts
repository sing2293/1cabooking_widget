export type Region = 'ottawa' | 'montreal' | 'bkc';

export interface BrandConfig {
  /** Internal brand id, e.g. '1ca', 'hdx1ca' */
  id: string;
  /** Display name used in alt text and fallbacks */
  name: string;
  /** Path to logo in /public */
  logo: string;
  /** HTML <title> */
  pageTitle: string;
  /** Phone as digits only, for tel: links (e.g. '6136124828') */
  phoneDigits: string;
  /** Phone formatted for display (e.g. '(613)-612-4828') */
  phoneDisplay: string;
  /** Privacy policy URL */
  privacyUrl: string;
  /** Service-area cities, grouped by region. Lowercase, accent-stripped. */
  cities: {
    ottawa: string[];
    gatineau: string[];
    montreal: string[];
    bkc: string[];
  };
  /** Categories hidden from Step 1 for a given region. */
  hiddenCategoriesByRegion?: Partial<Record<Region, string[]>>;
}
