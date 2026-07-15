import { EXTRAS, CARPET_GROUP_MINS, AREA_RUG_MIN, extraPrice, carpetRequiredMin, hasTierToggle, rugsSubtotal, type RugEntry } from '../../data/extras';
import { useLang } from '../../context/LanguageContext';
import ExtraCard from './ExtraCard';
import RugBuilder from './RugBuilder';

interface Props {
  selectedExtras: Record<string, number>;
  onExtrasChange: (extras: Record<string, number>) => void;
  carpetTiers: Record<string, 'clean' | 'protect'>;
  onCarpetTierChange: (id: string, tier: 'clean' | 'protect') => void;
  dryerVentLocations: Record<string, number>;
  onDryerVentLocationChange: (id: string, qty: number) => void;
  areaRugs: RugEntry[];
  onAreaRugsChange: (rugs: RugEntry[]) => void;
  categoryId: string | null;
  packageId: string | null;
}

/* Map service category/package → extra ID that would be redundant */
const EXCLUDED_BY_SERVICE: Record<string, string> = {
  'dryer-vent':       'extra-dryer-vent',
  'dryer-cover-install': 'extra-dryer-cover',
  'camera-inspection': 'extra-camera-inspection',
  'wall-unit':        'extra-wall-unit',
  'air-exchanger':    'extra-air-exchanger',
  'furnace-blower':   'extra-furnace-blower',
  'indoor-coil':      'extra-indoor-coil',
  'outdoor-heat-pump':'extra-outdoor-heat-pump',
  'uvc-light':        'extra-uvc',
};

