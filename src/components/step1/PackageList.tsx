import type { ServiceCategory, ServicePackage } from '../../data/services';
import { useLang } from '../../context/LanguageContext';
import PackageDetailPanel from './PackageDetailPanel';
import { ChevronLeft } from 'lucide-react';

const SCAN_COLORS = {
  purple: 'bg-purple-700',
  green: 'bg-green-700',
  navy: 'bg-[#1a2e5a]',
};

interface Props {
  category: ServiceCategory;
  expandedPackageId: string | null;
  onExpandPackage: (id: string | null) => void;
  unitCounts: Record<string, number>;
  onUnitCountChange: (pkgId: string, count: number) => void;
  ventModes: Record<string, 'arrival' | 'known'>;
  onVentModeChange: (pkgId: string, mode: 'arrival' | 'known') => void;
  ventCounts: Record<string, number>;
  onVentCountChange: (pkgId: string, count: number) => void;
  dryerLocations: Record<string, number>;
  onDryerLocationChange: (locationId: string, qty: number) => void;
  onBack: () => void;
}

export default function PackageList({
  category,
  expandedPackageId,
  onExpandPackage,
  unitCounts,
  onUnitCountChange,
  ventModes,
  onVentModeChange,
  ventCounts,
  onVentCountChange,
  dryerLocations,
  onDryerLocationChange,
  onBack,
}: Props) {
  const { t, lang } = useLang();

  const isSpecialty = category.id === 'specialty';

  const handlePackageClick = (pkg: ServicePackage) => {
    if (isSpecialty) {
      // For specialty, toggle individual expansion
      onExpandPackage(expandedPackageId === pkg.id ? null : pkg.id);
    } else {
      // Accordion: toggle
      onExpandPackage(expandedPackageId === pkg.id ? null : pkg.id);
    }
  };

  return (
    <div>
      {/* Back link */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg mb-4 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        {lang === 'en' ? 'Back to categories' : 'Retour aux catégories'}
      </button>

      <h2 className="text-2xl font-bold text-gray-800">
        {lang === 'en' ? '1. Select a Service' : '1. Sélectionner un service'}
      </h2>
      <h3 className="text-lg font-semibold text-gray-800 mt-3">{t(category.name)}</h3>
      <p className="text-sm text-gray-500 mb-1">
        {lang === 'en' ? 'Choose the service level that fits your needs.' : 'Choisissez le niveau de service qui correspond à vos besoins.'}
      </p>
      {/* "I'm not sure, help me choose" — hidden for now
      {category.id === 'central-air' && (
        <button className="text-sm text-blue-600 hover:underline mb-4 flex items-center gap-1">
          {lang === 'en' ? "I'm not sure, help me choose" : "Je ne suis pas sûr, aidez-moi à choisir"}
          <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
        </button>
      )}
      */}

      <div className="space-y-3">
        {category.packages.map((pkg) => {
          const isExpanded = expandedPackageId === pkg.id;
          const priceNote = pkg.priceNote ? t(pkg.priceNote) : null;
          const priceLabel = pkg.priceLabel ? t(pkg.priceLabel) : null;

          return (
            <div key={pkg.id}>
              {isExpanded ? (
                <PackageDetailPanel
                  pkg={pkg}
                  unitCount={unitCounts[pkg.id] ?? 1}
                  onUnitCountChange={(c) => onUnitCountChange(pkg.id, c)}
                  ventMode={ventModes[pkg.id] ?? 'arrival'}
                  onVentModeChange={(m) => onVentModeChange(pkg.id, m)}
                  ventCount={ventCounts[pkg.id] ?? 0}
                  onVentCountChange={(c) => onVentCountChange(pkg.id, c)}
                  dryerLocations={dryerLocations}
                  onDryerLocationChange={onDryerLocationChange}
                />
              ) : (
                /* Collapsed card */
                <button
                  onClick={() => handlePackageClick(pkg)}
                  className="w-full text-left border border-gray-200 rounded-xl overflow-hidden hover:border-blue-400 hover:shadow-sm transition-all bg-white"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-gray-900 text-base">{t(pkg.name)}</span>
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
                        {pkg.bulletPoints ? (
                          <div className="mt-1">
                            <ul className="space-y-0.5">
                              {pkg.bulletPoints.map((bp, i) => (
                                <li key={i} className="flex items-center gap-1.5 text-sm text-blue-700">
                                  <span className="text-green-600">&#10003;</span> {t(bp)}
                                </li>
                              ))}
                            </ul>
                            {pkg.tagline && (
                              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                                <span>&#128077;</span> {t(pkg.tagline)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-blue-700 leading-snug">{t(pkg.description)}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {priceLabel && (
                          <p className="text-[10px] font-bold text-gray-400 tracking-wide">{priceLabel}</p>
                        )}
                        <p className="text-lg font-bold text-gray-900">${pkg.price.toFixed(2)}</p>
                        {priceNote && (
                          <p className="text-[10px] text-gray-400 font-semibold">{priceNote}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {pkg.scanBanner && (
                    <div className={`${SCAN_COLORS[pkg.scanBanner.color]} text-white text-center py-1.5 px-4 text-[10px] font-bold tracking-wide flex items-center justify-center gap-1.5`}>
                      <span>⚡</span>
                      {t(pkg.scanBanner.text)}
                    </div>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
