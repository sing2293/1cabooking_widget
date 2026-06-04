import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';

/* ── App types ── */
export interface AppSlot { label: string; start: string; end: string; }
export interface DayAvailability { date: string; slots: AppSlot[]; }

/* Preferred slot returned by the preferred-slots backend */
export interface PreferredSlot {
  date: string;
  start: string;
  end: string;
  label: string;
  routeId?: string;
  detourMinutes?: number;
  detourKm?: number;
  anchorType?: 'shop' | 'job';
  anchorRole?: 'shop_morning' | 'shop_evening' | 'job';
  timeGapMinutes?: number;
  avgKmToNeighbors?: number;
  neighborsSameDay?: number;
}

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

/** Convert a 24-hour range label like "13:00 - 14:00" → "1:00 PM - 2:00 PM". */
export function rangeTo12Hour(label: string): string {
  const parts = label.split(/\s*-\s*/);
  if (parts.length !== 2 || !/^\d{1,2}:\d{2}$/.test(parts[0]) || !/^\d{1,2}:\d{2}$/.test(parts[1])) return label;
  return `${to12Hour(parts[0])} - ${to12Hour(parts[1])}`;
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

function formatSlotDate(dateStr: string, lang: string): { badge: string; short: string; label: string } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const locale = lang === 'fr' ? 'fr-CA' : 'en-CA';
  const badge = date.toLocaleDateString(locale, { weekday: 'short' }).toUpperCase().replace(/\./g, '');
  const short = date.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' }).replace(/\./g, '');
  const label = date.toLocaleDateString(locale, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  return { badge, short, label: label.charAt(0).toUpperCase() + label.slice(1) };
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
  preferredSlots?: PreferredSlot[];
  preferredLoading?: boolean;
  categoryId?: string | null;
}

export default function Step4({ data, onChange, days, loading, error, preferredSlots = [], preferredLoading = false, categoryId = null }: Props) {
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

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4 flex gap-2.5 sm:gap-3">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs sm:text-sm text-amber-900 leading-relaxed">
          <strong>{lang === 'en' ? 'Note: ' : 'Note : '}</strong>
          {categoryId === 'dryer-vent'
            ? (lang === 'en'
                ? 'these are estimated times. For dryer vent service our arrival window runs 8 AM – 2 PM. We do our best to arrive around your chosen time.'
                : 'ces heures sont estimées. Pour le service de sécheuse, notre fenêtre d’arrivée est de 8 h à 14 h. Nous faisons de notre mieux pour arriver à l’heure choisie.')
            : (lang === 'en'
                ? 'these are estimated times. Our arrival window for morning slots is 8 AM – 12 PM and afternoon slots is 12 PM – 4 PM. We do our best to arrive around your chosen time.'
                : 'ces heures sont estimées. Notre fenêtre d’arrivée est entre 8 h et 12 h pour les créneaux du matin et entre 12 h et 16 h pour ceux de l’après-midi. Nous faisons de notre mieux pour arriver à l’heure choisie.')}
        </p>
      </div>

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
          {/* Preferred (recommended) slots — shown at top when available */}
          {(preferredLoading || preferredSlots.length > 0) && (
            <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-amber-500 text-base">⭐</span>
                <h3 className="text-sm font-bold text-gray-800">
                  {lang === 'en' ? 'Recommended Times' : 'Créneaux recommandés'}
                </h3>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded uppercase tracking-wider">
                  {lang === 'en' ? 'Truck nearby' : 'Camion proche'}
                </span>
              </div>
              {preferredLoading ? (
                <p className="text-xs text-gray-500 py-2">
                  {lang === 'en' ? 'Finding best times for your address…' : 'Recherche des meilleurs créneaux…'}
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {preferredSlots.map((slot) => {
                    const { short } = formatSlotDate(slot.date, lang);
                    const isSelected =
                      data.selectedSlot?.start === slot.start && data.selectedSlot?.end === slot.end;

                    /* Smart hint based on backend's anchor/detour fields */
                    const detour = slot.detourMinutes;
                    let hint = '';
                    if (slot.anchorRole === 'shop_morning') {
                      hint = lang === 'en' ? 'Truck leaves shop near you' : 'Camion part de l\'atelier près de vous';
                    } else if (slot.anchorRole === 'shop_evening') {
                      hint = lang === 'en' ? 'Truck heads back past you' : 'Camion repasse près de vous';
                    } else if (typeof detour === 'number' && detour < 5) {
                      hint = lang === 'en' ? `Right on the way (${Math.round(detour)} min)` : `Sur le chemin (${Math.round(detour)} min)`;
                    } else if (typeof slot.neighborsSameDay === 'number' && slot.neighborsSameDay > 0) {
                      hint = lang === 'en'
                        ? `${slot.neighborsSameDay} other ${slot.neighborsSameDay === 1 ? 'stop' : 'stops'} nearby that day`
                        : `${slot.neighborsSameDay} autre${slot.neighborsSameDay === 1 ? '' : 's'} arrêt${slot.neighborsSameDay === 1 ? '' : 's'} ce jour`;
                    } else if (typeof detour === 'number') {
                      hint = lang === 'en' ? `Truck detour: ${Math.round(detour)} min` : `Détour: ${Math.round(detour)} min`;
                    }

                    return (
                      <button
                        key={`${slot.date}-${slot.start}`}
                        onClick={() => handleSlotClick(slot.date, { label: slot.label, start: slot.start, end: slot.end })}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors flex flex-col items-start gap-0.5 ${
                          isSelected
                            ? 'bg-blue-700 text-white border-blue-700'
                            : 'bg-white text-gray-700 border-amber-300 hover:border-blue-400 hover:text-blue-700'
                        }`}
                      >
                        <span className={`text-[10px] font-bold ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>{short}</span>
                        <span>{rangeTo12Hour(slot.label)}</span>
                        {hint && (
                          <span className={`text-[10px] font-medium leading-tight ${isSelected ? 'text-blue-200' : 'text-amber-700'}`}>
                            {hint}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

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
