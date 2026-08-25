import { useEffect, useMemo, useState } from 'react';
import { useLang } from '../../context/LanguageContext';
import { brand } from '../../brand';
import SlotPicker from '../SlotPicker';

/* ── /admin preview: SELF-CONTAINED HVAC booking (ServiceTitan), dark ──
   Mirrors the internal scheduler: estimate (hourly 1:30 visits) or repair /
   maintenance (half-day frames, capacity-counted). When the surrounding flow
   already collected the customer (step 2) it books with THAT info — no
   second form; the mode pre-wires from the HVAC tiles picked at step 1. */

export type HvacMode = 'estimate' | 'repair' | 'maintenance';

export interface HvacPrefill {
  name: string; phone: string; email: string;
  street: string; city: string; zip: string;
  details?: string;
}

interface Board { date: string; openSlots: number; slots: { freeIds: (string | number)[] }[]; jobs?: Record<string, number> }
interface Avail { ok: boolean; times: { t: string; en: string; fr: string }[]; board: Board[] }

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const CARD = 'bg-[#15304f]';

interface Props {
  /** step-2 info — when present the panel books with it (no second form) */
  prefill?: HvacPrefill | null;
  /** pre-wired from the step-1 HVAC tiles (repair tiles → repair) */
  initialMode?: HvacMode;
  /** the chosen tile labels — ride the booking details for dispatch */
  picks?: string[];
  /** which modes the step-1 tiles allow (install tiles → estimate only;
   *  repair tiles → repair + maintenance). Default: all three. */
  allowedModes?: HvacMode[];
  /** the journey's lead id — rides the booking so n8n can join lead → booking */
  leadEventId?: string;
  /** deal number from the ?dnum= link param — rides the booking webhook */
  dnum?: string;
  /** the whole step-2 lead payload (webhook #1's fields) — forwarded into the
   *  HVAC booking webhook so n8n has everything without a join */
  leadInfo?: Record<string, unknown>;
  /** when given, a Back button sits on the same row as the book button (left) */
  onBack?: () => void;
  /** white styling + the calendar picker (the /new flow); default is the dark admin look */
  light?: boolean;
  /** when given, the button says Continue and hands the pick to the flow (Review & book) instead of booking here */
  onContinue?: (pick: { date: string; time: string; label: string }, mode: HvacMode) => void;
}

