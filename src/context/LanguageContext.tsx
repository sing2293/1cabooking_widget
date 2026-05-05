import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Lang } from '../data/services';
import { track } from '@vercel/analytics/react';

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (text: Record<Lang, string>) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangRaw] = useState<Lang>(
    window.location.pathname.startsWith('/fr') ? 'fr' : 'en'
  );
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
