import { EXTRAS } from '../../data/extras';
import { useLang } from '../../context/LanguageContext';
import ExtraCard from './ExtraCard';

const CARPET_MIN_TOTAL = 199;

interface Props {
  selectedExtras: Record<string, number>;
  onExtrasChange: (extras: Record<string, number>) => void;
  carpetTiers: Record<string, 'clean' | 'protect'>;
  onCarpetTierChange: (id: string, tier: 'clean' | 'protect') => void;
  dryerVentLocations: Record<string, number>;
  onDryerVentLocationChange: (id: string, qty: number) => void;
  categoryId: string | null;
  packageId: string | null;
}

/* Map service category/package → extra ID that would be redundant */
const EXCLUDED_BY_SERVICE: Record<string, string> = {
  'dryer-vent':       'extra-dryer-vent',
  'wall-unit':        'extra-wall-unit',
  'air-exchanger':    'extra-air-exchanger',
  'furnace-blower':   'extra-furnace-blower',
  'indoor-coil':      'extra-indoor-coil',
  'outdoor-heat-pump':'extra-outdoor-heat-pump',
  'uvc-light':        'extra-uvc',
};

export default function Step2({ selectedExtras, onExtrasChange, carpetTiers, onCarpetTierChange, dryerVentLocations, onDryerVentLocationChange, categoryId, packageId }: Props) {
  const { lang } = useLang();
  const isCarpet = categoryId === 'carpet';

  /* Running carpet total (mirrors BookingFlow.tsx extrasTotal calc for carpet items)
     so we can show an inline shortfall banner against the $199 minimum. */
  const carpetTotal = isCarpet
    ? Object.entries(selectedExtras).reduce((sum, [id, qty]) => {
        const extra = EXTRAS.find((e) => e.id === id);
        if (!extra) return sum;
        const tier = carpetTiers[id];
        const price = (tier === 'protect' && extra.protectPrice != null) ? extra.protectPrice : extra.bundlePrice;
        return sum + price * qty;
      }, 0)
    : 0;
  const carpetShortfall = Math.max(0, CARPET_MIN_TOTAL - carpetTotal);
  const showCarpetMinBanner = isCarpet && carpetShortfall > 0;

  /* Extra IDs made redundant by the primary service selection */
  const excludedIds = new Set<string>();
  if (categoryId && EXCLUDED_BY_SERVICE[categoryId]) excludedIds.add(EXCLUDED_BY_SERVICE[categoryId]);
  if (packageId  && EXCLUDED_BY_SERVICE[packageId])  excludedIds.add(EXCLUDED_BY_SERVICE[packageId]);

  const visibleExtras = EXTRAS.filter((e) => {
    if (e.forCategory === 'carpet') return isCarpet;
    if (isCarpet) return false;
    if (e.forCategory && e.forCategory !== categoryId) return false;
    return !excludedIds.has(e.id);
  });

  const handleAdd = (id: string, hasQty: boolean) => {
    onExtrasChange({ ...selectedExtras, [id]: hasQty ? 1 : 1 });
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
                {lang === 'en'
                  ? `Select the quantity of each item you'd like cleaned. Minimum booking $${CARPET_MIN_TOTAL}.`
                  : `Sélectionnez la quantité de chaque article à nettoyer. Minimum de réservation ${CARPET_MIN_TOTAL}$.`}
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
                    ? `Add $${carpetShortfall.toFixed(2)} more to reach the $${CARPET_MIN_TOTAL} minimum`
                    : `Ajoutez ${carpetShortfall.toFixed(2)}$ de plus pour atteindre le minimum de ${CARPET_MIN_TOTAL}$`}
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

      {/* 2-column grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {visibleExtras.map((extra) => (
          <ExtraCard
            key={extra.id}
            extra={extra}
            quantity={selectedExtras[extra.id] ?? 0}
            onAdd={() => handleAdd(extra.id, extra.hasQuantity)}
            onQuantityChange={(qty) => handleQtyChange(extra.id, qty)}
            dryerVentLocations={extra.dryerLocations ? dryerVentLocations : undefined}
            onDryerVentLocationChange={extra.dryerLocations ? onDryerVentLocationChange : undefined}
            tier={carpetTiers[extra.id] ?? 'clean'}
            onTierChange={extra.protectPrice != null ? (t) => onCarpetTierChange(extra.id, t) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
