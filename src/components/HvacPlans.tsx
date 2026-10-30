// The HVAC maintenance plans, for the customer to pick from (Anuj
// 2026-09-24): 1-Unit, 2-Unit and 3-Unit, Monthly or Annually ("1 month
// free"). Identical in the website and the widget; the plans themselves come
// from src/data/hvacPlans.ts.
// COMPACT since 2026-10-30 (Anuj: "make membership plan section smaller, make
// this info appear by Info button … Just show key details like price and what
// it covers"): each card is the plan, what it covers and the price; the
// benefits, the pitch and everything included open behind "Info". Shown when
// the customer answers "No" to "Are you a member?" — picking a plan sells it
// with the booking (the internal tool resolves it; the office calls about
// payment) and makes today's maintenance $0.
import { useState } from 'react';
import { HVAC_PLANS, annualPerMonth, type Bi, type HvacPlanInfo } from '../data/hvacPlans';

export type PlanChoice = { key: HvacPlanInfo['key']; billing: 'monthly' | 'annual' } | 'none' | null;

const W = {
  monthly: { en: 'Monthly', fr: 'Mensuel' },
  annually: { en: 'Annually', fr: 'Annuel' },
  oneMonthFree: { en: '1 month free', fr: '1 mois gratuit' },
  popular: { en: 'Popular', fr: 'Populaire' },
  perMonth: { en: '/month', fr: '/mois' },
  perYear: { en: '/yr', fr: '/an' },
  billedAnnually: { en: 'billed yearly', fr: 'facturé annuellement' },
  info: { en: 'Info', fr: 'Info' },
  choose: { en: 'Choose', fr: 'Choisir' },
  selected: { en: 'Selected', fr: 'Choisi' },
  notNow: { en: 'Not now', fr: 'Pas maintenant' },
};

/** The plan's icon: one ring per unit covered. */
function Rings({ n }: { n: 1 | 2 | 3 }) {
  return (
    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[2.5px] border-orange-600">
      {n >= 2 && (
        <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border-[2.5px] border-teal-700">
          {n >= 3 && <span className="h-1 w-1 rounded-full bg-amber-400" />}
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
  const infoPlan = HVAC_PLANS.find((p) => p.key === open) || null;

  return (
    <div>
      <div className="flex justify-center">
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-0.5 shadow-sm">
          {(['monthly', 'annual'] as const).map((b) => (
            <button key={b} type="button" onClick={() => pickBilling(b)}
              className={`nf-press inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${billing === b ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}>
              {b === 'monthly' ? L(W.monthly) : L(W.annually)}
              {b === 'annual' && <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-extrabold text-slate-900">{L(W.oneMonthFree)}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {HVAC_PLANS.map((p) => {
          const chosen = !!value && value !== 'none' && value.key === p.key;
          const price = billing === 'monthly' ? p.monthly : annualPerMonth(p);
          return (
            <div key={p.key}
              className={`relative flex flex-col rounded-lg border bg-white p-2.5 ${chosen ? 'border-sky-600 ring-2 ring-sky-600' : p.popular ? 'border-amber-400' : 'border-slate-200'}`}>
              <div className="flex items-start gap-2">
                <Rings n={p.rings} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-extrabold leading-tight text-slate-900">
                    {L(p.name)}
                    {p.popular && <span className="ml-1.5 rounded-full bg-amber-400 px-1.5 py-0.5 align-middle text-[8px] font-extrabold uppercase tracking-wide text-slate-900">{L(W.popular)}</span>}
                  </p>
                  <p className="text-[11px] leading-snug text-slate-500">{L(p.tagline)}</p>
                </div>
              </div>
              <p className="mt-1.5 leading-none">
                <span className="text-lg font-extrabold text-slate-900">{money(price)}</span>
                <span className="ml-0.5 text-[11px] text-slate-500">{L(W.perMonth)}</span>
                {billing === 'annual' && <span className="ml-1 text-[10px] text-slate-500">· {money(p.annual)}{L(W.perYear)} {L(W.billedAnnually)}</span>}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <button type="button" onClick={() => onChange(chosen ? null : { key: p.key, billing })}
                  className={`nf-press flex-1 rounded-md px-2.5 py-1.5 text-[11px] font-bold ${chosen ? 'bg-sky-600 text-white' : p.popular ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                  {chosen ? `✓ ${L(W.selected)}` : L(W.choose)}
                </button>
                <button type="button" onClick={() => setOpen(open === p.key ? null : p.key)} aria-expanded={open === p.key}
                  className={`nf-press rounded-md border px-2 py-1.5 text-[11px] font-bold ${open === p.key ? 'border-sky-600 bg-sky-50 text-sky-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                  ⓘ {L(W.info)}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Everything about one plan, behind its Info button — one open at a time. */}
      {infoPlan && (
        <div className="nf-rise mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[13px] font-extrabold text-slate-900">{L(infoPlan.name)}</p>
            <button type="button" onClick={() => setOpen(null)} className="text-sm font-bold leading-none text-slate-400 hover:text-slate-700" aria-label="close">✕</button>
          </div>
          <ul className="mt-1.5 space-y-0.5">
            {infoPlan.highlights.map((h) => (
              <li key={h.en} className="flex gap-1.5 text-[12px] leading-snug text-slate-700"><span className="font-bold text-emerald-600">✓</span><span>{L(h)}</span></li>
            ))}
          </ul>
          <p className="mt-2 border-l-2 border-amber-400 pl-2 text-[11px] italic leading-snug text-slate-500">“{L(infoPlan.quote)}”</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {infoPlan.included.map((sec) => (
              <div key={sec.title.en}>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{L(sec.title)}</p>
                <ul className="mt-0.5 space-y-0.5">
                  {sec.items.map((it) => <li key={it.en} className="text-[11px] leading-snug text-slate-600">· {L(it)}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-2 flex justify-center">
        <button type="button" onClick={() => onChange(value === 'none' ? null : 'none')}
          className={`nf-press rounded border px-3 py-1.5 text-xs font-semibold ${value === 'none' ? 'border-sky-600 bg-sky-50 text-sky-900 ring-1 ring-sky-600' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
          {L(W.notNow)}
        </button>
      </div>
    </div>
  );
}
