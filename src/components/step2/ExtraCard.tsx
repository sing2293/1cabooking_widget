import { useState } from 'react';
import type { Extra } from '../../data/extras';
import { useLang } from '../../context/LanguageContext';

interface Props {
  extra: Extra;
  quantity: number;
  onAdd: () => void;
  onQuantityChange: (qty: number) => void;
  dryerVentLocations?: Record<string, number>;
  onDryerVentLocationChange?: (id: string, qty: number) => void;
  tier?: 'clean' | 'protect';
  onTierChange?: (tier: 'clean' | 'protect') => void;
}

export default function ExtraCard({
  extra,
  quantity,
  onAdd,
  onQuantityChange,
  dryerVentLocations = {},
  onDryerVentLocationChange,
  tier = 'clean',
  onTierChange,
}: Props) {
  const { t, lang } = useLang();
  const [imgError, setImgError] = useState(false);
  const [dryerExpanded, setDryerExpanded] = useState(false);

  const hasDryerLocations = !!extra.dryerLocations?.length;
  const dryerTotal = hasDryerLocations
    ? extra.dryerLocations!.reduce((sum, loc) => sum + loc.price * (dryerVentLocations[loc.id] ?? 0), 0)
    : 0;
  const isSelected = hasDryerLocations ? dryerTotal > 0 : quantity > 0;

  const handleDryerRemove = () => {
    extra.dryerLocations?.forEach((loc) => onDryerVentLocationChange?.(loc.id, 0));
    setDryerExpanded(false);
  };

  return (
    <div
      className={`rounded-xl overflow-hidden bg-white border-2 transition-all flex flex-col ${
        isSelected ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Image area */}
      <div className="relative h-44 bg-gradient-to-br from-slate-500 to-blue-800 shrink-0">
        {extra.image && !imgError ? (
          <img
            src={extra.image}
            alt={t(extra.name)}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-20">
            <svg className="w-16 h-16 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>
            </svg>
          </div>
        )}

        <span className="absolute bottom-2 left-2 bg-green-600 text-white text-[9px] font-bold px-2 py-0.5 rounded">
          {lang === 'en' ? 'SPECIAL BUNDLE RATE' : 'TARIF FORFAIT SPÉCIAL'}
        </span>

        <div
          className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
            isSelected ? 'border-blue-500 bg-blue-500' : 'border-white bg-white'
          }`}
        >
          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-gray-900 text-sm leading-snug flex-1">{t(extra.name)}</h3>
          {extra.protectPrice != null ? (
            <div className="text-right shrink-0">
              <p className="text-xs text-gray-400 line-through">
                ${(tier === 'protect' ? extra.originalProtectPrice! : extra.originalPrice).toFixed(2)}
              </p>
              <p className="text-base font-bold text-blue-600">
                ${(tier === 'protect' ? extra.protectPrice : extra.bundlePrice).toFixed(2)}
              </p>
            </div>
          ) : (
            <div className="text-right shrink-0">
              <p className="text-xs text-gray-400 line-through">${extra.originalPrice.toFixed(2)}</p>
              <p className="text-base font-bold text-blue-600">
                {extra.bundlePricePrefix && (
                  <span className="text-sm font-semibold mr-0.5">{t(extra.bundlePricePrefix)} </span>
                )}
                ${extra.bundlePrice.toFixed(2)}
              </p>
            </div>
          )}
        </div>

        {/* Tier toggle for carpet items */}
        {extra.protectPrice != null && (
          <div className="flex rounded-lg overflow-hidden border border-gray-200 mb-3">
            <button
              onClick={() => onTierChange?.('clean')}
              className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${
                tier === 'clean'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {lang === 'en' ? '🧹 Clean' : '🧹 Nettoyer'}
            </button>
            <button
              onClick={() => onTierChange?.('protect')}
              className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${
                tier === 'protect'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {lang === 'en' ? '🛡️ Protect' : '🛡️ Protéger'}
            </button>
          </div>
        )}
        {extra.protectPrice != null && (
          <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 mb-3 leading-snug">
            💡 {lang === 'en'
              ? 'We recommend Protect — our disinfectant helps eliminate bacteria, mold & viruses, sanitize fibers, and reduce allergens for better indoor air quality.'
              : 'Nous recommandons Protéger — notre désinfectant aide à éliminer bactéries, moisissures et virus, assainir les fibres et réduire les allergènes pour une meilleure qualité d\'air.'}
          </p>
        )}

        <p className="text-xs text-blue-700 leading-snug mb-4 flex-1">{t(extra.description)}</p>

        {/* Action area */}
        {hasDryerLocations ? (
          dryerExpanded || isSelected ? (
            <div className="border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  {lang === 'en'
                    ? 'Where is the duct located outside?'
                    : 'Où est situé le conduit à l\'extérieur?'}
                </p>
                <button
                  onClick={handleDryerRemove}
                  className="text-[10px] text-red-400 hover:text-red-600 font-semibold transition-colors shrink-0 ml-2"
                >
                  {lang === 'en' ? '✕ Remove' : '✕ Retirer'}
                </button>
              </div>
              <div className="space-y-2">
                {extra.dryerLocations!.map((loc) => {
                  const qty = dryerVentLocations[loc.id] ?? 0;
                  return (
                    <div key={loc.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-gray-700 leading-snug">{t(loc.label)}</p>
                        <p className="text-xs text-blue-600 font-semibold">${loc.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => onDryerVentLocationChange?.(loc.id, Math.max(0, qty - 1))}
                          className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors font-medium"
                        >−</button>
                        <span className="w-5 text-center font-semibold text-sm">{qty}</span>
                        <button
                          onClick={() => onDryerVentLocationChange?.(loc.id, qty + 1)}
                          className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors font-medium"
                        >+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setDryerExpanded(true)}
              className="w-full py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold transition-colors border border-gray-200"
            >
              {lang === 'en' ? 'Add to Booking' : 'Ajouter à la réservation'}
            </button>
          )
        ) : isSelected && extra.hasQuantity ? (
          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
            <span className="text-xs font-semibold text-gray-600">
              {lang === 'en' ? 'Quantity Required:' : 'Quantité requise:'}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onQuantityChange(Math.max(0, quantity - 1))}
                className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors font-medium"
              >−</button>
              <span className="w-6 text-center font-semibold text-sm">{quantity}</span>
              <button
                onClick={() => onQuantityChange(quantity + 1)}
                className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors font-medium"
              >+</button>
            </div>
          </div>
        ) : isSelected ? (
          <button
            onClick={() => onQuantityChange(0)}
            className="w-full py-2 rounded-lg bg-blue-50 hover:bg-red-50 text-blue-600 hover:text-red-600 text-sm font-semibold transition-colors border border-blue-200 hover:border-red-200"
          >
            {lang === 'en' ? '✓ Added — Click to Remove' : '✓ Ajouté — Cliquer pour retirer'}
          </button>
        ) : (
          <button
            onClick={onAdd}
            className="w-full py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold transition-colors border border-gray-200"
          >
            {lang === 'en' ? 'Add to Booking' : 'Ajouter à la réservation'}
          </button>
        )}
      </div>
    </div>
  );
}
