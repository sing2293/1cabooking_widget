import { useLang } from '../context/LanguageContext';

/** "Get a quote & book online!" intro bar above the lead form. */
export default function HeroHeading() {
  const { lang } = useLang();
  return (
    <div className="bg-blue-900 px-4 pt-14 sm:pt-16 pb-2">
      <h1 className="text-lg sm:text-2xl md:text-3xl font-extrabold text-white text-center leading-tight max-w-3xl mx-auto">
        {lang === 'en'
          ? 'Get a quote & book online!'
          : 'Obtenez une soumission et réservez en ligne !'}
      </h1>
    </div>
  );
}
