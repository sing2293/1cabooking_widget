import { EXTRAS } from '../../data/extras';
import { useLang } from '../../context/LanguageContext';
import ExtraCard from './ExtraCard';

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
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6">
          <div className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-xs font-bold">$</span>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">
              {lang === 'en' ? 'PRICED PER ITEM' : 'PRIX PAR ARTICLE'}
            </p>
            <p className="text-xs text-gray-600 mt-0.5">
              {lang === 'en'
                ? 'Select the quantity of each item you\'d like cleaned.'
                : 'Sélectionnez la quantité de chaque article à nettoyer.'}
            </p>
          </div>
        </div>
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
