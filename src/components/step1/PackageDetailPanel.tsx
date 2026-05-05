import { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { ServicePackage } from '../../data/services';
import { useLang } from '../../context/LanguageContext';

interface Props {
  pkg: ServicePackage;
  unitCount: number;
  onUnitCountChange: (count: number) => void;
  ventMode: 'arrival' | 'known';
  onVentModeChange: (mode: 'arrival' | 'known') => void;
  ventCount: number;
  onVentCountChange: (count: number) => void;
  dryerLocations: Record<string, number>;
  onDryerLocationChange: (id: string, qty: number) => void;
}

const SCAN_COLORS = {
  purple: 'bg-purple-700',
  green: 'bg-green-700',
  navy: 'bg-[#1a2e5a]',
};

export default function PackageDetailPanel({
  pkg,
  unitCount,
  onUnitCountChange,
  ventMode,
  onVentModeChange,
  ventCount,
  onVentCountChange,
  dryerLocations,
  onDryerLocationChange,
}: Props) {
  const { t, lang } = useLang();
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [pkg.id]);

  const half = Math.ceil(pkg.includes.length / 2);
  const leftIncludes = pkg.includes.slice(0, half);
  const rightIncludes = pkg.includes.slice(half);

  const priceLabel = pkg.priceLabel ? t(pkg.priceLabel) : null;
  const priceNote = pkg.priceNote ? t(pkg.priceNote) : null;

  return (
    <div className="border-2 border-blue-600 rounded-xl overflow-hidden bg-white shadow-sm">
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        <div className="w-full h-40 sm:w-48 sm:h-auto shrink-0 bg-gradient-to-br from-slate-600 to-blue-900 relative overflow-hidden">
          {pkg.image && !imgError ? (
            <img
              src={pkg.image}
              alt={t(pkg.name)}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-30">
              <svg className="w-16 h-16 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>
              </svg>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 p-5">
          {/* Title row */}
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-gray-900">{t(pkg.name)}</h3>
              {pkg.badge && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${
                    pkg.badge.color === 'purple' ? 'bg-purple-600' : 'bg-green-600'
                  }`}
                >
                  {t(pkg.badge.text)}
                </span>
              )}
            </div>
            <div className="text-right ml-4 shrink-0">
              {priceLabel && (
                <p className="text-[10px] font-bold text-gray-400 tracking-wide">{priceLabel}</p>
              )}
              <p className="text-xl font-bold text-gray-900">
                ${pkg.price.toFixed(2)}
              </p>
              {priceNote && (
                <p className="text-[10px] text-gray-400 font-semibold">{priceNote}</p>
              )}
            </div>
          </div>

          {/* Subtitle */}
          {pkg.subtitle && (
            <p className="text-xs font-semibold text-gray-500 mb-1">{t(pkg.subtitle)}</p>
          )}

          {/* Description */}
          <p className="text-sm text-blue-700 mb-4 leading-snug">{t(pkg.description)}</p>

          {/* Includes */}
          {pkg.includes.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-bold text-gray-500 tracking-widest mb-2 uppercase">
                {lang === 'en' ? 'Package Includes:' : 'Le forfait comprend:'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                {leftIncludes.map((item, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-700">{t(item)}</span>
                  </div>
                ))}
                {rightIncludes.map((item, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-700">{t(item)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Why Choose */}
          {pkg.whyChoose && pkg.whyChoose.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-bold text-gray-500 tracking-widest mb-2 uppercase">
                {lang === 'en' ? 'Why choose 1 CLEAN AIR:' : 'Pourquoi choisir 1 CLEAN AIR:'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                {pkg.whyChoose.map((item, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-700">{t(item)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vent Count (for Central Air / Air Exchanger) */}
          {pkg.hasVentCount && (
            <div className="bg-blue-50 rounded-lg p-3 mb-3">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                {lang === 'en' ? 'Want a more exact quote?' : 'Voulez-vous un devis plus précis?'}
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => onVentModeChange('arrival')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded border transition-colors ${
                    ventMode === 'arrival'
                      ? 'border-blue-600 text-blue-700 bg-white'
                      : 'border-gray-300 text-gray-500 bg-white hover:border-blue-400'
                  }`}
                >
                  {lang === 'en' ? 'Count on Arrival (Recommended)' : 'Compter à l\'arrivée (recommandé)'}
                </button>
                <button
                  onClick={() => onVentModeChange('known')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded border transition-colors ${
                    ventMode === 'known'
                      ? 'border-blue-600 text-blue-700 bg-white'
                      : 'border-gray-300 text-blue-600 bg-transparent hover:bg-blue-50'
                  }`}
                >
                  {lang === 'en' ? 'I know my vent count' : 'Je connais mon nombre de bouches'}
                </button>
              </div>
              <p className="text-[11px] text-blue-600 mt-1.5 italic">
                {lang === 'en'
                  ? "Don't worry if you're unsure. Our technicians will do an official count with you upon arrival."
                  : "Ne vous inquiétez pas si vous n'êtes pas sûr. Nos techniciens feront un compte officiel à l'arrivée."}
              </p>
              {ventMode === 'known' && (
                <div className="mt-2 flex items-center gap-2">
                  <label className="text-xs text-gray-600">
                    {lang === 'en' ? 'Number of vents:' : 'Nombre de bouches:'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={ventCount}
                    onChange={(e) => onVentCountChange(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 border border-gray-300 rounded px-2 py-1 text-sm text-center"
                  />
                </div>
              )}
            </div>
          )}

          {/* Dryer Vent Locations */}
          {pkg.dryerLocations && (
            <div className="mb-3">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                {lang === 'en'
                  ? 'Where is the dryer exhaust duct located outside?'
                  : 'Où est situé le conduit d\'évacuation du sécheuse à l\'extérieur?'}
              </p>
              <div className="space-y-2">
                {pkg.dryerLocations.map((loc) => {
                  const qty = dryerLocations[loc.id] ?? 0;
                  return (
                    <div key={loc.id} className="flex items-center justify-between">
                      <span className="text-sm text-blue-700">
                        {t(loc.label)} (${loc.price.toFixed(2)})
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onDryerLocationChange(loc.id, Math.max(0, qty - 1))}
                          className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:border-blue-500 hover:text-blue-600 transition-colors text-sm"
                        >
                          −
                        </button>
                        <span className="w-5 text-center text-sm font-medium">{qty}</span>
                        <button
                          onClick={() => onDryerLocationChange(loc.id, qty + 1)}
                          className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:border-blue-500 hover:text-blue-600 transition-colors text-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Unit Count (for non-dryer services) */}
          {!pkg.dryerLocations && pkg.unitLabel && (
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-700">
                {lang === 'en'
                  ? `How many ${t(pkg.unitLabel)} does this home have?`
                  : `Combien de ${t(pkg.unitLabel)} cette maison possède-t-elle?`}
              </label>
              <input
                type="number"
                min={1}
                value={unitCount}
                onChange={(e) => onUnitCountChange(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-14 border border-gray-300 rounded px-2 py-1.5 text-sm text-center font-medium"
              />
            </div>
          )}
        </div>
      </div>

      {/* Scan Banner */}
      {pkg.scanBanner && (
        <div className={`${SCAN_COLORS[pkg.scanBanner.color]} text-white text-center py-2 px-4 text-xs font-bold tracking-wide flex items-center justify-center gap-2`}>
          <span>⚡</span>
          {t(pkg.scanBanner.text)}
        </div>
      )}
    </div>
  );
}
