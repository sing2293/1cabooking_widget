import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/* The /new appointment picker (Anuj — like the Francis widget, on white):
   First Available / All Appointments, a month calendar, the time zone, then
   every open day listed with its windows side by side. Shared by the
   cleaning flow and the HVAC panel so both look the same. */

export interface PickerSlot { key: string; label: string }
export interface PickerDay { date: string; slots: PickerSlot[] }

interface Props {
  days: PickerDay[];
  value: string | null;          // the picked slot key
  onPick: (date: string, slot: PickerSlot | null) => void;
  lang: 'en' | 'fr';
  loading?: boolean;
  empty?: React.ReactNode;
}

/** "13:00 - 15:00" → "1 PM – 3 PM"; labels already in 12-hour form pass through. */
export const to12 = (l: string) => l
  .replace(/\b(\d{1,2}):(\d{2})\b(?!\s*[AaPp])/g, (_m, h, mi) => { const n = Number(h); const ap = n >= 12 ? 'PM' : 'AM'; const hh = n % 12 || 12; return mi === '00' ? `${hh} ${ap}` : `${hh}:${mi} ${ap}`; })
  .replace(' - ', ' – ');

export default function SlotPicker({ days, value, onPick, lang, loading, empty }: Props) {
  const [view, setView] = useState<'first' | 'all'>('first');
  const [calDate, setCalDate] = useState<string | null>(null);
  const [calMonth, setCalMonth] = useState<string | null>(null);

  const byDate: Record<string, PickerSlot[]> = {};
  for (const d of days) if (d.slots.length) byDate[d.date] = d.slots;
  const dates = Object.keys(byDate).sort();
  const loc = lang === 'fr' ? 'fr-CA' : 'en-CA';
  const todayIso = new Date().toISOString().slice(0, 10);
  const firstDate = dates[0] ?? null;
  /* First Available: earliest days until at least 3 windows show (Anuj —
     one lone slot felt like there was no availability). */
  const firstDates = (() => { const out: string[] = []; let n = 0; for (const d of dates) { out.push(d); n += byDate[d].length; if (n >= 3) break; } return out; })();
  const month = calMonth ?? (firstDate ?? todayIso).slice(0, 7);
  const [my, mm] = month.split('-').map(Number);
  const firstDow = new Date(my, mm - 1, 1).getDay();
  const daysIn = new Date(my, mm, 0).getDate();
  const cells: (string | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysIn }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)];
  const shiftMonth = (n: number) => { const d = new Date(my, mm - 1 + n, 1); setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); };
  const monthLabel = new Date(my, mm - 1, 1).toLocaleDateString(loc, { month: 'short', year: 'numeric' });
  const dayLabel = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString(loc, { weekday: 'short', month: 'short', day: 'numeric' });
  const tz = (() => { try { return new Intl.DateTimeFormat(loc, { timeZoneName: 'long', timeZone: 'America/Toronto' }).formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value ?? 'Eastern Time'; } catch { return 'Eastern Time'; } })();
  const now = new Date().toLocaleTimeString(loc, { hour: 'numeric', minute: '2-digit', timeZone: 'America/Toronto' });
  const DOW = lang === 'fr' ? ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'] : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div>
      {/* Arrival-window notice (Anuj 2026-09-03): times are estimates. */}
      <p className="mb-3 rounded-md border border-amber-400/40 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
        {lang === 'en'
          ? <><b>Please note:</b> times are estimates — we do our best to arrive around your chosen time, but morning arrivals can fall between 8 AM and 12 PM, and afternoon arrivals between 12 PM and 4 PM.</>
          : <><b>À noter :</b> les heures sont approximatives — nous faisons de notre mieux pour arriver autour de l’heure choisie, mais les arrivées du matin peuvent se faire entre 8 h et midi, et celles de l’après-midi entre midi et 16 h.</>}
      </p>
      <div className="grid grid-cols-2 overflow-hidden rounded-md ring-1 ring-slate-300">
        {([['first', lang === 'en' ? 'First Available' : 'Première disponible'], ['all', lang === 'en' ? 'All Appointments' : 'Tous les rendez-vous']] as const).map(([v, l]) => (
          <button key={v} type="button" onClick={() => setView(v)} className={`py-2.5 text-sm font-semibold transition ${view === v ? 'bg-sky-100 text-sky-900' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>{l}</button>
        ))}
      </div>
      {loading ? <p className="mt-4 rounded-lg bg-slate-50 py-10 text-center text-sm text-slate-500 ring-1 ring-slate-200">{lang === 'en' ? 'Finding the best windows…' : 'Recherche des plages…'}</p>
      : !dates.length ? <div className="mt-4">{empty}</div>
      : (
        <>
          {view === 'all' && (
            <div className="mt-3">
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-slate-900">{monthLabel}</span>
                <button type="button" onClick={() => shiftMonth(-1)} className="ml-1 rounded-md p-1 text-slate-500 hover:bg-slate-100"><ChevronLeft className="h-4 w-4" /></button>
                <button type="button" onClick={() => shiftMonth(1)} className="rounded-md p-1 text-slate-500 hover:bg-slate-100"><ChevronRight className="h-4 w-4" /></button>
                <button type="button" onClick={() => setCalMonth(todayIso.slice(0, 7))} className="ml-auto text-sm font-semibold text-slate-700 hover:underline">{lang === 'en' ? 'Today' : 'Aujourd’hui'}</button>
              </div>
              <div className="mt-2 grid grid-cols-7 gap-1 text-center">
                {DOW.map((d) => <span key={d} className="py-0.5 text-[11px] font-semibold text-slate-500">{d}</span>)}
                {cells.map((d, i) => {
                  if (!d) return <span key={`e${i}`} />;
                  const has = !!byDate[d]; const on = calDate === d; const isToday = d === todayIso;
                  return <button key={d} type="button" disabled={!has} onClick={() => { setCalDate(d); if (window.parent === window) setTimeout(() => document.getElementById(`day-${d}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 30); else { const el = document.getElementById(`day-${d}`); const box = el?.parentElement; if (el && box) box.scrollTop = el.offsetTop - box.offsetTop; } }} className={`mx-auto flex h-7 w-7 items-center justify-center rounded text-[13px] font-semibold transition ${on ? 'bg-sky-600 text-white' : has ? 'text-slate-900 hover:bg-sky-50' : 'text-slate-300'} ${isToday && !on ? 'ring-1 ring-sky-600' : ''}`}>{Number(d.slice(8))}</button>;
                })}
              </div>
            </div>
          )}
          <p className="mt-3 text-xs text-slate-500">🌐 {tz} ({now})</p>
          <div className="mt-2 max-h-[52vh] space-y-2 overflow-y-auto px-1 py-1">
            {(view === 'first' ? firstDates : dates).map((d) => (
              <div key={d} id={`day-${d}`} className={`rounded-md bg-white p-3 ring-1 transition ${calDate === d && view === 'all' ? 'ring-sky-400' : 'ring-slate-200'}`}>
                <p className="mb-2 text-sm font-bold text-slate-900">{dayLabel(d)}</p>
                <div className="flex flex-wrap gap-2">
                  {byDate[d].map((s) => { const on = value === s.key; return (
                    <button key={s.key} type="button" onClick={() => { onPick(d, on ? null : s); setCalDate(d); }} className={`flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition ${on ? 'bg-sky-600 text-white' : 'bg-white text-slate-800 ring-1 ring-slate-200 hover:ring-sky-300'}`}>
                      <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2 ${on ? 'border-white' : 'border-slate-300'}`}>{on && <span className="h-1.5 w-1.5 rounded-full bg-white" />}</span>
                      {to12(s.label)}
                    </button>); })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
