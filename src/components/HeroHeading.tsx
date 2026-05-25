import { useLang } from '../context/LanguageContext';

/** Eye-catching "Get a quote & book online!" intro that sits above the
 *  navy lead form. Two curved arrows flank the title pointing inward. */
export default function HeroHeading() {
  const { lang } = useLang();
  return (
    <div className="bg-white px-4 pt-14 sm:pt-16 pb-3 sm:pb-4">
      <div className="flex items-center justify-center gap-2 sm:gap-4 max-w-3xl mx-auto">
        <ArrowCurveLeft className="w-10 h-8 sm:w-16 sm:h-12 text-blue-400 flex-shrink-0" />
        <h1 className="text-base sm:text-2xl md:text-3xl font-extrabold text-blue-900 text-center leading-tight">
          {lang === 'en'
            ? 'Get a quote & book online!'
            : 'Obtenez une soumission et réservez en ligne !'}
        </h1>
        <ArrowCurveRight className="w-10 h-8 sm:w-16 sm:h-12 text-blue-400 flex-shrink-0" />
      </div>
    </div>
  );
}

function ArrowCurveLeft({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 80"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Curl/loop in the top-left */}
      <path d="M 30 8 C 8 6, 4 26, 20 28 C 30 28, 30 14, 22 12 C 14 13, 16 24, 22 30" />
      {/* Long sweep down and to the right toward the heading */}
      <path d="M 22 30 C 30 46, 50 58, 88 66" />
      {/* Arrowhead at the end */}
      <path d="M 78 60 L 88 66 L 82 74" />
    </svg>
  );
}

function ArrowCurveRight({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 80"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Smooth sweeping curve from top-right down to the heading on the left */}
      <path d="M 75 8 C 65 22, 50 38, 30 56 C 22 62, 16 64, 12 66" />
      {/* Arrowhead pointing left-down */}
      <path d="M 20 60 L 12 66 L 16 74" />
    </svg>
  );
}
