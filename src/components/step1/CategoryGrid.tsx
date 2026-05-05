import { SERVICES, type ServiceCategory } from '../../data/services';
import { useLang } from '../../context/LanguageContext';
import ServiceIcon from './ServiceIcon';
import { brand, type Region } from '../../brand';

interface Props {
  onSelectCategory: (category: ServiceCategory) => void;
  region?: string;
}

export default function CategoryGrid({ onSelectCategory, region }: Props) {
  const { t, lang } = useLang();

  const hidden = brand.hiddenCategoriesByRegion?.[region as Region] ?? [];
  const visibleServices = hidden.length > 0
    ? SERVICES.filter((s) => !hidden.includes(s.id))
    : SERVICES;

  const mainService = visibleServices[0]; // Central Air — most popular
  const otherServices = visibleServices.slice(1);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-5">
        {lang === 'en' ? '1. Select a Service' : '1. Sélectionner un service'}
      </h2>

      <div className="text-center mb-6">
        <p className="text-base font-semibold text-gray-800">
          {lang === 'en' ? 'What are we cleaning today?' : 'Qu\'est-ce qu\'on nettoie aujourd\'hui?'}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {lang === 'en'
            ? 'Select your system type to see relevant packages.'
            : 'Sélectionnez votre type de système pour voir les forfaits.'}
        </p>
      </div>

      {/* Main / Most Popular card */}
      <button
        onClick={() => onSelectCategory(mainService)}
        className="w-full text-left border border-gray-200 rounded-xl p-5 mb-4 hover:border-blue-400 hover:shadow-md transition-all relative bg-white group"
      >
        <span className="absolute top-3 right-3 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">
          {lang === 'en' ? 'MOST POPULAR' : 'PLUS POPULAIRE'}
        </span>
        <div className="flex items-start gap-4">
          <div className="bg-blue-700 text-white p-2.5 rounded-lg mt-0.5">
            <ServiceIcon type={mainService.icon} className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-gray-800 text-base">{t(mainService.name)}</p>
            <p className="text-sm text-gray-500 mt-0.5">{t(mainService.description)}</p>
          </div>
        </div>
      </button>

      {/* 2x2 grid of other services */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {otherServices.map((svc) => (
          <button
            key={svc.id}
            onClick={() => onSelectCategory(svc)}
            className="text-left border border-gray-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-md transition-all bg-white"
          >
            <div className="flex items-start gap-3">
              <div className="bg-gray-100 text-gray-500 p-2 rounded-lg mt-0.5">
                <ServiceIcon type={svc.icon} className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{t(svc.name)}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-snug">{t(svc.description)}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
