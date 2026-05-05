import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';

/* ── App types ── */
export interface AppSlot { label: string; start: string; end: string; }
export interface DayAvailability { date: string; slots: AppSlot[]; }

export interface Step4Data {
  selectedDate: string | null;
  selectedSlot: AppSlot | null;
}

export const EMPTY_STEP4: Step4Data = {
  selectedDate: null,
  selectedSlot: null,
};

/* ── Raw types from backend ── */
export interface RawSlot { label: string; start: string; end: string; }
export interface RawDay  { date: string; slots: RawSlot[]; }
/* ── Merge consecutive 1-hour raw slots into N-hour blocks ── */
export function to12Hour(time24: string): string {
  const [h, m] = time24.trim().split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function mergeSlots(rawSlots: RawSlot[], blocksNeeded = 2): AppSlot[] {
  const out: AppSlot[] = [];
  for (let i = 0; i <= rawSlots.length - blocksNeeded; i++) {
    const first = rawSlots[i];
    let ok = true;
    let end = first.end;
    for (let k = 1; k < blocksNeeded; k++) {
      const prev = rawSlots[i + k - 1];
      const cur  = rawSlots[i + k];
      if (!cur || prev.end !== cur.start) { ok = false; break; }
      end = cur.end;
    }
    if (ok) {
      // Backend returns "13:00 - 14:00" → convert start to "1:00 PM"
      const startTime24 = first.label.split(' - ')[0].trim();
      out.push({ start: first.start, end, label: to12Hour(startTime24) });
    }
  }
  return out;
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatSlotDate(dateStr: string, lang: string): { badge: string; label: string } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const locale = lang === 'fr' ? 'fr-CA' : 'en-CA';
  const badge = date.toLocaleDateString(locale, { weekday: 'short' }).toUpperCase().replace(/\./g, '');
  const label = date.toLocaleDateString(locale, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  return { badge, label: label.charAt(0).toUpperCase() + label.slice(1) };
}

const DAY_HEADERS_EN = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const DAY_HEADERS_FR = ['DI', 'LU', 'MA', 'ME', 'JE', 'VE', 'SA'];
const MONTH_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

interface Props {
  data: Step4Data;
  onChange: (d: Step4Data) => void;
  days: DayAvailability[];
  loading: boolean;
  error: string | null;
}

export default function Step4({ data, onChange, days, loading, error }: Props) {
  const { lang } = useLang();

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayStr = useMemo(() => toISODate(today), [today]);

  const [calMonth, setCalMonth] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });

  // Jump calendar to first available month when days load
  useEffect(() => {
    if (days.length > 0) {
      const [y, m] = days[0].date.split('-').map(Number);
      setCalMonth({ year: y, month: m - 1 });
    }
  }, [days]);

  /* Hide today's slots entirely; also hide tomorrow if it's past 4 PM */
  const minDate = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    // Always skip today. If after 4 PM, also skip tomorrow.
    const skip = new Date(now);
    skip.setDate(skip.getDate() + (hour >= 16 ? 2 : 1));
    return toISODate(skip);
  }, []);

  const futureDays: DayAvailability[] = useMemo(() =>
    days.filter((d) => d.date >= minDate && d.slots.length > 0),
    [days, minDate],
  );

  const availableSet = useMemo(() => new Set(futureDays.map((d) => d.date)), [futureDays]);

  /* ── Calendar grid ── */
  const calGrid = useMemo(() => {
    const firstDow     = new Date(calMonth.year, calMonth.month, 1).getDay();
    const daysInMonth  = new Date(calMonth.year, calMonth.month + 1, 0).getDate();
    const cells: Array<number | null> = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [calMonth]);

  const toDateStr = (day: number) =>
    `${calMonth.year}-${String(calMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const prevDisabled =
    calMonth.year < today.getFullYear() ||
    (calMonth.year === today.getFullYear() && calMonth.month <= today.getMonth());

  const goToPrev = () => {
    if (prevDisabled) return;
    setCalMonth((m) => m.month === 0 ? { year: m.year - 1, month: 11 } : { ...m, month: m.month - 1 });
  };

  const goToNext = () => {
    setCalMonth((m) => m.month === 11 ? { year: m.year + 1, month: 0 } : { ...m, month: m.month + 1 });
  };

  const handleCalendarClick = (dateStr: string) => {
    if (!availableSet.has(dateStr)) return;
    // Toggle: clicking the already-filtered date clears the filter
    onChange({
      selectedDate: dateStr === data.selectedDate ? null : dateStr,
      selectedSlot: null,
    });
  };

  const handleSlotClick = (date: string, slot: AppSlot) => {
    onChange({ selectedDate: date, selectedSlot: slot });
  };

  const slotsToShow: DayAvailability[] = data.selectedDate
    ? futureDays.filter((d) => d.date === data.selectedDate)
    : futureDays;

  const dayHeaders = lang === 'fr' ? DAY_HEADERS_FR : DAY_HEADERS_EN;
  const monthNames = lang === 'fr' ? MONTH_FR : MONTH_EN;

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-800">
        {lang === 'en' ? '4. Select an Available Appointment' : '4. Choisissez un rendez-vous disponible'}
      </h2>

      <div className="flex flex-col lg:flex-row gap-4 items-start">

        {/* ── Mini Calendar ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 w-full lg:w-60 shrink-0">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={goToPrev}
              disabled={prevDisabled}
              className={`p-1 rounded hover:bg-gray-100 transition-colors ${prevDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-sm font-bold text-gray-800">
              {monthNames[calMonth.month]} {calMonth.year}
            </span>
            <button onClick={goToNext} className="p-1 rounded hover:bg-gray-100 transition-colors cursor-pointer">
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {dayHeaders.map((h) => (
              <div key={h} className="text-center text-[10px] font-bold text-gray-400 py-1">{h}</div>
            ))}
          </div>

          {/* Date cells */}
          <div className="grid grid-cols-7 gap-y-1">
            {calGrid.map((day, idx) => {
              if (day === null) return <div key={`pad-${idx}`} className="w-8 h-8" />;

              const dateStr    = toDateStr(day);
              const isAvail    = availableSet.has(dateStr);
              const isSelected = data.selectedDate === dateStr;
              const isToday    = dateStr === todayStr;
              const isPast     = dateStr < todayStr;

              return (
                <button
                  key={dateStr}
                  onClick={() => handleCalendarClick(dateStr)}
                  disabled={!isAvail}
                  className={[
                    'w-8 h-8 mx-auto flex items-center justify-center rounded-full text-xs font-semibold transition-colors',
                    isSelected                              ? 'bg-blue-700 text-white'                  : '',
                    !isSelected && isAvail                 ? 'text-blue-700 hover:bg-blue-50 cursor-pointer' : '',
                    !isSelected && isToday && !isAvail     ? 'text-red-400'                             : '',
                    !isSelected && !isAvail && !isToday    ? 'text-gray-300 cursor-default'             : '',
                    isPast && !isSelected                  ? 'opacity-40'                               : '',
                  ].filter(Boolean).join(' ')}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Clear filter */}
          {data.selectedDate && (
            <button
              onClick={() => onChange({ selectedDate: null, selectedSlot: null })}
              className="mt-4 w-full text-center text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors"
            >
              {lang === 'en' ? '← Show all dates' : '← Voir toutes les dates'}
            </button>
          )}
        </div>

        {/* ── Slot cards ── */}
        <div className="flex-1 space-y-3 max-h-[520px] overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-400">
              {lang === 'en' ? 'Loading availability…' : 'Chargement des disponibilités…'}
            </div>
          ) : error ? (
            <div className="py-10 text-center text-sm text-red-500">{error}</div>
          ) : slotsToShow.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">
              {lang === 'en' ? 'No slots available for this date.' : 'Aucun créneau disponible pour cette date.'}
            </p>
          ) : (
            slotsToShow.map((day) => {
              const { badge, label } = formatSlotDate(day.date, lang);
              const isDateSelected   = data.selectedDate === day.date;

              return (
                <div
                  key={day.date}
                  className={`bg-white border rounded-xl p-4 transition-colors ${
                    isDateSelected && data.selectedSlot
                      ? 'border-blue-400 ring-1 ring-blue-200'
                      : 'border-gray-200'
                  }`}
                >
                  {/* Card header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {badge}
                      </span>
                      <span className="text-sm font-bold text-gray-800">{label}</span>
                    </div>
                    <span className="hidden sm:block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      {lang === 'en' ? 'Standard Slots' : 'Créneaux standard'}
                    </span>
                  </div>

                  {/* Time slot buttons */}
                  <div className="flex flex-wrap gap-2">
                    {day.slots.map((slot) => {
                      const isSelected = isDateSelected && data.selectedSlot?.start === slot.start;
                      return (
                        <button
                          key={slot.start}
                          onClick={() => handleSlotClick(day.date, slot)}
                          className={`px-5 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                            isSelected
                              ? 'bg-blue-700 text-white border-blue-700'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-700'
                          }`}
                        >
                          {slot.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
