/* The bridge between the widget's UNCHANGED lead form (steps 1+2 combined)
   and the main 1cabooking funnel flow that runs after it. Maps the form's
   service ids onto the funnel's tile keys and applies the funnel's own
   continue / thank-you rules, so a widget visitor gets exactly the flow a
   direct funnel visitor gets. */

export type FunnelSector = 'residential' | 'commercial';

/** Widget form sectors: Residential stays residential; Commercial AND
 *  Industrial are combined into the funnel's commercial flow (Anuj). */
export const funnelSectorOf = (sector: string): FunnelSector =>
  /commercial|industrial/i.test(sector) ? 'commercial' : 'residential';

/* HVAC ids — same flow for both sectors (books via ServiceTitan). */
const HVAC_MAP: Record<string, string> = {
  'hvac-install': 'hvac-install',
  'ac-install': 'ac-install',
  'ac-repair': 'ac-repair',
  'furnace-install': 'furnace-install',
  'furnace-repair': 'furnace-repair',
  'heat-pump-install': 'heatpump',
  'boiler': 'boiler',
  'water-heater': 'water-heater',
  'mini-split-ductless': 'minisplit',
  'duct-replacement': 'duct-replace',
};

/* Residential cleaning ids → the funnel's residential tiles. */
const RES_MAP: Record<string, string[]> = {
  'air-duct-dryer': ['duct-dryer'],
  'duct-cleaning': ['airduct'],
  'dryer-vent': ['dryer'],
  'wall-unit': ['wallac'],
  'carpet-cleaning': ['carpet'],
  'high-dusting': ['highdust'],
  'insulation': ['insulation'],
  'duct-sealing': ['aeroseal'],
  'mold-remediation': ['mold'],
  'other': ['other'],
};

/* Commercial/Industrial ids → the funnel's commercial estimate tiles. */
const COM_MAP: Record<string, string[]> = {
  'air-duct-dryer': ['c-adc', 'c-dryer'],
  'duct-cleaning': ['c-adc'],
  'dryer-vent': ['c-dryer'],
  'wall-unit': ['c-adc'],          // no commercial wall-AC tile — quoted with the duct estimate
  'carpet-cleaning': ['c-carpet'],
  'high-dusting': ['c-dust'],
  'insulation': ['c-insulation'],
  'duct-sealing': ['c-aeroseal'],
  'mold-remediation': ['c-mold'],
  // 'other' has no commercial tile → lead-only (team calls back)
};

export interface FunnelPlan {
  sector: FunnelSector;
  /** funnel tile keys to pre-select */
  keys: string[];
  /** false → the widget shows its thank-you instead of the booking flow */
  proceed: boolean;
  /** funnel-style ineligibility reasons (empty when proceeding) */
  reasons: string[];
}

/** The funnel's step-2 gate, reproduced for the widget's combined form:
 *  HVAC mixed with cleaning, the residential High Dusting / Other tiles, or
 *  a commercial "Other" pick stop at a thank-you; everything else continues
 *  into the booking flow (commercial books free estimates, HVAC books ST). */
export function planForSelection(sector: string, serviceIds: string[]): FunnelPlan {
  const fs = funnelSectorOf(sector);
  const map = fs === 'commercial' ? COM_MAP : RES_MAP;
  const keys: string[] = [];
  let unmapped = false;
  for (const id of serviceIds) {
    const mapped = HVAC_MAP[id] ? [HVAC_MAP[id]] : map[id];
    if (!mapped) { unmapped = true; continue; }
    for (const k of mapped) if (!keys.includes(k)) keys.push(k);
  }
  const hvac = serviceIds.some((id) => HVAC_MAP[id]);
  const cleaning = keys.some((k) => !Object.values(HVAC_MAP).includes(k));
  const mixedHvac = hvac && cleaning;
  const oddPick = fs === 'residential' && serviceIds.some((id) => id === 'high-dusting' || id === 'other');
  const leadOnly = mixedHvac || oddPick || unmapped || keys.length === 0;
  return {
    sector: fs,
    keys,
    proceed: !leadOnly,
    reasons: leadOnly ? [mixedHvac ? 'hvac_plus_cleaning' : 'needs_review'] : [],
  };
}
