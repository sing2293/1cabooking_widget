import { useLang } from '../context/LanguageContext';
import { brand } from '../brand';

export default function LangPill() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5 border-b border-gray-100 bg-white">
      <img
        src={brand.logo}
        alt={brand.name}
        className="h-8 w-auto object-contain"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
      <div className="flex items-center border border-gray-200 rounded-full overflow-hidden text-[11px] font-bold">
        <button
          onClick={() => setLang('en')}
          className={`px-3 py-1.5 transition-colors ${lang === 'en' ? 'bg-blue-700 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
        >
          EN
        </button>
        <button
          onClick={() => setLang('fr')}
          className={`px-3 py-1.5 transition-colors ${lang === 'fr' ? 'bg-blue-700 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
        >
          FR
        </button>
      </div>
    </div>
  );
}
