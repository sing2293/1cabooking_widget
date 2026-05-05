import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Lang } from '../data/services';
import { track } from '@vercel/analytics/react';

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (text: Record<Lang, string>) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

/** Pick the initial language from (in order):
 *  1. ?lang=fr or ?lang=en in the iframe URL — set by embed.js to match the host page
 *  2. Pathname starting with /fr — fallback for direct visits
 *  3. 'en' default */
function detectInitialLang(): Lang {
  const fromQuery = new URLSearchParams(window.location.search).get('lang');
  if (fromQuery === 'fr') return 'fr';
  if (fromQuery === 'en') return 'en';
  return window.location.pathname.startsWith('/fr') ? 'fr' : 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangRaw] = useState<Lang>(detectInitialLang);
  const setLang = (l: Lang) => {
    setLangRaw(l);
    track('language_switched', { language: l });
  };

  const t = (text: Record<Lang, string>) => text[lang];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used inside LanguageProvider');
  return ctx;
}
