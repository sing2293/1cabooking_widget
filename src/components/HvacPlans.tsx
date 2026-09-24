// The HVAC maintenance plans, for the customer to pick from (Anuj
// 2026-09-24): 1-Unit, 2-Unit and 3-Unit, Monthly or Annually ("1 month
// free"), each with its benefits, its pitch and "See everything included".
// Replaces the old single "Maintenance Plan — I'm interested" card. Choosing
// a plan does not sign anyone up: the choice rides on the booking, and the
// team follows up to set the plan up. Identical in the website and the
// widget; the plans themselves come from src/data/hvacPlans.ts.
import { useState } from 'react';
import { HVAC_PLANS, annualPerMonth, type Bi, type HvacPlanInfo } from '../data/hvacPlans';

export type PlanChoice = { key: HvacPlanInfo['key']; billing: 'monthly' | 'annual' } | 'none' | null;

const W = {
  monthly: { en: 'Monthly', fr: 'Mensuel' },
  annually: { en: 'Annually', fr: 'Annuel' },
  oneMonthFree: { en: '1 month free', fr: '1 mois gratuit' },
  popular: { en: 'Popular starter plan', fr: 'Forfait de départ populaire' },
  perMonth: { en: '/month', fr: '/mois' },
  perYear: { en: '/yr', fr: '/an' },
  billedMonthly: { en: 'Billed monthly', fr: 'Facturé mensuellement' },
  billedAnnually: { en: 'Billed annually', fr: 'Facturé annuellement' },
  seeAll: { en: 'See everything included', fr: 'Voir tout ce qui est inclus' },
  selected: { en: 'Selected', fr: 'Choisi' },
  notNow: { en: 'Not now', fr: 'Pas maintenant' },
};

/** The plan's icon: one ring per unit covered. */
function Rings({ n }: { n: 1 | 2 | 3 }) {
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-orange-600">
      {n >= 2 && (
        <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border-[3px] border-teal-700">
          {n >= 3 && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
        </span>
      )}
    </span>
  );
}

export default function HvacPlans({ lang, value, onChange }: { lang: string; value: PlanChoice; onChange: (v: PlanChoice) => void }) {
  const L = (b: Bi) => (lang === 'fr' ? b.fr : b.en);
  const money = (n: number) => (lang === 'fr' ? `${n.toFixed(2).replace('.', ',')} $` : `$${n.toFixed(2)}`);
  const [billing, setBilling] = useState<'monthly' | 'annual'>(value && value !== 'none' ? value.billing : 'monthly');
  const [open, setOpen] = useState<string | null>(null);
  const pickBilling = (b: 'monthly' | 'annual') => {
    setBilling(b);
    if (value && value !== 'none') onChange({ ...value, billing: b });
  };

  return (
    <div>
      <div className="flex justify-center">
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
          {(['monthly', 'annual'] as const).map((b) => (
            <button key={b} type="button" onClick={() => pickBilling(b)}
              className={`nf-press inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold ${billing === b ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}>
              {b === 'monthly' ? L(W.monthly) : L(W.annually)}
              {b === 'annual' && <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-extrabold text-slate-900">{L(W.oneMonthFree)}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3 sm:gap-3">
        {HVAC_PLANS.map((p) => {
          const chosen = !!value && value !== 'none' && value.key === p.key;
          const price = billing === 'monthly' ? p.monthly : annualPerMonth(p);
          return (
            <div key={p.key}
              className={`relative flex flex-col rounded-xl border bg-white p-3.5 ${chosen ? 'border-sky-600 ring-2 ring-sky-600' : p.popular ? 'border-amber-400' : 'border-slate-200'}`}>
              {p.popular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-slate-900">
                  {L(W.popular)}
                </span>
              )}
              <Rings n={p.rings} />
              <p className="mt-2 text-sm font-extrabold leading-tight text-slate-900">{L(p.name)}</p>
              <p className="text-[11px] text-slate-500">{L(p.tagline)}</p>
              <p className="mt-2 leading-none">
                <span className="text-2xl font-extrabold text-slate-900">{money(price)}</span>
                <span className="ml-1 text-xs text-slate-500">{L(W.perMonth)}</span>
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                {billing === 'monthly' ? L(W.billedMonthly) : `${L(W.billedAnnually)} · ${money(p.annual)}${L(W.perYear)} — ${L(W.oneMonthFree)}`}
              </p>
              <ul className="mt-2.5 space-y-1">
                {p.highlights.map((h) => (
                  <li key={h.en} className="flex gap-1.5 text-[12px] leading-snug text-slate-700">
                    <span className="font-bold text-emerald-600">✓</span><span>{L(h)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2.5 border-l-2 border-amber-400 pl-2 text-[11px] italic leading-snug text-slate-500">“{L(p.quote)}”</p>
              <button type="button" onClick={() => setOpen(open === p.key ? null : p.key)}
                className="mt-2 text-left text-[11px] font-bold text-sky-800 hover:underline">
                {L(W.seeAll)} {open === p.key ? '▴' : '▾'}
              </button>
              {open === p.key && (
                <div className="mt-1.5 space-y-2">
                  {p.included.map((sec) => (
                    <div key={sec.title.en}>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{L(sec.title)}</p>
                      <ul className="mt-0.5 space-y-0.5">
                        {sec.items.map((it) => <li key={it.en} className="text-[11px] leading-snug text-slate-600">· {L(it)}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-auto pt-3">
                <button type="button" onClick={() => onChange(chosen ? null : { key: p.key, billing })}
                  className={`nf-press w-full rounded-lg px-3 py-2 text-xs font-bold leading-tight ${chosen ? 'bg-sky-600 text-white' : p.popular ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                  {chosen ? `✓ ${L(W.selected)}` : lang === 'fr' ? 'Choisir ce plan' : `Choose ${p.name.en}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex justify-center">
        <button type="button" onClick={() => onChange(value === 'none' ? null : 'none')}
          className={`nf-press rounded border px-4 py-2 text-sm font-semibold ${value === 'none' ? 'border-sky-600 bg-sky-50 text-sky-900 ring-1 ring-sky-600' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
          {L(W.notNow)}
        </button>
      </div>
    </div>
  );
}
