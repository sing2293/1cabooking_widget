import { useLang } from '../context/LanguageContext';

/** Small floating EN/FR toggle, anchored to the widget's top-right corner. */
export default function LangPill() {
  const { lang, setLang } = useLang();
  return (
    <div className="absolute top-3 right-3 z-30 flex items-center bg-white rounded-full shadow-md border border-gray-200 text-[11px] font-bold overflow-hidden">
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`px-3 py-1.5 transition-colors ${
          lang === 'en' ? 'bg-blue-700 text-white' : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang('fr')}
        className={`px-3 py-1.5 transition-colors ${
          lang === 'fr' ? 'bg-blue-700 text-white' : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        FR
      </button>
    </div>
  );
}
