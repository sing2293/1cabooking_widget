import { useEffect, useState } from 'react';
import { Phone } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { LanguageProvider, useLang } from './context/LanguageContext';
import LangPill from './components/LangPill';
import LeadForm, { type CapturedLead } from './components/LeadForm';
import BookingFlow from './components/BookingFlow';
import { brand } from './brand';

type Phase =
  | { kind: 'lead' }
  | { kind: 'booking'; lead: CapturedLead }
  | { kind: 'oos'; firstName: string };

/** Posts {height} to the parent on mount + via ResizeObserver. No-op when not iframed. */
function useIframeAutoResize() {
  useEffect(() => {
    if (window.parent === window) return;
    const post = () => {
      window.parent.postMessage(
        { type: '1ca-widget-resize', height: document.body.scrollHeight },
        '*',
      );
    };
    post();
    const ro = new ResizeObserver(post);
    ro.observe(document.body);
    window.addEventListener('load', post);
    return () => {
      ro.disconnect();
      window.removeEventListener('load', post);
    };
  }, []);
}

function ThanksScreen({ firstName }: { firstName: string }) {
  const { lang } = useLang();
  return (
    <div className="px-4 py-12 sm:py-16">
      <div className="w-full max-w-md mx-auto text-center">
        <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-blue-50 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-blue-700" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {lang === 'en' ? `Thanks${firstName ? `, ${firstName}` : ''}!` : `Merci${firstName ? `, ${firstName}` : ''}!`}
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          {lang === 'en'
            ? 'We’ve received your request — our team will get in touch with you shortly to discuss your project and next steps.'
            : 'Nous avons reçu votre demande — notre équipe vous contactera sous peu pour discuter de votre projet et des prochaines étapes.'}
        </p>
        <p className="text-xs uppercase tracking-wide font-bold text-gray-500 mb-2">
          {lang === 'en' ? 'Need us sooner?' : 'Besoin de nous plus tôt?'}
        </p>
        <a
          href={`tel:${brand.phoneDigits}`}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-base transition-colors"
        >
          <Phone className="w-5 h-5" />
          {brand.phoneDisplay}
        </a>
      </div>
    </div>
  );
}

function Widget() {
  const [phase, setPhase] = useState<Phase>({ kind: 'lead' });
  useIframeAutoResize();

  return (
    <div className="bg-white">
      <LangPill />
      {phase.kind === 'lead' && (
        <LeadForm
          onInArea={(lead) => setPhase({ kind: 'booking', lead })}
          onOutOfArea={(firstName) => setPhase({ kind: 'oos', firstName })}
        />
      )}
      {phase.kind === 'booking' && <BookingFlow lead={phase.lead} />}
      {phase.kind === 'oos' && <ThanksScreen firstName={phase.firstName} />}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <Widget />
      <Analytics />
    </LanguageProvider>
  );
}
