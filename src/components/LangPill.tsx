import { useLang } from '../context/LanguageContext';

/** Floating EN/FR toggle at the top of the widget. Tracks the form's
 *  max-w-3xl content edge on tablet/desktop (so it lines up with the
 *  rest of the form), and falls back to the viewport edge on phones. */
export default function LangPill() {
  const { lang, setLang } = useLang();
  return (
    <div className="absolute top-4 sm:top-5 left-0 right-0 z-30 px-4 sm:px-8 pointer-events-none">
      <div className="max-w-3xl mx-auto flex justify-end">
        <div className="pointer-events-auto flex items-center bg-white rounded-full shadow-md border border-gray-200 text-[11px] font-bold overflow-hidden">
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
      </div>
    </div>
  );
}