export default function HvacMini({ prefill = null, initialMode = 'estimate', picks = [], allowedModes = ['estimate', 'repair', 'maintenance'], leadEventId, dnum, leadInfo, onBack, light = false, onContinue }: Props) {
  const { lang } = useLang();
  const [mode, setMode] = useState<HvacMode>(initialMode);
  useEffect(() => { setMode(initialMode); }, [initialMode]);
  // never sit on a mode the picked tiles don't allow
  useEffect(() => {
    if (!allowedModes.includes(mode)) setMode(allowedModes[0] ?? 'estimate');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedModes.join('|')]);
  const [avail, setAvail] = useState<Avail | null>(null);
  const [availLoading, setAvailLoading] = useState(false);
  const [pick, setPick] = useState<{ date: string; time: string; label: string } | null>(null);
  // fallback form (only when the flow didn't collect the customer already)
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');
  const [details, setDetails] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    setPick(null);
    setAvailLoading(true);
    const start = addDays(todayISO(), 1); // never today
    fetch('/api/hvac-availability', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start, days: 14, mode }),
    })
      .then((r) => r.json())
      .then((j) => setAvail(j?.ok ? j : null))
      .catch(() => setAvail(null))
      .finally(() => setAvailLoading(false));
  }, [mode]);

  const openDays = useMemo(() => (avail?.board ?? [])
    .map((d) => ({
      date: d.date,
      open: d.slots
        .map((s, i) => ({ i, free: (s.freeIds?.length ?? 0) > 0,
          // GREEN = a free crew with no jobs that day yet — the visit anchors
          // their route (the board's "1st Book" idea).
          green: (s.freeIds ?? []).some((id) => ((d.jobs ?? {})[String(id)] ?? 0) === 0) }))
        .filter((x) => x.free)
        .map((x) => ({ ...avail!.times[x.i], green: x.green })),
    }))
    .filter((d) => d.open.length > 0), [avail]);

  const who = prefill ?? { name, phone, email, street, city, zip, details };
  const canSend = !!pick && who.name.trim().length > 1 && who.phone.replace(/\D/g, '').length >= 10 && who.street.trim() !== '' && who.city.trim() !== '';

  const submit = async () => {
    if (!canSend || state === 'sending') return;
    setState('sending'); setError('');
    try {
      const extra = [
        picks.length ? `${lang === 'en' ? 'Requested' : 'Demandé'}: ${picks.join(', ')}` : '',
        (prefill?.details ?? details).trim(),
      ].filter(Boolean).join('\n');
      const r = await fetch('/api/hvac-book', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode, category: mode === 'maintenance' ? 'maintenance' : '',
          date: pick!.date, time: pick!.time,
          name: who.name.trim(), phone: who.phone.replace(/\D/g, ''), email: who.email.trim(),
          street: who.street.trim(), city: who.city.trim(), state: 'ON', zip: who.zip.trim(),
          additionalDetails: extra, customerType: 'Residential',
          leadEventId: leadEventId || undefined,
          dnum: dnum || undefined,
          lead: leadInfo || undefined,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.error) throw new Error(j?.message || j?.error || `Error ${r.status}`);
      // the INTERNAL tool fires the HVAC booking webhook (it books in ST)
      setState('done');
    } catch (e) {
      setState('error');
      setError((e as Error).message);
    }
  };

  const PILL_IN = 'w-full rounded-lg border border-[#2a4d7a] bg-[#0f2745] px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-sky-400 outline-none';
  const label = `block text-[11px] font-bold uppercase tracking-wider mb-1 ${light ? 'text-slate-500' : 'text-slate-300'}`;
  const L = (dark: string, lt: string) => (light ? lt : dark);

  if (state === 'done') {
    return (
      <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-6 text-center">
        <p className="text-lg font-bold text-emerald-300">{lang === 'en' ? 'HVAC visit booked!' : 'Visite CVC réservée!'}</p>
        <p className="mt-1 text-sm text-emerald-200/80">
          {pick && `${pick.date} · ${pick.label}`} — {lang === 'en' ? "we'll confirm by phone shortly." : 'nous confirmerons par téléphone sous peu.'}
        </p>
      </div>
    );
  }

  return (
    <div className={light ? 'space-y-4' : `space-y-4 rounded-2xl ${CARD} p-4 sm:p-5`}>
      {!light && <div>
        <p className={`text-sm font-bold ${L('text-white', 'text-slate-900')}`}>{lang === 'en' ? 'Furnace, heat pump & A/C service' : 'Fournaise, thermopompe et climatisation'}</p>
        <p className={`mt-0.5 text-sm ${L('text-slate-300', 'text-slate-600')}`}>
          {lang === 'en' ? 'Real-time openings from our HVAC dispatch calendar.' : 'Disponibilités en temps réel de notre calendrier CVC.'}
        </p>
      </div>}

      {/* what do you need — decided by the question flow when only one mode is
          allowed (Anuj: no toggle then), otherwise pick here */}
      {allowedModes.length === 1 ? (light ? null :
        <p className={`inline-flex rounded-lg px-3 py-1.5 text-xs font-bold ring-1 ${L('bg-sky-500/15 text-sky-300 ring-sky-400/30', 'bg-sky-50 text-sky-700 ring-sky-200')}`}>
          {mode === 'repair' ? (lang === 'en' ? 'Repair visit · $169 dispatch fee' : 'Réparation · 169 $ de déplacement') : mode === 'maintenance' ? (lang === 'en' ? 'Maintenance / tune-up' : 'Entretien') : (lang === 'en' ? 'Free estimate / quote' : 'Estimation gratuite')}
        </p>
      ) : (
      <div className="flex flex-wrap gap-1.5">
        {([
          ['estimate', lang === 'en' ? 'Free estimate / quote' : 'Estimation gratuite'],
          ['repair', lang === 'en' ? 'Repair visit ($169 dispatch fee)' : 'Réparation (169 $ de déplacement)'],
          ['maintenance', lang === 'en' ? 'Maintenance / tune-up' : 'Entretien'],
        ] as [HvacMode, string][]).filter(([m]) => allowedModes.includes(m)).map(([m, lbl]) => (
          <button key={m} onClick={() => setMode(m)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${mode === m ? 'bg-sky-500 text-white' : 'bg-white/5 text-slate-300 ring-1 ring-white/10 hover:bg-white/10'}`}>
            {lbl}
          </button>
        ))}
      </div>
      )}

      {/* open windows — the step-4 day-card pattern */}
      <div>
        {!light && <p className={label}>{lang === 'en' ? 'Pick a time' : 'Choisissez une plage'}</p>}
        {light ? (
          <SlotPicker lang={lang} loading={availLoading} value={pick ? `${pick.date}|${pick.time}` : null}
            days={openDays.map((d) => ({ date: d.date, slots: d.open.map((tm) => ({ key: `${d.date}|${tm.t}`, label: lang === 'fr' ? tm.fr : tm.en })) }))}
            onPick={(date, ps) => setPick(ps ? { date, time: ps.key.split('|')[1], label: ps.label } : null)}
            empty={<p className="rounded-xl border border-amber-400/40 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">{lang === 'en' ? <>No openings in the next days — call <span className="font-bold">{brand.phoneDisplay}</span>.</> : <>Aucune plage prochainement — appelez le <span className="font-bold">{brand.phoneDisplay}</span>.</>}</p>} />
        ) : availLoading ? (
          <p className="py-4 text-center text-sm text-slate-400">{lang === 'en' ? 'Checking the calendar…' : 'Vérification du calendrier…'}</p>
        ) : !openDays.length ? (
          <p className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
            {lang === 'en'
              ? <>No openings in the next days — call <span className="font-bold">{brand.phoneDisplay}</span>.</>
              : <>Aucune plage prochainement — appelez le <span className="font-bold">{brand.phoneDisplay}</span>.</>}
          </p>
        ) : (
          <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
            {openDays.map((d) => (
              <div key={d.date} className="rounded-xl bg-white/5 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-slate-300">
                    {new Date(d.date + 'T12:00:00').toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', { weekday: 'short' }).toUpperCase()}
                  </span>
                  <p className="text-sm font-bold text-white">
                    {new Date(d.date + 'T12:00:00').toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                  <span className="ml-auto text-[10px] font-bold tracking-wider text-slate-500">
                    {mode === 'estimate' ? (lang === 'en' ? 'ESTIMATE VISITS' : 'VISITES D’ESTIMATION') : (lang === 'en' ? 'SERVICE WINDOWS' : 'PLAGES DE SERVICE')}
                  </span>
                </div>
                <div className={`grid gap-2 ${mode === 'estimate' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2'}`}>
                  {d.open.map((tm) => {
                    const on = pick?.date === d.date && pick?.time === tm.t;
                    const lbl = lang === 'fr' ? tm.fr : tm.en;
                    return (
                      <button key={tm.t} onClick={() => setPick(on ? null : { date: d.date, time: tm.t, label: lbl })}
                        className={`rounded-lg px-2 py-2.5 text-sm font-semibold transition ${on ? 'bg-sky-500 text-white' : (tm as { green?: boolean }).green ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/40 hover:bg-emerald-500/20' : 'bg-white/5 text-slate-200 ring-1 ring-white/10 hover:bg-white/10'}`}>
                        {lbl}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* customer: carried from step 2 when available — no second form */}
      {prefill ? (
        <p className={`rounded-xl px-3.5 py-2.5 text-sm ${L('bg-white/5 text-slate-300', 'bg-slate-50 text-slate-600 ring-1 ring-slate-200')}`}>
          {lang === 'en' ? 'Booking for' : 'Réservation pour'}{' '}
          <span className={`font-bold ${L('text-white', 'text-slate-900')}`}>{prefill.name}</span> · {prefill.phone} · {[prefill.street, prefill.city].filter(Boolean).join(', ')}
          <span className="block text-[11px] text-slate-500">{lang === 'en' ? 'From step 2 — go back to change it.' : 'De l’étape 2 — revenez en arrière pour modifier.'}</span>
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div><span className={label}>{lang === 'en' ? 'Full name' : 'Nom complet'}</span><input value={name} onChange={(e) => setName(e.target.value)} className={PILL_IN} /></div>
          <div><span className={label}>{lang === 'en' ? 'Phone' : 'Téléphone'}</span><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className={PILL_IN} /></div>
          <div><span className={label}>{lang === 'en' ? 'Email (optional)' : 'Courriel (facultatif)'}</span><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className={PILL_IN} /></div>
          <div><span className={label}>{lang === 'en' ? 'Street address' : 'Adresse'}</span><input value={street} onChange={(e) => setStreet(e.target.value)} className={PILL_IN} /></div>
          <div><span className={label}>{lang === 'en' ? 'City' : 'Ville'}</span><input value={city} onChange={(e) => setCity(e.target.value)} className={PILL_IN} /></div>
          <div><span className={label}>{lang === 'en' ? 'Postal code' : 'Code postal'}</span><input value={zip} onChange={(e) => setZip(e.target.value.toUpperCase())} className={PILL_IN} /></div>
          <div className="sm:col-span-2"><span className={label}>{lang === 'en' ? 'What’s going on? (optional)' : 'Décrivez le problème (facultatif)'}</span><textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={2} className={PILL_IN} /></div>
        </div>
      )}

      {state === 'error' && <p className={`rounded-lg border border-red-400/40 px-3 py-2 text-sm ${L('bg-red-500/10 text-red-300', 'bg-red-50 text-red-700')}`}>⚠ {error}</p>}

      <div className={`flex items-center gap-3 ${onBack ? 'justify-between' : 'justify-end'} ${light ? 'sticky bottom-0 z-10 -mx-4 border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6' : ''}`}>
      {onBack && <button type="button" onClick={onBack} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100">{lang === 'en' ? 'Back' : 'Retour'}</button>}
      <button
        onClick={() => (onContinue && pick ? onContinue(pick, mode) : submit())}
        disabled={onContinue ? !pick : (!canSend || state === 'sending')}
        className="rounded-xl bg-sky-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {state === 'sending'
          ? (lang === 'en' ? 'Booking…' : 'Réservation…')
          : pick
            ? (onContinue ? (lang === 'en' ? 'Continue' : 'Continuer') : (lang === 'en' ? `Book HVAC · ${pick.label}` : `Réserver CVC · ${pick.label}`))
            : (lang === 'en' ? 'Pick a time above' : 'Choisissez une plage ci-dessus')}
      </button>
      </div>
    </div>
  );
}
