import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { Phone } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { LanguageProvider, useLang } from './context/LanguageContext';
import LangPill from './components/LangPill';
import HeroHeading from './components/HeroHeading';
import LeadForm, { type CapturedLead } from './components/LeadForm';
import { generateEventId } from './utils/tracking';
import { brand } from './brand';

/* The main 1cabooking funnel flow (details → green slots → book, all through
   the INTERNAL tool) is the bulk of the bundle and isn't needed until a lead
   is captured — load it on demand. */
const PreviewApp = lazy(() => import('./PreviewApp'));

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

/** Ask the host page to scroll the iframe into view from the top. */
function scrollHostToWidgetTop() {
  if (window.parent === window) return;
  window.parent.postMessage({ type: '1ca-widget-scroll-to-top' }, '*');
}

function Widget() {
  const [phase, setPhase] = useState<Phase>({ kind: 'lead' });
  const firstRender = useRef(true);
  useIframeAutoResize();

  /* One journey id per visitor: 'visit' the moment the widget loads (so
     window-shoppers are counted on /external), reused by the lead form and
     the booking body — visit → lead → booked stays ONE row. */
  const [eventId] = useState(generateEventId);
  const visitSent = useRef(false);

  /* Warm the funnel chunk while the visitor is still typing — the handoff
     after submit then skips the ~110 kB download entirely. Idle-scheduled so
     it never competes with the form's own first paint. */
  useEffect(() => {
    const warm = () => { void import('./PreviewApp'); };
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(warm, { timeout: 3000 });
    else setTimeout(warm, 1500);
  }, []);
  useEffect(() => {
    if (visitSent.current) return;
    visitSent.current = true;
    fetch('/api/journey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        op: 'visit',
        event_id: eventId,
        lead_type: 'widget_quote',
        source: 'widget',
        brand: brand.id,
        event_source_url: window.location.href,
      }),
    }).catch(() => { /* tracking down never blocks a visitor */ });
  }, [eventId]);

  /* Scroll the iframe to the top of the host viewport on phase transitions
     (lead → interstitial → booking → thanks). Fire immediately AND on the
     next frame — the immediate post lets the parent jump while the new
     phase is still painting, and the rAF re-post covers cases where the
     iframe's top moved due to layout changes between the two events. */
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    scrollHostToWidgetTop();
    const a = requestAnimationFrame(() => scrollHostToWidgetTop());
    return () => cancelAnimationFrame(a);
  }, [phase.kind]);

  return (
    <div className="relative">
      <LangPill />
      {phase.kind === 'lead' && (
        <>
          <HeroHeading />
          <LeadForm
            eventId={eventId}
            onInArea={(lead) => setPhase({ kind: 'booking', lead })}
            onOutOfArea={(firstName) => setPhase({ kind: 'oos', firstName })}
          />
        </>
      )}
      {phase.kind === 'booking' && (
        <Suspense fallback={
          <div className="bg-[#0c2137] px-4 py-20 text-center text-sm text-slate-300">
            {/* brief loading state while the booking chunk downloads */}
            Loading…
          </div>
        }>
          <PreviewApp lead={phase.lead} />
        </Suspense>
      )}
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
