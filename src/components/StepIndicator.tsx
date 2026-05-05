import { Check } from 'lucide-react';
import { useLang } from '../context/LanguageContext';

const STEPS = [
  { num: 1, label: { en: 'SERVICE',  fr: 'SERVICE'     } },
  { num: 2, label: { en: 'EXTRAS',   fr: 'EXTRAS'      } },
  { num: 3, label: { en: 'DETAILS',  fr: 'DÉTAILS'     } },
  { num: 4, label: { en: 'TIME',     fr: 'TEMPS'       } },
  { num: 5, label: { en: 'REVIEW',   fr: 'RÉVISION'    } },
];

interface Props {
  currentStep: number;
}

export default function StepIndicator({ currentStep }: Props) {
  const { t } = useLang();

  return (
    <div className="flex items-center justify-between max-w-2xl mx-auto py-4 sm:py-5">
      {STEPS.map((step, idx) => {
        const isActive    = step.num === currentStep;
        const isCompleted = step.num < currentStep;

        return (
          <div key={step.num} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              {/* Circle */}
              <div
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ring-2 ring-offset-1 transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white ring-blue-300 shadow-md shadow-blue-200'
                    : isCompleted
                    ? 'bg-emerald-500 text-white ring-emerald-200'
                    : 'bg-gray-100 text-gray-400 ring-gray-100'
                }`}
              >
                {isCompleted
                  ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={3} />
                  : step.num}
              </div>
              {/* Label */}
              <span
                className={`hidden sm:block mt-1.5 text-[9px] sm:text-[10px] font-bold tracking-widest transition-colors ${
                  isActive
                    ? 'text-blue-600'
                    : isCompleted
                    ? 'text-emerald-600'
                    : 'text-gray-300'
                }`}
              >
                {t(step.label)}
              </span>
            </div>

            {/* Connector line */}
            {idx < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 mb-0 sm:mb-4 rounded-full transition-colors duration-300 ${
                  isCompleted ? 'bg-emerald-400' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