export default function Step2({ selectedExtras, onExtrasChange, carpetTiers, onCarpetTierChange, dryerVentLocations, onDryerVentLocationChange, areaRugs, onAreaRugsChange, categoryId, packageId }: Props) {
  const { lang } = useLang();
  const isCarpet = categoryId === 'carpet';
  const isAreaRug = isCarpet && packageId === 'area-rug';

  /* Running carpet total (mirrors BookingFlow.tsx extrasTotal calc for carpet items)
     so we can show an inline shortfall banner against the $199 minimum. */
  const carpetTotal = isCarpet
    ? Object.entries(selectedExtras).reduce((sum, [id, qty]) => {
        const extra = EXTRAS.find((e) => e.id === id);
        if (!extra) return sum;
        return sum + extraPrice(extra, carpetTiers[id]) * qty;
      }, 0) + rugsSubtotal(areaRugs)
    : 0;

  /* Minimum: highest min among sub-services with selected items; before anything
     is selected, show the current sub-service's own minimum as guidance. */
  const selectedMin = isCarpet ? carpetRequiredMin(selectedExtras, areaRugs) : 0;
  const packageMin  = isCarpet && packageId ? (CARPET_GROUP_MINS[packageId] ?? 0) : 0;
  const requiredMin = selectedMin > 0 ? selectedMin : packageMin;
  const carpetShortfall = Math.max(0, requiredMin - carpetTotal);
  const showCarpetMinBanner = isCarpet && requiredMin > 0 && carpetShortfall > 0;

  /* Extra IDs made redundant by the primary service selection */
  const excludedIds = new Set<string>();
  if (categoryId && EXCLUDED_BY_SERVICE[categoryId]) excludedIds.add(EXCLUDED_BY_SERVICE[categoryId]);
  if (packageId  && EXCLUDED_BY_SERVICE[packageId])  excludedIds.add(EXCLUDED_BY_SERVICE[packageId]);

  const visibleExtras = EXTRAS.filter((e) => {
    if (e.forCategory === 'carpet') return isCarpet && e.forPackage === packageId;
    if (isCarpet) return false;
    if (e.forCategory && e.forCategory !== categoryId) return false;
    return !excludedIds.has(e.id);
  });

  const handleAdd = (id: string) => {
    const extra = EXTRAS.find((e) => e.id === id);
    onExtrasChange({ ...selectedExtras, [id]: extra?.defaultQty ?? 1 });
  };

  const handleQtyChange = (id: string, qty: number) => {
    if (qty === 0) {
      const next = { ...selectedExtras };
      delete next[id];
      onExtrasChange(next);
    } else {
      onExtrasChange({ ...selectedExtras, [id]: qty });
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        {isCarpet
          ? (lang === 'en' ? '2. Select Items to Clean' : '2. Sélectionner les articles à nettoyer')
          : (lang === 'en' ? '2. Select Extra Services (Optional)' : '2. Sélectionner des services supplémentaires (facultatif)')}
      </h2>

      {isCarpet ? (
        <>
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-3">
            <div className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-bold">$</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">
                {lang === 'en' ? 'PRICED PER ITEM' : 'PRIX PAR ARTICLE'}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                {isAreaRug
                  ? (lang === 'en'
                      ? `Enter each rug's real dimensions — add as many rugs as you need. Minimum booking $${AREA_RUG_MIN}.`
                      : `Entrez les dimensions réelles de chaque carpette — ajoutez autant de carpettes que nécessaire. Minimum de réservation ${AREA_RUG_MIN}$.`)
                  : (lang === 'en'
                      ? `Select the quantity of each item you'd like cleaned.${requiredMin > 0 ? ` Minimum booking $${requiredMin}.` : ''}`
                      : `Sélectionnez la quantité de chaque article à nettoyer.${requiredMin > 0 ? ` Minimum de réservation ${requiredMin}$.` : ''}`)}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                {lang === 'en'
                  ? '💡 Need rugs, mattresses, upholstery or more? Go Back to Step 1 to add items from another service — your selections are saved.'
                  : '💡 Besoin de carpettes, matelas ou meubles? Retournez à l\'étape 1 pour ajouter des articles d\'un autre service — vos sélections sont conservées.'}
              </p>
            </div>
          </div>

          {showCarpetMinBanner && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 mb-6">
              <div className="bg-amber-500 text-white rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold">!</span>
              </div>
              <div>
                <p className="text-sm font-bold text-amber-900">
                  {lang === 'en'
                    ? `Add $${carpetShortfall.toFixed(2)} more to reach the $${requiredMin} minimum`
                    : `Ajoutez ${carpetShortfall.toFixed(2)}$ de plus pour atteindre le minimum de ${requiredMin}$`}
                </p>
                <p className="text-xs text-amber-800 mt-0.5">
                  {lang === 'en'
                    ? `Current total: $${carpetTotal.toFixed(2)}. Pick more items or increase quantities to continue.`
                    : `Total actuel: ${carpetTotal.toFixed(2)}$. Sélectionnez plus d'articles ou augmentez les quantités pour continuer.`}
                </p>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-6">
          <div className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-xs font-bold">+</span>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">
              {lang === 'en' ? 'BUNDLE VALUE PRICING' : 'PRIX FORFAIT GROUPÉ'}
            </p>
            <p className="text-xs text-gray-600 mt-0.5">
              {lang === 'en'
                ? 'Rates shown are locked for this specific primary service.'
                : 'Les tarifs affichés sont fixés pour ce service principal spécifique.'}
            </p>
          </div>
        </div>
      )}

      {/* Area rug builder — per-rug dimensions with auto minimum */}
      {isAreaRug && <RugBuilder rugs={areaRugs} onChange={onAreaRugsChange} />}

      {/* 2-column grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {visibleExtras.map((extra) => (
          <ExtraCard
            key={extra.id}
            extra={extra}
            quantity={selectedExtras[extra.id] ?? 0}
            onAdd={() => handleAdd(extra.id)}
            onQuantityChange={(qty) => handleQtyChange(extra.id, qty)}
            dryerVentLocations={extra.dryerLocations ? dryerVentLocations : undefined}
            onDryerVentLocationChange={extra.dryerLocations ? onDryerVentLocationChange : undefined}
            tier={carpetTiers[extra.id] ?? 'clean'}
            onTierChange={hasTierToggle(extra) ? (t) => onCarpetTierChange(extra.id, t) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
